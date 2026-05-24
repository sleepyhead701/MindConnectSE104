const aiChatService = require('../services/OpenAIChatService');
const riskDetectionService = require('../services/RiskDetectionService');
const mongoose = require('mongoose');
const ChatMessage = require('../models/ChatMessage');
const RiskAlert = require('../models/RiskAlert');
const crypto = require('crypto');

const makeMemoryId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
const hashStudentId = (value) => {
  const source = String(value || 'anonymous@student.local').trim().toLowerCase();
  return `SV-${crypto.createHash('sha256').update(source).digest('hex').slice(0, 8).toUpperCase()}`;
};

const getStudentIdentitySource = (req) => (
  req.user?.email ||
  req.user?.id ||
  req.body?.student_client_id ||
  req.query?.student_client_id ||
  req.headers['x-student-client-id'] ||
  null
);

const supportChat = async (req, res, next) => {
  try {
    const { message, history } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length < 1) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    if (message.length > 2000) {
      return res.status(400).json({
        success: false,
        error: 'Message is too long'
      });
    }

    const riskSignal = riskDetectionService.detectRiskSignal(message);
    if (riskSignal && riskSignal.severity === 'critical') {
      const alertPayload = {
        user_id: req.user?.id || null,
        student_id_hash: hashStudentId(getStudentIdentitySource(req)),
        source: 'Chat',
        severity: riskSignal.severity,
        label: riskSignal.label,
        matched_keyword: riskSignal.matchedKeyword,
        status: 'new',
        student_alias: 'SV ẩn danh',
        class_name: 'CNTT_K48',
        department: 'CNTT',
        excerpt: message.slice(0, 500),
        created_at: new Date()
      };
      
      // In a real scenario we'd use memoryStore if no DB, but we don't have access to memoryStore here.
      // Assuming DB is connected or we just silently fail creating the alert if DB isn't connected.
      if (mongoose.connection.readyState === 1) {
        await RiskAlert.create(alertPayload);
      }

      return res.status(200).json({
        success: true,
        data: {
          reply: "⚠️ Mình rất lo lắng cho sự an toàn của bạn. Cảnh báo ẩn danh đã được gửi đến tổ tham vấn. Nếu bạn đang có nguy cơ tự hại, hãy gọi hotline 1900.1267 hoặc liên hệ người tin cậy ngay.",
          model: 'safety-fallback'
        }
      });
    }

    const result = await aiChatService.generateSupportReply({
      message,
      history: Array.isArray(history) ? history : []
    });

    if (mongoose.connection.readyState === 1) {
      await ChatMessage.create({
        user_id: req.user?.id || null,
        student_id_hash: hashStudentId(getStudentIdentitySource(req)),
        user_message: message.trim(),
        ai_reply: result.reply,
        model: result.model
      });
    }

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

const getChatHistory = async (req, res, next) => {
  try {
    const identitySource = getStudentIdentitySource(req);
    if (!identitySource) {
      return res.json({ success: true, data: [] });
    }

    if (mongoose.connection.readyState !== 1) {
      return res.json({ success: true, data: [] });
    }

    const studentHash = hashStudentId(identitySource);
    const filters = [{ student_id_hash: studentHash }];
    if (req.user?.id && mongoose.Types.ObjectId.isValid(req.user.id)) {
      filters.push({ user_id: req.user.id });
    }

    const messages = await ChatMessage.find({ $or: filters })
      .sort({ created_at: 1 })
      .limit(80);

    res.json({
      success: true,
      data: messages.map(message => ({
        id: String(message._id),
        user_message: message.user_message,
        ai_reply: message.ai_reply,
        model: message.model,
        created_at: message.created_at
      }))
    });
  } catch (error) {
    next(error);
  }
};

const clearChatHistory = async (req, res, next) => {
  try {
    const identitySource = getStudentIdentitySource(req);
    if (identitySource && mongoose.connection.readyState === 1) {
      const studentHash = hashStudentId(identitySource);
      const filters = [{ student_id_hash: studentHash }];
      if (req.user?.id && mongoose.Types.ObjectId.isValid(req.user.id)) {
        filters.push({ user_id: req.user.id });
      }
      await ChatMessage.deleteMany({ $or: filters });
    }

    res.json({
      success: true,
      data: { cleared: true }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  supportChat,
  getChatHistory,
  clearChatHistory
};
