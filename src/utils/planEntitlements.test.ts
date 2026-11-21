import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FREE_TRIAL_DAYS,
  FREE_TRIAL_MS,
  canAccessFeature,
  canAccessRoute,
  canAddSocialAccount,
  canAddTeamMember,
  getEffectivePlanTier,
  getRequiredPlanForFeature,
  getRequiredPlanForRoute,
  getTrialDaysRemaining,
  isTrialActive,
  isTrialExpired,
  listIncludedFeaturesForTier,
  listLockedFeaturesForTier,
  normalizePlanCode,
} from './planEntitlements';

test('normalizePlanCode maps active and legacy codes accurately', () => {
  assert.equal(normalizePlanCode('basic'), 'basic');
  assert.equal(normalizePlanCode('starter'), 'basic');
  assert.equal(normalizePlanCode('pro'), 'pro');
  assert.equal(normalizePlanCode('growth'), 'pro');
  assert.equal(normalizePlanCode('agency'), 'pro');
  assert.equal(normalizePlanCode('enterprise'), 'enterprise');
  assert.equal(normalizePlanCode('none'), 'none');
  assert.equal(normalizePlanCode(undefined), 'none');
});

test('7-day free trial unlocks workspace during trial and locks everything after 7 days', () => {
  const now = Date.parse('2026-06-01T12:00:00.000Z');
  const activeTrial = {
    planCode: 'basic' as const,
    status: 'trialing' as const,
    currentPeriodEnd: new Date(now + FREE_TRIAL_MS).toISOString(),
  };

  assert.equal(FREE_TRIAL_DAYS, 7);
  assert.equal(isTrialActive(activeTrial, now), true);
  assert.equal(isTrialExpired(activeTrial, now), false);
  assert.equal(getTrialDaysRemaining(activeTrial, now), 7);
  assert.equal(getEffectivePlanTier(activeTrial, now), 'basic');
  assert.equal(canAccessFeature(activeTrial, 'social_accounts', now), true);
  assert.equal(canAccessFeature(activeTrial, 'ai_studio', now), true);
  assert.equal(canAccessRoute(activeTrial, 'calendar', now), true);

  // One millisecond after trial end -> trial is expired and subscription is required
  const afterSevenDays = now + FREE_TRIAL_MS + 1000;
  assert.equal(isTrialActive(activeTrial, afterSevenDays), false);
  assert.equal(isTrialExpired(activeTrial, afterSevenDays), true);
  assert.equal(getTrialDaysRemaining(activeTrial, afterSevenDays), 0);
  assert.equal(getEffectivePlanTier(activeTrial, afterSevenDays), 'none');
  assert.equal(canAccessFeature(activeTrial, 'social_accounts', afterSevenDays), false);
  assert.equal(canAccessFeature(activeTrial, 'ai_studio', afterSevenDays), false);
  assert.equal(canAccessRoute(activeTrial, 'calendar', afterSevenDays), false);
  assert.equal(canAccessRoute(activeTrial, 'billing', afterSevenDays), true);
  assert.equal(canAccessRoute(activeTrial, 'overview', afterSevenDays), true);
});

test('unsubscribed or cancelled workspaces cannot access paid modules but can access billing & overview', () => {
  const noneSub = { planCode: 'none' as const, status: 'none' as const };
  const cancelledSub = { planCode: 'enterprise' as const, status: 'cancelled' as const };
  const pastDueSub = { planCode: 'pro' as const, status: 'past_due' as const };

  assert.equal(getEffectivePlanTier(noneSub), 'none');
  assert.equal(getEffectivePlanTier(cancelledSub), 'none');
  assert.equal(getEffectivePlanTier(pastDueSub), 'none');

  for (const sub of [noneSub, cancelledSub, pastDueSub, null]) {
    assert.equal(canAccessRoute(sub, 'overview'), true);
    assert.equal(canAccessRoute(sub, 'billing'), true);
    assert.equal(canAccessRoute(sub, 'brand-settings'), true);
    assert.equal(canAccessRoute(sub, 'profile'), true);
    assert.equal(canAccessRoute(sub, 'support'), true);
    assert.equal(canAccessRoute(sub, 'notifications'), true);

    assert.equal(canAccessRoute(sub, 'social-accounts'), false);
    assert.equal(canAccessRoute(sub, 'ai-studio'), false);
    assert.equal(canAccessRoute(sub, 'calendar'), false);
    assert.equal(canAccessRoute(sub, 'media'), false);
    assert.equal(canAccessRoute(sub, 'graphic-designer'), false);
    assert.equal(canAccessRoute(sub, 'auto-publisher'), false);
    assert.equal(canAccessRoute(sub, 'analytics'), false);
    assert.equal(canAccessRoute(sub, 'ai-strategy'), false);
  }
});

