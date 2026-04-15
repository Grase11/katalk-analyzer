const {
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
} = require('../../server/errors/index');

describe('에러 클래스', () => {
  describe('AppError (기본 클래스)', () => {
    it('message, code, statusCode를 올바르게 설정한다', () => {
      const err = new AppError('테스트 에러', 'TEST_CODE', 418);
      expect(err.message).toBe('테스트 에러');
      expect(err.code).toBe('TEST_CODE');
      expect(err.statusCode).toBe(418);
      expect(err.name).toBe('AppError');
      expect(err).toBeInstanceOf(Error);
    });

    it('toJSON()이 에러 응답 형식을 반환한다', () => {
      const err = new AppError('테스트', 'CODE', 400);
      expect(err.toJSON()).toEqual({
        error: { code: 'CODE', message: '테스트' },
      });
    });

    it('스택 트레이스를 포함한다', () => {
      const err = new AppError('테스트', 'CODE', 400);
      expect(err.stack).toBeDefined();
    });
  });

  describe('FileValidationError 계열 (400)', () => {
    it('InvalidFileTypeError', () => {
      const err = new InvalidFileTypeError();
      expect(err.message).toBe('txt 파일만 업로드 가능합니다');
      expect(err.code).toBe('INVALID_FILE_TYPE');
      expect(err.statusCode).toBe(400);
      expect(err).toBeInstanceOf(FileValidationError);
      expect(err).toBeInstanceOf(AppError);
    });

    it('FileSizeLimitError', () => {
      const err = new FileSizeLimitError();
      expect(err.message).toBe('파일 크기는 10MB 이하만 가능합니다');
      expect(err.code).toBe('FILE_SIZE_LIMIT');
      expect(err.statusCode).toBe(400);
      expect(err).toBeInstanceOf(FileValidationError);
      expect(err).toBeInstanceOf(AppError);
    });
  });

  describe('ParseError 계열 (400)', () => {
    it('InvalidFormatError', () => {
      const err = new InvalidFormatError();
      expect(err.message).toBe('카카오톡 대화 내보내기 파일이 아닙니다');
      expect(err.code).toBe('INVALID_FORMAT');
      expect(err.statusCode).toBe(400);
      expect(err).toBeInstanceOf(ParseError);
      expect(err).toBeInstanceOf(AppError);
    });

    it('EmptyFileError', () => {
      const err = new EmptyFileError();
      expect(err.message).toBe('파일 내용이 비어있습니다');
      expect(err.code).toBe('EMPTY_FILE');
      expect(err.statusCode).toBe(400);
      expect(err).toBeInstanceOf(ParseError);
      expect(err).toBeInstanceOf(AppError);
    });
  });

  describe('AnalysisError 계열 (502)', () => {
    it('ClaudeAPIError', () => {
      const err = new ClaudeAPIError();
      expect(err.message).toBe(
        '분석 서비스에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요'
      );
      expect(err.code).toBe('CLAUDE_API_ERROR');
      expect(err.statusCode).toBe(502);
      expect(err).toBeInstanceOf(AnalysisError);
      expect(err).toBeInstanceOf(AppError);
    });

    it('ClaudeTimeoutError', () => {
      const err = new ClaudeTimeoutError();
      expect(err.message).toBe(
        '분석 시간이 초과되었습니다. 잠시 후 다시 시도해주세요'
      );
      expect(err.code).toBe('CLAUDE_TIMEOUT');
      expect(err.statusCode).toBe(502);
      expect(err).toBeInstanceOf(AnalysisError);
      expect(err).toBeInstanceOf(AppError);
    });
  });

  describe('InternalError 계열 (500)', () => {
    it('UnexpectedError', () => {
      const err = new UnexpectedError();
      expect(err.message).toBe('서버 내부 오류가 발생했습니다');
      expect(err.code).toBe('UNEXPECTED_ERROR');
      expect(err.statusCode).toBe(500);
      expect(err).toBeInstanceOf(InternalError);
      expect(err).toBeInstanceOf(AppError);
    });
  });

  describe('에러 계층 구조 검증', () => {
    it('모든 에러는 Error를 상속한다', () => {
      const errors = [
        new InvalidFileTypeError(),
        new FileSizeLimitError(),
        new InvalidFormatError(),
        new EmptyFileError(),
        new ClaudeAPIError(),
        new ClaudeTimeoutError(),
        new UnexpectedError(),
      ];
      errors.forEach((err) => {
        expect(err).toBeInstanceOf(Error);
        expect(err).toBeInstanceOf(AppError);
      });
    });

    it('각 에러의 name이 클래스명과 일치한다', () => {
      expect(new InvalidFileTypeError().name).toBe('InvalidFileTypeError');
      expect(new FileSizeLimitError().name).toBe('FileSizeLimitError');
      expect(new InvalidFormatError().name).toBe('InvalidFormatError');
      expect(new EmptyFileError().name).toBe('EmptyFileError');
      expect(new ClaudeAPIError().name).toBe('ClaudeAPIError');
      expect(new ClaudeTimeoutError().name).toBe('ClaudeTimeoutError');
      expect(new UnexpectedError().name).toBe('UnexpectedError');
    });
  });
});
