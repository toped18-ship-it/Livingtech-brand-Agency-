import React from 'react';
import type {
  PlatformCapabilityMatrix,
  PlatformKey,
  SocialAccountType,
} from '../../shared/api-contracts';

const PLATFORM_THEME: Record<
  PlatformKey,
  { bg: string; fg: string; shortLabel: string; label: string }
> = {
  facebook: { bg: '#1877F2', fg: '#FFFFFF', shortLabel: 'FB', label: 'Facebook Pages' },
  instagram: { bg: '#C13584', fg: '#FFFFFF', shortLabel: 'IG', label: 'Instagram Professional' },
  tiktok: { bg: '#111827', fg: '#FFFFFF', shortLabel: 'TT', label: 'TikTok' },
  linkedin: { bg: '#0A66C2', fg: '#FFFFFF', shortLabel: 'in', label: 'LinkedIn' },
  youtube: { bg: '#DC2626', fg: '#FFFFFF', shortLabel: 'YT', label: 'YouTube' },
  x: { bg: '#0F172A', fg: '#FFFFFF', shortLabel: 'X', label: 'X' },
  pinterest: { bg: '#E60023', fg: '#FFFFFF', shortLabel: 'P', label: 'Pinterest' },
  google_business: { bg: '#1A73E8', fg: '#FFFFFF', shortLabel: 'GB', label: 'Google Business Profile' },
};

export const ACCOUNT_TYPE_LABELS: Record<SocialAccountType, string> = {
  page: 'Facebook Page',
  business_account: 'Business Account',
  creator_account: 'Creator Account',
  channel: 'YouTube Channel',
  organization: 'Organization Page',
  profile: 'Verified Profile',
  location: 'Business Location',
};

export const CAPABILITY_ITEMS: {
  key: keyof Omit<PlatformCapabilityMatrix, 'notes'>;
  label: string;
  shortLabel: string;
  category: 'publishing' | 'engagement' | 'analytics';
}[] = [
  { key: 'textPublishing', label: 'Text Publishing', shortLabel: 'Text', category: 'publishing' },
  { key: 'imagePublishing', label: 'Image Publishing', shortLabel: 'Image', category: 'publishing' },
  { key: 'videoPublishing', label: 'Video Publishing', shortLabel: 'Video', category: 'publishing' },
  { key: 'carouselPublishing', label: 'Carousel Publishing', shortLabel: 'Carousel', category: 'publishing' },
  { key: 'storyPublishing', label: 'Story Publishing', shortLabel: 'Stories', category: 'publishing' },
  { key: 'reelsPublishing', label: 'Reels Publishing', shortLabel: 'Reels', category: 'publishing' },
  { key: 'shortFormVideoPublishing', label: 'Short-Form Video', shortLabel: 'Short Video', category: 'publishing' },
  { key: 'commentRetrieval', label: 'Comment Retrieval', shortLabel: 'Read Comments', category: 'engagement' },
  { key: 'commentResponses', label: 'Comment Responses', shortLabel: 'Reply Comments', category: 'engagement' },
  { key: 'analyticsRetrieval', label: 'Analytics Retrieval', shortLabel: 'Analytics', category: 'analytics' },
];

export function summarizePublishingCapabilities(cap: PlatformCapabilityMatrix): string {
  const supported = CAPABILITY_ITEMS.filter((c) => c.category === 'publishing' && cap[c.key]).map(
    (c) => c.shortLabel
  );
  return supported.length > 0 ? supported.join(' · ') : 'Read-only';
}

export function summarizeAnalyticsCapabilities(cap: PlatformCapabilityMatrix): string {
  const parts: string[] = [];
  if (cap.analyticsRetrieval) parts.push('Insights');
  if (cap.commentRetrieval && cap.commentResponses) parts.push('Comments + Replies');
  else if (cap.commentRetrieval) parts.push('Read-only Comments');
  return parts.length > 0 ? parts.join(' · ') : 'Basic Profile Only';
}

