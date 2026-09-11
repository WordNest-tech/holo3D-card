// server/server.js - Standalone Backend Server for HoloCard Studio
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const aiRoutes = require('./routes/ai');

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件配置
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 健康检查路由
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'HoloCard Studio AI Backend',
    timestamp: new Date().toISOString()
  });
});

// 挂载 3D 全息卡牌 AI 路由
app.use('/api/ai', aiRoutes);

// 全局错误捕获
app.use((err, req, res, next) => {
  console.error('[HoloCard Studio Server Error]:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || '服务器内部异常'
  });
});

app.listen(PORT, () => {
  console.log(`=============================================`);
  console.log(`  3D HoloCard Studio Server is running!`);
  console.log(`  Local: http://localhost:${PORT}`);
  console.log(`  Health: http://localhost:${PORT}/health`);
  console.log(`=============================================`);
});
