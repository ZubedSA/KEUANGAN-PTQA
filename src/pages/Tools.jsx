import { useState } from 'react';
import {
    FileSpreadsheet,
    Upload,
    StickyNote,
    History,
    Trash2,
    Calendar,
    Loader2
} from 'lucide-react';
import useSupabase from '../hooks/useSupabase';
import { formatDate } from '../utils/helpers';
import { supabase } from '../lib/supabase';
import * as XLSX from 'xlsx';

export default function Tools() {
    // Supabase hooks
    const { data: transactions, insert: insertTransaction } = useSupabase('transactions', []);
    const { data: students, insert: insertStudent } = useSupabase('students', []);
    const { data: auditLogs, loading: logsLoading } = useSupabase('audit_logs', []);

    // UI States
    const [importType, setImportType] = useState('transactions');
    const [isImporting, setIsImporting] = useState(false);
    const [filterStart, setFilterStart] = useState('');
    const [filterEnd, setFilterEnd] = useState('');
    const [notes, setNotes] = useState('');
    const [notesSaving, setNotesSaving] = useState(false);

    // Load notes from Supabase
    useState(() => {
        supabase.from('notes').select('*').eq('id', 'default').single().then(({ data }) => {
            if (data?.content) setNotes(data.content);
        });
    }, []);

    const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

    // Save notes to Supabase
    const saveNotes = async (content) => {
        setNotesSaving(true);
        await supabase.from('notes').upsert([{ id: 'default', content, updated_at: new Date().toISOString() }]);
        setNotesSaving(false);
    };

    // Excel Import Handler
    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsImporting(true);
        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target.result;
                const workbook = XLSX.read(bstr, { type: 'binary' });
                const wsname = workbook.SheetNames[0];
                const ws = workbook.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws);

                if (importType === 'transactions') {
                    for (const row of data) {
                        await insertTransaction({
                            id: generateId(),
                            date: row.Date || row.Tanggal || new Date().toISOString().split('T')[0],
                            type: (row.Type || row.Tipe || 'pemasukan').toLowerCase(),
                            category: row.Category || row.Kategori || 'Lainnya',
                            amount: Number(row.Amount || row.Jumlah || 0),
                            description: row.Description || row.Keterangan || 'Import Data'
                        });
                    }
                    await supabase.from('audit_logs').insert([{ id: generateId(), action: 'IMPORT_TRANSAKSI', details: `${data.length} transaksi diimport`, user_name: 'Bendahara', timestamp: new Date().toISOString() }]);
                    alert(`Berhasil mengimport ${data.length} transaksi!`);
                } else {
                    for (const row of data) {
                        await insertStudent({
                            id: generateId(),
                            nis: row.NIS || row.Nis || row.nis || '',
                            name: row.Name || row.Nama || row.name || row['Nama Santri'] || '',
                            kelas: row.Class || row.Kelas || row.kelas || '',
                            angkatan: row.Angkatan || row.Batch || row.angkatan || '-',
                            parent_name: row.Parent || row.Wali || row['Wali Santri'] || row['Nama Wali'] || row['Orang Tua'] || row.parent_name || row.wali || '',
                            phone: row.Phone || row.HP || row.hp || row['No HP'] || row['No. HP'] || row.WhatsApp || row.WA || row.Telepon || row.telepon || row['No WA'] || row['No. WhatsApp'] || row.phone || '',
                            status: 'Aktif'
                        });
                    }
                    await supabase.from('audit_logs').insert([{ id: generateId(), action: 'IMPORT_SANTRI', details: `${data.length} santri diimport`, user_name: 'Bendahara', timestamp: new Date().toISOString() }]);
                    alert(`Berhasil mengimport ${data.length} data santri!`);
                }
            } catch (error) {
                console.error(error);
                alert('Gagal membaca file excel.');
            } finally {
                setIsImporting(false);
                e.target.value = null;
            }
        };
        reader.readAsBinaryString(file);
    };

    const filteredLogs = auditLogs.filter(log => {
        if (!filterStart && !filterEnd) return true;
        const logDate = (log.timestamp || '').split('T')[0];
        if (filterStart && logDate < filterStart) return false;
        if (filterEnd && logDate > filterEnd) return false;
        return true;
    }).slice(0, 100);

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800">Tools Bendahara</h2>
            <p className="text-slate-500 text-sm -mt-4">Data tersinkronisasi dengan Supabase</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Import Excel */}
                <div className="card-premium p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-green-100 text-green-600 rounded-lg"><FileSpreadsheet size={24} /></div>
                        <div>
                            <h3 className="font-bold text-slate-800">Import Data Excel</h3>
                            <p className="text-sm text-slate-500">Upload file CSV/XLSX ke Supabase</p>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Tipe Data Import</label>
                            <select value={importType} onChange={(e) => setImportType(e.target.value)} className="w-full px-3 py-2 border rounded-lg">
                                <option value="transactions">Data Keuangan (Transaksi)</option>
                                <option value="students">Data Santri</option>
                            </select>
                        </div>
                        <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:bg-slate-50 relative">
                            <input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" disabled={isImporting} />
                            {isImporting ? <Loader2 className="mx-auto text-emerald-500 animate-spin" size={32} /> : <Upload className="mx-auto text-slate-400 mb-2" size={32} />}
                            <p className="text-sm font-medium text-slate-600">{isImporting ? 'Mengupload ke Supabase...' : 'Klik atau seret file ke sini'}</p>
                        </div>
                    </div>
                </div>

                {/* Notes */}
                <div className="card-premium p-6 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-yellow-100 text-yellow-600 rounded-lg"><StickyNote size={24} /></div>
                            <div>
                                <h3 className="font-bold text-slate-800">Catatan Bendahara</h3>
                                <p className="text-sm text-slate-500">{notesSaving ? 'Menyimpan...' : 'Tersimpan di cloud'}</p>
                            </div>
                        </div>
                        <button onClick={() => { setNotes(''); saveNotes(''); }} className="text-red-400 hover:text-red-500"><Trash2 size={18} /></button>
                    </div>
                    <textarea
                        className="flex-1 w-full bg-yellow-50 border-none rounded-lg p-4"
                        placeholder="Tulis catatan..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        onBlur={() => saveNotes(notes)}
                    />
                </div>
            </div>

            {/* Audit Log */}
            <div className="card-premium overflow-hidden">
                <div className="p-6 border-b bg-slate-50 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <History size={20} className="text-slate-500" />
                        <h3 className="font-bold text-slate-800">Audit Log Aktivitas System</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-500 flex items-center gap-1"><Calendar size={12} /> Filter:</span>
                        <input type="date" className="p-1 border rounded text-xs" value={filterStart} onChange={e => setFilterStart(e.target.value)} />
                        <span className="text-slate-400 text-xs">-</span>
                        <input type="date" className="p-1 border rounded text-xs" value={filterEnd} onChange={e => setFilterEnd(e.target.value)} />
                    </div>
                </div>
                <div className="max-h-96 overflow-y-auto">
                    {logsLoading ? (
                        <div className="p-8 text-center"><Loader2 className="inline animate-spin text-emerald-500" /> Memuat...</div>
                    ) : (
                        <table className="w-full text-left">
                            <thead className="bg-slate-100 text-xs text-slate-500 uppercase">
                                <tr>
                                    <th className="px-6 py-3">Waktu</th>
                                    <th className="px-6 py-3">Aksi</th>
                                    <th className="px-6 py-3">Detail</th>
                                    <th className="px-6 py-3">User</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-3 text-xs text-slate-500 font-mono">
                                            {formatDate(log.timestamp)}
                                            <span className="text-slate-400 ml-1">{new Date(log.timestamp).toLocaleTimeString()}</span>
                                        </td>
                                        <td className="px-6 py-3 text-xs font-bold text-slate-700 bg-slate-50 rounded">
                                            {(log.action || '').replace(/_/g, ' ')}
                                        </td>
                                        <td className="px-6 py-3 text-sm text-slate-600">{log.details}</td>
                                        <td className="px-6 py-3 text-xs text-slate-400">{log.user_name}</td>
                                    </tr>
                                ))}
                                {filteredLogs.length === 0 && (
                                    <tr><td colSpan="4" className="text-center py-8 text-slate-400">Tidak ada aktivitas pada periode ini</td></tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
