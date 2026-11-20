import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Sparkles,
  Copy,
  Check,
  Save,
  CalendarPlus,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Repeat2,
  Film,
  Hash,
  FileText,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../lib/apiClient';
import {
  ALL_PLATFORM_KEYS,
  convertLocalDateTimeToUtcIso,
  getPlatformCharLimit,
  normalizeHashtags,
  parseKeywordsInput,
} from '../../utils/domain';
import type {
  ContentCampaignRecord,
  ContentSafetyResult,
  ContentStudioType,
  GeneratedContentRecord,
  PlatformKey,
  PublishingFormatKey,
  RecurrenceType,
  RepurposedVariant,
  SocialAccountRecord,
  VideoScriptPayload,
} from '../../shared/api-contracts';

type StudioTab = 'composer' | 'repurpose' | 'video' | 'tools';

const CONTENT_TYPES: { value: ContentStudioType; label: string }[] = [
  { value: 'social_post', label: 'Social Media Post' },
  { value: 'caption', label: 'Caption Copy' },
  { value: 'promotional', label: 'Promotional Offer' },
  { value: 'educational', label: 'Educational Value' },
  { value: 'storytelling', label: 'Brand Storytelling' },
  { value: 'engagement_post', label: 'Engagement / Question' },
  { value: 'product_showcase', label: 'Product Showcase' },
  { value: 'announcement', label: 'Announcement' },
  { value: 'business_tip', label: 'Business Tip' },
  { value: 'campaign_content', label: 'Campaign Content' },
  { value: 'image_prompt', label: 'Image Prompt Concept' },
  { value: 'flyer_graphic', label: 'Flyer & Graphic Copy' },
  { value: 'video_script', label: 'Video Script' },
  { value: 'short_form_concept', label: 'Short-Form Video Concept' },
];

const PLATFORM_LABELS: Record<PlatformKey, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  linkedin: 'LinkedIn',
  youtube: 'YouTube',
  x: 'X (Twitter)',
  pinterest: 'Pinterest',
  google_business: 'Google Business',
};

const OBJECTIVES = [
  'Brand Awareness',
  'Lead Generation',
  'Product Education',
  'Community Engagement',
  'Website Traffic',
  'Conversion & Sales',
];

const TONES = [
  'Authoritative & Modern',
  'Warm & Conversational',
  'Executive & Insightful',
  'Bold & Promotional',
  'Educational & Clear',
  'Story-Driven & Authentic',
];

const LANGUAGES = ['English', 'French', 'Spanish', 'German', 'Portuguese', 'Arabic', 'Swahili'];

const COMMON_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Africa/Lagos',
  'Africa/Johannesburg',
  'Asia/Dubai',
  'Asia/Singapore',
  'Australia/Sydney',
];

