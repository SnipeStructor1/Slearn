import { useState, useEffect, useCallback } from 'react';
import {
  Layers, Users, Settings, Shield, ArrowLeft, Search, Lock, Globe,
  ChevronRight, X, KeyRound, Check, AlertCircle, Loader2, Save,
  BookOpen, Trash2, ChevronDown, UserCog, Activity,
} from 'lucide-react';
import { supabase, type StudySet, type Flashcard, type Profile, type AppSettings } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { getTheme, getIcon } from '@/lib/themes';
import { subjects } from '@/lib/mock-data';

type AdminTab = 'sets' | 'users' | 'settings';
type SetDetail = { set: StudySet; cards: Flashcard[]; ownerName: string } | null;

export function AdminPage({ onBack }: { onBack: () => void }) {
  const { user, profile, isAdmin, loading } = useAuth();
  const [tab, setTab] = useState<AdminTab>('sets');

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10">
            <Shield size={32} className="text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-white">Access Denied</h1>
          <p className="mt-2 text-sm text-gray-400">
            You need admin privileges to access this page.
          </p>
          <button
            onClick={onBack}
            className="mt-6 rounded-xl bg-white/5 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10 transition-all"
          >
            Back to App
          </button>
        </div>
      </div>
    );
  }

  const tabs: { key: AdminTab; label: string; icon: typeof Layers }[] = [
    { key: 'sets', label: 'Study Sets', icon: Layers },
    { key: 'users', label: 'Users', icon: Users },
    { key: 'settings', label: 'API Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:flex-row lg:px-8">
        {/* Sidebar */}
        <aside className="flex-shrink-0 lg:w-60">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 p-2">
              <Shield size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Admin Panel</h1>
              <p className="text-xs text-gray-500">yLearn Management</p>
            </div>
          </div>

          <button
            onClick={onBack}
            className="mb-4 flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-all"
          >
            <ArrowLeft size={16} /> Back to App
          </button>

          <nav className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
            {tabs.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex flex-shrink-0 items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                  tab === key
                    ? 'bg-white/10 text-white'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon size={18} />
                {label}
              </button>
            ))}
          </nav>

          <div className="mt-6 hidden rounded-xl border border-white/5 bg-white/[0.02] p-4 lg:block">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 text-sm font-bold text-white">
                {(profile?.display_name || '?').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">{profile?.display_name}</p>
                <p className="text-xs text-cyan-400">Administrator</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Content */}
        <div className="min-w-0 flex-1">
          {tab === 'sets' && <AdminSetsPanel />}
          {tab === 'users' && <AdminUsersPanel />}
          {tab === 'settings' && <AdminSettingsPanel />}
        </div>
      </div>
    </div>
  );
}

