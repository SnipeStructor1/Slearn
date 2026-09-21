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
import { AdminPage } from '@/pages/AdminPage';
import { LearningWorkspace } from '@/pages/LearningWorkspace';

type Page = 'home' | 'workspace' | 'dashboard' | 'explore' | 'create' | 'study' | 'profile' | 'admin';

function AppContent() {
  const { user, isAdmin, loading } = useAuth();
  const [page, setPage] = useState<Page>('home');
  const [authOpen, setAuthOpen] = useState(false);
  const [currentSetId, setCurrentSetId] = useState<string | null>(null);

  // Redirect to dashboard when user signs in
  useEffect(() => {
    if (user && page === 'home') {
      setPage('workspace');
    }
    if (!user && (page === 'workspace' || page === 'dashboard' || page === 'create' || page === 'profile' || page === 'admin')) {
      setPage('home');
    }
    if (user && !isAdmin && page === 'admin') {
      setPage('dashboard');
    }
  }, [user, isAdmin, page]);

  const handleNavigate = (target: Page) => {
    if ((target === 'dashboard' || target === 'create' || target === 'profile' || target === 'study' || target === 'admin') && !user) {
      setAuthOpen(true);
      return;
    }
    if (target === 'admin' && !isAdmin) {
      setPage('dashboard');
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
            onGetStarted={() => {
              if (user) {
                handleNavigate('workspace');
              } else {
                setAuthOpen(true);
              }
            }}
            onExplore={() => setPage('explore')}
          />
        )}

        {page === 'dashboard' && user && (
          <Dashboard
            onNavigate={(p) => handleNavigate(p as Page)}
            onOpenSet={handleOpenSet}
          />
        )}

        {page === 'workspace' && user && (
          <LearningWorkspace onNavigate={(target) => handleNavigate(target)} />
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

        {page === 'profile' && user && <Profile onNavigate={handleNavigate} />}
        {page === 'admin' && user && isAdmin && <AdminPage onBack={() => handleNavigate('workspace')} />}
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
