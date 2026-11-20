import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Sparkles,
  Tag,
  Trash2,
  X,
  CheckCircle2,
  AlertTriangle,
  Clock,
  GripVertical,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../lib/apiClient';
import {
  ALL_PLATFORM_KEYS,
  convertLocalDateTimeToUtcIso,
  formatUtcInTimezone,
  normalizeHashtags,
} from '../../utils/domain';
import type {
  ContentCalendarItemRecord,
  ContentCampaignRecord,
  PlatformKey,
  PublishingFormatKey,
  QueueJobStatus,
  RecurrenceType,
  SocialAccountRecord,
} from '../../shared/api-contracts';

type CalendarViewMode = 'month' | 'week' | 'day';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const COMMON_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Africa/Lagos',
  'Asia/Dubai',
  'Asia/Singapore',
];

function toDateKey(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function defaultLocalDateTime(dateKey?: string): string {
  const base = dateKey || toDateKey(new Date(Date.now() + 86400 * 1000));
  return `${base}T10:00`;
}

export const ContentCalendarPage: React.FC = () => {
  const { activeWorkspace, refreshSession } = useAuth();
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');
  const [cursorDate, setCursorDate] = useState<Date>(() => new Date());
  const [statusFilter, setStatusFilter] = useState<'all' | QueueJobStatus>('all');
  const [campaignFilter, setCampaignFilter] = useState<string>('all');

  const [items, setItems] = useState<ContentCalendarItemRecord[]>([]);
  const [campaigns, setCampaigns] = useState<ContentCampaignRecord[]>([]);
  const [accounts, setAccounts] = useState<SocialAccountRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);

  // Campaign creator inline state
  const [showCampaignForm, setShowCampaignForm] = useState(false);
  const [newCampName, setNewCampName] = useState('');
  const [newCampColor, setNewCampColor] = useState('#2563EB');

  // Schedule modal state
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [sPlatform, setSPlatform] = useState<PlatformKey>('linkedin');
  const [sAccountId, setSAccountId] = useState('');
  const [sCampaignId, setSCampaignId] = useState('');
  const [sFormat, setSFormat] = useState<PublishingFormatKey>('text');
  const [sTitle, setSTitle] = useState('');
  const [sBody, setSBody] = useState('');
  const [sHashtags, setSHashtags] = useState('');
  const [sMediaUrl, setSMediaUrl] = useState('');
  const [sLocalDateTime, setSLocalDateTime] = useState(defaultLocalDateTime());
  const [sTimezone, setSTimezone] = useState('UTC');
  const [sRecurrence, setSRecurrence] = useState<RecurrenceType>('none');
  const [sWeekdays, setSWeekdays] = useState<number[]>([1, 3, 5]);
  const [sDayOfMonth, setSDayOfMonth] = useState<number>(1);
  const [sCustomDatesRaw, setSCustomDatesRaw] = useState('');
  const [sMode, setSMode] = useState<'automatic' | 'approval_required' | 'draft'>('automatic');
  const [submittingSchedule, setSubmittingSchedule] = useState(false);

  // AI Calendar Generator modal state
  const [aiPlanOpen, setAiPlanOpen] = useState(false);
  const [aiDays, setAiDays] = useState(7);
  const [aiObjective, setAiObjective] = useState('Consistent brand education and product awareness');
  const [aiPlatforms, setAiPlatforms] = useState<PlatformKey[]>(['linkedin', 'facebook', 'x']);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [aiPlanResult, setAiPlanResult] = useState<{
    evidenceDisclaimer: string;
    hasLiveAudienceInsights: boolean;
    items: {
      dayOffset: number;
      suggestedLocalTime: string;
      platformKey: PlatformKey;
      formatKey: PublishingFormatKey;
      title: string;
      bodyText: string;
      hashtags: string[];
      rationale: string;
      timeEvidenceBasis: string;
    }[];
  } | null>(null);
  const [applyingPlan, setApplyingPlan] = useState(false);

  const loadData = useCallback(async () => {
    if (!activeWorkspace) return;
    setLoading(true);
    try {
      const [calRes, campRes, accRes] = await Promise.all([
        apiClient.getCalendarItems(activeWorkspace.id),
        apiClient.getCampaigns(activeWorkspace.id),
        apiClient.getSocialAccounts(activeWorkspace.id),
      ]);
      setItems(calRes.items);
      setCampaigns(campRes.campaigns);
      setAccounts(accRes.accounts.filter((a) => a.connectionStatus === 'connected'));
      if (activeWorkspace.timezone) setSTimezone(activeWorkspace.timezone);
    } catch (err) {
      setBanner({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to load content calendar.',
      });
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (campaignFilter !== 'all' && item.campaignId !== campaignFilter) return false;
      return true;
    });
  }, [items, statusFilter, campaignFilter]);

  // Compute visible days for Month / Week / Day views
  const visibleDays = useMemo(() => {
    const out: Date[] = [];
    if (viewMode === 'day') {
      out.push(new Date(cursorDate.getFullYear(), cursorDate.getMonth(), cursorDate.getDate()));
      return out;
    }
    if (viewMode === 'week') {
      const start = new Date(cursorDate.getFullYear(), cursorDate.getMonth(), cursorDate.getDate());
      start.setDate(start.getDate() - start.getDay());
      for (let i = 0; i < 7; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        out.push(d);
      }
      return out;
    }
    // Month grid (35 or 42 days starting on Sunday)
    const first = new Date(cursorDate.getFullYear(), cursorDate.getMonth(), 1);
    const start = new Date(first);
    start.setDate(first.getDate() - first.getDay());
    for (let i = 0; i < 35; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      out.push(d);
    }
    return out;
  }, [cursorDate, viewMode]);

  const itemsByDay = useMemo(() => {
    const map: Record<string, ContentCalendarItemRecord[]> = {};
    for (const item of filteredItems) {
      const dt = new Date(item.scheduledAt);
      if (Number.isNaN(dt.getTime())) continue;
      const key = toDateKey(dt);
      if (!map[key]) map[key] = [];
      map[key].push(item);
    }
    return map;
  }, [filteredItems]);

  const stepCursor = (dir: -1 | 1) => {
    const next = new Date(cursorDate);
    if (viewMode === 'month') next.setMonth(next.getMonth() + dir);
    else if (viewMode === 'week') next.setDate(next.getDate() + dir * 7);
    else next.setDate(next.getDate() + dir);
    setCursorDate(next);
  };

  const handleDropOnDay = async (targetDateKey: string) => {
    if (!activeWorkspace || !draggedItemId) return;
    const item = items.find((i) => i.id === draggedItemId);
    setDraggedItemId(null);
    if (!item) return;
    if (item.status === 'published') {
      setBanner({ type: 'error', text: 'Published posts cannot be rescheduled.' });
      return;
    }
    try {
      const oldDate = new Date(item.scheduledAt);
      const pad = (n: number) => String(n).padStart(2, '0');
      const timePart = `${pad(oldDate.getHours())}:${pad(oldDate.getMinutes())}`;
      const newUtc = convertLocalDateTimeToUtcIso(`${targetDateKey}T${timePart}`, item.timezone || 'UTC');
      await apiClient.rescheduleCalendarItem(activeWorkspace.id, item.id, newUtc, item.timezone || 'UTC');
      setBanner({
        type: 'success',
        text: `Rescheduled "${item.title}" to ${formatUtcInTimezone(newUtc, item.timezone || 'UTC')}.`,
      });
      await loadData();
    } catch (err) {
      setBanner({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to reschedule item.',
      });
    }
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace || !newCampName.trim()) return;
    try {
      await apiClient.createCampaign(activeWorkspace.id, {
        name: newCampName.trim(),
        colorHex: newCampColor,
      });
      setNewCampName('');
      setShowCampaignForm(false);
      await loadData();
    } catch (err) {
      setBanner({ type: 'error', text: err instanceof Error ? err.message : 'Failed to create campaign.' });
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    if (!activeWorkspace) return;
    try {
      await apiClient.deleteCampaign(activeWorkspace.id, id);
      if (campaignFilter === id) setCampaignFilter('all');
      await loadData();
    } catch (err) {
      setBanner({ type: 'error', text: err instanceof Error ? err.message : 'Unable to delete campaign.' });
    }
  };

  const handleCreateScheduledPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace || !sTitle.trim() || !sBody.trim()) return;
    setSubmittingSchedule(true);
    setBanner(null);
    try {
      const scheduledAt = convertLocalDateTimeToUtcIso(sLocalDateTime, sTimezone);
      const customDates = sCustomDatesRaw
        .split(/[\n,]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      const res = await apiClient.enqueuePublishingJob(activeWorkspace.id, {
        platformKey: sPlatform,
        socialAccountId: sAccountId || null,
        campaignId: sCampaignId || null,
        formatKey: sFormat,
        title: sTitle.trim(),
        bodyText: sBody.trim(),
        hashtags: normalizeHashtags(sHashtags.split(/[\s,]+/).filter(Boolean)),
        mediaUrls: sMediaUrl.trim() ? [sMediaUrl.trim()] : [],
        scheduledAt,
        timezone: sTimezone,
        recurrenceRule: {
          type: sRecurrence,
          weekdays: sRecurrence === 'weekdays' ? sWeekdays : undefined,
          dayOfMonth: sRecurrence === 'monthly' ? sDayOfMonth : undefined,
          customDates: sRecurrence === 'custom' ? customDates : undefined,
        },
        publishingModeOverride: sMode === 'draft' ? undefined : sMode,
        saveAsDraft: sMode === 'draft',
      });
      setScheduleOpen(false);
      setSTitle('');
      setSBody('');
      setSHashtags('');
      setSMediaUrl('');
      setBanner({
        type: 'success',
        text: `Calendar item created (${res.job.status.replace('_', ' ')} · ${formatUtcInTimezone(res.job.scheduledAt, res.job.timezone)}).`,
      });
      await loadData();
    } catch (err) {
      setBanner({ type: 'error', text: err instanceof Error ? err.message : 'Unable to schedule post.' });
    } finally {
      setSubmittingSchedule(false);
    }
  };

  const handleGenerateAiPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace || aiPlatforms.length === 0) return;
    setGeneratingPlan(true);
    setBanner(null);
    try {
      const res = await apiClient.generateCalendarPlan(activeWorkspace.id, {
        platforms: aiPlatforms,
        daysCount: aiDays,
        campaignObjective: aiObjective,
        timezone: sTimezone,
      });
      setAiPlanResult(res);
      void refreshSession();
    } catch (err) {
      setBanner({ type: 'error', text: err instanceof Error ? err.message : 'AI calendar planning failed.' });
    } finally {
      setGeneratingPlan(false);
    }
  };

  const handleApplyAiPlan = async () => {
    if (!activeWorkspace || !aiPlanResult) return;
    setApplyingPlan(true);
    setBanner(null);
    try {
      let created = 0;
      const pad = (n: number) => String(n).padStart(2, '0');
      for (const entry of aiPlanResult.items) {
        const target = new Date();
        target.setDate(target.getDate() + Math.max(1, entry.dayOffset));
        const localStr = `${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(target.getDate())}T${entry.suggestedLocalTime || '10:00'}`;
        const scheduledAt = convertLocalDateTimeToUtcIso(localStr, sTimezone);
        const matchingAcc = accounts.find((a) => a.platformKey === entry.platformKey);
        await apiClient.enqueuePublishingJob(activeWorkspace.id, {
          platformKey: entry.platformKey,
          socialAccountId: matchingAcc?.id || null,
          formatKey: entry.formatKey === 'image' || entry.formatKey === 'video' ? 'text' : entry.formatKey,
          title: entry.title,
          bodyText: entry.bodyText,
          hashtags: entry.hashtags,
          scheduledAt,
          timezone: sTimezone,
          saveAsDraft: entry.platformKey === 'instagram' || entry.platformKey === 'pinterest' || entry.platformKey === 'tiktok' || entry.platformKey === 'youtube',
        });
        created += 1;
      }
      setAiPlanOpen(false);
      setAiPlanResult(null);
      setBanner({
        type: 'success',
        text: `Applied ${created} AI-planned items to your Content Calendar.`,
      });
      await loadData();
    } catch (err) {
      setBanner({ type: 'error', text: err instanceof Error ? err.message : 'Failed to apply AI plan.' });
    } finally {
      setApplyingPlan(false);
    }
  };

  const utcPreview = useMemo(() => {
    try {
      return formatUtcInTimezone(convertLocalDateTimeToUtcIso(sLocalDateTime, sTimezone), 'UTC');
    } catch {
      return 'Invalid date/time';
    }
  }, [sLocalDateTime, sTimezone]);

  const headerLabel = useMemo(() => {
    if (viewMode === 'day') {
      return cursorDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    }
    return cursorDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [cursorDate, viewMode]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold text-slate-900">AI Content Calendar</h2>
          <p className="mt-1 text-xs text-slate-500">
            Drag and drop scheduled posts across dates to reschedule, organize campaigns, configure recurring schedules, and plan evidence-based calendars.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setAiPlanOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800 hover:bg-blue-100"
          >
            <Sparkles className="h-3.5 w-3.5" />
            AI Calendar Plan
          </button>
          <button
            type="button"
            onClick={() => {
              setSLocalDateTime(defaultLocalDateTime());
              setScheduleOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-800"
          >
            <Plus className="h-3.5 w-3.5" />
            Schedule Post
          </button>
        </div>
      </div>

      {banner && (
        <div
          className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-xs font-medium ${
            banner.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-rose-200 bg-rose-50 text-rose-900'
          }`}
        >
          {banner.type === 'success' ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <span>{banner.text}</span>
        </div>
      )}

      {/* Campaign Bar & View Controls */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => stepCursor(-1)}
              className="rounded-lg border border-slate-200 p-1.5 text-slate-700 hover:bg-slate-50"
              aria-label="Previous period"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <h3 className="min-w-[160px] text-center font-display text-sm font-bold text-slate-900">
              {headerLabel}
            </h3>
            <button
              type="button"
              onClick={() => stepCursor(1)}
              className="rounded-lg border border-slate-200 p-1.5 text-slate-700 hover:bg-slate-50"
              aria-label="Next period"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setCursorDate(new Date())}
              className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Today
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
              {(['day', 'week', 'month'] as CalendarViewMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setViewMode(m)}
                  className={`rounded-md px-3 py-1 text-xs font-semibold capitalize ${
                    viewMode === m ? 'bg-blue-700 text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | QueueJobStatus)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700"
            >
              <option value="all">All Statuses</option>
              <option value="scheduled">Scheduled</option>
              <option value="queued">Queued</option>
              <option value="awaiting_approval">Awaiting Approval</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>

        {/* Campaigns strip */}
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600">
            <Tag className="h-3.5 w-3.5" />
            Campaigns:
          </span>
          <button
            type="button"
            onClick={() => setCampaignFilter('all')}
            className={`rounded-md px-2.5 py-1 text-[11px] font-semibold ${
              campaignFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All ({items.length})
          </button>
          {campaigns.map((c) => (
            <div key={c.id} className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-0.5">
              <button
                type="button"
                onClick={() => setCampaignFilter(campaignFilter === c.id ? 'all' : c.id)}
                className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${
                  campaignFilter === c.id ? 'text-blue-700' : 'text-slate-700'
                }`}
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.colorHex }} />
                {c.name}
              </button>
              <button
                type="button"
                onClick={() => void handleDeleteCampaign(c.id)}
                aria-label={`Delete ${c.name}`}
                className="text-slate-400 hover:text-rose-600"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
          {showCampaignForm ? (
            <form onSubmit={handleCreateCampaign} className="inline-flex items-center gap-1.5">
              <input
                type="text"
                required
                value={newCampName}
                onChange={(e) => setNewCampName(e.target.value)}
                placeholder="Campaign name"
                className="rounded border border-slate-300 px-2 py-1 text-xs"
              />
              <input
                type="color"
                value={newCampColor}
                onChange={(e) => setNewCampColor(e.target.value)}
                className="h-6 w-6 cursor-pointer rounded border border-slate-300"
              />
              <button type="submit" className="rounded bg-blue-700 px-2 py-1 text-[11px] font-semibold text-white">
                Add
              </button>
              <button
                type="button"
                onClick={() => setShowCampaignForm(false)}
                className="text-slate-500 hover:text-slate-700"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setShowCampaignForm(true)}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 hover:underline"
            >
              <Plus className="h-3 w-3" />
              New Campaign
            </button>
          )}
        </div>
      </div>

      {/* Calendar Grid */}
      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-xs text-slate-500">
          Loading calendar schedule...
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          {viewMode !== 'day' && (
            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
              {WEEKDAY_LABELS.map((day) => (
                <div key={day} className="px-2 py-2 text-center text-[11px] font-bold uppercase text-slate-600">
                  {day}
                </div>
              ))}
            </div>
          )}
          <div
            className={`grid ${
              viewMode === 'day' ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-7'
            } divide-y sm:divide-y-0 sm:divide-x divide-slate-200`}
          >
            {visibleDays.map((day) => {
              const key = toDateKey(day);
              const dayItems = itemsByDay[key] || [];
              const isToday = key === toDateKey(new Date());
              const isCurrentMonth = day.getMonth() === cursorDate.getMonth();
              return (
                <div
                  key={key}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => void handleDropOnDay(key)}
                  className={`min-h-[120px] border-b border-slate-200 p-2 transition-colors ${
                    !isCurrentMonth && viewMode === 'month' ? 'bg-slate-50/70' : 'bg-white'
                  } ${draggedItemId ? 'hover:bg-blue-50/60' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                        isToday
                          ? 'bg-blue-700 text-white'
                          : isCurrentMonth || viewMode !== 'month'
                          ? 'text-slate-800'
                          : 'text-slate-400'
                      }`}
                    >
                      {day.getDate()}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSLocalDateTime(defaultLocalDateTime(key));
                        setScheduleOpen(true);
                      }}
                      title={`Schedule on ${key}`}
                      className="rounded p-0.5 text-slate-400 hover:bg-blue-50 hover:text-blue-700"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="mt-1.5 space-y-1.5">
                    {dayItems.map((item) => (
                      <div
                        key={item.id}
                        draggable={item.status !== 'published'}
                        onDragStart={() => setDraggedItemId(item.id)}
                        onDragEnd={() => setDraggedItemId(null)}
                        className={`rounded-lg border p-2 text-[11px] shadow-2xs ${
                          item.status === 'published'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-950'
                            : item.status === 'failed'
                            ? 'border-rose-200 bg-rose-50 text-rose-950 cursor-grab'
                            : item.status === 'awaiting_approval'
                            ? 'border-amber-200 bg-amber-50 text-amber-950 cursor-grab'
                            : item.status === 'draft'
                            ? 'border-slate-200 bg-slate-50 text-slate-800 cursor-grab'
                            : 'border-blue-200 bg-blue-50/80 text-blue-950 cursor-grab'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold uppercase text-[9px] tracking-wide">
                            {item.platformKey}
                          </span>
                          <div className="flex items-center gap-1">
                            {item.recurrenceType !== 'none' && (
                              <span className="rounded bg-white/80 px-1 text-[9px] font-semibold">
                                {item.recurrenceType}
                              </span>
                            )}
                            {item.status !== 'published' && <GripVertical className="h-3 w-3 opacity-50" />}
                          </div>
                        </div>
                        <p className="mt-0.5 line-clamp-2 font-semibold">{item.title}</p>
                        <p className="mt-0.5 text-[10px] opacity-75">
                          {new Date(item.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ·{' '}
                          {item.status.replace('_', ' ')}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SCHEDULE POST MODAL */}
      {scheduleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <form
            onSubmit={handleCreateScheduledPost}
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-blue-700" />
                <h3 className="text-sm font-bold text-slate-900">Schedule Post & Recurring Rule</h3>
              </div>
              <button type="button" onClick={() => setScheduleOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700">Platform</label>
                <select
                  value={sPlatform}
                  onChange={(e) => setSPlatform(e.target.value as PlatformKey)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs"
                >
                  {ALL_PLATFORM_KEYS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700">Connected Account</label>
                <select
                  value={sAccountId}
                  onChange={(e) => setSAccountId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs"
                >
                  <option value="">Workspace Default</option>
                  {accounts
                    .filter((a) => a.platformKey === sPlatform)
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.accountName}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700">Format</label>
                <select
                  value={sFormat}
                  onChange={(e) => setSFormat(e.target.value as PublishingFormatKey)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs"
                >
                  <option value="text">Text</option>
                  <option value="image">Image</option>
                  <option value="video">Video</option>
                  <option value="carousel">Carousel</option>
                  <option value="reels">Reels</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700">Post Title *</label>
                <input
                  type="text"
                  required
                  value={sTitle}
                  onChange={(e) => setSTitle(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700">Campaign</label>
                <select
                  value={sCampaignId}
                  onChange={(e) => setSCampaignId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs"
                >
                  <option value="">None</option>
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700">Post Copy *</label>
              <textarea
                required
                rows={4}
                value={sBody}
                onChange={(e) => setSBody(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700">Hashtags</label>
                <input
                  type="text"
                  value={sHashtags}
                  onChange={(e) => setSHashtags(e.target.value)}
                  placeholder="#BrandStrategy #Growth"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700">Media URL (Required for Image/Video)</label>
                <input
                  type="text"
                  value={sMediaUrl}
                  onChange={(e) => setSMediaUrl(e.target.value)}
                  placeholder="/generated/... or https://..."
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700">Local Date & Time *</label>
                <input
                  type="datetime-local"
                  required
                  value={sLocalDateTime}
                  onChange={(e) => setSLocalDateTime(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700">Timezone (DST-Safe)</label>
                <select
                  value={sTimezone}
                  onChange={(e) => setSTimezone(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs"
                >
                  {COMMON_TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700">Publishing Mode</label>
                <select
                  value={sMode}
                  onChange={(e) => setSMode(e.target.value as typeof sMode)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs"
                >
                  <option value="automatic">Automatic (Default)</option>
                  <option value="approval_required">Require Approval</option>
                  <option value="draft">Save as Draft</option>
                </select>
              </div>
            </div>

            <p className="inline-flex items-center gap-1.5 text-[11px] text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg">
              <Clock className="h-3.5 w-3.5" />
              Exact UTC Execution Time (DST-adjusted): <strong className="font-mono-tabular">{utcPreview}</strong>
            </p>

            {/* Recurrence Builder */}
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-[11px] font-bold text-slate-800">Recurring Schedule</label>
                <select
                  value={sRecurrence}
                  onChange={(e) => setSRecurrence(e.target.value as RecurrenceType)}
                  className="rounded border border-slate-300 bg-white px-2.5 py-1 text-xs"
                >
                  <option value="none">One-time</option>
                  <option value="daily">Daily</option>
                  <option value="weekdays">Selected Weekdays</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="custom">Custom Dates</option>
                </select>
              </div>

              {sRecurrence === 'weekdays' && (
                <div className="flex flex-wrap gap-1.5">
                  {WEEKDAY_LABELS.map((label, idx) => {
                    const active = sWeekdays.includes(idx);
                    return (
                      <button
                        key={label}
                        type="button"
                        onClick={() =>
                          setSWeekdays((prev) =>
                            active ? prev.filter((d) => d !== idx) : [...prev, idx].sort()
                          )
                        }
                        className={`rounded px-2.5 py-1 text-[11px] font-semibold ${
                          active ? 'bg-blue-700 text-white' : 'border border-slate-300 bg-white text-slate-700'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              )}

              {sRecurrence === 'monthly' && (
                <div className="flex items-center gap-2 text-xs">
                  <span>Day of Month (1–28):</span>
                  <input
                    type="number"
                    min={1}
                    max={28}
                    value={sDayOfMonth}
                    onChange={(e) => setSDayOfMonth(Number(e.target.value) || 1)}
                    className="w-20 rounded border border-slate-300 bg-white px-2 py-1 text-xs"
                  />
                </div>
              )}

              {sRecurrence === 'custom' && (
                <div>
                  <label className="block text-[10px] text-slate-600">
                    Additional local dates (YYYY-MM-DDTHH:mm, comma or newline separated)
                  </label>
                  <textarea
                    rows={2}
                    value={sCustomDatesRaw}
                    onChange={(e) => setSCustomDatesRaw(e.target.value)}
                    placeholder="2026-12-01T10:00, 2026-12-05T14:30"
                    className="mt-1 w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setScheduleOpen(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingSchedule}
                className="rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
              >
                {submittingSchedule ? 'Scheduling...' : 'Save to Calendar & Queue'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* AI CALENDAR PLANNER MODAL */}
      {aiPlanOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-blue-700" />
                <h3 className="text-sm font-bold text-slate-900">Evidence-Based AI Calendar Generator</h3>
              </div>
              <button type="button" onClick={() => setAiPlanOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleGenerateAiPlan} className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700">Days to Plan</label>
                  <select
                    value={aiDays}
                    onChange={(e) => setAiDays(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs"
                  >
                    <option value={5}>5 Days</option>
                    <option value={7}>7 Days (1 Week)</option>
                    <option value={14}>14 Days (2 Weeks)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700">Timezone</label>
                  <select
                    value={sTimezone}
                    onChange={(e) => setSTimezone(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs"
                  >
                    {COMMON_TIMEZONES.map((tz) => (
                      <option key={tz} value={tz}>
                        {tz}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700">Campaign Objective</label>
                <input
                  type="text"
                  required
                  value={aiObjective}
                  onChange={(e) => setAiObjective(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-700 mb-1">Platforms</p>
                <div className="flex flex-wrap gap-2">
                  {ALL_PLATFORM_KEYS.map((p) => {
                    const checked = aiPlatforms.includes(p);
                    return (
                      <label
                        key={p}
                        className={`inline-flex items-center gap-1.5 rounded border px-2.5 py-1 text-xs cursor-pointer ${
                          checked ? 'border-blue-600 bg-blue-50 font-semibold text-blue-900' : 'border-slate-200'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) =>
                            setAiPlatforms((prev) =>
                              e.target.checked ? [...prev, p] : prev.filter((item) => item !== p)
                            )
                          }
                        />
                        {p}
                      </label>
                    );
                  })}
                </div>
              </div>
              <button
                type="submit"
                disabled={generatingPlan || aiPlatforms.length === 0}
                className="rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
              >
                {generatingPlan ? 'Generating Plan...' : 'Generate AI Schedule Plan (10 cr)'}
              </button>
            </form>

            {aiPlanResult && (
              <div className="space-y-3 border-t border-slate-200 pt-4">
                <div
                  className={`rounded-lg border px-3 py-2 text-xs ${
                    aiPlanResult.hasLiveAudienceInsights
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                      : 'border-amber-200 bg-amber-50 text-amber-900'
                  }`}
                >
                  <strong>Timing Evidence Disclaimer:</strong> {aiPlanResult.evidenceDisclaimer}
                </div>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {aiPlanResult.items.map((entry, idx) => (
                    <div key={idx} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-900">
                          Day +{entry.dayOffset} · {entry.suggestedLocalTime} · {entry.platformKey.toUpperCase()}
                        </span>
                        <span className="text-[10px] text-slate-500">{entry.timeEvidenceBasis}</span>
                      </div>
                      <p className="mt-1 font-semibold text-slate-800">{entry.title}</p>
                      <p className="mt-0.5 text-slate-600">{entry.bodyText}</p>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={applyingPlan}
                    onClick={() => void handleApplyAiPlan()}
                    className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
                  >
                    {applyingPlan ? 'Applying to Calendar...' : `Apply All ${aiPlanResult.items.length} Posts to Calendar`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
