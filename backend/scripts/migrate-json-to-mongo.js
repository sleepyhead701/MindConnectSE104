const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const User = require('../src/models/User');
const Diary = require('../src/models/Diary');
const RiskAlert = require('../src/models/RiskAlert');
const Booking = require('../src/models/Booking');
const Feedback = require('../src/models/Feedback');
const Interaction = require('../src/models/Interaction');
const PublicFeedPost = require('../src/models/PublicFeedPost');

const dataDir = path.resolve(__dirname, '../data');
const appStoreFile = path.join(dataDir, 'app-store.json');
const usersFile = path.join(dataDir, 'users.json');
const shouldReset = process.argv.includes('--reset');
const userIdMap = new Map();

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
  } catch (error) {
    console.warn(`Could not read ${path.basename(file)}: ${error.message}`);
    return fallback;
  }
}

function asDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function asObjectId(value) {
  const id = String(value || '');
  return mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null;
}

function resolveUserId(value) {
  const legacyId = String(value || '');
  return userIdMap.get(legacyId) || asObjectId(legacyId);
}

function compact(object) {
  return Object.fromEntries(
    Object.entries(object).filter(([, value]) => value !== undefined)
  );
}

function normalizeUser(user) {
  return compact({
    email: String(user.email || '').trim().toLowerCase(),
    password: user.password,
    role: ['student', 'school', 'admin'].includes(user.role) ? user.role : 'student',
    created_at: asDate(user.created_at) || new Date()
  });
}

function normalizeDiary(item) {
  return compact({
    user_id: resolveUserId(item.user_id),
    author_alias: item.author_alias || 'Tôi',
    title: item.title || '',
    content: item.content || '',
    tags: Array.isArray(item.tags) ? item.tags.map(String) : [],
    mood_score: item.mood_score || null,
    is_anonymous: item.is_anonymous !== false,
    created_at: asDate(item.created_at) || new Date()
  });
}

function normalizeRiskAlert(item) {
  return compact({
    user_id: resolveUserId(item.user_id),
    source: item.source || 'Diary',
    severity: item.severity || 'high',
    label: item.label || 'Cảnh báo cần theo dõi',
    matched_keyword: item.matched_keyword || '',
    status: item.status || 'new',
    student_alias: item.student_alias || 'SV ẩn danh',
    student_id_hash: item.student_id_hash || 'SV-ANON',
    class_name: item.class_name || 'CNTT_K48',
    department: item.department || 'CNTT',
    location: item.location || 'Phòng tham vấn 102 - Khu B',
    risk_score: item.risk_score || 70,
    excerpt: item.excerpt || '',
    created_at: asDate(item.created_at) || new Date(),
    updated_at: asDate(item.updated_at)
  });
}

function normalizeBooking(item) {
  return compact({
    user_id: resolveUserId(item.user_id),
    student_alias: item.student_alias || 'SV ẩn danh',
    student_id_hash: item.student_id_hash || 'SV-ANON',
    class_name: item.class_name || 'CNTT_K48',
    department: item.department || 'CNTT',
    location: item.location || 'Phòng tham vấn 102 - Khu B',
    urgency_score: item.urgency_score || 60,
    before_mood_score: item.before_mood_score || null,
    after_mood_score: item.after_mood_score || null,
    requested_time: asDate(item.requested_time),
    rescheduled_from: item.rescheduled_from || '',
    rescheduled_at: asDate(item.rescheduled_at),
    note: item.note || '',
    internal_notes: Array.isArray(item.internal_notes) ? item.internal_notes : [],
    timeline: Array.isArray(item.timeline) ? item.timeline : [],
    public_updates: Array.isArray(item.public_updates) ? item.public_updates : [],
    status: item.status || 'new',
    created_at: asDate(item.created_at) || new Date(),
    updated_at: asDate(item.updated_at)
  });
}

function normalizeFeedback(item) {
  return compact({
    user_id: resolveUserId(item.user_id),
    student_id_hash: item.student_id_hash || 'SV-ANON',
    source_type: item.source_type || 'feedback',
    report_text: item.report_text || '',
    rating_text: item.rating_text || '',
    mood_score: item.mood_score || null,
    before_mood_score: item.before_mood_score || null,
    after_mood_score: item.after_mood_score || null,
    sentiment_score: item.sentiment_score || 50,
    booking_id: item.booking_id || '',
    created_at: asDate(item.created_at) || new Date()
  });
}

