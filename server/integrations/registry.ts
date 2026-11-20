import type { PlatformKey } from '../../src/shared/api-contracts';
import type { SocialPlatformProvider } from './types';
import { facebookProvider } from './providers/facebook';
import { instagramProvider } from './providers/instagram';
import { tiktokProvider } from './providers/tiktok';
import { linkedinProvider } from './providers/linkedin';
import { youtubeProvider } from './providers/youtube';
import { xProvider } from './providers/x';
import { pinterestProvider } from './providers/pinterest';
import { googleBusinessProvider } from './providers/googleBusiness';

export const SOCIAL_PROVIDERS: Record<PlatformKey, SocialPlatformProvider> = {
  facebook: facebookProvider,
  instagram: instagramProvider,
  tiktok: tiktokProvider,
  linkedin: linkedinProvider,
  youtube: youtubeProvider,
  x: xProvider,
  pinterest: pinterestProvider,
  google_business: googleBusinessProvider,
};

export const SOCIAL_PROVIDER_LIST: SocialPlatformProvider[] = [
  facebookProvider,
  instagramProvider,
  tiktokProvider,
  linkedinProvider,
  youtubeProvider,
  xProvider,
  pinterestProvider,
  googleBusinessProvider,
];

export function getSocialProvider(key: PlatformKey): SocialPlatformProvider {
  const provider = SOCIAL_PROVIDERS[key];
  if (!provider) {
    throw new Error(`Unsupported social media platform: ${key}`);
  }
  return provider;
}

export function isValidPlatformKey(key: string): key is PlatformKey {
  return key in SOCIAL_PROVIDERS;
}
