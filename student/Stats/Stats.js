import { getStudentProfile, saveStudentProfile, getStudentSession } from '../studentState.js';
import { escapeHtml } from '../utils/utils.js';
import { updateNav } from '../utils/updateNav.js';
import { animateMainContentSwap } from '../animations.js';
import { showNotification } from '../utils/utils.js';
import { getPrivateDiaryEntries, isOwnedFeedPost } from '../studentState.js';
import { getUserFeed } from '../../state.js';
import { getBackendReadyState } from '../../state.js';
import { openFeedbackModal, openBookingModal } from '../Booking/Booking.js';

function normalizeEmotionText(text) {
    return String(text || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

function getEmotionScore(source) {
    const text = normalizeEmotionText(`${source.title || ''} ${source.content || ''} ${(source.tags || []).join(' ')}`);
    const negativeSignals = [
        ['tuyet vong', 24], ['tu hai', 28], ['khong muon song', 28], ['khung hoang', 22],
        ['burnout', 18], ['kiet suc', 18], ['mat ngu', 14], ['lo au', 16],
        ['cang thang', 15], ['stress', 15], ['ap luc', 14], ['so hai', 13],
        ['co don', 12], ['chan nan', 12], ['khoc', 10], ['deadline', 8], ['khong tot', 8]
    ];
    const positiveSignals = [
        ['binh yen', 16], ['nhe nhang', 14], ['on hon', 13], ['on dinh', 13],
        ['vui', 12], ['tot', 10], ['hy vong', 12], ['cam on', 10],
        ['thu gian', 10], ['nghi ngoi', 8], ['thanh cong', 8], ['duoc hon', 8]
    ];

    let score = Number.isFinite(Number(source.mood_score))
        ? Math.min(95, Math.max(12, Number(source.mood_score) * 18 + 8))
        : 58;

    negativeSignals.forEach(([signal, weight]) => {
        if (text.includes(signal)) score -= weight;
    });
    positiveSignals.forEach(([signal, weight]) => {
        if (text.includes(signal)) score += weight;
    });

    return Math.round(Math.min(96, Math.max(8, score)));
}

function getEmotionTone(score) {
    if (score < 40) return { tone: 'danger', label: 'Căng thẳng', color: '#d32f2f' };
    if (score < 60) return { tone: 'neutral', label: 'Dao động', color: '#f0a85f' };
    if (score < 78) return { tone: 'rose', label: 'Ổn định', color: 'var(--accent-pink)' };
    return { tone: 'amber', label: 'Tích cực', color: 'var(--success)' };
}

function getLocalDateKey(dateInput) {
    const date = dateInput ? new Date(dateInput) : new Date();
    if (Number.isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getWeekdayLabel(date) {
    return ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][date.getDay()];
}

function getEmotionSourcesForCurrentUser() {
    const diarySources = getPrivateDiaryEntries().map(entry => ({
        id: entry.id,
        type: 'diary',
        title: entry.title || 'Nhật ký riêng tư',
        content: entry.content || '',
        tags: Array.isArray(entry.tags) ? entry.tags : [],
        mood_score: entry.mood_score,
        date: entry.date || new Date().toISOString()
    }));

    const postSources = getUserFeed()
        .filter(isOwnedFeedPost)
        .map(post => ({
            id: post.id,
            type: 'post',
            title: 'Bài đăng Home',
            content: post.content || '',
            tags: Array.isArray(post.tags) ? post.tags : [],
            date: post.date || post.time || new Date().toISOString()
        }));

    return [...diarySources, ...postSources]
        .map(source => ({ ...source, score: getEmotionScore(source) }))
        .sort((a, b) => new Date(a.date) - new Date(b.date));
}

function buildWeeklyEmotionStats(sources) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const days = Array.from({ length: 7 }, (_, index) => {
        const day = new Date(today);
        day.setDate(today.getDate() - (6 - index));
        const key = getLocalDateKey(day);
        const daySources = sources.filter(source => getLocalDateKey(source.date) === key);
        const average = daySources.length
            ? Math.round(daySources.reduce((sum, source) => sum + source.score, 0) / daySources.length)
            : 0;
        const tone = getEmotionTone(average || 50);

        return {
            key,
            d: getWeekdayLabel(day),
            value: daySources.length ? average : 24,
            label: daySources.length ? tone.label : 'Chưa có dữ liệu',
            tone: tone.tone,
            empty: daySources.length === 0,
            count: daySources.length
        };
    });

    const filledDays = days.filter(day => !day.empty);
    const average = filledDays.length
        ? Math.round(filledDays.reduce((sum, day) => sum + day.value, 0) / filledDays.length)
        : 0;

    return { days, average, filledDays: filledDays.length };
}

function buildTodayEmotionInsight(sources) {
    const todayKey = getLocalDateKey(new Date());
    const todaySources = sources.filter(source => getLocalDateKey(source.date) === todayKey);
    const diaryCount = todaySources.filter(source => source.type === 'diary').length;
    const postCount = todaySources.filter(source => source.type === 'post').length;

    if (!todaySources.length) {
        return {
            sources: [],
            score: 0,
            tone: getEmotionTone(50),
            message: 'Hôm nay chưa có Diary hoặc bài đăng Home của bạn để AI phân tích. Khi bạn ghi nhật ký hoặc đăng bài, thống kê sẽ cập nhật theo đúng dữ liệu của bạn.',
            sourceSummary: '0 Diary, 0 bài đăng Home'
        };
    }

    const score = Math.round(todaySources.reduce((sum, source) => sum + source.score, 0) / todaySources.length);
    const tone = getEmotionTone(score);
    const message = score < 40
        ? 'Dữ liệu hôm nay cho thấy bạn đang chịu áp lực rõ rệt. Hãy ưu tiên nghỉ ngơi ngắn, giảm bớt việc phụ và cân nhắc đặt lịch tư vấn nếu cảm giác này kéo dài.'
        : score < 60
            ? 'Cảm xúc hôm nay có dao động. Bạn nên ghi thêm vài dòng Diary để gọi tên điều đang làm mình nặng lòng và chọn một việc nhỏ có thể hoàn thành ngay.'
            : score < 78
                ? 'Cảm xúc hôm nay khá ổn định. Hãy duy trì nhịp sinh hoạt hiện tại, nghỉ giữa các phiên học và tiếp tục theo dõi các tín hiệu căng thẳng.'
                : 'Cảm xúc hôm nay đang tích cực. Bạn có thể ghi lại điều đã giúp mình ổn hơn để dùng lại trong những ngày căng thẳng.';

    return {
        sources: todaySources,
        score,
        tone,
        message,
        sourceSummary: `${diaryCount} Diary, ${postCount} bài đăng Home`
    };
}

async function refreshTodayStatsAI(todaySources, fallbackInsight) {
    const insightBox = document.getElementById('today-ai-insight');
    if (!insightBox || !todaySources.length || !getBackendReadyState()) return;

    const payload = todaySources.map(source => {
        const sourceName = source.type === 'diary' ? 'Diary riêng tư' : 'Bài đăng Home của user';
        return `${sourceName}: ${source.title}\nTags: ${(source.tags || []).join(', ')}\nText: ${source.content}`;
    }).join('\n\n').slice(0, 1500);

    try {
        const result = await apiRequest('/chat/support', {
            method: 'POST',
            body: JSON.stringify({
                message: `Bạn là AI phân tích cảm xúc cho MindConnect. Chỉ dựa trên dữ liệu hôm nay của chính người dùng dưới đây, không nhắc tới comment của người khác. Trả lời bằng tiếng Việt, 2-3 câu, đưa một lời khuyên cụ thể và nhẹ nhàng.\n\n${payload}`,
                history: []
            })
        });

        if (result?.reply && document.getElementById('today-ai-insight') === insightBox) {
            insightBox.textContent = result.reply;
        }
    } catch (error) {
        insightBox.textContent = `${fallbackInsight.message} Phần này đang dùng phân tích cục bộ vì backend AI chưa phản hồi.`;
    }
}

export function renderStudentStats() {
    const container = document.getElementById('student-main-content');
    updateNav(3);
    animateMainContentSwap();

    const sources = getEmotionSourcesForCurrentUser();
    const weekly = buildWeeklyEmotionStats(sources);
    const todayInsight = buildTodayEmotionInsight(sources);
    const totalDiary = sources.filter(source => source.type === 'diary').length;
    const totalPosts = sources.filter(source => source.type === 'post').length;

    const barsHtml = weekly.days.map(day => `
        <div class="mc-chart-day">
            <div class="mc-chart-track">
                <div class="mc-chart-bar ${day.empty ? 'future' : `tone-${day.tone}`}" style="height:${day.value}%" title="${escapeHtml(day.label)}"></div>
            </div>
            <span>${day.d}</span>
        </div>
    `).join('');

    container.innerHTML = `
        <section class="mc-page">
            <div class="mc-page-header">
                <p class="mc-kicker">Tuần này</p>
                <h1>Thống kê <span>Cảm xúc</span></h1>
                <p>Chỉ dùng Diary riêng tư và bài đăng Home của chính bạn. Comment của người khác không được tính.</p>
            </div>

            <div class="mc-panel mc-stats-chart">
                <div class="mc-chart-header">
                    <div>
                        <h3>Cảm xúc 7 ngày qua</h3>
                        <p>Điểm trung bình: <strong>${weekly.average ? `${weekly.average} / 100` : 'Chưa có dữ liệu'}</strong></p>
                    </div>
                    <span class="mc-trend-pill">${weekly.filledDays}/7 ngày có dữ liệu thật</span>
                </div>
                <div class="mc-chart-grid">${barsHtml}</div>
                <p class="mc-chart-note">Nguồn: ${totalDiary} Diary riêng tư và ${totalPosts} bài đăng Home của bạn.</p>
            </div>

            <div class="mc-insight-grid">
                <div class="mc-panel mc-insight-card" style="border-left-color:${todayInsight.tone.color};">
                    <div class="mc-insight-icon">AI</div>
                    <div>
                        <h3>Phân tích AI hôm nay</h3>
                        <p id="today-ai-insight">${escapeHtml(todayInsight.message)}</p>
                    </div>
                </div>

                <div class="mc-panel mc-insight-card" style="border-left-color:#f0a85f;">
                    <div class="mc-insight-icon muted">i</div>
                    <div>
                        <h3>Nguồn dữ liệu</h3>
                        <p>${escapeHtml(todayInsight.sourceSummary)} trong ngày hiện tại. Stats không đọc comment của người khác và không lấy bài Diary đưa lên Home.</p>
                    </div>
                </div>
            </div>

            <div class="mc-action-grid">
                <button class="mc-btn mc-btn-outline" type="button" data-action="write-diary">Ghi Diary</button>
                <button class="mc-btn mc-btn-outline" type="button" data-action="write-post">Đăng Home</button>
                ${todayInsight.score && todayInsight.score < 45 ? `<button class="mc-btn mc-btn-primary" type="button" data-action="book-session">Đặt lịch tư vấn</button>` : ''}
            </div>
        </section>
    `;

    refreshTodayStatsAI(todayInsight.sources, todayInsight);
}

document.addEventListener('click', (e) => {
    const actionBtn = e.target.closest('button[data-action]');
    if (!actionBtn) return;
    const action = actionBtn.getAttribute('data-action');
    if (action === 'write-diary') {
        document.querySelector('.nav-icon[data-action="diary"]')?.click();
    } else if (action === 'write-post') {
        document.querySelector('.nav-icon[data-action="newsfeed"]')?.click();
    } else if (action === 'book-session') {
        openBookingModal();
    }
});