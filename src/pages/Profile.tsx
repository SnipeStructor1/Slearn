import { useEffect, useState } from 'react';
import { Flame, TrendingUp, Library, BookOpen, Edit2, Check, X } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { userError } from '@/lib/error-text';

export function Profile({ onNavigate }: { onNavigate?: (page: 'admin') => void }) {
  const { user, profile, profileError, refreshProfile, isAdmin } = useAuth();
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    setDisplayName(profile?.display_name || '');
  }, [profile?.display_name]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setSaveError(null);
    const { error } = await supabase.from('profiles').update({ display_name: displayName.trim() }).eq('id', user.id);
    if (error) {
      setSaveError(userError(error, 'Dein Profil wollte sich gerade nicht speichern lassen.'));
      setSaving(false);
      return;
    }
    await refreshProfile();
    setEditing(false);
    setSaving(false);
  };

  if (!user) return null;

  const stats = [
    { label: 'Study Streak', value: profile?.study_streak || 0, suffix: 'days', icon: Flame, color: 'from-orange-400 to-red-500' },
    { label: 'Cards Learned', value: profile?.total_cards_learned || 0, suffix: '', icon: TrendingUp, color: 'from-emerald-400 to-teal-500' },
    { label: 'Member Since', value: new Date(profile?.created_at || user.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }), suffix: '', icon: Library, color: 'from-cyan-400 to-blue-500' },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Profile header */}
      <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 sm:p-8">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 text-3xl font-bold text-white shadow-lg shadow-cyan-500/20">
            {(profile?.display_name || user.email || '?').charAt(0).toUpperCase()}
          </div>

          <div className="flex-1 text-center sm:text-left">
            {editing ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-lg font-semibold text-white outline-none focus:border-cyan-400/50"
                />
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400 hover:bg-emerald-500/20 transition-all"
                >
                  <Check size={18} />
                </button>
                <button
                  onClick={() => { setEditing(false); setDisplayName(profile?.display_name || ''); }}
                  className="rounded-lg bg-white/5 p-2 text-gray-400 hover:bg-white/10 transition-all"
                >
                  <X size={18} />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 sm:justify-start">
                <h1 className="text-2xl font-bold text-white">{profile?.display_name || 'Lernende:r'}</h1>
                <button
                  onClick={() => { setEditing(true); setDisplayName(profile?.display_name || ''); }}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-white/5 hover:text-white transition-all"
                >
                  <Edit2 size={16} />
                </button>
              </div>
            )}
            <p className="mt-1 text-sm text-gray-400">{user.email}</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map(({ label, value, suffix, icon: Icon, color }) => (
          <div key={label} className="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
            <div className={`inline-flex rounded-xl bg-gradient-to-br ${color} p-2.5 shadow-lg`}>
              <Icon size={20} className="text-white" />
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-white">{value}</span>
                {suffix && <span className="text-sm text-gray-400">{suffix}</span>}
              </div>
              <p className="text-sm text-gray-400">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Account info */}
      <div className="mt-6 rounded-2xl border border-white/5 bg-white/[0.02] p-6">
        <h3 className="text-sm font-semibold text-white">Account Details</h3>
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">E-Mail</span>
            <span className="text-white">{user.email}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Konto-ID</span>
            <code className="max-w-[70%] break-all text-right text-xs text-gray-500">{user.id}</code>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Rolle</span>
            <code className={`text-xs font-semibold ${isAdmin ? 'text-cyan-300' : 'text-gray-500'}`}>
              {profile?.role || 'not loaded'}
            </code>
          </div>
          {profileError && (
            <p className="rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              Profile konnte nicht geladen werden: {profileError}
            </p>
          )}
          {saveError && <p className="rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">{saveError}</p>}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Zuletzt gelernt</span>
            <span className="text-white">
              {profile?.last_studied_date
                ? new Date(profile.last_studied_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : 'Noch nicht'}
            </span>
          </div>
          {isAdmin && onNavigate && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Admin-Zugang</span>
              <button
                type="button"
                onClick={() => onNavigate('admin')}
                className="rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-300 transition-all hover:bg-cyan-500/20"
              >
                Admin-Bereich öffnen
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
