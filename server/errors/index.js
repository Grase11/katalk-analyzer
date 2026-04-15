/**
 * 에러 클래스 정의
 * 
 * AppError (base)
 * ├── FileValidationError (400)
 * │   ├── InvalidFileTypeError
 * │   └── FileSizeLimitError
 * ├── ParseError (400)
 * │   ├── InvalidFormatError
 * │   └── EmptyFileError
 * ├── AnalysisError (502)
 * │   ├── ClaudeAPIError
 * │   └── ClaudeTimeoutError
 * └── InternalError (500)
 *     └── UnexpectedError
 */

class AppError extends Error {
  constructor(message, code, statusCode) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
      },
    };
  }
}

// --- FileValidationError (400) ---

class FileValidationError extends AppError {
  constructor(message, code) {
    super(message, code, 400);
  }
}

class InvalidFileTypeError extends FileValidationError {
  constructor() {
    super('txt 파일만 업로드 가능합니다', 'INVALID_FILE_TYPE');
  }
}

class FileSizeLimitError extends FileValidationError {
  constructor() {
    super('파일 크기는 10MB 이하만 가능합니다', 'FILE_SIZE_LIMIT');
  }
}


// --- ParseError (400) ---

class ParseError extends AppError {
  constructor(message, code) {
    super(message, code, 400);
  }
}

class InvalidFormatError extends ParseError {
  constructor() {
    super('카카오톡 대화 내보내기 파일이 아닙니다', 'INVALID_FORMAT');
  }
}

class EmptyFileError extends ParseError {
  constructor() {
    super('파일 내용이 비어있습니다', 'EMPTY_FILE');
  }
}

// --- AnalysisError (502) ---

class AnalysisError extends AppError {
  constructor(message, code) {
    super(message, code, 502);
  }
}

class ClaudeAPIError extends AnalysisError {
  constructor() {
    super(
      '분석 서비스에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요',
      'CLAUDE_API_ERROR'
    );
  }
}

class ClaudeTimeoutError extends AnalysisError {
  constructor() {
    super(
      '분석 시간이 초과되었습니다. 잠시 후 다시 시도해주세요',
      'CLAUDE_TIMEOUT'
    );
  }
}

// --- InternalError (500) ---

class InternalError extends AppError {
  constructor(message, code) {
    super(message, code, 500);
  }
}

class UnexpectedError extends InternalError {
  constructor() {
    super('서버 내부 오류가 발생했습니다', 'UNEXPECTED_ERROR');
  }
}

module.exports = {
  AppError,
  FileValidationError,
  InvalidFileTypeError,
  FileSizeLimitError,
  ParseError,
  InvalidFormatError,
  EmptyFileError,
  AnalysisError,
  ClaudeAPIError,
  ClaudeTimeoutError,
  InternalError,
  UnexpectedError,
};
