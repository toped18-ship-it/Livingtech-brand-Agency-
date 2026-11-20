import React, { useCallback, useEffect, useState } from 'react';
import {
  Compass,
  Brain,
  Users,
  TrendingUp,
  Save,
  Upload,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Sparkles,
  FileText,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../lib/apiClient';
import { ALL_PLATFORM_KEYS } from '../../utils/domain';
import type {
  AiContentStrategyRecord,
  BrandAnalysisRecord,
  BrandDocumentItem,
  BrandIntelligenceProfile,
  PlatformKey,
} from '../../shared/api-contracts';

type StrategyTab = 'brand' | 'audience' | 'strategy' | 'performance';

export const AiStrategyPage: React.FC = () => {
  const { activeWorkspace, refreshSession } = useAuth();
  const [activeTab, setActiveTab] = useState<StrategyTab>('brand');
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Brand Intelligence profile & analyses
  const [profile, setProfile] = useState<BrandIntelligenceProfile | null>(null);
  const [bannedWordsInput, setBannedWordsInput] = useState('');
  const [analyses, setAnalyses] = useState<BrandAnalysisRecord[]>([]);
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [runningBrandAnalysis, setRunningBrandAnalysis] = useState(false);

  // Brand document upload form
  const [docName, setDocName] = useState('');
  const [docCategory, setDocCategory] = useState<BrandDocumentItem['category']>('brand_guide');
  const [docSummary, setDocSummary] = useState('');
  const [docUrl, setDocUrl] = useState('');
  const [addingDoc, setAddingDoc] = useState(false);

  // Audience Analysis
  const [focusMarket, setFocusMarket] = useState('');
  const [runningAudience, setRunningAudience] = useState(false);
  const [audienceResult, setAudienceResult] = useState<{
    evidenceStatus: string;
    segments: {
      name: string;
      demographicsAndRole: string;
      corePainPoints: string[];
      desiredOutcomes: string[];
      contentAngles: string[];
      recommendedPlatforms: string[];
      isAssumption: boolean;
    }[];
    messagingDo: string[];
    messagingDont: string[];
  } | null>(null);

  // 30-Day Content Strategy
  const [strategies, setStrategies] = useState<AiContentStrategyRecord[]>([]);
  const [strategyTitle, setStrategyTitle] = useState('');
  const [strategyGoals, setStrategyGoals] = useState('');
  const [strategyPlatforms, setStrategyPlatforms] = useState<PlatformKey[]>(['linkedin', 'instagram', 'facebook']);
  const [generatingStrategy, setGeneratingStrategy] = useState(false);

  // Performance Recommendations
  const [runningPerf, setRunningPerf] = useState(false);
  const [perfResult, setPerfResult] = useState<{
    hasLiveData: boolean;
    dataBasisSummary: string;
    keyObservations: string[];
    actionableRecommendations: {
      title: string;
      rationale: string;
      priority: 'high' | 'medium' | 'low';
      evidenceType: 'observed_metric' | 'best_practice_hypothesis';
    }[];
    nextExperiments: string[];
  } | null>(null);

  const loadAll = useCallback(async () => {
    if (!activeWorkspace) return;
    setLoading(true);
    try {
      const [intelRes, stratRes] = await Promise.all([
        apiClient.getBrandIntelligence(activeWorkspace.id),
        apiClient.getStrategiesV3(activeWorkspace.id),
      ]);
      setProfile(intelRes.profile);
      setBannedWordsInput((intelRes.profile.bannedWords || []).join(', '));
      setAnalyses(intelRes.analyses);
      setStrategies(stratRes.strategies);
      if (intelRes.profile.businessGoals && !strategyGoals) {
        setStrategyGoals(intelRes.profile.businessGoals);
      }
    } catch (err) {
      setBanner({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to load brand intelligence.',
      });
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace, strategyGoals]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace || !profile) return;
    setSavingProfile(true);
    setBanner(null);
    try {
      const bannedWords = bannedWordsInput
        .split(/[,\n]+/)
        .map((w) => w.trim())
        .filter(Boolean);
      const res = await apiClient.updateBrandIntelligence(activeWorkspace.id, {
        ...profile,
        bannedWords,
      });
      setProfile(res.profile);
      setBanner({
        type: 'success',
        text: 'Brand Intelligence profile & Content Safety policy updated for this workspace.',
      });
    } catch (err) {
      setBanner({ type: 'error', text: err instanceof Error ? err.message : 'Failed to save profile.' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAddDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace || !docName.trim() || !docSummary.trim()) return;
    setAddingDoc(true);
    setBanner(null);
    try {
      const res = await apiClient.addBrandDocument(activeWorkspace.id, {
        name: docName.trim(),
        category: docCategory,
        summary: docSummary.trim(),
        url: docUrl.trim() || undefined,
      });
      setProfile((prev) => (prev ? { ...prev, brandDocuments: res.brandDocuments } : prev));
      setDocName('');
      setDocSummary('');
      setDocUrl('');
      setBanner({
        type: 'success',
        text: 'Brand document added to workspace intelligence knowledge base.',
      });
    } catch (err) {
      setBanner({ type: 'error', text: err instanceof Error ? err.message : 'Failed to add document.' });
    } finally {
      setAddingDoc(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!activeWorkspace) return;
    try {
      const res = await apiClient.deleteBrandDocument(activeWorkspace.id, docId);
      setProfile((prev) => (prev ? { ...prev, brandDocuments: res.brandDocuments } : prev));
    } catch (err) {
      setBanner({ type: 'error', text: err instanceof Error ? err.message : 'Unable to delete document.' });
    }
  };

  const handleRunBrandAnalysis = async () => {
    if (!activeWorkspace) return;
    setRunningBrandAnalysis(true);
    setBanner(null);
    try {
      const res = await apiClient.runBrandAnalysis(activeWorkspace.id, additionalNotes.trim() || undefined);
      setAnalyses((prev) => [res.analysis, ...prev]);
      setBanner({
        type: 'success',
        text: `Brand Intelligence Analysis completed (${res.creditsRemaining} credits remaining). Verified facts and assumptions are clearly separated below.`,
      });
      void refreshSession();
    } catch (err) {
      setBanner({ type: 'error', text: err instanceof Error ? err.message : 'Brand analysis failed.' });
    } finally {
      setRunningBrandAnalysis(false);
    }
  };

  const handleRunAudience = async () => {
    if (!activeWorkspace) return;
    setRunningAudience(true);
    setBanner(null);
    try {
      const res = await apiClient.runAudienceAnalysis(activeWorkspace.id, focusMarket.trim() || undefined);
      setAudienceResult(res);
      setBanner({
        type: 'success',
        text: `Audience segmentation generated (${res.creditsRemaining} credits remaining).`,
      });
      void refreshSession();
    } catch (err) {
      setBanner({ type: 'error', text: err instanceof Error ? err.message : 'Audience analysis failed.' });
    } finally {
      setRunningAudience(false);
    }
  };

  const handleGenerateStrategy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace || !strategyGoals.trim() || strategyPlatforms.length === 0) return;
    setGeneratingStrategy(true);
    setBanner(null);
    try {
      const res = await apiClient.generateStrategyV3(activeWorkspace.id, {
        title: strategyTitle.trim() || undefined,
        goals: strategyGoals.trim(),
        platforms: strategyPlatforms,
      });
      setStrategies((prev) => [res.strategy, ...prev]);
      setStrategyTitle('');
      setBanner({
        type: 'success',
        text: `30-Day Content Strategy saved (${res.creditsRemaining} credits remaining).`,
      });
      void refreshSession();
    } catch (err) {
      setBanner({ type: 'error', text: err instanceof Error ? err.message : 'Strategy generation failed.' });
    } finally {
      setGeneratingStrategy(false);
    }
  };

  const handleRunPerf = async () => {
    if (!activeWorkspace) return;
    setRunningPerf(true);
    setBanner(null);
    try {
      const res = await apiClient.runPerformanceRecommendations(activeWorkspace.id);
      setPerfResult(res);
      setBanner({
        type: 'success',
        text: `Performance analysis completed (${res.creditsRemaining} credits remaining).`,
      });
      void refreshSession();
    } catch (err) {
      setBanner({ type: 'error', text: err instanceof Error ? err.message : 'Performance recommendations failed.' });
    } finally {
      setRunningPerf(false);
    }
  };

  const latestAnalysis = analyses[0] || null;
  const latestStrategy = strategies[0] || null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold text-slate-900">AI Brand Intelligence & Strategy</h2>
          <p className="mt-1 text-xs text-slate-500">
            Maintain your reusable Brand Profile, upload marketing materials, separate verified brand facts from AI assumptions, and build evidence-based 30-day strategies.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { id: 'brand', label: 'Brand Intelligence', icon: Brain },
              { id: 'audience', label: 'Audience Analysis', icon: Users },
              { id: 'strategy', label: '30-Day Content Strategy', icon: Compass },
              { id: 'performance', label: 'Performance Insights', icon: TrendingUp },
            ] as const
          ).map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                  activeTab === t.id
                    ? 'bg-blue-700 text-white'
                    : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            );
          })}
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

      {loading || !profile ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">
          Loading brand intelligence workspace...
        </div>
      ) : (
        <>
          {/* TAB 1: BRAND INTELLIGENCE & ANALYSIS */}
          {activeTab === 'brand' && (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
              {/* Left: Reusable Brand Profile & Documents */}
              <div className="xl:col-span-6 space-y-5">
                <form
                  onSubmit={handleSaveProfile}
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3.5"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-bold text-slate-900">Reusable Workspace Brand Profile</h3>
                    <button
                      type="submit"
                      disabled={savingProfile}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
                    >
                      <Save className="h-3.5 w-3.5" />
                      {savingProfile ? 'Saving...' : 'Save Profile'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700">Brand Name</label>
                      <input
                        type="text"
                        value={profile.brandName}
                        onChange={(e) => setProfile({ ...profile, brandName: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700">Industry</label>
                      <input
                        type="text"
                        value={profile.industry}
                        onChange={(e) => setProfile({ ...profile, industry: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700">Business Description</label>
                    <textarea
                      rows={2}
                      value={profile.businessDescription}
                      onChange={(e) => setProfile({ ...profile, businessDescription: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700">Products & Services</label>
                    <textarea
                      rows={2}
                      value={profile.productsServices}
                      onChange={(e) => setProfile({ ...profile, productsServices: e.target.value })}
                      placeholder="List core offerings, pricing tiers, or flagship services..."
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700">Target Audience</label>
                      <input
                        type="text"
                        value={profile.targetAudience}
                        onChange={(e) => setProfile({ ...profile, targetAudience: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700">Brand Voice</label>
                      <input
                        type="text"
                        value={profile.toneOfVoice}
                        onChange={(e) => setProfile({ ...profile, toneOfVoice: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700">Business Goals</label>
                    <textarea
                      rows={2}
                      value={profile.businessGoals}
                      onChange={(e) => setProfile({ ...profile, businessGoals: e.target.value })}
                      placeholder="e.g., Increase qualified B2B demo requests by focusing on case-study education"
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                    />
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2.5">
                    <p className="flex items-center gap-1.5 text-[11px] font-bold text-slate-800">
                      <ShieldCheck className="h-3.5 w-3.5 text-blue-700" />
                      Content Safety & Brand Tone Guardrails
                    </p>
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600">
                          Banned Words / Phrases (comma-separated)
                        </label>
                        <input
                          type="text"
                          value={bannedWordsInput}
                          onChange={(e) => setBannedWordsInput(e.target.value)}
                          placeholder="cheap, overnight riches, guaranteed viral"
                          className="mt-1 w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600">
                          Max Posts Per Day (Workspace Cap)
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={50}
                          value={profile.maxPostsPerDay}
                          onChange={(e) => setProfile({ ...profile, maxPostsPerDay: Number(e.target.value) || 8 })}
                          className="mt-1 w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600">Brand Tone Rules</label>
                      <input
                        type="text"
                        value={profile.brandToneRules}
                        onChange={(e) => setProfile({ ...profile, brandToneRules: e.target.value })}
                        placeholder="e.g., Always cite verified product features; avoid excessive exclamation marks."
                        className="mt-1 w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                      />
                    </div>
                  </div>
                </form>

                {/* Brand Documents & Marketing Materials */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <Upload className="h-4 w-4 text-blue-700" />
                    <h3 className="text-sm font-bold text-slate-900">
                      Brand Assets, Product Catalogs & Marketing Materials ({profile.brandDocuments.length})
                    </h3>
                  </div>

                  <form onSubmit={handleAddDocument} className="space-y-2.5">
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      <input
                        type="text"
                        required
                        value={docName}
                        onChange={(e) => setDocName(e.target.value)}
                        placeholder="Document / Asset Name"
                        className="rounded-lg border border-slate-300 px-3 py-2 text-xs"
                      />
                      <select
                        value={docCategory}
                        onChange={(e) => setDocCategory(e.target.value as BrandDocumentItem['category'])}
                        className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs"
                      >
                        <option value="brand_guide">Brand Guide</option>
                        <option value="product_catalog">Product Catalog</option>
                        <option value="marketing_material">Marketing Material</option>
                        <option value="logo">Logo Asset</option>
                        <option value="product_image">Product Image</option>
                        <option value="other">Other Reference</option>
                      </select>
                    </div>
                    <textarea
                      required
                      rows={2}
                      value={docSummary}
                      onChange={(e) => setDocSummary(e.target.value)}
                      placeholder="Key verified facts from this document that the AI should reference..."
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="url"
                        value={docUrl}
                        onChange={(e) => setDocUrl(e.target.value)}
                        placeholder="Optional reference URL or Media Library link"
                        className="flex-1 min-w-[200px] rounded-lg border border-slate-300 px-3 py-2 text-xs"
                      />
                      <button
                        type="submit"
                        disabled={addingDoc}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        {addingDoc ? 'Adding...' : 'Add Material'}
                      </button>
                    </div>
                  </form>

                  {profile.brandDocuments.length > 0 && (
                    <div className="divide-y divide-slate-100 border-t border-slate-100 pt-2">
                      {profile.brandDocuments.map((doc) => (
                        <div key={doc.id} className="flex items-start justify-between gap-2 py-2.5">
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900">
                              {doc.name}{' '}
                              <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                                {doc.category.replace(/_/g, ' ')}
                              </span>
                            </p>
                            <p className="mt-0.5 text-[11px] text-slate-600">{doc.summary}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => void handleDeleteDocument(doc.id)}
                            aria-label="Remove document"
                            className="rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right: AI Brand Analysis Output (Verified vs Assumptions) */}
              <div className="xl:col-span-6 space-y-5">
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Run AI Brand Analysis</h3>
                      <p className="text-[11px] text-slate-500">
                        Synthesizes Brand Profile, permitted connected social accounts, and uploaded brand documents.
                      </p>
                    </div>
                    <span className="rounded bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                      10 AI Credits
                    </span>
                  </div>
                  <textarea
                    rows={2}
                    value={additionalNotes}
                    onChange={(e) => setAdditionalNotes(e.target.value)}
                    placeholder="Optional campaign focus or seasonal context for this analysis..."
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                  />
                  <button
                    type="button"
                    disabled={runningBrandAnalysis}
                    onClick={() => void handleRunBrandAnalysis()}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
                  >
                    <Sparkles className="h-4 w-4" />
                    {runningBrandAnalysis ? 'Analyzing Brand Intelligence...' : 'Run Brand Intelligence Analysis'}
                  </button>
                </div>

                {!latestAnalysis ? (
                  <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
                    <Brain className="mx-auto h-8 w-8 text-slate-300" />
                    <p className="mt-2 text-sm font-semibold text-slate-800">No Brand Analysis Yet</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Run Brand Intelligence Analysis to generate verified facts, strategic assumptions, voice rules, and content themes.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-slate-900">Latest Brand Intelligence Report</h4>
                      <span className="text-[11px] text-slate-500">
                        {new Date(latestAnalysis.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed text-slate-700">{latestAnalysis.brandSummary}</p>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-3">
                        <p className="text-[11px] font-bold uppercase text-emerald-900">Verified Brand Facts</p>
                        <ul className="mt-1.5 list-disc pl-4 text-xs text-emerald-950 space-y-1">
                          {latestAnalysis.verifiedFacts.map((f, i) => (
                            <li key={i}>{f}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3">
                        <p className="text-[11px] font-bold uppercase text-amber-900">AI Strategic Assumptions</p>
                        <ul className="mt-1.5 list-disc pl-4 text-xs text-amber-950 space-y-1">
                          {latestAnalysis.assumptions.map((a, i) => (
                            <li key={i}>{a}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-bold text-slate-900">Core Content Themes</p>
                      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {latestAnalysis.contentThemes.map((t, i) => (
                          <div key={i} className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-slate-900">{t.theme}</span>
                              <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-blue-800">
                                {t.priority}
                              </span>
                            </div>
                            <p className="mt-1 text-[11px] text-slate-600">{t.rationale}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-bold text-slate-900">Voice & Guardrail Guidelines</p>
                      <ul className="mt-1 list-disc pl-4 text-xs text-slate-700 space-y-0.5">
                        {latestAnalysis.voiceGuidelines.map((v, i) => (
                          <li key={i}>{v}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: AUDIENCE ANALYSIS */}
          {activeTab === 'audience' && (
            <div className="space-y-5">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[240px]">
                  <label className="block text-[11px] font-semibold text-slate-700">
                    Focus Market or Segment (Optional)
                  </label>
                  <input
                    type="text"
                    value={focusMarket}
                    onChange={(e) => setFocusMarket(e.target.value)}
                    placeholder="e.g., Mid-market SaaS buyers in North America & Europe"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                  />
                </div>
                <button
                  type="button"
                  disabled={runningAudience}
                  onClick={() => void handleRunAudience()}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
                >
                  <Users className="h-4 w-4" />
                  {runningAudience ? 'Analyzing Audience...' : 'Run Audience Analysis (8 cr)'}
                </button>
              </div>

              {audienceResult && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-950">
                    <strong>Evidence Basis:</strong> {audienceResult.evidenceStatus}
                  </div>
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    {audienceResult.segments.map((seg, i) => (
                      <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-sm font-bold text-slate-900">{seg.name}</h4>
                          <span
                            className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                              seg.isAssumption ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {seg.isAssumption ? 'Assumption' : 'Verified'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600">{seg.demographicsAndRole}</p>
                        <div className="text-xs">
                          <p className="font-bold text-slate-800">Pain Points</p>
                          <ul className="mt-1 list-disc pl-4 text-slate-600 space-y-0.5">
                            {seg.corePainPoints.map((p, idx) => (
                              <li key={idx}>{p}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="text-xs">
                          <p className="font-bold text-slate-800">Content Angles</p>
                          <ul className="mt-1 list-disc pl-4 text-slate-600 space-y-0.5">
                            {seg.contentAngles.map((a, idx) => (
                              <li key={idx}>{a}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-xs">
                      <p className="font-bold text-emerald-900">Messaging Do</p>
                      <ul className="mt-1.5 list-disc pl-4 text-emerald-950 space-y-1">
                        {audienceResult.messagingDo.map((d, i) => (
                          <li key={i}>{d}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-4 text-xs">
                      <p className="font-bold text-rose-900">Messaging Avoid</p>
                      <ul className="mt-1.5 list-disc pl-4 text-rose-950 space-y-1">
                        {audienceResult.messagingDont.map((d, i) => (
                          <li key={i}>{d}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: 30-DAY CONTENT STRATEGY */}
          {activeTab === 'strategy' && (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
              <form
                onSubmit={handleGenerateStrategy}
                className="xl:col-span-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-slate-900">Build 30-Day Strategy</h3>
                  <span className="rounded bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                    15 AI Credits
                  </span>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700">Strategy Title</label>
                  <input
                    type="text"
                    value={strategyTitle}
                    onChange={(e) => setStrategyTitle(e.target.value)}
                    placeholder="e.g., Q4 Enterprise Authority Plan"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700">Primary Business Goals *</label>
                  <textarea
                    required
                    rows={4}
                    value={strategyGoals}
                    onChange={(e) => setStrategyGoals(e.target.value)}
                    placeholder="Define your 30-day awareness, engagement, or lead objectives..."
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-slate-700 mb-1.5">Active Channels</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {ALL_PLATFORM_KEYS.map((p) => {
                      const active = strategyPlatforms.includes(p);
                      return (
                        <label
                          key={p}
                          className={`flex items-center gap-1.5 rounded border px-2 py-1.5 text-xs cursor-pointer ${
                            active ? 'border-blue-600 bg-blue-50 font-semibold text-blue-900' : 'border-slate-200'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={active}
                            onChange={(e) =>
                              setStrategyPlatforms((prev) =>
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
                  disabled={generatingStrategy || !strategyGoals.trim() || strategyPlatforms.length === 0}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
                >
                  <Compass className="h-4 w-4" />
                  {generatingStrategy ? 'Synthesizing Strategy...' : 'Generate 30-Day Strategy'}
                </button>
              </form>

              <div className="xl:col-span-8 space-y-4">
                {!latestStrategy ? (
                  <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
                    <Compass className="mx-auto h-8 w-8 text-slate-300" />
                    <p className="mt-2 text-sm font-semibold text-slate-800">No Content Strategy Generated Yet</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Generate a tailored 30-day blueprint with content pillars, weekly cadence, and measurable KPIs.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-base font-bold text-slate-900">{latestStrategy.title}</h3>
                      <span className="text-[11px] text-slate-500">
                        {new Date(latestStrategy.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed text-slate-700">{latestStrategy.executiveSummary}</p>
                    {latestStrategy.evidenceNote && (
                      <p className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-[11px] text-blue-900">
                        <strong>Evidence Note:</strong> {latestStrategy.evidenceNote}
                      </p>
                    )}

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      {latestStrategy.pillars.map((pillar, i) => (
                        <div key={i} className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900">{pillar.name}</span>
                            <span className="rounded bg-blue-700 px-2 py-0.5 text-[10px] font-bold text-white">
                              {pillar.sharePercent}%
                            </span>
                          </div>
                          <p className="mt-1 text-slate-600">{pillar.objective}</p>
                          <ul className="mt-2 list-disc pl-4 text-[11px] text-slate-700 space-y-0.5">
                            {pillar.sampleHooks.map((h, idx) => (
                              <li key={idx}>{h}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>

                    <div className="overflow-x-auto rounded-lg border border-slate-200">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-[11px] font-semibold text-slate-600">
                          <tr>
                            <th className="px-3 py-2">Day</th>
                            <th className="px-3 py-2">Platform</th>
                            <th className="px-3 py-2">Format</th>
                            <th className="px-3 py-2">Content Focus</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {latestStrategy.weeklyCadence.map((row, idx) => (
                            <tr key={idx}>
                              <td className="px-3 py-2 font-semibold text-slate-900">{row.day}</td>
                              <td className="px-3 py-2 uppercase text-[11px] font-bold text-blue-700">{row.platform}</td>
                              <td className="px-3 py-2 text-slate-700">{row.format}</td>
                              <td className="px-3 py-2 text-slate-600">{row.focus}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div>
                      <p className="text-xs font-bold text-slate-900">Target KPIs</p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {latestStrategy.kpis.map((k, idx) => (
                          <span key={idx} className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700">
                            {k}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: PERFORMANCE RECOMMENDATIONS */}
          {activeTab === 'performance' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Evidence-Based Performance Recommendations</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Analyzes real synced analytics snapshots if available; explicitly labels hypotheses when live platform analytics are not yet synced.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={runningPerf}
                  onClick={() => void handleRunPerf()}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
                >
                  <TrendingUp className="h-4 w-4" />
                  {runningPerf ? 'Evaluating Metrics...' : 'Generate Recommendations (6 cr)'}
                </button>
              </div>

              {perfResult && (
                <div className="space-y-4">
                  <div
                    className={`rounded-xl border px-4 py-3 text-xs ${
                      perfResult.hasLiveData
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                        : 'border-amber-200 bg-amber-50 text-amber-900'
                    }`}
                  >
                    <strong>Data Basis ({perfResult.hasLiveData ? 'Live Platform Metrics' : 'No Live Analytics Yet'}):</strong>{' '}
                    {perfResult.dataBasisSummary}
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {perfResult.actionableRecommendations.map((rec, i) => (
                      <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-xs font-bold text-slate-900">{rec.title}</h4>
                          <span
                            className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                              rec.evidenceType === 'observed_metric'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {rec.evidenceType === 'observed_metric' ? 'Observed Metric' : 'Best-Practice Hypothesis'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600">{rec.rationale}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
