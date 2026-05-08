const openAIChatService = require('../services/OpenAIChatService');
const mongoose = require('mongoose');
const ChatMessage = require('../models/ChatMessage');

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
