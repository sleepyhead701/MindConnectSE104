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
    new userProfile('MindConnect AI', 'mindconnect@mindconnect.com', 'assets/images/logo.png', 'AI hỗ trợ học tập của MindConnect.')
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
    },
    {
        id: 'seed-post-exam-week-01',
        author: 'Blue Lemon',
        date: '2026-02-03T08:20:00Z',
        content: 'Tuần thi tới gần mà mình cứ bị mất tập trung. Đọc tài liệu được vài trang là lại mở điện thoại. Có ai có cách học nào dễ bắt đầu hơn không?',
        tags: ['Áp lực học tập', 'Thi cử', 'Cần lời khuyên'],
        likes: [8, 4, 2, 1, 0],
        comments: 3,
        isUser: false,
        commentObjects: [
            new Comment('seed-comment-exam-week-01-a', 'Mint Tea', '2026-02-03T08:45:00Z', 'Mình hay đặt mục tiêu rất nhỏ, ví dụ chỉ đọc 2 trang trước. Khi bắt đầu được rồi thì mình mới tăng dần.', [4, 0, 0, 0, 0]),
            new Comment('seed-comment-exam-week-01-b', 'MindConnect AI', '2026-02-03T08:52:00Z', 'Bạn có thể thử học theo phiên 20 phút, sau mỗi phiên ghi lại một ý chính. Nếu khó tập trung, hãy đặt điện thoại xa bàn học và bắt đầu bằng phần dễ nhất để giảm cảm giác bị quá tải.', [5, 1, 0, 0, 0]),
            new Comment('seed-comment-exam-week-01-c', 'Quiet Star', '2026-02-03T09:05:00Z', 'Mình dùng checklist theo môn, nhìn thấy từng việc được gạch đi thì đỡ hoang mang hơn nhiều.', [2, 0, 0, 0, 0])
        ]
    },
    {
        id: 'seed-post-sleep-01',
        author: 'Night Owl',
        date: '2026-02-04T23:10:00Z',
        content: 'Mấy hôm nay mình ngủ rất trễ dù rất mệt. Nằm xuống là nghĩ tới bài tập, deadline và cả chuyện nhóm. Có ai từng bị vậy không?',
        tags: ['Mất ngủ', 'Stress', 'Deadline'],
        likes: [6, 5, 1, 0, 0],
        comments: 2,
        isUser: false,
        commentObjects: [
            new Comment('seed-comment-sleep-01-a', 'Paper Moon', '2026-02-04T23:22:00Z', 'Mình từng vậy. Trước khi ngủ mình viết hết việc cần làm ngày mai ra giấy, giống như gửi nó ra khỏi đầu một chút.', [3, 1, 0, 0, 0]),
            new Comment('seed-comment-sleep-01-b', 'MindConnect AI', '2026-02-04T23:30:00Z', 'Bạn có thể thử tạo một nghi thức ngủ ngắn: tắt màn hình trước 20-30 phút, viết ra 3 việc ưu tiên cho ngày mai và thở chậm trong vài phút. Nếu mất ngủ kéo dài nhiều ngày, bạn nên cân nhắc trao đổi với chuyên viên hỗ trợ.', [5, 0, 0, 0, 0])
        ]
    },
    {
        id: 'seed-post-group-work-01',
        author: 'Matcha Latte',
        date: '2026-02-05T10:05:00Z',
        content: 'Làm đồ án nhóm mà mình thấy khó góp ý vì sợ mọi người nghĩ mình khó tính. Nhưng nếu không nói thì tiến độ cứ trễ mãi.',
        tags: ['Làm việc nhóm', 'Giao tiếp', 'Cần lời khuyên'],
        likes: [7, 2, 2, 0, 0],
        comments: 3,
        isUser: false,
        commentObjects: [
            new Comment('seed-comment-group-work-01-a', 'Deadline Buddy', '2026-02-05T10:18:00Z', 'Bạn có thể nói theo kiểu “mình lo phần này ảnh hưởng deadline, tụi mình thử chia lại task được không?” nghe đỡ căng hơn.', [4, 0, 0, 0, 0]),
            new Comment('seed-comment-group-work-01-b', 'MindConnect AI', '2026-02-05T10:25:00Z', 'Một cách an toàn là góp ý dựa trên mục tiêu chung thay vì phán xét cá nhân. Bạn có thể đề xuất checklist, mốc kiểm tra ngắn và hỏi nhóm cần hỗ trợ phần nào để cuộc nói chuyện cụ thể hơn.', [4, 1, 0, 0, 0]),
            new Comment('seed-comment-group-work-01-c', 'Corn Candy', '2026-02-05T11:00:00Z', 'Mình thấy họp 15 phút mỗi tối trước deadline giúp giảm hiểu lầm khá nhiều.', [2, 0, 0, 0, 0])
        ]
    },
    {
        id: 'seed-post-lonely-01',
        author: 'Tiny Cloud',
        date: '2026-02-06T17:40:00Z',
        content: 'Lên đại học rồi mình vẫn thấy khó kết bạn. Đi học về là về phòng, đôi lúc thấy hơi lạc lõng dù xung quanh rất đông người.',
        tags: ['Bạn bè', 'Cô đơn', 'Tâm sự'],
        likes: [10, 4, 3, 1, 0],
        comments: 3,
        isUser: false,
        commentObjects: [
            new Comment('seed-comment-lonely-01-a', 'Sunny Side', '2026-02-06T17:55:00Z', 'Bạn không một mình đâu. Mình bắt đầu bằng việc rủ một bạn cùng lớp đi ăn trưa sau giờ học, nhỏ thôi nhưng có tác dụng.', [5, 1, 0, 0, 0]),
            new Comment('seed-comment-lonely-01-b', 'MindConnect AI', '2026-02-06T18:02:00Z', 'Cảm giác lạc lõng khi chuyển môi trường là điều nhiều sinh viên gặp. Bạn có thể chọn một hoạt động nhỏ có lịch cố định như câu lạc bộ, nhóm học hoặc workshop để tạo cơ hội gặp lại cùng một nhóm người nhiều lần.', [6, 0, 0, 0, 0]),
            new Comment('seed-comment-lonely-01-c', 'Blue Lemon', '2026-02-06T18:30:00Z', 'Nếu bạn muốn, có thể thử tìm nhóm học chung theo môn trước, dễ bắt chuyện hơn nói chuyện ngẫu nhiên.', [3, 0, 0, 0, 0])
        ]
    },
    {
        id: 'seed-post-finance-01',
        author: 'Coffee Bean',
        date: '2026-02-07T12:15:00Z',
        content: 'Tháng này mình hơi áp lực tiền sinh hoạt. Vừa học vừa làm thêm nên đôi khi kiệt sức. Có ai biết cách cân bằng hơn không?',
        tags: ['Tài chính', 'Làm thêm', 'Stress'],
        likes: [5, 3, 1, 1, 0],
        comments: 2,
        isUser: false,
        commentObjects: [
            new Comment('seed-comment-finance-01-a', 'Quiet Star', '2026-02-07T12:35:00Z', 'Mình chia chi phí theo tuần thay vì theo tháng, dễ kiểm soát hơn. Nếu làm thêm quá nhiều thì nên giữ lại ít nhất một buổi nghỉ cố định.', [3, 0, 0, 0, 0]),
            new Comment('seed-comment-finance-01-b', 'MindConnect AI', '2026-02-07T12:42:00Z', 'Bạn có thể thử lập danh sách chi phí bắt buộc, chi phí có thể giảm và số giờ làm thêm tối đa mỗi tuần. Nếu trường có học bổng, quỹ hỗ trợ hoặc tư vấn tài chính sinh viên, đó cũng là nguồn nên kiểm tra.', [4, 1, 0, 0, 0])
        ]
    },
    {
        id: 'seed-post-career-01',
        author: 'Pixel Rain',
        date: '2026-02-08T15:25:00Z',
        content: 'Nhìn bạn bè có internship hết rồi mình thấy lo. Mình vẫn chưa biết nên theo hướng frontend, backend hay data nữa.',
        tags: ['Định hướng', 'Thực tập', 'Lo âu'],
        likes: [9, 2, 1, 0, 0],
        comments: 3,
        isUser: false,
        commentObjects: [
            new Comment('seed-comment-career-01-a', 'Deadline Buddy', '2026-02-08T15:40:00Z', 'Bạn thử làm 1 project nhỏ cho mỗi hướng xem mình thấy thích kiểu công việc nào nhất. Đọc mô tả job thôi đôi khi chưa đủ.', [4, 0, 0, 0, 0]),
            new Comment('seed-comment-career-01-b', 'MindConnect AI', '2026-02-08T15:48:00Z', 'Bạn có thể ra quyết định theo 3 tiêu chí: mức độ hứng thú, kỹ năng hiện có và cơ hội học trong 4-6 tuần tới. Chọn một hướng để thử ngắn hạn không có nghĩa là phải gắn bó mãi với hướng đó.', [5, 0, 0, 0, 0]),
            new Comment('seed-comment-career-01-c', 'Sleepyhead', '2026-02-08T16:10:00Z', 'Mình từng đổi hướng sau một project nhỏ, nên cứ thử trước rồi điều chỉnh sau cũng ổn.', [2, 0, 0, 0, 0])
        ]
    },
    {
        id: 'seed-post-family-01',
        author: 'Green Apple',
        date: '2026-02-09T20:00:00Z',
        content: 'Gia đình kỳ vọng điểm cao nên mỗi lần điểm không như ý mình thấy rất nặng nề. Mình muốn nói chuyện nhưng không biết bắt đầu sao.',
        tags: ['Gia đình', 'Áp lực học tập', 'Tâm sự'],
        likes: [8, 3, 2, 1, 0],
        comments: 2,
        isUser: false,
        commentObjects: [
            new Comment('seed-comment-family-01-a', 'Paper Moon', '2026-02-09T20:16:00Z', 'Mình từng viết trước những điều muốn nói rồi mới gọi về. Viết ra giúp mình không bị rối khi nói chuyện.', [3, 1, 0, 0, 0]),
            new Comment('seed-comment-family-01-b', 'MindConnect AI', '2026-02-09T20:25:00Z', 'Bạn có thể bắt đầu bằng cảm xúc và nhu cầu cụ thể: “Con đang áp lực và cần được nghe góp ý theo cách bình tĩnh hơn”. Nếu cuộc nói chuyện dễ căng, hãy chọn thời điểm cả hai bên không vội.', [5, 0, 0, 0, 0])
        ]
    },
    {
        id: 'seed-post-motivation-01',
        author: 'Soft Reset',
        date: '2026-02-10T09:35:00Z',
        content: 'Có ngày mình không muốn làm gì cả, kể cả những môn trước đây mình rất thích. Không biết đây là lười hay do mình đang quá tải.',
        tags: ['Động lực', 'Quá tải', 'Tâm sự'],
        likes: [11, 4, 2, 0, 0],
        comments: 3,
        isUser: false,
        commentObjects: [
            new Comment('seed-comment-motivation-01-a', 'Mint Tea', '2026-02-10T09:52:00Z', 'Mình nghĩ nếu nghỉ vẫn thấy mệt thì có thể là quá tải. Bạn thử giảm kỳ vọng trong 1-2 ngày xem sao.', [4, 1, 0, 0, 0]),
            new Comment('seed-comment-motivation-01-b', 'MindConnect AI', '2026-02-10T10:00:00Z', 'Bạn có thể quan sát thêm: tình trạng này kéo dài bao lâu, có ảnh hưởng giấc ngủ, ăn uống hoặc việc học không. Trước mắt hãy chọn một việc rất nhỏ để hoàn thành, rồi cho mình thời gian hồi phục.', [6, 0, 0, 0, 0]),
            new Comment('seed-comment-motivation-01-c', 'Tiny Cloud', '2026-02-10T10:20:00Z', 'Mình hay đặt “minimum day”: chỉ làm phần tối thiểu để không bị đứt mạch, còn lại cho phép nghỉ.', [3, 0, 0, 0, 0])
        ]
    },
    {
        id: 'seed-post-presentation-01',
        author: 'Slide Panic',
        date: '2026-02-11T13:10:00Z',
        content: 'Ngày mai thuyết trình mà mình cứ run, sợ quên ý và nói lắp. Có mẹo nào để bình tĩnh trước khi lên nói không?',
        tags: ['Thuyết trình', 'Lo âu', 'Cần lời khuyên'],
        likes: [6, 4, 1, 0, 0],
        comments: 2,
        isUser: false,
        commentObjects: [
            new Comment('seed-comment-presentation-01-a', 'Corn Candy', '2026-02-11T13:25:00Z', 'Mình thường tập mở đầu thật kỹ. Khi 30 giây đầu ổn thì phần sau dễ hơn.', [4, 0, 0, 0, 0]),
            new Comment('seed-comment-presentation-01-b', 'MindConnect AI', '2026-02-11T13:34:00Z', 'Bạn có thể chuẩn bị 3 ý chính thay vì học thuộc toàn bộ. Trước khi nói, thử thở chậm 4 nhịp vào và 6 nhịp ra trong vài vòng để giảm nhịp căng thẳng.', [5, 1, 0, 0, 0])
        ]
    },
    {
        id: 'seed-post-positive-01',
        author: 'Morning Note',
        date: '2026-02-12T07:50:00Z',
        content: 'Hôm nay mình thử đi bộ 15 phút trước giờ học và thấy đầu óc nhẹ hơn hẳn. Có lẽ mình sẽ giữ thói quen này trong tuần này.',
        tags: ['Tích cực', 'Tự chăm sóc', 'Thói quen'],
        likes: [12, 3, 1, 1, 0],
        comments: 2,
        isUser: false,
        commentObjects: [
            new Comment('seed-comment-positive-01-a', 'Luriam', '2026-02-12T08:02:00Z', 'Nghe hay đó. Mình sẽ thử đi bộ sau giờ học xem có dễ ngủ hơn không.', [3, 0, 0, 0, 0]),
            new Comment('seed-comment-positive-01-b', 'MindConnect AI', '2026-02-12T08:08:00Z', 'Đây là một thói quen nhỏ nhưng có thể hỗ trợ tâm trạng khá tốt. Bạn có thể ghi lại cảm xúc trước và sau khi đi bộ để xem thói quen này tác động thế nào với mình.', [4, 1, 0, 0, 0])
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
    },
    {
        type: 'Video',
        title: 'NIMH - Stress va Anxiety trong 60 giay',
        duration: '1 phut',
        img: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80',
        url: 'https://www.nimh.nih.gov/news/media/2021/mental-health-minute-stress-and-anxiety-in-adolescents'
    },
    {
        type: 'Video',
        title: 'Johns Hopkins - Deep Breathing giam stress',
        duration: 'Video huong dan',
        img: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&q=80',
        url: 'https://www.hopkinsmedicine.org/video/reducing-stress-through-deep-breathing-1-of-3'
    },
    {
        type: 'Video',
        title: 'SAMHSA - Breathing Exercise va coping strategies',
        duration: 'Video tu cham soc',
        img: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=800&q=80',
        url: 'https://www.samhsa.gov/resource/dbhis/stress-management-techniques-healthy-coping-strategies-breathing-exercise'
    },
    {
        type: 'Video',
        title: 'UAMS Health - Box Breathing',
        duration: 'Bai tho ngan',
        img: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&q=80',
        url: 'https://uamshealth.com/clinical-resource/box-breathing/'
    },
    {
        type: 'Blog',
        title: 'NIMH - Stress hay Anxiety?',
        duration: '7 phut doc',
        img: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800&q=80',
        url: 'https://www.nimh.nih.gov/health/publications/so-stressed-out-fact-sheet'
    },
    {
        type: 'Blog',
        title: 'UNICEF Viet Nam - Suc khoe tam than',
        duration: '6 phut doc',
        img: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&q=80',
        url: 'https://www.unicef.org/vietnam/vi/suc-khoe-tam-than'
    },
    {
        type: 'Blog',
        title: 'WHO Viet Nam - Chu de suc khoe tam than',
        duration: 'Nguon chinh thong',
        img: 'https://images.unsplash.com/photo-1494172961521-33799ddd43a5?w=800&q=80',
        url: 'https://www.who.int/vietnam/vi/health-topics/mental-health'
    },
    {
        type: 'Blog',
        title: 'NHS - Student stress',
        duration: '5 phut doc',
        img: 'https://images.unsplash.com/photo-1516321497487-e288fb19713f?w=800&q=80',
        url: 'https://www.nhs.uk/conditions/stress-anxiety-depression/student-stress/'
    },
    {
        type: 'Book',
        title: 'WHO - Doing What Matters in Times of Stress',
        duration: 'Illustrated guide',
        img: 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=800&q=80',
        url: 'https://iris.who.int/handle/10665/331901'
    },
    {
        type: 'Book',
        title: 'CCI - Mastering Your Worries workbook',
        duration: 'CBT workbook',
        img: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800&q=80',
        url: 'https://www.cci.health.wa.gov.au/Resources/Looking-After-Yourself/Anxiety'
    },
    {
        type: 'Book',
        title: 'CCI - Put Off Procrastinating workbook',
        duration: 'Hoc tap va deadline',
        img: 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=800&q=80',
        url: 'https://www.cci.health.wa.gov.au/Resources/Looking-After-Yourself/Procrastination'
    },
    {
        type: 'Book',
        title: 'JED - Going to College with a Mental Health Condition',
        duration: 'Guide PDF',
        img: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&q=80',
        url: 'https://jedfoundation.org/wp-content/uploads/2023/08/Going-to-College-MHC-Guide-8.10.23-1.pdf'
    },
    {
        type: 'Podcast',
        title: 'UCLA Mindful - Weekly Meditations and Talks',
        duration: 'Podcast series',
        img: 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=800&q=80',
        url: 'https://www.uclahealth.org/uclamindful/weekly-meditations-talks'
    },
    {
        type: 'Podcast',
        title: 'Greater Good - Happiness Break',
        duration: 'Short practices',
        img: 'https://images.unsplash.com/photo-1590602846989-e99596d2a6ee?w=800&q=80',
        url: 'https://greatergood.berkeley.edu/podcasts'
    },
    {
        type: 'Podcast',
        title: 'The Science of Happiness',
        duration: 'Podcast series',
        img: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=800&q=80',
        url: 'https://greatergood.berkeley.edu/podcasts'
    },
    {
        type: 'Podcast',
        title: 'The Happiness Lab with Dr. Laurie Santos',
        duration: 'Podcast series',
        img: 'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?w=800&q=80',
        url: 'https://www.pushkin.fm/podcasts/the-happiness-lab-with-dr-laurie-santos'
    },
    {
        type: 'Công cụ',
        title: 'NHS Inform - Controlled Breathing Exercise',
        duration: 'Bai tho 3-3-3-3',
        img: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&q=80',
        url: 'https://www.nhsinform.scot/healthy-living/mental-wellbeing/breathing-and-relaxation-exercises/controlled-breathing-exercise/'
    },
    {
        type: 'Công cụ',
        title: 'UCLA Mindful - Guided Meditations',
        duration: 'Audio mien phi',
        img: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=800&q=80',
        url: 'https://www.uclahealth.org/uclamindful/guided-meditations'
    },
    {
        type: 'Công cụ',
        title: 'Greater Good in Action - Science-based practices',
        duration: 'Bo bai tap',
        img: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=800&q=80',
        url: 'https://ggia.berkeley.edu/'
    },
    {
        type: 'Công cụ',
        title: 'Pomofocus - Pomodoro Timer',
        duration: 'Focus timer',
        img: 'https://images.unsplash.com/photo-1495364141860-b0d03eccd065?w=800&q=80',
        url: 'https://pomofocus.io/'
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
const PUBLIC_FEED_API_URL = `${API_BASE_URL}/api/public-feed`;

let userFeed = loadPublicFeed();
let backendReady = false;
let publicFeedBackendLoaded = false;
let publicFeedBackendSyncPromise = null;
let publicFeedBackendSaveTimer = null;

function loadPublicFeed() {
    const storedFeed = loadJson(PUBLIC_FEED_KEY, null);
    if (!Array.isArray(storedFeed)) {
        return defaultUserFeed;
    }

    const existingIds = new Set(storedFeed.map(item => String(item?.id)));
    const missingSeedPosts = defaultUserFeed.filter(item => !existingIds.has(String(item.id)));
    if (!missingSeedPosts.length) {
        return storedFeed;
    }

    const mergedFeed = [...storedFeed, ...missingSeedPosts];
    saveJson(PUBLIC_FEED_KEY, mergedFeed);
    return mergedFeed;
}

function countFeedComments(commentObjects = []) {
    return Array.isArray(commentObjects)
        ? commentObjects.reduce((sum, comment) => sum + 1 + (Array.isArray(comment?.replies) ? comment.replies.length : 0), 0)
        : 0;
}

function normalizeClientFeedComment(comment = {}) {
    return {
        ...comment,
        id: String(comment.id || `comment-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`),
        author: String(comment.author || 'Sinh viên'),
        date: comment.date || new Date().toISOString(),
        content: String(comment.content || ''),
        likes: Array.isArray(comment.likes) ? comment.likes : Number(comment.likes || 0),
        replies: Array.isArray(comment.replies)
            ? comment.replies.map(reply => ({
                ...reply,
                id: String(reply.id || `reply-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`),
                author: String(reply.author || 'Sinh viên'),
                date: reply.date || new Date().toISOString(),
                content: String(reply.content || ''),
                likes: Array.isArray(reply.likes) ? reply.likes : Number(reply.likes || 0)
            }))
            : []
    };
}

function normalizeClientFeedItem(item = {}) {
    const commentObjects = Array.isArray(item.commentObjects)
        ? item.commentObjects.map(normalizeClientFeedComment)
        : [];

    return {
        ...item,
        id: String(item.id || `feed-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`),
        author: String(item.author || 'Sinh viên'),
        date: item.date || item.created_at || new Date().toISOString(),
        content: String(item.content || ''),
        tags: Array.isArray(item.tags) ? item.tags.map(String).filter(Boolean) : [],
        likes: Array.isArray(item.likes) ? item.likes : Number(item.likes || 0),
        comments: countFeedComments(commentObjects),
        commentObjects
    };
}

function mergePublicFeeds(primaryFeed = [], secondaryFeed = []) {
    const merged = [];
    const seenIds = new Set();

    [...primaryFeed, ...secondaryFeed].forEach(item => {
        const normalized = normalizeClientFeedItem(item);
        if (!normalized.content) return;
        const id = String(normalized.id);
        if (seenIds.has(id)) return;
        seenIds.add(id);
        merged.push(normalized);
    });

    return merged.slice(0, 200);
}

function getPublicFeedAuthHeaders() {
    let session = null;
    try {
        session = JSON.parse(localStorage.getItem('mindconnect:auth'))
            || JSON.parse(localStorage.getItem('authSession'))
            || null;
    } catch (error) {
        session = null;
    }

    const identity = String(
        session?.user?.email ||
        session?.email ||
        session?.name ||
        'student@example.com'
    ).trim().toLowerCase().replace(/[^a-z0-9@._-]/g, '-');

    const headers = {
        'Content-Type': 'application/json',
        'X-Student-Client-Id': identity
    };

    if (session?.token) {
        headers.Authorization = `Bearer ${session.token}`;
    }

    if (session?.token === 'mock-token') {
        headers['X-Demo-Role'] = localStorage.getItem('mindconnect:role') || session?.user?.role || 'student';
        headers['X-Demo-Email'] = session?.user?.email || identity;
    }

    return headers;
}

async function fetchPublicFeedFromBackend() {
    const response = await fetch(PUBLIC_FEED_API_URL, {
        method: 'GET',
        headers: getPublicFeedAuthHeaders()
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.success === false) {
        throw new Error(result.error || 'Cannot load public feed');
    }
    return Array.isArray(result.data) ? result.data : [];
}

async function savePublicFeedToBackend(feed = getUserFeed()) {
    const response = await fetch(PUBLIC_FEED_API_URL, {
        method: 'PUT',
        headers: getPublicFeedAuthHeaders(),
        body: JSON.stringify({
            items: feed.map(normalizeClientFeedItem)
        })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.success === false) {
        throw new Error(result.error || 'Cannot save public feed');
    }
    return Array.isArray(result.data) ? result.data : [];
}

function schedulePublicFeedBackendSave() {
    clearTimeout(publicFeedBackendSaveTimer);
    publicFeedBackendSaveTimer = setTimeout(() => {
        savePublicFeedToBackend(getUserFeed()).catch(() => {
            // Backend sync is best-effort; localStorage remains the offline fallback.
        });
    }, 500);
}

export function hasLoadedPublicFeedFromBackend() {
    return publicFeedBackendLoaded;
}

export async function syncPublicFeedWithBackend() {
    if (publicFeedBackendSyncPromise) return publicFeedBackendSyncPromise;

    publicFeedBackendSyncPromise = (async () => {
        try {
            const backendFeed = await fetchPublicFeedFromBackend();
            const localFeed = getUserFeed();
            const mergedFeed = mergePublicFeeds(backendFeed, localFeed);
            const localChanged = JSON.stringify(mergedFeed) !== JSON.stringify(localFeed.map(normalizeClientFeedItem));
            const backendChanged = JSON.stringify(mergedFeed) !== JSON.stringify(backendFeed.map(normalizeClientFeedItem));

            userFeed = mergedFeed;
            saveJson(PUBLIC_FEED_KEY, userFeed);
            publicFeedBackendLoaded = true;

            if (backendChanged) {
                await savePublicFeedToBackend(userFeed);
            }

            return localChanged || backendChanged;
        } catch (error) {
            publicFeedBackendLoaded = false;
            return false;
        } finally {
            publicFeedBackendSyncPromise = null;
        }
    })();

    return publicFeedBackendSyncPromise;
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
    schedulePublicFeedBackendSave();
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
    const author = typeof item === 'string' ? item : item?.author;
    const profile = usersDB.find(user => user.name === author);
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
