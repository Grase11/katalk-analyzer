const { parse, convertTo24Hour, isSystemMessageLine, isSystemMessageContent } = require('../../server/lib/parser');
const { InvalidFormatError, EmptyFileError } = require('../../server/errors');

describe('카카오톡 파서', () => {
  describe('parse - 기본 파싱', () => {
    test('유효한 카카오톡 대화 파일을 올바르게 파싱한다', () => {
      const input = [
        '김철수, 홍길동 님과 카카오톡 대화',
        '저장한 날짜 : 2024년 3월 16일 오후 5:30',
        '--------------- 2024년 3월 15일 금요일 ---------------',
        '[홍길동] [오후 2:30] 안녕하세요',
        '[김철수] [오후 2:31] 네 안녕하세요!',
      ].join('\n');

      const result = parse(input);

      expect(result.chatRoomName).toBe('김철수, 홍길동');
      expect(result.participants).toEqual(
        expect.arrayContaining(['홍길동', '김철수'])
      );
      expect(result.messages).toHaveLength(2);
      expect(result.messages[0].sender).toBe('홍길동');
      expect(result.messages[0].content).toBe('안녕하세요');
      expect(result.messages[0].isSystemMessage).toBe(false);
      expect(result.messages[0].timestamp).toEqual(new Date(2024, 2, 15, 14, 30));
      expect(result.messages[1].sender).toBe('김철수');
      expect(result.period.start).toEqual(new Date(2024, 2, 15, 14, 30));
      expect(result.period.end).toEqual(new Date(2024, 2, 15, 14, 31));
    });

    test('여러 날짜에 걸친 대화를 파싱한다', () => {
      const input = [
        '테스트방 님과 카카오톡 대화',
        '--------------- 2024년 1월 1일 월요일 ---------------',
        '[A] [오전 9:00] 새해 복 많이 받으세요',
        '--------------- 2024년 1월 2일 화요일 ---------------',
        '[B] [오후 1:00] 감사합니다',
      ].join('\n');

      const result = parse(input);
      expect(result.messages).toHaveLength(2);
      expect(result.messages[0].timestamp).toEqual(new Date(2024, 0, 1, 9, 0));
      expect(result.messages[1].timestamp).toEqual(new Date(2024, 0, 2, 13, 0));
    });
  });

  describe('parse - 여러 줄 메시지', () => {
    test('여러 줄에 걸친 메시지를 하나로 결합한다', () => {
      const input = [
        '테스트 님과 카카오톡 대화',
        '--------------- 2024년 3월 15일 금요일 ---------------',
        '[홍길동] [오후 2:30] 첫 번째 줄',
        '두 번째 줄',
        '세 번째 줄',
        '[김철수] [오후 2:31] 답장',
      ].join('\n');

      const result = parse(input);
      expect(result.messages).toHaveLength(2);
      expect(result.messages[0].content).toBe('첫 번째 줄\n두 번째 줄\n세 번째 줄');
      expect(result.messages[1].content).toBe('답장');
    });
  });

  describe('parse - 시스템 메시지', () => {
    test('시스템 메시지를 일반 메시지와 구분한다', () => {
      const input = [
        '테스트 님과 카카오톡 대화',
        '--------------- 2024년 3월 15일 금요일 ---------------',
        '[홍길동] [오후 2:30] 안녕',
        '홍길동 님이 들어왔습니다.',
        '[김철수] [오후 2:31] 반가워',
      ].join('\n');

      const result = parse(input);
      const systemMsgs = result.messages.filter((m) => m.isSystemMessage);
      const normalMsgs = result.messages.filter((m) => !m.isSystemMessage);
      expect(systemMsgs.length).toBeGreaterThanOrEqual(1);
      expect(normalMsgs).toHaveLength(2);
    });
  });

  describe('parse - 오류 처리', () => {
    test('빈 파일이면 EmptyFileError를 던진다', () => {
      expect(() => parse('')).toThrow(EmptyFileError);
      expect(() => parse('   ')).toThrow(EmptyFileError);
    });

    test('카카오톡 형식이 아니면 InvalidFormatError를 던진다', () => {
      expect(() => parse('이것은 카카오톡 파일이 아닙니다\n그냥 텍스트입니다')).toThrow(InvalidFormatError);
    });
  });

  describe('convertTo24Hour', () => {
    test('오전 12시 → 0시', () => {
      expect(convertTo24Hour('오전', 12, 0)).toEqual({ hour: 0, minute: 0 });
    });
    test('오전 9시 → 9시', () => {
      expect(convertTo24Hour('오전', 9, 30)).toEqual({ hour: 9, minute: 30 });
    });
    test('오후 12시 → 12시', () => {
      expect(convertTo24Hour('오후', 12, 0)).toEqual({ hour: 12, minute: 0 });
    });
    test('오후 1시 → 13시', () => {
      expect(convertTo24Hour('오후', 1, 0)).toEqual({ hour: 13, minute: 0 });
    });
  });

  describe('isSystemMessageContent', () => {
    test('사진은 시스템 메시지로 판별', () => {
      expect(isSystemMessageContent('사진')).toBe(true);
    });
    test('이모티콘은 시스템 메시지로 판별', () => {
      expect(isSystemMessageContent('이모티콘')).toBe(true);
    });
    test('일반 텍스트는 시스템 메시지가 아님', () => {
      expect(isSystemMessageContent('안녕하세요')).toBe(false);
    });
  });
});
