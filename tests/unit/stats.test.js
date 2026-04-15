const {
  calculateStats,
  findSessions,
  findGapPeriods,
  calculateFirstContactRatio,
} = require('../../server/lib/stats');

// --- 헬퍼 ---

function makeMsg(sender, timestamp, content = '안녕', isSystemMessage = false) {
  return {
    sender,
    timestamp: new Date(timestamp),
    content,
    isSystemMessage,
  };
}

function makeParseResult(messages, participants = null) {
  const nonSystem = messages.filter((m) => !m.isSystemMessage);
  const pSet = new Set();
  for (const m of nonSystem) {
    if (m.sender) pSet.add(m.sender);
  }
  const p = participants || Array.from(pSet);
  return {
    messages,
    participants: p,
    chatRoomName: '테스트 채팅방',
    period:
      nonSystem.length > 0
        ? { start: nonSystem[0].timestamp, end: nonSystem[nonSystem.length - 1].timestamp }
        : { start: new Date(0), end: new Date(0) },
  };
}

// --- findSessions ---

describe('findSessions', () => {
  test('빈 메시지 목록 → 빈 세션 배열', () => {
    expect(findSessions([])).toEqual([]);
  });

  test('단일 메시지 → 세션 1개', () => {
    const msgs = [makeMsg('A', '2024-01-01T10:00:00')];
    const sessions = findSessions(msgs);
    expect(sessions).toHaveLength(1);
    expect(sessions[0].messageCount).toBe(1);
    expect(sessions[0].initiator).toBe('A');
  });

  test('29분 간격 → 같은 세션', () => {
    const msgs = [
      makeMsg('A', '2024-01-01T10:00:00'),
      makeMsg('B', '2024-01-01T10:29:00'),
    ];
    const sessions = findSessions(msgs);
    expect(sessions).toHaveLength(1);
    expect(sessions[0].messageCount).toBe(2);
  });

  test('정확히 30분 간격 → 세션 분리', () => {
    const msgs = [
      makeMsg('A', '2024-01-01T10:00:00'),
      makeMsg('B', '2024-01-01T10:30:00'),
    ];
    const sessions = findSessions(msgs);
    expect(sessions).toHaveLength(2);
    expect(sessions[0].messageCount).toBe(1);
    expect(sessions[1].messageCount).toBe(1);
  });

  test('31분 간격 → 세션 분리', () => {
    const msgs = [
      makeMsg('A', '2024-01-01T10:00:00'),
      makeMsg('B', '2024-01-01T10:31:00'),
    ];
    const sessions = findSessions(msgs);
    expect(sessions).toHaveLength(2);
  });

  test('시스템 메시지는 세션 계산에서 제외', () => {
    const msgs = [
      makeMsg('A', '2024-01-01T10:00:00'),
      makeMsg('', '2024-01-01T10:15:00', '님이 들어왔습니다', true),
      makeMsg('B', '2024-01-01T10:20:00'),
    ];
    const sessions = findSessions(msgs);
    expect(sessions).toHaveLength(1);
    expect(sessions[0].messageCount).toBe(2);
  });

  test('여러 세션 분리', () => {
    const msgs = [
      makeMsg('A', '2024-01-01T10:00:00'),
      makeMsg('B', '2024-01-01T10:10:00'),
      // 1시간 공백
      makeMsg('B', '2024-01-01T11:10:00'),
      makeMsg('A', '2024-01-01T11:20:00'),
      // 2시간 공백
      makeMsg('A', '2024-01-01T13:20:00'),
    ];
    const sessions = findSessions(msgs);
    expect(sessions).toHaveLength(3);
    expect(sessions[0].initiator).toBe('A');
    expect(sessions[1].initiator).toBe('B');
    expect(sessions[2].initiator).toBe('A');
  });
});

// --- findGapPeriods ---

describe('findGapPeriods', () => {
  test('빈 메시지 목록 → 빈 공백 배열', () => {
    expect(findGapPeriods([])).toEqual([]);
  });

  test('단일 메시지 → 빈 공백 배열', () => {
    expect(findGapPeriods([makeMsg('A', '2024-01-01T10:00:00')])).toEqual([]);
  });

  test('47시간 간격 → 공백 없음', () => {
    const msgs = [
      makeMsg('A', '2024-01-01T10:00:00'),
      makeMsg('B', '2024-01-03T09:00:00'),
    ];
    expect(findGapPeriods(msgs)).toEqual([]);
  });

  test('정확히 48시간 간격 → 공백 탐지', () => {
    const msgs = [
      makeMsg('A', '2024-01-01T10:00:00'),
      makeMsg('B', '2024-01-03T10:00:00'),
    ];
    const gaps = findGapPeriods(msgs);
    expect(gaps).toHaveLength(1);
    expect(gaps[0].durationDays).toBe(2);
  });

  test('72시간 간격 → 공백 탐지, durationDays = 3', () => {
    const msgs = [
      makeMsg('A', '2024-01-01T10:00:00'),
      makeMsg('B', '2024-01-04T10:00:00'),
    ];
    const gaps = findGapPeriods(msgs);
    expect(gaps).toHaveLength(1);
    expect(gaps[0].durationDays).toBe(3);
  });

  test('시스템 메시지는 공백 계산에서 제외', () => {
    const msgs = [
      makeMsg('A', '2024-01-01T10:00:00'),
      makeMsg('', '2024-01-02T10:00:00', '시스템', true),
      makeMsg('B', '2024-01-01T20:00:00'),
    ];
    const gaps = findGapPeriods(msgs);
    expect(gaps).toEqual([]);
  });

  test('여러 공백 기간 → 시간순 정렬', () => {
    const msgs = [
      makeMsg('A', '2024-01-01T10:00:00'),
      // 3일 공백
      makeMsg('B', '2024-01-04T10:00:00'),
      makeMsg('A', '2024-01-04T10:05:00'),
      // 5일 공백
      makeMsg('B', '2024-01-09T10:05:00'),
    ];
    const gaps = findGapPeriods(msgs);
    expect(gaps).toHaveLength(2);
    expect(gaps[0].startDate.getTime()).toBeLessThan(gaps[1].startDate.getTime());
  });
});

