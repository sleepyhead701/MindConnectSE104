class userProfile {
    constructor(name, email, avatarUrl, bio) {
        this.name = name;
        this.email = email;
        this.avatarUrl = avatarUrl;
        this.bio = bio;
    }
}

export class userSession {
    constructor(name, email) {
        this.name = name;
        this.email = email;
    }
}

// Tạo list user profiles (dự phòng cho tính năng mở rộng sau này, hiện chỉ có 2 profile)
const usersDB = [
    new userProfile('Durian', 'student@example.com', 'https://quillandpad.com/wp-content/uploads/2023/02/durian-fruit.jpg', 'Sinh viên năm 8 Đại học Bách Khoa Hà Nội, ngành CNTT, đam mê công nghệ và thích ăn sầu riêng.'),
    new userProfile('Luriam', 'hoshino@beta.com', 'https://vn.portal-pokemon.com/play/resources/pokedex/img/pm/1e83fbcb00ab179cc89db5c53baea3e72d5942ad.png', 'Sinh viên năm 2 Đại học Bách Khoa Hà Nội, ngành Khoa học Máy tính, yêu thích lập trình và trò chơi.'),
    new userProfile('Sleepyhead', 'sleepyhead701@gmail.com', 'https://avatars.githubusercontent.com/u/169965772?v=4', 'Sinh viên năm 3 Đại học Bách Khoa Hà Nội, ngành Khoa học Máy tính, yêu thích nghiên cứu và phát triển phần mềm.'),
    new userProfile('MindConnect AI', 'mindconnect@mindconnect.com', 'logo.png', 'AI hỗ trợ học tập của MindConnect.')
];

class Comment {
    constructor(id, author, date, content, likes = [0, 0, 0, 0, 0], replies = []) {
        this.id = id;
        this.author = author;
        this.date = date;
        this.content = content;
        this.likes = likes;
        this.isLiked = false;
        this.replies = replies;
    }
}

class FeedUser {
    constructor(id, author, date, content, tags = [], likes = [0, 0, 0, 0, 0], comments = 0, isUser = false) {
        this.id = id;
        this.author = author;
        this.date = date;
        this.content = content;
        this.tags = tags;
        this.likes = likes;
        this.isLiked = false;
        this.comments = comments;
        this.isUser = isUser;
        this.commentObjects = [];
    }
}

const defaultUserFeed = [
    { 
        id: 1, 
        author: 'Sleepyhead', 
        date: '2024-11-01T14:30:00Z', 
        content: 'Cảm thấy áp lực deadline quá... Có ai biết cách quản lý thời gian hiệu quả không?', 
        tags: ['Áp lực học tập', 'Cần lời khuyên'], 
        likes: [5, 3, 2, 1, 0], 
        comments: 2, 
        isUser: false,
            commentObjects: [
                new Comment(1, 'Corn Candy', '2024-11-01T15:00:00Z', 'Mình cũng đang gặp vấn đề tương tự. Mình thường chia nhỏ công việc ra và đặt deadline ảo cho từng phần.', [2, 0, 0, 0, 0]),
                new Comment(2, 'MindConnect AI', '2024-11-01T15:05:00Z', 'Bạn có thể thử phương pháp Pomodoro: làm việc 25 phút, nghỉ 5 phút. Sau 4 lần, nghỉ dài hơn. Mình cũng có thể gợi ý một số công cụ quản lý thời gian nếu bạn muốn!', [3, 0, 0, 0, 0])
            ]
    },
    { 
        id: 2,
        author: 'Luriam', 
        date: '2025-12-22T09:15:00Z', 
        content: 'Hôm nay mình đã thử bài tập thở mà AI gợi ý, cảm giác khá ổn đấy! Ai muốn thử cùng mình không?',
        tags: ['Thở', 'Giảm stress'], 
        likes: [3, 1, 0, 0, 0], 
        comments: 1, 
        isUser: false,
        commentObjects: [
            new Comment(3, 'MindConnect AI', '2025-12-22T09:30:00Z', 'Chúc bạn có một ngày tốt lành!', [1, 0, 0, 0, 0])
        ]
    }
];

