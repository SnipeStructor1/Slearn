import { BookOpen, Lock, Globe, Trash2, Save, Check } from 'lucide-react';
import type { StudySet } from '@/lib/supabase';
import { getTheme, getIcon } from '@/lib/themes';

type Props = {
  set: StudySet & { owner_name?: string; is_saved?: boolean };
  onClick: () => void;
  onToggleVisibility?: (setId: string, current: 'public' | 'private') => void;
  onSave?: (setId: string) => void;
  onDelete?: (setId: string) => void;
  showOwner?: boolean;
};

export function SetCard({ set, onClick, onToggleVisibility, onSave, onDelete, showOwner }: Props) {
  const theme = getTheme(set.color_theme);
  const Icon = getIcon(set.icon_name);

  return (
    <div
      onClick={onClick}
      className="group cursor-pointer rounded-2xl border border-white/5 bg-white/[0.02] p-5 transition-all hover:border-white/10 hover:bg-white/[0.04] hover:shadow-xl"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className={`flex items-center justify-center rounded-lg bg-gradient-to-br ${theme.gradient} p-1.5 shadow-lg ${theme.glow}`}>
            <Icon size={16} className="text-white" />
          </div>
          <span className={`inline-flex rounded-lg border bg-gradient-to-br ${theme.badgeBg} ${theme.badgeBorder} ${theme.badgeText} px-2.5 py-1 text-xs font-medium`}>
            {set.subject}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {set.visibility === 'private' ? (
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <Lock size={12} /> Private
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <Globe size={12} /> Public
            </span>
          )}
        </div>
      </div>

      <h3 className="mt-3 text-base font-semibold leading-snug text-white line-clamp-2">
        {set.title}
      </h3>
      <p className="mt-1.5 text-sm text-gray-400 line-clamp-2">{set.description}</p>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <BookOpen size={14} />
            {set.card_count} cards
          </span>
          {showOwner && set.owner_name && (
            <span className="flex items-center gap-1">
              by {set.owner_name}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {onToggleVisibility && (
            <button
              onClick={() => onToggleVisibility(set.id, set.visibility)}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-white/5 hover:text-white transition-all"
              title={set.visibility === 'public' ? 'Make private' : 'Make public'}
            >
              {set.visibility === 'public' ? <Globe size={15} /> : <Lock size={15} />}
            </button>
          )}
          {onSave && (
            <button
              onClick={() => onSave(set.id)}
              className={`rounded-lg p-1.5 transition-all ${
                set.is_saved
                  ? 'text-emerald-400 hover:bg-emerald-500/10'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
              title={set.is_saved ? 'Saved' : 'Save set'}
            >
              {set.is_saved ? <Check size={15} /> : <Save size={15} />}
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(set.id)}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-all"
              title="Delete set"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
