import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { Navbar } from '@/components/Navbar';
import { AuthModal } from '@/components/AuthModal';
import { Landing } from '@/pages/Landing';
import { CreateSet } from '@/pages/CreateSet';
import { StudySetView } from '@/pages/StudySetView';
import { Profile } from '@/pages/Profile';
import { AdminPage } from '@/pages/AdminPage';
import { LearningWorkspace } from '@/pages/LearningWorkspace';

type Page = 'home' | 'workspace' | 'create' | 'profile' | 'admin';

function AppContent() {
  const { user, isAdmin, loading } = useAuth();
  const [page, setPage] = useState<Page>('home');
  const [authOpen, setAuthOpen] = useState(false);
  const [currentSetId, setCurrentSetId] = useState<string | null>(null);
  const [workspaceTab, setWorkspaceTab] = useState<'notes' | 'flashcards'>('notes');

  useEffect(() => {
    if (user && page === 'home') setPage('workspace');
    if (!user && (page === 'workspace' || page === 'create' || page === 'profile' || page === 'admin')) setPage('home');
    if (user && !isAdmin && page === 'admin') setPage('workspace');
  }, [user, isAdmin, page]);

  const handleNavigate = (target: Page) => {
    if ((target === 'create' || target === 'profile' || target === 'admin') && !user) {
      setAuthOpen(true);
      return;
    }
    if (target === 'admin' && !isAdmin) {
      setPage('workspace');
      return;
    }
    setPage(target);
  };

  const handleOpenSet = (setId: string) => {
    setCurrentSetId(setId);
    setWorkspaceTab('flashcards');
    setPage('workspace');
  };

  const handleCreated = (setId: string) => {
    setCurrentSetId(setId);
    setWorkspaceTab('flashcards');
    setPage('workspace');
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
              if (user) handleNavigate('workspace');
              else setAuthOpen(true);
            }}
          />
        )}

        {page === 'workspace' && user && (
          <LearningWorkspace
            initialTab={workspaceTab}
            initialSetId={currentSetId}
            onNavigate={(target) => handleNavigate(target as Page)}
            onOpenSet={handleOpenSet}
          />
        )}

        {page === 'create' && user && (
          <CreateSet onCreated={handleCreated} />
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
