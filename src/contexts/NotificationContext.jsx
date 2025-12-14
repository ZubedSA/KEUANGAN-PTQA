import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

// Key for localStorage
const READ_NOTIFS_KEY = 'read_notification_ids';

// Get read IDs from localStorage
const getReadIds = () => {
    try {
        const stored = localStorage.getItem(READ_NOTIFS_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
};

// Save read IDs to localStorage
const saveReadIds = (ids) => {
    try {
        localStorage.setItem(READ_NOTIFS_KEY, JSON.stringify(ids));
    } catch (e) {
        console.error('Error saving read IDs:', e);
    }
};

export function NotificationProvider({ children }) {
    const { user, isAdmin, isBendahara, isPengasuh } = useAuth();
    const [smartNotifications, setSmartNotifications] = useState([]);
    const [readIds, setReadIds] = useState(getReadIds);
    const [loading, setLoading] = useState(true);

    // Generate smart notifications based on current data
    const generateSmartNotifications = useCallback(async () => {
        if (!user) return;
        const notifs = [];

        try {
            // 1. Check for large expenses (> 200,000)
            const { data: recentExpenses } = await supabase
                .from('transactions')
                .select('*')
                .eq('type', 'pengeluaran')
                .gte('amount', 200000)
                .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
                .order('created_at', { ascending: false })
                .limit(10);

            if (recentExpenses?.length > 0) {
                recentExpenses.forEach(exp => {
                    notifs.push({
                        id: `expense-${exp.id}`,
                        type: 'expense',
                        title: 'Pengeluaran Besar',
                        message: `${exp.category}: Rp ${Number(exp.amount).toLocaleString('id-ID')}`,
                        date: exp.created_at,
                        icon: 'expense',
                        link: '/keuangan/pengeluaran'
                    });
                });
            }

            // 2. Check for overdue bills (> 2 months)
            const twoMonthsAgo = new Date();
            twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
            const twoMonthsAgoStr = twoMonthsAgo.toISOString().slice(0, 7);

            const { data: overdueBills } = await supabase
                .from('student_bills')
                .select('*')
                .eq('status', 'Belum Lunas')
                .lt('month', twoMonthsAgoStr);

            if (overdueBills?.length > 0) {
                // Group by student
                const groupedByStudent = {};
                overdueBills.forEach(bill => {
                    if (!groupedByStudent[bill.student_id]) {
                        groupedByStudent[bill.student_id] = {
                            name: bill.student_name || 'Santri',
                            count: 0,
                            total: 0
                        };
                    }
                    groupedByStudent[bill.student_id].count++;
                    groupedByStudent[bill.student_id].total += Number(bill.amount);
                });

                Object.entries(groupedByStudent).forEach(([studentId, data]) => {
                    notifs.push({
                        id: `overdue-${studentId}`,
                        type: 'overdue',
                        title: 'Tunggakan > 2 Bulan',
                        message: `${data.name}: ${data.count} tagihan (Rp ${data.total.toLocaleString('id-ID')})`,
                        date: new Date().toISOString(),
                        icon: 'warning',
                        link: '/santri/tagihan'
                    });
                });
            }

            // 3. Check for pending budget approvals (for admin & pengasuh)
            if (isAdmin || isPengasuh) {
                const { data: pendingBudgets } = await supabase
                    .from('fund_budgets')
                    .select('*')
                    .eq('status', 'pending');

                if (pendingBudgets?.length > 0) {
                    notifs.push({
                        id: 'pending-approvals',
                        type: 'approval',
                        title: 'Persetujuan Anggaran',
                        message: `${pendingBudgets.length} anggaran menunggu persetujuan`,
                        date: new Date().toISOString(),
                        icon: 'approval',
                        link: '/penyaluran/persetujuan'
                    });
                }
            }

            // 4. Check for recent budget status changes (for admin & bendahara)
            if (isAdmin || isBendahara) {
                const { data: recentApprovals } = await supabase
                    .from('fund_budgets')
                    .select('*')
                    .in('status', ['approved', 'rejected'])
                    .gte('approved_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
                    .order('approved_at', { ascending: false })
                    .limit(5);

                if (recentApprovals?.length > 0) {
                    recentApprovals.forEach(budget => {
                        notifs.push({
                            id: `budget-${budget.id}`,
                            type: budget.status === 'approved' ? 'success' : 'rejected',
                            title: budget.status === 'approved' ? 'Anggaran Disetujui' : 'Anggaran Ditolak',
                            message: `${budget.name}: Rp ${Number(budget.amount).toLocaleString('id-ID')}`,
                            date: budget.approved_at,
                            icon: budget.status === 'approved' ? 'success' : 'rejected',
                            link: '/penyaluran/anggaran'
                        });
                    });
                }
            }

            setSmartNotifications(notifs);
        } catch (err) {
            console.error('Error generating smart notifications:', err);
        } finally {
            setLoading(false);
        }
    }, [user, isAdmin, isBendahara, isPengasuh]);

    // Initial load
    useEffect(() => {
        if (user) {
            generateSmartNotifications();
        }
    }, [user, generateSmartNotifications]);

    // Refresh every 30 seconds for more real-time feel
    useEffect(() => {
        if (!user) return;
        const interval = setInterval(() => {
            generateSmartNotifications();
        }, 30 * 1000); // 30 seconds
        return () => clearInterval(interval);
    }, [user, generateSmartNotifications]);

    // Combine notifications with read status from localStorage
    const allNotifications = useMemo(() => {
        return smartNotifications.map(n => ({
            ...n,
            read: readIds.includes(n.id)
        })).sort((a, b) => new Date(b.date) - new Date(a.date));
    }, [smartNotifications, readIds]);

    const unreadCount = useMemo(() =>
        allNotifications.filter(n => !n.read).length,
        [allNotifications]);

    // Mark notification as read - persist to localStorage
    const markAsRead = useCallback((id) => {
        setReadIds(prev => {
            if (prev.includes(id)) return prev;
            const newIds = [...prev, id];
            saveReadIds(newIds);
            return newIds;
        });
    }, []);

    // Mark all as read - persist to localStorage
    const markAllAsRead = useCallback(() => {
        const allIds = smartNotifications.map(n => n.id);
        const newIds = [...new Set([...readIds, ...allIds])];
        setReadIds(newIds);
        saveReadIds(newIds);
    }, [smartNotifications, readIds]);

    return (
        <NotificationContext.Provider value={{
            notifications: allNotifications,
            unreadCount,
            loading,
            markAsRead,
            markAllAsRead,
            refresh: generateSmartNotifications
        }}>
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotifications() {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within NotificationProvider');
    }
    return context;
}
