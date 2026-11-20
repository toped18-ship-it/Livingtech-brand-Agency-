import test from 'node:test';
import assert from 'node:assert/strict';
import {
  slugifyWorkspaceName,
  validatePasswordStrength,
  calculateAiCreditCost,
  canTransitionPostStatus,
  hasSuperAdminAccess,
  formatCurrencyCents,
  formatBytes,
  summarizePostCounts,
  parseKeywordsInput,
  normalizeHashtags,
  getPlatformCharLimit,
  canAccountPublishFormat,
  maskClientId,
} from './domain';

test('slugifyWorkspaceName generates clean URL-safe tenant slugs', () => {
  assert.equal(slugifyWorkspaceName('LivingTech Global HQ!'), 'livingtech-global-hq');
  assert.equal(slugifyWorkspaceName('   ---   '), 'workspace');
});

test('validatePasswordStrength enforces minimum length, mixed case, and digits', () => {
  assert.equal(validatePasswordStrength('short1A').valid, false);
  assert.equal(validatePasswordStrength('alllowercase123').valid, false);
  assert.equal(validatePasswordStrength('NoDigitsHere').valid, false);
  assert.equal(validatePasswordStrength('LivingTech2026').valid, true);
});

test('calculateAiCreditCost returns deterministic costs per AI workflow', () => {
  assert.equal(calculateAiCreditCost('content_studio'), 5);
  assert.equal(calculateAiCreditCost('content_strategy'), 15);
  assert.equal(calculateAiCreditCost('caption_rewrite'), 2);
});

test('canTransitionPostStatus enforces terminal state lock on published posts', () => {
  assert.equal(canTransitionPostStatus('draft', 'scheduled'), true);
  assert.equal(canTransitionPostStatus('published', 'draft', false), false);
  assert.equal(canTransitionPostStatus('published', 'draft', true), true);
  assert.equal(canTransitionPostStatus('failed', 'scheduled'), true);
});

test('hasSuperAdminAccess strictly permits only super_admin role', () => {
  assert.equal(hasSuperAdminAccess('super_admin'), true);
  assert.equal(hasSuperAdminAccess('customer'), false);
  assert.equal(hasSuperAdminAccess('workspace_admin'), false);
  assert.equal(hasSuperAdminAccess(null), false);
});

test('formatters and post status counters compute accurately', () => {
  assert.equal(formatCurrencyCents(9900), '$99');
  assert.equal(formatBytes(1024 * 1024 * 2.5), '2.5 MB');
  assert.deepEqual(summarizePostCounts(['draft', 'scheduled', 'scheduled', 'published', 'failed']), {
    draft: 1,
    pending: 0,
    scheduled: 2,
    published: 1,
    failed: 1,
  });
});

test('parseKeywordsInput deduplicates and trims keywords safely', () => {
  assert.deepEqual(
    parseKeywordsInput('Brand Strategy, b2b growth; brand strategy, , ROI, a'),
    ['Brand Strategy', 'b2b growth', 'ROI']
  );
});

test('normalizeHashtags strips duplicates and enforces # prefix', () => {
  assert.deepEqual(
    normalizeHashtags(['#BrandGrowth', 'brandgrowth', '  ##Enterprise-SaaS! ', 'AI_Studio']),
    ['#BrandGrowth', '#EnterpriseSaaS', '#AI_Studio']
  );
});

test('getPlatformCharLimit returns accurate limits across all 8 Phase 2 platforms', () => {
  assert.equal(getPlatformCharLimit('x'), 280);
  assert.equal(getPlatformCharLimit('pinterest'), 500);
  assert.equal(getPlatformCharLimit('google_business'), 1500);
  assert.equal(getPlatformCharLimit('instagram'), 2200);
  assert.equal(getPlatformCharLimit('linkedin'), 3000);
});

test('canAccountPublishFormat enforces exact capability matrix flags', () => {
  const igCaps = {
    textPublishing: false,
    imagePublishing: true,
    videoPublishing: true,
    carouselPublishing: true,
    storyPublishing: true,
    reelsPublishing: true,
    shortFormVideoPublishing: true,
    commentRetrieval: true,
    commentResponses: true,
    analyticsRetrieval: true,
  };
  assert.equal(canAccountPublishFormat(igCaps, 'text'), false);
  assert.equal(canAccountPublishFormat(igCaps, 'reels'), true);
  assert.equal(canAccountPublishFormat(igCaps, 'carousel'), true);
});

test('maskClientId obscures middle characters without exposing full identifier', () => {
  assert.equal(maskClientId('1234567890abcdef'), '1234••••cdef');
  assert.equal(maskClientId('short'), 'sh••••');
  assert.equal(maskClientId(null), null);
});
