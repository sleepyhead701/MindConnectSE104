const mongoose = require('mongoose');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const Diary = require('../models/Diary');
const RiskAlert = require('../models/RiskAlert');
const Booking = require('../models/Booking');
const Feedback = require('../models/Feedback');
const Interaction = require('../models/Interaction');
const aiChatService = require('../services/OpenAIChatService');
const riskDetectionService = require('../services/RiskDetectionService');

const dataDir = path.resolve(__dirname, '../../data');
const appStoreFile = path.join(dataDir, 'app-store.json');
const defaultMemoryStore = {
  diaries: [],
  riskAlerts: [],
  bookings: [],
  feedbacks: [],
  interactions: []
};
const loadMemoryStore = () => {
  try {
    return { ...defaultMemoryStore, ...JSON.parse(fs.readFileSync(appStoreFile, 'utf8').replace(/^\uFEFF/, '')) };
  } catch (error) {
    return { ...defaultMemoryStore };
  }
};

const memoryStore = loadMemoryStore();

const isDbConnected = () => mongoose.connection.readyState === 1;

const persistMemoryStore = () => {
  if (isDbConnected()) return;
  try {
    fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(appStoreFile, JSON.stringify(memoryStore, null, 2));
  } catch (error) {
    console.warn('Could not persist local app store:', error.message);
  }
};

const makeMemoryId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

