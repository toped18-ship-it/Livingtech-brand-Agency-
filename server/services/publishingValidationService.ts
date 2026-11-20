import type {
  PlatformCapabilityMatrix,
  PlatformKey,
  PublishingFormatKey,
} from '../../src/shared/api-contracts';
import { canAccountPublishFormat, getPlatformCharLimit } from '../../src/utils/domain';
import { getSocialProvider } from '../integrations/registry';

export interface PublishingValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  assembledText: string;
  charCount: number;
  charLimit: number;
}

export function validatePostForPlatform(params: {
  platformKey: PlatformKey;
  formatKey: PublishingFormatKey;
  title?: string;
  bodyText: string;
  hashtags?: string[];
  mediaUrls?: string[];
  accountCapabilities?: PlatformCapabilityMatrix | null;
}): PublishingValidationResult {
  const provider = getSocialProvider(params.platformKey);
  const capabilities = params.accountCapabilities ?? provider.capabilities;
  const errors: string[] = [];
  const warnings: string[] = [];

  const cleanTags = (params.hashtags || []).filter(Boolean);
  const assembledText = [params.bodyText.trim(), cleanTags.join(' ')].filter(Boolean).join('\n\n');
  const charLimit = getPlatformCharLimit(params.platformKey);
  const charCount = assembledText.length;

  // 1. Format capability check against official platform capability matrix
  if (!canAccountPublishFormat(capabilities, params.formatKey)) {
    errors.push(
      `${provider.displayName} does not support "${params.formatKey}" publishing via the currently granted API capabilities. ${capabilities.notes || ''}`.trim()
    );
  }

  // 2. Character limit check
  if (charCount === 0) {
    errors.push('Post copy cannot be empty.');
  } else if (charCount > charLimit) {
    errors.push(`Post exceeds ${provider.displayName} character limit (${charCount}/${charLimit}).`);
  }

  // 3. Platform-specific media requirements
  const mediaCount = (params.mediaUrls || []).filter(Boolean).length;
  if (params.formatKey === 'image' && mediaCount === 0) {
    errors.push(`An image URL or graphic asset is required for "${params.formatKey}" posts on ${provider.displayName}.`);
  }
  if ((params.formatKey === 'video' || params.formatKey === 'reels' || params.formatKey === 'short_form_video') && mediaCount === 0) {
    errors.push(`A video asset URL is required for "${params.formatKey}" publishing on ${provider.displayName}.`);
  }
  if (params.formatKey === 'carousel' && mediaCount < 2) {
    errors.push(`Carousel publishing on ${provider.displayName} requires at least 2 media items.`);
  }
  if ((params.platformKey === 'instagram' || params.platformKey === 'pinterest') && mediaCount === 0) {
    errors.push(`${provider.displayName} requires an image or video asset — text-only publishing is not supported by the official API.`);
  }
  if (params.platformKey === 'tiktok' && mediaCount === 0) {
    errors.push('TikTok Content Posting API requires a video or photo-mode media asset.');
  }
  if (params.platformKey === 'youtube' && mediaCount === 0) {
    errors.push('YouTube Data API requires a video asset for channel publishing.');
  }

  // 4. Platform-specific advisory warnings
  if (params.platformKey === 'linkedin' && cleanTags.length > 5) {
    warnings.push('LinkedIn recommends 3–5 relevant hashtags per post.');
  }
  if (params.platformKey === 'instagram' && cleanTags.length > 30) {
    errors.push('Instagram enforces a hard maximum of 30 hashtags per caption.');
  }
  if (params.platformKey === 'pinterest' && !(params.title || '').trim()) {
    warnings.push('Pinterest Pins perform better with an explicit Pin title (up to 100 chars).');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    assembledText,
    charCount,
    charLimit,
  };
}
