import { useState } from 'react';
import { Plus, User as UserIcon, Menu, X, LogOut, Shield, Brain, ChevronDown, Settings2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { Logo } from './Logo';

type Page = 'home' | 'workspace' | 'create' | 'profile' | 'admin';

type Props = {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  onSignIn: () => void;
};

export function Navbar({ currentPage, onNavigate, onSignIn }: Props) {
  const { user, profile, signOut, isAdmin } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const navItems: { key: Page; label: string; icon: typeof Brain }[] = [
    { key: 'workspace', label: 'Workspace', icon: Brain },
    { key: 'create', label: 'Erstellen', icon: Plus },
    ...(user && isAdmin ? [{ key: 'admin', label: 'Admin', icon: Shield }] as { key: Page; label: string; icon: typeof Brain }[] : []),
  ];

  const handleNav = (page: Page) => {
    onNavigate(page);
    setMobileOpen(false);
    setProfileOpen(false);
  };

  return (
    <nav className="sticky top-0 z-40 border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <button onClick={() => handleNav(user ? 'workspace' : 'home')} className="flex-shrink-0">
          <Logo />
        </button>

        {/* Desktop nav */}
        <div className="hidden items-center gap-1 md:flex">
          {navItems.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => handleNav(key)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                currentPage === key
                  ? 'bg-white/10 text-white'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>

        {/* Right side */}
        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <div className="relative">
              <button onClick={() => setProfileOpen((open) => !open)} aria-expanded={profileOpen} className={`flex items-center gap-2 rounded-xl border px-2.5 py-1.5 text-sm transition-all ${profileOpen || currentPage === 'profile' ? 'border-cyan-400/30 bg-cyan-400/10 text-white' : 'border-white/10 bg-white/[0.03] text-gray-300 hover:border-white/20 hover:bg-white/[0.06]'}`}>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 text-xs font-bold text-white">{(profile?.display_name || user.email || '?').charAt(0).toUpperCase()}</div>
                <span className="max-w-28 truncate text-left"><span className="block text-[10px] uppercase tracking-wider text-gray-500">Dein Slearn</span><span className="block max-w-24 truncate font-semibold">{profile?.display_name || 'Profil'}</span></span>
                <ChevronDown size={15} className={`transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
              </button>
              {profileOpen && <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-white/10 bg-[#15151f] p-2 shadow-2xl shadow-black/40">
                <button onClick={() => handleNav('profile')} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-gray-200 hover:bg-white/10"><Settings2 size={16} className="text-cyan-300" /><span><b className="block">Profil & Fortschritt</b><small className="text-xs text-gray-500">Name, Lernserie und Konto</small></span></button>
                {isAdmin && <button onClick={() => handleNav('admin')} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-gray-200 hover:bg-white/10"><Shield size={16} className="text-violet-300" />Admin-Bereich</button>}
                <div className="my-1 border-t border-white/10" />
                <button onClick={() => { void signOut(); setProfileOpen(false); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-gray-300 hover:bg-red-500/10 hover:text-red-200"><LogOut size={16} />Abmelden</button>
              </div>}
            </div>
          ) : (
            <button
              onClick={onSignIn}
              className="rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition-all hover:shadow-cyan-500/30 hover:brightness-110"
            >
              Sign In
            </button>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="rounded-lg p-2 text-gray-400 hover:bg-white/5 hover:text-white md:hidden"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-white/5 bg-[#0a0a0f] md:hidden">
          <div className="space-y-1 px-4 py-3">
            {navItems.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => handleNav(key)}
                className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all ${
                  currentPage === key ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5'
                }`}
              >
                <Icon size={18} />
                {label}
              </button>
            ))}
            {user ? (
              <>
                <button
                  onClick={() => handleNav('profile')}
                  className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all ${
                    currentPage === 'profile' ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5'
                  }`}
                >
                  <UserIcon size={18} />
                  Profil & Fortschritt
                </button>
                <button
                  onClick={() => { signOut(); setMobileOpen(false); }}
                  className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-gray-400 hover:bg-white/5"
                >
                  <LogOut size={18} />
                  Sign Out
                </button>
              </>
            ) : (
              <button
                onClick={() => { onSignIn(); setMobileOpen(false); }}
                className="flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-3 text-sm font-semibold text-white"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
