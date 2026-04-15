/**
 * 카카오톡 대화 내보내기 파서
 *
 * 카카오톡 txt 내보내기 파일을 구조화된 ParseResult로 변환한다.
 *
 * ParseResult { messages, participants, chatRoomName, period }
 */

const { InvalidFormatError, EmptyFileError } = require('../errors');

// --- 정규식 패턴 ---

// 채팅방 헤더: "김철수, 홍길동 님과 카카오톡 대화" 또는 "그룹채팅방 님과 카카오톡 대화"
const CHAT_ROOM_HEADER_RE = /^(.+) 님과 카카오톡 대화\s*$/;

// 저장 날짜 라인: "저장한 날짜 : 2024년 3월 15일 오후 5:30"
const SAVE_DATE_RE = /^저장한 날짜\s*:/;

// 날짜 헤더: "--------------- 2024년 3월 15일 금요일 ---------------"
const DATE_HEADER_RE =
  /^-+ (\d{4})년 (\d{1,2})월 (\d{1,2})일 \S+요일 -+$/;

// 메시지 라인: "[발화자] [오전/오후 H:MM] 메시지 내용"
// 발화자 이름에는 대괄호가 포함되지 않는다고 가정
const MESSAGE_RE =
  /^\[([^\]]+)\] \[(오전|오후) (\d{1,2}):(\d{2})\] (.*)$/;

// 시스템 메시지 키워드
const SYSTEM_KEYWORDS = [
  '님이 들어왔습니다',
  '님이 나갔습니다',
  '님을 초대했습니다',
  '님이 나갔습니다.',
  '님이 들어왔습니다.',
  '님을 초대했습니다.',
  '나갔습니다',
  '들어왔습니다',
  '채팅방 관리자가',
  '님이 메시지를 가렸습니다',
];

// 시스템 메시지로 간주되는 메시지 내용 패턴
const SYSTEM_CONTENT_PATTERNS = ['사진', '이모티콘', '동영상', '음성메시지', '파일'];

/**
 * 오전/오후 시간을 24시간 형식으로 변환
 * @param {string} period - '오전' 또는 '오후'
 * @param {number} hour - 1~12 시
 * @param {number} minute - 0~59 분
 * @returns {object} { hour, minute } 24시간 형식
 */
function convertTo24Hour(period, hour, minute) {
  let h = hour;
  if (period === '오전') {
    // 오전 12시 = 0시
    if (h === 12) h = 0;
  } else {
    // 오후 12시 = 12시, 오후 1시 = 13시
    if (h !== 12) h += 12;
  }
  return { hour: h, minute };
}

/**
 * 라인이 시스템 메시지인지 판별
 * @param {string} line - 원본 라인 (메시지 라인이 아닌 경우)
 * @returns {boolean}
 */
function isSystemMessageLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return false;
  return SYSTEM_KEYWORDS.some((kw) => trimmed.includes(kw));
}

/**
 * 메시지 내용이 시스템 메시지 유형인지 판별
 * @param {string} content - 메시지 내용
 * @returns {boolean}
 */
function isSystemMessageContent(content) {
  const trimmed = content.trim();
  return SYSTEM_CONTENT_PATTERNS.some((p) => trimmed === p);
}


/**
 * 카카오톡 내보내기 txt 파일을 파싱한다.
 *
 * @param {string} fileContent - txt 파일 전체 내용
 * @returns {ParseResult} { messages, participants, chatRoomName, period }
 * @throws {EmptyFileError} 파일 내용이 비어있을 때
 * @throws {InvalidFormatError} 카카오톡 형식이 아닐 때
 */
