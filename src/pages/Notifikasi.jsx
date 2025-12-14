import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Bell, AlertTriangle, CheckCircle, XCircle,
    CreditCard, ArrowLeft, Trash2, CheckCheck,
    Clock, TrendingDown
} from 'lucide-react';
import { useNotifications } from '../contexts/NotificationContext';
import { formatDate } from '../utils/helpers';

export default function Notifikasi() {
    const navigate = useNavigate();
    const { notifications, markAsRead, markAllAsRead, refresh, unreadCount } = useNotifications();
    const [filter, setFilter] = useState('all');

    const getIcon = (type) => {
        switch (type) {
            case 'expense': return <TrendingDown className="text-red-500" size={20} />;
            case 'overdue': return <AlertTriangle className="text-amber-500" size={20} />;
            case 'approval': return <Clock className="text-blue-500" size={20} />;
            case 'success': return <CheckCircle className="text-emerald-500" size={20} />;
            case 'rejected': return <XCircle className="text-red-500" size={20} />;
            default: return <Bell className="text-slate-500" size={20} />;
        }
    };

    const getTypeLabel = (type) => {
        switch (type) {
            case 'expense': return 'Pengeluaran Besar';
            case 'overdue': return 'Tunggakan';
            case 'approval': return 'Persetujuan';
            case 'success': return 'Disetujui';
            case 'rejected': return 'Ditolak';
            default: return 'Notifikasi';
        }
    };

    const filteredNotifications = notifications.filter(n => {
        if (filter === 'all') return true;
        if (filter === 'unread') return !n.read;
        return n.type === filter;
    });

    const handleClick = (notif) => {
        markAsRead(notif.id);
        if (notif.link) {
            navigate(notif.link);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-700 to-slate-900 p-6 rounded-2xl shadow-lg">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                            <Bell size={28} /> Riwayat Notifikasi
                        </h2>
                        <p className="text-slate-300 text-sm mt-1">
                            {unreadCount > 0 ? `${unreadCount} notifikasi belum dibaca` : 'Semua notifikasi sudah dibaca'}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={refresh} className="btn-secondary text-white border-white/20 hover:bg-white/10">
                        Refresh
                    </button>
                    {unreadCount > 0 && (
                        <button onClick={markAllAsRead} className="btn-primary bg-emerald-500 hover:bg-emerald-600">
                            <CheckCheck size={16} /> Tandai Semua Dibaca
                        </button>
                    )}
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                {[
                    { key: 'all', label: 'Semua' },
                    { key: 'unread', label: 'Belum Dibaca' },
                    { key: 'expense', label: 'Pengeluaran' },
                    { key: 'overdue', label: 'Tunggakan' },
                    { key: 'approval', label: 'Persetujuan' },
                ].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setFilter(tab.key)}
                        className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${filter === tab.key
                                ? 'bg-slate-800 text-white shadow-lg'
                                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Notifications List */}
            <div className="space-y-3">
                {filteredNotifications.length > 0 ? (
                    filteredNotifications.map(notif => (
                        <div
                            key={notif.id}
                            onClick={() => handleClick(notif)}
                            className={`card-premium cursor-pointer transition-all hover:shadow-lg ${!notif.read ? 'border-l-4 border-l-emerald-500 bg-emerald-50/30' : ''
                                }`}
                        >
                            <div className="flex items-start gap-4">
                                <div className={`p-3 rounded-xl ${notif.type === 'expense' ? 'bg-red-100' :
                                        notif.type === 'overdue' ? 'bg-amber-100' :
                                            notif.type === 'approval' ? 'bg-blue-100' :
                                                notif.type === 'success' ? 'bg-emerald-100' :
                                                    notif.type === 'rejected' ? 'bg-red-100' : 'bg-slate-100'
                                    }`}>
                                    {getIcon(notif.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${notif.type === 'expense' ? 'bg-red-100 text-red-600' :
                                                notif.type === 'overdue' ? 'bg-amber-100 text-amber-600' :
                                                    notif.type === 'approval' ? 'bg-blue-100 text-blue-600' :
                                                        notif.type === 'success' ? 'bg-emerald-100 text-emerald-600' :
                                                            notif.type === 'rejected' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'
                                            }`}>
                                            {getTypeLabel(notif.type)}
                                        </span>
                                        {!notif.read && (
                                            <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                                        )}
                                    </div>
                                    <h4 className="font-bold text-slate-800">{notif.title}</h4>
                                    <p className="text-sm text-slate-600 mt-0.5">{notif.message}</p>
                                    <p className="text-xs text-slate-400 mt-2">{formatDate(notif.date)}</p>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-16 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                        <Bell size={48} className="mx-auto text-slate-300 mb-3" />
                        <p className="text-slate-400">Tidak ada notifikasi</p>
                    </div>
                )}
            </div>
        </div>
    );
}
