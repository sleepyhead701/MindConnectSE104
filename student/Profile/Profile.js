import { getStudentProfile, saveStudentProfile, getStudentSession } from '../studentState.js';
import { escapeHtml } from '../utils/utils.js';
import { updateNav } from '../utils/updateNav.js';
import { animateMainContentSwap } from '../animations.js';
import { showNotification } from '../utils/utils.js';
import { isOwnedFeedPost, getCurrentProfileNames } from '../studentState.js';
import { getAuthSession } from '../studentState.js';
import { getCurrentUserName, getCurrentUserEmail } from '../studentState.js';
import { setCurrentUserName, setCurrentUserEmail } from '../studentState.js';
import { syncAuthProfileName } from '../studentState.js';
import { getUserFeed, savePublicFeed } from '../../shared/state.js';
import { updateStudentProfileBadge } from '../NewsFeed/NewsFeed.js';
import { openFeedbackModal, openBookingModal } from '../Booking/Booking.js';
import {
    getStudentBookings,
    saveStudentBookings,
    setStudentBookings
} from '../studentState.js';
import {
    getStudentNotifications,
    markStudentNotificationsRead,
    syncBookingNotifications
} from '../Booking/BookingNotifications.js';
import { getBackendReadyState } from '../../shared/state.js';
import { apiRequest} from '../utils/utils.js';
import { getAuthHeaders } from '../API/getAuthHeaders.js';
import { getBookingStatusLabel, getSupportLocation } from '../Booking/Booking.js';

const MAX_AVATAR_BYTES = 500 * 1024;
const MAX_AVATAR_INPUT_BYTES = 5 * 1024 * 1024;

function getDataUrlByteSize(dataUrl) {
    const base64 = String(dataUrl || '').split(',')[1] || '';
    return Math.floor((base64.length * 3) / 4);
}

function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error || new Error('Không đọc được ảnh.'));
        reader.readAsDataURL(file);
    });
}

function loadImage(dataUrl) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Không xử lý được ảnh này.'));
        img.src = dataUrl;
    });
}

async function compressAvatarInBrowser(dataUrl) {
    if (getDataUrlByteSize(dataUrl) <= MAX_AVATAR_BYTES) return dataUrl;

    const image = await loadImage(dataUrl);
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const maxEdge = 512;
    const ratio = Math.min(1, maxEdge / Math.max(image.width, image.height));
    canvas.width = Math.max(1, Math.round(image.width * ratio));
    canvas.height = Math.max(1, Math.round(image.height * ratio));
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    for (const quality of [0.86, 0.78, 0.7, 0.62, 0.54, 0.46]) {
        const candidate = canvas.toDataURL('image/jpeg', quality);
        if (getDataUrlByteSize(candidate) <= MAX_AVATAR_BYTES) {
            return candidate;
        }
    }

    throw new Error('Ảnh vẫn lớn hơn 500KB sau khi nén. Bạn hãy chọn ảnh nhỏ hơn.');
}

async function compressAvatarOnBackend(dataUrl) {
    if (!getBackendReadyState()) return dataUrl;

    try {
        const result = await apiRequest('/api/media/images/compress', {
            method: 'POST',
            body: JSON.stringify({ image: dataUrl })
        });
        return result?.image || dataUrl;
    } catch (error) {
        if (getDataUrlByteSize(dataUrl) > MAX_AVATAR_BYTES) {
            throw error;
        }
        return dataUrl;
    }
}

async function handleAvatarUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedAvatarTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
    if (!allowedAvatarTypes.includes(file.type)) {
        alert('Vui lòng chọn ảnh PNG, JPG, WebP hoặc GIF để làm avatar.');
        return;
    }

    if (file.size > MAX_AVATAR_INPUT_BYTES) {
        alert('Ảnh gốc nên nhỏ hơn 5MB để hệ thống có thể nén xuống 500KB.');
        return;
    }

    try {
        const rawDataUrl = await readFileAsDataUrl(file);
        let backendCompressed;
        if (getBackendReadyState()) {
            try {
                backendCompressed = await compressAvatarOnBackend(rawDataUrl);
            } catch (error) {
                backendCompressed = await compressAvatarInBrowser(rawDataUrl);
                backendCompressed = await compressAvatarOnBackend(backendCompressed);
            }
        } else {
            backendCompressed = await compressAvatarInBrowser(rawDataUrl);
        }

        if (getDataUrlByteSize(backendCompressed) > MAX_AVATAR_BYTES) {
            alert('Ảnh sau xử lý vẫn lớn hơn 500KB. Vui lòng chọn ảnh nhỏ hơn.');
            return;
        }

        const preview = document.getElementById('profile-avatar-preview');
        if (!preview) return;
        preview.src = backendCompressed;
        preview.dataset.avatarUrl = backendCompressed;
        showNotification('Đã nén avatar xuống dưới 500KB.');
    } catch (error) {
        alert(error.message || 'Không xử lý được avatar lúc này.');
    }
}