// --- calculateFirstContactRatio ---

describe('calculateFirstContactRatio', () => {
  test('세션 0개 → 빈 객체', () => {
    expect(calculateFirstContactRatio([])).toEqual({});
  });

  test('단일 세션 → 해당 발화자 100%', () => {
    const sessions = [
      { startTime: new Date(), endTime: new Date(), messageCount: 5, initiator: 'A' },
    ];
    const ratio = calculateFirstContactRatio(sessions);
    expect(ratio).toEqual({ A: 100 });
  });

  test('두 발화자 동일 비율', () => {
    const sessions = [
      { startTime: new Date(), endTime: new Date(), messageCount: 3, initiator: 'A' },
      { startTime: new Date(), endTime: new Date(), messageCount: 3, initiator: 'B' },
    ];
    const ratio = calculateFirstContactRatio(sessions);
    expect(ratio.A + ratio.B).toBe(100);
    expect(ratio.A).toBe(50);
    expect(ratio.B).toBe(50);
  });

  test('비율 합은 항상 100', () => {
    const sessions = [
      { startTime: new Date(), endTime: new Date(), messageCount: 1, initiator: 'A' },
      { startTime: new Date(), endTime: new Date(), messageCount: 1, initiator: 'A' },
      { startTime: new Date(), endTime: new Date(), messageCount: 1, initiator: 'B' },
    ];
    const ratio = calculateFirstContactRatio(sessions);
    const sum = Object.values(ratio).reduce((a, b) => a + b, 0);
    expect(sum).toBe(100);
  });
});

// --- calculateStats ---

describe('calculateStats', () => {
  test('빈 메시지 목록', () => {
    const result = calculateStats(makeParseResult([]));
    expect(result.totalMessages).toBe(0);
    expect(result.sessions).toEqual([]);
    expect(result.gaps).toEqual([]);
  });

  test('시스템 메시지는 totalMessages에서 제외', () => {
    const msgs = [
      makeMsg('A', '2024-01-01T10:00:00'),
      makeMsg('', '2024-01-01T10:01:00', '시스템', true),
      makeMsg('B', '2024-01-01T10:02:00'),
    ];
    const result = calculateStats(makeParseResult(msgs));
    expect(result.totalMessages).toBe(2);
  });

  test('발화자별 메시지 수 및 비율 계산', () => {
    const msgs = [
      makeMsg('A', '2024-01-01T10:00:00'),
      makeMsg('A', '2024-01-01T10:01:00'),
      makeMsg('B', '2024-01-01T10:02:00'),
    ];
    const result = calculateStats(makeParseResult(msgs));
    expect(result.messagesPerParticipant).toEqual({ A: 2, B: 1 });
    expect(result.speakRatio.A + result.speakRatio.B).toBe(100);
  });

  test('대화 기간 계산', () => {
    const msgs = [
      makeMsg('A', '2024-01-01T10:00:00'),
      makeMsg('B', '2024-01-03T10:00:00'),
    ];
    const result = calculateStats(makeParseResult(msgs));
    expect(result.periodDays).toBe(2);
  });

  test('같은 날 대화 → periodDays = 1', () => {
    const msgs = [
      makeMsg('A', '2024-01-01T10:00:00'),
      makeMsg('B', '2024-01-01T15:00:00'),
    ];
    const result = calculateStats(makeParseResult(msgs));
    expect(result.periodDays).toBe(1);
  });

  test('단일 발화자만 있는 경우', () => {
    const msgs = [
      makeMsg('A', '2024-01-01T10:00:00'),
      makeMsg('A', '2024-01-01T10:05:00'),
      makeMsg('A', '2024-01-01T10:10:00'),
    ];
    const result = calculateStats(makeParseResult(msgs));
    expect(result.totalMessages).toBe(3);
    expect(result.messagesPerParticipant).toEqual({ A: 3 });
    expect(result.speakRatio).toEqual({ A: 100 });
    expect(result.firstContactRatio).toEqual({ A: 100 });
  });
});