const hashStudentId = (value) => {
  const source = String(value || 'anonymous@student.local').trim().toLowerCase();
  return `SV-${crypto.createHash('sha256').update(source).digest('hex').slice(0, 8).toUpperCase()}`;
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const normalizeText = (value) => String(value || '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd');

const scoreSentiment = ({ text = '', mood_score, before_mood_score, after_mood_score }) => {
  let score = 50;
  const normalized = normalizeText(text);

  const positiveWords = ['tot', 'on hon', 'binh tinh', 'nhe hon', 'hieu qua', 'hai long', 'cam on', 'duoc ho tro', 'tich cuc'];
  const negativeWords = ['stress', 'met', 'buon', 'lo', 'khoc', 'ap luc', 'tuyet vong', 'kiet suc', 'mat ngu', 'khong on'];

  positiveWords.forEach(word => {
    if (normalized.includes(word)) score += 8;
  });
  negativeWords.forEach(word => {
    if (normalized.includes(word)) score -= 9;
  });

  if (mood_score) score += (Number(mood_score) - 3) * 14;
  if (before_mood_score && after_mood_score) score += (Number(after_mood_score) - Number(before_mood_score)) * 12;

  return clamp(Math.round(score), 0, 100);
};

const severityBaseScore = (severity) => {
  if (severity === 'critical') return 95;
  if (severity === 'high') return 80;
  return 58;
};

const scoreBookingUrgency = (booking = {}) => {
  let score = 55;
  const note = normalizeText(booking.note);
  if (note.includes('gap') || note.includes('khong on') || note.includes('khung hoang')) score += 20;
  if (note.includes('stress') || note.includes('lo au') || note.includes('mat ngu')) score += 12;
  if (booking.before_mood_score) score += (5 - Number(booking.before_mood_score)) * 8;
  if (booking.requested_time) {
    const requested = new Date(booking.requested_time).getTime();
    if (!Number.isNaN(requested) && requested - Date.now() < 24 * 60 * 60 * 1000) score += 10;
  }
  return clamp(Math.round(score), 0, 100);
};

const inferTagsFromText = (text) => {
  const normalized = normalizeText(text);
  const tags = [];
  const add = (condition, tag) => {
    if (condition && !tags.includes(tag)) tags.push(tag);
  };

  add(normalized.includes('deadline') || normalized.includes('thi') || normalized.includes('hoc') || normalized.includes('diem'), 'Học tập');
  add(normalized.includes('stress') || normalized.includes('ap luc') || normalized.includes('cang thang'), 'Stress');
  add(normalized.includes('mat ngu') || normalized.includes('kho ngu') || normalized.includes('ngu'), 'Mất ngủ');
  add(normalized.includes('co don') || normalized.includes('mot minh'), 'Cô đơn');
  add(normalized.includes('ban be') || normalized.includes('gia dinh') || normalized.includes('mau thuan'), 'Mối quan hệ');
  add(normalized.includes('viec lam') || normalized.includes('huong nghiep') || normalized.includes('tuong lai'), 'Hướng nghiệp');
  add(normalized.includes('tien') || normalized.includes('tai chinh'), 'Tài chính');

  return tags.length ? tags : ['Tâm sự'];
};

const interventionSuggestionForTag = (tag) => {
  const normalized = normalizeText(tag);
  if (normalized.includes('hoc') || normalized.includes('deadline')) return 'Mở workshop quản lý thời gian và kỹ năng chia nhỏ deadline.';
  if (normalized.includes('stress')) return 'Gửi bài tập thở 5 phút và ưu tiên lịch tư vấn ngắn trong 24h.';
  if (normalized.includes('ngu')) return 'Gợi ý vệ sinh giấc ngủ và theo dõi lại sau 3 ngày.';
  if (normalized.includes('co don') || normalized.includes('moi quan he')) return 'Kết nối CLB/nhóm đồng đẳng và đề xuất buổi tham vấn cá nhân.';
  if (normalized.includes('tai chinh')) return 'Chuyển đến bộ phận hỗ trợ học bổng/tài chính sinh viên.';
  return 'Theo dõi thêm trong dashboard và gửi tài nguyên phù hợp qua app.';
};

const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const normalizeDocument = (doc) => {
  const raw = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  return {
    ...raw,
    id: String(raw._id || raw.id)
  };
};

const parseDateFilter = (range) => {
  if (range === 'today') {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return start;
  }

  const days = Number(range || 7);
  if (!days || days < 1) return null;
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
};

const getFeed = async (req, res, next) => {
  try {
    let diaries;

    if (isDbConnected()) {
      diaries = await Diary.find().sort({ created_at: -1 }).limit(30);
    } else {
      diaries = memoryStore.diaries.slice(0, 30);
    }

    res.json({
      success: true,
      data: diaries.map(normalizeDocument)
    });
  } catch (error) {
    next(error);
  }
};

const createDiary = async (req, res, next) => {
  try {
    const { title, content, tags, mood_score } = req.body;

    if (!content || typeof content !== 'string' || content.trim().length < 1) {
      return res.status(400).json({ success: false, error: 'Diary content is required' });
    }

    const payload = {
      user_id: req.user?.id || null,
      author_alias: req.user?.email ? 'Tôi' : 'Tôi',
      title: String(title || '').trim().slice(0, 160),
      content: content.trim(),
      tags: Array.isArray(tags) ? tags.map(String).slice(0, 8) : [],
      mood_score: mood_score || null,
      is_anonymous: true,
      created_at: new Date()
    };

    const diary = isDbConnected()
      ? await Diary.create(payload)
      : { id: makeMemoryId('diary'), ...payload };

    if (!isDbConnected()) {
      memoryStore.diaries.unshift(diary);
      persistMemoryStore();
    }

    const interactionPayload = {
      user_id: req.user?.id || null,
      student_id_hash: hashStudentId(req.user?.email || req.user?.id),
      type: 'post',
      target_id: String(diary._id || diary.id),
      metadata: { source: 'diary', tag_count: payload.tags.length },
      created_at: new Date()
    };
    if (isDbConnected()) {
      await Interaction.create(interactionPayload);
    } else {
      memoryStore.interactions.unshift({ id: makeMemoryId('interaction'), ...interactionPayload });
      persistMemoryStore();
    }

    res.status(201).json({
      success: true,
      data: normalizeDocument(diary)
    });
  } catch (error) {
    next(error);
  }
};

const suggestDiaryTags = async (req, res, next) => {
  try {
    const { title, content } = req.body;

    if (!content || typeof content !== 'string') {
      return res.status(400).json({ success: false, error: 'Diary content is required' });
    }

    const result = await aiChatService.suggestDiaryTags({ title, content });

    const riskSignal = riskDetectionService.detectRiskSignal(`${title} ${content}`);
    let riskAlert = null;
    if (riskSignal) {
      const alertPayload = {
        user_id: req.user?.id || null,
        source: 'Diary',
        severity: riskSignal.severity,
        label: riskSignal.label,
        matched_keyword: riskSignal.matchedKeyword,
        status: 'new',
        student_alias: 'SV ẩn danh',
        student_id_hash: hashStudentId(req.user?.email || req.user?.id),
        class_name: 'CNTT_K48',
        department: 'CNTT',
        location: 'Phòng tham vấn 102 - Khu B',
        risk_score: severityBaseScore(riskSignal.severity),
        excerpt: `${title || ''} ${content}`.trim().slice(0, 500),
        created_at: new Date()
      };
      riskAlert = isDbConnected() ? await RiskAlert.create(alertPayload) : { id: makeMemoryId('alert'), ...alertPayload };
      if (!isDbConnected()) {
        memoryStore.riskAlerts.unshift(riskAlert);
        persistMemoryStore();
      }
    }

    res.json({
      success: true,
      data: {
        ...result,
        riskAlert: riskAlert ? normalizeDocument(riskAlert) : null
      }
    });
  } catch (error) {
    next(error);
  }
};

const listRiskAlerts = async (req, res, next) => {
  try {
    const since = parseDateFilter(req.query.range);
    const query = {};
    if (since) query.created_at = { $gte: since };
    if (req.query.status) query.status = req.query.status;

    let alerts;
    if (isDbConnected()) {
      alerts = await RiskAlert.find(query).sort({ created_at: -1 }).limit(100);
    } else {
      alerts = memoryStore.riskAlerts.filter(alert => {
        const inRange = !since || new Date(alert.created_at) >= since;
        const statusMatch = !req.query.status || alert.status === req.query.status;
        return inRange && statusMatch;
      });
    }

    res.json({
      success: true,
      data: alerts.map(normalizeDocument)
    });
  } catch (error) {
    next(error);
  }
};

const createRiskAlert = async (req, res, next) => {
  try {
    const severity = req.body.severity || 'high';
    const payload = {
      user_id: req.user?.id || null,
      source: req.body.source || 'Unknown',
      severity,
      label: req.body.label || 'Rủi ro tâm lý cao',
      matched_keyword: req.body.matched_keyword || '',
      status: req.body.status || 'new',
      student_alias: req.body.student_alias || 'SV ẩn danh',
      student_id_hash: req.body.student_id_hash || hashStudentId(req.user?.email || req.user?.id),
      class_name: req.body.class_name || 'CNTT_K48',
      department: req.body.department || 'CNTT',
      location: req.body.location || 'Phòng tham vấn 102 - Khu B',
      risk_score: toNumber(req.body.risk_score) || severityBaseScore(severity),
      excerpt: String(req.body.excerpt || '').slice(0, 500),
      created_at: req.body.created_at ? new Date(req.body.created_at) : new Date(),
      updated_at: req.body.updated_at ? new Date(req.body.updated_at) : null
    };

    const alert = isDbConnected()
      ? await RiskAlert.create(payload)
      : { id: req.body.id || makeMemoryId('alert'), ...payload };

    if (!isDbConnected()) {
      memoryStore.riskAlerts.unshift(alert);
      persistMemoryStore();
    }

    const interactionPayload = {
      user_id: req.user?.id || null,
      student_id_hash: payload.student_id_hash,
      type: 'chat',
      target_id: String(alert._id || alert.id),
      metadata: { source: payload.source, severity: payload.severity, risk_score: payload.risk_score },
      created_at: new Date()
    };
    if (isDbConnected()) {
      await Interaction.create(interactionPayload);
    } else {
      memoryStore.interactions.unshift({ id: makeMemoryId('interaction'), ...interactionPayload });
      persistMemoryStore();
    }

    res.status(201).json({
      success: true,
      data: normalizeDocument(alert)
    });
  } catch (error) {
    next(error);
  }
};

const updateRiskAlert = async (req, res, next) => {
  try {
    const updates = {
      status: req.body.status,
      updated_at: new Date()
    };

    let alert;
    if (isDbConnected()) {
      alert = mongoose.Types.ObjectId.isValid(req.params.id)
        ? await RiskAlert.findByIdAndUpdate(req.params.id, updates, { new: true })
        : null;
    } else {
      alert = memoryStore.riskAlerts.find(item => item.id === req.params.id);
      if (alert) {
        Object.assign(alert, updates);
        persistMemoryStore();
      }
    }

    if (!alert) {
      return res.status(404).json({ success: false, error: 'Risk alert not found' });
    }

    res.json({ success: true, data: normalizeDocument(alert) });
  } catch (error) {
    next(error);
  }
};

const createBooking = async (req, res, next) => {
  try {
    const bookingDraft = {
      requested_time: req.body.requested_time ? new Date(req.body.requested_time) : null,
      note: String(req.body.note || '').slice(0, 1000),
      before_mood_score: toNumber(req.body.before_mood_score)
    };
    const payload = {
      user_id: req.user?.id || null,
      student_alias: req.body.student_alias || 'SV ẩn danh',
      student_id_hash: req.body.student_id_hash || hashStudentId(req.user?.email || req.user?.id),
      class_name: req.body.class_name || 'CNTT_K48',
      department: req.body.department || 'CNTT',
      location: req.body.location || 'Phòng tham vấn 102 - Khu B',
      requested_time: bookingDraft.requested_time,
      note: bookingDraft.note,
      urgency_score: toNumber(req.body.urgency_score) || scoreBookingUrgency(bookingDraft),
      before_mood_score: bookingDraft.before_mood_score,
      after_mood_score: toNumber(req.body.after_mood_score),
      status: 'new',
      created_at: new Date()
    };

    const booking = isDbConnected()
      ? await Booking.create(payload)
      : { id: makeMemoryId('booking'), ...payload };

    if (!isDbConnected()) {
      memoryStore.bookings.unshift(booking);
      persistMemoryStore();
    }

    const interactionPayload = {
      user_id: req.user?.id || null,
      student_id_hash: payload.student_id_hash,
      type: 'booking',
      target_id: String(booking._id || booking.id),
      metadata: { urgency_score: payload.urgency_score, requested_time: payload.requested_time },
      created_at: new Date()
    };
    if (isDbConnected()) {
      await Interaction.create(interactionPayload);
    } else {
      memoryStore.interactions.unshift({ id: makeMemoryId('interaction'), ...interactionPayload });
      persistMemoryStore();
    }

    res.status(201).json({
      success: true,
      data: normalizeDocument(booking)
    });
  } catch (error) {
    next(error);
  }
};

const updateBooking = async (req, res, next) => {
  try {
    const updates = {
      status: req.body.status,
      updated_at: new Date()
    };
    if (req.body.after_mood_score !== undefined) updates.after_mood_score = toNumber(req.body.after_mood_score);
    if (req.body.before_mood_score !== undefined) updates.before_mood_score = toNumber(req.body.before_mood_score);
    if (req.body.location) updates.location = String(req.body.location).slice(0, 200);
    if (req.body.urgency_score !== undefined) updates.urgency_score = clamp(toNumber(req.body.urgency_score) || 0, 0, 100);

    let booking;
    if (isDbConnected()) {
      booking = mongoose.Types.ObjectId.isValid(req.params.id)
        ? await Booking.findByIdAndUpdate(req.params.id, updates, { new: true })
        : null;
    } else {
      booking = memoryStore.bookings.find(item => item.id === req.params.id);
      if (booking) {
        Object.assign(booking, updates);
        persistMemoryStore();
      }
    }

    if (!booking) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }

    res.json({ success: true, data: normalizeDocument(booking) });
  } catch (error) {
    next(error);
  }
};

