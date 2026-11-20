import React, { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { MessageSquare, Send, Archive, Plus, Trash2, Image as ImageIcon, FileText, Video } from 'lucide-react';
import { apiClient } from '../../lib/apiClient';
import { useAuth } from '../../context/AuthContext';
import { formatBytes } from '../../utils/domain';
import type {
  AnalyticsSnapshotRecord,
  EngagementItemRecord,
  MediaAssetRecord,
} from '../../shared/api-contracts';

export const EngagementManagerPage: React.FC = () => {
  const { activeWorkspace } = useAuth();
  const [items, setItems] = useState<EngagementItemRecord[]>([]);
  const [filter, setFilter] = useState<'all' | 'open' | 'replied' | 'archived'>('all');
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!activeWorkspace) return;
    setLoading(true);
    try {
      const list = await apiClient.getEngagements(activeWorkspace.id);
      setItems(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [activeWorkspace]);

  const sendReply = async (id: string) => {
    if (!activeWorkspace || !replyDrafts[id]?.trim()) return;
    await apiClient.replyEngagement(activeWorkspace.id, id, {
      replyText: replyDrafts[id].trim(),
      status: 'replied',
    });
    setReplyDrafts((prev) => ({ ...prev, [id]: '' }));
    await load();
  };

  const archiveItem = async (id: string) => {
    if (!activeWorkspace) return;
    await apiClient.replyEngagement(activeWorkspace.id, id, { status: 'archived' });
    await load();
  };

  const visible = items.filter((i) => (filter === 'all' ? true : i.status === filter));

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:items-end">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Engagement Manager</h1>
          <p className="mt-1 text-sm text-slate-600">
            Respond to comments, mentions, and direct messages across connected channels.
          </p>
        </div>
        <div className="inline-flex items-center gap-1 rounded-lg bg-slate-200/75 p-1 w-fit">
          {(['all', 'open', 'replied', 'archived'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilter(tab)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
                filter === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-slate-500">Loading inbox threads...</div>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <MessageSquare className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm font-semibold text-slate-800">Inbox zero for this filter</p>
          <p className="mt-1 text-xs text-slate-500">Incoming social comments and messages will sync automatically once official OAuth channels are linked.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {visible.map((item) => (
            <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <div>
                  <span className="font-semibold text-slate-900">{item.authorName}</span>
                  <span className="mx-1.5">·</span>
                  <span className="font-mono-tabular">{item.authorHandle}</span>
                  <span className="mx-1.5">·</span>
                  <span className="uppercase font-semibold text-blue-700">{item.platformKey}</span>
                  <span className="mx-1.5">·</span>
                  <span className="capitalize">{item.messageType.replace('_', ' ')}</span>
                  <span></span>
                </div>
                <span className={`font-semibold capitalize ${item.status === 'replied' ? 'text-emerald-700' : item.status === 'archived' ? 'text-slate-400' : 'text-blue-700'}`}>
                  {item.status}
                </span>
              </div>

              <p className="mt-3 text-sm text-slate-800 leading-relaxed">{item.content}</p>

              {item.replyText && (
                <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50/50 px-4 py-2.5 text-xs text-slate-700">
                  <span className="font-semibold text-blue-800">Workspace Reply: </span>
                  {item.replyText}
                </div>
              )}

              {item.status !== 'archived' && (
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <input
                    type="text"
                    value={replyDrafts[item.id] || ''}
                    onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [item.id]: e.target.value }))}
                    placeholder="Write an official brand response..."
                    aria-label={`Reply to ${item.authorName}`}
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-blue-600 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => sendReply(item.id)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-800 whitespace-nowrap shrink-0"
                  >
                    <Send className="h-3.5 w-3.5" />
                    Send Reply
                  </button>
                  <button
                    type="button"
                    onClick={() => archiveItem(item.id)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 whitespace-nowrap shrink-0"
                  >
                    <Archive className="h-3.5 w-3.5" />
                    Archive
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const AnalyticsPage: React.FC = () => {
  const { activeWorkspace } = useAuth();
  const [snapshots, setSnapshots] = useState<AnalyticsSnapshotRecord[]>([]);

  useEffect(() => {
    if (!activeWorkspace) return;
    apiClient
      .getAnalytics(activeWorkspace.id)
      .then((res) => {
        setSnapshots(res.snapshots);
      })
      .catch(() => {});
  }, [activeWorkspace]);

  const totalImpressions = snapshots.reduce((sum, s) => sum + s.impressions, 0);
  const totalEngagements = snapshots.reduce((sum, s) => sum + s.engagements, 0);
  const totalClicks = snapshots.reduce((sum, s) => sum + s.clicks, 0);
  const engagementRate = totalImpressions > 0 ? ((totalEngagements / totalImpressions) * 100).toFixed(2) : '0.00';

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:items-end">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Analytics & Attribution</h1>
          <p className="mt-1 text-sm text-slate-600">
            Live analytics snapshots aggregated from your connected workspace accounts.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="lt-neon-card rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">Total Impressions</p>
          <p className="mt-2 font-mono-tabular text-2xl font-bold text-slate-900">{totalImpressions.toLocaleString()}</p>
        </div>
        <div className="lt-neon-card rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">Total Engagements</p>
          <p className="mt-2 font-mono-tabular text-2xl font-bold text-slate-900">{totalEngagements.toLocaleString()}</p>
        </div>
        <div className="lt-neon-card rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">Link Clicks</p>
          <p className="mt-2 font-mono-tabular text-2xl font-bold text-slate-900">{totalClicks.toLocaleString()}</p>
        </div>
        <div className="lt-neon-card rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">Engagement Rate</p>
          <p className="mt-2 font-mono-tabular text-2xl font-bold text-blue-700">{engagementRate}%</p>
        </div>
      </div>

      {snapshots.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <p className="text-sm font-semibold text-slate-800">No live analytics snapshots recorded yet.</p>
          <p className="mt-1 text-xs text-slate-500">Connect official social accounts via OAuth to ingest daily impressions, engagements, and follower growth.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="font-display text-base font-bold text-slate-900">Impressions vs. Engagements</h2>
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={snapshots}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" vertical={false} />
                  <XAxis dataKey="snapshotDate" tick={{ fontSize: 12, fill: '#E2E8F0' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#E2E8F0' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#071436', border: '1px solid rgba(56,189,248,0.45)', borderRadius: '10px', color: '#FFFFFF' }} />
                  <Bar dataKey="impressions" name="Impressions" fill="#38BDF8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="engagements" name="Engagements" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="font-display text-base font-bold text-slate-900">Audience Growth & Clicks</h2>
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={snapshots}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" vertical={false} />
                  <XAxis dataKey="snapshotDate" tick={{ fontSize: 12, fill: '#E2E8F0' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#E2E8F0' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#071436', border: '1px solid rgba(56,189,248,0.45)', borderRadius: '10px', color: '#FFFFFF' }} />
                  <Line type="monotone" dataKey="followersTotal" name="Followers" stroke="#38BDF8" strokeWidth={2.4} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="clicks" name="Clicks" stroke="#F59E0B" strokeWidth={2.4} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export const MediaLibraryPage: React.FC = () => {
  const { activeWorkspace } = useAuth();
  const [assets, setAssets] = useState<MediaAssetRecord[]>([]);
  const [fileName, setFileName] = useState('');
  const [assetType, setAssetType] = useState<'image' | 'video' | 'document' | 'template'>('image');
  const [publicUrl, setPublicUrl] = useState('');
  const [folder, setFolder] = useState('Brand Kit');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    if (!activeWorkspace) return;
    const list = await apiClient.getMedia(activeWorkspace.id);
    setAssets(list);
  };

  useEffect(() => {
    void load();
  }, [activeWorkspace]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace) return;
    setSubmitting(true);
    try {
      await apiClient.addMedia(activeWorkspace.id, {
        fileName,
        assetType,
        mimeType: assetType === 'image' ? 'image/png' : assetType === 'video' ? 'video/mp4' : 'application/pdf',
        publicUrl,
        fileSizeBytes: 245760,
        folder,
      });
      setFileName('');
      setPublicUrl('');
      await load();
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!activeWorkspace) return;
    await apiClient.deleteMedia(activeWorkspace.id, id);
    await load();
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-5">
        <h1 className="font-display text-2xl font-bold text-slate-900">Media Library</h1>
        <p className="mt-1 text-sm text-slate-600">
          Centralized brand assets, campaign visuals, and templates isolated to {activeWorkspace?.name}. Ready for Supabase Storage bucket binding.
        </p>
      </div>

      <form onSubmit={handleAdd} className="lt-neon-card grid grid-cols-1 gap-3 rounded-2xl p-5 md:grid-cols-12 md:items-end">
        <div className="md:col-span-3">
          <label htmlFor="media-name" className="block text-xs font-semibold text-slate-700">Asset File Name</label>
          <input
            id="media-name"
            type="text"
            required
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            placeholder="campaign-banner.png"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
          />
        </div>
        <div className="md:col-span-2">
          <label htmlFor="media-type" className="block text-xs font-semibold text-slate-700">Type</label>
          <select
            id="media-type"
            value={assetType}
            onChange={(e) => setAssetType(e.target.value as 'image' | 'video' | 'document' | 'template')}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
          >
            <option value="image">Image</option>
            <option value="video">Video</option>
            <option value="document">Document</option>
            <option value="template">Template</option>
          </select>
        </div>
        <div className="md:col-span-3">
          <label htmlFor="media-url" className="block text-xs font-semibold text-slate-700">Asset Path / URL</label>
          <input
            id="media-url"
            type="text"
            required
            value={publicUrl}
            onChange={(e) => setPublicUrl(e.target.value)}
            placeholder="/assets/aistudio/20261112_184805_8a13799e.jpg"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
          />
        </div>
        <div className="md:col-span-2">
          <label htmlFor="media-folder" className="block text-xs font-semibold text-slate-700">Folder</label>
          <input
            id="media-folder"
            type="text"
            value={folder}
            onChange={(e) => setFolder(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
          />
        </div>
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 whitespace-nowrap"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Asset
          </button>
        </div>
      </form>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {assets.map((asset) => (
          <div key={asset.id} className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="flex h-40 items-center justify-center bg-slate-50 border-b border-slate-100 p-4">
              {asset.assetType === 'image' ? (
                <img
                  src={asset.publicUrl}
                  alt={asset.fileName}
                  referrerPolicy="no-referrer"
                  className="max-h-full max-w-full object-contain"
                />
              ) : asset.assetType === 'video' ? (
                <Video className="h-10 w-10 text-blue-600" />
              ) : asset.assetType === 'document' ? (
                <FileText className="h-10 w-10 text-slate-500" />
              ) : (
                <ImageIcon className="h-10 w-10 text-amber-600" />
              )}
            </div>
            <div className="p-4">
              <p className="text-sm font-semibold text-slate-900 truncate">{asset.fileName}</p>
              <p className="mt-1 text-xs text-slate-500">
                <span>{asset.folder}</span>
                <span className="mx-1.5">·</span>
                <span className="capitalize">{asset.assetType}</span>
                <span className="mx-1.5">·</span>
                <span className="font-mono-tabular">{formatBytes(asset.fileSizeBytes)}</span>
              </p>
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => handleDelete(asset.id)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 hover:underline"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
