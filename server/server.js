const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { AppError, FileSizeLimitError } = require('./errors');
const analyzeRouter = require('./routes/analyze');

const app = express();

// CORS 설정 (환경변수 기반)
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : null;

const corsOptions = {
  origin: (origin, callback) => {
    // origin이 없는 경우 (서버 간 요청, curl 등) → 항상 허용
    if (!origin) {
      return callback(null, true);
    }
    // 개발 환경 + ALLOWED_ORIGINS 미설정 시 → 전체 허용
    if (process.env.NODE_ENV !== 'production' && !allowedOrigins) {
      return callback(null, true);
    }
    // ALLOWED_ORIGINS에 포함된 오리진 → 허용
    if (allowedOrigins && allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error('CORS not allowed'));
  },
};

app.use(cors(corsOptions));

// JSON 파싱
app.use(express.json());

// Health check 엔드포인트
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// API 라우터
app.use('/api', analyzeRouter);

// 비-API 라우트 404 JSON 응답
app.use((req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'API endpoint not found' } });
});

// 글로벌 에러 핸들러
app.use((err, req, res, next) => {
  // multer 파일 크기 초과 에러 처리
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    const fileSizeError = new FileSizeLimitError();
    return res.status(fileSizeError.statusCode).json(fileSizeError.toJSON());
  }

  // AppError 인스턴스 처리
  if (err instanceof AppError) {
    console.error(`[AppError] ${err.code}: ${err.message}`);
    return res.status(err.statusCode).json(err.toJSON());
  }

  // 기타 에러 → 500
  console.error('Unexpected error:', err);
  return res.status(500).json({
    error: {
      code: 'UNEXPECTED_ERROR',
      message: '서버 내부 오류가 발생했습니다',
    },
  });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