const createFeedback = async (req, res, next) => {
  try {
    const reportText = String(req.body.report_text || req.body.report || '').trim();
    const ratingText = String(req.body.rating_text || req.body.feedback || '').trim();
    const combinedText = `${reportText} ${ratingText}`.trim();

    if (!combinedText) {
      return res.status(400).json({ success: false, error: 'Feedback text is required' });
    }

    const payload = {
      user_id: req.user?.id || null,
      student_id_hash: req.body.student_id_hash || hashStudentId(req.user?.email || req.user?.id),
      source_type: req.body.source_type || 'feedback',
      report_text: reportText.slice(0, 5000),
      rating_text: ratingText.slice(0, 2000),
      mood_score: toNumber(req.body.mood_score),
      before_mood_score: toNumber(req.body.before_mood_score),
      after_mood_score: toNumber(req.body.after_mood_score),
      booking_id: String(req.body.booking_id || ''),
      created_at: new Date()
    };
    payload.sentiment_score = scoreSentiment({
      text: combinedText,
      mood_score: payload.mood_score,
      before_mood_score: payload.before_mood_score,
      after_mood_score: payload.after_mood_score
    });

    const feedback = isDbConnected()
      ? await Feedback.create(payload)
      : { id: makeMemoryId('feedback'), ...payload };

    if (!isDbConnected()) {
      memoryStore.feedbacks.unshift(feedback);
      persistMemoryStore();
    }

    const interactionPayload = {
      user_id: req.user?.id || null,
      student_id_hash: payload.student_id_hash,
      type: 'feedback',
      target_id: String(feedback._id || feedback.id),
      metadata: { source_type: payload.source_type, sentiment_score: payload.sentiment_score },
      created_at: new Date()
    };
    if (isDbConnected()) {
      await Interaction.create(interactionPayload);
    } else {
      memoryStore.interactions.unshift({ id: makeMemoryId('interaction'), ...interactionPayload });
      persistMemoryStore();
    }

    res.status(201).json({
      success: true,
      data: normalizeDocument(feedback)
    });
  } catch (error) {
    next(error);
  }
};

