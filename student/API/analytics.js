import { apiRequest } from '../utils/utils.js';

export function trackInteraction(type, targetId = '', metadata = {}) {
    apiRequest('/api/interactions', {
        method: 'POST',
        body: JSON.stringify({
            type,
            target_id: String(targetId || ''),
            metadata
        })
    }).catch(() => {
        // Interaction analytics are best-effort and should never block the student flow.
    });
}