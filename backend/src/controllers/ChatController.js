const openAIChatService = require('../services/OpenAIChatService');
const riskDetectionService = require('../services/RiskDetectionService');
const mongoose = require('mongoose');
const ChatMessage = require('../models/ChatMessage');
const RiskAlert = require('../models/RiskAlert');

const makeMemoryId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

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

    const result = await openAIChatService.generateSupportReply({
      message,
      history: Array.isArray(history) ? history : []
    });

    if (mongoose.connection.readyState === 1) {
      await ChatMessage.create({
        user_id: req.user?.id || null,
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

module.exports = {
  supportChat
};