const listFeedback = async (req, res, next) => {
  try {
    const since = parseDateFilter(req.query.range);
    const query = since ? { created_at: { $gte: since } } : {};
    let feedbacks;

    if (isDbConnected()) {
      feedbacks = await Feedback.find(query).sort({ created_at: -1 }).limit(100);
    } else {
      feedbacks = memoryStore.feedbacks.filter(item => !since || new Date(item.created_at) >= since);
    }

    res.json({
      success: true,
      data: feedbacks.map(normalizeDocument)
    });
  } catch (error) {
    next(error);
  }
};

const createInteraction = async (req, res, next) => {
  try {
    const payload = {
      user_id: req.user?.id || null,
      student_id_hash: req.body.student_id_hash || hashStudentId(req.user?.email || req.user?.id),
      type: req.body.type || 'reaction',
      target_id: String(req.body.target_id || ''),
      metadata: req.body.metadata && typeof req.body.metadata === 'object' ? req.body.metadata : {},
      created_at: new Date()
    };

    const interaction = isDbConnected()
      ? await Interaction.create(payload)
      : { id: makeMemoryId('interaction'), ...payload };

    if (!isDbConnected()) {
      memoryStore.interactions.unshift(interaction);
      persistMemoryStore();
    }

    res.status(201).json({
      success: true,
      data: normalizeDocument(interaction)
    });
  } catch (error) {
    next(error);
  }
};

