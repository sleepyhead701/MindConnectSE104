export function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function relativeTimeFrom(dateInput) {
    const date = new Date(dateInput);
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 60) return "Vừa xong";
    if (diff < 3600) return `${Math.floor(diff / 60)}p trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
    if (diff < 2592000) return `${Math.floor(diff / 86400)} ngày trước`;
    if (diff < 31536000) return `${Math.floor(diff / 2592000)} tháng trước`;
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
}

export function formatFeedTime(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? escapeHtml(value || '') : relativeTimeFrom(value);
}

export function getFeedGradient(index) {
    const gradients = ['mc-avatar-rose', 'mc-avatar-coral', 'mc-avatar-amber', 'mc-avatar-slate'];
    return gradients[index % gradients.length];
}

export function getInitials(name) {
    return String(name || 'SV')
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(part => part[0])
        .join('')
        .toUpperCase() || 'SV';
}

export function renderAvatar(name, avatarUrl, index = 0) {
    if (avatarUrl) {
        return `<div class="mc-avatar"><img src="${escapeHtml(avatarUrl)}" alt="" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;"></div>`;
    }

    return `<div class="mc-avatar ${getFeedGradient(index)}">${escapeHtml(getInitials(name))}</div>`;
}

export async function apiRequest(path, options = {}) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
            ...(options.headers || {})
        }
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok || result.success === false) {
        throw new Error(result.error || 'API request failed');
    }

    return result.data;
}