function parse(fileContent) {
  if (!fileContent || !fileContent.trim()) {
    throw new EmptyFileError();
  }

  const lines = fileContent.split(/\r?\n/);

  // 1단계: 채팅방 이름 추출 (첫 번째 줄)
  let chatRoomName = '';
  let startIdx = 0;

  const headerMatch = lines[0] && lines[0].match(CHAT_ROOM_HEADER_RE);
  if (headerMatch) {
    chatRoomName = headerMatch[1].trim();
    startIdx = 1;
  }

  // 저장 날짜 라인 건너뛰기
  if (lines[startIdx] && SAVE_DATE_RE.test(lines[startIdx])) {
    startIdx++;
  }

  // 2단계: 라인별 파싱
  let currentDate = null; // { year, month, day }
  const messages = [];
  let hasDateHeader = false;
  let hasMessage = false;

  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i];

    // 빈 줄 처리: 현재 메시지에 빈 줄 추가
    if (line.trim() === '') {
      if (messages.length > 0) {
        messages[messages.length - 1].content += '\n';
      }
      continue;
    }

    // 날짜 헤더 확인
    const dateMatch = line.match(DATE_HEADER_RE);
    if (dateMatch) {
      currentDate = {
        year: parseInt(dateMatch[1], 10),
        month: parseInt(dateMatch[2], 10),
        day: parseInt(dateMatch[3], 10),
      };
      hasDateHeader = true;
      continue;
    }

    // 메시지 라인 확인
    const msgMatch = line.match(MESSAGE_RE);
    if (msgMatch) {
      if (!currentDate) {
        throw new InvalidFormatError();
      }

      const sender = msgMatch[1];
      const period = msgMatch[2]; // 오전/오후
      const rawHour = parseInt(msgMatch[3], 10);
      const rawMinute = parseInt(msgMatch[4], 10);
      const content = msgMatch[5];

      const { hour, minute } = convertTo24Hour(period, rawHour, rawMinute);
      const timestamp = new Date(
        currentDate.year,
        currentDate.month - 1,
        currentDate.day,
        hour,
        minute
      );

      const isSystem = isSystemMessageContent(content);

      messages.push({
        sender,
        timestamp,
        content,
        isSystemMessage: isSystem,
      });
      hasMessage = true;
      continue;
    }

    // 시스템 메시지 라인 (대괄호 형식이 아닌 라인)
    if (isSystemMessageLine(line)) {
      if (!currentDate) {
        throw new InvalidFormatError();
      }
      // 시스템 메시지는 타임스탬프가 없으므로 현재 날짜의 0시로 설정
      const timestamp = new Date(
        currentDate.year,
        currentDate.month - 1,
        currentDate.day
      );
      messages.push({
        sender: '',
        timestamp,
        content: line.trim(),
        isSystemMessage: true,
      });
      continue;
    }

    // 위 패턴에 해당하지 않으면 이전 메시지의 여러 줄 내용
    if (messages.length > 0) {
      messages[messages.length - 1].content += '\n' + line;
    }
    // 메시지가 없는데 인식 불가 라인이면 무시 (헤더 이후 빈 줄 등)
  }

  // 유효성 검증
  if (!hasDateHeader && !hasMessage) {
    throw new InvalidFormatError();
  }

  // 3단계: participants 추출 (시스템 메시지가 아닌 메시지의 고유 발화자)
  const participantSet = new Set();
  for (const msg of messages) {
    if (!msg.isSystemMessage && msg.sender) {
      participantSet.add(msg.sender);
    }
  }
  const participants = Array.from(participantSet);

  // 4단계: period 추출
  const nonSystemMessages = messages.filter((m) => !m.isSystemMessage);
  let period;
  if (nonSystemMessages.length > 0) {
    period = {
      start: nonSystemMessages[0].timestamp,
      end: nonSystemMessages[nonSystemMessages.length - 1].timestamp,
    };
  } else if (messages.length > 0) {
    period = {
      start: messages[0].timestamp,
      end: messages[messages.length - 1].timestamp,
    };
  } else {
    // 날짜 헤더만 있고 메시지가 없는 경우
    period = { start: new Date(0), end: new Date(0) };
  }

  return {
    messages,
    participants,
    chatRoomName,
    period,
  };
}

module.exports = {
  parse,
  convertTo24Hour,
  isSystemMessageLine,
  isSystemMessageContent,
  // 정규식 패턴도 내보내기 (테스트용)
  DATE_HEADER_RE,
  MESSAGE_RE,
  CHAT_ROOM_HEADER_RE,
};
