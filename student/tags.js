import { updateNav } from './updateNav.js';
import { escapeHtml } from './utils.js';


export function addManualTag(inputId, containerId) {
    const input = document.getElementById(inputId);
    const container = document.getElementById(containerId);
    if (!input || !container) return;

    const tags = input.value
        .split(',')
        .map(tag => tag.trim())
        .filter(Boolean);

    tags.forEach(tag => {
        const existing = Array.from(container.querySelectorAll('.tag-chip'))
            .some(chip => chip.dataset.tag?.toLowerCase() === tag.toLowerCase());
        if (existing) return;

        container.insertAdjacentHTML('beforeend', `
            <span class="tag-chip selected manual-tag-chip" data-tag="${escapeHtml(tag)}">
                ${escapeHtml(tag)}
                <button type="button" aria-label="Xóa tag" onclick="this.parentElement.remove()">×</button>
            </span>
        `);
    });
    input.value = '';
}

export function getManualTags(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return [];
    return Array.from(container.querySelectorAll('.tag-chip'))
        .map(chip => chip.dataset.tag || chip.textContent.replace('×', '').trim())
        .filter(Boolean);
}