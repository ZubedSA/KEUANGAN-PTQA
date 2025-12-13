import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check for saved session
        const savedUser = localStorage.getItem('auth_user');
        if (savedUser) {
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
    };

    const isAdmin = user?.role === 'admin';
    const isBendahara = user?.role === 'bendahara';
    const isPengasuh = user?.role === 'pengasuh';
    const canEdit = isAdmin || isBendahara; // pengasuh cannot edit
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
