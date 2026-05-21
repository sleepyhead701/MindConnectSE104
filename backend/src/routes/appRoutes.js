const express = require('express');
const appController = require('../controllers/AppController');
const optionalAuthenticate = require('../middlewares/optionalAuthenticate');
const requireRole = require('../middlewares/requireRole');

const router = express.Router();

router.get('/feed', optionalAuthenticate, appController.getFeed);
router.post('/diaries', optionalAuthenticate, appController.createDiary);
router.post('/diaries/tags', optionalAuthenticate, appController.suggestDiaryTags);
router.post('/interactions', optionalAuthenticate, appController.createInteraction);

// Risk alerts: Everyone can list/create (in prototype, student might need to create it implicitly, but admin lists them)
// Wait, if student creates risk alerts, they only need optionalAuthenticate
// But listing and updating risk alerts is for admins/school.
router.get('/risk-alerts', optionalAuthenticate, requireRole(['school', 'admin']), appController.listRiskAlerts);
router.post('/risk-alerts', optionalAuthenticate, appController.createRiskAlert);
router.patch('/risk-alerts/:id', optionalAuthenticate, requireRole(['school', 'admin']), appController.updateRiskAlert);

router.post('/bookings', optionalAuthenticate, appController.createBooking);
router.patch('/bookings/:id', optionalAuthenticate, requireRole(['school', 'admin']), appController.updateBooking);

router.get('/feedback', optionalAuthenticate, requireRole(['school', 'admin']), appController.listFeedback);
router.post('/feedback', optionalAuthenticate, appController.createFeedback);

router.get('/dashboard', optionalAuthenticate, requireRole(['school', 'admin']), appController.getDashboard);

module.exports = router;
