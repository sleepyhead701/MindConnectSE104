import { loadJson, saveJson } from '../../state.js';
import { updateNav } from '../utils/updateNav.js';
import { animateMainContentSwap } from '../animations.js';
import { escapeHtml, showNotification } from '../utils/utils.js';
import { trackInteraction } from '../API/analytics.js';
import { normalizeVietnamese } from '../utils/normalizeVietnamese.js';
import { getCustomResourcesKey } from '../studentState.js';
import { getResourcesDB} from '../../state.js';
import { addResources } from '../studentState.js';

var currentResource = getResourcesDB();
let customResourcesHydrated = false;

function trackResourceOpen(index) {
    const resource = currentResource[index];
    if (!resource) return;
    trackInteraction('resource_view', resource.title, {
        type: resource.type,
        title: resource.title
    });
}

function normalizeResourceType(url, requestedType) {
    if (requestedType && requestedType !== 'Tự nhận diện') return requestedType;
    const lowerUrl = String(url || '').toLowerCase();
    if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) return 'Video';
    if (lowerUrl.includes('spotify.com')) return 'Podcast';
    if (lowerUrl.endsWith('.pdf')) return 'Book';
    return 'Blog';
}

function loadCustomResources() {
    return loadJson(getCustomResourcesKey(), []);
}

function ensureCustomResourcesLoaded() {
    if (customResourcesHydrated) return;
    customResourcesHydrated = true;

    const resources = getResourcesDB();
    const existing = new Set(resources.map(resource => String(resource.url || resource.title || '').toLowerCase()));
    loadCustomResources().forEach(resource => {
        const key = String(resource.url || resource.title || '').toLowerCase();
        if (key && !existing.has(key)) {
            resources.push({ ...resource, isCustom: true });
            existing.add(key);
        }
    });
}

function saveCustomResources() {
    const customResources = getResourcesDB().filter(resource => resource.isCustom);
    saveJson(getCustomResourcesKey(), customResources);
}

function addCustomResource() {
    const url = document.getElementById('resource-url')?.value.trim() || '';
    const title = document.getElementById('resource-title')?.value.trim() || '';
    const requestedType = document.getElementById('resource-type')?.value || 'Tự nhận diện';

    let parsedUrl;
    try {
        parsedUrl = new URL(url);
    } catch (error) {
        alert('Bạn cần nhập link resource hợp lệ.');
        return;
    }

    if (!title) {
        alert('Bạn cần đặt tên cho resource trước khi import.');
        return;
    }

    const resource = {
        type: normalizeResourceType(parsedUrl.href, requestedType),
        title,
        duration: 'User import',
        img: 'logo.png',
        url: parsedUrl.href,
        isCustom: true
    };

    addResources(resource);
    showNotification('Đã import resource bằng link.');
    renderResourcesLibrary(resource.type);
}


function requestResourceByNeed() {
    const query = document.getElementById('resource-request-input')?.value.trim() || '';
    const resultBox = document.getElementById('resource-request-result');
    if (!resultBox) return;

    if (!query) {
        resultBox.innerHTML = '<p class="mc-empty">Bạn hãy nhập nhu cầu cần tìm tài nguyên.</p>';
        return;
    }

    const normalized = normalizeVietnamese(query);
    const matches = getResourcesDB().filter(resource => {
        const haystack = normalizeVietnamese(`${resource.title} ${resource.type} ${resource.duration}`);
        return normalized.split(/\s+/).some(token => token.length > 2 && haystack.includes(token));
    }).slice(0, 4);

    if (matches.length) {
        resultBox.innerHTML = matches.map(resource => `
            <a href="${escapeHtml(resource.url || '#')}" target="_blank" rel="noopener noreferrer" class="feedback-item positive" style="display:block; text-decoration:none;">
                <strong>${escapeHtml(resource.title)}</strong>
                <p class="feedback-text">${escapeHtml(resource.type)} · ${escapeHtml(resource.duration || '')}</p>
            </a>
        `).join('');
        return;
    }

    const externalSearch = `https://scholar.google.com/scholar?q=${encodeURIComponent(query + ' mental health')}`;
    const wikiSearch = `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(query)}`;
    resultBox.innerHTML = `
        <div class="feedback-item improvement">
            <strong>Chưa có resource phù hợp trong thư viện.</strong>
            <p class="feedback-text">Bạn có thể tìm nguồn học thuật bên ngoài, sau đó import link vào Resources.</p>
            <div class="feedback-action">
                <a class="btn-link" target="_blank" rel="noopener noreferrer" href="${externalSearch}">Google Scholar</a>
                <a class="btn-link" target="_blank" rel="noopener noreferrer" href="${wikiSearch}">Wikipedia</a>
            </div>
        </div>
    `;
}

