import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
    Plus, Search, Trash2, Edit, FileSpreadsheet,
    Banknote, Download, X, CheckCircle, XCircle, Clock,
    Calendar, FileText, Loader2, ChevronRight
} from 'lucide-react';
import useSupabase from '../hooks/useSupabase';
import { formatCurrency, formatDate } from '../utils/helpers';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function Penyaluran() {
    const { tab } = useParams();
    const { canEdit, user } = useAuth();

    // Role flags - Support both 'pengasuh' and legacy 'user' role
    const isAdmin = user?.role === 'admin';
    const isBendahara = user?.role === 'bendahara';
    const isPengasuh = user?.role === 'pengasuh' || user?.role === 'user';

    // Determine allowed tabs based on role
    const getAllowedTabs = () => {
        if (isAdmin) return ['anggaran', 'persetujuan', 'realisasi', 'laporan'];
        if (isBendahara) return ['anggaran', 'realisasi', 'laporan'];
        if (isPengasuh) return ['persetujuan', 'laporan'];
        return ['laporan'];
    };
    const allowedTabs = getAllowedTabs();

    // Default tab based on role
    const getDefaultTab = () => {
        if (isPengasuh) return 'persetujuan';
        return 'anggaran';
    };

    const activeTab = useMemo(() => {
        if (allowedTabs.includes(tab)) return tab;
        return getDefaultTab();
    }, [tab, allowedTabs]);

    // State for data
    const { data: budgets, loading: budgetLoading, insert: insertBudget, update: updateBudget, remove: removeBudget } = useSupabase('fund_budgets', []);
    const { data: disbursements, loading: disbursementLoading, insert: insertDisbursement, update: updateDisbursement } = useSupabase('fund_disbursements', []);

    // UI State
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState('budget');
    const [saving, setSaving] = useState(false);

    // Forms
    const [budgetForm, setBudgetForm] = useState({ id: '', name: '', amount: '', description: '', period: '', status: 'pending' });
    const [disbursementForm, setDisbursementForm] = useState({ id: '', budget_id: '', amount: '', description: '', date: new Date().toISOString().split('T')[0] });

    const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

    // Helper function to check if date is within range
    const isInDateRange = (dateStr) => {
        if (!dateFilter.start && !dateFilter.end) return true;
        const date = new Date(dateStr);
        if (dateFilter.start && date < new Date(dateFilter.start)) return false;
        if (dateFilter.end && date > new Date(dateFilter.end + 'T23:59:59')) return false;
        return true;
    };

    // Filter data based on search and date
    const filteredBudgets = useMemo(() => {
        return budgets.filter(b => {
            const matchSearch = (b.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (b.description || '').toLowerCase().includes(searchTerm.toLowerCase());
            const matchDate = isInDateRange(b.created_at || b.period);
            return matchSearch && matchDate;
        });
    }, [budgets, searchTerm, dateFilter]);

    // Filter disbursements by date
    const filteredDisbursements = useMemo(() => {
        return disbursements.filter(d => isInDateRange(d.date || d.created_at));
    }, [disbursements, dateFilter]);

    // Get pending approvals (also filtered)
    const pendingApprovals = useMemo(() => filteredBudgets.filter(b => b.status === 'pending'), [filteredBudgets]);

    // Get approved budgets for disbursement
    const approvedBudgets = useMemo(() => budgets.filter(b => b.status === 'approved'), [budgets]);

    // Calculate total disbursed per budget
    const getDisbursedAmount = (budgetId) => {
        return disbursements
            .filter(d => d.budget_id === budgetId)
            .reduce((sum, d) => sum + Number(d.amount || 0), 0);
    };

    // Handlers
    const handleSaveBudget = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (budgetForm.id) {
                await updateBudget(budgetForm.id, budgetForm);
            } else {
                await insertBudget({ ...budgetForm, id: generateId() });
            }
            setIsModalOpen(false);
            setBudgetForm({ id: '', name: '', amount: '', description: '', period: '', status: 'pending' });
        } catch (err) {
            alert('Error: ' + err.message);
        }
        setSaving(false);
    };

    const handleApprove = async (budget, approved) => {
        await updateBudget(budget.id, {
            status: approved ? 'approved' : 'rejected',
            approved_by: user?.name,
            approved_at: new Date().toISOString()
        });

        await supabase.from('audit_logs').insert([{
            id: generateId(),
            action: approved ? 'APPROVE_BUDGET' : 'REJECT_BUDGET',
            details: `Anggaran "${budget.name}" ${approved ? 'disetujui' : 'ditolak'}`,
            user_name: user?.name,
            timestamp: new Date().toISOString()
        }]);
    };

    const handleSaveDisbursement = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const budget = budgets.find(b => b.id === disbursementForm.budget_id);
            await insertDisbursement({
                ...disbursementForm,
                id: generateId(),
                budget_name: budget?.name
            });

            await supabase.from('audit_logs').insert([{
                id: generateId(),
                action: 'REALISASI_DANA',
                details: `Realisasi dana ${formatCurrency(disbursementForm.amount)} untuk "${budget?.name}"`,
                user_name: user?.name,
                timestamp: new Date().toISOString()
            }]);

            setIsModalOpen(false);
            setDisbursementForm({ id: '', budget_id: '', amount: '', description: '', date: new Date().toISOString().split('T')[0] });
        } catch (err) {
            alert('Error: ' + err.message);
        }
        setSaving(false);
    };

    const getStatusBadge = (status) => {
        const styles = {
            pending: 'bg-amber-100 text-amber-700 border-amber-200',
            approved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
            rejected: 'bg-red-100 text-red-700 border-red-200'
        };
        const labels = { pending: 'Menunggu', approved: 'Disetujui', rejected: 'Ditolak' };
        return <span className={`text-xs px-2 py-1 rounded-full border font-bold ${styles[status]}`}>{labels[status]}</span>;
    };

    const loading = budgetLoading || disbursementLoading;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                <span className="ml-2 text-slate-600">Memuat data...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-amber-500 to-orange-600 p-6 rounded-2xl shadow-lg">
                <div className="text-white">
                    <h2 className="text-2xl font-bold flex items-center gap-3">
                        <Banknote size={28} /> Penyaluran Dana
                    </h2>
                    <p className="text-amber-100 text-sm mt-1">
                        {activeTab === 'anggaran' && 'Kelola anggaran penyaluran dana'}
                        {activeTab === 'persetujuan' && `${pendingApprovals.length} anggaran menunggu persetujuan`}
                        {activeTab === 'realisasi' && 'Realisasi dana yang telah disetujui'}
                        {activeTab === 'laporan' && 'Laporan penyaluran dana'}
                    </p>
                </div>
            </div>

            {/* Tabs - Conditional based on role */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                {[
                    { key: 'anggaran', label: 'Anggaran', roles: ['admin', 'bendahara'] },
                    { key: 'persetujuan', label: 'Persetujuan', roles: ['admin', 'pengasuh', 'user'] },
                    { key: 'realisasi', label: 'Realisasi', roles: ['admin', 'bendahara'] },
                    { key: 'laporan', label: 'Laporan', roles: ['admin', 'bendahara', 'pengasuh', 'user'] }
                ].filter(t => t.roles.includes(user?.role)).map(t => (
                    <a
                        key={t.key}
                        href={`/penyaluran/${t.key}`}
                        className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${activeTab === t.key
                            ? 'bg-amber-500 text-white shadow-lg'
                            : 'bg-white text-slate-600 hover:bg-amber-50 border border-slate-200'
                            }`}
                    >
                        {t.label}
                        {t.key === 'persetujuan' && pendingApprovals.length > 0 && (
                            <span className="ml-2 px-1.5 py-0.5 bg-red-500 text-white text-[10px] rounded-full">{pendingApprovals.length}</span>
                        )}
                    </a>
                ))}
            </div>

            {/* Filter Bar */}
            <div className="card-premium flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex flex-wrap items-center gap-3 flex-1">
                    <div className="relative flex-1 min-w-[180px] max-w-xs">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            className="input-field pl-10"
                            placeholder="Cari anggaran..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-slate-400" />
                        <input
                            type="date"
                            className="input-field text-sm py-2"
                            value={dateFilter.start}
                            onChange={(e) => setDateFilter({ ...dateFilter, start: e.target.value })}
                            title="Dari tanggal"
                        />
                        <span className="text-slate-400">-</span>
                        <input
                            type="date"
                            className="input-field text-sm py-2"
                            value={dateFilter.end}
                            onChange={(e) => setDateFilter({ ...dateFilter, end: e.target.value })}
                            title="Sampai tanggal"
                        />
                        {(dateFilter.start || dateFilter.end) && (
                            <button
                                onClick={() => setDateFilter({ start: '', end: '' })}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                                title="Reset filter"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>
                </div>
                <div className="flex gap-3">
                    {activeTab === 'anggaran' && (isBendahara || isAdmin) && (
                        <button
                            onClick={() => { setBudgetForm({ id: '', name: '', amount: '', description: '', period: '', status: 'pending' }); setModalType('budget'); setIsModalOpen(true); }}
                            className="btn-primary bg-amber-500 hover:bg-amber-600"
                        >
                            <Plus size={16} /> Tambah Anggaran
                        </button>
                    )}
                    {activeTab === 'realisasi' && (isBendahara || isAdmin) && approvedBudgets.length > 0 && (
                        <button
                            onClick={() => { setDisbursementForm({ id: '', budget_id: '', amount: '', description: '', date: new Date().toISOString().split('T')[0] }); setModalType('disbursement'); setIsModalOpen(true); }}
                            className="btn-primary bg-emerald-500 hover:bg-emerald-600"
                        >
                            <Plus size={16} /> Realisasi Dana
                        </button>
                    )}
                </div>
            </div>

            {/* Content */}
            {activeTab === 'anggaran' && (
                <div className="space-y-3">
                    {filteredBudgets.length > 0 ? filteredBudgets.map(b => (
                        <div key={b.id} className="group card-premium flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center">
                                    <Banknote size={24} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-800">{b.name}</h4>
                                    <p className="text-sm text-slate-500">{b.description || 'Tidak ada deskripsi'}</p>
                                    <p className="text-xs text-slate-400">{b.period}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <p className="font-bold text-amber-600 text-lg">{formatCurrency(b.amount)}</p>
                                    {getStatusBadge(b.status)}
                                </div>
                                {(isBendahara || isAdmin) && (
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => { setBudgetForm(b); setModalType('budget'); setIsModalOpen(true); }} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg">
                                            <Edit size={16} />
                                        </button>
                                        <button onClick={() => confirm('Hapus anggaran ini?') && removeBudget(b.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )) : (
                        <div className="text-center py-16 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                            <Banknote size={48} className="mx-auto text-slate-300 mb-3" />
                            <p className="text-slate-400">Belum ada anggaran</p>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'persetujuan' && (
                <div className="space-y-3">
                    {pendingApprovals.length > 0 ? pendingApprovals.map(b => (
                        <div key={b.id} className="card-premium flex flex-col md:flex-row md:items-center justify-between gap-4 border-l-4 border-amber-500">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center">
                                    <Clock size={24} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-800">{b.name}</h4>
                                    <p className="text-sm text-slate-500">{b.description}</p>
                                    <p className="text-xs text-slate-400">Periode: {b.period}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <p className="font-bold text-amber-600 text-lg">{formatCurrency(b.amount)}</p>
                                {(isPengasuh || isAdmin) && (
                                    <div className="flex gap-2">
                                        <button onClick={() => handleApprove(b, true)} className="btn-primary bg-emerald-500 hover:bg-emerald-600 py-2 px-4">
                                            <CheckCircle size={16} /> Setujui
                                        </button>
                                        <button onClick={() => handleApprove(b, false)} className="btn-secondary text-red-500 border-red-200 hover:bg-red-50 py-2 px-4">
                                            <XCircle size={16} /> Tolak
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )) : (
                        <div className="text-center py-16 bg-emerald-50 rounded-3xl border border-dashed border-emerald-200">
                            <CheckCircle size={48} className="mx-auto text-emerald-300 mb-3" />
                            <p className="text-emerald-600 font-medium">Semua anggaran sudah diproses</p>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'realisasi' && (
                <div className="space-y-4">
                    {approvedBudgets.length > 0 ? approvedBudgets.map(b => {
                        const disbursed = getDisbursedAmount(b.id);
                        const remaining = Number(b.amount) - disbursed;
                        const percentage = (disbursed / Number(b.amount)) * 100;

                        return (
                            <div key={b.id} className="card-premium">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h4 className="font-bold text-slate-800">{b.name}</h4>
                                        <p className="text-sm text-slate-500">{b.period}</p>
                                    </div>
                                    <p className="font-bold text-amber-600">{formatCurrency(b.amount)}</p>
                                </div>
                                <div className="bg-slate-100 rounded-full h-3 mb-2">
                                    <div
                                        className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-3 rounded-full transition-all"
                                        style={{ width: `${Math.min(percentage, 100)}%` }}
                                    ></div>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-emerald-600">Terealisasi: {formatCurrency(disbursed)} ({percentage.toFixed(1)}%)</span>
                                    <span className="text-slate-500">Sisa: {formatCurrency(remaining)}</span>
                                </div>
                            </div>
                        );
                    }) : (
                        <div className="text-center py-16 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                            <Banknote size={48} className="mx-auto text-slate-300 mb-3" />
                            <p className="text-slate-400">Belum ada anggaran yang disetujui</p>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'laporan' && (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="card-premium bg-gradient-to-br from-amber-500 to-orange-600 text-white border-none">
                            <p className="text-amber-100 text-sm">Total Anggaran {dateFilter.start || dateFilter.end ? '(Filtered)' : ''}</p>
                            <p className="text-2xl font-bold">{formatCurrency(filteredBudgets.reduce((s, b) => s + Number(b.amount || 0), 0))}</p>
                        </div>
                        <div className="card-premium bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-none">
                            <p className="text-emerald-100 text-sm">Total Terealisasi {dateFilter.start || dateFilter.end ? '(Filtered)' : ''}</p>
                            <p className="text-2xl font-bold">{formatCurrency(filteredDisbursements.reduce((s, d) => s + Number(d.amount || 0), 0))}</p>
                        </div>
                        <div className="card-premium bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-none">
                            <p className="text-blue-100 text-sm">Anggaran Disetujui</p>
                            <p className="text-2xl font-bold">{approvedBudgets.length}</p>
                        </div>
                    </div>

                    <div className="card-premium">
                        <h3 className="font-bold text-slate-800 mb-4">Riwayat Realisasi {dateFilter.start || dateFilter.end ? `(${filteredDisbursements.length} data)` : ''}</h3>
                        {filteredDisbursements.length > 0 ? (
                            <div className="space-y-2">
                                {filteredDisbursements.slice().reverse().map(d => (
                                    <div key={d.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                                        <div>
                                            <p className="font-medium text-slate-800">{d.budget_name}</p>
                                            <p className="text-xs text-slate-500">{formatDate(d.date)} - {d.description}</p>
                                        </div>
                                        <p className="font-bold text-emerald-600">{formatCurrency(d.amount)}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-center text-slate-400 py-8">Belum ada realisasi</p>
                        )}
                    </div>
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="p-5 border-b flex justify-between items-center bg-amber-50">
                            <h3 className="font-bold text-lg text-slate-800">
                                {modalType === 'budget' ? (budgetForm.id ? 'Edit Anggaran' : 'Tambah Anggaran') : 'Realisasi Dana'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-red-50 hover:text-red-500 rounded-full">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-5">
                            {modalType === 'budget' && (
                                <form onSubmit={handleSaveBudget} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Nama Anggaran</label>
                                        <input required className="input-field" placeholder="Nama anggaran" value={budgetForm.name} onChange={e => setBudgetForm({ ...budgetForm, name: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Jumlah</label>
                                        <input type="number" required className="input-field" placeholder="0" value={budgetForm.amount} onChange={e => setBudgetForm({ ...budgetForm, amount: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Periode</label>
                                        <input type="month" className="input-field" value={budgetForm.period} onChange={e => setBudgetForm({ ...budgetForm, period: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Deskripsi</label>
                                        <textarea className="input-field" rows={3} placeholder="Deskripsi anggaran" value={budgetForm.description} onChange={e => setBudgetForm({ ...budgetForm, description: e.target.value })} />
                                    </div>
                                    <button type="submit" disabled={saving} className="btn-primary w-full bg-amber-500 hover:bg-amber-600">
                                        {saving ? <><Loader2 className="animate-spin" size={16} /> Menyimpan...</> : 'Simpan'}
                                    </button>
                                </form>
                            )}

                            {modalType === 'disbursement' && (
                                <form onSubmit={handleSaveDisbursement} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Pilih Anggaran</label>
                                        <select required className="input-field" value={disbursementForm.budget_id} onChange={e => setDisbursementForm({ ...disbursementForm, budget_id: e.target.value })}>
                                            <option value="">-- Pilih Anggaran --</option>
                                            {approvedBudgets.map(b => (
                                                <option key={b.id} value={b.id}>{b.name} - Sisa: {formatCurrency(Number(b.amount) - getDisbursedAmount(b.id))}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Jumlah Realisasi</label>
                                        <input type="number" required className="input-field" placeholder="0" value={disbursementForm.amount} onChange={e => setDisbursementForm({ ...disbursementForm, amount: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Tanggal</label>
                                        <input type="date" required className="input-field" value={disbursementForm.date} onChange={e => setDisbursementForm({ ...disbursementForm, date: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Keterangan</label>
                                        <textarea className="input-field" rows={2} placeholder="Keterangan realisasi" value={disbursementForm.description} onChange={e => setDisbursementForm({ ...disbursementForm, description: e.target.value })} />
                                    </div>
                                    <button type="submit" disabled={saving} className="btn-primary w-full">
                                        {saving ? <><Loader2 className="animate-spin" size={16} /> Menyimpan...</> : 'Simpan Realisasi'}
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
