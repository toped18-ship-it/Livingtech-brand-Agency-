import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { DbInstance } from '../../db/database';
import { env } from '../../env';
import type {
  GeneratedImageRecord,
  GraphicArtDirection,
  GraphicDesignType,
  PlatformKey,
} from '../../../src/shared/api-contracts';
import { GRAPHIC_ASPECT_PRESETS, PHASE3_AI_CREDIT_COSTS } from '../../../src/utils/domain';

export type ImageServiceTransportFn = (params: {
  prompt: string;
  widthPx: number;
  heightPx: number;
  aspectRatio: string;
}) => Promise<{ mimeType: string; base64Data: string }>;

let imageTestTransportOverride: ImageServiceTransportFn | null = null;

export function setImageGenerationTestTransport(fn: ImageServiceTransportFn | null) {
  imageTestTransportOverride = fn;
}

export function mapGeneratedImageRow(r: Record<string, unknown>): GeneratedImageRecord {
  return {
    id: String(r.id),
    workspaceId: String(r.workspace_id),
    generatedContentId: r.generated_content_id ? String(r.generated_content_id) : null,
    mediaAssetId: r.media_asset_id ? String(r.media_asset_id) : null,
    graphicType: String(r.graphic_type) as GraphicDesignType,
    platformKey: String(r.platform_key) as PlatformKey,
    aspectRatio: String(r.aspect_ratio),
    widthPx: Number(r.width_px),
    heightPx: Number(r.height_px),
    prompt: String(r.prompt),
    artDirection: JSON.parse(String(r.art_direction_json || '{}')),
    captionText: String(r.caption_text || ''),
    sourceMode: String(r.source_mode || 'ai_service') as GeneratedImageRecord['sourceMode'],
    imageUrl: r.image_url ? String(r.image_url) : null,
    status: String(r.status) as GeneratedImageRecord['status'],
    errorMessage: r.error_message ? String(r.error_message) : null,
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

export function getImageGenerationCapabilities() {
  const externalConfigured = Boolean(env.IMAGE_GENERATION_API_URL && env.IMAGE_GENERATION_API_KEY);
  const paidGeminiEnabled = Boolean(env.ENABLE_PAID_GEMINI_IMAGE_MODEL && env.GEMINI_API_KEY);
  return {
    liveAiImageServiceAvailable: externalConfigured || paidGeminiEnabled || Boolean(imageTestTransportOverride),
    providerMode: imageTestTransportOverride
      ? 'test_transport'
      : externalConfigured
      ? 'external_image_api'
      : paidGeminiEnabled
      ? 'gemini_paid_image_api'
      : 'unconfigured',
    compositorAvailable: true,
    note:
      externalConfigured || paidGeminiEnabled
        ? 'Live AI neural image generation backend is active.'
        : 'Live AI neural image generation requires IMAGE_GENERATION_API_URL + IMAGE_GENERATION_API_KEY (or a billing-enabled Gemini API key with ENABLE_PAID_GEMINI_IMAGE_MODEL=true). You can still generate AI Art Direction & Prompts, upload images, and compose/export branded graphics directly to the Media Library.',
  };
}

function saveImageBufferToWorkspacePublic(workspaceId: string, ext: string, buffer: Buffer): { storagePath: string; publicUrl: string } {
  const fileName = `graphic-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
  const relDir = path.join('generated', workspaceId);
  const absDir = path.resolve(process.cwd(), 'public', relDir);
  fs.mkdirSync(absDir, { recursive: true });
  const absPath = path.join(absDir, fileName);
  fs.writeFileSync(absPath, buffer);
  return {
    storagePath: `/public/${relDir}/${fileName}`,
    publicUrl: `/${relDir}/${fileName}`,
  };
}

/**
 * Module 10: Real Image Generation Adapter.
 * Strictly follows honesty invariant: NEVER claims an image was generated if the live image service is unconfigured or returns an error.
 */
export async function runImageGenerationModule(
  db: DbInstance,
  params: {
    workspaceId: string;
    userId: string;
    graphicType: GraphicDesignType;
    platformKey: PlatformKey;
    aspectRatio: string;
    prompt: string;
    artDirection?: Partial<GraphicArtDirection>;
    captionText?: string;
    generatedContentId?: string | null;
  }
): Promise<{ image: GeneratedImageRecord; creditsRemaining: number }> {
  const preset = GRAPHIC_ASPECT_PRESETS.find((p) => p.id === params.aspectRatio) ?? GRAPHIC_ASPECT_PRESETS[0];
  const cost = PHASE3_AI_CREDIT_COSTS.image_generation;
  const ws = db
    .prepare('SELECT ai_credits_balance FROM workspaces WHERE id = ?')
    .get(params.workspaceId) as { ai_credits_balance: number } | undefined;

  if (!ws || ws.ai_credits_balance < cost) {
    throw new Error(`Insufficient AI credits. Live image generation requires ${cost} credits.`);
  }

  const imageId = crypto.randomUUID();
  const now = new Date().toISOString();
  const startedAt = Date.now();

  const recordFailure = (errorMessage: string) => {
    db.transaction(() => {
      db.prepare(
        `INSERT INTO generated_images (
          id, workspace_id, user_id, generated_content_id, media_asset_id, graphic_type, platform_key,
          aspect_ratio, width_px, height_px, prompt, art_direction_json, caption_text,
          source_mode, image_url, status, error_message, created_at, updated_at
        ) VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, 'ai_service', NULL, 'failed', ?, ?, ?)`
      ).run(
        imageId,
        params.workspaceId,
        params.userId,
        params.generatedContentId ?? null,
        params.graphicType,
        params.platformKey,
        preset.id,
        preset.width,
        preset.height,
        params.prompt.trim(),
        JSON.stringify(params.artDirection || {}),
        (params.captionText || '').trim(),
        errorMessage,
        now,
        now
      );
      db.prepare(
        `INSERT INTO ai_generation_usage (
          id, workspace_id, user_id, module_key, model_name, credits_used,
          prompt_tokens, completion_tokens, status, error_message, latency_ms, created_at
        ) VALUES (?, ?, ?, 'image_generation', 'external_image_service', 0, 0, 0, 'failed', ?, ?, ?)`
      ).run(crypto.randomUUID(), params.workspaceId, params.userId, errorMessage, Date.now() - startedAt, now);
    })();

    const failedRow = db.prepare('SELECT * FROM generated_images WHERE id = ?').get(imageId) as Record<string, unknown>;
    return {
      image: mapGeneratedImageRow(failedRow),
      creditsRemaining: ws.ai_credits_balance,
    };
  };

  try {
    let generatedBuffer: Buffer;
    let mimeType = 'image/png';
    let modelName = env.IMAGE_GENERATION_MODEL || 'external-image-api';

    if (imageTestTransportOverride) {
      const res = await imageTestTransportOverride({
        prompt: params.prompt,
        widthPx: preset.width,
        heightPx: preset.height,
        aspectRatio: preset.id,
      });
      mimeType = res.mimeType || 'image/png';
      generatedBuffer = Buffer.from(res.base64Data, 'base64');
      modelName = 'test-image-transport';
    } else if (env.IMAGE_GENERATION_API_URL && env.IMAGE_GENERATION_API_KEY) {
      const resp = await fetch(env.IMAGE_GENERATION_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.IMAGE_GENERATION_API_KEY}`,
        },
        body: JSON.stringify({
          model: env.IMAGE_GENERATION_MODEL || 'gpt-image-1',
          prompt: params.prompt,
          size: `${preset.width}x${preset.height}`,
          response_format: 'b64_json',
        }),
      });
      if (!resp.ok) {
        const errBody = await resp.text();
        return recordFailure(`Image generation service returned HTTP ${resp.status}: ${errBody.slice(0, 220)}`);
      }
      const json = (await resp.json()) as { data?: { b64_json?: string; url?: string }[] };
      const b64 = json?.data?.[0]?.b64_json;
      if (!b64) {
        return recordFailure('Image generation service succeeded without returning binary image data.');
      }
      generatedBuffer = Buffer.from(b64, 'base64');
    } else {
      return recordFailure(
        'Live neural image generation service is not configured on this server (no billing-enabled image model or IMAGE_GENERATION_API_URL/IMAGE_GENERATION_API_KEY secret configured). No credits were deducted. Use the Brand Graphic Compositor or upload your own asset below to render and save production graphics.'
      );
    }

    const ext = mimeType.includes('jpeg') || mimeType.includes('jpg') ? 'jpg' : 'png';
    const saved = saveImageBufferToWorkspacePublic(params.workspaceId, ext, generatedBuffer);
    const mediaId = crypto.randomUUID();
    const fileName = `${params.graphicType}-${preset.id.replace(':', 'x')}-${Date.now()}.${ext}`;

    db.transaction(() => {
      db.prepare('UPDATE workspaces SET ai_credits_balance = ai_credits_balance - ?, updated_at = ? WHERE id = ?').run(
        cost,
        now,
        params.workspaceId
      );
      db.prepare(
        `INSERT INTO media_library (
          id, workspace_id, uploaded_by, file_name, asset_type, mime_type, storage_path, public_url, file_size_bytes, folder, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 'image', ?, ?, ?, ?, 'AI Graphics', ?, ?)`
      ).run(
        mediaId,
        params.workspaceId,
        params.userId,
        fileName,
        mimeType,
        saved.storagePath,
        saved.publicUrl,
        generatedBuffer.length,
        now,
        now
      );
      db.prepare(
        `INSERT INTO generated_images (
          id, workspace_id, user_id, generated_content_id, media_asset_id, graphic_type, platform_key,
          aspect_ratio, width_px, height_px, prompt, art_direction_json, caption_text,
          source_mode, image_url, status, error_message, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ai_service', ?, 'generated', NULL, ?, ?)`
      ).run(
        imageId,
        params.workspaceId,
        params.userId,
        params.generatedContentId ?? null,
        mediaId,
        params.graphicType,
        params.platformKey,
        preset.id,
        preset.width,
        preset.height,
        params.prompt.trim(),
        JSON.stringify(params.artDirection || {}),
        (params.captionText || '').trim(),
        saved.publicUrl,
        now,
        now
      );
      db.prepare(
        `INSERT INTO ai_generation_usage (
          id, workspace_id, user_id, module_key, model_name, credits_used,
          prompt_tokens, completion_tokens, status, error_message, latency_ms, created_at
        ) VALUES (?, ?, ?, 'image_generation', ?, ?, 0, 0, 'completed', NULL, ?, ?)`
      ).run(crypto.randomUUID(), params.workspaceId, params.userId, modelName, cost, Date.now() - startedAt, now);
    })();

    const updatedWs = db
      .prepare('SELECT ai_credits_balance FROM workspaces WHERE id = ?')
      .get(params.workspaceId) as { ai_credits_balance: number };
    const stored = db.prepare('SELECT * FROM generated_images WHERE id = ?').get(imageId) as Record<string, unknown>;
    return { image: mapGeneratedImageRow(stored), creditsRemaining: updatedWs.ai_credits_balance };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unexpected image generation service failure.';
    return recordFailure(msg);
  }
}

