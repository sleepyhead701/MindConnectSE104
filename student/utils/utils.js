import { getAPIBaseUrl } from '../../shared/state.js';

import { getAuthHeaders } from '../API/getAuthHeaders.js';

export function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

export function stripHtml(value) {
    return String(value || '').replace(/<[^>]*>/g, ' ');
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
    const response = await fetch(`${getAPIBaseUrl()}${path}`, {
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

export function showNotification(text, options = {}) {
    const config = typeof text === 'object' && text !== null ? text : { message: text };
    const variant = config.variant || options.variant || '';
    const duration = Number(config.duration || options.duration || 4000);
    const notif = document.createElement('div');
    notif.className = `notification-toast${variant ? ` notification-${variant}` : ''}`;

    if (variant === 'mood-reminder') {
        notif.innerHTML = `
            <div class="notification-reminder-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
                    <path d="M12 21s7-4.4 7-10.2A4.7 4.7 0 0 0 14.3 6 5 5 0 0 0 12 6.6 5 5 0 0 0 9.7 6 4.7 4.7 0 0 0 5 10.8C5 16.6 12 21 12 21Z" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/>
                    <path d="M9 11.2h.01M15 11.2h.01M9.5 14.8c1.5 1.1 3.5 1.1 5 0" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>
                </svg>
            </div>
            <div class="notification-reminder-body">
                <strong>${escapeHtml(config.title || 'Quick Test cảm xúc')}</strong>
                <span>${escapeHtml(config.message || 'Dành 30 giây để ghi nhận cảm xúc hôm nay.')}</span>
            </div>
            <button class="notification-reminder-action" type="button">${escapeHtml(config.actionLabel || 'Làm ngay')}</button>
        `;

        notif.querySelector('.notification-reminder-action')?.addEventListener('click', () => {
            if (typeof config.onAction === 'function') {
                config.onAction();
            } else if (config.actionSelector) {
                document.querySelector(config.actionSelector)?.click();
            }
            notif.remove();
        });
    } else {
        notif.innerText = config.message || '';
    }
    // Tìm mobile-frame để gắn vào, tránh lỗi nếu chưa load DOM
    const frame = document.querySelector('.mobile-frame');
    if(frame) {
        frame.appendChild(notif);
        setTimeout(() => notif.remove(), duration);
    }
}
