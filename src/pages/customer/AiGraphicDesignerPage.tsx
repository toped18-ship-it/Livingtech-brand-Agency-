import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Sparkles,
  Image as ImageIcon,
  Upload,
  Download,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  CalendarPlus,
  Layers,
  Wand2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../lib/apiClient';
import { GRAPHIC_ASPECT_PRESETS } from '../../utils/domain';
import type {
  GeneratedImageRecord,
  GraphicArtDirection,
  GraphicDesignType,
  PlatformKey,
  SocialAccountRecord,
} from '../../shared/api-contracts';

const GRAPHIC_TYPES: { id: GraphicDesignType; label: string }[] = [
  { id: 'promotional_flyer', label: 'Promotional Flyer' },
  { id: 'product_announcement', label: 'Product Announcement' },
  { id: 'event_banner', label: 'Event Banner' },
  { id: 'quote_graphic', label: 'Quote Graphic' },
  { id: 'carousel_slide', label: 'Carousel Slide' },
  { id: 'business_promo', label: 'Business Promotion' },
  { id: 'sale_announcement', label: 'Sale Announcement' },
  { id: 'educational_infographic', label: 'Educational Infographic' },
];

const PLATFORMS: { id: PlatformKey; label: string }[] = [
  { id: 'instagram', label: 'Instagram' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'x', label: 'X' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'pinterest', label: 'Pinterest' },
  { id: 'google_business', label: 'Google Business' },
];

const LAYOUT_THEMES = [
  { id: 'royal_editorial', label: 'Royal Editorial' },
  { id: 'midnight_glow', label: 'Midnight Executive' },
  { id: 'clean_split', label: 'Clean Swiss Split' },
] as const;