const getDashboard = async (req, res, next) => {
  try {
    const since = parseDateFilter(req.query.range);
    const dateMatch = since ? { created_at: { $gte: since } } : {};

    let diaries;
    let alerts;
    let bookings;

    if (isDbConnected()) {
      [diaries, alerts, bookings] = await Promise.all([
        Diary.find(dateMatch).sort({ created_at: -1 }).limit(200),
        RiskAlert.find(dateMatch).sort({ created_at: -1 }).limit(100),
        Booking.find(dateMatch).sort({ created_at: -1 }).limit(100)
      ]);
    } else {
      const inRange = item => !since || new Date(item.created_at) >= since;
      diaries = memoryStore.diaries.filter(inRange);
      alerts = memoryStore.riskAlerts.filter(inRange);
      bookings = memoryStore.bookings.filter(inRange);
    }

    const tagCounts = diaries.reduce((acc, diary) => {
      (diary.tags || []).forEach(tag => {
        acc[tag] = (acc[tag] || 0) + 1;
      });
      return acc;
    }, {});

    const topTopics = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag, count]) => ({ tag, count }));

    const openAlerts = alerts.filter(alert => alert.status !== 'resolved');
    const highRiskCount = openAlerts.filter(alert => ['high', 'critical'].includes(alert.severity)).length;
    const completedBookingsCount = bookings.filter(b => ['completed', 'resolved'].includes(b.status)).length;

    let sentiment = 8.2;
    if (diaries.length) {
      const scored = diaries.filter(d => d.mood_score);
      if (scored.length) {
        sentiment = (scored.reduce((sum, d) => sum + d.mood_score, 0) / scored.length) * 2;
        sentiment = Math.round(sentiment * 10) / 10;
      }
    }

    let intervention_reduction = 0;
    if (alerts.length > 0 && completedBookingsCount > 0) {
      intervention_reduction = -Math.round((completedBookingsCount / alerts.length) * 100);
      intervention_reduction = Math.max(intervention_reduction, -100);
    } else if (bookings.length > 0) {
      intervention_reduction = -15;
    }

    res.json({
      success: true,
      data: {
        metrics: {
          sentiment: sentiment,
          high_risk_rate: diaries.length ? Math.round((highRiskCount / Math.max(diaries.length, 1)) * 1000) / 10 : 0,
          engagement: diaries.length + bookings.length + alerts.length,
          intervention_reduction: intervention_reduction
        },
        alerts: openAlerts.map(normalizeDocument),
        bookings: bookings.map(normalizeDocument),
        top_topics: topTopics
      }
    });
  } catch (error) {
    next(error);
  }
};