/**
 * Persists a real exported PNG/JPEG from the HTML5 Canvas Brand Graphic Compositor or user upload
 * into both media_library and generated_images.
 */
export function saveRenderedGraphicToLibrary(
  db: DbInstance,
  params: {
    workspaceId: string;
    userId: string;
    graphicType: GraphicDesignType;
    platformKey: PlatformKey;
    aspectRatio: string;
    prompt: string;
    artDirection?: Partial<GraphicArtDirection>;
    captionText?: string;
    sourceMode: 'compositor' | 'uploaded';
    dataUrl: string;
    fileName?: string;
  }
): { image: GeneratedImageRecord; mediaAssetId: string } {
  const match = params.dataUrl.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) {
    throw new Error('Invalid image payload. Expected a PNG, JPEG, or WebP data URL.');
  }
  const mimeType = match[1];
  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length > 8 * 1024 * 1024) {
    throw new Error('Graphic file exceeds the 8MB upload limit.');
  }

  const preset = GRAPHIC_ASPECT_PRESETS.find((p) => p.id === params.aspectRatio) ?? GRAPHIC_ASPECT_PRESETS[0];
  const ext = mimeType.includes('jpeg') ? 'jpg' : mimeType.includes('webp') ? 'webp' : 'png';
  const saved = saveImageBufferToWorkspacePublic(params.workspaceId, ext, buffer);
  const mediaId = crypto.randomUUID();
  const imageId = crypto.randomUUID();
  const now = new Date().toISOString();
  const safeFileName = (params.fileName || `${params.graphicType}-${preset.id.replace(':', 'x')}.${ext}`).slice(0, 120);

  db.transaction(() => {
    db.prepare(
      `INSERT INTO media_library (
        id, workspace_id, uploaded_by, file_name, asset_type, mime_type, storage_path, public_url, file_size_bytes, folder, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'image', ?, ?, ?, ?, 'Brand Graphics', ?, ?)`
    ).run(mediaId, params.workspaceId, params.userId, safeFileName, mimeType, saved.storagePath, saved.publicUrl, buffer.length, now, now);

    db.prepare(
      `INSERT INTO generated_images (
        id, workspace_id, user_id, generated_content_id, media_asset_id, graphic_type, platform_key,
        aspect_ratio, width_px, height_px, prompt, art_direction_json, caption_text,
        source_mode, image_url, status, error_message, created_at, updated_at
      ) VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'generated', NULL, ?, ?)`
    ).run(
      imageId,
      params.workspaceId,
      params.userId,
      mediaId,
      params.graphicType,
      params.platformKey,
      preset.id,
      preset.width,
      preset.height,
      params.prompt.trim() || safeFileName,
      JSON.stringify(params.artDirection || {}),
      (params.captionText || '').trim(),
      params.sourceMode,
      saved.publicUrl,
      now,
      now
    );
  })();

  const stored = db.prepare('SELECT * FROM generated_images WHERE id = ?').get(imageId) as Record<string, unknown>;
  return { image: mapGeneratedImageRow(stored), mediaAssetId: mediaId };
}

export function listGeneratedImages(db: DbInstance, workspaceId: string): GeneratedImageRecord[] {
  const rows = db
    .prepare('SELECT * FROM generated_images WHERE workspace_id = ? ORDER BY created_at DESC LIMIT 40')
    .all(workspaceId) as Record<string, unknown>[];
  return rows.map(mapGeneratedImageRow);
}
