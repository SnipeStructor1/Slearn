import { useState } from 'react';
import { Compass, LayoutDashboard, Plus, User as UserIcon, Menu, X, LogOut, Shield, Brain } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { Logo } from './Logo';

type Page = 'home' | 'workspace' | 'dashboard' | 'explore' | 'create' | 'study' | 'profile' | 'admin';

type Props = {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  onSignIn: () => void;
};

export function Navbar({ currentPage, onNavigate, onSignIn }: Props) {
  const { user, profile, signOut, isAdmin } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems: { key: Page; label: string; icon: typeof Compass }[] = [
    { key: 'workspace', label: 'Workspace', icon: Brain },
    { key: 'explore', label: 'Explore', icon: Compass },
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'create', label: 'Create', icon: Plus },
    ...(user && isAdmin ? [{ key: 'admin', label: 'Admin', icon: Shield }] as { key: Page; label: string; icon: typeof Compass }[] : []),
  ];

  const handleNav = (page: Page) => {
    onNavigate(page);
    setMobileOpen(false);
  };

  return (
    <nav className="sticky top-0 z-40 border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <button onClick={() => handleNav(user ? 'dashboard' : 'home')} className="flex-shrink-0">
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
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleNav('profile')}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                  currentPage === 'profile' ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 text-xs font-bold text-white">
                  {(profile?.display_name || user.email || '?').charAt(0).toUpperCase()}
                </div>
                <span className="max-w-24 truncate">{profile?.display_name || 'Profile'}</span>
              </button>
              <button
                onClick={() => signOut()}
                className="rounded-lg p-2 text-gray-400 hover:bg-white/5 hover:text-white transition-all"
                title="Sign out"
              >
                <LogOut size={18} />
              </button>
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
                  Profile
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
