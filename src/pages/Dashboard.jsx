import { useMemo } from 'react';
import { Wallet, TrendingUp, TrendingDown, Users, ArrowUp, ArrowDown, Activity, Calendar, Loader2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import useSupabase from '../hooks/useSupabase';
import { formatCurrency } from '../utils/helpers';

const StatCard = ({ title, amount, icon: Icon, trend, subtext, gradient }) => (
    <div className={`relative overflow-hidden rounded-2xl p-6 shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl ${gradient}`}>
        <div className="absolute top-0 right-0 p-4 opacity-10">
            <Icon size={100} className="text-white transform rotate-12 translate-x-4 -translate-y-4" />
        </div>
        <div className="relative z-10 text-white">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                    <Icon size={20} className="text-white" />
                </div>
                {trend !== undefined && (
                    <span className={`text-xs font-bold px-2 py-1 rounded-lg backdrop-blur-md flex items-center gap-1 ${trend > 0 ? 'bg-emerald-400/30 text-emerald-50 border border-emerald-400/30' : 'bg-red-400/30 text-red-50 border border-red-400/30'}`}>
                        {trend > 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                        {Math.abs(trend)}%
                    </span>
                )}
            </div>
            <h3 className="text-emerald-50 text-sm font-medium opacity-90">{title}</h3>
            <h4 className="text-3xl font-bold tracking-tight mt-1">{amount}</h4>
            {subtext && <p className="text-xs text-white/70 mt-3 font-medium flex items-center gap-1"><Activity size={12} /> {subtext}</p>}
        </div>
    </div>
);

export default function Dashboard() {
    const { data: transactions, loading: txLoading } = useSupabase('transactions', []);
    const { data: students, loading: studentsLoading } = useSupabase('students', []);

    const loading = txLoading || studentsLoading;

    const stats = useMemo(() => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const income = transactions.filter(t => t.type === 'pemasukan').reduce((sum, t) => sum + Number(t.amount), 0);
        const expense = transactions.filter(t => t.type === 'pengeluaran').reduce((sum, t) => sum + Number(t.amount), 0);
        const balance = income - expense;

        const incomeThisMonth = transactions.filter(t => {
            const d = new Date(t.date);
            return t.type === 'pemasukan' && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        }).reduce((sum, t) => sum + Number(t.amount), 0);

        const expenseThisMonth = transactions.filter(t => {
            const d = new Date(t.date);
            return t.type === 'pengeluaran' && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        }).reduce((sum, t) => sum + Number(t.amount), 0);

        return { income, expense, balance, incomeThisMonth, expenseThisMonth, totalStudents: students.length };
    }, [transactions, students]);

    const chartData = useMemo(() => {
        const data = [];
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        months.forEach((m, index) => {
            const inc = transactions.filter(t => new Date(t.date).getMonth() === index && t.type === 'pemasukan').reduce((sum, t) => sum + Number(t.amount), 0);
            const exp = transactions.filter(t => new Date(t.date).getMonth() === index && t.type === 'pengeluaran').reduce((sum, t) => sum + Number(t.amount), 0);
            if (inc > 0 || exp > 0) data.push({ name: m, income: inc, expense: exp });
        });
        return data.length > 0 ? data : [{ name: 'Jan', income: 0, expense: 0 }, { name: 'Feb', income: 0, expense: 0 }];
    }, [transactions]);

    const recentActivity = useMemo(() => transactions.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5), [transactions]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                <span className="ml-2 text-slate-600">Memuat data dari Supabase...</span>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Dashboard</h2>
                    <p className="text-slate-500 mt-1">Data tersinkronisasi dengan Supabase</p>
                </div>
                <div className="flex gap-2 bg-white p-1 rounded-xl shadow-sm border border-slate-200">
                    <span className="px-4 py-2 bg-slate-100 rounded-lg text-xs font-bold text-slate-600 flex items-center gap-2">
                        <Calendar size={14} /> {new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long' })}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Total Pemasukan"
                    amount={formatCurrency(stats.income)}
                    icon={TrendingUp}
                    trend={stats.incomeThisMonth > 0 ? 100 : 0}
                    subtext={`+${formatCurrency(stats.incomeThisMonth)} bulan ini`}
                    gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
                />
                <StatCard
                    title="Total Pengeluaran"
                    amount={formatCurrency(stats.expense)}
                    icon={TrendingDown}
                    trend={stats.expenseThisMonth > 0 ? 100 : 0}
                    subtext={`-${formatCurrency(stats.expenseThisMonth)} bulan ini`}
                    gradient="bg-gradient-to-br from-red-500 to-rose-600"
                />
                <StatCard
                    title="Saldo Kas Saat Ini"
                    amount={formatCurrency(stats.balance)}
                    icon={Wallet}
                    subtext="Dana tersedia"
                    gradient="bg-gradient-to-br from-blue-500 to-indigo-600"
                />
                <StatCard
                    title="Total Santri Aktif"
                    amount={stats.totalStudents}
                    icon={Users}
                    subtext="Terdaftar di sistem"
                    gradient="bg-gradient-to-br from-amber-500 to-orange-600"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="card-premium lg:col-span-2 min-h-[450px] flex flex-col">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h3 className="font-bold text-lg text-slate-800">Arus Kas Tahunan</h3>
                            <p className="text-sm text-slate-500">Visualisasi pendapatan vs pengeluaran</p>
                        </div>
                        <select className="input-field w-auto text-xs py-1.5 h-auto">
                            <option>Tahun Ini</option>
                        </select>
                    </div>
                    <div className="flex-1 w-full min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={(value) => `${value / 1000}k`} />
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }} formatter={(value) => formatCurrency(value)} />
                                <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" />
                                <Area type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorExpense)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="card-premium flex flex-col h-full max-h-[450px]">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-lg text-slate-800">Aktivitas Terkini</h3>
                        <button className="text-emerald-600 text-xs font-bold hover:underline">Lihat Semua</button>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                        {recentActivity.length > 0 ? recentActivity.map((t) => (
                            <div key={t.id} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-colors group border border-transparent hover:border-slate-100">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${t.type === 'pengeluaran' ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-500'}`}>
                                    {t.type === 'pengeluaran' ? <TrendingDown size={20} /> : <TrendingUp size={20} />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-slate-800 truncate group-hover:text-emerald-700 transition-colors">{t.description}</p>
                                    <p className="text-xs text-slate-500 truncate flex items-center gap-1"><Calendar size={10} /> {new Date(t.date).toLocaleDateString()}</p>
                                </div>
                                <div className={`text-sm font-bold whitespace-nowrap ${t.type === 'pengeluaran' ? 'text-red-500' : 'text-emerald-500'}`}>
                                    {t.type === 'pengeluaran' ? '-' : '+'}{formatCurrency(t.amount)}
                                </div>
                            </div>
                        )) : <div className="h-full flex items-center justify-center text-slate-400 italic text-sm">Belum ada aktivitas.</div>}
                    </div>
                </div>
            </div>
        </div>
    );
}
