import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
    Plus, Search, Trash2, Edit, FileSpreadsheet,
    User, Printer, MessageCircle, Download,
    X, CreditCard, CheckCircle, Calendar, FileText, Loader2
} from 'lucide-react';
import useSupabase from '../hooks/useSupabase';
import { formatCurrency, formatDate } from '../utils/helpers';
import { supabase } from '../lib/supabase';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import Logo from '../assets/logo.png';
import { useAuth } from '../contexts/AuthContext';

export default function Santri() {
    const { tab } = useParams();
    const { canEdit } = useAuth();
    const activeTab = useMemo(() =>
        ['data', 'tagihan', 'kategori', 'pembayaran', 'laporan'].includes(tab) ? tab : 'data',
        [tab]);

    // Supabase Data Hooks
    const { data: students, loading: studentsLoading, insert: insertStudent, update: updateStudent, remove: removeStudent } = useSupabase('students', []);
    const { data: transactions, insert: insertTransaction } = useSupabase('transactions', []);
    const { data: categories, insert: insertCategory, update: updateCategory, remove: removeCategory } = useSupabase('payment_categories', []);
    const { data: bills, insert: insertBill, update: updateBill, remove: removeBill } = useSupabase('student_bills', []);

    // UI States
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState('student');
    const [saving, setSaving] = useState(false);

    // Forms
    const [studentForm, setStudentForm] = useState({ id: '', nis: '', name: '', kelas: '', angkatan: '', parent_name: '', phone: '', status: 'Aktif' });
    const [categoryForm, setCategoryForm] = useState({ id: '', name: '', amount: '', type: 'pembayaran' });
    const [billForm, setBillForm] = useState({ month: new Date().toISOString().slice(0, 7), categoryId: '', amount: '', targets: [] });
    const [editBillData, setEditBillData] = useState(null);

    // Filters
    const [billFilter, setBillFilter] = useState({ start: '', end: '' });
    const [billSearchCategory, setBillSearchCategory] = useState('');
    const [billStatusFilter, setBillStatusFilter] = useState('');
    const [categorySearch, setCategorySearch] = useState('');
    const [categoryTypeFilter, setCategoryTypeFilter] = useState('');
    const [paymentSearch, setPaymentSearch] = useState('');
    const [lastPayment, setLastPayment] = useState(null);
    const [reportFilter, setReportFilter] = useState({
        start: new Date().toISOString().slice(0, 8) + '01',
        end: new Date().toISOString().slice(0, 10)
    });
    const [reportStudentFilter, setReportStudentFilter] = useState('');

    // Helpers
    const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

    const getImageBase64 = (imgUrl) => new Promise(resolve => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = imgUrl;
        img.onload = () => {
            try {
                const c = document.createElement('canvas');
                c.width = img.width; c.height = img.height;
                c.getContext('2d').drawImage(img, 0, 0);
                resolve(c.toDataURL('image/png'));
            } catch (e) { resolve(null); }
        };
        img.onerror = () => resolve(null);
    });

    const logActivity = async (action, details) => {
        await supabase.from('audit_logs').insert([{ id: generateId(), action, details, user_name: 'Bendahara', timestamp: new Date().toISOString() }]);
    };

    const sendWA = (phone, message) => {
        if (!phone) return alert("Nomor HP tidak valid");
        let number = phone.replace(/\D/g, '');
        if (number.startsWith('0')) number = '62' + number.slice(1);
        window.open(`https://wa.me/${number}?text=${encodeURIComponent(message)}`, '_blank');
    };

    // Get month name in Indonesian
    const getMonthName = (monthStr, includeYear = false) => {
        const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        if (!monthStr) return '';
        const parts = monthStr.split('-');
        if (parts.length >= 2) {
            const monthIndex = parseInt(parts[1]) - 1;
            if (includeYear) {
                return months[monthIndex] + ' ' + parts[0];
            }
            return months[monthIndex];
        }
        return monthStr;
    };

    // WhatsApp message for unpaid bills (reminder)
    const sendWAReminder = (student, bill) => {
        const message = `Assalamu'alaikum Wr. Wb.

Yth. Wali Santri ${student.name}

Kami sampaikan pengingat pembayaran:

TAGIHAN PEMBAYARAN
* Nama Santri: ${student.name}
* Jenis: ${bill.category_name}
* Periode: ${getMonthName(bill.month)}
* Jumlah: ${formatCurrency(bill.amount)}
* Status: BELUM LUNAS

Mohon segera melakukan pembayaran. Jazakumullah khairan.

Pondok Pesantren Tahfizh Qur'an Al-Usymuni`;
        sendWA(student.phone, message);
    };

    // WhatsApp message for paid bills (receipt)
    const sendWAReceipt = (student, bill) => {
        const today = new Date();
        const dateStr = today.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
        const message = `Assalamu'alaikum Wr. Wb.

Yth. Bapak/Ibu ${student.parent_name || student.name}

Terima kasih atas pembayaran ${bill.category_name} santri ${student.name}.

BUKTI PEMBAYARAN
* Jenis: ${bill.category_name}
* Periode: ${getMonthName(bill.month, true)}
* Jumlah: ${formatCurrency(bill.amount)}
* Status: LUNAS
* Tanggal: ${dateStr}

Barakallahu fiikum.

Pondok Tahfizh Qur'an Al-Usymuni`;
        sendWA(student.phone, message);
    };

    // Computed Data
    const filteredBills = useMemo(() => {
        return bills.filter(b => {
            if (billFilter.start && (b.month || '') < billFilter.start) return false;
            if (billFilter.end && (b.month || '') > billFilter.end) return false;
            if (billSearchCategory && b.category_id !== billSearchCategory) return false;
            if (billStatusFilter && b.status !== billStatusFilter) return false;
            return true;
        }).sort((a, b) => (b.month || '').localeCompare(a.month || ''));
    }, [bills, billFilter, billSearchCategory, billStatusFilter]);

    const activeStudent = useMemo(() => students.find(s => s.id === paymentSearch), [students, paymentSearch]);
    const unpaidBills = useMemo(() => activeStudent ? bills.filter(b => b.student_id === activeStudent.id && b.status === 'Belum Lunas') : [], [bills, activeStudent]);
    const paidBills = useMemo(() => activeStudent ? bills.filter(b => b.student_id === activeStudent.id && b.status === 'Lunas') : [], [bills, activeStudent]);

    // Report data - use paid bills (Lunas) from all students
    const reportData = useMemo(() => {
        return bills.filter(b => {
            if (b.status !== 'Lunas') return false;
            // Filter by student
            if (reportStudentFilter && b.student_id !== reportStudentFilter) return false;
            // Filter by paid_at date (real payment date)
            const paymentDate = b.paid_at || (b.updated_at ? b.updated_at.split('T')[0] : b.month + '-01');
            if (reportFilter.start && paymentDate < reportFilter.start) return false;
            if (reportFilter.end && paymentDate > reportFilter.end) return false;
            return true;
        }).map(b => ({
            id: b.id,
            date: b.paid_at || (b.updated_at ? b.updated_at.split('T')[0] : b.month + '-01'), // Priority: paid_at > updated_at > month
            period: b.month,
            student_name: b.student_name,
            student_id: b.student_id,
            category: b.category_name,
            amount: b.amount
        })).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    }, [bills, reportFilter, reportStudentFilter]);

    // PDF Functions
    const generateReceiptPDF = async (tx) => {
        const doc = new jsPDF({ format: 'a5', unit: 'mm' });
        const pw = doc.internal.pageSize.getWidth();
        const ph = doc.internal.pageSize.getHeight();

        // Get student data for NIS
        const student = students.find(s => s.id === tx.student_id) || {};

        doc.setDrawColor(16, 185, 129); doc.setLineWidth(1);
        doc.rect(5, 5, pw - 10, ph - 10);
        doc.setLineWidth(0.3); doc.rect(7, 7, pw - 14, ph - 14);

        try { const logo = await getImageBase64(Logo); if (logo) doc.addImage(logo, 'PNG', 12, 12, 22, 22); } catch (e) { }

        doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.setTextColor(16, 185, 129);
        doc.text("PTQA BATUAN", 38, 18);
        doc.setFontSize(8); doc.setTextColor(100, 116, 139); doc.setFont("helvetica", "normal");
        doc.text("Pondok Pesantren Tahfizh Qur'an Al-Usymuni", 38, 24);
        doc.text("Batuan, Kabupaten Sumenep, Jawa Timur", 38, 29);

        doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.5);
        doc.line(12, 38, pw - 12, 38);

        doc.setFontSize(14); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 41, 59);
        doc.text("BUKTI PEMBAYARAN", pw / 2, 48, { align: 'center' });
        doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(148, 163, 184);
        doc.text(`No. ${(tx.id || '').substring(0, 10).toUpperCase()}`, pw / 2, 54, { align: 'center' });

        doc.setTextColor(30, 41, 59); doc.setFontSize(10);
        let y = 64;
        doc.text("Tanggal", 15, y); doc.text(`: ${formatDate(tx.date)}`, 55, y); y += 7;
        doc.text("Nama Santri", 15, y); doc.setFont("helvetica", "bold"); doc.text(`: ${tx.student_name}`, 55, y); y += 7;
        doc.setFont("helvetica", "normal");
        doc.text("NIS", 15, y); doc.text(`: ${tx.student_nis || student.nis || '-'}`, 55, y); y += 7;
        doc.text("Jenis Pembayaran", 15, y); doc.text(`: ${tx.category}`, 55, y); y += 7;
        // Format periode properly
        const periodeText = tx.month ? getMonthName(tx.month, true) : (tx.period ? getMonthName(tx.period, true) : '-');
        doc.text("Periode", 15, y); doc.text(`: ${periodeText}`, 55, y); y += 7;
        doc.text("Status", 15, y); doc.setFont("helvetica", "bold"); doc.setTextColor(16, 185, 129); doc.text(`: LUNAS`, 55, y); y += 10;

        doc.setFillColor(240, 253, 244); doc.setDrawColor(16, 185, 129); doc.setLineWidth(0.5);
        doc.roundedRect(12, y, pw - 24, 18, 3, 3, 'FD');
        doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(16, 185, 129);
        doc.text("JUMLAH TERBAYAR", 18, y + 7);
        doc.setFontSize(14); doc.text(formatCurrency(tx.amount), pw - 18, y + 13, { align: 'right' });
        y += 25;

        // Barakallahu fiikum
        doc.setFontSize(10); doc.setFont("helvetica", "italic"); doc.setTextColor(100, 116, 139);
        doc.text("Barakallahu fiikum", pw / 2, y, { align: 'center' });
        y += 20;

        // Bendahara signature - CENTERED
        doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(30, 41, 59);
        doc.text("BENDAHARA PONDOK", pw / 2, y, { align: 'center' });
        y += 15;
        doc.setFont("helvetica", "bold");
        doc.text("UST. MIFTAHUL JANNAH", pw / 2, y, { align: 'center' });

        // Footer note
        doc.setFontSize(7); doc.setTextColor(148, 163, 184); doc.setFont("helvetica", "normal");
        doc.text("Kwitansi ini sah sebagai bukti pembayaran.", pw / 2, ph - 12, { align: 'center' });

        doc.save(`Kwitansi_${(tx.student_name || 'Santri').replace(/\s/g, '_')}.pdf`);
    };

    const exportBillsPDF = async () => {
        try {
            // Fetch fresh data from Supabase
            let query = supabase.from('student_bills').select('*').order('month', { ascending: false });

            // Apply filters
            if (billFilter.start) {
                query = query.gte('month', billFilter.start);
            }
            if (billFilter.end) {
                query = query.lte('month', billFilter.end);
            }
            if (billSearchCategory) {
                query = query.eq('category_id', billSearchCategory);
            }
            if (billStatusFilter) {
                query = query.eq('status', billStatusFilter);
            }

            const { data: billsData, error } = await query;

            if (error) {
                alert('Gagal mengambil data: ' + error.message);
                return;
            }

            if (!billsData || billsData.length === 0) {
                alert('Tidak ada data tagihan untuk didownload');
                return;
            }

            const doc = new jsPDF();
            try { const logo = await getImageBase64(Logo); if (logo) doc.addImage(logo, 'PNG', 14, 10, 15, 15); } catch (e) { }

            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            doc.text("PTQA BATUAN - Laporan Tagihan Santri", 35, 20);
            doc.setFontSize(9);
            doc.setFont("helvetica", "normal");
            doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}`, 35, 26);

            autoTable(doc, {
                startY: 35,
                head: [['Periode', 'Santri', 'Kategori', 'Jumlah', 'Status']],
                body: billsData.map(b => [b.month, b.student_name, b.category_name, formatCurrency(Number(b.amount)), b.status]),
                headStyles: { fillColor: [16, 185, 129] },
                styles: { fontSize: 9 }
            });

            // Summary
            const totalTagihan = billsData.reduce((sum, b) => sum + Number(b.amount), 0);
            const lunas = billsData.filter(b => b.status === 'Lunas').length;
            const belumLunas = billsData.filter(b => b.status === 'Belum Lunas').length;

            const finalY = (doc).lastAutoTable.finalY + 10;
            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            doc.text(`Total Tagihan: ${formatCurrency(totalTagihan)}`, 14, finalY);
            doc.text(`Lunas: ${lunas} | Belum Lunas: ${belumLunas}`, 14, finalY + 6);

            doc.save(`Laporan_Tagihan_${new Date().toISOString().split('T')[0]}.pdf`);
        } catch (err) {
            console.error('Export error:', err);
            alert('Terjadi kesalahan: ' + err.message);
        }
    };

    const exportReportPDF = async () => {
        try {
            // Fetch paid bills from Supabase - bills with status 'Lunas'
            let query = supabase
                .from('student_bills')
                .select('*')
                .eq('status', 'Lunas')
                .order('paid_at', { ascending: false });

            // Apply student filter
            if (reportStudentFilter) {
                query = query.eq('student_id', reportStudentFilter);
            }

            // Apply date filters (using paid_at field)
            if (reportFilter.start) {
                query = query.gte('paid_at', reportFilter.start);
            }
            if (reportFilter.end) {
                query = query.lte('paid_at', reportFilter.end + 'T23:59:59');
            }

            const { data: billsData, error } = await query;

            if (error) {
                alert('Gagal mengambil data: ' + error.message);
                return;
            }

            if (!billsData || billsData.length === 0) {
                alert('Tidak ada data pembayaran dalam periode ini');
                return;
            }

            const doc = new jsPDF();
            try { const logo = await getImageBase64(Logo); if (logo) doc.addImage(logo, 'PNG', 14, 10, 15, 15); } catch (e) { }

            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            doc.text("PTQA BATUAN - Laporan Pembayaran Santri", 35, 20);
            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            const studentName = reportStudentFilter ? students.find(s => s.id === reportStudentFilter)?.name : 'Semua Santri';
            doc.text(`Santri: ${studentName}`, 35, 26);
            doc.text(`Periode: ${formatDate(reportFilter.start)} s/d ${formatDate(reportFilter.end)}`, 35, 31);
            doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}`, 35, 36);

            autoTable(doc, {
                startY: 45,
                head: [['Tgl Bayar', 'Periode', 'Santri', 'Kategori', 'Jumlah']],
                body: billsData.map(b => [
                    formatDate(b.paid_at || (b.updated_at ? b.updated_at.split('T')[0] : b.month + '-01')),
                    getMonthName(b.month, true),
                    b.student_name || '-',
                    b.category_name || '-',
                    formatCurrency(Number(b.amount))
                ]),
                headStyles: { fillColor: [16, 185, 129] },
                styles: { fontSize: 9 }
            });

            const total = billsData.reduce((s, b) => s + Number(b.amount), 0);
            const finalY = (doc).lastAutoTable.finalY + 10;
            doc.setFontSize(11);
            doc.setFont("helvetica", "bold");
            doc.text(`Total Pembayaran: ${formatCurrency(total)}`, 14, finalY);
            doc.text(`Jumlah Tagihan Lunas: ${billsData.length}`, 14, finalY + 6);

            doc.save(`Laporan_Pembayaran_${new Date().toISOString().split('T')[0]}.pdf`);
        } catch (err) {
            console.error('Export error:', err);
            alert('Terjadi kesalahan: ' + err.message);
        }
    };

    // Actions
    const handleSaveStudent = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (studentForm.id) {
                await updateStudent(studentForm.id, studentForm);
                await logActivity('EDIT_SANTRI', studentForm.name);
            } else {
                await insertStudent({ ...studentForm, id: generateId() });
                await logActivity('TAMBAH_SANTRI', studentForm.name);
            }
            setIsModalOpen(false);
        } catch (err) { alert('Error: ' + err.message); }
        finally { setSaving(false); }
    };

    const handleSaveCategory = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (categoryForm.id) {
                await updateCategory(categoryForm.id, categoryForm);
            } else {
                await insertCategory({ ...categoryForm, id: generateId(), amount: Number(categoryForm.amount) || 0 });
            }
            setIsModalOpen(false);
        } catch (err) { alert('Error: ' + err.message); }
        finally { setSaving(false); }
    };

    const handleCreateBill = async (e) => {
        e.preventDefault();
        const cat = categories.find(c => c.id === billForm.categoryId);
        if (!cat || billForm.targets.length === 0) return alert("Pilih kategori dan target");
        const targets = students.filter(s => billForm.targets.includes(s.angkatan));
        if (targets.length === 0) return alert("Tidak ada santri dengan angkatan tersebut");

        setSaving(true);
        try {
            for (const s of targets) {
                await insertBill({
                    id: generateId(),
                    student_id: s.id,
                    student_name: s.name,
                    student_phone: s.phone,
                    category_id: cat.id,
                    category_name: cat.name,
                    amount: Number(billForm.amount || cat.amount || 0),
                    month: billForm.month,
                    status: 'Belum Lunas'
                });
            }
            await logActivity('BUAT_TAGIHAN', `${targets.length} tagihan ${cat.name}`);
            setIsModalOpen(false);
        } catch (err) { alert('Error: ' + err.message); }
        finally { setSaving(false); }
    };

    const handleUpdateBill = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await updateBill(editBillData.id, { amount: Number(editBillData.amount), status: editBillData.status });
            await logActivity('EDIT_TAGIHAN', editBillData.student_name);
            setIsModalOpen(false);
        } catch (err) { alert('Error: ' + err.message); }
        finally { setSaving(false); }
    };

    const handlePayBill = async (bill) => {
        setSaving(true);
        try {
            // Only update bill status - don't add to transactions (pemasukan)
            // Pembayaran santri is separate from general income
            // Save paid_at for accurate payment date tracking
            const paidDate = new Date().toISOString().split('T')[0];
            await updateBill(bill.id, { status: 'Lunas', paid_at: paidDate });
            await logActivity('PEMBAYARAN', `${activeStudent.name} - ${bill.category_name}`);

            // Set payment data for receipt
            const paymentData = {
                id: generateId(),
                date: new Date().toISOString().split('T')[0],
                category: bill.category_name,
                amount: Number(bill.amount),
                student_id: activeStudent.id,
                student_name: activeStudent.name,
                student_phone: activeStudent.phone,
                student_nis: activeStudent.nis,
                period: bill.month,
                month: bill.month
            };
            setLastPayment(paymentData);
            setModalType('receipt');
            setIsModalOpen(true);
        } catch (err) { alert('Error: ' + err.message); }
        finally { setSaving(false); }
    };

    // Table Renderer
    const renderTable = (headers, rows, renderRow) => (
        <div className="table-container shadow-md">
            <div className="table-responsive-wrapper">
                <table className="table-base">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>{headers.map((h, i) => <th key={i} className="table-header">{h}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                        {rows.length > 0 ? rows.map(renderRow) : <tr><td colSpan={headers.length} className="p-8 text-center text-slate-400 italic">Data Belum Tersedia</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    );

    if (studentsLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                <span className="ml-2 text-slate-600">Memuat data dari Supabase...</span>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold capitalize text-slate-800 text-lg">{modalType.replace(/_/g, ' ')}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="hover:bg-red-50 hover:text-red-500 p-1.5 rounded-full"><X size={20} /></button>
                        </div>
                        <div className="p-6 overflow-y-auto">
                            {modalType === 'student' && (
                                <form onSubmit={handleSaveStudent} className="space-y-4">
                                    <input className="input-field" placeholder="Nama Lengkap" value={studentForm.name} onChange={e => setStudentForm({ ...studentForm, name: e.target.value })} required />
                                    <input className="input-field" placeholder="NIS" value={studentForm.nis} onChange={e => setStudentForm({ ...studentForm, nis: e.target.value })} />
                                    <div className="grid grid-cols-2 gap-4">
                                        <input className="input-field" placeholder="Kelas" value={studentForm.kelas} onChange={e => setStudentForm({ ...studentForm, kelas: e.target.value })} />
                                        <input className="input-field" placeholder="Angkatan" value={studentForm.angkatan} onChange={e => setStudentForm({ ...studentForm, angkatan: e.target.value })} />
                                    </div>
                                    <input className="input-field" placeholder="Nama Wali" value={studentForm.parent_name} onChange={e => setStudentForm({ ...studentForm, parent_name: e.target.value })} />
                                    <input className="input-field" placeholder="No. HP/WA" value={studentForm.phone} onChange={e => setStudentForm({ ...studentForm, phone: e.target.value })} />
                                    <button disabled={saving} className="btn-primary w-full">{saving ? 'Menyimpan...' : 'Simpan'}</button>
                                </form>
                            )}
                            {modalType === 'category' && (
                                <form onSubmit={handleSaveCategory} className="space-y-4">
                                    <input className="input-field" placeholder="Nama Kategori" value={categoryForm.name} onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })} required />
                                    <select className="input-field" value={categoryForm.type} onChange={e => setCategoryForm({ ...categoryForm, type: e.target.value })}>
                                        <option value="pembayaran">Pembayaran Santri</option>
                                        <option value="pemasukan">Pemasukan</option>
                                        <option value="pengeluaran">Pengeluaran</option>
                                    </select>
                                    <input type="number" className="input-field" placeholder="Nominal Default" value={categoryForm.amount} onChange={e => setCategoryForm({ ...categoryForm, amount: e.target.value })} />
                                    <button disabled={saving} className="btn-primary w-full">{saving ? 'Menyimpan...' : 'Simpan'}</button>
                                </form>
                            )}
                            {modalType === 'bill' && (
                                <form onSubmit={handleCreateBill} className="space-y-4">
                                    <input type="month" className="input-field" value={billForm.month} onChange={e => setBillForm({ ...billForm, month: e.target.value })} required />
                                    <select className="input-field" value={billForm.categoryId} onChange={e => setBillForm({ ...billForm, categoryId: e.target.value })} required>
                                        <option value="">-- Pilih Kategori --</option>
                                        {categories.filter(c => c.type === 'pembayaran').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                    <input type="number" className="input-field" placeholder="Nominal" value={billForm.amount} onChange={e => setBillForm({ ...billForm, amount: e.target.value })} />
                                    <div className="border p-3 rounded-xl max-h-32 overflow-y-auto bg-slate-50">
                                        <p className="text-xs font-bold text-slate-500 mb-2">Target Angkatan:</p>
                                        {[...new Set(students.map(s => s.angkatan))].filter(Boolean).sort().map(a => (
                                            <label key={a} className="flex gap-2 p-2 hover:bg-white rounded cursor-pointer">
                                                <input type="checkbox" checked={billForm.targets.includes(a)} onChange={e => {
                                                    if (e.target.checked) setBillForm(p => ({ ...p, targets: [...p.targets, a] }));
                                                    else setBillForm(p => ({ ...p, targets: p.targets.filter(t => t !== a) }));
                                                }} />
                                                <span>{a}</span>
                                            </label>
                                        ))}
                                    </div>
                                    <button disabled={saving} className="btn-primary w-full">{saving ? 'Membuat...' : 'Generate Tagihan'}</button>
                                </form>
                            )}
                            {modalType === 'editBill' && editBillData && (
                                <form onSubmit={handleUpdateBill} className="space-y-4">
                                    <div className="bg-slate-50 p-4 rounded-xl text-center">
                                        <p className="font-bold text-slate-800">{editBillData.student_name}</p>
                                        <p className="text-sm text-slate-500">{editBillData.category_name} ({editBillData.month})</p>
                                    </div>
                                    <input type="number" className="input-field" value={editBillData.amount} onChange={e => setEditBillData({ ...editBillData, amount: e.target.value })} />
                                    <select className="input-field" value={editBillData.status} onChange={e => setEditBillData({ ...editBillData, status: e.target.value })}>
                                        <option>Belum Lunas</option>
                                        <option>Lunas</option>
                                    </select>
                                    <button disabled={saving} className="btn-primary w-full">{saving ? 'Menyimpan...' : 'Update'}</button>
                                </form>
                            )}
                            {modalType === 'receipt' && lastPayment && (
                                <div className="text-center space-y-6 py-4">
                                    <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-600">
                                        <CheckCircle size={40} />
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-800">Pembayaran Berhasil!</h3>
                                    <div className="flex gap-4">
                                        <button onClick={() => generateReceiptPDF(lastPayment)} className="btn-secondary flex-1"><Printer size={18} /> Cetak</button>
                                        <button onClick={() => {
                                            const today = new Date();
                                            const dateStr = today.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
                                            const student = students.find(s => s.id === lastPayment.student_id) || {};
                                            const message = `Assalamu'alaikum Wr. Wb.

Yth. Bapak/Ibu ${student.parent_name || student.name || lastPayment.student_name}

Terima kasih atas pembayaran ${lastPayment.category} santri ${lastPayment.student_name}.

BUKTI PEMBAYARAN
* Nama Santri: ${lastPayment.student_name}
* NIS: ${student.nis || '-'}
* Jenis: ${lastPayment.category}
* Jumlah: ${formatCurrency(lastPayment.amount)}
* Status: LUNAS
* Tanggal: ${dateStr}

Barakallahu fiikum.

Pondok Pesantren Tahfizh Qur'an Al-Usymuni`;
                                            sendWA(lastPayment.student_phone, message);
                                        }} className="btn-primary flex-1"><MessageCircle size={18} /> Kirim WA</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-emerald-600 to-emerald-800 p-6 rounded-2xl shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10 transform translate-x-1/4 -translate-y-1/4"><User size={120} className="text-white" /></div>
                <div className="relative z-10 text-white">
                    <h2 className="text-2xl font-bold capitalize tracking-tight flex items-center gap-3">
                        {activeTab === 'data' && <><User size={28} /> Data Santri</>}
                        {activeTab === 'tagihan' && <><CreditCard size={28} /> Tagihan Santri</>}
                        {activeTab === 'kategori' && <><FileText size={28} /> Kategori Pembayaran</>}
                        {activeTab === 'pembayaran' && <><CheckCircle size={28} /> Pembayaran</>}
                        {activeTab === 'laporan' && <><FileSpreadsheet size={28} /> Laporan Keuangan</>}
                    </h2>
                    <p className="text-emerald-100 text-sm mt-1">Data tersinkronisasi dengan Supabase</p>
                </div>
                <div className="relative z-10 hidden md:block">
                    <div className="bg-white/10 backdrop-blur-md border border-white/20 p-2 rounded-lg text-center min-w-[120px]">
                        <span className="text-xs text-emerald-100 uppercase tracking-widest block mb-1">Total</span>
                        <span className="text-2xl font-bold text-white">
                            {activeTab === 'data' && students.length}
                            {activeTab === 'tagihan' && bills.length}
                            {activeTab === 'kategori' && categories.length}
                            {activeTab === 'pembayaran' && bills.filter(b => b.status === 'Lunas').length}
                            {activeTab === 'laporan' && reportData.length}
                        </span>
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            {['data', 'tagihan', 'laporan', 'kategori'].includes(activeTab) && (
                <div className="card-premium flex flex-col md:flex-row gap-4 items-center justify-between sticky top-0 z-20 bg-white/95 backdrop-blur">
                    <div className="flex flex-wrap items-center gap-3 w-full md:w-auto flex-1">
                        <div className="relative flex-1 min-w-[200px] max-w-md">
                            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            {activeTab === 'data' && <input className="input-field pl-10" placeholder="Cari Nama / NIS..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />}
                            {activeTab === 'tagihan' && <input type="month" className="input-field pl-10" value={billFilter.start} onChange={e => setBillFilter({ ...billFilter, start: e.target.value })} />}
                            {activeTab === 'kategori' && <input className="input-field pl-10" placeholder="Cari Kategori..." value={categorySearch} onChange={e => setCategorySearch(e.target.value)} />}
                        </div>
                        {activeTab === 'kategori' && (
                            <select className="input-field w-auto min-w-[150px]" value={categoryTypeFilter} onChange={e => setCategoryTypeFilter(e.target.value)}>
                                <option value="">Semua Jenis</option>
                                <option value="pembayaran">Pembayaran</option>
                                <option value="pemasukan">Pemasukan</option>
                                <option value="pengeluaran">Pengeluaran</option>
                            </select>
                        )}
                        {activeTab === 'tagihan' && (
                            <>
                                <select className="input-field w-auto min-w-[150px]" value={billSearchCategory} onChange={e => setBillSearchCategory(e.target.value)}>
                                    <option value="">Semua Kategori</option>
                                    {categories.filter(c => c.type === 'pembayaran').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                                <select className="input-field w-auto min-w-[120px]" value={billStatusFilter} onChange={e => setBillStatusFilter(e.target.value)}>
                                    <option value="">Semua Status</option>
                                    <option value="Belum Lunas">Belum Lunas</option>
                                    <option value="Lunas">Lunas</option>
                                </select>
                            </>
                        )}
                    </div>
                    <div className="flex gap-3 w-full md:w-auto">
                        {activeTab === 'data' && canEdit && <button onClick={() => { setStudentForm({ id: '', nis: '', name: '', kelas: '', angkatan: '', parent_name: '', phone: '', status: 'Aktif' }); setModalType('student'); setIsModalOpen(true); }} className="btn-primary w-full md:w-auto"><Plus size={16} /> Tambah</button>}
                        {activeTab === 'kategori' && canEdit && <button onClick={() => { setCategoryForm({ id: '', name: '', amount: '', type: 'pembayaran' }); setModalType('category'); setIsModalOpen(true); }} className="btn-primary w-full md:w-auto"><Plus size={16} /> Tambah</button>}
                        {activeTab === 'tagihan' && (
                            <>
                                {canEdit && <button onClick={() => { setBillForm({ month: new Date().toISOString().slice(0, 7), categoryId: '', amount: '', targets: [] }); setModalType('bill'); setIsModalOpen(true); }} className="btn-primary bg-indigo-600 hover:bg-indigo-700 w-full md:w-auto"><Plus size={16} /> Buat Tagihan</button>}
                                <button onClick={exportBillsPDF} className="btn-secondary w-full md:w-auto"><Download size={16} /> Download Data</button>
                            </>
                        )}
                        {activeTab === 'laporan' && <button onClick={exportReportPDF} className="btn-primary w-full md:w-auto"><Download size={16} /> Download Data</button>}
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className="min-h-[400px]">
                {activeTab === 'data' && renderTable(
                    ['Nama Santri', 'Wali & Kontak', 'Kelas / Angkatan', 'Status', 'Aksi'],
                    students.filter(s => {
                        const term = searchTerm.toLowerCase();
                        return (s.name || '').toLowerCase().includes(term) ||
                            (s.kelas || '').toLowerCase().includes(term) ||
                            (s.angkatan || '').toLowerCase().includes(term) ||
                            (s.nis || '').toLowerCase().includes(term);
                    }),
                    s => (
                        <tr key={s.id} className="hover:bg-slate-50 group">
                            <td className="table-cell">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold border">{(s.name || '?').charAt(0)}</div>
                                    <div><p className="font-bold text-slate-800">{s.name}</p><p className="text-xs text-slate-500 font-mono">{s.nis}</p></div>
                                </div>
                            </td>
                            <td className="table-cell"><p className="font-medium text-slate-700">{s.parent_name}</p><p className="text-xs text-slate-500">{s.phone}</p></td>
                            <td className="table-cell"><span className="font-bold text-slate-700">{s.kelas}</span><span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-full ml-2">{s.angkatan}</span></td>
                            <td className="table-cell"><span className={`badge ${s.status === 'Aktif' ? 'badge-success' : 'badge-warning'}`}>{s.status}</span></td>
                            <td className="table-cell text-center">
                                <div className="flex justify-center gap-2 opacity-60 group-hover:opacity-100">
                                    {canEdit && (
                                        <>
                                            <button onClick={() => { setStudentForm(s); setModalType('student'); setIsModalOpen(true); }} className="text-blue-600 p-2 hover:bg-blue-50 rounded-lg"><Edit size={16} /></button>
                                            <button onClick={async () => { if (confirm("Hapus?")) { await removeStudent(s.id); await logActivity('HAPUS_SANTRI', s.name); } }} className="text-red-600 p-2 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                                        </>
                                    )}
                                </div>
                            </td>
                        </tr>
                    )
                )}

                {activeTab === 'kategori' && renderTable(
                    ['Nama Kategori', 'Jenis', 'Nominal Default', 'Aksi'],
                    categories.filter(c => {
                        if (categorySearch && !(c.name || '').toLowerCase().includes(categorySearch.toLowerCase())) return false;
                        if (categoryTypeFilter && c.type !== categoryTypeFilter) return false;
                        return true;
                    }),
                    c => (
                        <tr key={c.id} className="hover:bg-slate-50 group">
                            <td className="table-cell font-bold text-slate-700">{c.name}</td>
                            <td className="table-cell"><span className={`badge ${c.type === 'pemasukan' ? 'badge-success' : c.type === 'pengeluaran' ? 'badge-danger' : 'badge-info'}`}>{c.type}</span></td>
                            <td className="table-cell font-mono text-slate-600">{Number(c.amount) > 0 ? formatCurrency(c.amount) : <span className="text-slate-400 italic">Fleksibel</span>}</td>
                            <td className="table-cell text-center">
                                <div className="flex justify-center gap-2 opacity-60 group-hover:opacity-100">
                                    {canEdit && (
                                        <>
                                            <button onClick={() => { setCategoryForm(c); setModalType('category'); setIsModalOpen(true); }} className="text-blue-600 p-2 hover:bg-blue-50 rounded-lg"><Edit size={16} /></button>
                                            <button onClick={async () => { if (confirm("Hapus?")) await removeCategory(c.id); }} className="text-red-600 p-2 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                                        </>
                                    )}
                                </div>
                            </td>
                        </tr>
                    )
                )}

                {activeTab === 'tagihan' && renderTable(
                    ['Periode', 'Santri', 'Kategori', 'Nominal', 'Status', 'Aksi'],
                    filteredBills.slice(0, 50),
                    b => (
                        <tr key={b.id} className="hover:bg-slate-50 group">
                            <td className="table-cell font-mono text-slate-600">{b.month}</td>
                            <td className="table-cell font-bold text-slate-800">{b.student_name}</td>
                            <td className="table-cell text-slate-600">{b.category_name}</td>
                            <td className="table-cell font-bold text-slate-700">{formatCurrency(b.amount)}</td>
                            <td className="table-cell"><span className={`badge ${b.status === 'Lunas' ? 'badge-success' : 'badge-danger'}`}>{b.status}</span></td>
                            <td className="table-cell text-center">
                                <div className="flex justify-center gap-2 opacity-60 group-hover:opacity-100">
                                    {canEdit && (
                                        <>
                                            <button onClick={() => { setEditBillData(b); setModalType('editBill'); setIsModalOpen(true); }} className="text-blue-600 p-2 hover:bg-blue-50 rounded-lg"><Edit size={16} /></button>
                                            <button onClick={async () => { if (confirm("Hapus?")) await removeBill(b.id); }} className="text-red-600 p-2 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                                        </>
                                    )}
                                </div>
                            </td>
                        </tr>
                    )
                )}

                {activeTab === 'pembayaran' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="card-premium h-fit lg:col-span-1 sticky top-6">
                            <h3 className="font-bold mb-4 text-lg border-b pb-2 flex items-center gap-2 text-slate-800"><Search size={20} className="text-emerald-500" /> Cari Santri</h3>
                            <select className="input-field mb-6" value={paymentSearch} onChange={e => setPaymentSearch(e.target.value)}>
                                <option value="">-- Pilih Santri --</option>
                                {students.map(s => <option key={s.id} value={s.id}>{s.name} - {s.kelas}</option>)}
                            </select>
                            {activeStudent ? (
                                <div className="text-center bg-slate-50 p-6 rounded-2xl border">
                                    <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl font-bold text-emerald-600 border-4 border-white shadow">{activeStudent.name.charAt(0)}</div>
                                    <div className="font-bold text-xl text-slate-800">{activeStudent.name}</div>
                                    <div className="text-sm text-slate-500">{activeStudent.kelas}</div>
                                    <div className="mt-6 flex justify-between text-sm border-t pt-4">
                                        <span className="text-slate-500">Total Tunggakan</span>
                                        <span className="text-red-500 font-bold bg-red-50 px-3 py-1 rounded-full">{unpaidBills.length} Item</span>
                                    </div>
                                    <button onClick={() => {
                                        if (unpaidBills.length === 0) return alert("Tidak ada tagihan");
                                        const total = unpaidBills.reduce((a, b) => a + Number(b.amount), 0);
                                        const billsList = unpaidBills.map(b => `• ${b.category_name} (${getMonthName(b.month)}): ${formatCurrency(b.amount)}`).join('\n');
                                        const message = `Assalamu'alaikum Wr. Wb.

Yth. Wali Santri ${activeStudent.name}

Kami sampaikan pengingat pembayaran:

TAGIHAN PEMBAYARAN
* Nama Santri: ${activeStudent.name}
* NIS: ${activeStudent.nis || '-'}

RINCIAN TAGIHAN:
${billsList}

TOTAL: ${formatCurrency(total)}
Status: BELUM LUNAS

Mohon segera melakukan pembayaran. Jazakumullah khairan.

Pondok Pesantren Tahfizh Qur'an Al-Usymuni`;
                                        sendWA(activeStudent.phone, message);
                                    }} className="btn-primary w-full mt-6"><MessageCircle size={18} /> Kirim Tagihan WA</button>
                                </div>
                            ) : (
                                <div className="text-center text-slate-400 py-10 bg-slate-50/50 rounded-2xl border border-dashed">
                                    <User size={48} className="mx-auto mb-2 opacity-50" />
                                    <p>Pilih santri untuk pembayaran</p>
                                </div>
                            )}
                        </div>
                        <div className="lg:col-span-2 space-y-6">
                            <div className="card-premium border-l-4 border-l-red-500">
                                <h3 className="font-bold mb-4 text-lg text-red-600 flex items-center gap-2 pb-2 border-b"><CreditCard size={20} /> Tagihan Belum Lunas</h3>
                                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                                    {unpaidBills.length > 0 ? unpaidBills.map(b => (
                                        <div key={b.id} className="flex justify-between items-center p-4 border rounded-xl hover:shadow-md bg-white group hover:border-emerald-200">
                                            <div className="flex items-center gap-4">
                                                <div className="bg-red-50 w-12 h-12 rounded-lg flex flex-col items-center justify-center text-red-600 font-bold text-xs border border-red-100">
                                                    <span>{(b.month || '').split('-')[1]}</span>
                                                    <span className="text-[10px]">{(b.month || '').split('-')[0]}</span>
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-700">{b.category_name}</div>
                                                    <div className="text-xs text-slate-500 font-mono">{formatCurrency(b.amount)}</div>
                                                </div>
                                            </div>
                                            <div className="flex gap-2 items-center">
                                                <button onClick={() => sendWAReminder(activeStudent, b)} className="p-2 bg-white border border-amber-200 rounded-lg text-amber-600 hover:bg-amber-50" title="Kirim Pengingat WA"><MessageCircle size={16} /></button>
                                                {canEdit && (
                                                    <button onClick={() => handlePayBill(b)} disabled={saving} className="px-6 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-emerald-600 disabled:opacity-50">Bayar</button>
                                                )}
                                            </div>
                                        </div>
                                    )) : <div className="text-center py-8 text-slate-400 italic bg-slate-50 rounded-xl">Tidak ada tunggakan</div>}
                                </div>
                            </div>
                            <div className="card-premium border-l-4 border-l-emerald-500">
                                <h3 className="font-bold mb-4 text-emerald-600 text-lg flex items-center gap-2 pb-2 border-b"><CheckCircle size={20} /> Riwayat Lunas</h3>
                                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                    {paidBills.length > 0 ? paidBills.map(b => (
                                        <div key={b.id} className="flex justify-between items-center p-3 border border-emerald-100 bg-emerald-50/30 rounded-xl">
                                            <div className="flex gap-3 items-center">
                                                <div className="px-2 py-1 bg-white rounded text-xs font-mono border border-emerald-100 text-emerald-600">{b.month}</div>
                                                <div className="font-bold text-slate-700 text-sm">{b.category_name}</div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => sendWAReceipt(activeStudent, b)} className="p-2 bg-white border border-green-200 rounded-lg text-green-600 hover:bg-green-50" title="Kirim Bukti via WA"><MessageCircle size={14} /></button>
                                                <button onClick={() => generateReceiptPDF({ id: b.id, date: new Date().toISOString(), student_name: activeStudent?.name, category: b.category_name, amount: b.amount })} className="p-2 bg-white border border-blue-200 rounded-lg text-blue-600 hover:bg-blue-50"><Printer size={14} /></button>
                                            </div>
                                        </div>
                                    )) : <div className="text-center py-8 text-slate-400 italic bg-slate-50 rounded-xl">Belum ada riwayat</div>}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'laporan' && (
                    <div className="space-y-6">
                        {/* Filters */}
                        <div className="card-premium flex flex-wrap gap-4 items-center justify-between">
                            <div className="flex flex-wrap gap-3 items-center">
                                <select
                                    className="input-field w-auto py-2 text-sm"
                                    value={reportStudentFilter}
                                    onChange={e => setReportStudentFilter(e.target.value)}
                                >
                                    <option value="">Semua Santri</option>
                                    {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                                <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
                                    <input
                                        type="date"
                                        className="bg-transparent border-none text-xs w-28 outline-none text-slate-600 font-medium"
                                        value={reportFilter.start}
                                        onChange={e => setReportFilter({ ...reportFilter, start: e.target.value })}
                                    />
                                    <span className="text-slate-400">-</span>
                                    <input
                                        type="date"
                                        className="bg-transparent border-none text-xs w-28 outline-none text-slate-600 font-medium"
                                        value={reportFilter.end}
                                        onChange={e => setReportFilter({ ...reportFilter, end: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="text-sm text-slate-600 font-medium">
                                Total: <span className="text-emerald-600 font-bold">{formatCurrency(reportData.reduce((s, t) => s + Number(t.amount), 0))}</span>
                                <span className="ml-4 text-slate-400">({reportData.length} pembayaran)</span>
                            </div>
                        </div>
                        {renderTable(
                            ['Tgl Bayar', 'Periode', 'Santri', 'Kategori', 'Jumlah'],
                            reportData,
                            t => (
                                <tr key={t.id} className="hover:bg-slate-50">
                                    <td className="table-cell font-mono text-slate-600">{formatDate(t.date)}</td>
                                    <td className="table-cell text-slate-500">{getMonthName(t.period, true)}</td>
                                    <td className="table-cell font-bold text-slate-800">{t.student_name}</td>
                                    <td className="table-cell"><span className="badge badge-info">{t.category}</span></td>
                                    <td className="table-cell font-mono font-bold text-emerald-600 text-right">{formatCurrency(t.amount)}</td>
                                </tr>
                            )
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
