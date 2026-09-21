import { GraduationCap } from 'lucide-react';

export function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: { icon: 20, text: 'text-lg' },
    md: { icon: 24, text: 'text-xl' },
    lg: { icon: 32, text: 'text-2xl' },
  };
  const s = sizes[size];

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 p-1.5 shadow-lg shadow-cyan-500/20">
        <GraduationCap size={s.icon} className="text-white" />
      </div>
      <span className={`font-bold tracking-tight ${s.text}`}>
        <span className="text-white">S</span>
        <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">learn</span>
      </span>
    </div>
  );
}