export const resourcesDB = [
    {
        type: 'Video',
        title: 'Thiền 5 phút giảm lo âu',
        duration: '5 phút',
        img: 'https://img.youtube.com/vi/inpok4MKVLM/mqdefault.jpg',
        url: 'https://www.youtube.com/watch?v=inpok4MKVLM'
    },
    {
        type: 'Blog',
        title: 'Cách vượt qua căng thẳng trước kỳ thi',
        duration: '5 phút đọc',
        img: 'https://suckhoedoisong.qltns.mediacdn.vn/thumb_w/640/324455921873985536/2023/4/26/cang-thang-truoc-ky-thi-16824842727412019885995.png',
        url: 'https://suckhoedoisong.vn/chuyen-gia-chi-cach-vuot-qua-cang-thang-truoc-ky-thi-169230426121339076.htm'
    },
    {
        type: 'Blog',
        title: 'WHO - Mental disorders',
        duration: 'Nguồn học thuật',
        img: 'https://www.who.int/ResourcePackages/WHO/assets/dist/images/logos/en/h-logo-blue.svg',
        url: 'https://www.who.int/news-room/fact-sheets/detail/mental-disorders'
    },
    {
        type: 'Blog',
        title: 'NIMH - Anxiety Disorders',
        duration: 'Nguồn học thuật',
        img: 'https://www.nimh.nih.gov/themes/custom/nimh/logo.svg',
        url: 'https://www.nimh.nih.gov/health/topics/anxiety-disorders'
    },
    {
        type: 'Blog',
        title: 'Wikipedia - Mental disorder',
        duration: 'Bách khoa tham khảo',
        img: 'https://upload.wikimedia.org/wikipedia/commons/6/63/Wikipedia-logo.png',
        url: 'https://en.wikipedia.org/wiki/Mental_disorder'
    },
    {
        type: 'Book',
        title: 'Hiểu về trái tim - Minh Niệm',
        duration: '12 chương',
        img: 'https://tramsach.vn/wp-content/uploads/2024/11/gioi-thieu-sach.jpg',
        url: 'https://thuvienhoasen.org/images/file/y5sBQGYE1QgQAHou/hieu-ve-trai-tim.pdf'
    },
    {
        type: 'Podcast',
        title: 'Radio Cảm Xúc #12 - Chữa lành',
        duration: '32 phút',
        img: 'https://i.scdn.co/image/ab67656300005f1ff6bed7462a8b94b0fb452114',
        url: 'https://open.spotify.com/episode/63VvDWyELyutySrZSRU1Hq'
    },
    {
        type: 'Công cụ',
        title: 'Bài tập thở giảm Stress',
        duration: '4 bài tập',
        img: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTlg1wCwbYTPH8TCqBnzGjRLEhlmNuhdWy44A&s',
        action: 'renderBreathingSpace'
    },
    {
        type: 'Công cụ',
        title: 'Quản lý thời gian Pomodoro',
        duration: 'App',
        img: 'https://images.unsplash.com/photo-1495364141860-b0d03eccd065?w=800&q=80',
        url: 'https://pomodoro.pomodorotechnique.com/'
    }
];

const SUPPORT_LOCATIONS = [
    'Phòng tham vấn 102 - Khu B',
    'Phòng Công tác Sinh viên - Khu A',
    'Trung tâm Hỗ trợ Sinh viên - Tầng 3',
    'Online qua Google Meet',
    'Online qua Microsoft Teams'
];

const RISK_ALERTS_KEY = 'mindconnect:risk-alerts';
const PUBLIC_FEED_KEY = 'mindconnect:public-feed';
const API_BASE_URL = 'http://localhost:3000';
const CHAT_API_URL = `${API_BASE_URL}/chat/support`;

let userFeed = loadPublicFeed();
let backendReady = false;

function loadPublicFeed() {
    return loadJson(PUBLIC_FEED_KEY, defaultUserFeed);
}

export function loadJson(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
        return fallback;
    }
}

export function getBackendReadyState() {
    return backendReady;
}

export function setBackendReadyState(isReady) {
    backendReady = isReady;
}
export function savePublicFeed() {
    saveJson(PUBLIC_FEED_KEY, getUserFeed());
}

export function getUserFeed() {
    return userFeed;
}

export function addUserFeed(feedItem) {
    userFeed.unshift(feedItem);
    savePublicFeed();
}

export function saveJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

export function getAuthorAvatar(item, index) {
    if (item?.author_avatar) return item.author_avatar;
    const profile = getUserProfile(item?.author);
    return profile?.avatarUrl || '';
}

export function getResourcesDB() {
    return resourcesDB;
}

export function getUsersDB() {
    return usersDB;
}

export function getChatApiUrl() {
    return CHAT_API_URL;
}

export function getAPIBaseUrl() {
    return API_BASE_URL;
}

export function getRiskAlertsKey() {
    return RISK_ALERTS_KEY;
}

export function getSupportLocations() {
    return SUPPORT_LOCATIONS;
}