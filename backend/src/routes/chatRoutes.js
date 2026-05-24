const express = require('express');
const chatController = require('../controllers/ChatController');
const optionalAuthenticate = require('../middlewares/optionalAuthenticate');

const router = express.Router();

router.post('/support', optionalAuthenticate, chatController.supportChat);
router.get('/history', optionalAuthenticate, chatController.getChatHistory);
router.post('/clear', optionalAuthenticate, chatController.clearChatHistory);

module.exports = router;
