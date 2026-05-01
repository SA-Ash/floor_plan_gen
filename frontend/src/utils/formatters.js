/** Data formatting utilities */

export function formatCurrency(amount, currency = 'INR') {
    if (currency === 'INR') {
        if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
        if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)} L`;
        if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}K`;
        return `₹${amount.toLocaleString('en-IN')}`;
    }
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

export function formatArea(sqFt) {
    if (sqFt >= 1000) return `${(sqFt / 1000).toFixed(1)}K sq ft`;
    return `${sqFt.toLocaleString()} sq ft`;
}

export function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric'
    });
}

export function formatDuration(days) {
    if (days >= 365) return `${Math.floor(days / 365)}y ${days % 365}d`;
    if (days >= 30) return `${Math.floor(days / 30)}m ${days % 30}d`;
    return `${days} days`;
}

export function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

export function truncate(str, maxLen = 50) {
    return str.length > maxLen ? str.slice(0, maxLen) + '…' : str;
}
