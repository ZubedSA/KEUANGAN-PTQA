import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, User, Lock, Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Logo from '../assets/logo.png';

export default function Login() {
    const navigate = useNavigate();
    const { login, isLoggedIn } = useAuth();
    const [form, setForm] = useState({ username: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Redirect if already logged in
    if (isLoggedIn) {
        navigate('/');
        return null;
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const result = await login(form.username, form.password);

        if (result.success) {
            navigate('/');
        } else {
            setError(result.error);
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-900 flex items-center justify-center p-4">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
                <div className="absolute inset-0" style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                }}></div>
            </div>

            <div className="relative w-full max-w-md">
                {/* Logo Card */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-24 h-24 bg-white rounded-2xl shadow-2xl mb-4">
                        <img src={Logo} alt="PTQA Logo" className="w-16 h-16 object-contain" />
                    </div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">PTQA BATUAN</h1>
                    <p className="text-emerald-100 text-sm mt-1">Sistem Informasi Keuangan Pesantren</p>
                </div>

                {/* Login Card */}
                <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
                    <div className="p-8">
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-bold text-slate-800">Selamat Datang</h2>
                            <p className="text-slate-500 text-sm mt-1">Masuk ke akun Anda</p>
                        </div>

                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-6 text-sm font-medium flex items-center gap-2">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Username</label>
                                <div className="relative">
                                    <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        required
                                        className="w-full pl-12 pr-4 py-3.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-slate-50 focus:bg-white"
                                        placeholder="Masukkan username"
                                        value={form.username}
                                        onChange={(e) => setForm({ ...form, username: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Password</label>
                                <div className="relative">
                                    <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        className="w-full pl-12 pr-12 py-3.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-slate-50 focus:bg-white"
                                        placeholder="Masukkan password"
                                        value={form.password}
                                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-emerald-500/30 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 size={20} className="animate-spin" />
                                        Memproses...
                                    </>
                                ) : (
                                    <>
                                        <LogIn size={20} />
                                        Masuk
                                    </>
                                )}
                            </button>
                        </form>
                    </div>

                    <div className="bg-slate-50 px-8 py-4 text-center border-t">
                        <p className="text-slate-500 text-sm">
                            © 2025 PTQA Batuan. All rights reserved.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
