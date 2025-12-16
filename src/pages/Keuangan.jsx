import { useState, useMemo, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
    ArrowUp, ArrowDown, Calendar, Search,
    Download, Trash2, Plus, FileSpreadsheet, Wallet, Edit, X, Loader2
} from 'lucide-react';
import useSupabase from '../hooks/useSupabase';
import { formatCurrency, formatDate } from '../utils/helpers';
import { supabase } from '../lib/supabase';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import Logo from '../assets/logo.png';
import { useAuth } from '../contexts/AuthContext';

export default function Keuangan() {
    const { tab } = useParams();
    const { canEdit } = useAuth();

    // Supabase hooks
    const { data: transactions, loading: txLoading, insert: insertTx, update: updateTx, remove: removeTx } = useSupabase('transactions', []);
    const { data: categories } = useSupabase('payment_categories', []);

    // Filters
    const [typeFilter, setTypeFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
    const [categoryFilter, setCategoryFilter] = useState('');

    // Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('add');
    const [form, setForm] = useState({ id: '', type: 'pemasukan', amount: '', description: '', date: new Date().toISOString().slice(0, 10), category: '' });
    const [saving, setSaving] = useState(false);

    // Sync URL tab with filter
    useEffect(() => {
        if (tab && ['pemasukan', 'pengeluaran'].includes(tab)) {
            setTypeFilter(tab);
        } else {
            setTypeFilter('all');
        }
        // Reset category filter when tab changes
        setCategoryFilter('');
    }, [tab]);

    // Filtered data
    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            if (typeFilter !== 'all' && t.type !== typeFilter) return false;
            if (search && !t.description?.toLowerCase().includes(search.toLowerCase())) return false;
            if (dateFilter.start && t.date < dateFilter.start) return false;
            if (dateFilter.end && t.date > dateFilter.end) return false;
            if (categoryFilter && t.category !== categoryFilter) return false;
            return true;
        }).sort((a, b) => new Date(b.date) - new Date(a.date));
    }, [transactions, typeFilter, search, dateFilter, categoryFilter]);

    // Get unique categories from transactions based on type filter
    const filteredCategories = useMemo(() => {
        // Get all unique categories with their types from transactions
        const categoryMap = {};
        transactions.forEach(t => {
            if (t.category && t.type) {
                if (!categoryMap[t.category]) {
                    categoryMap[t.category] = new Set();
                }
                categoryMap[t.category].add(t.type);
            }
        });

        // Filter categories based on current type filter
        if (typeFilter === 'all') {
            return [...new Set(transactions.map(t => t.category).filter(Boolean))];
        }

        // Return only categories that have been used with the current type
        return Object.entries(categoryMap)
            .filter(([, types]) => types.has(typeFilter))
            .map(([name]) => name);
    }, [transactions, typeFilter]);

    const totalIncome = useMemo(() => filteredTransactions.filter(t => t.type === 'pemasukan').reduce((sum, t) => sum + Number(t.amount), 0), [filteredTransactions]);
    const totalExpense = useMemo(() => filteredTransactions.filter(t => t.type === 'pengeluaran').reduce((sum, t) => sum + Number(t.amount), 0), [filteredTransactions]);

    // Helpers
    const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

    const getImageBase64 = (imgUrl) => new Promise(resolve => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = imgUrl;
        img.onload = () => {
            try {
                const c = document.createElement('canvas');
                c.width = img.width;
                c.height = img.height;
                c.getContext('2d').drawImage(img, 0, 0);
                resolve(c.toDataURL('image/png'));
            } catch (e) { resolve(null); }
        };
        img.onerror = () => resolve(null);
    });

    const logActivity = async (action, details) => {
        await supabase.from('audit_logs').insert([{
            id: generateId(),
            action,
            details,
            user_name: 'Bendahara',
            timestamp: new Date().toISOString()
        }]);
    };

    // Actions
    const openAddModal = () => {
        setForm({ id: '', type: 'pemasukan', amount: '', description: '', date: new Date().toISOString().slice(0, 10), category: '' });
        setModalMode('add');
        setIsModalOpen(true);
    };

    const openEditModal = (t) => {
        setForm({ ...t, amount: String(t.amount) });
        setModalMode('edit');
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (modalMode === 'add') {
                await insertTx({
                    id: generateId(),
                    type: form.type,
                    amount: Number(form.amount),
                    description: form.description,
                    date: form.date,
                    category: form.category
                });
                await logActivity('TAMBAH_TRANSAKSI', `${form.type}: ${form.description}`);
            } else {
                await updateTx(form.id, {
                    type: form.type,
                    amount: Number(form.amount),
                    description: form.description,
                    date: form.date,
                    category: form.category
                });
                await logActivity('EDIT_TRANSAKSI', `${form.type}: ${form.description}`);
            }
            setIsModalOpen(false);
        } catch (err) {
            alert('Gagal menyimpan: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (confirm('Hapus transaksi ini?')) {
            await removeTx(id);
            await logActivity('HAPUS_TRANSAKSI', `ID: ${id}`);
        }
    };

    const exportPDF = async () => {
        try {
            // Fetch fresh data from Supabase
            let query = supabase.from('transactions').select('*').order('date', { ascending: false });

            // Apply filters
            if (typeFilter !== 'all') {
                query = query.eq('type', typeFilter);
            }
            if (dateFilter.start) {
                query = query.gte('date', dateFilter.start);
            }
            if (dateFilter.end) {
                query = query.lte('date', dateFilter.end);
            }
            if (categoryFilter) {
                query = query.eq('category', categoryFilter);
            }

            const { data: txData, error } = await query;

            if (error) {
                alert('Gagal mengambil data: ' + error.message);
                return;
            }

            if (!txData || txData.length === 0) {
                alert('Tidak ada data untuk didownload');
                return;
            }

            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();

            try {
                const logo = await getImageBase64(Logo);
                if (logo) doc.addImage(logo, 'PNG', 14, 10, 18, 18);
            } catch (e) { }

            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            doc.text("PTQA BATUAN", 36, 16);
            doc.setFontSize(9);
            doc.setFont("helvetica", "normal");
            doc.text("Sistem Informasi Keuangan Pesantren", 36, 22);

            doc.setDrawColor(16, 185, 129);
            doc.setLineWidth(0.5);
            doc.line(14, 32, pageWidth - 14, 32);

            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            const title = typeFilter === 'pemasukan' ? 'LAPORAN PEMASUKAN' :
                typeFilter === 'pengeluaran' ? 'LAPORAN PENGELUARAN' : 'LAPORAN KEUANGAN';
            doc.text(title, pageWidth / 2, 42, { align: 'center' });

            doc.setFontSize(9);
            doc.setFont("helvetica", "normal");
            doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}`, pageWidth / 2, 48, { align: 'center' });

            const rows = txData.map(t => [
                formatDate(t.date),
                (t.description || '').substring(0, 35),
                t.type === 'pemasukan' ? 'Masuk' : 'Keluar',
                t.category || '-',
                formatCurrency(Number(t.amount))
            ]);

            autoTable(doc, {
                startY: 55,
                head: [['Tanggal', 'Keterangan', 'Tipe', 'Kategori', 'Jumlah']],
                body: rows,
                theme: 'striped',
                headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold' },
                styles: { fontSize: 9 },
            });

            // Calculate totals
            const income = txData.filter(t => t.type === 'pemasukan').reduce((sum, t) => sum + Number(t.amount), 0);
            const expense = txData.filter(t => t.type === 'pengeluaran').reduce((sum, t) => sum + Number(t.amount), 0);

            const finalY = (doc).lastAutoTable.finalY + 10;
            doc.setFillColor(240, 253, 244);
            doc.rect(14, finalY, pageWidth - 28, 25, 'F');
            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(16, 185, 129);
            doc.text(`Total Pemasukan: ${formatCurrency(income)}`, 20, finalY + 8);
            doc.setTextColor(239, 68, 68);
            doc.text(`Total Pengeluaran: ${formatCurrency(expense)}`, 20, finalY + 15);
            doc.setTextColor(30, 41, 59);
            doc.text(`Saldo: ${formatCurrency(income - expense)}`, 20, finalY + 22);

            doc.save(`Laporan_${title.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
        } catch (err) {
            console.error('Export error:', err);
            alert('Terjadi kesalahan saat export: ' + err.message);
        }
    };

    if (txLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                <span className="ml-2 text-slate-600">Memuat data...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                        <Wallet size={28} className="text-emerald-600" /> Manajemen Keuangan
                    </h2>
                    <p className="text-slate-500 text-sm mt-1">Data tersinkronisasi dengan Supabase</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={exportPDF} className="btn-secondary text-xs"><Download size={14} /> Download Data</button>
                    {canEdit && <button onClick={openAddModal} className="btn-primary text-xs"><Plus size={14} /> Transaksi Baru</button>}
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="card-premium bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-none shadow-lg">
                    <div className="flex justify-between items-start opacity-80 mb-2">
                        <span className="font-medium text-sm">Pemasukan</span>
                        <ArrowUp size={20} />
                    </div>
                    <div className="text-2xl font-bold tracking-tight">{formatCurrency(totalIncome)}</div>
                </div>
                <div className="card-premium bg-gradient-to-br from-rose-500 to-rose-600 text-white border-none shadow-lg">
                    <div className="flex justify-between items-start opacity-80 mb-2">
                        <span className="font-medium text-sm">Pengeluaran</span>
                        <ArrowDown size={20} />
                    </div>
                    <div className="text-2xl font-bold tracking-tight">{formatCurrency(totalExpense)}</div>
                </div>
                <div className="card-premium bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-none shadow-lg">
                    <div className="flex justify-between items-start opacity-80 mb-2">
                        <span className="font-medium text-sm">Saldo Total</span>
                        <Wallet size={20} />
                    </div>
                    <div className="text-2xl font-bold tracking-tight">{formatCurrency(totalIncome - totalExpense)}</div>
                </div>
            </div>

            {/* Filters */}
            <div className="card-premium sticky top-0 z-10 bg-white/95 backdrop-blur">
                <div className="flex flex-col lg:flex-row gap-4 justify-between items-center">
                    <div className="flex gap-2 w-full lg:w-auto overflow-x-auto pb-2 lg:pb-0">
                        {['all', 'pemasukan', 'pengeluaran'].map(type => (
                            <button
                                key={type}
                                onClick={() => setTypeFilter(type)}
                                className={`px-4 py-2 rounded-xl text-sm font-bold capitalize transition-all whitespace-nowrap ${typeFilter === type ? 'bg-slate-800 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                            >
                                {type === 'all' ? 'Semua' : type}
                            </button>
                        ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                        <div className="relative flex-1 min-w-[180px]">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input className="input-field pl-9 py-2 text-sm" placeholder="Cari transaksi..." value={search} onChange={e => setSearch(e.target.value)} />
                        </div>
                        <select className="input-field w-auto py-2 text-sm max-w-[150px]" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
                            <option value="">Semua Kategori</option>
                            {filteredCategories.map(name => <option key={name} value={name}>{name}</option>)}
                        </select>
                        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
                            <input type="date" className="bg-transparent border-none text-xs w-28 outline-none text-slate-600 font-medium" value={dateFilter.start} onChange={e => setDateFilter({ ...dateFilter, start: e.target.value })} />
                            <span className="text-slate-400">-</span>
                            <input type="date" className="bg-transparent border-none text-xs w-28 outline-none text-slate-600 font-medium" value={dateFilter.end} onChange={e => setDateFilter({ ...dateFilter, end: e.target.value })} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Transactions List */}
            <div className="space-y-3">
                {filteredTransactions.length > 0 ? filteredTransactions.map((t) => (
                    <div key={t.id} className="group flex flex-col md:flex-row md:items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 hover:border-emerald-200 hover:shadow-md transition-all duration-300">
                        <div className="flex items-center gap-4 mb-3 md:mb-0">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${t.type === 'pemasukan' ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}>
                                {t.type === 'pemasukan' ? <ArrowUp size={24} /> : <ArrowDown size={24} />}
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-800 text-base">{t.description}</h4>
                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                    <span className="text-xs font-mono text-slate-500 flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded border border-slate-100"><Calendar size={10} /> {formatDate(t.date)}</span>
                                    <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">{t.category}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center justify-between md:justify-end gap-4 w-full md:w-auto mt-2 md:mt-0 pt-3 md:pt-0 border-t md:border-none border-dashed border-slate-100">
                            <span className={`font-bold text-lg font-mono ${t.type === 'pemasukan' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {t.type === 'pemasukan' ? '+' : '-'}{formatCurrency(t.amount)}
                            </span>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {canEdit && (
                                    <>
                                        <button onClick={() => openEditModal(t)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="Edit"><Edit size={16} /></button>
                                        <button onClick={() => handleDelete(t.id)} className="p-2 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Hapus"><Trash2 size={16} /></button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )) : (
                    <div className="text-center py-16 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                        <FileSpreadsheet size={48} className="mx-auto text-slate-300 mb-3" />
                        <p className="text-slate-500 font-medium">Tidak ada data transaksi ditemukan</p>
                        <p className="text-slate-400 text-sm">Coba ubah filter atau tambah transaksi baru</p>
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-lg text-slate-800">{modalMode === 'add' ? 'Transaksi Baru' : 'Edit Transaksi'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-5 space-y-4">
                            <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
                                {['pemasukan', 'pengeluaran'].map(t => (
                                    <button type="button" key={t} onClick={() => setForm({ ...form, type: t })} className={`flex-1 py-2 rounded-lg text-sm font-bold capitalize transition-all ${form.type === t ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{t}</button>
                                ))}
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Jumlah (Rp)</label>
                                <input type="number" required className="input-field text-lg font-mono" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Kategori</label>
                                <select className="input-field" required value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                                    <option value="">-- Pilih Kategori --</option>
                                    {categories.filter(c => c.type === form.type).map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                    <option value="Lainnya">Lainnya</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Keterangan</label>
                                <textarea required className="input-field min-h-[80px]" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Deskripsi transaksi..."></textarea>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Tanggal</label>
                                <input type="date" required className="input-field" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                            </div>
                            <button type="submit" disabled={saving} className="btn-primary w-full py-3 disabled:opacity-50">
                                {saving ? <><Loader2 className="animate-spin" size={16} /> Menyimpan...</> : (modalMode === 'add' ? 'Simpan Transaksi' : 'Update Transaksi')}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
