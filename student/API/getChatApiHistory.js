import { getChatHistory } from '../studentState.js';

export function getChatApiHistory() {
    return getChatHistory().slice(0, -1).slice(-8).map(msg => ({
        role: msg.sender === 'ai' ? 'assistant' : 'user',
        content: String(msg.text || '').replace(/<[^>]*>/g, '')
    }));
}