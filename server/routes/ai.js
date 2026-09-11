// server/routes/ai.js - AI Endpoints for HoloCard Studio
const express = require('express');
const router = express.Router();

const holoSceneController = require('../controllers/holoSceneController');
const holoDepthController = require('../controllers/holoDepthController');

// 1. 卡面元数据与数值灵感生成
router.post('/holo-card/generate', holoDepthController.generateHoloCard);

// 2. 独立立绘主体自动抠图
router.post('/holo-card/matting', holoDepthController.extractHoloSubject);

// 3. AI 3D 深度图与多主体分层估计 (Depth Anything V2 + EasyOCR 浮雕文字提取)
router.post('/holo-card/depth-layers', holoDepthController.extractHoloDepthLayers);

// 4. 通用多主体场景与 3D 景深分层解析 (DeepSeek Flash)
router.post('/holo-card/analyze-scene', holoSceneController.analyzeHoloScene);

// 5. 16:9 全景生成式扩图 (Gemini Image)
router.post('/holo-card/expand-background', holoSceneController.expandHoloBackground);

module.exports = router;
