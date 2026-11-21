import React from 'react';
import { Lock, Check, ArrowRight, Sparkles, ShieldCheck } from 'lucide-react';
import type { CustomerRoute } from '../pages/customer/types';
import type { WorkspaceSubscriptionSummary } from '../shared/api-contracts';
import {
  FEATURE_CATALOG,
  PLAN_FEATURE_BULLETS,
  PLAN_LIMITS,
  ROUTE_TO_FEATURE,
  getEffectivePlanTier,
  getTierDisplayName,
  isTrialExpired,
} from '../utils/planEntitlements';
import { formatCurrencyCents } from '../utils/domain';

interface SubscriptionGateProps {
  route: CustomerRoute;
  subscription?: WorkspaceSubscriptionSummary | null;
  onGoToBilling: () => void;
}

export const SubscriptionGate: React.FC<SubscriptionGateProps> = ({
  route,
  subscription,
  onGoToBilling,
}) => {
  const featureKey = ROUTE_TO_FEATURE[route];
  if (!featureKey) return null;

  const feature = FEATURE_CATALOG[featureKey];
  const currentTier = getEffectivePlanTier(subscription);
  const trialExpired = isTrialExpired(subscription);
  const requiredTier = feature.requiredTier;
  const requiredPlan = PLAN_LIMITS[requiredTier];
  const requiredBullets = PLAN_FEATURE_BULLETS[requiredTier];

  return (
    <div className="mx-auto max-w-3xl py-6">
      <div className="lt-neon-hero rounded-2xl p-6 sm:p-8 text-white">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/15 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-amber-400/40 bg-amber-500/15 text-amber-300">
              <Lock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-amber-300">
                {trialExpired
                  ? '7-Day Free Trial Ended · Subscription Required'
                  : `Package Access Restricted · ${requiredPlan.name} Plan Required`}
              </p>
              <h1 className="mt-0.5 font-display text-xl sm:text-2xl font-bold text-white">
                {trialExpired
                  ? `Your 7-day free trial has ended — subscribe to continue using ${feature.label}`
                  : `${feature.label} is not included in your current package`}
              </h1>
            </div>
          </div>
        </div>

        <p className="mt-5 text-sm leading-relaxed text-white/90">
          {feature.description}
        </p>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-white/15 bg-white/5 p-4">
            <p className="text-xs font-semibold text-sky-300">Your Current Subscription</p>
            <p className="mt-1 font-display text-lg font-bold text-white">
              {trialExpired ? '7-Day Trial Expired' : getTierDisplayName(currentTier)}
            </p>
            <p className="mt-1 text-xs text-white/80">
              {trialExpired
                ? 'Your 7-day free trial period has completed. Select a subscription package and complete payment to restore workspace access.'
                : currentTier === 'none'
                ? 'No active subscription package selected yet. Subscribe to unlock workspace tools.'
                : `Your workspace currently has access only to features included in the ${getTierDisplayName(currentTier)} package.`}
            </p>
          </div>

          <div className="rounded-xl border border-sky-400/40 bg-sky-500/10 p-4">
            <p className="text-xs font-semibold text-sky-300">Required Package to Unlock</p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-display text-lg font-bold text-white">{requiredPlan.name} Plan</span>
              <span className="font-mono-tabular text-sm font-semibold text-amber-300">
                {formatCurrencyCents(requiredPlan.monthlyPriceCents)} / mo
              </span>
            </div>
            <p className="mt-1 text-xs text-white/80">
              Includes {requiredPlan.monthlyAiCredits.toLocaleString()} AI credits/mo and up to {requiredPlan.maxSocialAccounts} connected social channels.
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-white/15 bg-[#061233]/80 p-5">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-300">
            <Sparkles className="h-3.5 w-3.5" />
            Included with {requiredPlan.name} Package
          </p>
          <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 text-xs text-white">
            {requiredBullets.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <p className="inline-flex items-center gap-1.5 text-xs text-white/80">
            <ShieldCheck className="h-4 w-4 text-sky-300 shrink-0" />
            Instant activation upon payment — only features in your subscribed package are enabled.
          </p>
          <button
            type="button"
            onClick={onGoToBilling}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-blue-500 transition-colors shadow-sm"
          >
            {currentTier === 'none' ? 'Open Subscription & Payment' : `Upgrade to ${requiredPlan.name}`}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
