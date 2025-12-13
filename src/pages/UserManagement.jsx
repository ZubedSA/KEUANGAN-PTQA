import { useState, useMemo } from 'react';
import { Users, Plus, Edit, Trash2, Search, X, Key, Shield, Loader2, UserCheck, UserX } from 'lucide-react';
import { supabase } from '../lib/supabase';
import useSupabase from '../hooks/useSupabase';
import { useAuth } from '../contexts/AuthContext';

export default function UserManagement() {
    const { user: currentUser } = useAuth();
    const { data: users, loading, insert: insertUser, update: updateUser, remove: removeUser, refetch } = useSupabase('users', []);

    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState('add'); // add, edit, password
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ id: '', username: '', password: '', name: '', role: 'pengasuh', status: 'active' });
    const [passwordForm, setPasswordForm] = useState({ id: '', name: '', newPassword: '', confirmPassword: '' });

    const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

    const filteredUsers = useMemo(() => {
        return users.filter(u =>
            (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (u.username || '').toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [users, searchTerm]);

    const openAddModal = () => {
        setForm({ id: '', username: '', password: '', name: '', role: 'pengasuh', status: 'active' });
        setModalType('add');
        setIsModalOpen(true);
    };

    const openEditModal = (user) => {
        setForm({ ...user, password: '' });
        setModalType('edit');
        setIsModalOpen(true);
    };

    const openPasswordModal = (user) => {
        setPasswordForm({ id: user.id, name: user.name, newPassword: '', confirmPassword: '' });
        setModalType('password');
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);

        try {
            if (modalType === 'add') {
                // Check if username exists
                const { data: existing } = await supabase
                    .from('users')
                    .select('id')
                    .eq('username', form.username)
                    .single();

                if (existing) {
                    alert('Username sudah digunakan!');
                    setSaving(false);
                    return;
                }

                await insertUser({
                    id: generateId(),
                    username: form.username,
                    password: form.password,
                    name: form.name,
                    role: form.role,
                    status: form.status
                });

                await supabase.from('audit_logs').insert([{
                    id: generateId(),
                    action: 'TAMBAH_USER',
                    details: `User ${form.name} ditambahkan`,
                    user_name: currentUser.name,
                    timestamp: new Date().toISOString()
                }]);
            } else if (modalType === 'edit') {
                const updates = {
                    name: form.name,
                    role: form.role,
                    status: form.status
                };

                await updateUser(form.id, updates);

                await supabase.from('audit_logs').insert([{
                    id: generateId(),
                    action: 'EDIT_USER',
                    details: `User ${form.name} diupdate`,
                    user_name: currentUser.name,
                    timestamp: new Date().toISOString()
                }]);
            }

            setIsModalOpen(false);
            refetch();
        } catch (err) {
            alert('Error: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();

        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            alert('Password tidak cocok!');
            return;
        }

        if (passwordForm.newPassword.length < 4) {
            alert('Password minimal 4 karakter!');
            return;
        }

        setSaving(true);
        try {
            await updateUser(passwordForm.id, { password: passwordForm.newPassword });

            await supabase.from('audit_logs').insert([{
                id: generateId(),
                action: 'GANTI_PASSWORD',
                details: `Password ${passwordForm.name} diubah`,
                user_name: currentUser.name,
                timestamp: new Date().toISOString()
            }]);

            alert('Password berhasil diubah!');
            setIsModalOpen(false);
        } catch (err) {
            alert('Error: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (user) => {
        if (user.id === currentUser.id) {
            alert('Tidak bisa menghapus akun sendiri!');
            return;
        }

        if (confirm(`Hapus user "${user.name}"?`)) {
            await removeUser(user.id);
            await supabase.from('audit_logs').insert([{
                id: generateId(),
                action: 'HAPUS_USER',
                details: `User ${user.name} dihapus`,
                user_name: currentUser.name,
                timestamp: new Date().toISOString()
            }]);
        }
    };

    const getRoleBadge = (role) => {
        const styles = {
            admin: 'bg-red-100 text-red-700 border-red-200',
            bendahara: 'bg-blue-100 text-blue-700 border-blue-200',
            pengasuh: 'bg-amber-100 text-amber-700 border-amber-200'
        };
        return styles[role] || styles.pengasuh;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                <span className="ml-2 text-slate-600">Memuat data user...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-700 to-slate-900 p-6 rounded-2xl shadow-lg">
                <div className="text-white">
                    <h2 className="text-2xl font-bold flex items-center gap-3">
                        <Shield size={28} /> Manajemen User
                    </h2>
                    <p className="text-slate-300 text-sm mt-1">Kelola akun pengguna sistem</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={openAddModal} className="btn-primary bg-emerald-500 hover:bg-emerald-600">
                        <Plus size={16} /> Tambah User
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="card-premium">
                <div className="relative max-w-md">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        className="input-field pl-10"
                        placeholder="Cari nama atau username..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Users Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredUsers.map((u) => (
                    <div key={u.id} className={`card-premium hover:shadow-lg transition-all group ${u.status === 'inactive' ? 'opacity-60' : ''}`}>
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${u.role === 'admin' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                    {(u.name || '?').charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800">{u.name}</h3>
                                    <p className="text-sm text-slate-500">@{u.username}</p>
                                </div>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded-full border font-bold ${getRoleBadge(u.role)}`}>
                                {u.role}
                            </span>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t">
                            <div className="flex items-center gap-2">
                                {u.status === 'active' ? (
                                    <span className="text-xs text-emerald-600 flex items-center gap-1"><UserCheck size={14} /> Aktif</span>
                                ) : (
                                    <span className="text-xs text-red-500 flex items-center gap-1"><UserX size={14} /> Nonaktif</span>
                                )}
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => openPasswordModal(u)} className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg" title="Ganti Password">
                                    <Key size={16} />
                                </button>
                                <button onClick={() => openEditModal(u)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="Edit">
                                    <Edit size={16} />
                                </button>
                                {u.id !== currentUser.id && (
                                    <button onClick={() => handleDelete(u)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Hapus">
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}

                {filteredUsers.length === 0 && (
                    <div className="col-span-full text-center py-12 text-slate-400">
                        <Users size={48} className="mx-auto mb-2 opacity-50" />
                        <p>Tidak ada user ditemukan</p>
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="p-5 border-b flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-lg text-slate-800">
                                {modalType === 'add' && 'Tambah User Baru'}
                                {modalType === 'edit' && 'Edit User'}
                                {modalType === 'password' && 'Ganti Password'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-red-50 hover:text-red-500 rounded-full">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-5">
                            {(modalType === 'add' || modalType === 'edit') && (
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    {modalType === 'add' && (
                                        <>
                                            <div>
                                                <label className="block text-sm font-bold text-slate-700 mb-1">Username</label>
                                                <input
                                                    required
                                                    className="input-field"
                                                    placeholder="username"
                                                    value={form.username}
                                                    onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase().replace(/\s/g, '') })}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-slate-700 mb-1">Password</label>
                                                <input
                                                    type="password"
                                                    required
                                                    className="input-field"
                                                    placeholder="password"
                                                    value={form.password}
                                                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                                                />
                                            </div>
                                        </>
                                    )}
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Nama Lengkap</label>
                                        <input
                                            required
                                            className="input-field"
                                            placeholder="Nama Lengkap"
                                            value={form.name}
                                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-1">Role</label>
                                            <select
                                                className="input-field"
                                                value={form.role}
                                                onChange={(e) => setForm({ ...form, role: e.target.value })}
                                            >
                                                <option value="pengasuh">Pengasuh</option>
                                                <option value="bendahara">Bendahara</option>
                                                <option value="admin">Admin</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-1">Status</label>
                                            <select
                                                className="input-field"
                                                value={form.status}
                                                onChange={(e) => setForm({ ...form, status: e.target.value })}
                                            >
                                                <option value="active">Aktif</option>
                                                <option value="inactive">Nonaktif</option>
                                            </select>
                                        </div>
                                    </div>
                                    <button type="submit" disabled={saving} className="btn-primary w-full py-3">
                                        {saving ? <><Loader2 className="animate-spin" size={16} /> Menyimpan...</> : 'Simpan'}
                                    </button>
                                </form>
                            )}

                            {modalType === 'password' && (
                                <form onSubmit={handlePasswordChange} className="space-y-4">
                                    <div className="bg-slate-50 p-4 rounded-xl text-center mb-4">
                                        <p className="font-bold text-slate-800">{passwordForm.name}</p>
                                        <p className="text-sm text-slate-500">Ganti password untuk user ini</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Password Baru</label>
                                        <input
                                            type="password"
                                            required
                                            className="input-field"
                                            placeholder="Masukkan password baru"
                                            value={passwordForm.newPassword}
                                            onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Konfirmasi Password</label>
                                        <input
                                            type="password"
                                            required
                                            className="input-field"
                                            placeholder="Ulangi password baru"
                                            value={passwordForm.confirmPassword}
                                            onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                                        />
                                    </div>
                                    <button type="submit" disabled={saving} className="btn-primary w-full py-3">
                                        {saving ? <><Loader2 className="animate-spin" size={16} /> Menyimpan...</> : 'Ubah Password'}
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
