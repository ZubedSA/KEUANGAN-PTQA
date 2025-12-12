export const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
};

export const formatDate = (dateString) => {
    if (!dateString) return '-';
    // Handle specific time if needed, but usually just date
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('id-ID', options);
};

export const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const logActivity = (action, details, user = 'Bendahara') => {
    try {
        const logs = JSON.parse(localStorage.getItem('audit_logs') || '[]');
        const newLog = {
            id: generateId(),
            timestamp: new Date().toISOString(),
            action,
            details,
            user
        };
        localStorage.setItem('audit_logs', JSON.stringify([newLog, ...logs]));
    } catch (e) {
        console.error("Failed to log activity", e);
    }
};