function saveProfileSettings() {
    const previousProfile = getStudentProfile();
    const previousNames = getCurrentProfileNames(previousProfile);
    const nameInput = document.getElementById('profile-display-name');
    const bioInput = document.getElementById('profile-bio');
    const avatarPreview = document.getElementById('profile-avatar-preview');
    const nextName = nameInput?.value.trim() || '';

    if (nextName.length < 2) {
        alert('Tên hiển thị cần có ít nhất 2 ký tự.');
        return;
    }

    const updatedProfile = {
        name: nextName,
        email: previousProfile.email,
        avatarUrl: avatarPreview?.dataset.avatarUrl || avatarPreview?.getAttribute('src') || previousProfile.avatarUrl || 'assets/images/logo.png',
        bio: bioInput?.value.trim() || ''
    };

    saveStudentProfile(updatedProfile);
    syncAuthProfileName(updatedProfile.name);
    setCurrentUserName(updatedProfile.name);
    setCurrentUserEmail(updatedProfile.email);

    const userFeed = getUserFeed();
    const updatedUserFeed = userFeed.map(post => {
        const ownsPost = isOwnedFeedPost(post) || previousNames.has(post.author);
        const nextPost = { ...post };

        if (ownsPost) {
            nextPost.author = updatedProfile.name;
            nextPost.author_avatar = updatedProfile.avatarUrl;
            nextPost.owner_email = updatedProfile.email;
            nextPost.isUser = true;
        }

        if (Array.isArray(nextPost.commentObjects)) {
            nextPost.commentObjects = nextPost.commentObjects.map(comment => {
                const ownsComment = comment?.isUser || previousNames.has(comment?.author) || (
                    comment?.owner_email &&
                    updatedProfile.email &&
                    String(comment.owner_email).toLowerCase() === String(updatedProfile.email).toLowerCase()
                );
                return ownsComment
                    ? {
                        ...comment,
                        author: updatedProfile.name,
                        author_avatar: updatedProfile.avatarUrl,
                        owner_email: updatedProfile.email,
                        isUser: true
                    }
                    : comment;
            });
        }

        return nextPost;
    });
    userFeed.splice(0, userFeed.length, ...updatedUserFeed);
    savePublicFeed();

    updateStudentProfileBadge();
    showNotification('Đã cập nhật hồ sơ cá nhân.');
    renderProfile();
}

