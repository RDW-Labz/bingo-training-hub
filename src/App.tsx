import { useState } from 'react';
import { AuthProvider, useAuth } from '@/lib/auth';
import { Login } from '@/components/Login';
import { EmployeeTraining } from '@/components/employee/EmployeeTraining';
import { LessonDetail } from '@/components/employee/LessonDetail';
import { ManagerDashboard } from '@/components/manager/ManagerDashboard';
import { Hammer, LogOut, ShieldCheck } from 'lucide-react';

function AppShell() {
  const { profile, loading, signOut } = useAuth();
  const [openLessonId, setOpenLessonId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-600 mb-3">
            <Hammer className="w-7 h-7 text-white" />
          </div>
          <p className="text-slate-400 text-sm">Loading…</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return <Login />;
  }

  const isManager = profile.role === 'manager';

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Hammer className="w-5 h-5 text-white" />
            </div>
            <div className="leading-tight">
              <p className="font-bold text-slate-900 text-sm">BinGo Training</p>
              <p className="text-[11px] text-slate-500">{isManager ? 'Manager dashboard' : profile.job_title || 'Employee'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isManager && (
              <span className="hidden sm:flex badge bg-blue-100 text-blue-700">
                <ShieldCheck className="w-3.5 h-3.5" /> Manager
              </span>
            )}
            <div className="text-right leading-tight hidden sm:block">
              <p className="text-sm font-semibold text-slate-700">{profile.full_name}</p>
              <p className="text-[11px] text-slate-500">{profile.location}</p>
            </div>
            <button
              onClick={signOut}
              className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              title="Sign out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="animate-fade-in">
        {isManager ? (
          <ManagerDashboard />
        ) : openLessonId ? (
          <LessonDetail lessonId={openLessonId} onBack={() => setOpenLessonId(null)} />
        ) : (
          <EmployeeTraining onOpenLesson={(id) => setOpenLessonId(id)} />
        )}
      </main>

      <footer className="max-w-5xl mx-auto px-4 py-8 text-center">
        <p className="text-xs text-slate-400">BinGo Auctions — Employee Training Hub</p>
      </footer>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}

export default App;
