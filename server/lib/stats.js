/**
 * 통계 계산 모듈
 *
 * 대화_데이터(ParseResult)에서 수치 통계를 계산한다.
 * Claude API 호출 없이 로컬에서 처리 가능한 지표들을 담당한다.
 *
 * Stats { totalMessages, periodDays, messagesPerParticipant, speakRatio, firstContactRatio, sessions, gaps }
 */

const SESSION_GAP_MINUTES = 30;
const GAP_PERIOD_HOURS = 48;

/**
 * 두 타임스탬프 사이의 차이를 분 단위로 반환
 * @param {Date} a
 * @param {Date} b
 * @returns {number} 분 단위 차이 (절대값)
 */
function diffMinutes(a, b) {
  return Math.abs(a.getTime() - b.getTime()) / (1000 * 60);
}

/**
 * 두 타임스탬프 사이의 차이를 시간 단위로 반환
 * @param {Date} a
 * @param {Date} b
 * @returns {number} 시간 단위 차이 (절대값)
 */
function diffHours(a, b) {
  return Math.abs(a.getTime() - b.getTime()) / (1000 * 60 * 60);
}

/**
 * 메시지 목록에서 대화 세션을 분리한다.
 * 세션: 30분 이상 공백 없이 이어지는 연속된 메시지 묶음
 *
 * @param {Array} messages - 시간순 정렬된 메시지 배열 (시스템 메시지 포함 가능)
 * @param {number} [gapMinutes=30] - 세션 분리 기준 (분)
 * @returns {Array<Session>} 세션 배열
 */
function findSessions(messages, gapMinutes = SESSION_GAP_MINUTES) {
  // 시스템 메시지 제외
  const filtered = messages.filter((m) => !m.isSystemMessage);
  if (filtered.length === 0) return [];

  const sessions = [];
  let sessionStart = 0;

  for (let i = 1; i < filtered.length; i++) {
    const gap = diffMinutes(filtered[i].timestamp, filtered[i - 1].timestamp);
    if (gap >= gapMinutes) {
      // 이전 세션 종료, 새 세션 시작
      sessions.push({
        startTime: filtered[sessionStart].timestamp,
        endTime: filtered[i - 1].timestamp,
        messageCount: i - sessionStart,
        initiator: filtered[sessionStart].sender,
      });
      sessionStart = i;
    }
  }

  // 마지막 세션
  sessions.push({
    startTime: filtered[sessionStart].timestamp,
    endTime: filtered[filtered.length - 1].timestamp,
    messageCount: filtered.length - sessionStart,
    initiator: filtered[sessionStart].sender,
  });

  return sessions;
}

/**
 * 48시간 이상 공백 기간을 탐지한다.
 *
 * @param {Array} messages - 시간순 정렬된 메시지 배열
 * @param {number} [gapHours=48] - 공백 기간 기준 (시간)
 * @returns {Array<GapPeriod>} 공백 기간 배열 (시간순 정렬)
 */
function findGapPeriods(messages, gapHours = GAP_PERIOD_HOURS) {
  const filtered = messages.filter((m) => !m.isSystemMessage);
  if (filtered.length < 2) return [];

  const gaps = [];

  for (let i = 1; i < filtered.length; i++) {
    const hours = diffHours(filtered[i].timestamp, filtered[i - 1].timestamp);
    if (hours >= gapHours) {
      const startDate = filtered[i - 1].timestamp;
      const endDate = filtered[i].timestamp;
      const durationDays = Math.round(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      gaps.push({
        startDate,
        endDate,
        durationDays: Math.max(durationDays, 1),
      });
    }
  }

  return gaps;
}

/**
 * 세션별 먼저 연락한 발화자 비율을 계산한다.
 *
 * @param {Array<Session>} sessions - 세션 배열
 * @returns {Record<string, number>} 발화자별 먼저 연락 비율 (%)
 */
function calculateFirstContactRatio(sessions) {
  if (sessions.length === 0) {
    return {};
  }

  // 발화자별 먼저 연락 횟수 집계
  const counts = {};
  for (const session of sessions) {
    counts[session.initiator] = (counts[session.initiator] || 0) + 1;
  }

  // 비율 계산
  const total = sessions.length;
  const ratio = {};
  for (const [participant, count] of Object.entries(counts)) {
    ratio[participant] = Math.round((count / total) * 100);
  }

  // 반올림으로 인해 합이 100이 안 될 수 있으므로 보정
  const sum = Object.values(ratio).reduce((a, b) => a + b, 0);
  if (sum !== 100 && Object.keys(ratio).length > 0) {
    // 가장 큰 비율을 가진 발화자에게 차이를 보정
    const maxKey = Object.entries(ratio).sort((a, b) => b[1] - a[1])[0][0];
    ratio[maxKey] += 100 - sum;
  }

  return ratio;
}

/**
 * ParseResult에서 전체 통계를 계산한다.
 *
 * @param {object} parseResult - { messages, participants, chatRoomName, period }
 * @returns {Stats} 통계 결과
 */
function calculateStats(parseResult) {
  const { messages, participants, period } = parseResult;

  // 시스템 메시지 제외한 메시지
  const nonSystemMessages = messages.filter((m) => !m.isSystemMessage);

  // 총 메시지 수 (시스템 메시지 제외)
  const totalMessages = nonSystemMessages.length;

  // 대화 기간 (일 단위)
  let periodDays = 0;
  if (period && period.start && period.end) {
    const diffMs = period.end.getTime() - period.start.getTime();
    periodDays = Math.max(Math.ceil(diffMs / (1000 * 60 * 60 * 24)), 0);
    // 같은 날이면 1일로 처리
    if (periodDays === 0 && totalMessages > 0) {
      periodDays = 1;
    }
  }

  // 발화자별 메시지 수
  const messagesPerParticipant = {};
  for (const p of participants) {
    messagesPerParticipant[p] = 0;
  }
  for (const msg of nonSystemMessages) {
    if (msg.sender) {
      messagesPerParticipant[msg.sender] =
        (messagesPerParticipant[msg.sender] || 0) + 1;
    }
  }

  // 발화 비율 (%)
  const speakRatio = {};
  if (totalMessages > 0) {
    for (const [participant, count] of Object.entries(messagesPerParticipant)) {
      speakRatio[participant] = Math.round((count / totalMessages) * 100);
    }
    // 반올림 보정
    const sum = Object.values(speakRatio).reduce((a, b) => a + b, 0);
    if (sum !== 100 && Object.keys(speakRatio).length > 0) {
      const maxKey = Object.entries(speakRatio).sort((a, b) => b[1] - a[1])[0][0];
      speakRatio[maxKey] += 100 - sum;
    }
  } else {
    for (const p of participants) {
      speakRatio[p] = 0;
    }
  }

  // 세션 분리
  const sessions = findSessions(messages);

  // 공백 기간 탐지
  const gaps = findGapPeriods(messages);

  // 먼저 연락 비율
  const firstContactRatio = calculateFirstContactRatio(sessions);

  return {
    totalMessages,
    periodDays,
    messagesPerParticipant,
    speakRatio,
    firstContactRatio,
    sessions,
    gaps,
  };
}

module.exports = {
  calculateStats,
  findSessions,
  findGapPeriods,
  calculateFirstContactRatio,
  SESSION_GAP_MINUTES,
  GAP_PERIOD_HOURS,
};