export function renderResourcesLibrary(filterType = 'Tất cả') {
    const container = document.getElementById('student-main-content');
    updateNav(2);
    animateMainContentSwap();
    ensureCustomResourcesLoaded();

    const filteredDB = filterType === 'Tất cả'
        ? getResourcesDB()
        : getResourcesDB().filter(res => res.type === filterType);
    currentResource = filteredDB;

    const types = ['Tất cả', ...new Set(getResourcesDB().map(r => r.type))];

    const filterHtml = types.map(t => `
        <button class="filter-btn ${t === filterType ? 'active' : ''}" type="button"
            data-action="filter" data-type="${escapeHtml(t)}"
        >${escapeHtml(t)}</button>
    `).join('');

    const cardsHtml = filteredDB.map((res, index) => {
        const href = res.url || '#';
        const actionAttr = res.action
            ? `data-action="${res.action}" data-index="${index}" href="#"`
            : `href="${escapeHtml(href)}" data-action="open-resource" data-index="${index}" ${href === '#' ? '' : 'target="_blank" rel="noopener noreferrer"'}`;

        return `
            <a ${actionAttr} class="res-link mc-resource-link">
                <article class="res-card mc-resource-card">
                    <div class="res-img-container mc-resource-cover" style="background-image: url('${res.img || 'https://via.placeholder.com/150'}')">
                        <span class="res-type-tag">${escapeHtml(res.type)}</span>
                        <span class="mc-resource-duration">${escapeHtml(res.duration || '')}</span>
                    </div>
                    <div class="res-info">
                        <div class="res-title-main">${escapeHtml(res.title)}</div>
                        <div class="res-footer">Xem thêm →</div>
                    </div>
                </article>
            </a>
        `;
    }).join('');

    container.innerHTML = `
        <section class="mc-page">
            <div class="mc-page-header">
                <p class="mc-kicker">Kho tài nguyên</p>
                <h1>Tài nguyên cho <span>tâm hồn.</span></h1>
                <p>Import resource bằng link, ưu tiên nguồn chính thống và học thuật cho nội dung tâm lý.</p>
            </div>

            <div class="mc-panel mc-resource-shell">
                <div class="mc-resource-toolbar">
                    <div>
                        <label class="mc-field-label" for="resource-request-input">Tìm hoặc request resource</label>
                        <div class="mc-resource-search-row">
                            <input id="resource-request-input" class="mc-input" placeholder="Ví dụ: mất ngủ, anxiety, stress deadline">
                            <button class="mc-btn mc-btn-outline" type="button" data-action="request-resource">Gợi ý</button>
                        </div>
                    </div>
                    <div>
                        <label class="mc-field-label" for="resource-url">Import resource bằng link</label>
                        <div class="mc-resource-import-row">
                            <input id="resource-url" class="mc-input" placeholder="https://...">
                            <input id="resource-title" class="mc-input" placeholder="Tên resource">
                            <select id="resource-type" class="mc-input">
                                <option>Tự nhận diện</option>
                                <option>Blog</option>
                                <option>Video</option>
                                <option>Podcast</option>
                                <option>Book</option>
                                <option>Công cụ</option>
                            </select>
                            <button class="mc-btn mc-btn-primary" type="button" data-action="import-resource">Import</button>
                        </div>
                    </div>
                </div>
                <div id="resource-request-result" class="feedback-list"></div>

                <div class="filter-bar mc-filter-bar">${filterHtml}</div>
                <div class="resource-grid mc-resource-grid">
                    ${cardsHtml}
                </div>
            </div>
        </section>
    `;
}

function renderBreathingSpace() {
    const container = document.getElementById('student-main-content');
    updateNav(2);
    animateMainContentSwap();
    container.innerHTML = `
        <section class="mc-page">
            <div class="mc-panel mc-breathing-panel">
                <p class="mc-kicker">Công cụ thở</p>
                <h1>Bài tập thở giảm Stress</h1>
                <p id="breath-text">Chuẩn bị...</p>
            <div id="breath-circle" class="breathing-circle"></div>
                <button class="mc-btn mc-btn-primary" type="button" data-action="start-breathing">Bắt đầu</button>
            </div>
        </section>
    `;
}

function startBreathing() {
    const circle = document.getElementById('breath-circle');
    const text = document.getElementById('breath-text');
    let phase = 0; // 0: Hít, 1: Giữ, 2: Thở

    setInterval(() => {
        if(phase === 0) {
            circle.style.transform = "scale(1.5)";
            text.innerText = "Hít vào thật sâu...";
            phase = 1;
        } else if(phase === 1) {
            text.innerText = "Giữ hơi thở...";
            phase = 2;
        } else {
            circle.style.transform = "scale(1)";
            text.innerText = "Thở ra nhẹ nhàng...";
            phase = 0;
        }
    }, 4000);
}

document.addEventListener('click', function(event) {
    const actionEl = event.target.closest('[data-action]');
    if (!actionEl) return;
    const action = actionEl.getAttribute('data-action');

    if (action === 'filter') {
        const type = actionEl.getAttribute('data-type');
        renderResourcesLibrary(type);
    } else if (action === 'import-resource') {
        addCustomResource();
    } else if (action === 'request-resource') {
        requestResourceByNeed();
    } else if (action === 'open-resource') {
        const index = parseInt(actionEl.getAttribute('data-index'), 10);
        trackResourceOpen(index);
    } else if (action === 'start-breathing') {
        startBreathing();
    } else if (action === 'renderBreathingSpace') {
        const index = parseInt(actionEl.getAttribute('data-index'), 10);
        if (Number.isFinite(index)) trackResourceOpen(index);
        renderBreathingSpace();
    }
});
