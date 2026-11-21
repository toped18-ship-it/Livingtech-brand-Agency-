import React, { useMemo, useState } from 'react';
import {
  X,
  CreditCard,
  Building2,
  ShieldCheck,
  Check,
  AlertCircle,
  Lock,
  Sparkles,
} from 'lucide-react';
import { formatCurrencyCents } from '../utils/domain';
import type {
  SubscriptionPaymentDetails,
  SubscriptionPlanRecord,
} from '../shared/api-contracts';

interface SubscriptionCheckoutModalProps {
  plan: SubscriptionPlanRecord;
  initialCycle: 'monthly' | 'annual';
  defaultEmail: string;
  defaultName: string;
  workspaceName: string;
  isTrialActive: boolean;
  trialDaysRemaining: number;
  submitting: boolean;
  serverError: string | null;
  onClose: () => void;
  onConfirmPayment: (payload: {
    planCode: string;
    billingCycle: 'monthly' | 'annual';
    payment: SubscriptionPaymentDetails;
  }) => Promise<void>;
}

function detectCardBrand(digits: string): string {
  if (/^4/.test(digits)) return 'Visa';
  if (/^(5[1-5]|2[2-7])/.test(digits)) return 'Mastercard';
  if (/^3[47]/.test(digits)) return 'Amex';
  if (/^6(?:011|5)/.test(digits)) return 'Discover';
  return 'Card';
}

function formatCardNumber(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 19);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
}