function normalizeInteraction(item) {
  return compact({
    user_id: resolveUserId(item.user_id),
    student_id_hash: item.student_id_hash || 'SV-ANON',
    type: item.type || 'post',
    target_id: item.target_id || '',
    metadata: item.metadata || {},
    created_at: asDate(item.created_at) || new Date()
  });
}

function normalizePublicFeedPost(item, index) {
  return compact({
    ...item,
    id: item.id || `feed-import-${index}`,
    date: asDate(item.date) || asDate(item.created_at) || new Date(),
    tags: Array.isArray(item.tags) ? item.tags.map(String) : [],
    commentObjects: Array.isArray(item.commentObjects) ? item.commentObjects : [],
    sort_index: Number.isFinite(Number(item.sort_index)) ? Number(item.sort_index) : index,
    created_at: asDate(item.created_at) || asDate(item.date) || new Date(),
    updated_at: asDate(item.updated_at) || new Date()
  });
}

async function importUsers(users) {
  let inserted = 0;
  let reused = 0;

  for (const user of users) {
    const doc = normalizeUser(user);
    if (!doc.email || !doc.password) continue;

    const before = await User.exists({ email: doc.email });
    const saved = await User.findOneAndUpdate(
      { email: doc.email },
      { $setOnInsert: doc },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    if (user._id) {
      userIdMap.set(String(user._id), saved._id);
    }

    if (before) reused += 1;
    else inserted += 1;
  }

  return { inserted, reused };
}

async function upsertMany(label, model, items, normalize, buildFilter) {
  let inserted = 0;
  let reused = 0;
  let skipped = 0;

  for (let index = 0; index < items.length; index += 1) {
    const doc = normalize(items[index], index);
    const filter = buildFilter(items[index], doc);
    if (!filter) {
      skipped += 1;
      continue;
    }

    const result = await model.updateOne(
      filter,
      { $setOnInsert: doc },
      { upsert: true, setDefaultsOnInsert: true }
    );

    if (result.upsertedCount) inserted += 1;
    else reused += 1;
  }

  return { label, inserted, reused, skipped };
}

async function resetCollections() {
  await Promise.all([
    User.deleteMany({}),
    Diary.deleteMany({}),
    RiskAlert.deleteMany({}),
    Booking.deleteMany({}),
    Feedback.deleteMany({}),
    Interaction.deleteMany({}),
    PublicFeedPost.deleteMany({})
  ]);
}

async function main() {
  const uri = process.env.MONGODB_URI || '';
  if (!uri || uri.includes('<') || uri.includes('your-')) {
    throw new Error('Set MONGODB_URI in backend/.env before migrating.');
  }

  if (process.env.SKIP_DB_CONNECT === 'true') {
    throw new Error('Set SKIP_DB_CONNECT=false in backend/.env before migrating.');
  }

  await mongoose.connect(uri);
  console.log(`Connected to MongoDB: ${mongoose.connection.name}`);

  const users = readJson(usersFile, []);
  const store = readJson(appStoreFile, {});

  if (shouldReset) {
    console.warn('Reset mode enabled: deleting MindConnect collections before import.');
    await resetCollections();
  }

  const userResult = await importUsers(Array.isArray(users) ? users : []);
  const results = [
    { label: 'users', ...userResult },
    await upsertMany('diaries', Diary, store.diaries || [], normalizeDiary, (item, doc) => (
      doc.content ? { content: doc.content, created_at: doc.created_at } : null
    )),
    await upsertMany('riskAlerts', RiskAlert, store.riskAlerts || [], normalizeRiskAlert, (item, doc) => ({
      source: doc.source,
      label: doc.label,
      student_id_hash: doc.student_id_hash,
      created_at: doc.created_at
    })),
    await upsertMany('bookings', Booking, store.bookings || [], normalizeBooking, (item, doc) => ({
      student_id_hash: doc.student_id_hash,
      note: doc.note,
      created_at: doc.created_at
    })),
    await upsertMany('feedbacks', Feedback, store.feedbacks || [], normalizeFeedback, (item, doc) => ({
      student_id_hash: doc.student_id_hash,
      source_type: doc.source_type,
      created_at: doc.created_at,
      report_text: doc.report_text
    })),
    await upsertMany('interactions', Interaction, store.interactions || [], normalizeInteraction, (item, doc) => ({
      student_id_hash: doc.student_id_hash,
      type: doc.type,
      target_id: doc.target_id,
      created_at: doc.created_at
    })),
    await upsertMany('publicFeed', PublicFeedPost, store.publicFeed || [], normalizePublicFeedPost, (item, doc) => ({
      id: doc.id
    }))
  ];

  console.table(results);
}

main()
  .catch(error => {
    console.error(`Migration failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => {});
  });
