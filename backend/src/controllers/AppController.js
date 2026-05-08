const mongoose = require('mongoose');
const Diary = require('../models/Diary');
const RiskAlert = require('../models/RiskAlert');
const Booking = require('../models/Booking');
const openAIChatService = require('../services/OpenAIChatService');

const memoryStore = {
  diaries: [],
  riskAlerts: [],
  bookings: []
};

const isDbConnected = () => mongoose.connection.readyState === 1;

const makeMemoryId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

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

    if (!isDbConnected()) memoryStore.diaries.unshift(diary);

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

    const result = await openAIChatService.suggestDiaryTags({ title, content });

    res.json({
      success: true,
      data: result
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
    const payload = {
      user_id: req.user?.id || null,
      source: req.body.source || 'Unknown',
      severity: req.body.severity || 'high',
      label: req.body.label || 'Rủi ro tâm lý cao',
      matched_keyword: req.body.matched_keyword || '',
      status: req.body.status || 'new',
      student_alias: req.body.student_alias || 'SV ẩn danh',
      class_name: req.body.class_name || 'CNTT_K48',
      department: req.body.department || 'CNTT',
      excerpt: String(req.body.excerpt || '').slice(0, 500),
      created_at: req.body.created_at ? new Date(req.body.created_at) : new Date(),
      updated_at: req.body.updated_at ? new Date(req.body.updated_at) : null
    };

    const alert = isDbConnected()
      ? await RiskAlert.create(payload)
      : { id: req.body.id || makeMemoryId('alert'), ...payload };

    if (!isDbConnected()) memoryStore.riskAlerts.unshift(alert);

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
      if (alert) Object.assign(alert, updates);
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
    const payload = {
      user_id: req.user?.id || null,
      student_alias: req.body.student_alias || 'SV ẩn danh',
      class_name: req.body.class_name || 'CNTT_K48',
      department: req.body.department || 'CNTT',
      requested_time: req.body.requested_time ? new Date(req.body.requested_time) : null,
      note: String(req.body.note || '').slice(0, 1000),
      status: 'new',
      created_at: new Date()
    };

    const booking = isDbConnected()
      ? await Booking.create(payload)
      : { id: makeMemoryId('booking'), ...payload };

    if (!isDbConnected()) memoryStore.bookings.unshift(booking);

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

    let booking;
    if (isDbConnected()) {
      booking = mongoose.Types.ObjectId.isValid(req.params.id)
        ? await Booking.findByIdAndUpdate(req.params.id, updates, { new: true })
        : null;
    } else {
      booking = memoryStore.bookings.find(item => item.id === req.params.id);
      if (booking) Object.assign(booking, updates);
    }

    if (!booking) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }

    res.json({ success: true, data: normalizeDocument(booking) });
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

    res.json({
      success: true,
      data: {
        metrics: {
          sentiment: diaries.length ? 7.8 : 8.2,
          high_risk_rate: diaries.length ? Math.round((highRiskCount / Math.max(diaries.length, 1)) * 1000) / 10 : 0,
          engagement: diaries.length + bookings.length + alerts.length,
          intervention_reduction: bookings.length ? -35 : 0
        },
        alerts: openAlerts.map(normalizeDocument),
        bookings: bookings.map(normalizeDocument),
        top_topics: topTopics.length ? topTopics : [
          { tag: 'Áp lực thi cử', count: 45 },
          { tag: 'Hướng nghiệp', count: 20 },
          { tag: 'Mâu thuẫn bạn bè', count: 15 }
        ],
        heatmap: [
          { department: 'CNTT', anxiety: 'Cao', stress: highRiskCount ? 'Rất Cao' : 'Cao', depression: 'Thấp', burnout: 'Cao' },
          { department: 'Kinh tế', anxiety: 'TB', stress: 'TB', depression: 'Ổn', burnout: 'Thấp' },
          { department: 'Ngoại ngữ', anxiety: 'Thấp', stress: 'Cao', depression: 'Ổn', burnout: 'Ổn' }
        ]
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
  getDashboard
};
