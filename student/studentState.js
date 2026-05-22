import { loadJson, saveJson } from "../state.js";
import { userSession } from "../state.js";
import { getResourcesDB, getUsersDB } from "../state.js";


const defaultChatHistory = [
    { sender: 'ai', text: 'Chào bạn! Mình là AI của MindConnect. Mình có thể giúp gì cho bạn hôm nay?' }
];

const currentUser = new userSession('Durian', 'student@example.com');

const CUSTOM_RESOURCES_KEY = 'mindconnect:custom-resources';
const PRIVATE_DIARY_KEY = 'mindconnect:private-diary';
const STUDENT_PROFILE_KEY = 'mindconnect:student-profile';

let currentMoodScore = 4;
let chatHistory = defaultChatHistory;
let privateDiaryEntries = loadPrivateDiaryEntries();

export function getStudentProfileKey() {
    return STUDENT_PROFILE_KEY;
}

export function getStudentStorageId() {
    const session = getStudentSession();
    return String(
        session?.user?.email ||
        session?.email ||
        session?.name ||
        currentUser.email ||
        'guest'
    ).trim().toLowerCase().replace(/[^a-z0-9@._-]/g, '-');
}

export function getStudentStorageKey(baseKey) {
    return `${baseKey}:${getStudentStorageId()}`;
}

export function getStudentSession() {
    return getAuthSession() || currentUser || { name: 'Người dùng ẩn danh', email: 'student@example.com' };
}

export function getAuthSession() {
    try {
        return JSON.parse(localStorage.getItem('mindconnect:auth'))
            || JSON.parse(localStorage.getItem('authSession'))
            || null;
    } catch (error) {
        return null;
    }
}

export function getStudentProfile() {
    const session = getStudentSession();
    const savedProfile = loadJson(getStudentStorageKey(getStudentProfileKey()), {});
    const fallbackName = session?.user?.name || session?.name || session?.user?.email || session?.email || currentUser.name;

    return {
        name: savedProfile.name || session?.user?.name || session?.name || fallbackName || 'Người dùng ẩn danh',
        email: session?.user?.email || session?.email || currentUser.email,
        avatarUrl: savedProfile.avatarUrl || 'logo.png',
        bio: savedProfile.bio || '',
        displayName: savedProfile.name || session?.user?.name || session?.name || fallbackName
    };
}

export function setCurrentMoodScore(score) {
    currentMoodScore = score;
}

export function getCurrentMoodScore() {
    return currentMoodScore;
}

export function getChatHistory() {
    return chatHistory;
}

export function addChatMessage(sender, text) {
    chatHistory.push({ sender, text });
    saveJson(getStudentStorageKey('mindconnect:chat-history'), chatHistory);
}

function loadPrivateDiaryEntries() {
    return loadJson(getStudentStorageKey(getPrivateDiaryKey()), []);
}

export function getPrivateDiaryEntries() {
    return privateDiaryEntries;
}

export function savePrivateDiaryEntries() {
    saveJson(getStudentStorageKey(getPrivateDiaryKey()), privateDiaryEntries);
}

export function saveStudentProfile(profile) {
    saveJson(getStudentStorageKey(getStudentProfileKey()), {
        name: String(profile.name || '').trim() || 'Người dùng ẩn danh',
        avatarUrl: profile.avatarUrl || 'logo.png',
        bio: profile.bio || ''
    });
}

export function getCustomResourcesKey() {
    return getStudentStorageKey(CUSTOM_RESOURCES_KEY);
}

export function getPrivateDiaryKey() {
    return getStudentStorageKey(PRIVATE_DIARY_KEY);
}

export function addResources(resource) {
    const resources = getResourcesDB();
    resources.push(resource);
    saveJson(getCustomResourcesKey(), resources.filter(r => r.isCustom));
}

export function getUserProfile(name) {
    const profile = getStudentProfile();
    if (name && (name === profile.name || name === profile.displayName || name === 'Tôi')) {
        return new userProfile(profile.displayName || profile.name, profile.email, profile.avatarUrl, profile.bio);
    }
    return findUserByName(name) || null;
}

export function findUserByName(name) {
    const users = getUsersDB();
    if (users.find(u => u.name === name)) {
        return users.find(u => u.name === name);
    }
    return null;
}

export function findUserBySession(session) {
    const email = session?.user?.email || session?.email;
    const users = getUsersDB();
    if (users.find(u => u.email === email)) {
        return users.find(u => u.email === email);
    }
    return null;
}

export function isOwnedFeedPost(post) {
    const profile = getStudentProfile();
    if (post?.owner_email && profile.email) {
        return String(post.owner_email).toLowerCase() === String(profile.email).toLowerCase();
    }

    const names = getCurrentProfileNames(profile);
    return Boolean(post?.isUser && names.has(post.author));
}

export function getCurrentProfileNames(profile = getStudentProfile()) {
    const session = getStudentSession();
    return new Set([
        'Tôi',
        currentUser.name,
        session?.name,
        session?.user?.name,
        profile.name,
        profile.displayName
    ].filter(Boolean));
}