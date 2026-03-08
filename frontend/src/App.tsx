import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { AuthProvider } from './features/auth/AuthContext';
import ProtectedRoute from './features/auth/ProtectedRoute';

// Eagerly load auth and layout (needed immediately)
import Login from './features/auth/Login';
import ReviewerRegistration from './features/auth/ReviewerRegistration';
import DashboardLayout from './components/DashboardLayout';

// Lazy load feature components for code splitting
// PI Features
const PIDashboard = lazy(() => import('./features/proposals/PIDashboard'));
const ProposalForm = lazy(() => import('./features/proposals/ProposalForm'));
const ProposalDetailView = lazy(() => import('./features/proposals/ProposalDetailView'));
const RevisionForm = lazy(() => import('./features/proposals/RevisionForm'));

// Reviewer Features
const ReviewerHome = lazy(() => import('./features/reviews/ReviewerHome'));
const ReviewerDashboard = lazy(() => import('./features/reviews/ReviewerDashboard'));
const Stage1ReviewForm = lazy(() => import('./features/reviews/Stage1ReviewForm'));
const Stage2ReviewForm = lazy(() => import('./features/reviews/Stage2ReviewForm'));

// SRC Chair Features
const SRCChairDashboard = lazy(() => import('./features/admin/SRCChairDashboard'));
const GrantCycleManagement = lazy(() => import('./features/cycles/GrantCycleManagement'));
const ReviewerManagement = lazy(() => import('./features/admin/ReviewerManagement'));
const PendingReviewers = lazy(() => import('./features/admin/PendingReviewers'));
const ProposalList = lazy(() => import('./features/admin/ProposalList'));
const ReportsPage = lazy(() => import('./features/admin/ReportsPage'));
const AuditLogViewer = lazy(() => import('./features/admin/AuditLogViewer'));

// Shared Features
const ChangePassword = lazy(() => import('./features/auth/ChangePassword'));
const ProfilePage = lazy(() => import('./features/auth/ProfilePage'));

// Loading fallback component
const LoadingFallback = () => (
  <div className="app-background flex min-h-screen items-center justify-center px-4">
    <div className="surface-glass flex w-full max-w-sm flex-col items-center gap-3 rounded-3xl border border-slate-200 p-8 text-center shadow-[0_20px_38px_rgba(15,23,42,0.14)]">
      <div className="relative">
        <div className="h-14 w-14 animate-spin rounded-full border-4 border-[#d7dfec] border-t-[#1e2a4a]" />
        <div className="absolute inset-2 rounded-full bg-[linear-gradient(140deg,#d4a017_0%,#f2cb6b_100%)] opacity-50" />
      </div>
      <p className="text-sm font-semibold text-slate-700">Loading workspace</p>
      <p className="text-xs text-slate-500">Preparing your CTRG dashboard...</p>
    </div>
  </div>
);

const GenericNotFound = () => (
  <div className="app-background flex min-h-screen items-center justify-center px-4">
    <div className="surface-glass w-full max-w-xl rounded-3xl border border-slate-200 p-10 text-center shadow-[0_26px_44px_rgba(15,23,42,0.16)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Error</p>
      <h1 className="mt-2 font-serif text-6xl text-slate-800">404</h1>
      <p className="mt-4 text-base text-slate-600">This page does not exist in the CTRG workspace.</p>
      <Link
        to="/login"
        className="mt-6 inline-flex items-center rounded-xl bg-[linear-gradient(140deg,#1e2a4a_0%,#2a3a5f_100%)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_12px_26px_rgba(30,42,74,0.32)] transition hover:brightness-110"
      >
        Return to Login
      </Link>
    </div>
  </div>
);

