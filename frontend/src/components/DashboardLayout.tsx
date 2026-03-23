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
    Shield,
    Key,
    User,
    X,
    Zap,
} from 'lucide-react';
import { cn } from '../lib/utils';

interface NavItem {
    to: string;
    icon: React.ElementType;
    label: string;
    badge?: string;
}

const piNavItems: NavItem[] = [
    { to: '/pi/dashboard',       icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/pi/submit',          icon: Plus,            label: 'New Proposal' },
    { to: '/pi/profile',         icon: User,            label: 'Profile' },
    { to: '/pi/change-password', icon: Key,             label: 'Change Password' },
];

const reviewerNavItems: NavItem[] = [
    { to: '/reviewer/dashboard',       icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/reviewer/reviews',         icon: CheckSquare,     label: 'My Reviews' },
    { to: '/reviewer/profile',         icon: User,            label: 'Profile' },
    { to: '/reviewer/change-password', icon: Key,             label: 'Change Password' },
];

const adminNavItems: NavItem[] = [
    { to: '/admin/dashboard',          icon: LayoutDashboard, label: 'Overview' },
    { to: '/admin/cycles',             icon: Calendar,        label: 'Grant Cycles' },
    { to: '/admin/proposals',          icon: FileText,        label: 'Proposals' },
    { to: '/admin/reviewers',          icon: Users,           label: 'Reviewers' },
    { to: '/admin/pending-reviewers',  icon: UserCheck,       label: 'Pending' },
    { to: '/admin/reports',            icon: BarChart3,       label: 'Reports' },
    { to: '/admin/audit-logs',         icon: Shield,          label: 'Audit Logs' },
    { to: '/admin/change-password',    icon: Key,             label: 'Change Password' },
];

const getPageTitle = (role: string | null, pathname: string): string => {
    if (role === 'SRC_Chair') {
        if (pathname.startsWith('/admin/proposals'))         return 'Proposals';
        if (pathname.startsWith('/admin/cycles'))            return 'Grant Cycles';
        if (pathname.startsWith('/admin/reviewers'))         return 'Reviewers';
        if (pathname.startsWith('/admin/pending-reviewers')) return 'Pending Reviewers';
        if (pathname.startsWith('/admin/reports'))           return 'Reports';
        if (pathname.startsWith('/admin/audit-logs'))        return 'Audit Logs';
        if (pathname.startsWith('/admin/change-password'))   return 'Change Password';
        return 'Overview';
    }
    if (role === 'Reviewer') {
        if (pathname.startsWith('/reviewer/reviews/') && pathname.endsWith('/stage2')) return 'Stage 2 Review';
        if (pathname.startsWith('/reviewer/reviews/')) return 'Stage 1 Review';
        if (pathname.startsWith('/reviewer/reviews'))  return 'My Reviews';
        return 'Dashboard';
    }
    if (role === 'PI') {
        if (pathname.startsWith('/pi/proposals/') && pathname.endsWith('/revise')) return 'Revision Submission';
        if (pathname.startsWith('/pi/proposals/') && pathname.endsWith('/view'))   return 'Proposal Details';
        if (pathname.startsWith('/pi/proposals/') || pathname.startsWith('/pi/submit')) return 'Proposal Form';
        if (pathname.startsWith('/pi/change-password')) return 'Change Password';
        return 'My Proposals';
    }
    return 'Dashboard';
};

const getRoleMeta = (role: string | null) => {
    if (role === 'SRC_Chair') return { label: 'Chair Console', color: 'from-violet-500 to-brand-500' };
    if (role === 'Reviewer')  return { label: 'Reviewer Portal', color: 'from-cyan-500 to-brand-500' };
    return { label: 'PI Portal', color: 'from-brand-500 to-violet-500' };
};

const DashboardLayout: React.FC = () => {
    const { user, role, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [collapsed, setCollapsed]   = useState(false);
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(() =>
        typeof window !== 'undefined' ? window.innerWidth < 1024 : false
    );

    const handleLogout = () => { logout(); navigate('/login'); };

    const navItems   = role === 'PI' ? piNavItems : role === 'Reviewer' ? reviewerNavItems : adminNavItems;
    const roleMeta   = getRoleMeta(role);
    const pageTitle  = getPageTitle(role, location.pathname);
    const initials   = ((user?.first_name?.[0] ?? '') + (user?.last_name?.[0] ?? user?.username?.[0] ?? '')).toUpperCase() || 'U';

    useEffect(() => {
        const h = () => setIsMobile(window.innerWidth < 1024);
        h(); window.addEventListener('resize', h);
        return () => window.removeEventListener('resize', h);
    }, []);

    useEffect(() => { setMobileNavOpen(false); }, [location.pathname]);

    return (
        <div className="dashboard-theme relative flex min-h-screen">
            {/* Mobile overlay */}
            {mobileNavOpen && (
                <button
                    aria-label="Close navigation"
                    className="fixed inset-0 z-30 lg:hidden"
                    style={{ background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(4px)' }}
                    onClick={() => setMobileNavOpen(false)}
                />
            )}

            {/* ── Sidebar ── */}
            <aside
                className={cn(
                    'sidebar fixed inset-y-0 left-0 z-40 flex flex-col transition-all duration-300 ease-in-out lg:translate-x-0',
                    mobileNavOpen ? 'translate-x-0' : '-translate-x-full',
                    collapsed ? 'lg:w-[68px]' : 'lg:w-64',
                    'w-64',
                )}
            >
                {/* Logo row */}
                <div className={cn(
                    'flex h-16 items-center border-b px-4',
                    'border-slate-100',
                    collapsed ? 'justify-center' : 'gap-3 justify-between'
                )}>
                    {!collapsed && (
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 shadow-md">
                                <GraduationCap className="h-4 w-4 text-white" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-indigo-600">CTRG</p>
                                <p className="text-[13px] font-semibold text-slate-800 truncate leading-tight">Grant Portal</p>
                            </div>
                        </div>
                    )}
                    {collapsed && (
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 shadow-md">
                            <GraduationCap className="h-4 w-4 text-white" />
                        </div>
                    )}
                    <button
                        onClick={() => isMobile ? setMobileNavOpen(false) : setCollapsed(p => !p)}
                        className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                        aria-label={collapsed ? 'Expand' : 'Collapse'}
                    >
                        {isMobile ? <X className="h-4.5 w-4.5" /> : collapsed ? <Menu className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                    </button>
                </div>

                {/* Role badge */}
                {!collapsed && (
                    <div className="mx-3 mt-3 rounded-lg px-3 py-1.5" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.18)' }}>
                        <p className="text-[11px] font-semibold text-indigo-500 uppercase tracking-widest">{roleMeta.label}</p>
                    </div>
                )}

                {/* Nav */}
                <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-0.5 scrollbar-thin">
                    {!collapsed && (
                        <p className="section-label px-3 pb-2 text-slate-400">Navigation</p>
                    )}
                    {navItems.map((item) => {
                        const isDashboard = item.to.endsWith('/dashboard');
                        const isActive = isDashboard
                            ? location.pathname === item.to
                            : location.pathname.startsWith(item.to);
                        return (
                            <Link
                                key={item.to}
                                to={item.to}
                                title={collapsed ? item.label : undefined}
                                className={cn(
                                    'nav-item',
                                    isActive && 'nav-item-active',
                                    collapsed && 'justify-center',
                                )}
                            >
                                <item.icon className={cn(
                                    'h-[18px] w-[18px] flex-shrink-0',
                                    isActive ? 'text-indigo-500' : 'text-slate-400'
                                )} />
                                {!collapsed && <span className="text-sm">{item.label}</span>}
                                {!collapsed && item.badge && (
                                    <span className="ml-auto badge badge-brand text-[10px] px-1.5 py-0.5">{item.badge}</span>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* User row */}
                <div className="border-t border-slate-100 p-3">
                    <div className={cn('flex items-center gap-3 rounded-xl px-2 py-2', collapsed && 'justify-center')}
                         style={{ background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.1)' }}>
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-xs font-bold text-white shadow-sm">
                            {initials}
                        </div>
                        {!collapsed && (
                            <>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-[13px] font-semibold text-slate-800">
                                        {user?.first_name ? `${user.first_name} ${user.last_name ?? ''}`.trim() : user?.username}
                                    </p>
                                    <p className="truncate text-[11px] text-slate-400">{role}</p>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
                                    title="Sign out"
                                >
                                    <LogOut className="h-4 w-4" />
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </aside>

            {/* ── Main ── */}
            <div className={cn('flex min-h-screen flex-1 flex-col transition-all duration-300', collapsed ? 'lg:pl-[68px]' : 'lg:pl-64')}>

                {/* Topbar */}
                <header className="topbar sticky top-0 z-20 flex h-14 items-center justify-between gap-4 px-4 sm:px-6">
                    <div className="flex items-center gap-3 min-w-0">
                        <button
                            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 lg:hidden"
                            onClick={() => setMobileNavOpen(true)}
                            aria-label="Open navigation"
                        >
                            <Menu className="h-5 w-5" />
                        </button>
                        <div className="min-w-0">
                            <p className="section-label text-slate-400">{roleMeta.label}</p>
                            <h1 className="text-base font-semibold text-slate-800 truncate leading-tight">{pageTitle}</h1>
                        </div>
                    </div>

                    <div className="hidden items-center gap-2.5 sm:flex">
                        <div className="flex items-center gap-1.5 rounded-full px-3 py-1" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                            <span className="dot-glow" style={{ width: 6, height: 6 }} />
                            <span className="text-[12px] font-semibold text-emerald-600">Live</span>
                        </div>
                        <div className="flex items-center gap-1.5 rounded-full px-3 py-1" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.18)' }}>
                            <Zap className="h-3 w-3 text-indigo-500" />
                            <span className="text-[12px] font-semibold text-indigo-600">CTRG System</span>
                        </div>
                    </div>
                </header>

                {/* Page content */}
                <main className="flex-1 px-4 pb-8 pt-5 sm:px-6 animate-slide-up">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;