function defaultLocalScheduleInput(): string {
  const d = new Date(Date.now() + 2 * 3600 * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:00`;
}

export const AiContentStudioPage: React.FC = () => {
  const { activeWorkspace, refreshSession } = useAuth();
  const [activeTab, setActiveTab] = useState<StudioTab>('composer');

  // Shared context data
  const [accounts, setAccounts] = useState<SocialAccountRecord[]>([]);
  const [campaigns, setCampaigns] = useState<ContentCampaignRecord[]>([]);
  const [savedItems, setSavedItems] = useState<GeneratedContentRecord[]>([]);
  const [loadingContext, setLoadingContext] = useState(true);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Composer inputs
  const [platformKey, setPlatformKey] = useState<PlatformKey>('linkedin');
  const [socialAccountId, setSocialAccountId] = useState<string>('');
  const [contentType, setContentType] = useState<ContentStudioType>('social_post');
  const [campaignId, setCampaignId] = useState<string>('');
  const [objective, setObjective] = useState<string>(OBJECTIVES[0]);
  const [targetAudience, setTargetAudience] = useState<string>('');
  const [toneOfVoice, setToneOfVoice] = useState<string>(TONES[0]);
  const [language, setLanguage] = useState<string>('English');
  const [topic, setTopic] = useState<string>('');
  const [keywordsRaw, setKeywordsRaw] = useState<string>('');
  const [generating, setGenerating] = useState(false);

  // Active editor state
  const [activeContentId, setActiveContentId] = useState<string | null>(null);
  const [headlineOptions, setHeadlineOptions] = useState<string[]>([]);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editHashtagsRaw, setEditHashtagsRaw] = useState('');
  const [editCta, setEditCta] = useState('');
  const [editImagePrompt, setEditImagePrompt] = useState('');
  const [editMediaUrl, setEditMediaUrl] = useState('');
  const [formatKey, setFormatKey] = useState<PublishingFormatKey>('text');
  const [scheduleLocal, setScheduleLocal] = useState<string>(defaultLocalScheduleInput);
  const [scheduleTz, setScheduleTz] = useState<string>('UTC');
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>('none');
  const [safetyResult, setSafetyResult] = useState<ContentSafetyResult | null>(null);
  const [checkingSafety, setCheckingSafety] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Repurpose tab
  const [repurposeSource, setRepurposeSource] = useState('');
  const [repurposePlatforms, setRepurposePlatforms] = useState<PlatformKey[]>([
    'linkedin',
    'instagram',
    'x',
    'facebook',
  ]);
  const [repurposeVariants, setRepurposeVariants] = useState<RepurposedVariant[]>([]);
  const [repurposing, setRepurposing] = useState(false);

  // Video script tab
  const [videoPlatform, setVideoPlatform] = useState<PlatformKey>('tiktok');
  const [videoTopic, setVideoTopic] = useState('');
  const [videoStyle, setVideoStyle] = useState<
    'short_form_reel' | 'product_demo' | 'explainer' | 'founder_story' | 'youtube_video'
  >('short_form_reel');
  const [videoDuration, setVideoDuration] = useState(45);
  const [videoResult, setVideoResult] = useState<{
    title: string;
    conceptSummary: string;
    script: VideoScriptPayload;
    captionIdea: string;
    hashtags: string[];
  } | null>(null);
  const [generatingVideo, setGeneratingVideo] = useState(false);

  // Captions / Hashtags / Keywords tools tab
  const [toolPlatform, setToolPlatform] = useState<PlatformKey>('instagram');
  const [toolSubject, setToolSubject] = useState('');
  const [toolVisual, setToolVisual] = useState('');
  const [toolBusy, setToolBusy] = useState<'caption' | 'hashtags' | 'keywords' | null>(null);
  const [captionResult, setCaptionResult] = useState<{
    primaryCaption: string;
    shortCaption: string;
    storytellingCaption: string;
    callToAction: string;
    hashtags: string[];
  } | null>(null);
  const [hashtagResult, setHashtagResult] = useState<{
    broadTags: string[];
    nicheTags: string[];
    brandedTags: string[];
    recommendedSet: string[];
    platformGuidance: string;
  } | null>(null);
  const [keywordResult, setKeywordResult] = useState<{
    primaryKeywords: string[];
    longTailPhrases: string[];
    questionQueries: string[];
    contentAngles: { keyword: string; intent: string; suggestedHook: string }[];
    caveat: string;
  } | null>(null);

  const loadWorkspaceContext = useCallback(async () => {
    if (!activeWorkspace) return;
    setLoadingContext(true);
    try {
      const [accRes, campRes, contentRes] = await Promise.all([
        apiClient.getSocialAccounts(activeWorkspace.id),
        apiClient.getCampaigns(activeWorkspace.id),
        apiClient.getGeneratedContent(activeWorkspace.id),
      ]);
      setAccounts(accRes.accounts.filter((a) => a.connectionStatus === 'connected'));
      setCampaigns(campRes.campaigns);
      setSavedItems(contentRes.items);
      if (activeWorkspace.brandProfile?.targetAudience && !targetAudience) {
        setTargetAudience(activeWorkspace.brandProfile.targetAudience);
      }
      if (activeWorkspace.timezone) {
        setScheduleTz(activeWorkspace.timezone);
      }
    } catch (err) {
      setBanner({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to load workspace studio data.',
      });
    } finally {
      setLoadingContext(false);
    }
  }, [activeWorkspace, targetAudience]);

  useEffect(() => {
    void loadWorkspaceContext();
  }, [loadWorkspaceContext]);

  const matchingAccounts = useMemo(
    () => accounts.filter((a) => a.platformKey === platformKey),
    [accounts, platformKey]
  );

  useEffect(() => {
    if (matchingAccounts.length > 0 && !matchingAccounts.some((a) => a.id === socialAccountId)) {
      setSocialAccountId(matchingAccounts[0].id);
    } else if (matchingAccounts.length === 0) {
      setSocialAccountId('');
    }
  }, [matchingAccounts, socialAccountId]);

  const charLimit = getPlatformCharLimit(platformKey);
  const currentCharCount = editBody.length;
  const overLimit = currentCharCount > charLimit;

  const loadSavedIntoEditor = (item: GeneratedContentRecord) => {
    setActiveTab('composer');
    setActiveContentId(item.id);
    setPlatformKey(item.platformKey);
    setContentType(item.contentType);
    setTopic(item.topic);
    setEditTitle(item.title);
    setEditBody(item.bodyText);
    setEditHashtagsRaw(item.hashtags.join(' '));
    setEditCta(item.callToAction);
    setEditImagePrompt(item.imagePrompt);
    setHeadlineOptions([item.title]);
    setSafetyResult(
      item.safetyNotes.length > 0
        ? {
            status: item.safetyStatus,
            issues: item.safetyNotes.map((m, idx) => ({
              code: `NOTE_${idx}`,
              severity: item.safetyStatus === 'blocked' ? 'error' : 'warning',
              message: m,
            })),
            contentHash: '',
          }
        : null
    );
  };

  const handleGeneratePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace || !topic.trim()) return;
    setGenerating(true);
    setBanner(null);
    try {
      const res = await apiClient.studioGeneratePost(activeWorkspace.id, {
        platformKey,
        socialAccountId: socialAccountId || null,
        campaignId: campaignId || null,
        contentType,
        topic: topic.trim(),
        keywords: parseKeywordsInput(keywordsRaw),
        objective,
        targetAudience: targetAudience.trim() || undefined,
        toneOfVoice,
        language,
      });
      setActiveContentId(res.content.id);
      setHeadlineOptions(res.headlineOptions.length > 0 ? res.headlineOptions : [res.content.title]);
      setEditTitle(res.content.title);
      setEditBody(res.content.bodyText);
      setEditHashtagsRaw(res.content.hashtags.join(' '));
      setEditCta(res.content.callToAction);
      setEditImagePrompt(res.content.imagePrompt);
      setSafetyResult({
        status: res.content.safetyStatus,
        issues: res.content.safetyNotes.map((m, idx) => ({
          code: `SAFETY_${idx}`,
          severity: res.content.safetyStatus === 'blocked' ? 'error' : 'warning',
          message: m,
        })),
        contentHash: '',
      });
      setBanner({
        type: 'success',
        text: `Generated ${CONTENT_TYPES.find((c) => c.value === contentType)?.label} for ${PLATFORM_LABELS[platformKey]} (${res.creditsRemaining} credits remaining).`,
      });
      const updated = await apiClient.getGeneratedContent(activeWorkspace.id);
      setSavedItems(updated.items);
      void refreshSession();
    } catch (err) {
      setBanner({
        type: 'error',
        text: err instanceof Error ? err.message : 'AI content generation failed.',
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleRunSafetyCheck = async () => {
    if (!activeWorkspace || !editBody.trim()) return;
    setCheckingSafety(true);
    try {
      const hashtags = normalizeHashtags(editHashtagsRaw.split(/[\s,]+/).filter(Boolean));
      const res = await apiClient.checkContentSafety(activeWorkspace.id, {
        platformKey,
        socialAccountId: socialAccountId || null,
        title: editTitle,
        bodyText: editBody,
        hashtags,
      });
      setSafetyResult(res);
    } catch (err) {
      setBanner({
        type: 'error',
        text: err instanceof Error ? err.message : 'Content safety check failed.',
      });
    } finally {
      setCheckingSafety(false);
    }
  };

  const handleSaveEdits = async () => {
    if (!activeWorkspace || !activeContentId) return;
    setSaving(true);
    setBanner(null);
    try {
      const hashtags = normalizeHashtags(editHashtagsRaw.split(/[\s,]+/).filter(Boolean));
      const res = await apiClient.updateGeneratedContent(activeWorkspace.id, activeContentId, {
        title: editTitle.trim(),
        bodyText: editBody.trim(),
        captionText: editBody.trim(),
        hashtags,
        callToAction: editCta.trim(),
        imagePrompt: editImagePrompt.trim(),
        platformKey,
      });
      setSafetyResult(res.safety);
      setBanner({ type: 'success', text: 'Edits saved and re-verified against workspace Content Safety rules.' });
      const updated = await apiClient.getGeneratedContent(activeWorkspace.id);
      setSavedItems(updated.items);
    } catch (err) {
      setBanner({ type: 'error', text: err instanceof Error ? err.message : 'Failed to save edits.' });
    } finally {
      setSaving(false);
    }
  };

  const handleSchedulePost = async (mode: 'automatic' | 'approval_required' | 'draft') => {
    if (!activeWorkspace || !editBody.trim()) return;
    setScheduling(true);
    setBanner(null);
    try {
      const hashtags = normalizeHashtags(editHashtagsRaw.split(/[\s,]+/).filter(Boolean));
      const scheduledUtc = convertLocalDateTimeToUtcIso(scheduleLocal, scheduleTz);
      const res = await apiClient.enqueuePublishingJob(activeWorkspace.id, {
        platformKey,
        socialAccountId: socialAccountId || null,
        campaignId: campaignId || null,
        generatedContentId: activeContentId,
        formatKey,
        title: editTitle.trim() || topic.trim() || `${PLATFORM_LABELS[platformKey]} Post`,
        bodyText: editBody.trim(),
        hashtags,
        mediaUrls: editMediaUrl.trim() ? [editMediaUrl.trim()] : [],
        scheduledAt: scheduledUtc,
        timezone: scheduleTz,
        recurrenceRule: { type: recurrenceType },
        publishingModeOverride: mode === 'draft' ? undefined : mode,
        saveAsDraft: mode === 'draft',
      });
      setBanner({
        type: 'success',
        text:
          mode === 'draft'
            ? 'Saved to Content Calendar as Draft.'
            : res.job.status === 'awaiting_approval'
            ? 'Submitted to Pre-Publishing Approval Queue.'
            : `Scheduled for Automatic Publishing (${res.job.timezone}). Background worker will publish automatically at the scheduled time.`,
      });
      const updated = await apiClient.getGeneratedContent(activeWorkspace.id);
      setSavedItems(updated.items);
    } catch (err) {
      setBanner({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to schedule post.',
      });
    } finally {
      setScheduling(false);
    }
  };

  const handleRepurpose = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace || !repurposeSource.trim() || repurposePlatforms.length === 0) return;
    setRepurposing(true);
    setBanner(null);
    try {
      const res = await apiClient.repurposeContent(activeWorkspace.id, {
        sourceIdeaOrCopy: repurposeSource.trim(),
        targetPlatforms: repurposePlatforms,
        toneOfVoice,
        language,
      });
      setRepurposeVariants(res.variants);
      setBanner({
        type: 'success',
        text: `Repurposed into ${res.variants.length} platform-native drafts (${res.creditsRemaining} credits remaining).`,
      });
      void refreshSession();
    } catch (err) {
      setBanner({ type: 'error', text: err instanceof Error ? err.message : 'Repurposing failed.' });
    } finally {
      setRepurposing(false);
    }
  };

  const handleScheduleVariant = async (variant: RepurposedVariant) => {
    if (!activeWorkspace) return;
    setBanner(null);
    try {
      const matching = accounts.find((a) => a.platformKey === variant.platformKey);
      const scheduledUtc = convertLocalDateTimeToUtcIso(scheduleLocal, scheduleTz);
      await apiClient.enqueuePublishingJob(activeWorkspace.id, {
        platformKey: variant.platformKey,
        socialAccountId: matching?.id || null,
        formatKey: variant.platformKey === 'instagram' || variant.platformKey === 'pinterest' ? 'image' : 'text',
        title: variant.headline || `${PLATFORM_LABELS[variant.platformKey]} Repurposed Post`,
        bodyText: variant.body,
        hashtags: variant.hashtags,
        mediaUrls: editMediaUrl.trim() ? [editMediaUrl.trim()] : [],
        scheduledAt: scheduledUtc,
        timezone: scheduleTz,
        saveAsDraft: variant.platformKey === 'instagram' || variant.platformKey === 'pinterest' ? !editMediaUrl.trim() : false,
      });
      setBanner({
        type: 'success',
        text: `Added ${PLATFORM_LABELS[variant.platformKey]} variant to Content Calendar & Auto-Publisher.`,
      });
    } catch (err) {
      setBanner({ type: 'error', text: err instanceof Error ? err.message : 'Unable to queue variant.' });
    }
  };

  const handleGenerateVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace || !videoTopic.trim()) return;
    setGeneratingVideo(true);
    setBanner(null);
    try {
      const res = await apiClient.generateVideoScript(activeWorkspace.id, {
        platformKey: videoPlatform,
        topic: videoTopic.trim(),
        formatStyle: videoStyle,
        targetDurationSeconds: videoDuration,
        toneOfVoice,
        language,
      });
      setVideoResult(res);
      setBanner({
        type: 'success',
        text: `Generated ${videoDuration}s video script (${res.creditsRemaining} credits remaining).`,
      });
      void refreshSession();
    } catch (err) {
      setBanner({ type: 'error', text: err instanceof Error ? err.message : 'Video script generation failed.' });
    } finally {
      setGeneratingVideo(false);
    }
  };

  const handleRunMicroTool = async (kind: 'caption' | 'hashtags' | 'keywords') => {
    if (!activeWorkspace || !toolSubject.trim()) return;
    setToolBusy(kind);
    setBanner(null);
    try {
      if (kind === 'caption') {
        const res = await apiClient.generateCaptions(activeWorkspace.id, {
          platformKey: toolPlatform,
          subject: toolSubject.trim(),
          visualDescription: toolVisual.trim() || undefined,
          toneOfVoice,
          language,
        });
        setCaptionResult(res);
      } else if (kind === 'hashtags') {
        const res = await apiClient.recommendHashtags(activeWorkspace.id, {
          platformKey: toolPlatform,
          topic: toolSubject.trim(),
          language,
        });
        setHashtagResult(res);
      } else {
        const res = await apiClient.researchKeywords(activeWorkspace.id, {
          platformKey: toolPlatform,
          seedTopic: toolSubject.trim(),
          language,
        });
        setKeywordResult(res);
      }
      void refreshSession();
    } catch (err) {
      setBanner({ type: 'error', text: err instanceof Error ? err.message : 'Tool request failed.' });
    } finally {
      setToolBusy(null);
    }
  };

  const copyText = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1800);
    } catch {
      // Clipboard restricted
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Workspace Sub-navigation */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold text-slate-900">AI Content Studio</h2>
          <p className="mt-1 text-xs text-slate-500">
            Generate brand-grounded posts, multi-platform repurposed campaigns, timestamped video scripts, captions, hashtags, and keywords — with automated Content Safety verification.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { id: 'composer', label: 'Post & Content Generator', icon: Sparkles },
              { id: 'repurpose', label: 'Multi-Platform Repurpose', icon: Repeat2 },
              { id: 'video', label: 'Video Scripts', icon: Film },
              { id: 'tools', label: 'Captions, Hashtags & Keywords', icon: Hash },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-700 text-white shadow-xs'
                    : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {banner && (
        <div
          className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-xs font-medium ${
            banner.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-rose-200 bg-rose-50 text-rose-900'
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

      {/* TAB 1: POST & CONTENT GENERATOR */}
      {activeTab === 'composer' && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          {/* Left Form Column */}
          <form
            onSubmit={handleGeneratePost}
            className="xl:col-span-5 rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Content Brief & Targeting</h3>
              <span className="rounded bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                5 AI Credits
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700">Social Platform</label>
                <select
                  value={platformKey}
                  onChange={(e) => setPlatformKey(e.target.value as PlatformKey)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                >
                  {ALL_PLATFORM_KEYS.map((p) => (
                    <option key={p} value={p}>
                      {PLATFORM_LABELS[p]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700">Connected Account</label>
                <select
                  value={socialAccountId}
                  onChange={(e) => setSocialAccountId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                >
                  {matchingAccounts.length === 0 ? (
                    <option value="">No connected {PLATFORM_LABELS[platformKey]} account yet</option>
                  ) : (
                    matchingAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.accountName} ({acc.accountHandle})
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700">Content Type</label>
                <select
                  value={contentType}
                  onChange={(e) => setContentType(e.target.value as ContentStudioType)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                >
                  {CONTENT_TYPES.map((ct) => (
                    <option key={ct.value} value={ct.value}>
                      {ct.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700">Campaign (Optional)</label>
                <select
                  value={campaignId}
                  onChange={(e) => setCampaignId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                >
                  <option value="">Standalone Post</option>
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700">Objective</label>
                <select
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                >
                  {OBJECTIVES.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700">Tone of Voice</label>
                <select
                  value={toneOfVoice}
                  onChange={(e) => setToneOfVoice(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                >
                  {TONES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700">Language</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang} value={lang}>
                      {lang}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700">Target Audience</label>
              <input
                type="text"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder="e.g., B2B SaaS marketing directors and agency founders"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700">Topic or Campaign Brief *</label>
              <textarea
                required
                rows={3}
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Describe what you want to announce, teach, showcase, or promote..."
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700">Keywords (comma-separated)</label>
              <input
                type="text"
                value={keywordsRaw}
                onChange={(e) => setKeywordsRaw(e.target.value)}
                placeholder="brand consistency, multi-channel publishing, Q3 launch"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={generating || !topic.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-60 transition-colors"
            >
              <Sparkles className="h-4 w-4" />
              {generating ? 'Generating with Brand Intelligence...' : 'Generate AI Content'}
            </button>
          </form>

          {/* Right Editor & Scheduler Column */}
          <div className="xl:col-span-7 space-y-5">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-700" />
                  <h3 className="text-sm font-bold text-slate-900">Content Editor & Safety Verification</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`font-mono-tabular text-[11px] font-semibold ${
                      overLimit ? 'text-rose-600' : 'text-slate-500'
                    }`}
                  >
                    {currentCharCount.toLocaleString()} / {charLimit.toLocaleString()} chars ({PLATFORM_LABELS[platformKey]})
                  </span>
                  <button
                    type="button"
                    disabled={checkingSafety || !editBody.trim()}
                    onClick={() => void handleRunSafetyCheck()}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                  >
                    <ShieldCheck className="h-3.5 w-3.5 text-blue-700" />
                    {checkingSafety ? 'Checking...' : 'Check Safety'}
                  </button>
                </div>
              </div>

              {safetyResult && (
                <div
                  className={`rounded-lg border px-3.5 py-2.5 text-xs ${
                    safetyResult.status === 'passed'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                      : safetyResult.status === 'flagged'
                      ? 'border-amber-200 bg-amber-50 text-amber-900'
                      : 'border-rose-200 bg-rose-50 text-rose-900'
                  }`}
                >
                  <p className="font-bold uppercase tracking-wide text-[10px]">
                    Content Safety Status: {safetyResult.status}
                  </p>
                  {safetyResult.issues.length === 0 ? (
                    <p className="mt-0.5">Passed banned words, misleading claim detection, duplicate hash, and platform length rules.</p>
                  ) : (
                    <ul className="mt-1 list-disc pl-4 space-y-0.5">
                      {safetyResult.issues.map((iss, idx) => (
                        <li key={idx}>{iss.message}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {headlineOptions.length > 1 && (
                <div>
                  <p className="text-[11px] font-semibold text-slate-600">Select a Headline Variation:</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {headlineOptions.map((h, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setEditTitle(h)}
                        className={`rounded-lg border px-2.5 py-1 text-left text-[11px] font-medium transition-colors ${
                          editTitle === h
                            ? 'border-blue-600 bg-blue-50 text-blue-900'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {h}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-slate-700">Headline / Post Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Headline or campaign title..."
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-900 focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-semibold text-slate-700">Post Copy / Caption</label>
                  {editBody && (
                    <button
                      type="button"
                      onClick={() => void copyText('main-copy', `${editBody}\n\n${editHashtagsRaw}`)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 hover:underline"
                    >
                      {copiedId === 'main-copy' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      {copiedId === 'main-copy' ? 'Copied' : 'Copy Post'}
                    </button>
                  )}
                </div>
                <textarea
                  rows={6}
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  placeholder="Generated post copy will appear here, or write directly..."
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs leading-relaxed text-slate-900 focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700">Hashtags</label>
                  <input
                    type="text"
                    value={editHashtagsRaw}
                    onChange={(e) => setEditHashtagsRaw(e.target.value)}
                    placeholder="#BrandGrowth #SaaS"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700">Call to Action</label>
                  <input
                    type="text"
                    value={editCta}
                    onChange={(e) => setEditCta(e.target.value)}
                    placeholder="Book a strategy review today."
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700">AI Visual / Graphic Prompt</label>
                  <input
                    type="text"
                    value={editImagePrompt}
                    onChange={(e) => setEditImagePrompt(e.target.value)}
                    placeholder="Art direction prompt for AI Graphic Designer..."
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700">Attached Media URL (Optional)</label>
                  <input
                    type="text"
                    value={editMediaUrl}
                    onChange={(e) => setEditMediaUrl(e.target.value)}
                    placeholder="/generated/... or https://..."
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Publishing Schedule Bar */}
              <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-3.5 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-blue-950">
                  <Clock className="h-3.5 w-3.5 text-blue-700" />
                  Publishing Schedule & Automation
                </div>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-4">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-700">Format</label>
                    <select
                      value={formatKey}
                      onChange={(e) => setFormatKey(e.target.value as PublishingFormatKey)}
                      className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-xs"
                    >
                      <option value="text">Text Post</option>
                      <option value="image">Image Post</option>
                      <option value="video">Video</option>
                      <option value="carousel">Carousel</option>
                      <option value="reels">Reels</option>
                      <option value="short_form_video">Short-Form Video</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-700">Local Date & Time</label>
                    <input
                      type="datetime-local"
                      value={scheduleLocal}
                      onChange={(e) => setScheduleLocal(e.target.value)}
                      className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-700">Timezone (DST-Aware)</label>
                    <select
                      value={scheduleTz}
                      onChange={(e) => setScheduleTz(e.target.value)}
                      className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-xs"
                    >
                      {COMMON_TIMEZONES.map((tz) => (
                        <option key={tz} value={tz}>
                          {tz}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-700">Recurrence</label>
                    <select
                      value={recurrenceType}
                      onChange={(e) => setRecurrenceType(e.target.value as RecurrenceType)}
                      className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-xs"
                    >
                      <option value="none">One-Time</option>
                      <option value="daily">Daily</option>
                      <option value="weekdays">Weekdays (Mon–Fri)</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {activeContentId && (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void handleSaveEdits()}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                    >
                      <Save className="h-3.5 w-3.5" />
                      {saving ? 'Saving...' : 'Save Edits'}
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={scheduling || !editBody.trim() || overLimit}
                    onClick={() => void handleSchedulePost('automatic')}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
                  >
                    <CalendarPlus className="h-3.5 w-3.5" />
                    Schedule Auto-Publish
                  </button>
                  <button
                    type="button"
                    disabled={scheduling || !editBody.trim() || overLimit}
                    onClick={() => void handleSchedulePost('approval_required')}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-60"
                  >
                    Submit for Approval
                  </button>
                  <button
                    type="button"
                    disabled={scheduling || !editBody.trim()}
                    onClick={() => void handleSchedulePost('draft')}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  >
                    Save as Draft
                  </button>
                </div>
              </div>
            </div>

            {/* Saved Generated Content Library */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900">
                  Saved Studio Drafts ({savedItems.length})
                </h3>
                <button
                  type="button"
                  onClick={() => void loadWorkspaceContext()}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-blue-700"
                >
                  <RefreshCw className="h-3 w-3" />
                  Refresh
                </button>
              </div>
              {loadingContext ? (
                <p className="py-6 text-center text-xs text-slate-500">Loading saved studio content...</p>
              ) : savedItems.length === 0 ? (
                <p className="py-6 text-center text-xs text-slate-500">
                  No generated drafts yet. Use the Content Brief form to generate your first brand-aligned draft.
                </p>
              ) : (
                <div className="mt-3 divide-y divide-slate-100 max-h-80 overflow-y-auto">
                  {savedItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start justify-between gap-3 py-3 hover:bg-slate-50/70 px-2 rounded-lg"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-700">
                            {item.platformKey}
                          </span>
                          <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                            {item.contentType.replace(/_/g, ' ')}
                          </span>
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                              item.safetyStatus === 'passed'
                                ? 'bg-emerald-50 text-emerald-700'
                                : item.safetyStatus === 'flagged'
                                ? 'bg-amber-50 text-amber-800'
                                : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {item.safetyStatus}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-xs font-bold text-slate-900">{item.title}</p>
                        <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-600">{item.bodyText}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => loadSavedIntoEditor(item)}
                        className="shrink-0 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[11px] font-semibold text-blue-800 hover:bg-blue-100"
                      >
                        Load & Edit
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MULTI-PLATFORM REPURPOSING */}
      {activeTab === 'repurpose' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <form
            onSubmit={handleRepurpose}
            className="lg:col-span-5 rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Source Idea, Article, or Post</h3>
              <span className="rounded bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                8 AI Credits
              </span>
            </div>
            <textarea
              required
              rows={6}
              value={repurposeSource}
              onChange={(e) => setRepurposeSource(e.target.value)}
              placeholder="Paste a blog excerpt, product release note, webinar summary, or single social post to transform into native posts for each platform..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
            />
            <div>
              <p className="text-[11px] font-semibold text-slate-700 mb-2">Target Platforms</p>
              <div className="grid grid-cols-2 gap-2">
                {ALL_PLATFORM_KEYS.map((p) => {
                  const checked = repurposePlatforms.includes(p);
                  return (
                    <label
                      key={p}
                      className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs cursor-pointer ${
                        checked
                          ? 'border-blue-600 bg-blue-50 text-blue-900 font-semibold'
                          : 'border-slate-200 text-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) =>
                          setRepurposePlatforms((prev) =>
                            e.target.checked ? [...prev, p] : prev.filter((item) => item !== p)
                          )
                        }
                      />
                      {PLATFORM_LABELS[p]}
                    </label>
                  );
                })}
              </div>
            </div>
            <button
              type="submit"
              disabled={repurposing || !repurposeSource.trim() || repurposePlatforms.length === 0}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
            >
              <Repeat2 className="h-4 w-4" />
              {repurposing ? 'Repurposing Across Platforms...' : 'Repurpose Content'}
            </button>
          </form>

          <div className="lg:col-span-7 space-y-3">
            {repurposeVariants.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
                <Repeat2 className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-2 text-sm font-semibold text-slate-800">Multi-Platform Native Variants</p>
                <p className="mt-1 text-xs text-slate-500">
                  Each variant respects platform character caps, formatting conventions, and hashtag best practices.
                </p>
              </div>
            ) : (
              repurposeVariants.map((v, idx) => (
                <div key={`${v.platformKey}-${idx}`} className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-blue-700 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                        {PLATFORM_LABELS[v.platformKey]}
                      </span>
                      <span className="text-xs font-semibold text-slate-700">{v.format}</span>
                      <span className="font-mono-tabular text-[11px] text-slate-500">
                        {v.characterCount}/{v.characterLimit} chars
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void copyText(`rep-${idx}`, `${v.body}\n\n${v.hashtags.join(' ')}`)}
                        className="rounded border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        {copiedId === `rep-${idx}` ? 'Copied' : 'Copy'}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleScheduleVariant(v)}
                        className="rounded bg-blue-700 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-blue-800"
                      >
                        Schedule to Calendar
                      </button>
                    </div>
                  </div>
                  <p className="text-xs font-bold text-slate-900">{v.headline}</p>
                  <p className="whitespace-pre-line text-xs text-slate-700">{v.body}</p>
                  {v.hashtags.length > 0 && (
                    <p className="text-[11px] font-medium text-blue-700">{v.hashtags.join(' ')}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: VIDEO SCRIPTS */}
      {activeTab === 'video' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <form
            onSubmit={handleGenerateVideo}
            className="lg:col-span-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Video Script Generator</h3>
              <span className="rounded bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                6 AI Credits
              </span>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700">Platform</label>
              <select
                value={videoPlatform}
                onChange={(e) => setVideoPlatform(e.target.value as PlatformKey)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs"
              >
                <option value="tiktok">TikTok</option>
                <option value="instagram">Instagram Reels</option>
                <option value="youtube">YouTube / Shorts</option>
                <option value="facebook">Facebook Reels</option>
                <option value="linkedin">LinkedIn Video</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700">Format Style</label>
              <select
                value={videoStyle}
                onChange={(e) => setVideoStyle(e.target.value as typeof videoStyle)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs"
              >
                <option value="short_form_reel">Short-Form Reel / TikTok</option>
                <option value="product_demo">Product Showcase Demo</option>
                <option value="explainer">Educational Explainer</option>
                <option value="founder_story">Founder / Brand Story</option>
                <option value="youtube_video">Long-Form YouTube Outline</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700">
                Target Duration ({videoDuration}s)
              </label>
              <input
                type="range"
                min={15}
                max={180}
                step={15}
                value={videoDuration}
                onChange={(e) => setVideoDuration(Number(e.target.value))}
                className="mt-1 w-full"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700">Video Topic *</label>
              <textarea
                required
                rows={4}
                value={videoTopic}
                onChange={(e) => setVideoTopic(e.target.value)}
                placeholder="What product feature, customer lesson, or story should this video cover?"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
              />
            </div>
            <button
              type="submit"
              disabled={generatingVideo || !videoTopic.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
            >
              <Film className="h-4 w-4" />
              {generatingVideo ? 'Writing Script...' : 'Generate Video Script'}
            </button>
          </form>

          <div className="lg:col-span-8">
            {!videoResult ? (
              <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
                <Film className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-2 text-sm font-semibold text-slate-800">Timestamped Production Script</p>
                <p className="mt-1 text-xs text-slate-500">
                  Receive a 3-second opening hook, scene-by-scene visuals, voiceover lines, on-screen text, and B-roll checklist.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">{videoResult.title}</h3>
                  <p className="mt-1 text-xs text-slate-600">{videoResult.conceptSummary}</p>
                </div>
                {videoResult.script.hook && (
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                    <p className="text-[10px] font-bold uppercase text-blue-800">Opening Hook (0–3s)</p>
                    <p className="mt-1 text-xs font-semibold text-blue-950">{videoResult.script.hook}</p>
                  </div>
                )}
                {videoResult.script.scenes && videoResult.script.scenes.length > 0 && (
                  <div className="overflow-x-auto rounded-lg border border-slate-200">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-[11px] font-semibold text-slate-600">
                        <tr>
                          <th className="px-3 py-2">Time</th>
                          <th className="px-3 py-2">Visual Shot</th>
                          <th className="px-3 py-2">Voiceover / Script</th>
                          <th className="px-3 py-2">On-Screen Text</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {videoResult.script.scenes.map((s, idx) => (
                          <tr key={idx}>
                            <td className="px-3 py-2 font-mono-tabular font-semibold text-blue-700 whitespace-nowrap">
                              {s.timestamp}
                            </td>
                            <td className="px-3 py-2 text-slate-700">{s.visual}</td>
                            <td className="px-3 py-2 text-slate-900">{s.voiceover}</td>
                            <td className="px-3 py-2 font-medium text-slate-700">{s.onScreenText}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {videoResult.script.bRollIdeas && videoResult.script.bRollIdeas.length > 0 && (
                  <div>
                    <p className="text-[11px] font-bold text-slate-700">B-Roll Checklist</p>
                    <ul className="mt-1 list-disc pl-4 text-xs text-slate-600 space-y-0.5">
                      {videoResult.script.bRollIdeas.map((b, i) => (
                        <li key={i}>{b}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
                  <p className="font-bold text-slate-800">Publishing Caption & Hashtags</p>
                  <p className="mt-1 text-slate-700">{videoResult.captionIdea}</p>
                  <p className="mt-1 font-medium text-blue-700">{videoResult.hashtags.join(' ')}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: CAPTIONS, HASHTAGS & KEYWORDS */}
      {activeTab === 'tools' && (
        <div className="space-y-5">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700">Platform</label>
                <select
                  value={toolPlatform}
                  onChange={(e) => setToolPlatform(e.target.value as PlatformKey)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs"
                >
                  {ALL_PLATFORM_KEYS.map((p) => (
                    <option key={p} value={p}>
                      {PLATFORM_LABELS[p]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700">Topic / Subject *</label>
                <input
                  type="text"
                  value={toolSubject}
                  onChange={(e) => setToolSubject(e.target.value)}
                  placeholder="e.g., Enterprise SaaS onboarding automation"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700">Visual Description (for Captions)</label>
                <input
                  type="text"
                  value={toolVisual}
                  onChange={(e) => setToolVisual(e.target.value)}
                  placeholder="Optional photo or graphic description"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={toolBusy !== null || !toolSubject.trim()}
                onClick={() => void handleRunMicroTool('caption')}
                className="rounded-lg bg-blue-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
              >
                {toolBusy === 'caption' ? 'Writing Captions...' : 'Generate 3 Captions (3 cr)'}
              </button>
              <button
                type="button"
                disabled={toolBusy !== null || !toolSubject.trim()}
                onClick={() => void handleRunMicroTool('hashtags')}
                className="rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-semibold text-blue-800 hover:bg-blue-100 disabled:opacity-60"
              >
                {toolBusy === 'hashtags' ? 'Researching...' : 'Recommend Hashtags (2 cr)'}
              </button>
              <button
                type="button"
                disabled={toolBusy !== null || !toolSubject.trim()}
                onClick={() => void handleRunMicroTool('keywords')}
                className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                {toolBusy === 'keywords' ? 'Analyzing...' : 'Keyword Research (3 cr)'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">Caption Variations</h4>
              {!captionResult ? (
                <p className="text-xs text-slate-400">Run Caption Generator to see Primary, Short, and Storytelling options.</p>
              ) : (
                <div className="space-y-3 text-xs">
                  <div className="rounded-lg bg-slate-50 p-2.5">
                    <p className="font-bold text-slate-800">Primary</p>
                    <p className="mt-1 text-slate-700">{captionResult.primaryCaption}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2.5">
                    <p className="font-bold text-slate-800">Short Hook</p>
                    <p className="mt-1 text-slate-700">{captionResult.shortCaption}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2.5">
                    <p className="font-bold text-slate-800">Storytelling</p>
                    <p className="mt-1 text-slate-700">{captionResult.storytellingCaption}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">Hashtag Tiers</h4>
              {!hashtagResult ? (
                <p className="text-xs text-slate-400">Run Hashtag Recommendations for balanced broad, niche, and branded tags.</p>
              ) : (
                <div className="space-y-2.5 text-xs">
                  <div>
                    <p className="font-bold text-slate-700">Recommended Set</p>
                    <p className="mt-1 font-medium text-blue-700">{hashtagResult.recommendedSet.join(' ')}</p>
                  </div>
                  <div>
                    <p className="font-bold text-slate-700">Niche Tags</p>
                    <p className="mt-0.5 text-slate-600">{hashtagResult.nicheTags.join(' ')}</p>
                  </div>
                  <div>
                    <p className="font-bold text-slate-700">Branded Tags</p>
                    <p className="mt-0.5 text-slate-600">{hashtagResult.brandedTags.join(' ')}</p>
                  </div>
                  <p className="rounded bg-slate-50 p-2 text-[11px] text-slate-600">
                    {hashtagResult.platformGuidance}
                  </p>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">Keyword Research</h4>
              {!keywordResult ? (
                <p className="text-xs text-slate-400">Run Keyword Research for search phrases, questions, and hooks.</p>
              ) : (
                <div className="space-y-2.5 text-xs">
                  <div>
                    <p className="font-bold text-slate-700">Primary Keywords</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {keywordResult.primaryKeywords.map((k, i) => (
                        <span key={i} className="rounded bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-800">
                          {k}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="font-bold text-slate-700">Question Queries</p>
                    <ul className="mt-1 list-disc pl-4 text-slate-600 space-y-0.5">
                      {keywordResult.questionQueries.map((q, i) => (
                        <li key={i}>{q}</li>
                      ))}
                    </ul>
                  </div>
                  <p className="rounded border border-amber-200 bg-amber-50 p-2 text-[11px] text-amber-900">
                    {keywordResult.caveat}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