test('Basic plan unlocks core publishing & AI Studio but locks Pro and Enterprise features', () => {
  const basic = { planCode: 'basic' as const, status: 'active' as const };

  assert.equal(canAccessFeature(basic, 'social_accounts'), true);
  assert.equal(canAccessFeature(basic, 'ai_studio'), true);
  assert.equal(canAccessFeature(basic, 'calendar'), true);
  assert.equal(canAccessFeature(basic, 'media'), true);

  assert.equal(canAccessFeature(basic, 'graphic_designer'), false);
  assert.equal(canAccessFeature(basic, 'auto_publisher'), false);
  assert.equal(canAccessFeature(basic, 'publishing_history'), false);
  assert.equal(canAccessFeature(basic, 'engagement'), false);
  assert.equal(canAccessFeature(basic, 'analytics'), false);
  assert.equal(canAccessFeature(basic, 'team'), false);
  assert.equal(canAccessFeature(basic, 'ai_strategy'), false);

  assert.equal(listIncludedFeaturesForTier('basic').length, 4);
  assert.equal(listLockedFeaturesForTier('basic').length, 7);
});

test('Pro plan unlocks Pro features while keeping Enterprise-only AI Brand Strategy locked', () => {
  const pro = { planCode: 'pro' as const, status: 'active' as const };

  assert.equal(canAccessFeature(pro, 'social_accounts'), true);
  assert.equal(canAccessFeature(pro, 'ai_studio'), true);
  assert.equal(canAccessFeature(pro, 'graphic_designer'), true);
  assert.equal(canAccessFeature(pro, 'auto_publisher'), true);
  assert.equal(canAccessFeature(pro, 'publishing_history'), true);
  assert.equal(canAccessFeature(pro, 'engagement'), true);
  assert.equal(canAccessFeature(pro, 'analytics'), true);
  assert.equal(canAccessFeature(pro, 'team'), true);

  assert.equal(canAccessFeature(pro, 'ai_strategy'), false);
  assert.equal(getRequiredPlanForFeature('ai_strategy'), 'enterprise');
  assert.equal(getRequiredPlanForRoute('ai-strategy'), 'enterprise');
});

test('Enterprise plan unlocks all 11 platform modules', () => {
  const enterprise = { planCode: 'enterprise' as const, status: 'active' as const };
  assert.equal(listLockedFeaturesForTier('enterprise').length, 0);
  assert.equal(listIncludedFeaturesForTier('enterprise').length, 11);
  assert.equal(canAccessFeature(enterprise, 'ai_strategy'), true);
  assert.equal(canAccessRoute(enterprise, 'ai-strategy'), true);
});

test('quota guards enforce social account and team member limits per package', () => {
  const none = { planCode: 'none' as const, status: 'none' as const };
  const basic = { planCode: 'basic' as const, status: 'active' as const };
  const pro = { planCode: 'pro' as const, status: 'active' as const };

  assert.equal(canAddSocialAccount(none, 0).allowed, false);
  assert.equal(canAddSocialAccount(basic, 4).allowed, true);
  assert.equal(canAddSocialAccount(basic, 5).allowed, false);
  assert.equal(canAddSocialAccount(pro, 19).allowed, true);
  assert.equal(canAddSocialAccount(pro, 20).allowed, false);

  assert.equal(canAddTeamMember(basic, 1).allowed, false);
  assert.equal(canAddTeamMember(pro, 5).allowed, true);
  assert.equal(canAddTeamMember(pro, 10).allowed, false);
});
