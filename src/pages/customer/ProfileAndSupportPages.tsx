import React, { useEffect, useState } from 'react';
import { ShieldCheck, AlertTriangle, LifeBuoy, Send } from 'lucide-react';
import { apiClient } from '../../lib/apiClient';
import { useAuth } from '../../context/AuthContext';
import type { SupportTicketRecord } from '../../shared/api-contracts';

export const ProfileSettingsPage: React.FC = () => {
  const { user, updateUserState, refreshSession, logout } = useAuth();
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [timezone, setTimezone] = useState(user?.timezone || 'UTC');
  const [preferredLanguage, setPreferredLanguage] = useState(user?.preferredLanguage || 'en');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.avatarUrl || null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [verifyToken, setVerifyToken] = useState('');
  const [confirmDeleteEmail, setConfirmDeleteEmail] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError('Profile picture must be under 2MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAvatarUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    try {
      const res = await apiClient.updateProfile({ fullName, timezone, preferredLanguage, avatarUrl });
      updateUserState(res.user);
      setNotice('Account profile and avatar saved successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update profile.');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    try {
      const res = await apiClient.changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setNotice(res.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to change password.');
    }
  };

  const handleResendVerification = async () => {
    setError(null);
    const res = await apiClient.resendVerification();
    if (res.previewVerificationToken) {
      setVerifyToken(res.previewVerificationToken);
      setNotice(`Verification token issued (Dev Preview): ${res.previewVerificationToken}`);
    } else {
      setNotice(res.message);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await apiClient.verifyEmail(verifyToken);
      setNotice(res.message);
      setVerifyToken('');
      await refreshSession();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed.');
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await apiClient.deleteAccount(confirmDeleteEmail);
      await logout();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Account deletion failed.');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="border-b border-slate-200 pb-5">
        <h1 className="font-display text-2xl font-bold text-slate-900">Profile & Security Settings</h1>
        <p className="mt-1 text-sm text-slate-600">Manage your identity, email verification status, password, and account deletion workflow.</p>
      </div>

      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}
      {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 break-all">{notice}</div>}

      {/* Email Verification Banner */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <ShieldCheck className={`mt-0.5 h-5 w-5 shrink-0 ${user?.emailVerified ? 'text-emerald-600' : 'text-amber-600'}`} />
            <div>
              <h2 className="font-display text-base font-bold text-slate-900">Email Verification</h2>
              <p className="text-xs text-slate-600">
                {user?.email} · Status:{' '}
                <span className={`font-semibold ${user?.emailVerified ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {user?.emailVerified ? 'Verified' : 'Pending Verification'}
                </span>
              </p>
            </div>
          </div>
          {!user?.emailVerified && (
            <button
              type="button"
              onClick={handleResendVerification}
              className="rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-semibold text-blue-800 hover:bg-blue-100 whitespace-nowrap shrink-0"
            >
              Issue Verification Token
            </button>
          )}
        </div>
        {!user?.emailVerified && (
          <form onSubmit={handleVerify} className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              required
              value={verifyToken}
              onChange={(e) => setVerifyToken(e.target.value)}
              placeholder="Paste verification token"
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 font-mono-tabular text-xs"
            />
            <button type="submit" className="rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800">
              Confirm Verification
            </button>
          </form>
        )}
      </section>

      {/* Profile Form */}
      <form onSubmit={handleSaveProfile} className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
        <h2 className="font-display text-base font-bold text-slate-900">Personal Information & Profile Picture</h2>
        <div className="flex items-center gap-4 py-2 border-b border-slate-100 pb-4">
          <div className="relative h-16 w-16 overflow-hidden rounded-full border-2 border-blue-600/30 bg-slate-100 flex items-center justify-center shrink-0">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar preview" className="h-full w-full object-cover" />
            ) : (
              <span className="font-display text-lg font-bold text-blue-700">
                {fullName ? fullName.slice(0, 2).toUpperCase() : 'LT'}
              </span>
            )}
          </div>
          <div>
            <label htmlFor="avatar-upload" className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs">
              Upload New Photo
            </label>
            <input id="avatar-upload" type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
            <p className="mt-1 text-[11px] text-slate-500">PNG, JPG or GIF up to 2MB.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="prof-name" className="block text-xs font-semibold text-slate-700">Full Name</label>
            <input id="prof-name" type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label htmlFor="prof-tz" className="block text-xs font-semibold text-slate-700">Timezone</label>
            <input id="prof-tz" type="text" required value={timezone} onChange={(e) => setTimezone(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label htmlFor="prof-lang" className="block text-xs font-semibold text-slate-700">Language</label>
            <input id="prof-lang" type="text" required value={preferredLanguage} onChange={(e) => setPreferredLanguage(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
        </div>
        <button type="submit" className="rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800">
          Update Profile
        </button>
      </form>

      {/* Password Update */}
      <form onSubmit={handleChangePassword} className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
        <h2 className="font-display text-base font-bold text-slate-900">Change Password</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="curr-pw" className="block text-xs font-semibold text-slate-700">Current Password</label>
            <input id="curr-pw" type="password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label htmlFor="new-pw" className="block text-xs font-semibold text-slate-700">New Strong Password</label>
            <input id="new-pw" type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
        </div>
        <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800">
          Update Password
        </button>
      </form>

      {/* Account Deletion Workflow */}
      <form onSubmit={handleDeleteAccount} className="rounded-2xl border border-rose-200 bg-rose-50/40 p-6 space-y-4">
        <div className="flex items-start gap-2.5 text-rose-800">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <h2 className="font-display text-base font-bold">Account Deletion Workflow</h2>
            <p className="mt-0.5 text-xs text-rose-700">
              Deactivating your account revokes all active sessions immediately. Type your email address ({user?.email}) below to confirm.
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="email"
            required
            value={confirmDeleteEmail}
            onChange={(e) => setConfirmDeleteEmail(e.target.value)}
            placeholder={user?.email}
            className="flex-1 rounded-lg border border-rose-300 bg-white px-3 py-2 text-sm"
          />
          <button type="submit" className="rounded-lg bg-rose-700 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-800 whitespace-nowrap shrink-0">
            Delete Account
          </button>
        </div>
      </form>
    </div>
  );
};

export const HelpSupportPage: React.FC = () => {
  const { activeWorkspace } = useAuth();
  const [tickets, setTickets] = useState<SupportTicketRecord[]>([]);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [notice, setNotice] = useState<string | null>(null);

  const load = async () => {
    if (!activeWorkspace) return;
    const list = await apiClient.getTickets(activeWorkspace.id);
    setTickets(list);
  };

  useEffect(() => {
    void load();
  }, [activeWorkspace]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace) return;
    await apiClient.createTicket(activeWorkspace.id, { subject, message, priority });
    setSubject('');
    setMessage('');
    setNotice('Support ticket logged and routed to LIVINGTECH Agency Support Operations.');
    await load();
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-5">
        <h1 className="font-display text-2xl font-bold text-slate-900">Help & Support</h1>
        <p className="mt-1 text-sm text-slate-600">Submit priority workspace tickets directly to LIVINGTECH Brand Agency administrators.</p>
      </div>

      {notice && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{notice}</div>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <form onSubmit={handleSubmit} className="lt-neon-card space-y-4 rounded-2xl p-6 lg:col-span-5">
          <div className="flex items-center gap-2">
            <LifeBuoy className="h-4 w-4 text-blue-700" />
            <h2 className="font-display text-base font-bold text-slate-900">Open a Support Ticket</h2>
          </div>
          <div>
            <label htmlFor="sup-subj" className="block text-xs font-semibold text-slate-700">Subject</label>
            <input id="sup-subj" type="text" required value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Meta Business OAuth onboarding inquiry" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label htmlFor="sup-prio" className="block text-xs font-semibold text-slate-700">Priority</label>
            <select id="sup-prio" value={priority} onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high' | 'urgent')} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div>
            <label htmlFor="sup-msg" className="block text-xs font-semibold text-slate-700">Details</label>
            <textarea id="sup-msg" required rows={4} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Describe your question or technical request..." className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <button type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-800">
            <Send className="h-3.5 w-3.5" />
            Submit Ticket
          </button>
        </form>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-7">
          <h2 className="font-display text-base font-bold text-slate-900">Workspace Ticket History ({tickets.length})</h2>
          {tickets.length === 0 ? (
            <p className="mt-6 text-sm text-slate-500">No tickets opened in this workspace yet.</p>
          ) : (
            <div className="mt-4 divide-y divide-slate-100">
              {tickets.map((t) => (
                <div key={t.id} className="py-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">{t.subject}</p>
                    <span className={`text-xs font-semibold capitalize ${t.status === 'resolved' || t.status === 'closed' ? 'text-emerald-700' : 'text-blue-700'}`}>
                      {t.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">{t.message}</p>
                  {t.adminNotes && (
                    <p className="mt-2 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-900">
                      <span className="font-semibold">Admin Response: </span>
                      {t.adminNotes}
                    </p>
                  )}
                  <p className="mt-1.5 text-[11px] text-slate-400">
                    Priority: <span className="capitalize">{t.priority}</span> · <span className="font-mono-tabular">{new Date(t.createdAt).toLocaleString()}</span>
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