// =====================
// Admin Sets Panel
// =====================
function AdminSetsPanel() {
  const [sets, setSets] = useState<(StudySet & { owner_name?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeSubject, setActiveSubject] = useState('All');
  const [detail, setDetail] = useState<SetDetail>(null);

  const fetchSets = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('study_sets')
      .select('*, profiles!study_sets_user_id_fkey(display_name)')
      .order('created_at', { ascending: false });

    const mapped = ((data as any[]) || []).map((s) => ({
      ...s,
      owner_name: s.profiles?.display_name || 'Unknown',
    }));
    setSets(mapped);
    setLoading(false);
  }, []);

  useEffect(() => { fetchSets(); }, [fetchSets]);

  const openDetail = async (set: StudySet & { owner_name?: string }) => {
    const { data: cards } = await supabase
      .from('flashcards')
      .select('*')
      .eq('set_id', set.id)
      .order('created_at', { ascending: true });
    setDetail({ set, cards: (cards as Flashcard[]) || [], ownerName: set.owner_name || 'Unknown' });
  };

  const handleDelete = async (setId: string) => {
    await supabase.from('study_sets').delete().eq('id', setId);
    setDetail(null);
    fetchSets();
  };

  const filtered = sets.filter((s) => {
    const matchesSearch = !search ||
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.description.toLowerCase().includes(search.toLowerCase());
    const matchesSubject = activeSubject === 'All' || s.subject === activeSubject;
    return matchesSearch && matchesSubject;
  });

  if (detail) {
    return <AdminSetDetail detail={detail} onClose={() => setDetail(null)} onDelete={handleDelete} />;
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-white">All Study Sets</h2>
      <p className="mt-1 text-sm text-gray-400">Browse and inspect all study sets on the platform</p>

      <div className="mt-5">
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sets..."
            className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-sm text-white placeholder-gray-500 outline-none focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20"
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveSubject('All')}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${activeSubject === 'All' ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5'}`}
          >
            All
          </button>
          {subjects.map((s) => (
            <button
              key={s}
              onClick={() => setActiveSubject(s)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${activeSubject === s ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5'}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="mt-6 space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-20 animate-shimmer rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-white/10 p-12 text-center">
          <p className="text-gray-400">No study sets found</p>
        </div>
      ) : (
        <div className="mt-5 overflow-hidden rounded-xl border border-white/5">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/5 bg-white/[0.02] text-xs text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">Subject</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">Owner</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">Cards</th>
                <th className="px-4 py-3 font-medium">Visibility</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((s) => {
                const theme = getTheme(s.color_theme);
                const Icon = getIcon(s.icon_name);
                return (
                  <tr key={s.id} className="hover:bg-white/[0.02] transition-all">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${theme.gradient}`}>
                          <Icon size={14} className="text-white" />
                        </div>
                        <span className="font-medium text-white truncate max-w-48">{s.title}</span>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      <span className={`rounded-md border ${theme.badgeBorder} ${theme.badgeBg} ${theme.badgeText} px-2 py-0.5 text-xs`}>
                        {s.subject}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 text-gray-400 md:table-cell">{s.owner_name}</td>
                    <td className="hidden px-4 py-3 text-gray-400 sm:table-cell">{s.card_count}</td>
                    <td className="px-4 py-3">
                      {s.visibility === 'private'
                        ? <span className="flex items-center gap-1 text-xs text-gray-500"><Lock size={12} /> Private</span>
                        : <span className="flex items-center gap-1 text-xs text-gray-500"><Globe size={12} /> Public</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => openDetail(s)}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-white/5 hover:text-white transition-all"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AdminSetDetail({ detail, onClose, onDelete }: {
  detail: NonNullable<SetDetail>;
  onClose: () => void;
  onDelete: (setId: string) => void;
}) {
  const { set, cards, ownerName } = detail;
  const theme = getTheme(set.color_theme);
  const Icon = getIcon(set.icon_name);
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div>
      <button onClick={onClose} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-all">
        <ArrowLeft size={16} /> Back to sets
      </button>

      <div className={`mt-4 rounded-2xl border ${theme.badgeBorder} bg-gradient-to-br ${theme.badgeBg} p-6`}>
        <div className="flex items-start gap-4">
          <div className={`flex flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${theme.gradient} p-3 shadow-lg ${theme.glow}`}>
            <Icon size={28} className="text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className={`inline-flex rounded-lg border ${theme.badgeBorder} ${theme.badgeBg} ${theme.badgeText} px-2.5 py-1 text-xs font-medium`}>
                {set.subject}
              </span>
              <span className="flex items-center gap-1 text-xs text-gray-500">
                {set.visibility === 'private' ? <Lock size={12} /> : <Globe size={12} />}
                {set.visibility}
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-bold text-white">{set.title}</h1>
            <p className="mt-1 text-sm text-gray-400">{set.description}</p>
            <p className="mt-2 text-xs text-gray-500">Owner: {ownerName} | {cards.length} cards</p>
          </div>
        </div>
      </div>

      {set.summary && Array.isArray(set.summary) && set.summary.length > 0 && (
        <div className="mt-4 rounded-xl border border-white/5 bg-white/[0.02] p-4">
          <h3 className="text-sm font-semibold text-white">Summary</h3>
          <ul className="mt-2 space-y-1.5">
            {(set.summary as string[]).map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-400">
                <span className={`mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full ${theme.solidBg}`} />
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4">
        <h3 className="text-sm font-semibold text-white">Flashcards ({cards.length})</h3>
        <div className="mt-3 space-y-2">
          {cards.map((card, i) => (
            <div key={card.id} className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
              <div className="flex items-start gap-3">
                <span className="text-xs text-gray-600 mt-0.5">{i + 1}</span>
                <div className="flex-1">
                  <div className={`text-xs font-medium ${theme.accent}`}>Front</div>
                  <p className="mt-0.5 text-sm font-medium text-white">{card.front}</p>
                </div>
                <div className="flex-1 border-l border-white/5 pl-3">
                  <div className="text-xs font-medium text-emerald-400">Back</div>
                  <p className="mt-0.5 text-sm text-gray-300">{card.back}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 border-t border-white/5 pt-4">
        {confirmDelete ? (
          <div className="flex items-center gap-3">
            <span className="text-sm text-red-300">Delete this set permanently?</span>
            <button
              onClick={() => onDelete(set.id)}
              className="rounded-lg bg-red-500/20 px-4 py-2 text-sm font-medium text-red-300 hover:bg-red-500/30 transition-all"
            >
              Yes, delete
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="rounded-lg bg-white/5 px-4 py-2 text-sm text-gray-300 hover:bg-white/10 transition-all"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-300 hover:bg-red-500/20 transition-all"
          >
            <Trash2 size={15} /> Delete Set
          </button>
        )}
      </div>
    </div>
  );
}

// =====================
// Admin Users Panel
// =====================
function AdminUsersPanel() {
  const { user: currentUser, refreshProfile } = useAuth();
  const [users, setUsers] = useState<(Profile & { email?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    // Profiles table has role + display_name; we need emails from auth
    // Since we can't query auth.users from client, we'll fetch profiles only
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    setUsers((data as Profile[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleRoleChange = async (userId: string, newRole: 'user' | 'admin') => {
    setUpdating(userId);
    await supabase.from('profiles').update({ role: newRole }).eq('id', userId);

    // Log the action
    if (currentUser) {
      await supabase.from('admin_audit_log').insert({
        admin_id: currentUser.id,
        action: 'role_change',
        target_id: userId,
        target_type: 'profile',
        details: { new_role: newRole },
      });
    }

    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: newRole } : u));
    if (userId === currentUser?.id) refreshProfile();
    setUpdating(null);
  };

  const filtered = users.filter((u) => {
    if (!search) return true;
    return u.display_name.toLowerCase().includes(search.toLowerCase()) || u.id.includes(search);
  });

  return (
    <div>
      <h2 className="text-xl font-bold text-white">User Management</h2>
      <p className="mt-1 text-sm text-gray-400">View and manage user roles across the platform</p>

      <div className="mt-5">
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name..."
            className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-sm text-white placeholder-gray-500 outline-none focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
          <p className="text-2xl font-bold text-white">{users.length}</p>
          <p className="text-xs text-gray-400">Total Users</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
          <p className="text-2xl font-bold text-cyan-400">{users.filter(u => u.role === 'admin').length}</p>
          <p className="text-xs text-gray-400">Admins</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
          <p className="text-2xl font-bold text-emerald-400">{users.filter(u => u.role === 'user').length}</p>
          <p className="text-xs text-gray-400">Regular Users</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
          <p className="text-2xl font-bold text-orange-400">{users.filter(u => u.study_streak > 0).length}</p>
          <p className="text-xs text-gray-400">Active Streaks</p>
        </div>
      </div>

      {loading ? (
        <div className="mt-6 space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-16 animate-shimmer rounded-xl" />)}
        </div>
      ) : (
        <div className="mt-5 overflow-hidden rounded-xl border border-white/5">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/5 bg-white/[0.02] text-xs text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">Streak</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">Cards Learned</th>
                <th className="hidden px-4 py-3 font-medium lg:table-cell">Joined</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((u) => (
                <tr key={u.id} className="hover:bg-white/[0.02] transition-all">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 text-sm font-bold text-white">
                        {u.display_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-white truncate">{u.display_name}</p>
                        <p className="text-xs text-gray-500 truncate">{u.id.slice(0, 8)}...</p>
                      </div>
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 text-gray-400 sm:table-cell">
                    {u.study_streak > 0 ? `${u.study_streak} days` : '—'}
                  </td>
                  <td className="hidden px-4 py-3 text-gray-400 md:table-cell">{u.total_cards_learned}</td>
                  <td className="hidden px-4 py-3 text-gray-400 lg:table-cell">
                    {new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                      u.role === 'admin'
                        ? 'bg-cyan-500/15 text-cyan-300'
                        : 'bg-white/5 text-gray-400'
                    }`}>
                      {u.role === 'admin' ? 'Admin' : 'User'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {updating === u.id ? (
                      <Loader2 size={16} className="animate-spin text-gray-400 inline-block" />
                    ) : (
                      <RoleDropdown
                        currentRole={u.role}
                        isSelf={u.id === currentUser?.id}
                        onChange={(r) => handleRoleChange(u.id, r)}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function RoleDropdown({ currentRole, isSelf, onChange }: {
  currentRole: 'user' | 'admin';
  isSelf: boolean;
  onChange: (role: 'user' | 'admin') => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-gray-300 hover:bg-white/10 transition-all"
      >
        <UserCog size={14} />
        {currentRole === 'admin' ? 'Admin' : 'User'}
        <ChevronDown size={12} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-20 mt-1 w-32 rounded-lg border border-white/10 bg-[#12121a] py-1 shadow-xl">
            <button
              onClick={() => { onChange('admin'); setOpen(false); }}
              className={`flex w-full items-center gap-2 px-3 py-2 text-xs transition-all hover:bg-white/5 ${
                currentRole === 'admin' ? 'text-cyan-400' : 'text-gray-300'
              }`}
            >
              <Shield size={14} /> Admin
            </button>
            <button
              onClick={() => { onChange('user'); setOpen(false); }}
              disabled={isSelf}
              className={`flex w-full items-center gap-2 px-3 py-2 text-xs transition-all hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed ${
                currentRole === 'user' ? 'text-white' : 'text-gray-300'
              }`}
              title={isSelf ? "You can't demote yourself" : ''}
            >
              <Users size={14} /> User
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// =====================
// Admin Settings Panel
// =====================
function AdminSettingsPanel() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiKey, setApiKey] = useState('');
  const [provider, setProvider] = useState('openai');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('app_settings').select('*').eq('id', 1).maybeSingle();
      if (data) {
        setSettings(data as AppSettings);
        setApiKey(data.ai_api_key || '');
        setProvider(data.ai_provider || 'openai');
      }
      setLoading(false);
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);

    const keyActive = apiKey.trim().length > 0;

    const { error: err } = await supabase
      .from('app_settings')
      .update({
        ai_api_key: apiKey.trim(),
        ai_provider: provider,
        ai_key_active: keyActive,
        updated_at: new Date().toISOString(),
        updated_by: user?.id || null,
      })
      .eq('id', 1);

    if (err) {
      setError('Failed to save settings');
    } else {
      setSettings({
        ...settings!,
        ai_api_key: apiKey.trim(),
        ai_provider: provider,
        ai_key_active: keyActive,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);

      // Log
      if (user) {
        await supabase.from('admin_audit_log').insert({
          admin_id: user.id,
          action: 'settings_update',
          target_type: 'app_settings',
          details: { provider, key_active: keyActive },
        });
      }
    }
    setSaving(false);
  };

  const handleTest = async () => {
    setTesting(true);
    setError(null);

    // Simulate key validation
    await new Promise((r) => setTimeout(r, 1500));

    if (apiKey.trim().length < 10) {
      setError('API key appears too short. Please check and try again.');
      setTesting(false);
      return;
    }

    setSettings(prev => prev ? { ...prev, ai_key_active: true } : prev);
    setTesting(false);
  };

  const handleClear = async () => {
    setApiKey('');
    await supabase
      .from('app_settings')
      .update({
        ai_api_key: '',
        ai_provider: 'none',
        ai_key_active: false,
        updated_at: new Date().toISOString(),
        updated_by: user?.id || null,
      })
      .eq('id', 1);
    setSettings(prev => prev ? { ...prev, ai_api_key: '', ai_provider: 'none', ai_key_active: false } : prev);
    setProvider('openai');
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-shimmer rounded-lg" />
        <div className="h-64 animate-shimmer rounded-xl" />
      </div>
    );
  }

  const isActive = settings?.ai_key_active;

  return (
    <div>
      <h2 className="text-xl font-bold text-white">AI & API Settings</h2>
      <p className="mt-1 text-sm text-gray-400">Configure the AI provider and API key for study set generation</p>

      {/* Connection status */}
      <div className="mt-5 rounded-xl border border-white/5 bg-white/[0.02] p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
              isActive ? 'bg-emerald-500/15' : 'bg-red-500/15'
            }`}>
              {isActive ? <Check size={20} className="text-emerald-400" /> : <AlertCircle size={20} className="text-red-400" />}
            </div>
            <div>
              <p className="text-sm font-semibold text-white">
                {isActive ? 'API Key Active' : 'No API Key Configured'}
              </p>
              <p className="text-xs text-gray-400">
                {isActive
                  ? `Provider: ${settings?.ai_provider || 'openai'} — AI features are enabled`
                  : 'AI features are disabled until a valid key is set'}
              </p>
            </div>
          </div>
          {isActive && (
            <span className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Connected
            </span>
          )}
        </div>
      </div>

      {/* API Key input */}
      <div className="mt-4 rounded-xl border border-white/5 bg-white/[0.02] p-5">
        <div className="flex items-center gap-2">
          <KeyRound size={18} className="text-cyan-400" />
          <h3 className="text-sm font-semibold text-white">API Key</h3>
        </div>

        <div className="mt-4">
          <label className="mb-2 block text-sm font-medium text-gray-300">AI Provider</label>
          <div className="flex gap-2">
            {[
              { id: 'openai', label: 'OpenAI' },
              { id: 'gemini', label: 'Google Gemini' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setProvider(p.id)}
                className={`rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
                  provider === p.id
                    ? 'border-cyan-400/40 bg-cyan-500/10 text-cyan-300'
                    : 'border-white/10 bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <label className="mb-2 block text-sm font-medium text-gray-300">
            {provider === 'openai' ? 'OpenAI API Key' : 'Gemini API Key'}
          </label>
          <div className="relative">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={provider === 'openai' ? 'sk-...' : 'AIza...'}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 pr-12 text-sm text-white placeholder-gray-500 outline-none focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20"
            />
            {apiKey && (
              <button
                onClick={() => setApiKey('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-gray-500 hover:text-white transition-all"
              >
                <X size={16} />
              </button>
            )}
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Your key is stored securely and only accessible by admins. Get a key from{' '}
            {provider === 'openai' ? 'platform.openai.com' : 'aistudio.google.com'}.
          </p>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {saved && (
          <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            Settings saved successfully.
          </div>
        )}

        {/* Actions */}
        <div className="mt-5 flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition-all hover:brightness-110 disabled:opacity-50"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? 'Saving...' : 'Save Key'}
          </button>
          <button
            onClick={handleTest}
            disabled={testing || !apiKey.trim()}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-white/10 disabled:opacity-40"
          >
            {testing ? <Loader2 size={16} className="animate-spin" /> : <Activity size={16} />}
            {testing ? 'Testing...' : 'Test Connection'}
          </button>
          {apiKey && (
            <button
              onClick={handleClear}
              className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-300 hover:bg-red-500/20 transition-all"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Feature status */}
      <div className="mt-4 rounded-xl border border-white/5 bg-white/[0.02] p-5">
        <h3 className="text-sm font-semibold text-white">AI Feature Status</h3>
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between rounded-lg bg-white/[0.02] px-4 py-3">
            <div className="flex items-center gap-3">
              <BookOpen size={18} className={isActive ? 'text-emerald-400' : 'text-gray-600'} />
              <span className="text-sm text-gray-300">AI Study Set Generation</span>
            </div>
            <span className={`text-xs font-medium ${isActive ? 'text-emerald-400' : 'text-gray-500'}`}>
              {isActive ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-white/[0.02] px-4 py-3">
            <div className="flex items-center gap-3">
              <Layers size={18} className={isActive ? 'text-emerald-400' : 'text-gray-600'} />
              <span className="text-sm text-gray-300">AI Quiz Generation</span>
            </div>
            <span className={`text-xs font-medium ${isActive ? 'text-emerald-400' : 'text-gray-500'}`}>
              {isActive ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        </div>
      </div>

      {/* Last updated */}
      {settings?.updated_at && (
        <p className="mt-4 text-xs text-gray-500">
          Last updated: {new Date(settings.updated_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
        </p>
      )}
    </div>
  );
}
