import { useEffect, useState } from 'react';
import { AlertTriangle, Check, Edit2, Flame, Globe2, Library, Loader2, Shield, Trash2, TrendingUp, X } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { userError } from '@/lib/error-text';

type Language = 'de' | 'en';

type Props = {
  onNavigate?: (page: 'admin' | 'workspace') => void;
};

export function Profile({ onNavigate }: Props) {
  const { user, profile, profileError, refreshProfile, isAdmin } = useAuth();
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [language, setLanguage] = useState<Language>(profile?.preferred_language || 'de');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    setDisplayName(profile?.display_name || '');
    setLanguage(profile?.preferred_language || 'de');
  }, [profile?.display_name, profile?.preferred_language]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setSaveError(null);
    const { error } = await supabase.from('profiles').update({
      display_name: displayName.trim(),
      preferred_language: language,
    }).eq('id', user.id);
    if (error) {
      setSaveError(userError(error, 'Deine Einstellungen konnten nicht gespeichert werden.'));
      setSaving(false);
      return;
    }
    await refreshProfile();
    setEditing(false);
    setSaving(false);
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'LÖSCHEN') return;
    setDeleting(true);
    setDeleteError(null);
    const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' });
    if (error) {
      setDeleteError('Das Konto konnte nicht gelöscht werden. Bitte versuche es später erneut.');
      setDeleting(false);
      return;
    }
    await supabase.auth.signOut();
    window.location.reload();
  };

  if (!user) return null;

  const stats = [
    { label: 'Lernserie', value: profile?.study_streak || 0, suffix: 'Tage', icon: Flame, color: 'from-orange-400 to-red-500' },
    { label: 'Gelernte Karten', value: profile?.total_cards_learned || 0, suffix: '', icon: TrendingUp, color: 'from-emerald-400 to-teal-500' },
    { label: 'Mitglied seit', value: new Date(profile?.created_at || user.created_at).toLocaleDateString('de-DE', { month: 'short', year: 'numeric' }), suffix: '', icon: Library, color: 'from-cyan-400 to-blue-500' },
  ];

  return (
    <div className="relative mx-auto max-w-5xl animate-fade-in overflow-hidden px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-cyan-500/10 to-blue-600/10 p-6 sm:p-8">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 text-3xl font-bold text-white shadow-lg shadow-cyan-500/20">
            {(profile?.display_name || user.email || '?').charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 text-center sm:text-left">
            {editing ? (
              <div className="flex flex-wrap items-center gap-2">
                <input type="text" value={displayName} onChange={(event) => setDisplayName(event.target.value)} className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-lg font-semibold text-white outline-none focus:border-cyan-400/50" aria-label="Anzeigename" />
                <button onClick={() => void handleSave()} disabled={saving} className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50" aria-label="Speichern"><Check size={18} /></button>
                <button onClick={() => { setEditing(false); setDisplayName(profile?.display_name || ''); setLanguage(profile?.preferred_language || 'de'); }} className="rounded-lg bg-white/5 p-2 text-gray-400 hover:bg-white/10" aria-label="Abbrechen"><X size={18} /></button>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 sm:justify-start">
                <h1 className="text-2xl font-bold text-white">{profile?.display_name || 'Lernende:r'}</h1>
                <button onClick={() => setEditing(true)} className="rounded-lg p-1.5 text-gray-400 hover:bg-white/5 hover:text-white" aria-label="Profil bearbeiten"><Edit2 size={16} /></button>
              </div>
            )}
            <p className="mt-1 text-sm text-gray-400">{user.email}</p>
            <p className="mt-3 max-w-xl text-sm leading-6 text-gray-400">Verwalte hier deinen Namen, deine Sprache und dein Konto. Deine Lerninhalte bleiben privat in deinem Slernavia-Lernraum.</p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map(({ label, value, suffix, icon: Icon, color }) => (
          <div key={label} className="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
            <div className={`inline-flex rounded-xl bg-gradient-to-br ${color} p-2.5 shadow-lg`}><Icon size={20} className="text-white" /></div>
            <div className="mt-3 flex items-baseline gap-1"><span className="text-2xl font-bold text-white">{value}</span>{suffix && <span className="text-sm text-gray-400">{suffix}</span>}</div>
            <p className="text-sm text-gray-400">{label}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-white/5 bg-white/[0.02] p-6">
        <div className="flex items-start gap-3">
          <Globe2 size={19} className="mt-0.5 text-cyan-300" />
          <div className="flex-1">
            <h2 className="text-base font-semibold text-white">Sprache & Konto</h2>
            <p className="mt-1 text-sm text-gray-400">Wähle die Sprache für deine persönlichen Einstellungen. Deutsch ist aktuell die Standardsprache von Slernavia.</p>
            <label className="mt-4 block max-w-xs text-sm text-gray-300" htmlFor="preferred-language">Bevorzugte Sprache</label>
            <select id="preferred-language" value={language} onChange={(event) => setLanguage(event.target.value as Language)} className="mt-2 w-full max-w-xs rounded-lg border border-white/10 bg-[#15151f] px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-400/50">
              <option value="de">Deutsch</option>
              <option value="en">English</option>
            </select>
            <button onClick={() => void handleSave()} disabled={saving} className="mt-4 flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-400 disabled:opacity-50">
              {saving && <Loader2 size={15} className="animate-spin" />} Einstellungen speichern
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-white/5 bg-white/[0.02] p-6">
        <h2 className="text-base font-semibold text-white">Kontoinformationen</h2>
        <div className="mt-4 space-y-3 text-sm">
          <div className="flex items-center justify-between gap-4"><span className="text-gray-400">E-Mail</span><span className="text-right text-white">{user.email}</span></div>
          <div className="flex items-center justify-between gap-4"><span className="text-gray-400">Zuletzt gelernt</span><span className="text-right text-white">{profile?.last_studied_date ? new Date(profile.last_studied_date).toLocaleDateString('de-DE') : 'Noch nicht'}</span></div>
          {isAdmin && onNavigate && <div className="flex items-center justify-between gap-4"><span className="flex items-center gap-2 text-gray-400"><Shield size={15} /> Admin-Zugang</span><button type="button" onClick={() => onNavigate('admin')} className="rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20">Bereich öffnen</button></div>}
        </div>
        {profileError && <p className="mt-4 rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">Profil konnte nicht geladen werden.</p>}
        {saveError && <p className="mt-4 rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">{saveError}</p>}
      </div>

      <div className="mt-6 rounded-2xl border border-red-400/15 bg-red-500/[0.04] p-6">
        <div className="flex items-start gap-3">
          <Trash2 size={19} className="mt-0.5 text-red-300" />
          <div className="flex-1">
            <h2 className="text-base font-semibold text-white">Konto löschen</h2>
            <p className="mt-1 text-sm leading-6 text-gray-400">Dein Konto und deine persönlichen Lerninhalte werden dauerhaft gelöscht. Dieser Schritt kann nicht rückgängig gemacht werden.</p>
            <button onClick={() => { setDeleteOpen(true); setDeleteError(null); }} className="mt-4 rounded-lg border border-red-400/30 px-4 py-2 text-sm font-semibold text-red-200 hover:bg-red-500/10">Konto dauerhaft löschen</button>
          </div>
        </div>
      </div>

      {deleteOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="presentation">
        <div className="w-full max-w-md rounded-2xl border border-red-400/20 bg-[#12121a] p-6 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="delete-account-title">
          <div className="flex items-start gap-3"><AlertTriangle size={22} className="mt-0.5 text-red-300" /><div><h2 id="delete-account-title" className="text-lg font-semibold text-white">Konto wirklich löschen?</h2><p className="mt-2 text-sm leading-6 text-gray-400">Alle Lernsets, Notizen, Dateien und Fortschritte werden endgültig entfernt. Gib zur Bestätigung <strong className="text-red-200">LÖSCHEN</strong> ein.</p></div></div>
          <input value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} placeholder="LÖSCHEN" className="mt-5 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-red-400/50" autoComplete="off" />
          {deleteError && <p className="mt-3 text-sm text-red-300">{deleteError}</p>}
          <div className="mt-5 flex justify-end gap-2"><button onClick={() => { setDeleteOpen(false); setDeleteConfirmation(''); }} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-gray-300 hover:bg-white/5">Abbrechen</button><button onClick={() => void handleDeleteAccount()} disabled={deleting || deleteConfirmation !== 'LÖSCHEN'} className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50">{deleting && <Loader2 size={15} className="animate-spin" />} Endgültig löschen</button></div>
        </div>
      </div>}
    </div>
  );
}
