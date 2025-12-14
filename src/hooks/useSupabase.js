import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Custom hook for Supabase realtime data synchronization
 * Falls back to localStorage if Supabase fails
 */
export default function useSupabase(tableName, initialValue = []) {
    const [data, setData] = useState(initialValue);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch data from Supabase
    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const { data: records, error: fetchError } = await supabase
                .from(tableName)
                .select('*')
                .order('created_at', { ascending: false });

            if (fetchError) throw fetchError;
            setData(records || []);
            setError(null);
        } catch (err) {
            console.error(`Error fetching ${tableName}:`, err);
            setError(err.message);
            // Fallback to localStorage
            const cached = localStorage.getItem(tableName);
            if (cached) setData(JSON.parse(cached));
        } finally {
            setLoading(false);
        }
    }, [tableName]);

    // Initial fetch
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // NOTE: Realtime subscription removed to prevent duplicate data issue
    // Local state updates in insert/update/remove functions are sufficient
    // If you need multi-user sync, you can uncomment the realtime code below
    // and ensure your Supabase tables have realtime enabled
    /*
    useEffect(() => {
        const channel = supabase
            .channel(`${tableName}_changes`)
            .on('postgres_changes', { event: '*', schema: 'public', table: tableName }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    setData(prev => {
                        const exists = prev.some(item => item.id === payload.new.id);
                        if (exists) return prev;
                        return [payload.new, ...prev];
                    });
                } else if (payload.eventType === 'UPDATE') {
                    setData(prev => prev.map(item => item.id === payload.new.id ? payload.new : item));
                } else if (payload.eventType === 'DELETE') {
                    setData(prev => prev.filter(item => item.id !== payload.old.id));
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [tableName]);
    */

    // Insert function
    const insert = async (newRecord) => {
        try {
            const recordWithTimestamp = {
                ...newRecord,
                created_at: new Date().toISOString()
            };
            const { data: inserted, error: insertError } = await supabase
                .from(tableName)
                .insert([recordWithTimestamp])
                .select()
                .single();

            if (insertError) throw insertError;

            // Update local state immediately
            if (inserted) {
                setData(prev => [inserted, ...prev]);
            }

            return inserted;
        } catch (err) {
            console.error(`Error inserting into ${tableName}:`, err);
            setError(err.message);
            return null;
        }
    };

    // Update function
    const update = async (id, updates) => {
        try {
            const { data: updated, error: updateError } = await supabase
                .from(tableName)
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (updateError) throw updateError;

            // Update local state immediately
            if (updated) {
                setData(prev => prev.map(item => item.id === updated.id ? updated : item));
            }

            return updated;
        } catch (err) {
            console.error(`Error updating ${tableName}:`, err);
            setError(err.message);
            return null;
        }
    };

    // Delete function
    const remove = async (id) => {
        try {
            const { error: deleteError } = await supabase
                .from(tableName)
                .delete()
                .eq('id', id);

            if (deleteError) throw deleteError;

            // Update local state immediately
            setData(prev => prev.filter(item => item.id !== id));

            return true;
        } catch (err) {
            console.error(`Error deleting from ${tableName}:`, err);
            setError(err.message);
            return false;
        }
    };

    // Upsert function (for notes)
    const upsert = async (record) => {
        try {
            const { data: upserted, error: upsertError } = await supabase
                .from(tableName)
                .upsert([record])
                .select()
                .single();

            if (upsertError) throw upsertError;
            return upserted;
        } catch (err) {
            console.error(`Error upserting ${tableName}:`, err);
            setError(err.message);
            return null;
        }
    };

    return { data, loading, error, insert, update, remove, upsert, refetch: fetchData };
}