const getDashboardV2 = async (req, res, next) => {
  try {
    const since = parseDateFilter(req.query.range);
    const dateMatch = since ? { created_at: { $gte: since } } : {};

    let diaries;
    let alerts;
    let bookings;
    let feedbacks;
    let interactions;

    if (isDbConnected()) {
      [diaries, alerts, bookings, feedbacks, interactions] = await Promise.all([
        Diary.find(dateMatch).sort({ created_at: -1 }).limit(200),
        RiskAlert.find(dateMatch).sort({ created_at: -1 }).limit(100),
        Booking.find(dateMatch).sort({ created_at: -1 }).limit(100),
        Feedback.find(dateMatch).sort({ created_at: -1 }).limit(100),
        Interaction.find(dateMatch).sort({ created_at: -1 }).limit(500)
      ]);
    } else {
      const inRange = item => !since || new Date(item.created_at) >= since;
      diaries = memoryStore.diaries.filter(inRange);
      alerts = memoryStore.riskAlerts.filter(inRange);
      bookings = memoryStore.bookings.filter(inRange);
      feedbacks = memoryStore.feedbacks.filter(inRange);
      interactions = memoryStore.interactions.filter(inRange);
    }

    const tagCounts = {};
    const registerTag = (tag) => {
      const cleanTag = String(tag || '').trim();
      if (!cleanTag) return;
      tagCounts[cleanTag] = (tagCounts[cleanTag] || 0) + 1;
    };

    diaries.forEach(diary => {
      (diary.tags || []).forEach(registerTag);
      inferTagsFromText(`${diary.title || ''} ${diary.content || ''}`).forEach(registerTag);
    });
    feedbacks.forEach(feedback => {
      inferTagsFromText(`${feedback.report_text || ''} ${feedback.rating_text || ''}`).forEach(registerTag);
    });

    const totalTopicSignals = Math.max(Object.values(tagCounts).reduce((sum, value) => sum + value, 0), 1);
    const topTopics = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag, count]) => ({
        tag,
        count,
        share: Math.round((count / totalTopicSignals) * 100),
        intervention: interventionSuggestionForTag(tag)
      }));

    const openAlerts = alerts.filter(alert => alert.status !== 'resolved');
    const completedBookings = bookings.filter(b => ['completed', 'resolved'].includes(b.status));
    const pendingBookings = bookings.filter(b => !['completed', 'cancelled'].includes(b.status));
    const negativeFeedbacks = feedbacks.filter(feedback => Number(feedback.sentiment_score) < 45);
    const positiveFeedbacks = feedbacks.filter(feedback => Number(feedback.sentiment_score) >= 65);

    const scoredMoodInputs = [
      ...feedbacks.map(feedback => ({ value: feedback.mood_score || feedback.after_mood_score, weight: 2 })),
      ...diaries.map(diary => ({ value: diary.mood_score, weight: 1 }))
    ].filter(item => item.value);

    let sentiment = 7.2;
    if (scoredMoodInputs.length) {
      const weightedTotal = scoredMoodInputs.reduce((sum, item) => sum + Number(item.value) * item.weight, 0);
      const totalWeight = scoredMoodInputs.reduce((sum, item) => sum + item.weight, 0);
      sentiment = Math.round((weightedTotal / totalWeight) * 2 * 10) / 10;
    } else if (feedbacks.length) {
      sentiment = Math.round((feedbacks.reduce((sum, item) => sum + Number(item.sentiment_score || 50), 0) / feedbacks.length) / 10 * 10) / 10;
    }

    const beforeScores = feedbacks.map(feedback => Number(feedback.before_mood_score)).filter(Boolean);
    const afterScores = feedbacks.map(feedback => Number(feedback.after_mood_score || feedback.mood_score)).filter(Boolean);
    const avgBefore = beforeScores.length ? beforeScores.reduce((sum, value) => sum + value, 0) / beforeScores.length : null;
    const avgAfter = afterScores.length ? afterScores.reduce((sum, value) => sum + value, 0) / afterScores.length : null;
    const stressReduction = avgBefore && avgAfter
      ? clamp(Math.round(((avgAfter - avgBefore) / Math.max(5 - avgBefore, 1)) * 100), -100, 100)
      : (completedBookings.length ? 28 : 0);

    const activeRiskStudents = new Set([
      ...openAlerts.map(alert => alert.student_id_hash || hashStudentId(alert.user_id || alert.student_alias)),
      ...negativeFeedbacks.map(feedback => feedback.student_id_hash || hashStudentId(feedback.user_id)),
      ...pendingBookings
        .filter(booking => Number(booking.urgency_score || 0) >= 70)
        .map(booking => booking.student_id_hash || hashStudentId(booking.user_id || booking.student_alias))
    ]);

    const totalSignals = Math.max(new Set([
      ...diaries.map(item => item.user_id || item.author_alias || item.id),
      ...feedbacks.map(item => item.student_id_hash || item.user_id || item.id),
      ...bookings.map(item => item.student_id_hash || item.user_id || item.id)
    ]).size, 1);

    const engagementBreakdown = {
      posts: diaries.length,
      reactions: interactions.filter(item => item.type === 'reaction').length,
      comments: interactions.filter(item => item.type === 'comment').length,
      chats: interactions.filter(item => item.type === 'chat').length,
      bookings: bookings.length,
      feedbacks: feedbacks.length,
      resources: interactions.filter(item => item.type === 'resource_view').length
    };
    engagementBreakdown.total = Object.values(engagementBreakdown).reduce((sum, value) => sum + value, 0);

    const riskQueue = [
      ...openAlerts.map(alert => ({
        id: String(alert._id || alert.id),
        type: 'risk',
        source: alert.source,
        student_id_hash: alert.student_id_hash || hashStudentId(alert.user_id || alert.student_alias),
        location: alert.location || 'Phòng tham vấn 102 - Khu B',
        scheduled_at: alert.created_at,
        status: alert.status,
        severity: alert.severity,
        label: alert.label,
        excerpt: alert.excerpt,
        score: Number(alert.risk_score || severityBaseScore(alert.severity))
      })),
      ...pendingBookings.map(booking => ({
        id: String(booking._id || booking.id),
        type: 'booking',
        source: 'Booking',
        student_id_hash: booking.student_id_hash || hashStudentId(booking.user_id || booking.student_alias),
        location: booking.location || 'Phòng tham vấn 102 - Khu B',
        scheduled_at: booking.requested_time || booking.created_at,
        status: booking.status,
        severity: Number(booking.urgency_score || 0) >= 80 ? 'high' : 'medium',
        label: 'Yêu cầu đặt lịch hỗ trợ',
        excerpt: booking.note,
        score: Number(booking.urgency_score || scoreBookingUrgency(booking))
      }))
    ].sort((a, b) => b.score - a.score);

    const aiReport = topTopics.map(topic => ({
      tag: topic.tag,
      count: topic.count,
      share: topic.share,
      trend: topic.count >= 3 ? 'Tăng' : 'Ổn định',
      recommendation: topic.intervention || interventionSuggestionForTag(topic.tag)
    }));

    res.json({
      success: true,
      data: {
        metrics: {
          sentiment,
          high_risk_rate: Math.round((activeRiskStudents.size / totalSignals) * 1000) / 10,
          high_risk_students: activeRiskStudents.size,
          total_students_observed: totalSignals,
          engagement: engagementBreakdown.total,
          engagement_breakdown: engagementBreakdown,
          stress_reduction: stressReduction,
          intervention_success_rate: completedBookings.length
            ? Math.round((completedBookings.length / Math.max(bookings.length, 1)) * 100)
            : 0,
          positive_feedback_rate: feedbacks.length
            ? Math.round((positiveFeedbacks.length / feedbacks.length) * 100)
            : 0
        },
        alerts: openAlerts.map(normalizeDocument),
        bookings: bookings.map(normalizeDocument),
        risk_queue: riskQueue,
        feedback: feedbacks.slice(0, 8).map(normalizeDocument),
        feedback_summary: {
          total: feedbacks.length,
          positive: positiveFeedbacks.length,
          negative: negativeFeedbacks.length,
          avg_sentiment: feedbacks.length
            ? Math.round(feedbacks.reduce((sum, item) => sum + Number(item.sentiment_score || 50), 0) / feedbacks.length)
            : 0
        },
        intervention: {
          avg_before_mood: avgBefore ? Math.round(avgBefore * 10) / 10 : null,
          avg_after_mood: avgAfter ? Math.round(avgAfter * 10) / 10 : null,
          stress_reduction: stressReduction,
          completed_bookings: completedBookings.length,
          pending_bookings: pendingBookings.length
        },
        top_topics: topTopics,
        ai_report: aiReport
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getFeed,
  createDiary,
  suggestDiaryTags,
  listRiskAlerts,
  createRiskAlert,
  updateRiskAlert,
  createBooking,
  updateBooking,
  createFeedback,
  listFeedback,
  createInteraction,
  getDashboard: getDashboardV2
};
