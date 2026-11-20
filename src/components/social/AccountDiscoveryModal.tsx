import React, { useEffect, useState } from 'react';
import {
  CheckSquare,
  Square,
  X,
  ShieldCheck,
  AlertTriangle,
  Users,
  Check,
} from 'lucide-react';
import type { OAuthDiscoverySession } from '../../shared/api-contracts';
import {
  ACCOUNT_TYPE_LABELS,
  PlatformLogo,
  summarizeAnalyticsCapabilities,
  summarizePublishingCapabilities,
} from './PlatformLogo';

interface AccountDiscoveryModalProps {
  session: OAuthDiscoverySession;
  submitting: boolean;
  onConfirm: (selectedIds: string[]) => Promise<void>;
  onClose: () => void;
}

export const AccountDiscoveryModal: React.FC<AccountDiscoveryModalProps> = ({
  session,
  submitting,
  onConfirm,
  onClose,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    const fresh = session.accounts.filter((a) => !a.alreadyConnected).map((a) => a.externalAccountId);
    return fresh.length > 0 ? fresh : session.accounts.map((a) => a.externalAccountId);
  });

  useEffect(() => {
    // Sync selection when discovery session changes
    const fresh = session.accounts.filter((a) => !a.alreadyConnected).map((a) => a.externalAccountId);
    setSelectedIds(fresh.length > 0 ? fresh : session.accounts.map((a) => a.externalAccountId));
  }, [session]);

  const toggleId = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleAll = () => {
    if (selectedIds.length === session.accounts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(session.accounts.map((a) => a.externalAccountId));
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="discovery-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <PlatformLogo platformKey={session.platformKey} size="md" />
            <div>
              <h2 id="discovery-modal-title" className="font-display text-lg font-bold text-slate-900">
                Select {session.platformName} Accounts to Connect
              </h2>
              <p className="text-xs text-slate-500">
                Choose one or more discovered pages, channels, or profiles to link to this workspace.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close account selection modal"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Permission Status Banner */}
        <div className="border-b border-slate-100 bg-slate-50 px-6 py-3">
          {session.missingRequiredScopes.length > 0 ? (
            <div className="flex items-start gap-2 text-xs text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <div>
                <p className="font-semibold">Partial permissions granted ({session.permissionsStatus})</p>
                <p className="mt-0.5 text-amber-700">
                  Missing required scopes:{' '}
                  <span className="font-mono-tabular">{session.missingRequiredScopes.join(', ')}</span>. Some publishing or analytics features may be unavailable until re-authorized.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-emerald-800">
              <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>
                OAuth authorization verified · {session.grantedScopes.length} permissions granted · Tokens encrypted with AES-256-GCM
              </span>
            </div>
          )}
        </div>

        {/* Account List */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">
              Discovered Accounts ({session.accounts.length})
            </span>
            {session.accounts.length > 1 && (
              <button
                type="button"
                onClick={toggleAll}
                className="text-xs font-semibold text-blue-700 hover:underline"
              >
                {selectedIds.length === session.accounts.length ? 'Deselect all' : 'Select all'}
              </button>
            )}
          </div>

          {session.accounts.map((acc) => {
            const checked = selectedIds.includes(acc.externalAccountId);
            return (
              <button
                key={acc.externalAccountId}
                type="button"
                onClick={() => toggleId(acc.externalAccountId)}
                className={`flex w-full items-start gap-3.5 rounded-xl border p-4 text-left transition-colors ${
                  checked
                    ? 'border-blue-600 bg-blue-50/40'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="mt-0.5 text-blue-700 shrink-0">
                  {checked ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5 text-slate-400" />}
                </div>
                {acc.avatarUrl ? (
                  <img
                    src={acc.avatarUrl}
                    alt={acc.accountName}
                    referrerPolicy="no-referrer"
                    className="h-10 w-10 rounded-full border border-slate-200 object-cover shrink-0"
                  />
                ) : (
                  <PlatformLogo platformKey={session.platformKey} size="md" />
                )}
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="font-semibold text-sm text-slate-900">{acc.accountName}</span>
                    <span className="font-mono-tabular text-xs text-slate-500">{acc.accountHandle}</span>
                    {acc.alreadyConnected && (
                      <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">
                        <Check className="h-3 w-3" />
                        Already Connected (Will Refresh)
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-600">
                    <span>{ACCOUNT_TYPE_LABELS[acc.accountType] || acc.accountType}</span>
                    {acc.businessCategory && (
                      <>
                        <span className="text-slate-300">·</span>
                        <span>{acc.businessCategory}</span>
                      </>
                    )}
                    {acc.followersCount !== null && (
                      <>
                        <span className="text-slate-300">·</span>
                        <span className="inline-flex items-center gap-1 font-mono-tabular">
                          <Users className="h-3 w-3 text-slate-400" />
                          {acc.followersCount.toLocaleString()} followers
                        </span>
                      </>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Publishing: <span className="font-medium text-slate-700">{summarizePublishingCapabilities(acc.capabilities)}</span> · Analytics:{' '}
                    <span className="font-medium text-slate-700">{summarizeAnalyticsCapabilities(acc.capabilities)}</span>
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
          <p className="text-xs text-slate-500">
            {selectedIds.length} of {session.accounts.length} account(s) selected
          </p>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={submitting || selectedIds.length === 0}
              onClick={() => void onConfirm(selectedIds)}
              className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 disabled:bg-blue-950/60 disabled:text-white/60 disabled:cursor-not-allowed transition-colors"
            >
              {submitting
                ? 'Encrypting & Connecting...'
                : `Connect ${selectedIds.length} Selected Account${selectedIds.length === 1 ? '' : 's'}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
