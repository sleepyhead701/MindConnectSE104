const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/mind_connect";

app.use(cors());
app.use(express.json());
app.use(express.static("."));

const MoodEntry = require("./src/models/MoodEntry");
const DiaryEntry = require("./src/models/DiaryEntry");
const FeedPost = require("./src/models/FeedPost");
const ChatMessage = require("./src/models/ChatMessage");
const Booking = require("./src/models/Booking");
const Resource = require("./src/models/Resource");
const User = require("./src/models/User");

function suggestTags(content) {
  const lowerContent = content.toLowerCase();
  const tags = [];
  if (
    lowerContent.includes("thi") ||
    lowerContent.includes("điểm") ||
    lowerContent.includes("hoc") ||
    lowerContent.includes("học") ||
    lowerContent.includes("bài tập")
  ) {
    tags.push("Học tập", "Áp lực");
  }
  if (
    lowerContent.includes("buồn") ||
    lowerContent.includes("khóc") ||
    lowerContent.includes("chán") ||
    lowerContent.includes("tuyệt vọng")
  ) {
    tags.push("Lo âu", "Trầm cảm");
  }
  if (
    lowerContent.includes("bạn") ||
    lowerContent.includes("cãi") ||
    lowerContent.includes("chia tay") ||
    lowerContent.includes("gia đình")
  ) {
    tags.push("Mối quan hệ");
  }
  if (
    lowerContent.includes("vui") ||
    lowerContent.includes("hạnh phúc") ||
    lowerContent.includes("tuyệt vời")
  ) {
    tags.push("Tích cực", "Biết ơn");
  }
  if (!tags.length) {
    tags.push("Tâm sự", "Suy nghĩ");
  }
  return [...new Set(tags)];
}

function generateAiReply(message) {
  const lowerTxt = message.toLowerCase();
  if (
    lowerTxt.includes("buồn") ||
    lowerTxt.includes("khóc") ||
    lowerTxt.includes("mệt") ||
    lowerTxt.includes("stress") ||
    lowerTxt.includes("áp lực") ||
    lowerTxt.includes("chán")
  ) {
    return "Mình cảm nhận được bạn đang có tâm trạng không tốt. Bạn có muốn thực hiện bài kiểm tra nhanh hoặc nghe một bản nhạc lofi thư giãn không? Hãy nghỉ ngơi một chút nhé.";
  }
  if (
    lowerTxt.includes("chết") ||
    lowerTxt.includes("tự tử") ||
    lowerTxt.includes("kết thúc") ||
    lowerTxt.includes("không muốn sống")
  ) {
    return "⚠️ CẢNH BÁO: Mình rất lo lắng cho bạn. Xin hãy bình tĩnh, bạn không đơn độc. Mình sẽ kết nối bạn với chuyên gia tâm lý ngay lập tức. Hotline hỗ trợ 24/7: 1900.1267";
  }
  if (
    lowerTxt.includes("vui") ||
    lowerTxt.includes("tốt") ||
    lowerTxt.includes("tuyệt") ||
    lowerTxt.includes("cảm ơn")
  ) {
    return "Thật tuyệt vời! Mình rất vui khi nghe điều đó. Bạn có muốn ghi lại khoảnh khắc này vào nhật ký không?";
  }
  if (
    lowerTxt.includes("thi") ||
    lowerTxt.includes("điểm") ||
    lowerTxt.includes("bài tập")
  ) {
    return "Việc học đôi khi rất căng thẳng. Bạn hãy thử áp dụng phương pháp Pomodoro (học 25p, nghỉ 5p) xem sao nhé. Đừng quên giữ sức khỏe!";
  }
  return "Cảm ơn bạn đã chia sẻ. Mình luôn ở đây lắng nghe bạn. Hãy kể thêm nhé.";
}

