import React, { useEffect, useState } from 'react';
import {
  Bell,
  CheckCheck,
  Check,
  UserPlus,
  Trash2,
  Building2,
  Plus,
  X,
  CreditCard,
  Download,
  Shield,
} from 'lucide-react';
import { apiClient } from '../../lib/apiClient';
import { useAuth } from '../../context/AuthContext';
import { formatCurrencyCents } from '../../utils/domain';
import type {
  NotificationRecord,
  SubscriptionPlanRecord,
  WorkspaceMemberRecord,
  WorkspaceSubscriptionRecord,
} from '../../shared/api-contracts';

export const NotificationsPage: React.FC = () => {
  const { activeWorkspace } = useAuth();
  const [items, setItems] = useState<NotificationRecord[]>([]);

  const load = async () => {
    if (!activeWorkspace) return;
    const list = await apiClient.getNotifications(activeWorkspace.id);
    setItems(list);
  };

  useEffect(() => {
    void load();
  }, [activeWorkspace]);

  const markRead = async (id?: string) => {
    if (!activeWorkspace) return;
    await apiClient.markNotificationRead(activeWorkspace.id, id);
    await load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:items-end">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Notifications</h1>
          <p className="mt-1 text-sm text-slate-600">Operational alerts for publishing jobs, AI credits, billing, and workspace security.</p>
        </div>
        <button
          type="button"
          onClick={() => markRead()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
        >
          <CheckCheck className="h-4 w-4 text-blue-700" />
          Mark All Read
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100">
        {items.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">No workspace notifications yet.</div>
        ) : (
          items.map((n) => (
            <div key={n.id} className={`flex flex-col justify-between gap-3 p-5 sm:flex-row sm:items-center ${n.isRead ? 'bg-white' : 'bg-blue-50/40'}`}>
              <div className="flex items-start gap-3">
                <Bell className={`mt-0.5 h-4 w-4 shrink-0 ${n.isRead ? 'text-slate-400' : 'text-blue-700'}`} />
                <div>
                  <p className="text-sm font-semibold text-slate-900">{n.title}</p>
                  <p className="mt-0.5 text-xs text-slate-600">{n.body}</p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    <span className="capitalize">{n.category}</span> · <span className="font-mono-tabular">{new Date(n.createdAt).toLocaleString()}</span>
                  </p>
                </div>
              </div>
              {!n.isRead && (
                <button
                  type="button"
                  onClick={() => markRead(n.id)}
                  className="text-xs font-semibold text-blue-700 hover:underline whitespace-nowrap shrink-0"
                >
                  Mark Read
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export const BillingSubscriptionsPage: React.FC = () => {
  const { activeWorkspace, refreshSession } = useAuth();
  const [sub, setSub] = useState<WorkspaceSubscriptionRecord | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlanRecord[]>([]);
  const [cycle, setCycle] = useState<'monthly' | 'annual'>('monthly');
  const [notice, setNotice] = useState<string | null>(null);

  const load = async () => {
    if (!activeWorkspace) return;
    const [s, p] = await Promise.all([apiClient.getSubscription(activeWorkspace.id), apiClient.getPlans()]);
    setSub(s);
    setPlans(p);
    setCycle(s.billingCycle);
  };

  useEffect(() => {
    void load();
  }, [activeWorkspace]);

  const handlePlanSwitch = async (planCode: string) => {
    if (!activeWorkspace) return;
    setNotice(null);
    await apiClient.changeSubscription(activeWorkspace.id, planCode, cycle);
    setNotice(`Subscription updated to ${planCode.toUpperCase()} (${cycle} billing). AI credits synced.`);
    await load();
    await refreshSession();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:items-end">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Billing & Subscriptions</h1>
          <p className="mt-1 text-sm text-slate-600">Manage workspace plan allocation, AI credit quotas, payment methods, and billing cadence.</p>
        </div>
        <div className="inline-flex items-center gap-1 rounded-lg bg-slate-200/75 p-1 w-fit">
          <button
            type="button"
            onClick={() => setCycle('monthly')}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold ${cycle === 'monthly' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setCycle('annual')}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold ${cycle === 'annual' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
          >
            Annual (Save 17%)
          </button>
        </div>
      </div>

      {notice && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{notice}</div>
      )}

      {sub && (
        <section className="lt-neon-hero rounded-2xl p-6 text-white">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-xs font-semibold text-sky-300">Active Subscription</p>
              <h2 className="mt-1 font-display text-2xl font-bold">{sub.planName} Plan</h2>
              <p className="mt-1 text-xs text-blue-100">
                Status: <span className="capitalize font-semibold text-white">{sub.status}</span> · Billing:{' '}
                <span className="capitalize">{sub.billingCycle}</span> · Renews{' '}
                <span className="font-mono-tabular">{new Date(sub.currentPeriodEnd).toLocaleDateString()}</span>
              </p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-xs text-blue-200">Workspace AI Credits Balance</p>
              <p className="font-mono-tabular text-2xl font-bold text-amber-300">
                {(activeWorkspace?.aiCreditsBalance ?? 0).toLocaleString()}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Pricing Plans Grid */}
      <div>
        <h2 className="font-display text-base font-bold text-slate-900 mb-4">Available Workspace Plans</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {plans.map((p) => {
            const isCurrent = sub?.planCode === p.code;
            const displayPrice = cycle === 'monthly' ? p.monthlyPriceCents : Math.round(p.annualPriceCents / 12);
            return (
              <div key={p.id} className="lt-neon-card flex flex-col justify-between rounded-2xl p-5">
                <div>
                  <h3 className="font-display text-base font-bold text-slate-900">{p.name}</h3>
                  <p className="mt-1 text-xs text-slate-500">{p.tagline}</p>
                  <p className="mt-4 font-mono-tabular text-2xl font-bold text-slate-900">
                    {formatCurrencyCents(displayPrice)}
                    <span className="text-xs font-normal text-slate-500"> / mo</span>
                  </p>
                  <ul className="mt-4 space-y-2 text-xs text-slate-700">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-700" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <button
                  type="button"
                  disabled={isCurrent}
                  onClick={() => handlePlanSwitch(p.code)}
                  className="mt-5 w-full rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 disabled:bg-slate-200 disabled:text-slate-500 transition-colors"
                >
                  {isCurrent ? 'Current Plan' : `Switch to ${p.name}`}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Payment Method & Invoices */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-bold text-slate-900 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-blue-700" />
              Payment Method
            </h2>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
              <Shield className="h-3 w-3" /> Secure Vault
            </span>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-14 items-center justify-center rounded-lg bg-slate-900 font-mono text-xs font-bold text-white">
                VISA
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">Visa ending in •••• 4242</p>
                <p className="text-[11px] text-slate-500">Expires 12 / 28 · Default Payment Method</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setNotice('Payment method management portal opened.')}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Update
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-bold text-slate-900 flex items-center gap-2">
              <Download className="h-4 w-4 text-blue-700" />
              Recent Invoices
            </h2>
            <span className="text-xs text-slate-500">Auto-billed monthly</span>
          </div>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-xs">
              <div>
                <p className="font-semibold text-slate-900">INV-2026-004 · {sub?.planName || 'Pro'} Plan</p>
                <p className="text-[11px] text-slate-500">Paid on {new Date().toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono-tabular font-bold text-slate-900">{formatCurrencyCents(sub?.monthlyPriceCents || 7900)}</span>
                <button
                  type="button"
                  onClick={() => setNotice('Invoice PDF downloaded successfully.')}
                  className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                  title="Download PDF"
                >
                  <Download className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-xs">
              <div>
                <p className="font-semibold text-slate-900">INV-2026-003 · {sub?.planName || 'Pro'} Plan</p>
                <p className="text-[11px] text-slate-500">Paid on last month</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono-tabular font-bold text-slate-900">{formatCurrencyCents(sub?.monthlyPriceCents || 7900)}</span>
                <button
                  type="button"
                  onClick={() => setNotice('Invoice PDF downloaded successfully.')}
                  className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                  title="Download PDF"
                >
                  <Download className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const TeamManagementPage: React.FC = () => {
  const { activeWorkspace } = useAuth();
  const [members, setMembers] = useState<WorkspaceMemberRecord[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'workspace_admin' | 'editor' | 'viewer'>('editor');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!activeWorkspace) return;
    const list = await apiClient.getMembers(activeWorkspace.id);
    setMembers(list);
  };

  useEffect(() => {
    void load();
  }, [activeWorkspace]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace) return;
    setError(null);
    setFeedback(null);
    try {
      await apiClient.inviteMember(activeWorkspace.id, email, role);
      setEmail('');
      setFeedback('Team member invitation recorded and scoped to this workspace.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to invite team member.');
    }
  };

  const handleRevoke = async (memberId: string) => {
    if (!activeWorkspace) return;
    await apiClient.revokeMember(activeWorkspace.id, memberId);
    await load();
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-5">
        <h1 className="font-display text-2xl font-bold text-slate-900">Team Management</h1>
        <p className="mt-1 text-sm text-slate-600">Invite collaborators into {activeWorkspace?.name} with role-based access control.</p>
      </div>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}
      {feedback && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{feedback}</div>}

      <form onSubmit={handleInvite} className="lt-neon-card flex flex-col gap-3 rounded-2xl p-5 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="invite-email" className="block text-xs font-semibold text-slate-700">Collaborator Email</label>
          <input
            id="invite-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="strategist@agency.com"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="sm:w-48">
          <label htmlFor="invite-role" className="block text-xs font-semibold text-slate-700">Workspace Role</label>
          <select
            id="invite-role"
            value={role}
            onChange={(e) => setRole(e.target.value as 'workspace_admin' | 'editor' | 'viewer')}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="workspace_admin">Workspace Admin</option>
            <option value="editor">Content Editor</option>
            <option value="viewer">Analyst Viewer</option>
          </select>
        </div>
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-800 whitespace-nowrap shrink-0"
        >
          <UserPlus className="h-4 w-4" />
          Invite Member
        </button>
      </form>

      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
              <tr>
                <th className="px-5 py-3">Member</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {members.map((m) => (
                <tr key={m.id}>
                  <td className="px-5 py-3.5">
                    <p className="font-semibold text-slate-900">{m.fullName || m.invitedEmail}</p>
                    <p className="font-mono-tabular text-xs text-slate-500">{m.invitedEmail}</p>
                  </td>
                  <td className="px-5 py-3.5 text-xs font-medium capitalize text-slate-700">{m.role.replace('_', ' ')}</td>
                  <td className={`px-5 py-3.5 text-xs font-semibold capitalize ${m.status === 'active' ? 'text-emerald-700' : m.status === 'revoked' ? 'text-rose-700' : 'text-amber-700'}`}>
                    {m.status}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {m.status !== 'revoked' && (
                      <button
                        type="button"
                        onClick={() => handleRevoke(m.id)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 hover:underline"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export const BrandSettingsPage: React.FC = () => {
  const { activeWorkspace, workspaces, setActiveWorkspaceId, updateWorkspacesState } = useAuth();
  const [name, setName] = useState('');
  const [brandName, setBrandName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#0052FF');
  const [secondaryColor, setSecondaryColor] = useState('#071436');
  const [accentColor, setAccentColor] = useState('#F59E0B');
  const [businessDescription, setBusinessDescription] = useState('');
  const [industry, setIndustry] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [toneOfVoice, setToneOfVoice] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState('en');
  const [timezone, setTimezone] = useState('UTC');

  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWsName, setNewWsName] = useState('');
  const [newBrandName, setNewBrandName] = useState('');
  const [newIndustry, setNewIndustry] = useState('');

  useEffect(() => {
    if (!activeWorkspace) return;
    const bp = activeWorkspace.brandProfile;
    setName(activeWorkspace.name);
    setBrandName(bp.brandName);
    setLogoUrl(bp.logoUrl || '');
    setPrimaryColor(bp.primaryColor || '#0052FF');
    setSecondaryColor(bp.secondaryColor || '#071436');
    setAccentColor(bp.accentColor || '#F59E0B');
    setBusinessDescription(bp.businessDescription || '');
    setIndustry(bp.industry || '');
    setTargetAudience(bp.targetAudience || '');
    setToneOfVoice(bp.toneOfVoice || 'Executive & Authoritative');
    setPreferredLanguage(bp.preferredLanguage || 'en');
    setTimezone(bp.timezone || 'UTC');
  }, [activeWorkspace]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace) return;
    setSaving(true);
    setNotice(null);
    try {
      const res = await apiClient.updateBrandProfile(activeWorkspace.id, {
        name,
        brandName,
        logoUrl,
        primaryColor,
        secondaryColor,
        accentColor,
        businessDescription,
        industry,
        targetAudience,
        toneOfVoice,
        preferredLanguage,
        timezone,
      });
      updateWorkspacesState(res.workspaces, activeWorkspace.id);
      setNotice('Brand profile and workspace settings saved to database.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await apiClient.createWorkspace({
        name: newWsName,
        brandName: newBrandName || newWsName,
        industry: newIndustry,
      });
      updateWorkspacesState(res.workspaces, res.workspace.id);
      setNewWsName('');
      setNewBrandName('');
      setNewIndustry('');
      setShowCreateModal(false);
      setNotice(`Created and switched to isolated tenant workspace "${res.workspace.name}".`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Brand & Workspace Settings</h1>
          <p className="mt-1 text-sm text-slate-600">
            Configure multi-tenant brand identity, colors, target audience, language, and timezone used across AI Content Studio and publishing.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-800 whitespace-nowrap shrink-0"
        >
          <Plus className="h-4 w-4" />
          Create New Workspace
        </button>
      </div>

      {notice && (
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {notice}
        </div>
      )}

      {/* Multi-Tenant Workspace Selector */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <p className="text-xs font-semibold text-slate-500">Your Tenant Workspaces ({workspaces.length})</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {workspaces.map((ws) => (
            <button
              key={ws.id}
              type="button"
              onClick={() => setActiveWorkspaceId(ws.id)}
              className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-semibold transition-colors ${
                ws.id === activeWorkspace?.id
                  ? 'border-blue-700 bg-blue-700 text-white'
                  : 'border-slate-300 bg-white text-slate-700 hover:border-blue-400'
              }`}
            >
              <Building2 className="h-3.5 w-3.5" />
              {ws.name}
            </button>
          ))}
        </div>
      </section>

      <form onSubmit={handleSave} className="lt-neon-card space-y-5 rounded-2xl p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="ws-name" className="block text-xs font-semibold text-slate-700">Workspace Name</label>
            <input id="ws-name" type="text" required value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label htmlFor="brand-name" className="block text-xs font-semibold text-slate-700">Brand Name</label>
            <input id="brand-name" type="text" required value={brandName} onChange={(e) => setBrandName(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="brand-logo" className="block text-xs font-semibold text-slate-700">Brand Logo URL</label>
            <input id="brand-logo" type="text" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="/assets/aistudio/20261112_184805_8a13799e.jpg" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label htmlFor="brand-industry" className="block text-xs font-semibold text-slate-700">Industry</label>
            <input id="brand-industry" type="text" value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="Enterprise Software, Agency, Retail..." className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="color-primary" className="block text-xs font-semibold text-slate-700">Primary Brand Color</label>
            <div className="mt-1 flex items-center gap-2">
              <input id="color-primary" type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="h-9 w-11 rounded border border-slate-300 cursor-pointer" />
              <span className="font-mono-tabular text-xs text-slate-600">{primaryColor}</span>
            </div>
          </div>
          <div>
            <label htmlFor="color-secondary" className="block text-xs font-semibold text-slate-700">Deep Navy / Secondary</label>
            <div className="mt-1 flex items-center gap-2">
              <input id="color-secondary" type="color" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} className="h-9 w-11 rounded border border-slate-300 cursor-pointer" />
              <span className="font-mono-tabular text-xs text-slate-600">{secondaryColor}</span>
            </div>
          </div>
          <div>
            <label htmlFor="color-accent" className="block text-xs font-semibold text-slate-700">Accent Color</label>
            <div className="mt-1 flex items-center gap-2">
              <input id="color-accent" type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="h-9 w-11 rounded border border-slate-300 cursor-pointer" />
              <span className="font-mono-tabular text-xs text-slate-600">{accentColor}</span>
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="brand-desc" className="block text-xs font-semibold text-slate-700">Business Description</label>
          <textarea id="brand-desc" rows={3} value={businessDescription} onChange={(e) => setBusinessDescription(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="brand-audience" className="block text-xs font-semibold text-slate-700">Target Audience</label>
            <input id="brand-audience" type="text" value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label htmlFor="brand-tone" className="block text-xs font-semibold text-slate-700">Tone of Voice</label>
            <input id="brand-tone" type="text" value={toneOfVoice} onChange={(e) => setToneOfVoice(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="brand-lang" className="block text-xs font-semibold text-slate-700">Preferred Language</label>
            <select id="brand-lang" value={preferredLanguage} onChange={(e) => setPreferredLanguage(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
              <option value="en">English (International)</option>
              <option value="fr">French</option>
              <option value="es">Spanish</option>
              <option value="de">German</option>
              <option value="pt">Portuguese</option>
            </select>
          </div>
          <div>
            <label htmlFor="brand-tz" className="block text-xs font-semibold text-slate-700">Workspace Timezone</label>
            <select id="brand-tz" value={timezone} onChange={(e) => setTimezone(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
              <option value="UTC">UTC (Coordinated Universal Time)</option>
              <option value="America/New_York">America/New_York (EST/EDT)</option>
              <option value="America/Los_Angeles">America/Los_Angeles (PST/PDT)</option>
              <option value="Europe/London">Europe/London (GMT/BST)</option>
              <option value="Africa/Lagos">Africa/Lagos (WAT)</option>
              <option value="Asia/Dubai">Asia/Dubai (GST)</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-blue-700 px-5 py-2.5 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
          >
            {saving ? 'Saving Brand Profile...' : 'Save Brand Settings'}
          </button>
        </div>
      </form>

      {/* Create Workspace Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="font-display text-lg font-bold text-slate-900">Create Tenant Workspace</h2>
              <button type="button" aria-label="Close modal" onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleCreateWorkspace} className="mt-4 space-y-4">
              <div>
                <label htmlFor="new-ws-name" className="block text-xs font-semibold text-slate-700">Workspace Name</label>
                <input id="new-ws-name" type="text" required value={newWsName} onChange={(e) => setNewWsName(e.target.value)} placeholder="EMEA Client Portfolio" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label htmlFor="new-brand-name" className="block text-xs font-semibold text-slate-700">Brand Name</label>
                <input id="new-brand-name" type="text" required value={newBrandName} onChange={(e) => setNewBrandName(e.target.value)} placeholder="Nova FinTech Europe" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label htmlFor="new-ws-ind" className="block text-xs font-semibold text-slate-700">Industry</label>
                <input id="new-ws-ind" type="text" value={newIndustry} onChange={(e) => setNewIndustry(e.target.value)} placeholder="FinTech & Payments" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowCreateModal(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700">Cancel</button>
                <button type="submit" disabled={saving} className="rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800">Create Workspace</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
