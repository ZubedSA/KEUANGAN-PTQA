import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
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
    Bell
} from 'lucide-react';
import Logo from '../assets/logo.png';

const Sidebar = ({ isOpen, toggleSidebar }) => {
    const location = useLocation();
    const [openMenus, setOpenMenus] = useState({ keuangan: true, santri: true });

    const toggleMenu = (key) => setOpenMenus(prev => ({ ...prev, [key]: !prev[key] }));

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

                    <div className="pt-4">
                        <p className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Sistem</p>
                        <NavItem to="/tools" icon={<Wrench size={20} />} label="Tools Bendahara" />
                    </div>
                </nav>

                <div className="p-4 border-t border-slate-800 bg-slate-900/50">
                    <button className="flex items-center gap-3 w-full px-4 py-3 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all duration-200 text-sm font-medium group">
                        <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
                        <span>Keluar System</span>
                    </button>
                </div>
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
                                <h2 className="text-lg font-bold text-slate-800">Selamat Datang, Admin!</h2>
                                <p className="text-xs text-slate-500 mt-0.5">Kelola keuangan pesantren dengan mudah.</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 sm:gap-6">
                        <button className="p-2.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all relative">
                            <Bell size={20} />
                            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                        </button>

                        <div className="h-8 w-[1px] bg-slate-200 hidden sm:block"></div>

                        <div className="flex items-center gap-3 pl-2">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-bold text-slate-700">Bendahara</p>
                                <div className="flex items-center justify-end gap-1.5">
                                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                                    <p className="text-[10px] text-emerald-600 font-medium">Online</p>
                                </div>
                            </div>
                            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center text-white font-bold border-[3px] border-white shadow-md shadow-emerald-200 hover:scale-105 transition-transform cursor-pointer">
                                A
                            </div>
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
        </div>
    );
}