const Unauthorized = () => (
  <div className="app-background flex min-h-screen items-center justify-center px-4">
    <div className="surface-glass w-full max-w-xl rounded-3xl border border-slate-200 p-10 text-center shadow-[0_26px_44px_rgba(15,23,42,0.16)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-rose-600">Access Restricted</p>
      <h1 className="mt-2 font-serif text-6xl text-slate-800">403</h1>
      <p className="mt-4 text-base text-slate-600">Your current account role does not have permission for this route.</p>
      <Link
        to="/login"
        className="mt-6 inline-flex items-center rounded-xl bg-[linear-gradient(140deg,#d4a017_0%,#f2cb6b_100%)] px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-[0_12px_26px_rgba(184,133,12,0.28)] transition hover:brightness-105"
      >
        Switch Account
      </Link>
    </div>
  </div>
);

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register-reviewer" element={<ReviewerRegistration />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          <Route element={<DashboardLayout />}>
            {/* PI Routes - Lazy loaded */}
            <Route element={<ProtectedRoute allowedRoles={['PI']} />}>
              <Route path="/pi/dashboard" element={<Suspense fallback={<LoadingFallback />}><PIDashboard /></Suspense>} />
              <Route path="/pi/submit" element={<Suspense fallback={<LoadingFallback />}><ProposalForm /></Suspense>} />
              <Route path="/pi/proposals/:id" element={<Suspense fallback={<LoadingFallback />}><ProposalForm /></Suspense>} />
              <Route path="/pi/proposals/:id/view" element={<Suspense fallback={<LoadingFallback />}><ProposalDetailView /></Suspense>} />
              <Route path="/pi/proposals/:id/revise" element={<Suspense fallback={<LoadingFallback />}><RevisionForm /></Suspense>} />
              <Route path="/pi/profile" element={<Suspense fallback={<LoadingFallback />}><ProfilePage /></Suspense>} />
              <Route path="/pi/change-password" element={<Suspense fallback={<LoadingFallback />}><ChangePassword /></Suspense>} />
            </Route>

            {/* Reviewer Routes - Lazy loaded */}
            <Route element={<ProtectedRoute allowedRoles={['Reviewer']} />}>
              <Route path="/reviewer/dashboard" element={<Suspense fallback={<LoadingFallback />}><ReviewerHome /></Suspense>} />
              <Route path="/reviewer/reviews" element={<Suspense fallback={<LoadingFallback />}><ReviewerDashboard /></Suspense>} />
              <Route path="/reviewer/reviews/:id" element={<Suspense fallback={<LoadingFallback />}><Stage1ReviewForm /></Suspense>} />
              <Route path="/reviewer/reviews/:id/stage2" element={<Suspense fallback={<LoadingFallback />}><Stage2ReviewForm /></Suspense>} />
              <Route path="/reviewer/reviews/:id/view" element={<Suspense fallback={<LoadingFallback />}><Stage1ReviewForm /></Suspense>} />
              <Route path="/reviewer/profile" element={<Suspense fallback={<LoadingFallback />}><ProfilePage /></Suspense>} />
              <Route path="/reviewer/change-password" element={<Suspense fallback={<LoadingFallback />}><ChangePassword /></Suspense>} />
            </Route>

            {/* SRC Chair (Admin) Routes - Lazy loaded */}
            <Route element={<ProtectedRoute allowedRoles={['SRC_Chair']} />}>
              <Route path="/admin/dashboard" element={<Suspense fallback={<LoadingFallback />}><SRCChairDashboard /></Suspense>} />
              <Route path="/admin/proposals" element={<Suspense fallback={<LoadingFallback />}><ProposalList /></Suspense>} />
              <Route path="/admin/proposals/new" element={<Suspense fallback={<LoadingFallback />}><ProposalForm /></Suspense>} />
              <Route path="/admin/proposals/:id" element={<Suspense fallback={<LoadingFallback />}><ProposalForm /></Suspense>} />
              <Route path="/admin/cycles" element={<Suspense fallback={<LoadingFallback />}><GrantCycleManagement /></Suspense>} />
              <Route path="/admin/reviewers" element={<Suspense fallback={<LoadingFallback />}><ReviewerManagement /></Suspense>} />
              <Route path="/admin/pending-reviewers" element={<Suspense fallback={<LoadingFallback />}><PendingReviewers /></Suspense>} />
              <Route path="/admin/reports" element={<Suspense fallback={<LoadingFallback />}><ReportsPage /></Suspense>} />
              <Route path="/admin/audit-logs" element={<Suspense fallback={<LoadingFallback />}><AuditLogViewer /></Suspense>} />
              <Route path="/admin/profile" element={<Suspense fallback={<LoadingFallback />}><ProfilePage /></Suspense>} />
              <Route path="/admin/change-password" element={<Suspense fallback={<LoadingFallback />}><ChangePassword /></Suspense>} />
            </Route>
          </Route>

          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<GenericNotFound />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