function formatExpiry(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

export const SubscriptionCheckoutModal: React.FC<SubscriptionCheckoutModalProps> = ({
  plan,
  initialCycle,
  defaultEmail,
  defaultName,
  workspaceName,
  isTrialActive,
  trialDaysRemaining,
  submitting,
  serverError,
  onClose,
  onConfirmPayment,
}) => {
  const [cycle, setCycle] = useState<'monthly' | 'annual'>(initialCycle);
  const [method, setMethod] = useState<'card' | 'bank_transfer'>('card');
  const [billingEmail, setBillingEmail] = useState(defaultEmail);
  const [cardholderName, setCardholderName] = useState(defaultName);
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [transferReference, setTransferReference] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const amountDueCents = useMemo(
    () => (cycle === 'annual' ? plan.annualPriceCents : plan.monthlyPriceCents),
    [cycle, plan.annualPriceCents, plan.monthlyPriceCents]
  );

  const monthlyEquivalentCents = useMemo(
    () => (cycle === 'annual' ? Math.round(plan.annualPriceCents / 12) : plan.monthlyPriceCents),
    [cycle, plan.annualPriceCents, plan.monthlyPriceCents]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const trimmedEmail = billingEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setValidationError('Enter a valid billing email address for your payment receipt.');
      return;
    }

    if (method === 'card') {
      const trimmedName = cardholderName.trim();
      if (trimmedName.length < 2) {
        setValidationError('Enter the full cardholder name as shown on your card.');
        return;
      }

      const digits = cardNumber.replace(/\D/g, '');
      if (digits.length < 13 || digits.length > 19) {
        setValidationError('Enter a valid 13 to 19 digit debit or credit card number.');
        return;
      }

      const expMatch = expiry.trim().match(/^(\d{2})\/(\d{2})$/);
      if (!expMatch) {
        setValidationError('Enter card expiry in MM/YY format.');
        return;
      }
      const expMonth = Number(expMatch[1]);
      const expYear = 2000 + Number(expMatch[2]);
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();
      if (expMonth < 1 || expMonth > 12 || expYear < currentYear || (expYear === currentYear && expMonth < currentMonth)) {
        setValidationError('Your card expiration date is invalid or already expired.');
        return;
      }

      const cleanCvc = cvc.replace(/\D/g, '');
      if (cleanCvc.length < 3 || cleanCvc.length > 4) {
        setValidationError('Enter a valid 3 or 4 digit security code (CVC).');
        return;
      }

      await onConfirmPayment({
        planCode: plan.code,
        billingCycle: cycle,
        payment: {
          method: 'card',
          billingEmail: trimmedEmail,
          cardholderName: trimmedName,
          cardBrand: detectCardBrand(digits),
          cardLast4: digits.slice(-4),
        },
      });
      return;
    }

    const cleanRef = transferReference.trim();
    if (cleanRef.length < 4) {
      setValidationError('Enter your bank transfer or mobile payment reference (at least 4 characters).');
      return;
    }

    await onConfirmPayment({
      planCode: plan.code,
      billingCycle: cycle,
      payment: {
        method: 'bank_transfer',
        billingEmail: trimmedEmail,
        cardholderName: cardholderName.trim() || defaultName,
        reference: cleanRef,
      },
    });
  };

  const activeError = validationError || serverError;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkout-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm overflow-y-auto"
    >
      <div className="lt-neon-card relative my-auto w-full max-w-2xl rounded-2xl border border-sky-400/40 bg-[#071436] text-white shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-4 border-b border-sky-400/20 bg-[#0b1f52] px-6 py-5">
          <div>
            <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-sky-300">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Subscription Checkout &amp; Payment
            </p>
            <h2 id="checkout-modal-title" className="mt-1 font-display text-xl font-bold text-white">
              Activate {plan.name} Package
            </h2>
            <p className="mt-0.5 text-xs text-white/80">
              Workspace: <strong className="text-white">{workspaceName}</strong>
              {isTrialActive ? ` · Converting from 7-Day Free Trial (${trialDaysRemaining}d left)` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close payment checkout"
            className="rounded-lg border border-white/15 bg-white/5 p-2 text-white/80 hover:bg-white/15 hover:text-white disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {activeError && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-xl border border-rose-400/50 bg-rose-950/75 px-4 py-3 text-xs font-medium text-white"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" />
              <span>{activeError}</span>
            </div>
          )}

          {/* Billing Cycle & Order Summary */}
          <div className="rounded-xl border border-sky-400/25 bg-[#0a1a47] p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-sky-300">Billing Cycle</p>
                <p className="text-xs text-white/75">Save 17% when billed annually</p>
              </div>
              <div className="inline-flex items-center gap-1 rounded-lg border border-sky-400/30 bg-[#061233] p-1">
                <button
                  type="button"
                  onClick={() => setCycle('monthly')}
                  className={`rounded-md px-3 py-1.5 text-xs font-bold transition-colors ${
                    cycle === 'monthly' ? 'bg-blue-600 text-white' : 'text-white/75 hover:text-white'
                  }`}
                >
                  Monthly ({formatCurrencyCents(plan.monthlyPriceCents)}/mo)
                </button>
                <button
                  type="button"
                  onClick={() => setCycle('annual')}
                  className={`rounded-md px-3 py-1.5 text-xs font-bold transition-colors ${
                    cycle === 'annual' ? 'bg-blue-600 text-white' : 'text-white/75 hover:text-white'
                  }`}
                >
                  Annual ({formatCurrencyCents(Math.round(plan.annualPriceCents / 12))}/mo)
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3">
              <div>
                <p className="text-xs text-white/80">
                  {plan.name} Package · {plan.monthlyAiCredits.toLocaleString()} AI credits/mo · Up to{' '}
                  {plan.maxSocialAccounts} social channels
                </p>
                <p className="mt-0.5 text-[11px] text-sky-200">
                  {cycle === 'annual'
                    ? `${formatCurrencyCents(monthlyEquivalentCents)}/mo billed annually (${formatCurrencyCents(amountDueCents)}/yr)`
                    : 'Billed monthly · Cancel or switch packages anytime'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-white/70">Total Due Today</p>
                <p className="font-mono-tabular text-2xl font-bold text-amber-300">
                  {formatCurrencyCents(amountDueCents)}
                </p>
              </div>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-sky-300 mb-2">Payment Method</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  setMethod('card');
                  setValidationError(null);
                }}
                className={`flex items-center gap-3 rounded-xl border p-3.5 text-left transition-colors ${
                  method === 'card'
                    ? 'border-sky-400 bg-blue-600/25 text-white ring-1 ring-sky-400/50'
                    : 'border-white/15 bg-[#0a1a47]/60 text-white/80 hover:border-white/35'
                }`}
              >
                <CreditCard className="h-5 w-5 shrink-0 text-sky-300" />
                <div>
                  <p className="text-xs font-bold text-white">Debit / Credit Card</p>
                  <p className="text-[11px] text-white/75">Visa, Mastercard, Verve, Amex</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMethod('bank_transfer');
                  setValidationError(null);
                }}
                className={`flex items-center gap-3 rounded-xl border p-3.5 text-left transition-colors ${
                  method === 'bank_transfer'
                    ? 'border-sky-400 bg-blue-600/25 text-white ring-1 ring-sky-400/50'
                    : 'border-white/15 bg-[#0a1a47]/60 text-white/80 hover:border-white/35'
                }`}
              >
                <Building2 className="h-5 w-5 shrink-0 text-amber-300" />
                <div>
                  <p className="text-xs font-bold text-white">Bank Transfer / Reference</p>
                  <p className="text-[11px] text-white/75">Direct transfer or agency invoice</p>
                </div>
              </button>
            </div>
          </div>

          {/* Payment Fields */}
          <div className="space-y-3.5">
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <div>
                <label htmlFor="checkout-billing-email" className="block text-xs font-semibold text-white/90">
                  Billing Email (Receipt)
                </label>
                <input
                  id="checkout-billing-email"
                  type="email"
                  required
                  value={billingEmail}
                  onChange={(e) => setBillingEmail(e.target.value)}
                  placeholder="billing@company.com"
                  className="mt-1 w-full rounded-lg border border-sky-400/30 bg-[#061233] px-3.5 py-2.5 text-sm text-white placeholder:text-white/40 focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-400/30"
                />
              </div>
              <div>
                <label htmlFor="checkout-cardholder" className="block text-xs font-semibold text-white/90">
                  {method === 'card' ? 'Cardholder Full Name' : 'Account / Payer Name'}
                </label>
                <input
                  id="checkout-cardholder"
                  type="text"
                  required
                  value={cardholderName}
                  onChange={(e) => setCardholderName(e.target.value)}
                  placeholder="Jordan Adeyemi"
                  className="mt-1 w-full rounded-lg border border-sky-400/30 bg-[#061233] px-3.5 py-2.5 text-sm text-white placeholder:text-white/40 focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-400/30"
                />
              </div>
            </div>

            {method === 'card' ? (
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-12">
                <div className="sm:col-span-6">
                  <label htmlFor="checkout-card-number" className="block text-xs font-semibold text-white/90">
                    Card Number
                  </label>
                  <input
                    id="checkout-card-number"
                    type="text"
                    inputMode="numeric"
                    autoComplete="cc-number"
                    required
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                    placeholder="4242 4242 4242 4242"
                    className="mt-1 w-full rounded-lg border border-sky-400/30 bg-[#061233] px-3.5 py-2.5 font-mono-tabular text-sm text-white placeholder:text-white/40 focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-400/30"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label htmlFor="checkout-card-expiry" className="block text-xs font-semibold text-white/90">
                    Expiry (MM/YY)
                  </label>
                  <input
                    id="checkout-card-expiry"
                    type="text"
                    inputMode="numeric"
                    autoComplete="cc-exp"
                    required
                    value={expiry}
                    onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                    placeholder="12/29"
                    className="mt-1 w-full rounded-lg border border-sky-400/30 bg-[#061233] px-3.5 py-2.5 font-mono-tabular text-sm text-white placeholder:text-white/40 focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-400/30"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label htmlFor="checkout-card-cvc" className="block text-xs font-semibold text-white/90">
                    CVC
                  </label>
                  <input
                    id="checkout-card-cvc"
                    type="password"
                    inputMode="numeric"
                    autoComplete="cc-csc"
                    required
                    maxLength={4}
                    value={cvc}
                    onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="123"
                    className="mt-1 w-full rounded-lg border border-sky-400/30 bg-[#061233] px-3.5 py-2.5 font-mono-tabular text-sm text-white placeholder:text-white/40 focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-400/30"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3 rounded-xl border border-amber-400/30 bg-amber-500/10 p-4">
                <p className="text-xs font-semibold text-amber-200">
                  Transfer {formatCurrencyCents(amountDueCents)} to LIVINGTECH BRAND AGENCY Billing Account and enter your payment reference below for instant package activation.
                </p>
                <div>
                  <label htmlFor="checkout-transfer-ref" className="block text-xs font-semibold text-white">
                    Transfer / Payment Reference
                  </label>
                  <input
                    id="checkout-transfer-ref"
                    type="text"
                    required
                    value={transferReference}
                    onChange={(e) => setTransferReference(e.target.value)}
                    placeholder="e.g. TXN-2026-98412"
                    className="mt-1 w-full rounded-lg border border-sky-400/30 bg-[#061233] px-3.5 py-2.5 font-mono-tabular text-sm text-white placeholder:text-white/40 focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-400/30"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Package Unlock Confirmation List */}
          <div className="rounded-xl border border-white/10 bg-[#061233]/70 p-3.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-sky-300">
              Unlocked Immediately Upon Payment
            </p>
            <ul className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2 text-xs text-white/90">
              {plan.features.slice(0, 4).map((feat) => (
                <li key={feat} className="flex items-start gap-1.5">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
            <p className="inline-flex items-center gap-1.5 text-[11px] text-white/75">
              <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
              Encrypted checkout · Only last 4 digits stored on receipt
            </p>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="rounded-lg border border-white/20 bg-white/5 px-4 py-2.5 text-xs font-semibold text-white hover:bg-white/15 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-blue-500 disabled:opacity-60 shadow-lg shadow-blue-600/30 transition-colors"
              >
                <Lock className="h-3.5 w-3.5" />
                {submitting
                  ? 'Processing Payment...'
                  : `Pay ${formatCurrencyCents(amountDueCents)} & Activate ${plan.name}`}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