app.get("/api/health", (_, res) => {
  res.json({
    ok: true,
    db: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

app.post("/api/auth/register", async (req, res) => {
  const { username = "", password = "", role = "student" } = req.body || {};
  const normalizedUsername = username.trim().toLowerCase();

  if (!normalizedUsername || password.length < 6) {
    return res
      .status(400)
      .json({ message: "Username is required and password must be at least 6 characters" });
  }
  if (!["student", "school"].includes(role)) {
    return res.status(400).json({ message: "Invalid role" });
  }

  const existed = await User.findOne({ username: normalizedUsername });
  if (existed) {
    return res.status(409).json({ message: "Tài khoản đã tồn tại" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await User.create({
    username: normalizedUsername,
    passwordHash,
    role,
  });

  return res.status(201).json({
    message: "Đăng ký thành công",
  });
});

app.post("/api/auth/login", async (req, res) => {
  const { username = "", password = "", role = "student" } = req.body || {};
  const normalizedUsername = username.trim().toLowerCase();

  if (!normalizedUsername || !password) {
    return res.status(400).json({ message: "Username và password là bắt buộc" });
  }

  const user = await User.findOne({ username: normalizedUsername });
  if (!user) {
    return res.status(401).json({ message: "Sai thông tin đăng nhập" });
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch || user.role !== role) {
    return res.status(401).json({ message: "Sai thông tin đăng nhập hoặc vai trò" });
  }

  return res.json({
    message: "Đăng nhập thành công",
    user: {
      id: user._id,
      username: user.username,
      role: user.role,
    },
  });
});

app.get("/api/resources", async (_, res) => {
  const resources = await Resource.find().sort({ createdAt: -1 });
  res.json(resources);
});

app.get("/api/feed", async (_, res) => {
  const posts = await FeedPost.find().sort({ createdAt: -1 }).limit(100);
  res.json(posts);
});

app.post("/api/diary/analyze", async (req, res) => {
  const { content = "" } = req.body || {};
  if (!content || content.trim().length < 5) {
    return res.status(400).json({ message: "Diary content is too short" });
  }
  const tags = suggestTags(content);
  return res.json({ tags });
});

app.post("/api/diary", async (req, res) => {
  const { title = "", content = "", tags = [] } = req.body || {};
  if (!content || content.trim().length < 5) {
    return res.status(400).json({ message: "Diary content is too short" });
  }

  const diary = await DiaryEntry.create({
    title: title.trim(),
    content: content.trim(),
    tags,
  });

  const post = await FeedPost.create({
    author: "Tôi",
    content: `<strong>${title}</strong><br>${content}`,
    tags,
    likes: 0,
    comments: 0,
    isUser: true,
  });

  res.status(201).json({ diary, post });
});

app.post("/api/mood", async (req, res) => {
  const { score } = req.body || {};
  if (!Number.isInteger(score) || score < 1 || score > 5) {
    return res.status(400).json({ message: "Mood score must be 1-5" });
  }
  const mood = await MoodEntry.create({ score });
  res.status(201).json(mood);
});

app.get("/api/stats", async (_, res) => {
  const recentMoods = await MoodEntry.find().sort({ createdAt: -1 }).limit(7);
  const todayScore = recentMoods[0]?.score || 3;
  const average =
    recentMoods.length > 0
      ? recentMoods.reduce((sum, item) => sum + item.score, 0) / recentMoods.length
      : 3;

  let riskLevel = "medium";
  if (average <= 2) riskLevel = "high";
  else if (average >= 4) riskLevel = "low";

  res.json({
    riskLevel,
    averageMood: Number(average.toFixed(2)),
    todayScore,
    moodTrend: recentMoods.reverse().map((x) => x.score),
  });
});

app.get("/api/chat", async (_, res) => {
  const history = await ChatMessage.find().sort({ createdAt: 1 }).limit(100);
  res.json(history);
});

app.post("/api/chat", async (req, res) => {
  const { text = "" } = req.body || {};
  if (!text.trim()) {
    return res.status(400).json({ message: "Message is required" });
  }
  const userMsg = await ChatMessage.create({ sender: "user", text: text.trim() });
  const aiText = generateAiReply(text);
  const aiMsg = await ChatMessage.create({ sender: "ai", text: aiText });
  res.status(201).json({ userMsg, aiMsg });
});

app.post("/api/booking", async (req, res) => {
  const { phone = "", location = "", desiredTime = "", note = "" } = req.body || {};
  if (!desiredTime) {
    return res.status(400).json({ message: "desiredTime is required" });
  }
  const booking = await Booking.create({
    phone,
    location,
    desiredTime: new Date(desiredTime),
    note,
  });
  res.status(201).json(booking);
});

app.post("/api/seed", async (_, res) => {
  const resourceCount = await Resource.countDocuments();
  if (resourceCount === 0) {
    await Resource.insertMany([
      {
        type: "Video",
        title: "Thiền 5 phút giảm lo âu",
        img: "https://img.youtube.com/vi/inpok4MKVLM/mqdefault.jpg",
        url: "https://www.youtube.com/watch?v=inpok4MKVLM",
      },
      {
        type: "Video",
        title: "Nhạc Lofi Chill Học Tập",
        img: "https://img.youtube.com/vi/jfKfPfyJRdk/mqdefault.jpg",
        url: "https://www.youtube.com/watch?v=jfKfPfyJRdk",
      },
      {
        type: "Blog",
        title: "Cách vượt qua Burnout mùa thi",
        img: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=500&h=300&fit=crop",
        url: "#",
      },
      {
        type: "Book",
        title: "Hiểu về trái tim - Minh Niệm",
        img: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=500&h=300&fit=crop",
        url: "#",
      },
      {
        type: "Podcast",
        title: "Radio Cảm Xúc #12 - Chữa lành",
        img: "https://images.unsplash.com/photo-1589903308904-1010c2294adc?w=500&h=300&fit=crop",
        url: "#",
      },
    ]);
  }

  const feedCount = await FeedPost.countDocuments();
  if (feedCount === 0) {
    await FeedPost.insertMany([
      {
        author: "User #992",
        content: "Cảm thấy áp lực deadline quá... Có ai biết cách quản lý thời gian hiệu quả không?",
        tags: ["Áp lực học tập", "Cần lời khuyên"],
        likes: 5,
        comments: 2,
        isUser: false,
      },
      {
        author: "User #115",
        content: "Hôm nay mình đã thử ngồi thiền 10 phút, cảm thấy đầu óc nhẹ nhõm hơn hẳn. Mọi người nên thử nhé!",
        tags: ["Chữa lành", "Thiền"],
        likes: 12,
        comments: 4,
        isUser: false,
      },
    ]);
  }

  const chatCount = await ChatMessage.countDocuments();
  if (chatCount === 0) {
    await ChatMessage.create({
      sender: "ai",
      text: "Chào bạn! Mình là AI của MindConnect. Mình có thể giúp gì cho bạn hôm nay?",
    });
  }

  res.json({ message: "Seed completed" });
});

app.use((err, _, res, __) => {
  console.error(err);
  res.status(500).json({ message: "Internal server error" });
});

async function bootstrap() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("MongoDB connected");
    app.listen(PORT, () => {
      console.log(`Backend is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Cannot connect to MongoDB:", error.message);
    process.exit(1);
  }
}

bootstrap();