export function renderProfile() {
    const container = document.getElementById('student-main-content');
    updateNav(-1);
    animateMainContentSwap();

    const profile = getStudentProfile();
    const avatarUrl = profile.avatarUrl || 'assets/images/logo.png';
    const bookingsHtml = renderStudentBookingsHtml(getStudentBookings());
    const studentNotifications = getStudentNotifications();
    const notificationsHtml = renderStudentNotificationsHtml(studentNotifications);
    const unreadCount = studentNotifications.filter(notification => !notification.read).length;

    container.innerHTML = `
        <section class="mc-page">
            <div class="mc-page-header">
                <p class="mc-kicker">Thông tin cá nhân</p>
                <h1>User <span>Profile</span></h1>
                <p>Đổi tên hiển thị, avatar và phần giới thiệu xuất hiện trên News feed.</p>
            </div>

            <div class="mc-panel mc-profile-panel">
                <div class="mc-profile-editor">
                    <div class="mc-profile-avatar-block">
                        <img
                            id="profile-avatar-preview"
                            src="${escapeHtml(avatarUrl)}"
                            data-avatar-url="${escapeHtml(avatarUrl)}"
                            alt="Avatar"
                            class="mc-profile-avatar"
                        >
                        <input id="profile-avatar-input" type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden>
                        <label class="mc-btn mc-btn-outline" for="profile-avatar-input">Upload avatar</label>
                    </div>

                    <div class="mc-profile-fields">
                        <label class="mc-field-label" for="profile-display-name">Tên hiển thị</label>
                        <input id="profile-display-name" type="text" class="mc-input" value="${escapeHtml(profile.displayName || profile.name)}" maxlength="40">

                        <label class="mc-field-label" for="profile-email">Email tài khoản</label>
                        <input id="profile-email" type="email" class="mc-input" value="${escapeHtml(profile.email || '')}" disabled>

                        <label class="mc-field-label" for="profile-bio">Giới thiệu ngắn</label>
                        <textarea id="profile-bio" class="mc-textarea mc-profile-bio" maxlength="220">${escapeHtml(profile.bio || '')}</textarea>

                        <div class="mc-action-grid mc-profile-actions">
                            <button class="mc-btn mc-btn-primary" type="button" data-action="save-profile">Lưu hồ sơ</button>
                            <button class="mc-btn mc-btn-outline" type="button" data-action="feedback">Gửi feedback</button>
                            <button class="mc-btn mc-btn-outline" type="button" data-action="logout">Đăng xuất</button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="mc-panel mc-booking-section mc-booking-notification-section">
                <div class="mc-booking-section-header">
                    <div>
                        <p class="mc-kicker">Cập nhật hỗ trợ</p>
                        <h3>Thông báo lịch hẹn</h3>
                        <p>Cập nhật khi lịch hẹn được tạo, xác nhận, hẹn lại hoặc sắp tới giờ.</p>
                    </div>
                    <div class="mc-booking-header-actions">
                        <span class="mc-booking-count-pill" id="student-notification-unread-count">${escapeHtml(String(unreadCount))} mới</span>
                        <button class="mc-btn mc-btn-outline mc-booking-secondary-btn" type="button" data-action="mark-notifications-read">Đánh dấu đã đọc</button>
                    </div>
                </div>
                <div id="student-notification-list" class="mc-booking-list mc-notification-list">
                    ${notificationsHtml}
                </div>
            </div>

            <div class="mc-panel mc-booking-section">
                <div class="mc-booking-section-header">
                    <div>
                        <p class="mc-kicker">Tham vấn</p>
                        <h3>Lịch hẹn của tôi</h3>
                        <p>Theo dõi các yêu cầu tham vấn bạn đã gửi cho nhà trường.</p>
                    </div>
                    <div class="mc-booking-header-actions">
                        <button class="mc-btn mc-btn-primary" type="button" data-action="book-session">Đặt lịch mới</button>
                        <button class="mc-btn mc-btn-outline mc-booking-secondary-btn" type="button" data-action="refresh-bookings">Làm mới</button>
                    </div>
                </div>
                <div id="student-booking-list" class="mc-booking-list mc-appointment-list">
                    ${bookingsHtml}
                </div>
            </div>
        </section>
    `;
    const avatarInput = document.getElementById('profile-avatar-input');
    if (avatarInput) {
        avatarInput.addEventListener('change', handleAvatarUpload);
    }
    refreshStudentBookings({ silent: true });
}
document.addEventListener('click', event => {
    const actionBtn = event.target.closest('[data-action]');
    if (!actionBtn) return;
    const action = actionBtn.getAttribute('data-action');
    if (action === 'save-profile') {
        saveProfileSettings();
    } else if (action === 'logout') {
        logout();
    } else if (action === 'feedback') {
        openFeedbackModal();
    } else if (action === 'book-session') {
        openBookingModal();
    } else if (action === 'refresh-bookings') {
        refreshStudentBookings();
    } else if (action === 'mark-notifications-read') {
        markStudentNotificationsRead();
        renderStudentNotificationsList();
    } else if (action === 'reschedule-booking') {
        const bookingId = actionBtn.getAttribute('data-booking-id');
        if (bookingId) {
            openFeedbackModal({ bookingId });
        }
    }
});

function renderStudentNotificationsHtml(notifications = []) {
    if (!notifications.length) {
        return `
            <div class="mc-booking-empty">
                <strong>Chưa có thông báo lịch hẹn nào.</strong>
                <span>Khi lịch hẹn thay đổi, cập nhật sẽ xuất hiện tại đây.</span>
            </div>
        `;
    }

    return notifications.slice(0, 8).map(notification => {
        const status = normalizeBookingStatus(notification.status);
        return `
        <article class="mc-notification-card ${notification.read ? 'is-read' : 'is-new'} mc-status-${escapeHtml(status)}">
            <div class="mc-booking-marker" aria-hidden="true"></div>
            <div class="mc-notification-body">
                <div class="mc-booking-card-top">
                    <strong>${escapeHtml(notification.title)}</strong>
                    <span class="mc-booking-chip ${notification.read ? 'is-read' : 'is-new'}">${notification.read ? 'Đã đọc' : 'Mới'}</span>
                </div>
                <p>${escapeHtml(notification.message)}</p>
                <span class="mc-booking-meta">${escapeHtml(formatNotificationTime(notification.created_at))}</span>
            </div>
        </article>
    `;
    }).join('');
}

