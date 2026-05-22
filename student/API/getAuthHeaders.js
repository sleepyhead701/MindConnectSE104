import { getAuthSession } from '../studentState.js';

export function getAuthHeaders() {
    const session = getAuthSession();
    return session?.token ? { Authorization: `Bearer ${session.token}` } : {};
}