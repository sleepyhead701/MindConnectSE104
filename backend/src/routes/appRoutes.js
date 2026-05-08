const express = require('express');
const appController = require('../controllers/AppController');
const optionalAuthenticate = require('../middlewares/optionalAuthenticate');

const router = express.Router();

router.get('/feed', optionalAuthenticate, appController.getFeed);
router.post('/diaries', optionalAuthenticate, appController.createDiary);
router.post('/diaries/tags', optionalAuthenticate, appController.suggestDiaryTags);

router.get('/risk-alerts', optionalAuthenticate, appController.listRiskAlerts);
router.post('/risk-alerts', optionalAuthenticate, appController.createRiskAlert);
router.patch('/risk-alerts/:id', optionalAuthenticate, appController.updateRiskAlert);

router.post('/bookings', optionalAuthenticate, appController.createBooking);
router.patch('/bookings/:id', optionalAuthenticate, appController.updateBooking);

router.get('/dashboard', optionalAuthenticate, appController.getDashboard);

module.exports = router;
