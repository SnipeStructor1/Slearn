import { useEffect, useState } from 'react';
import { Flame, BookOpen, Library, TrendingUp, Plus, ArrowRight } from 'lucide-react';
import { supabase, type StudySet, type Profile } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { SetCard } from '@/components/SetCard';

type Props = {
  onNavigate: (page: 'create' | 'study' | 'explore') => void;
  onOpenSet: (setId: string) => void;
};

export function Dashboard({ onNavigate, onOpenSet }: Props) {
  const { user, profile, refreshProfile } = useAuth();
  const [mySets, setMySets] = useState<StudySet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: owned }] = await Promise.all([
        supabase.from('study_sets').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      ]);

      setMySets((owned as StudySet[]) || []);
      setLoading(false);
    })();
  }, [user]);

  const handleDelete = async (setId: string) => {
    setError(null);
    const { error: deleteError } = await supabase.from('study_sets').delete().eq('id', setId);
    if (deleteError) {
      setError('Failed to delete study set. Please try again.');
      return;
    }

    setMySets((prev) => prev.filter((s) => s.id !== setId));
  };

  const stats = [
    {
      label: 'Study Streak',
      value: `${profile?.study_streak || 0}`,
      suffix: 'days',
      icon: Flame,
      color: 'from-orange-400 to-red-500',
    },
    {
      label: 'Cards Learned',
      value: `${profile?.total_cards_learned || 0}`,
      suffix: '',
      icon: TrendingUp,
      color: 'from-emerald-400 to-teal-500',
    },
    {
      label: 'My Sets',
      value: `${mySets.length}`,
      suffix: '',
      icon: Library,
      color: 'from-cyan-400 to-blue-500',
    },
    {
      label: 'Private Workspace',
      value: 'On',
      suffix: '',
      icon: BookOpen,
      color: 'from-violet-400 to-purple-500',
    },
  ];

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 animate-shimmer rounded-2xl" />
          ))}
        </div>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-40 animate-shimmer rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Welcome back, {profile?.display_name || 'Student'}
          </h1>
          <p className="mt-1 text-sm text-gray-400">Track your progress and continue studying</p>
        </div>
        <button
          onClick={() => onNavigate('create')}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition-all hover:brightness-110"
        >
          <Plus size={18} />
          Create New Set
        </button>
      </div>

      {/* Stats */}
      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map(({ label, value, suffix, icon: Icon, color }) => (
          <div
            key={label}
            className="rounded-2xl border border-white/5 bg-white/[0.02] p-5"
          >
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

      {/* My Sets */}
      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">My Study Sets</h2>
          {mySets.length > 0 && (
            <button
              onClick={() => onNavigate('create')}
              className="flex items-center gap-1 text-sm text-cyan-400 hover:text-cyan-300"
            >
              Create new <ArrowRight size={14} />
            </button>
          )}
        </div>
        {error && (
          <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {mySets.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-white/[0.01] p-12 text-center">
            <Library size={40} className="mx-auto text-gray-600" />
            <p className="mt-3 text-gray-400">No study sets yet</p>
            <p className="text-sm text-gray-500">Create your first AI-powered study set to get started</p>
            <button
              onClick={() => onNavigate('create')}
              className="mt-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:brightness-110"
            >
              Create Your First Set
            </button>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {mySets.map((set) => (
              <SetCard
                key={set.id}
                set={set}
                onClick={() => onOpenSet(set.id)}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </section>

    </div>
  );
}
