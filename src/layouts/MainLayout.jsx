import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    Wallet,
    Users,
    LogOut,
    Menu,
    X,
    ChevronDown,
    ChevronRight,
    Wrench,
    Bell,
    Shield,
    Key,
    Loader2,
    Banknote,
    AlertTriangle,
    CheckCircle,
    XCircle,
    TrendingDown,
    Clock
} from 'lucide-react';
import Logo from '../assets/logo.png';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';

const Sidebar = ({ isOpen, toggleSidebar }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout, isAdmin, isBendahara, isPengasuh } = useAuth();
    const [openMenus, setOpenMenus] = useState({ keuangan: true, santri: true, penyaluran: false });

    const toggleMenu = (key) => setOpenMenus(prev => ({ ...prev, [key]: !prev[key] }));

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <>
            {/* Mobile Overlay with Blur */}
            <div
                className={`fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 transition-opacity duration-300 lg:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={toggleSidebar}
            />

            {/* Sidebar Container */}
            <div className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-slate-900 text-white transform transition-transform duration-300 cubic-bezier(0.4, 0, 0.2, 1) ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 flex flex-col h-full shadow-2xl lg:shadow-none border-r border-slate-800`}>

                {/* Branding */}
                <div className="h-20 flex items-center gap-4 px-6 border-b border-slate-800/50 bg-slate-900">
                    <div className="w-10 h-10 bg-gradient-to-tr from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center p-0.5 shadow-lg shadow-emerald-500/20">
                        <div className="bg-white w-full h-full rounded-[10px] flex items-center justify-center overflow-hidden p-1">
                            <img src={Logo} alt="Logo" className="w-full h-full object-contain" />
                        </div>
                    </div>
                    <div>
                        <h1 className="font-bold text-base tracking-wide text-white leading-tight">PTQA BATUAN</h1>
                        <p className="text-[10px] font-medium text-emerald-400 tracking-wider uppercase mt-0.5">Sistem Keuangan</p>
                    </div>
                    <button onClick={toggleSidebar} className="lg:hidden ml-auto text-slate-400 hover:text-white transition-colors p-1 rounded-md hover:bg-slate-800">
                        <X size={20} />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-2 custom-scrollbar">
                    <NavItem to="/" icon={<LayoutDashboard size={20} />} label="Dashboard" />

                    <div className="pt-6 pb-2">
                        <p className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Modul Utama</p>

                        {/* Keuangan Group */}
                        <div className="mb-2">
                            <button onClick={() => toggleMenu('keuangan')} className="w-full flex items-center justify-between px-4 py-3 text-slate-300 hover:bg-slate-800/50 hover:text-white rounded-xl transition-all duration-200 group">
                                <div className="flex items-center gap-3">
                                    <div className={`p-1.5 rounded-lg transition-colors ${openMenus.keuangan ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 group-hover:bg-slate-700'}`}>
                                        <Wallet size={18} />
                                    </div>
                                    <span className="text-sm font-medium">Keuangan</span>
                                </div>
                                {openMenus.keuangan ? <ChevronDown size={14} className="text-emerald-500" /> : <ChevronRight size={14} className="text-slate-500" />}
                            </button>
                            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${openMenus.keuangan ? 'max-h-48 opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
                                <div className="ml-4 pl-4 border-l border-slate-700/50 space-y-1 py-1">
                                    <SubNavItem to="/keuangan/pemasukan" label="Pemasukan" />
                                    <SubNavItem to="/keuangan/pengeluaran" label="Pengeluaran" />
                                    <SubNavItem to="/keuangan/laporan" label="Laporan" />
                                </div>
                            </div>
                        </div>

                        {/* Santri Group */}
                        <div>
                            <button onClick={() => toggleMenu('santri')} className="w-full flex items-center justify-between px-4 py-3 text-slate-300 hover:bg-slate-800/50 hover:text-white rounded-xl transition-all duration-200 group">
                                <div className="flex items-center gap-3">
                                    <div className={`p-1.5 rounded-lg transition-colors ${openMenus.santri ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 group-hover:bg-slate-700'}`}>
                                        <Users size={18} />
                                    </div>
                                    <span className="text-sm font-medium">Santri</span>
                                </div>
                                {openMenus.santri ? <ChevronDown size={14} className="text-emerald-500" /> : <ChevronRight size={14} className="text-slate-500" />}
                            </button>
                            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${openMenus.santri ? 'max-h-64 opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
                                <div className="ml-4 pl-4 border-l border-slate-700/50 space-y-1 py-1">
                                    <SubNavItem to="/santri/data" label="Data Santri" />
                                    <SubNavItem to="/santri/tagihan" label="Tagihan Santri" />
                                    <SubNavItem to="/santri/kategori" label="Kategori" />
                                    <SubNavItem to="/santri/pembayaran" label="Pembayaran" />
                                    <SubNavItem to="/santri/laporan" label="Laporan Santri" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Penyaluran Dana Group - Visible for all roles */}
                    <div className="mb-2">
                        <button onClick={() => toggleMenu('penyaluran')} className="w-full flex items-center justify-between px-4 py-3 text-slate-300 hover:bg-slate-800/50 hover:text-white rounded-xl transition-all duration-200 group">
                            <div className="flex items-center gap-3">
                                <div className={`p-1.5 rounded-lg transition-colors ${openMenus.penyaluran ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-800 group-hover:bg-slate-700'}`}>
                                    <Banknote size={18} />
                                </div>
                                <span className="text-sm font-medium">Penyaluran Dana</span>
                            </div>
                            {openMenus.penyaluran ? <ChevronDown size={14} className="text-amber-500" /> : <ChevronRight size={14} className="text-slate-500" />}
                        </button>
                        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${openMenus.penyaluran ? 'max-h-48 opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
                            <div className="ml-4 pl-4 border-l border-slate-700/50 space-y-1 py-1">
                                {/* Anggaran - Admin & Bendahara only */}
                                {(isAdmin || isBendahara) && (
                                    <SubNavItem to="/penyaluran/anggaran" label="Anggaran Penyaluran" />
                                )}
                                {/* Persetujuan - Admin & Pengasuh only */}
                                {(isAdmin || isPengasuh) && (
                                    <SubNavItem to="/penyaluran/persetujuan" label="Persetujuan" />
                                )}
                                {/* Realisasi - Admin & Bendahara only */}
                                {(isAdmin || isBendahara) && (
                                    <SubNavItem to="/penyaluran/realisasi" label="Realisasi Dana" />
                                )}
                                {/* Laporan - All roles */}
                                <SubNavItem to="/penyaluran/laporan" label="Laporan Penyaluran" />
                            </div>
                        </div>
                    </div>

                    <div className="pt-4">
                        <p className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Sistem</p>
                        {(isAdmin || isBendahara) && (
                            <NavItem to="/tools" icon={<Wrench size={20} />} label="Tools Bendahara" />
                        )}
                        {isAdmin && (
                            <NavItem to="/users" icon={<Shield size={20} />} label="Manajemen User" />
                        )}
                    </div>
                </nav>

                {/* User Info Only */}
                {user && (
                    <div className="p-4 border-t border-slate-800 bg-slate-900/50">
                        <div className="flex items-center gap-3 px-4 py-2 bg-slate-800/50 rounded-xl">
                            <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                {user.name?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">{user.name}</p>
                                <p className="text-[10px] text-slate-400 uppercase">{user.role}</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

const NavItem = ({ to, icon, label }) => (
    <NavLink
        to={to}
        end={to === '/'}
        className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium relative overflow-hidden ${isActive
                ? 'text-white bg-emerald-600 shadow-lg shadow-emerald-900/20'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`
        }
    >
        {({ isActive }) => (
            <>
                <div className={`absolute left-0 top-0 bottom-0 w-1 bg-emerald-400 transition-transform duration-200 ${isActive ? 'scale-y-100' : 'scale-y-0'}`} />
                <span className="relative z-10">{icon}</span>
                <span className="relative z-10">{label}</span>
            </>
        )}
    </NavLink>
);

const SubNavItem = ({ to, label }) => (
    <NavLink
        to={to}
        className={({ isActive }) =>
            `block px-4 py-2 rounded-lg text-sm transition-all duration-200 border-l-2 border-transparent ${isActive
                ? 'text-emerald-400 font-medium bg-emerald-500/10 border-emerald-500 translate-x-1'
                : 'text-slate-500 hover:text-slate-300 hover:translate-x-1'
            }`
        }
    >
        {label}
    </NavLink>
);

export default function MainLayout() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [showNotifMenu, setShowNotifMenu] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
    const [saving, setSaving] = useState(false);
    const { user, logout } = useAuth();
    const { notifications, unreadCount, markAsRead } = useNotifications();
    const navigate = useNavigate();

    const getNotifIcon = (type) => {
        switch (type) {
            case 'expense': return <TrendingDown className="text-red-500" size={16} />;
            case 'overdue': return <AlertTriangle className="text-amber-500" size={16} />;
            case 'approval': return <Clock className="text-blue-500" size={16} />;
            case 'success': return <CheckCircle className="text-emerald-500" size={16} />;
            case 'rejected': return <XCircle className="text-red-500" size={16} />;
            default: return <Bell className="text-slate-500" size={16} />;
        }
    };

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (passwordForm.new !== passwordForm.confirm) {
            alert('Password baru tidak cocok!');
            return;
        }
        if (passwordForm.new.length < 4) {
            alert('Password minimal 4 karakter!');
            return;
        }
        setSaving(true);
        try {
            const { supabase } = await import('../lib/supabase');

            // Verify current password
            const { data: currentUser } = await supabase
                .from('users')
                .select('password')
                .eq('id', user.id)
                .single();

            if (currentUser?.password !== passwordForm.current) {
                alert('Password lama salah!');
                setSaving(false);
                return;
            }

            // Update password
            await supabase.from('users').update({ password: passwordForm.new }).eq('id', user.id);

            // Log activity
            await supabase.from('audit_logs').insert([{
                id: Date.now().toString(36),
                action: 'GANTI_PASSWORD',
                details: `${user.name} mengubah password sendiri`,
                user_name: user.name,
                timestamp: new Date().toISOString()
            }]);

            alert('Password berhasil diubah!');
            setShowPasswordModal(false);
            setPasswordForm({ current: '', new: '', confirm: '' });
        } catch (err) {
            alert('Error: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="flex h-screen bg-slate-50/50 font-sans overflow-hidden selection:bg-emerald-500/30 selection:text-emerald-900">
            <Sidebar isOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

            <div className="flex-1 flex flex-col h-screen overflow-hidden w-full relative">
                <header className="h-20 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 flex items-center justify-between px-6 sticky top-0 z-30 transition-all duration-300">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden text-slate-500 hover:bg-slate-100 p-2.5 rounded-xl transition-colors">
                            <Menu size={24} />
                        </button>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800 lg:hidden leading-none">PTQA System</h2>
                            <p className="text-xs text-slate-500 lg:hidden mt-1">Mobile Dashboard</p>

                            <div className="hidden lg:block">
                                <h2 className="text-lg font-bold text-slate-800">Selamat Datang, {user?.name || 'User'}!</h2>
                                <p className="text-xs text-slate-500 mt-0.5">Kelola keuangan pesantren dengan mudah.</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 sm:gap-6">
                        {/* Notification Bell with Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => { setShowNotifMenu(!showNotifMenu); setShowProfileMenu(false); }}
                                className="p-2.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all relative"
                            >
                                <Bell size={20} />
                                {unreadCount > 0 && (
                                    <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-red-500 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white">
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </span>
                                )}
                            </button>

                            {/* Notification Dropdown */}
                            {showNotifMenu && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setShowNotifMenu(false)}></div>
                                    <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden">
                                        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                                            <h4 className="font-bold text-slate-800 flex items-center gap-2">
                                                <Bell size={18} className="text-emerald-500" /> Notifikasi
                                            </h4>
                                            {unreadCount > 0 && (
                                                <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">
                                                    {unreadCount} baru
                                                </span>
                                            )}
                                        </div>
                                        <div className="max-h-80 overflow-y-auto">
                                            {notifications.slice(0, 5).length > 0 ? (
                                                notifications.slice(0, 5).map(notif => (
                                                    <div
                                                        key={notif.id}
                                                        onClick={() => {
                                                            markAsRead(notif.id);
                                                            setShowNotifMenu(false);
                                                            if (notif.link) navigate(notif.link);
                                                        }}
                                                        className={`p-3 border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors ${!notif.read ? 'bg-emerald-50/50' : ''
                                                            }`}
                                                    >
                                                        <div className="flex items-start gap-3">
                                                            <div className="p-2 rounded-lg bg-slate-100">
                                                                {getNotifIcon(notif.type)}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-medium text-sm text-slate-800 truncate">{notif.title}</p>
                                                                <p className="text-xs text-slate-500 truncate">{notif.message}</p>
                                                            </div>
                                                            {!notif.read && (
                                                                <span className="w-2 h-2 bg-emerald-500 rounded-full mt-2"></span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="p-8 text-center text-slate-400">
                                                    <Bell size={32} className="mx-auto mb-2 opacity-50" />
                                                    <p className="text-sm">Tidak ada notifikasi</p>
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-3 border-t border-slate-100 bg-slate-50">
                                            <button
                                                onClick={() => { setShowNotifMenu(false); navigate('/notifikasi'); }}
                                                className="w-full py-2 text-sm font-medium text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                            >
                                                Lihat Semua Notifikasi →
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="h-8 w-[1px] bg-slate-200 hidden sm:block"></div>

                        {/* Profile Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setShowProfileMenu(!showProfileMenu)}
                                className="flex items-center gap-3 pl-2 hover:opacity-80 transition-opacity"
                            >
                                <div className="text-right hidden sm:block">
                                    <p className="text-sm font-bold text-slate-700">{user?.name || 'User'}</p>
                                    <div className="flex items-center justify-end gap-1.5">
                                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                                        <p className="text-[10px] text-emerald-600 font-medium uppercase">{user?.role || 'User'}</p>
                                    </div>
                                </div>
                                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center text-white font-bold border-[3px] border-white shadow-md shadow-emerald-200 hover:scale-105 transition-transform cursor-pointer">
                                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                                </div>
                            </button>

                            {/* Dropdown Menu */}
                            {showProfileMenu && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)}></div>
                                    <div className="absolute right-0 top-14 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 overflow-hidden">
                                        <div className="px-4 py-3 border-b border-slate-100">
                                            <p className="font-bold text-slate-800">{user?.name}</p>
                                            <p className="text-xs text-slate-500">@{user?.username}</p>
                                        </div>
                                        <button
                                            onClick={() => { setShowProfileMenu(false); setShowPasswordModal(true); }}
                                            className="w-full px-4 py-3 flex items-center gap-3 text-slate-600 hover:bg-slate-50 transition-colors text-sm"
                                        >
                                            <Key size={16} /> Ubah Password
                                        </button>
                                        <button
                                            onClick={handleLogout}
                                            className="w-full px-4 py-3 flex items-center gap-3 text-red-500 hover:bg-red-50 transition-colors text-sm border-t border-slate-100"
                                        >
                                            <LogOut size={16} /> Keluar Sistem
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50/50 p-4 md:p-8 w-full scroll-smooth custom-scrollbar">
                    <Outlet />

                    <footer className="mt-12 mb-6 text-center">
                        <p className="text-sm font-bold text-slate-400">PTQA BATUAN</p>
                        <p className="text-[10px] text-slate-400 mt-1">© {new Date().getFullYear()} Sistem Informasi Keuangan Santri</p>
                    </footer>
                </main>
            </div>

            {/* Password Change Modal */}
            {showPasswordModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="p-5 border-b flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-lg text-slate-800">Ubah Password</h3>
                            <button onClick={() => setShowPasswordModal(false)} className="p-2 hover:bg-red-50 hover:text-red-500 rounded-full">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handlePasswordChange} className="p-5 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Password Lama</label>
                                <input
                                    type="password"
                                    required
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                    placeholder="Masukkan password lama"
                                    value={passwordForm.current}
                                    onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Password Baru</label>
                                <input
                                    type="password"
                                    required
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                    placeholder="Masukkan password baru"
                                    value={passwordForm.new}
                                    onChange={(e) => setPasswordForm({ ...passwordForm, new: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Konfirmasi Password Baru</label>
                                <input
                                    type="password"
                                    required
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                    placeholder="Ulangi password baru"
                                    value={passwordForm.confirm}
                                    onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={saving}
                                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {saving ? <><Loader2 size={16} className="animate-spin" /> Menyimpan...</> : 'Ubah Password'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

