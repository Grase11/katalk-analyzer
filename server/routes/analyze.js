const express = require('express');
const multer = require('multer');
const path = require('path');
const { parse } = require('../lib/parser');
const { calculateStats } = require('../lib/stats');
const { analyze } = require('../lib/analyzer');
const {
  InvalidFileTypeError,
  FileSizeLimitError,
  AppError,
} = require('../errors');

const router = express.Router();

// multer 설정: 메모리 스토리지, 10MB 제한
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

/**
 * POST /api/analyze
 * 카카오톡 대화 txt 파일을 업로드하여 분석 결과를 반환한다.
 */
router.post('/analyze', upload.single('file'), async (req, res, next) => {
  try {
    // 파일 존재 여부 확인
    if (!req.file) {
      throw new InvalidFileTypeError();
    }

    // 확장자 검증 (.txt만 허용)
    const ext = path.extname(req.file.originalname).toLowerCase();
    if (ext !== '.txt') {
      throw new InvalidFileTypeError();
    }

    // 크기 검증 (multer limits가 먼저 잡지만, 이중 검증)
    if (req.file.size > 10 * 1024 * 1024) {
      throw new FileSizeLimitError();
    }

    // 파일 내용 읽기
    const fileContent = req.file.buffer.toString('utf-8');

    // 파서 → 통계 → 분석 엔진 파이프라인
    const parseResult = parse(fileContent);
    const stats = calculateStats(parseResult);
    const analysisResult = await analyze(parseResult, stats);

    return res.json(analysisResult);
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