export const AiGraphicDesignerPage: React.FC = () => {
  const { activeWorkspace, refreshSession } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [graphicType, setGraphicType] = useState<GraphicDesignType>('promotional_flyer');
  const [platformKey, setPlatformKey] = useState<PlatformKey>('instagram');
  const [aspectRatio, setAspectRatio] = useState<string>('1:1');
  const [brief, setBrief] = useState('');
  const [includeLogo, setIncludeLogo] = useState(true);
  const [layoutTheme, setLayoutTheme] = useState<(typeof LAYOUT_THEMES)[number]['id']>('royal_editorial');

  // Editable design fields
  const [headline, setHeadline] = useState('Elevate Your Brand Presence');
  const [subheadline, setSubheadline] = useState('Consistent, high-impact visual storytelling across every channel.');
  const [ctaText, setCtaText] = useState('Discover More');
  const [imagePrompt, setImagePrompt] = useState('');
  const [captionText, setCaptionText] = useState('');
  const [artDirection, setArtDirection] = useState<GraphicArtDirection | null>(null);
  const [uploadedBgUrl, setUploadedBgUrl] = useState<string | null>(null);

  // Backend data
  const [graphics, setGraphics] = useState<GeneratedImageRecord[]>([]);
  const [accounts, setAccounts] = useState<SocialAccountRecord[]>([]);
  const [capabilities, setCapabilities] = useState<{
    liveAiImageServiceAvailable: boolean;
    providerMode: string;
    note: string;
  } | null>(null);

  // Schedule modal / quick attach
  const [attachAccountId, setAttachAccountId] = useState<string>('');
  const [attachScheduleAt, setAttachScheduleAt] = useState<string>(() => {
    const d = new Date(Date.now() + 2 * 3600 * 1000);
    return d.toISOString().slice(0, 16);
  });

  const [busyDirection, setBusyDirection] = useState(false);
  const [busyLiveImage, setBusyLiveImage] = useState(false);
  const [busySave, setBusySave] = useState(false);
  const [busySchedule, setBusySchedule] = useState(false);
  const [banner, setBanner] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const preset = GRAPHIC_ASPECT_PRESETS.find((p) => p.id === aspectRatio) ?? GRAPHIC_ASPECT_PRESETS[0];
  const brandPrimary = activeWorkspace?.brandProfile?.primaryColor || '#0052FF';
  const brandSecondary = activeWorkspace?.brandProfile?.secondaryColor || '#071436';
  const brandAccent = activeWorkspace?.brandProfile?.accentColor || '#F59E0B';
  const brandName = activeWorkspace?.brandProfile?.brandName || activeWorkspace?.name || 'LIVINGTECH BRAND AGENCY';
  const brandLogoUrl = activeWorkspace?.brandProfile?.logoUrl || '/assets/aistudio/20261112_184805_8a13799e.jpg';

  const loadData = useCallback(async () => {
    if (!activeWorkspace) return;
    try {
      const [gRes, accRes] = await Promise.all([
        apiClient.getGraphics(activeWorkspace.id),
        apiClient.getSocialAccounts(activeWorkspace.id),
      ]);
      setGraphics(gRes.graphics);
      setCapabilities(gRes.capabilities);
      setAccounts(accRes.accounts.filter((a) => a.connectionStatus === 'connected'));
    } catch (err) {
      setBanner({ type: 'error', text: err instanceof Error ? err.message : 'Unable to load graphic designer assets.' });
    }
  }, [activeWorkspace]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Real HTML5 Canvas Brand Graphic Renderer
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = preset.width;
    const H = preset.height;
    canvas.width = W;
    canvas.height = H;

    const drawOverlayAndText = (logoImg?: HTMLImageElement | null) => {
      // Decorative geometric accent lines
      ctx.save();
      if (layoutTheme === 'clean_split') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, W, H * 0.22);
        ctx.fillStyle = brandPrimary;
        ctx.fillRect(0, H * 0.22, W, 8);
      } else {
        ctx.globalAlpha = 0.14;
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(W * 0.88, H * 0.16, Math.min(W, H) * 0.28, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = brandAccent;
        ctx.beginPath();
        ctx.arc(W * 0.12, H * 0.9, Math.min(W, H) * 0.22, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      const pad = Math.round(W * 0.08);
      const textColor = layoutTheme === 'clean_split' && !uploadedBgUrl ? '#FFFFFF' : '#FFFFFF';

      // Brand header / logo pill
      if (includeLogo) {
        if (logoImg && logoImg.complete && logoImg.naturalWidth > 0) {
          const boxW = Math.round(W * 0.32);
          const boxH = Math.round(boxW * 0.34);
          ctx.save();
          ctx.fillStyle = 'rgba(255,255,255,0.96)';
          ctx.beginPath();
          ctx.roundRect(pad, pad, boxW, boxH, 16);
          ctx.fill();
          const scale = Math.min((boxW - 24) / logoImg.naturalWidth, (boxH - 16) / logoImg.naturalHeight);
          const dw = logoImg.naturalWidth * scale;
          const dh = logoImg.naturalHeight * scale;
          ctx.drawImage(logoImg, pad + (boxW - dw) / 2, pad + (boxH - dh) / 2, dw, dh);
          ctx.restore();
        } else {
          ctx.save();
          ctx.fillStyle = 'rgba(255,255,255,0.16)';
          ctx.beginPath();
          ctx.roundRect(pad, pad, Math.min(W * 0.55, 420), 54, 12);
          ctx.fill();
          ctx.fillStyle = '#FFFFFF';
          ctx.font = `700 ${Math.round(W * 0.024)}px "Plus Jakarta Sans", sans-serif`;
          ctx.fillText(brandName.slice(0, 28), pad + 20, pad + 35);
          ctx.restore();
        }
      }

      // Graphic Type badge
      const badgeLabel = GRAPHIC_TYPES.find((g) => g.id === graphicType)?.label.toUpperCase() || 'BRAND GRAPHIC';
      const badgeY = Math.round(H * 0.36);
      ctx.save();
      ctx.fillStyle = brandAccent;
      ctx.font = `700 ${Math.round(W * 0.022)}px "Inter", sans-serif`;
      ctx.fillText(badgeLabel, pad, badgeY);

      // Word-wrapped Headline
      const headlineSize = Math.round(W * (H > W ? 0.068 : 0.058));
      ctx.fillStyle = textColor;
      ctx.font = `800 ${headlineSize}px "Plus Jakarta Sans", "Inter", sans-serif`;
      const maxTextW = W - pad * 2;
      const wrapText = (text: string, fontSize: number, maxW: number, maxLines: number): string[] => {
        const words = text.split(/\s+/).filter(Boolean);
        const lines: string[] = [];
        let line = '';
        for (const word of words) {
          const test = line ? `${line} ${word}` : word;
          if (ctx.measureText(test).width > maxW && line) {
            lines.push(line);
            line = word;
            if (lines.length >= maxLines - 1) break;
          } else {
            line = test;
          }
        }
        if (line && lines.length < maxLines) lines.push(line);
        return lines;
      };

      const hLines = wrapText(headline || 'Your Headline Here', headlineSize, maxTextW, 3);
      let cursorY = badgeY + Math.round(headlineSize * 1.15);
      for (const l of hLines) {
        ctx.fillText(l, pad, cursorY);
        cursorY += Math.round(headlineSize * 1.16);
      }

      // Subheadline
      const subSize = Math.round(W * 0.028);
      ctx.fillStyle = 'rgba(241, 245, 249, 0.92)';
      ctx.font = `500 ${subSize}px "Inter", sans-serif`;
      cursorY += Math.round(subSize * 0.45);
      const subLines = wrapText(subheadline || '', subSize, maxTextW, 3);
      for (const l of subLines) {
        ctx.fillText(l, pad, cursorY);
        cursorY += Math.round(subSize * 1.38);
      }

      // CTA Button
      if (ctaText.trim()) {
        const ctaY = Math.min(cursorY + Math.round(H * 0.04), H - pad - 88);
        const ctaFont = Math.round(W * 0.026);
        ctx.font = `700 ${ctaFont}px "Inter", sans-serif`;
        const ctaWidth = Math.min(ctx.measureText(ctaText.trim()).width + 64, maxTextW);
        const ctaHeight = Math.round(ctaFont * 2.25);
        ctx.fillStyle = brandAccent;
        ctx.beginPath();
        ctx.roundRect(pad, ctaY, ctaWidth, ctaHeight, 14);
        ctx.fill();
        ctx.fillStyle = '#071436';
        ctx.fillText(ctaText.trim(), pad + 32, ctaY + Math.round(ctaHeight * 0.64));
      }

      // Subtle Brand Footer
      ctx.fillStyle = 'rgba(255,255,255,0.68)';
      ctx.font = `600 ${Math.round(W * 0.02)}px "Inter", sans-serif`;
      ctx.fillText(`${brandName}  ·  ${platformKey.toUpperCase()} (${preset.id})`, pad, H - Math.round(pad * 0.55));
      ctx.restore();
    };

    const drawBackground = (bgImg?: HTMLImageElement | null) => {
      if (bgImg && bgImg.complete && bgImg.naturalWidth > 0) {
        const scale = Math.max(W / bgImg.naturalWidth, H / bgImg.naturalHeight);
        const dw = bgImg.naturalWidth * scale;
        const dh = bgImg.naturalHeight * scale;
        ctx.drawImage(bgImg, (W - dw) / 2, (H - dh) / 2, dw, dh);
        const shade = ctx.createLinearGradient(0, 0, 0, H);
        shade.addColorStop(0, 'rgba(7, 20, 54, 0.55)');
        shade.addColorStop(0.55, 'rgba(7, 20, 54, 0.72)');
        shade.addColorStop(1, 'rgba(7, 20, 54, 0.88)');
        ctx.fillStyle = shade;
        ctx.fillRect(0, 0, W, H);
      } else {
        const grad = ctx.createLinearGradient(0, 0, W, H);
        if (layoutTheme === 'midnight_glow') {
          grad.addColorStop(0, '#040B1F');
          grad.addColorStop(0.55, brandSecondary);
          grad.addColorStop(1, brandPrimary);
        } else if (layoutTheme === 'clean_split') {
          grad.addColorStop(0, brandSecondary);
          grad.addColorStop(1, brandPrimary);
        } else {
          grad.addColorStop(0, brandSecondary);
          grad.addColorStop(0.5, brandPrimary);
          grad.addColorStop(1, '#0F172A');
        }
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
      }

      if (includeLogo && brandLogoUrl) {
        const logoImg = new Image();
        logoImg.crossOrigin = 'anonymous';
        logoImg.onload = () => drawOverlayAndText(logoImg);
        logoImg.onerror = () => drawOverlayAndText(null);
        logoImg.src = brandLogoUrl;
      } else {
        drawOverlayAndText(null);
      }
    };

    if (uploadedBgUrl) {
      const bgImg = new Image();
      bgImg.crossOrigin = 'anonymous';
      bgImg.onload = () => drawBackground(bgImg);
      bgImg.onerror = () => drawBackground(null);
      bgImg.src = uploadedBgUrl;
    } else {
      drawBackground(null);
    }
  }, [
    preset,
    layoutTheme,
    brandPrimary,
    brandSecondary,
    brandAccent,
    brandName,
    brandLogoUrl,
    includeLogo,
    graphicType,
    headline,
    subheadline,
    ctaText,
    platformKey,
    uploadedBgUrl,
  ]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  const handleUploadBg = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setBanner({ type: 'error', text: 'Please select a PNG, JPEG, or WebP image file.' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setUploadedBgUrl(reader.result);
        setBanner({ type: 'info', text: `Loaded "${file.name}" into the Brand Graphic Compositor.` });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateDirection = async () => {
    if (!activeWorkspace || !brief.trim()) {
      setBanner({ type: 'error', text: 'Enter a graphic design brief first.' });
      return;
    }
    setBusyDirection(true);
    setBanner(null);
    try {
      const res = await apiClient.generateGraphicDirection(activeWorkspace.id, {
        graphicType,
        platformKey,
        aspectRatio,
        brief,
        includeLogo,
      });
      setArtDirection(res.artDirection);
      setHeadline(res.artDirection.headline);
      setSubheadline(res.artDirection.subheadline);
      setCtaText(res.artDirection.callToAction);
      setImagePrompt(res.artDirection.imagePrompt);
      setCaptionText(res.artDirection.suggestedCaption);
      await refreshSession();
      setBanner({
        type: 'success',
        text: `AI Creative Direction generated and loaded into the canvas (${res.creditsRemaining.toLocaleString()} credits remaining).`,
      });
    } catch (err) {
      setBanner({ type: 'error', text: err instanceof Error ? err.message : 'Unable to generate art direction.' });
    } finally {
      setBusyDirection(false);
    }
  };

  const handleGenerateLiveAiImage = async () => {
    if (!activeWorkspace) return;
    const promptToUse = imagePrompt.trim() || brief.trim() || `${headline} — ${subheadline}`;
    if (promptToUse.length < 5) {
      setBanner({ type: 'error', text: 'Provide a graphic prompt or brief before requesting live image generation.' });
      return;
    }
    setBusyLiveImage(true);
    setBanner(null);
    try {
      const res = await apiClient.generateLiveImage(activeWorkspace.id, {
        graphicType,
        platformKey,
        aspectRatio,
        prompt: promptToUse,
        artDirection: artDirection ?? undefined,
        captionText,
      });
      await loadData();
      await refreshSession();
      if (res.image.status === 'generated' && res.image.imageUrl) {
        setUploadedBgUrl(res.image.imageUrl);
        setBanner({ type: 'success', text: 'Live AI image generated and saved to your Media Library.' });
      } else {
        setBanner({
          type: 'error',
          text: res.image.errorMessage || 'Live AI image generation failed — no image was falsely marked as generated.',
        });
      }
    } catch (err) {
      setBanner({ type: 'error', text: err instanceof Error ? err.message : 'Image generation failed.' });
    } finally {
      setBusyLiveImage(false);
    }
  };

  const handleSaveCompositorToLibrary = async (): Promise<GeneratedImageRecord | null> => {
    if (!activeWorkspace || !canvasRef.current) return null;
    setBusySave(true);
    setBanner(null);
    try {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      const res = await apiClient.saveRenderedGraphic(activeWorkspace.id, {
        graphicType,
        platformKey,
        aspectRatio,
        prompt: imagePrompt || brief || headline,
        artDirection: artDirection ?? {
          headline,
          subheadline,
          callToAction: ctaText,
          layoutStyle: layoutTheme,
          visualElements: [],
          colorPalette: [brandPrimary, brandSecondary, brandAccent],
          typographyNotes: 'Plus Jakarta Sans + Inter',
          imagePrompt: imagePrompt || brief,
          suggestedCaption: captionText,
        },
        captionText,
        sourceMode: uploadedBgUrl ? 'uploaded' : 'compositor',
        dataUrl,
        fileName: `${graphicType}-${platformKey}-${aspectRatio.replace(':', 'x')}.png`,
      });
      await loadData();
      setBanner({ type: 'success', text: 'Graphic exported as PNG and saved to Media Library.' });
      return res.image;
    } catch (err) {
      setBanner({ type: 'error', text: err instanceof Error ? err.message : 'Failed to save graphic.' });
      return null;
    } finally {
      setBusySave(false);
    }
  };

  const handleAttachAndSchedule = async () => {
    if (!activeWorkspace) return;
    setBusySchedule(true);
    setBanner(null);
    try {
      const saved = await handleSaveCompositorToLibrary();
      if (!saved?.imageUrl) {
        setBusySchedule(false);
        return;
      }
      const absoluteMediaUrl = `${window.location.origin}${saved.imageUrl}`;
      const res = await apiClient.enqueuePublishingJob(activeWorkspace.id, {
        platformKey,
        socialAccountId: attachAccountId || null,
        formatKey: 'image',
        title: headline.trim() || 'Branded Graphic Post',
        bodyText: captionText.trim() || `${headline}\n\n${subheadline}\n\n${ctaText}`.trim(),
        mediaUrls: [absoluteMediaUrl],
        scheduledAt: attachScheduleAt,
        timezone: activeWorkspace.timezone || 'UTC',
      });
      setBanner({
        type: 'success',
        text: `Graphic attached and queued (${res.job.status.replace('_', ' ')}) for ${platformKey.toUpperCase()}.`,
      });
    } catch (err) {
      setBanner({ type: 'error', text: err instanceof Error ? err.message : 'Failed to schedule graphic post.' });
    } finally {
      setBusySchedule(false);
    }
  };

  const handleDownloadPng = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `${graphicType}-${platformKey}-${aspectRatio.replace(':', 'x')}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold text-slate-900">AI Graphic Designer & Brand Studio</h2>
          <p className="mt-1 text-xs text-slate-500">
            Generate AI creative direction & image prompts, upload brand imagery, apply your workspace logo, export PNGs to Media Library, and attach directly to scheduled posts.
          </p>
        </div>
        {capabilities && (
          <div
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
              capabilities.liveAiImageServiceAvailable
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-amber-200 bg-amber-50 text-amber-900'
            }`}
          >
            {capabilities.liveAiImageServiceAvailable
              ? 'Live Neural Image API: Active'
              : 'Brand Canvas Compositor: Active · Live Neural Image API: Unconfigured'}
          </div>
        )}
      </div>

      {banner && (
        <div
          className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-xs font-medium ${
            banner.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : banner.type === 'error'
              ? 'border-rose-200 bg-rose-50 text-rose-900'
              : 'border-blue-200 bg-blue-50 text-blue-900'
          }`}
        >
          {banner.type === 'success' ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <span>{banner.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* Controls Column */}
        <div className="space-y-5 xl:col-span-5">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Wand2 className="h-4 w-4 text-blue-600" />
              1. AI Creative Direction & Prompt
            </h3>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Graphic Type</label>
                <select
                  value={graphicType}
                  onChange={(e) => setGraphicType(e.target.value as GraphicDesignType)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900"
                >
                  {GRAPHIC_TYPES.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Target Platform</label>
                <select
                  value={platformKey}
                  onChange={(e) => setPlatformKey(e.target.value as PlatformKey)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900"
                >
                  {PLATFORMS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">Platform Aspect Ratio</label>
              <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {GRAPHIC_ASPECT_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setAspectRatio(p.id)}
                    className={`rounded-lg border px-2.5 py-2 text-left text-[11px] font-semibold transition-colors ${
                      aspectRatio === p.id
                        ? 'border-blue-600 bg-blue-50 text-blue-800'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div>{p.id}</div>
                    <div className="text-[10px] font-normal text-slate-500">
                      {p.width}×{p.height}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">Design Brief / Campaign Offer</label>
              <textarea
                rows={3}
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                placeholder="e.g., Launch announcement for our Q4 Brand Operating System — 20% annual partner offer ending Friday."
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={busyDirection}
                onClick={() => void handleGenerateDirection()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {busyDirection ? 'Generating Blueprint...' : 'Generate AI Art Direction (4 cr)'}
              </button>
              <button
                type="button"
                disabled={busyLiveImage}
                onClick={() => void handleGenerateLiveAiImage()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-semibold text-blue-800 hover:bg-blue-100 disabled:opacity-60"
              >
                <ImageIcon className="h-3.5 w-3.5" />
                {busyLiveImage ? 'Requesting Image Service...' : 'Generate Live AI Image'}
              </button>
            </div>

            {imagePrompt && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <label className="block text-[11px] font-semibold text-slate-700">AI Image Generation Prompt</label>
                <textarea
                  rows={2}
                  value={imagePrompt}
                  onChange={(e) => setImagePrompt(e.target.value)}
                  className="mt-1 w-full rounded border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] text-slate-800"
                />
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Layers className="h-4 w-4 text-blue-600" />
              2. Brand Graphic Compositor Controls
            </h3>

            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Headline</label>
                <input
                  type="text"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Subheadline</label>
                <input
                  type="text"
                  value={subheadline}
                  onChange={(e) => setSubheadline(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Call To Action</label>
                  <input
                    type="text"
                    value={ctaText}
                    onChange={(e) => setCtaText(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Layout Style</label>
                  <select
                    value={layoutTheme}
                    onChange={(e) => setLayoutTheme(e.target.value as (typeof LAYOUT_THEMES)[number]['id'])}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900"
                  >
                    {LAYOUT_THEMES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={includeLogo}
                  onChange={(e) => setIncludeLogo(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600"
                />
                Overlay Workspace Brand Logo
              </label>

              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleUploadBg}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Upload Background Image
                </button>
                {uploadedBgUrl && (
                  <button
                    type="button"
                    onClick={() => setUploadedBgUrl(null)}
                    className="text-xs font-medium text-rose-600 hover:underline"
                  >
                    Clear Image
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Live Preview & Attach Column */}
        <div className="space-y-5 xl:col-span-7">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Live Graphic Preview</h3>
                <p className="text-[11px] text-slate-500">
                  Rendered at {preset.width}×{preset.height}px ({preset.label})
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={renderCanvas}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={handleDownloadPng}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download PNG
                </button>
                <button
                  type="button"
                  disabled={busySave}
                  onClick={() => void handleSaveCompositorToLibrary()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {busySave ? 'Saving...' : 'Save to Media Library'}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-slate-100/80 p-4">
              <canvas
                ref={canvasRef}
                className="max-h-[460px] w-auto max-w-full rounded-lg shadow-md"
              />
            </div>

            {/* Caption + Attach to Scheduled Post */}
            <div className="space-y-3 border-t border-slate-100 pt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Editable Post Caption</label>
                <textarea
                  rows={3}
                  value={captionText}
                  onChange={(e) => setCaptionText(e.target.value)}
                  placeholder="Write or refine the accompanying social media caption for this graphic..."
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600">Connected Account (Optional)</label>
                  <select
                    value={attachAccountId}
                    onChange={(e) => setAttachAccountId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-900"
                  >
                    <option value="">Any {platformKey.toUpperCase()} account</option>
                    {accounts
                      .filter((a) => a.platformKey === platformKey)
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.accountName} ({a.accountHandle})
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600">Schedule Date & Time</label>
                  <input
                    type="datetime-local"
                    value={attachScheduleAt}
                    onChange={(e) => setAttachScheduleAt(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs text-slate-900"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    disabled={busySchedule}
                    onClick={() => void handleAttachAndSchedule()}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
                  >
                    <CalendarPlus className="h-3.5 w-3.5" />
                    {busySchedule ? 'Scheduling...' : 'Save & Schedule Post'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Saved & Attempted Graphics History */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900">Recent Workspace Graphics ({graphics.length})</h3>
            {graphics.length === 0 ? (
              <p className="mt-3 text-xs text-slate-500">
                No graphics saved yet. Render a branded graphic above and click Save to Media Library.
              </p>
            ) : (
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                {graphics.slice(0, 9).map((g) => (
                  <div key={g.id} className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                    {g.status === 'generated' && g.imageUrl ? (
                      <img
                        src={g.imageUrl}
                        alt={g.prompt}
                        className="h-32 w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-32 flex-col items-center justify-center bg-rose-50/70 p-3 text-center">
                        <AlertTriangle className="h-5 w-5 text-rose-500" />
                        <p className="mt-1 text-[11px] font-semibold text-rose-800">Generation Failed</p>
                        <p className="mt-0.5 line-clamp-2 text-[10px] text-rose-700">{g.errorMessage}</p>
                      </div>
                    )}
                    <div className="p-2.5">
                      <p className="truncate text-xs font-semibold text-slate-900">
                        {g.graphicType.replace(/_/g, ' ')}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {g.platformKey.toUpperCase()} · {g.aspectRatio} · {g.sourceMode}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
