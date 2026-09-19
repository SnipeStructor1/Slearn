import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { Navbar } from '@/components/Navbar';
import { AuthModal } from '@/components/AuthModal';
import { Landing } from '@/pages/Landing';
import { Dashboard } from '@/pages/Dashboard';
import { Explore } from '@/pages/Explore';
import { CreateSet } from '@/pages/CreateSet';
import { StudySetView } from '@/pages/StudySetView';
import { Profile } from '@/pages/Profile';

type Page = 'home' | 'dashboard' | 'explore' | 'create' | 'study' | 'profile';

function AppContent() {
  const { user, loading } = useAuth();
  const [page, setPage] = useState<Page>('home');
  const [authOpen, setAuthOpen] = useState(false);
  const [currentSetId, setCurrentSetId] = useState<string | null>(null);

  // Redirect to dashboard when user signs in
  useEffect(() => {
    if (user && page === 'home') {
      setPage('dashboard');
    }
    if (!user && (page === 'dashboard' || page === 'create' || page === 'profile')) {
      setPage('home');
    }
  }, [user, page]);

  const handleNavigate = (target: Page) => {
    if ((target === 'dashboard' || target === 'create' || target === 'profile' || target === 'study') && !user) {
      setAuthOpen(true);
      return;
    }
    setPage(target);
  };

  const handleOpenSet = (setId: string) => {
    setCurrentSetId(setId);
    setPage('study');
  };

  const handleCreated = (setId: string) => {
    setCurrentSetId(setId);
    setPage('study');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar
        currentPage={page}
        onNavigate={handleNavigate}
        onSignIn={() => setAuthOpen(true)}
      />

      <main className="animate-fade-in">
        {page === 'home' && (
          <Landing
            onGetStarted={() => setAuthOpen(true)}
            onExplore={() => setPage('explore')}
          />
        )}

        {page === 'dashboard' && user && (
          <Dashboard
            onNavigate={(p) => handleNavigate(p as Page)}
            onOpenSet={handleOpenSet}
          />
        )}

        {page === 'explore' && (
          <Explore onOpenSet={handleOpenSet} />
        )}

        {page === 'create' && user && (
          <CreateSet
            onCreated={handleCreated}
            onNavigate={() => setPage('dashboard')}
          />
        )}

        {page === 'study' && currentSetId && (
          <StudySetView
            setId={currentSetId}
            onBack={() => { setCurrentSetId(null); setPage(user ? 'dashboard' : 'explore'); }}
          />
        )}

        {page === 'profile' && user && <Profile />}
      </main>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
