import { getChatApiHistory } from './getChatApiHistory.js';
import { getChatApiUrl } from '../../state.js';

export async function callChatBotAPI(message) {
    const response = await fetch(getChatApiUrl(), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders()
        },
        body: JSON.stringify({
            message,
            history: getChatApiHistory()
        })
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result.success) {
        const error = new Error(result.error || 'Chat API request failed');
        error.statusCode = response.status;
        throw error;
    }

    const reply = String(result.data?.reply || '').trim();
    if (!reply) {
        throw new Error('Chat API returned an empty reply');
    }

    return reply;
}