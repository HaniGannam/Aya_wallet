// news.routes.js
const express = require('express');
const router = express.Router();
const newsController = require('./news.controller');

// router.get('/news', newsController.runAiagent);
router.get('/get_news', newsController.getAiagent);
// router.post('/news/symbol/sync', newsController.syncSymbol);
// router.get('/news/best', newsController.bestNews);

// router.get('/run', newsController.runbot);

module.exports = router;