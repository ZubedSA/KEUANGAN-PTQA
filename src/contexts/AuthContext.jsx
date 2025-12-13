import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

// Auto logout after 30 minutes of inactivity
const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const timeoutRef = useRef(null);
    const lastActivityRef = useRef(Date.now());

    // Reset inactivity timer
    const resetTimer = useCallback(() => {
        lastActivityRef.current = Date.now();
        localStorage.setItem('last_activity', Date.now().toString());
    }, []);

    // Auto logout function
    const autoLogout = useCallback(async () => {
        if (user) {
            try {
                await supabase.from('audit_logs').insert([{
                    id: Date.now().toString(36),
                    action: 'AUTO_LOGOUT',
                    details: `${user.name} auto-logout karena tidak ada aktivitas`,
                    user_name: user.name,
                    timestamp: new Date().toISOString()
                }]);
            } catch (e) { }
        }
        setUser(null);
        localStorage.removeItem('auth_user');
        localStorage.removeItem('last_activity');
        window.location.href = '/login';
    }, [user]);

    // Check for inactivity
    useEffect(() => {
        if (!user) return;

        const checkInactivity = () => {
            const lastActivity = parseInt(localStorage.getItem('last_activity') || Date.now().toString());
            const now = Date.now();

            if (now - lastActivity > INACTIVITY_TIMEOUT) {
                autoLogout();
            }
        };

        // Check every minute
        const intervalId = setInterval(checkInactivity, 60000);

        // Listen for activity events
        const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];

        const handleActivity = () => {
            resetTimer();
        };

        activityEvents.forEach(event => {
            window.addEventListener(event, handleActivity, { passive: true });
        });

        // Initial activity timestamp
        resetTimer();

        return () => {
            clearInterval(intervalId);
            activityEvents.forEach(event => {
                window.removeEventListener(event, handleActivity);
            });
        };
    }, [user, autoLogout, resetTimer]);

    useEffect(() => {
        // Check for saved session
        const savedUser = localStorage.getItem('auth_user');
        const lastActivity = localStorage.getItem('last_activity');

        if (savedUser) {
            // Check if session expired
            if (lastActivity) {
                const elapsed = Date.now() - parseInt(lastActivity);
                if (elapsed > INACTIVITY_TIMEOUT) {
                    // Session expired
                    localStorage.removeItem('auth_user');
                    localStorage.removeItem('last_activity');
                    setLoading(false);
                    return;
                }
            }
            setUser(JSON.parse(savedUser));
        }
        setLoading(false);
    }, []);

    const login = async (username, password) => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('username', username)
                .eq('password', password)
                .eq('status', 'active')
                .single();

            if (error || !data) {
                return { success: false, error: 'Username atau password salah' };
            }

            setUser(data);
            localStorage.setItem('auth_user', JSON.stringify(data));
            localStorage.setItem('last_activity', Date.now().toString());

            // Log activity
            await supabase.from('audit_logs').insert([{
                id: Date.now().toString(36),
                action: 'LOGIN',
                details: `${data.name} login`,
                user_name: data.name,
                timestamp: new Date().toISOString()
            }]);

            return { success: true, user: data };
        } catch (err) {
            return { success: false, error: err.message };
        }
    };

    const logout = async () => {
        if (user) {
            await supabase.from('audit_logs').insert([{
                id: Date.now().toString(36),
                action: 'LOGOUT',
                details: `${user.name} logout`,
                user_name: user.name,
                timestamp: new Date().toISOString()
            }]);
        }
        setUser(null);
        localStorage.removeItem('auth_user');
        localStorage.removeItem('last_activity');
    };

    const isAdmin = user?.role === 'admin';
    const isBendahara = user?.role === 'bendahara';
    // Support both 'pengasuh' and legacy 'user' role for backward compatibility
    const isPengasuh = user?.role === 'pengasuh' || user?.role === 'user';
    const canEdit = isAdmin || isBendahara; // pengasuh/user cannot edit
    const isLoggedIn = !!user;

    return (
        <AuthContext.Provider value={{ user, login, logout, isAdmin, isBendahara, isPengasuh, canEdit, isLoggedIn, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
}