function renderStudentNotificationsList() {
    const list = document.getElementById('student-notification-list');
    if (list) list.innerHTML = renderStudentNotificationsHtml(getStudentNotifications());
    const unreadCounter = document.getElementById('student-notification-unread-count');
    if (unreadCounter) {
        unreadCounter.textContent = `${getStudentNotifications().filter(notification => !notification.read).length} mới`;
    }
}

function renderStudentBookingsHtml(bookings = []) {
    if (!bookings.length) {
        return `
            <div class="mc-booking-empty">
                <strong>Bạn chưa có lịch hẹn nào.</strong>
                <span>Khi đặt lịch tham vấn, trạng thái lịch hẹn sẽ xuất hiện ở đây.</span>
            </div>
        `;
    }

    return bookings.map(booking => {
        const latestUpdate = Array.isArray(booking.public_updates) && booking.public_updates.length
            ? booking.public_updates[booking.public_updates.length - 1]
            : null;
        const status = normalizeBookingStatus(booking.status);
        const dateParts = formatBookingScheduleParts(booking.requested_time);
        return `
        <article class="mc-appointment-card mc-status-${escapeHtml(status)}">
            <div class="mc-appointment-date" aria-label="${escapeHtml(dateParts.label)}">
                <strong>${escapeHtml(dateParts.day)}</strong>
                <span>${escapeHtml(dateParts.month)}</span>
            </div>
            <div class="mc-appointment-main">
                <div class="mc-booking-card-top">
                    <div>
                        <strong>${escapeHtml(dateParts.time)}</strong>
                        <p>${escapeHtml(booking.location || getSupportLocation())}</p>
                    </div>
                    <span class="mc-booking-chip mc-status-chip mc-status-${escapeHtml(status)}">
                        ${escapeHtml(getBookingStatusLabel(booking.status))}
                    </span>
                </div>
                ${booking.note ? `<p class="mc-appointment-note">${escapeHtml(booking.note)}</p>` : ''}
                ${latestUpdate?.message ? `<p class="mc-appointment-update">Cập nhật mới nhất: ${escapeHtml(latestUpdate.message)}</p>` : ''}
                ${booking.rescheduled_from ? `<p class="mc-appointment-warning">Lịch này được tạo từ một lần hẹn lại.</p>` : ''}
            </div>
        </article>
    `;
    }).join('');
}

function normalizeBookingStatus(status) {
    return String(status || 'new').replace(/[^a-z0-9_-]/gi, '').toLowerCase() || 'new';
}

function formatNotificationTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Vừa cập nhật';
    return date.toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit'
    });
}

function formatBookingScheduleParts(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return {
            day: '--',
            month: 'Chưa chọn',
            time: 'Chưa chọn thời gian',
            label: 'Chưa chọn thời gian'
        };
    }

    return {
        day: date.toLocaleDateString('vi-VN', { day: '2-digit' }),
        month: `Th${date.toLocaleDateString('vi-VN', { month: '2-digit' })}`,
        time: date.toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit'
        }),
        label: date.toLocaleString('vi-VN')
    };
}

function renderStudentBookingsList() {
    const list = document.getElementById('student-booking-list');
    if (list) list.innerHTML = renderStudentBookingsHtml(getStudentBookings());
}

document.addEventListener('mindconnect:bookings-updated', renderStudentBookingsList);
document.addEventListener('mindconnect:notifications-updated', renderStudentNotificationsList);

async function refreshStudentBookings(options = {}) {
    if (!getBackendReadyState()) return;
    try {
        const remoteBookings = await apiRequest('/api/bookings/my');
        const hasAuthToken = Boolean(getAuthHeaders().Authorization);
        if (Array.isArray(remoteBookings) && (remoteBookings.length || hasAuthToken)) {
            const previousBookings = getStudentBookings();
            syncBookingNotifications(remoteBookings, previousBookings);
            setStudentBookings(remoteBookings);
            saveStudentBookings();
            renderStudentBookingsList();
            renderStudentNotificationsList();
        }
    } catch (error) {
        if (!options.silent) {
            showNotification('Chưa tải được lịch hẹn từ backend, đang hiển thị dữ liệu local.');
        }
    }
}

export function logout() {
    localStorage.removeItem('mindconnect:auth');
    localStorage.removeItem('mindconnect:role');
    localStorage.removeItem('authSession');
    window.location.href = 'index.html';
}
