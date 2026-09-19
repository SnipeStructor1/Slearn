import { X, Check } from 'lucide-react';
import { colorThemes, iconOptions, getTheme, getIcon } from '@/lib/themes';

type Props = {
  open: boolean;
  onClose: () => void;
  currentColor: string;
  currentIcon: string;
  onApply: (color: string, icon: string) => void;
};

export function CustomizePanel({ open, onClose, currentColor, currentIcon, onApply }: Props) {
  if (!open) return null;

  const theme = getTheme(currentColor);
  const CurrentIcon = getIcon(currentIcon);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg animate-scale-in rounded-2xl border border-white/10 bg-[#12121a] p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-gray-400 hover:bg-white/5 hover:text-white transition-all"
        >
          <X size={20} />
        </button>

        <h2 className="text-lg font-bold text-white">Customize Set</h2>
        <p className="mt-1 text-sm text-gray-400">Pick a color and icon to personalize your study set</p>

        {/* Preview */}
        <div className="mt-5 flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-4">
          <div className={`flex items-center justify-center rounded-xl bg-gradient-to-br ${theme.gradient} p-3 shadow-lg ${theme.glow}`}>
            <CurrentIcon size={24} className="text-white" />
          </div>
          <div>
            <span className={`inline-flex rounded-lg border bg-gradient-to-br ${theme.badgeBg} ${theme.badgeBorder} ${theme.badgeText} px-2.5 py-1 text-xs font-medium`}>
              Preview
            </span>
            <p className="mt-1.5 text-sm text-gray-400">This is how your set will look</p>
          </div>
        </div>

        {/* Color picker */}
        <div className="mt-5">
          <h3 className="text-sm font-semibold text-white">Color</h3>
          <div className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-10">
            {colorThemes.map((t) => (
              <button
                key={t.id}
                onClick={() => onApply(t.id, currentIcon)}
                className={`relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${t.gradient} transition-all hover:scale-110 ${
                  currentColor === t.id ? 'ring-2 ring-white ring-offset-2 ring-offset-[#12121a]' : ''
                }`}
                title={t.label}
              >
                {currentColor === t.id && <Check size={16} className="text-white" />}
              </button>
            ))}
          </div>
        </div>

        {/* Icon picker */}
        <div className="mt-5">
          <h3 className="text-sm font-semibold text-white">Icon</h3>
          <div className="mt-3 grid grid-cols-6 gap-2 sm:grid-cols-8">
            {iconOptions.map(({ name, Icon }) => (
              <button
                key={name}
                onClick={() => onApply(currentColor, name)}
                className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-all hover:scale-110 ${
                  currentIcon === name
                    ? `border-white/30 bg-gradient-to-br ${theme.gradient}`
                    : 'border-white/5 bg-white/[0.03]'
                }`}
                title={name}
              >
                <Icon size={18} className={currentIcon === name ? 'text-white' : 'text-gray-400'} />
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition-all hover:brightness-110"
        >
          <Check size={16} /> Done
        </button>
      </div>
    </div>
  );
}
