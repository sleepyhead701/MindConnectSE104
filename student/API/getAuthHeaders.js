import { getAuthSession, getStudentStorageId } from '../studentState.js';

export function getAuthHeaders() {
    const session = getAuthSession();
    const headers = {
        ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
        'X-Student-Client-Id': getStudentStorageId()
    };

    if (session?.token === 'mock-token') {
        headers['X-Demo-Role'] = localStorage.getItem('mindconnect:role') || session?.user?.role || 'student';
        headers['X-Demo-Email'] = session?.user?.email || getStudentStorageId();
    }

    return headers;
}
