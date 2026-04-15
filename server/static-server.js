const express = require('express');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const BUILD_DIR = path.join(__dirname, '../client/build');
const API_TARGET = process.env.API_TARGET || 'http://localhost:3000';

// API 요청을 API 서버로 프록시 (/api/** 경로 그대로 전달)
app.use(createProxyMiddleware({
  target: API_TARGET,
  changeOrigin: true,
  pathFilter: '/api/**',
}));

// 정적 파일 서빙
app.use(express.static(BUILD_DIR));

// SPA 폴백
app.get('*', (req, res) => {
  res.sendFile(path.join(BUILD_DIR, 'index.html'));
});

const PORT = process.env.PORT || 80;
app.listen(PORT, () => {
  console.log(`Static file server running on port ${PORT}`);
  console.log(`API proxy target: ${API_TARGET}`);
});
