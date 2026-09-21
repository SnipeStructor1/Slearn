import { useEffect, useState } from 'react';
import { Search, Save, Check, Loader2 } from 'lucide-react';
import { supabase, type StudySet } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { SetCard } from '@/components/SetCard';
import { subjects } from '@/lib/mock-data';

type Props = {
  onOpenSet: (setId: string) => void;
};

export function Explore({ onOpenSet }: Props) {
  const { user } = useAuth();
  const [sets, setSets] = useState<(StudySet & { owner_name?: string; is_saved?: boolean })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeSubject, setActiveSubject] = useState('All');
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data: publicSets }, { data: saved }] = await Promise.all([
        supabase
          .from('study_sets')
          .select('*, profiles!study_sets_user_id_fkey(display_name)')
          .eq('visibility', 'public')
          .order('created_at', { ascending: false }),
        user
          ? supabase.from('saved_sets').select('set_id').eq('user_id', user.id)
          : Promise.resolve({ data: [] }),
      ]);

      const savedSetIds = new Set((saved || []).map((s: any) => s.set_id));
      setSavedIds(savedSetIds);

      const mapped = ((publicSets as any[]) || []).map((s) => ({
        ...s,
        owner_name: s.profiles?.display_name || 'Unknown',
        is_saved: savedSetIds.has(s.id),
      }));

      setSets(mapped);
      setLoading(false);
    })();
  }, [user]);

  const handleSave = async (setId: string) => {
    if (!user) return;
    setError(null);
    if (savedIds.has(setId)) {
      const { error: deleteError } = await supabase
        .from('saved_sets')
        .delete()
        .eq('set_id', setId)
        .eq('user_id', user.id);
      if (deleteError) {
        setError('Failed to remove saved set. Please try again.');
        return;
      }

      setSavedIds((prev) => {
        const next = new Set(prev);
        next.delete(setId);
        return next;
      });
      setSets((prev) => prev.map((s) => (s.id === setId ? { ...s, is_saved: false } : s)));
    } else {
      const { error: insertError } = await supabase
        .from('saved_sets')
        .insert({ set_id: setId, user_id: user.id });
      if (insertError) {
        setError('Failed to save study set. Please try again.');
        return;
      }

      setSavedIds((prev) => new Set(prev).add(setId));
      setSets((prev) => prev.map((s) => (s.id === setId ? { ...s, is_saved: true } : s)));
    }
  };

  const filtered = sets.filter((s) => {
    const matchesSearch =
      !search ||
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.description.toLowerCase().includes(search.toLowerCase()) ||
      s.subject.toLowerCase().includes(search.toLowerCase());
    const matchesSubject = activeSubject === 'All' || s.subject === activeSubject;
    return matchesSearch && matchesSubject;
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Explore Community Sets</h1>
        <p className="mt-1 text-sm text-gray-400">Browse and save study sets created by other students</p>
      </div>

      {/* Search bar */}
      <div className="mt-6">
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, subject, or keyword..."
            className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-sm text-white placeholder-gray-500 outline-none transition-all focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20"
          />
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Subject filter */}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={() => setActiveSubject('All')}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
            activeSubject === 'All'
              ? 'bg-white/10 text-white'
              : 'text-gray-400 hover:bg-white/5 hover:text-white'
          }`}
        >
          All
        </button>
        {subjects.map((subject) => (
          <button
            key={subject}
            onClick={() => setActiveSubject(subject)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
              activeSubject === subject
                ? 'bg-white/10 text-white'
                : 'text-gray-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            {subject}
          </button>
        ))}
      </div>

      {/* Results */}
      {loading ? (
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-40 animate-shimmer rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-white/10 p-12 text-center">
          <Search size={40} className="mx-auto text-gray-600" />
          <p className="mt-3 text-gray-400">No study sets found</p>
          <p className="text-sm text-gray-500">Try a different search or subject filter</p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((set) => (
            <SetCard
              key={set.id}
              set={set}
              onClick={() => onOpenSet(set.id)}
              onSave={user ? handleSave : undefined}
              showOwner
            />
          ))}
        </div>
      )}
    </div>
  );
}
