/**
 * Dashboard layout with responsive navigation and contextual guidance.
 */
import { useEffect, useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import {
    LayoutDashboard,
    FileText,
    CheckSquare,
    LogOut,
    Calendar,
    Users,
    BarChart3,
    ChevronLeft,
    Menu,
    GraduationCap,
    Plus,
    UserCheck,
    Sparkles,
    X,
    Shield,
    Key,
    User,
} from 'lucide-react';
import { cn } from '../lib/utils';

interface NavItem {
    to: string;
    icon: React.ElementType;
    label: string;
}

const piNavItems: NavItem[] = [
    { to: '/pi/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/pi/submit', icon: Plus, label: 'New Proposal' },
    { to: '/pi/profile', icon: User, label: 'Profile' },
    { to: '/pi/change-password', icon: Key, label: 'Change Password' },
];

const reviewerNavItems: NavItem[] = [
    { to: '/reviewer/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/reviewer/reviews', icon: CheckSquare, label: 'My Reviews' },
    { to: '/reviewer/profile', icon: User, label: 'Profile' },
    { to: '/reviewer/change-password', icon: Key, label: 'Change Password' },
];

const adminNavItems: NavItem[] = [
    { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Overview' },
    { to: '/admin/cycles', icon: Calendar, label: 'Grant Cycles' },
    { to: '/admin/proposals', icon: FileText, label: 'Proposals' },
    { to: '/admin/reviewers', icon: Users, label: 'Reviewers' },
    { to: '/admin/pending-reviewers', icon: UserCheck, label: 'Pending Reviewers' },
    { to: '/admin/reports', icon: BarChart3, label: 'Reports' },
    { to: '/admin/audit-logs', icon: Shield, label: 'Audit Logs' },
    { to: '/admin/change-password', icon: Key, label: 'Change Password' },
];

const getPageTitle = (role: string | null, pathname: string): string => {
    if (role === 'SRC_Chair') {
        if (pathname.startsWith('/admin/proposals')) return 'Proposals';
        if (pathname.startsWith('/admin/cycles')) return 'Grant Cycles';
        if (pathname.startsWith('/admin/reviewers')) return 'Reviewers';
        if (pathname.startsWith('/admin/pending-reviewers')) return 'Pending Reviewers';
        if (pathname.startsWith('/admin/reports')) return 'Reports';
        if (pathname.startsWith('/admin/audit-logs')) return 'Audit Logs';
        if (pathname.startsWith('/admin/change-password')) return 'Change Password';
        if (pathname.startsWith('/admin/profile')) return 'Profile';
        return 'Overview';
    }

    if (role === 'Reviewer') {
        if (pathname.startsWith('/reviewer/reviews/') && pathname.endsWith('/stage2')) return 'Stage 2 Review';
        if (pathname.startsWith('/reviewer/reviews/')) return 'Stage 1 Review';
        if (pathname.startsWith('/reviewer/reviews')) return 'My Reviews';
        return 'Dashboard';
    }

    if (role === 'PI') {
        if (pathname.startsWith('/pi/proposals/') && pathname.endsWith('/revise')) return 'Revision Submission';
        if (pathname.startsWith('/pi/proposals/') && pathname.endsWith('/view')) return 'Proposal Details';
        if (pathname.startsWith('/pi/proposals/') || pathname.startsWith('/pi/submit')) return 'Proposal Form';
        if (pathname.startsWith('/pi/change-password')) return 'Change Password';
        if (pathname.startsWith('/pi/profile')) return 'Profile';
        return 'My Proposals';
    }

    return 'Dashboard';
};

const DashboardLayout: React.FC = () => {
    const { user, role, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [collapsed, setCollapsed] = useState(false);
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 1024 : false));
    const [currentDate, setCurrentDate] = useState(() =>
        new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        }),
    );

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navItems = role === 'PI' ? piNavItems : role === 'Reviewer' ? reviewerNavItems : adminNavItems;
    const portalTitle = role === 'PI' ? 'PI Portal' : role === 'Reviewer' ? 'Reviewer Portal' : 'SRC Chair Console';
    const pageTitle = getPageTitle(role, location.pathname);

    useEffect(() => {
        const intervalId = window.setInterval(() => {
            setCurrentDate(
                new Date().toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                }),
            );
        }, 60 * 1000);

        return () => window.clearInterval(intervalId);
    }, []);

    useEffect(() => {
        const handler = () => setIsMobile(window.innerWidth < 1024);
        handler();
        window.addEventListener('resize', handler);
        return () => window.removeEventListener('resize', handler);
    }, []);

    useEffect(() => {
        setMobileNavOpen(false);
    }, [location.pathname]);

    return (
        <div className="app-background relative flex min-h-screen text-slate-900">
            <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
                <div className="absolute -left-24 top-12 h-72 w-72 rounded-full bg-[radial-gradient(circle,_rgba(212,160,23,0.24)_0%,_rgba(212,160,23,0.01)_70%)]" />
                <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-[radial-gradient(circle,_rgba(30,42,74,0.2)_0%,_rgba(30,42,74,0.02)_72%)]" />
                <div className="absolute bottom-[-120px] left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,_rgba(68,98,151,0.16)_0%,_rgba(68,98,151,0.01)_72%)]" />
            </div>

            {mobileNavOpen && (
                <button
                    aria-label="Close navigation"
                    className="fixed inset-0 z-30 bg-slate-950/30 backdrop-blur-[2px] lg:hidden"
                    onClick={() => setMobileNavOpen(false)}
                />
            )}

            <aside
                className={cn(
                    'fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-slate-200/60 bg-[linear-gradient(180deg,#182748_0%,#121d37_100%)] shadow-[0_30px_60px_rgba(15,23,42,0.35)] transition-transform duration-300 lg:translate-x-0',
                    mobileNavOpen ? 'translate-x-0' : '-translate-x-full',
                    collapsed ? 'lg:w-20' : 'lg:w-72',
                )}
            >
                <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
                    {!collapsed && (
                        <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[linear-gradient(140deg,#d4a017_0%,#f2cb6b_100%)] shadow-[0_10px_20px_rgba(184,133,12,0.34)]">
                                <GraduationCap className="h-5 w-5 text-slate-900" />
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-[0.16em] text-slate-300">CTRG</p>
                                <p className="text-sm font-semibold text-white">Grant Workflow</p>
                            </div>
                        </div>
                    )}
                    <button
                        onClick={() => (isMobile ? setMobileNavOpen(false) : setCollapsed((prev) => !prev))}
                        className="rounded-lg p-2 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                        title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
                        aria-label={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
                    >
                        {isMobile ? (
                            <X className="h-5 w-5" />
                        ) : collapsed ? (
                            <Menu className="h-5 w-5" />
                        ) : (
                            <ChevronLeft className="h-5 w-5" />
                        )}
                    </button>
                </div>

                <nav className="scrollbar-thin flex-1 space-y-1 overflow-y-auto px-3 py-4">
                    {navItems.map((item) => {
                        const isRootDashboard =
                            item.to === '/admin/dashboard' || item.to === '/pi/dashboard' || item.to === '/reviewer/dashboard';
                        const isActive = location.pathname === item.to || (!isRootDashboard && location.pathname.startsWith(item.to));

                        return (
                            <Link
                                key={item.to}
                                to={item.to}
                                className={cn(
                                    'relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                                    isActive
                                        ? 'bg-white/15 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.09)]'
                                        : 'text-slate-300 hover:bg-white/10 hover:text-white',
                                    collapsed && 'justify-center px-2',
                                )}
                            >
                                <item.icon className="h-5 w-5 flex-shrink-0" />
                                {!collapsed && <span>{item.label}</span>}
                                {isActive && <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r bg-gold" />}
                            </Link>
                        );
                    })}
                </nav>

                <div className="border-t border-white/10 p-3">
                    <div className={cn('flex items-center gap-3 rounded-xl bg-white/5 p-2.5', collapsed && 'justify-center')}>
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[linear-gradient(140deg,#5d79af_0%,#7d96c4_100%)] text-sm font-bold text-white">
                            {user?.first_name?.[0] || user?.username?.[0] || 'U'}
                        </div>
                        {!collapsed && (
                            <>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold text-white">{user?.first_name || user?.username || 'User'}</p>
                                    <p className="truncate text-xs text-slate-300">{role}</p>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="rounded-lg p-2 text-slate-300 transition-colors hover:bg-white/10 hover:text-rose-300"
                                    title="Logout"
                                    aria-label="Logout"
                                >
                                    <LogOut className="h-4 w-4" />
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </aside>

            <div className={cn('flex min-h-screen flex-1 flex-col transition-[padding-left] duration-300', collapsed ? 'lg:pl-20' : 'lg:pl-72')}>
                <header className="sticky top-0 z-20 px-4 pt-4 sm:px-6">
                    <div className="surface-glass flex h-16 items-center justify-between rounded-2xl px-4 shadow-[0_10px_24px_rgba(15,23,42,0.12)] sm:px-6">
                        <div className="flex min-w-0 items-center gap-3">
                            <button
                                className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 lg:hidden"
                                onClick={() => setMobileNavOpen(true)}
                                aria-label="Open navigation"
                            >
                                <Menu className="h-5 w-5" />
                            </button>
                            <div className="min-w-0">
                                <p className="truncate text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{portalTitle}</p>
                                <h2 className="truncate text-base font-semibold text-slate-900 sm:text-lg">{pageTitle}</h2>
                            </div>
                        </div>
                        <div className="hidden items-center gap-3 sm:flex">
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white">
                                <Sparkles className="h-3.5 w-3.5 text-gold" />
                                Active
                            </span>
                            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                                {currentDate}
                            </span>
                        </div>
                    </div>
                </header>

                <main className="flex-1 px-4 pb-6 pt-5 sm:px-6">
                    <div className="stagger-in">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;