export const PlatformLogo: React.FC<{
  platformKey: PlatformKey;
  size?: 'sm' | 'md' | 'lg';
}> = ({ platformKey, size = 'md' }) => {
  const theme = PLATFORM_THEME[platformKey] || {
    bg: '#1E3A8A',
    fg: '#FFFFFF',
    shortLabel: platformKey.slice(0, 2).toUpperCase(),
    label: platformKey,
  };

  const dims =
    size === 'sm' ? 'h-7 w-7 text-[11px]' : size === 'lg' ? 'h-11 w-11 text-sm' : 'h-9 w-9 text-xs';

  return (
    <span
      title={theme.label}
      aria-label={theme.label}
      style={{ backgroundColor: theme.bg, color: theme.fg }}
      className={`inline-flex shrink-0 items-center justify-center rounded-lg font-display font-bold tracking-tight shadow-xs ${dims}`}
    >
      {platformKey === 'facebook' && (
        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
          <path d="M13.5 21v-7.5h2.5l.4-3h-2.9V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.5-4 4.1v2.1H7.7v3h2.5V21h3.3z" />
        </svg>
      )}
      {platformKey === 'instagram' && (
        <svg viewBox="0 0 24 24" className="h-4 w-4 stroke-current fill-none" strokeWidth="2" aria-hidden="true">
          <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.2" cy="6.8" r="1" className="fill-current stroke-none" />
        </svg>
      )}
      {platformKey === 'tiktok' && (
        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
          <path d="M15.6 4.2c.7 1.3 1.9 2.2 3.4 2.4v2.7c-1.3-.1-2.5-.5-3.5-1.2v6.2a5.2 5.2 0 1 1-4.5-5.1v2.8a2.5 2.5 0 1 0 1.8 2.4V4.2h2.8z" />
        </svg>
      )}
      {platformKey === 'linkedin' && (
        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
          <path d="M6.6 8.8a1.7 1.7 0 1 1 0-3.4 1.7 1.7 0 0 1 0 3.4zM5.1 19h3V10h-3v9zm5 0h2.9v-4.8c0-1.3.5-2.1 1.7-2.1 1 0 1.5.7 1.5 2.1V19h2.9v-5.7c0-2.5-1.3-3.7-3.3-3.7-1.5 0-2.4.8-2.8 1.6V10h-2.9v9z" />
        </svg>
      )}
      {platformKey === 'youtube' && (
        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
          <path d="M21 8.4a2.7 2.7 0 0 0-1.9-1.9C17.4 6 12 6 12 6s-5.4 0-7.1.5A2.7 2.7 0 0 0 3 8.4 28 28 0 0 0 2.6 12c0 1.2.1 2.4.4 3.6a2.7 2.7 0 0 0 1.9 1.9c1.7.5 7.1.5 7.1.5s5.4 0 7.1-.5a2.7 2.7 0 0 0 1.9-1.9c.3-1.2.4-2.4.4-3.6 0-1.2-.1-2.4-.4-3.6zM10.2 14.8V9.2L15 12l-4.8 2.8z" />
        </svg>
      )}
      {platformKey === 'x' && (
        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
          <path d="M17.5 4.5h2.7l-5.9 6.7 6.9 8.3h-5.4l-4.2-5.1-4.5 5.1H4.4l6.3-7.2L4.1 4.5h5.5l3.8 4.6 4.1-4.6zm-.9 13.5h1.5L8.7 6H7.1l9.5 12z" />
        </svg>
      )}
      {platformKey === 'pinterest' && (
        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
          <path d="M12.2 3.5c-4.9 0-7.4 3.3-7.4 6.1 0 1.7.7 3.2 2.1 3.7.2.1.4 0 .5-.2l.3-1.1c0-.2 0-.3-.1-.5-.4-.5-.7-1.2-.7-2.1 0-2.6 2-4.9 5.2-4.9 2.8 0 4.4 1.7 4.4 4.1 0 3.1-1.4 5.7-3.4 5.7-1.1 0-2-.9-1.7-2.1.3-1.3.9-2.8.9-3.7 0-.9-.5-1.6-1.4-1.6-1.1 0-2 1.2-2 2.7 0 1 .3 1.7.3 1.7l-1.3 5.7c-.4 1.6-.1 3.5 0 3.7.1.1.2.1.2 0 .1-.1 1.4-1.8 1.9-3.4l.7-2.6c.4.7 1.4 1.3 2.5 1.3 3.3 0 5.5-3 5.5-7 0-3-2.6-5.6-6.5-5.6z" />
        </svg>
      )}
      {platformKey === 'google_business' && (
        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
          <path d="M4.5 5.5h15l1.5 5.2a3.3 3.3 0 0 1-3.1 4.3 3.2 3.2 0 0 1-2.4-1.1 3.2 3.2 0 0 1-2.4 1.1 3.2 3.2 0 0 1-2.3-1.1A3.2 3.2 0 0 1 8.4 15a3.3 3.3 0 0 1-3.1-4.3l-.8-5.2zm1.5 10.8V20h12v-3.7a4.7 4.7 0 0 1-2.6.5 4.7 4.7 0 0 1-2.3-.9 4.7 4.7 0 0 1-4.6 0 4.7 4.7 0 0 1-2.5.4z" />
        </svg>
      )}
    </span>
  );
};
