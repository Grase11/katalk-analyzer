/**
 * 분석 엔진
 *
 * 통계 데이터와 대화 내용을 Claude API에 전달하여 AI 분석 결과를 생성한다.
 *
 * AnalysisResult {
 *   summary, firstContact, topicDistribution,
 *   toneMine, toneOther, aiInsights, whoAmI,
 *   relationshipScore, funPoints, gapAnalysis
 * }
 */

const { callClaude } = require('./claude-client');
const { AnalysisError } = require('../errors');

const RECENT_MESSAGES_COUNT = 500;
const EARLY_MESSAGES_COUNT = 100;

/**
 * 대화 메시지를 샘플링한다.
 * 최근 500개 + 초반 100개 메시지를 추출한다.
 * 중복이 발생하면 제거한다.
 *
 * @param {Array} messages - 전체 메시지 배열 (시스템 메시지 포함)
 * @returns {Array} 샘플링된 메시지 배열
 */
function sampleMessages(messages) {
  const nonSystem = messages.filter((m) => !m.isSystemMessage);

  if (nonSystem.length <= RECENT_MESSAGES_COUNT + EARLY_MESSAGES_COUNT) {
    return nonSystem;
  }

  const early = nonSystem.slice(0, EARLY_MESSAGES_COUNT);
  const recent = nonSystem.slice(-RECENT_MESSAGES_COUNT);

  // 중복 제거 (초반과 최근이 겹칠 수 있음)
  const seen = new Set();
  const result = [];

  for (const msg of early) {
    const key = `${msg.sender}|${msg.timestamp.getTime()}|${msg.content}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(msg);
    }
  }

  for (const msg of recent) {
    const key = `${msg.sender}|${msg.timestamp.getTime()}|${msg.content}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(msg);
    }
  }

  return result;
}

/**
 * 메시지 배열을 텍스트 형식으로 변환한다.
 *
 * @param {Array} messages - 메시지 배열
 * @returns {string} 텍스트 형식의 대화 내용
 */
function formatMessages(messages) {
  return messages
    .map((m) => {
      const d = m.timestamp;
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      return `[${dateStr} ${timeStr}] ${m.sender}: ${m.content}`;
    })
    .join('\n');
}

/**
 * 공백 기간 데이터를 텍스트로 포맷한다.
 *
 * @param {Array} gaps - GapPeriod 배열
 * @returns {string} 포맷된 공백 기간 텍스트
 */
function formatGaps(gaps) {
  if (gaps.length === 0) return '공백 기간 없음';

  return gaps
    .map((g, i) => {
      const start = g.startDate instanceof Date
        ? g.startDate.toISOString().split('T')[0]
        : g.startDate;
      const end = g.endDate instanceof Date
        ? g.endDate.toISOString().split('T')[0]
        : g.endDate;
      return `${i + 1}. ${start} ~ ${end} (${g.durationDays}일)`;
    })
    .join('\n');
}

/**
 * 통계 데이터와 대화 샘플로 Claude 프롬프트를 구성한다.
 *
 * @param {object} parseResult - ParseResult
 * @param {object} stats - Stats
 * @returns {string} Claude에 전달할 프롬프트
 */
function buildPrompt(parseResult, stats) {
  const { messages, participants, chatRoomName, period } = parseResult;
  const sampled = sampleMessages(messages);
  const conversationText = formatMessages(sampled);
  const gapsText = formatGaps(stats.gaps);

  const participantList = participants.join(', ');

  const periodStart = period.start instanceof Date
    ? period.start.toISOString().split('T')[0]
    : period.start;
  const periodEnd = period.end instanceof Date
    ? period.end.toISOString().split('T')[0]
    : period.end;

  const speakRatioText = Object.entries(stats.speakRatio)
    .map(([name, ratio]) => `${name}: ${ratio}%`)
    .join(', ');

  const firstContactText = Object.entries(stats.firstContactRatio)
    .map(([name, ratio]) => `${name}: ${ratio}%`)
    .join(', ');

  const messagesPerText = Object.entries(stats.messagesPerParticipant)
    .map(([name, count]) => `${name}: ${count}개`)
    .join(', ');

  const prompt = `당신은 카카오톡 대화를 분석하는 관계 분석 전문가입니다.
주어진 대화 데이터와 통계를 바탕으로 아래 10개 항목을 분석해주세요.
반드시 JSON 형식으로만 응답해주세요. JSON 외의 텍스트는 포함하지 마세요.

## 채팅방 정보
- 채팅방: ${chatRoomName}
- 참여자: ${participantList}
- 대화 기간: ${periodStart} ~ ${periodEnd} (${stats.periodDays}일)
- 총 메시지 수: ${stats.totalMessages}개

## 통계 데이터
- 발화자별 메시지 수: ${messagesPerText}
- 발화 비율: ${speakRatioText}
- 먼저 연락 비율: ${firstContactText}
- 총 대화 세션 수: ${stats.sessions.length}개
- 공백 기간:
${gapsText}

## 분석 항목 및 JSON 구조

다음 JSON 구조에 맞춰 응답해주세요:

{
  "summary": {
    "totalMessages": ${stats.totalMessages},
    "periodDays": ${stats.periodDays},
    "relationshipType": "관계 유형 추정 (절친/친구/지인/연인/썸/동료 등)",
    "relationshipTemperature": "0~100 정수 (관계 온도)"
  },
  "firstContact": {
    "ratios": { ${participants.map((p) => `"${p}": "먼저 연락 비율 (%)`).join(', ')} },
    "totalSessions": ${stats.sessions.length}
  },
  "topicDistribution": {
    "topics": [
      { "name": "주제명", "percentage": "비율 (정수, 모든 주제 합 = 100)" }
    ]
  },
  "toneMine": {
    "warmth": "0~100 (따뜻함)",
    "consideration": "0~100 (배려심)",
    "humor": "0~100 (유머감각)",
    "activeness": "0~100 (적극성)",
    "keywords": ["키워드1", "키워드2", "키워드3"]
  },
  "toneOther": {
    "warmth": "0~100 (따뜻함)",
    "consideration": "0~100 (배려심)",
    "humor": "0~100 (유머감각)",
    "activeness": "0~100 (적극성)",
    "keywords": ["키워드1", "키워드2", "키워드3"]
  },
  "aiInsights": [
    { "insight": "인사이트 문장", "evidence": "근거가 되는 대화 패턴 요약" }
  ],
  "whoAmI": {
    "description": "상대방 입장에서 본 사용자 서술 (200자 이상)",
    "evidences": ["근거1", "근거2"]
  },
  "relationshipScore": {
    "score": "0~100 정수",
    "label": "유형 라벨 (절친/친구/지인/연인/썸 등)",
    "description": "관계에 대한 한 줄 설명"
  },
  "funPoints": [
    { "title": "제목", "description": "설명", "excerpt": "실제 대화 발췌" }
  ],
  "gapAnalysis": {
    "gaps": [
      {
        "startDate": "YYYY-MM-DD",
        "endDate": "YYYY-MM-DD",
        "durationDays": "일수",
        "beforePattern": "공백 전 대화 패턴",
        "afterPattern": "공백 후 대화 패턴"
      }
    ]
  }
}

## 분석 지침

1. **핵심 지표 요약 (summary)**: totalMessages와 periodDays는 위 통계 데이터를 그대로 사용하세요. relationshipType은 대화 내용과 패턴을 종합하여 추정하세요. relationshipTemperature는 0~100 정수로 관계 친밀도를 수치화하세요.

2. **먼저 연락 비율 (firstContact)**: 위 통계 데이터의 먼저 연락 비율을 참고하되, 대화 내용을 바탕으로 ratios를 채워주세요. totalSessions는 위 통계 데이터를 사용하세요.

3. **대화 주제 분포 (topicDistribution)**: 대화 내용을 분석하여 주제별 비율을 산출하세요. 주제는 5~8개로 분류하고, 모든 비율의 합은 100이어야 합니다.

4. **말투 분석 - 나 (toneMine)**: 첫 번째 참여자(${participants[0] || '나'})의 메시지를 분석하여 따뜻함/배려심/유머감각/적극성을 0~100으로 평가하세요. 키워드 태그는 3개 이상 생성하세요.

5. **말투 분석 - 상대방 (toneOther)**: ${participants.length > 1 ? `두 번째 참여자(${participants[1]})` : '상대방'}의 메시지를 분석하여 동일한 항목을 평가하세요.

6. **AI 인사이트 (aiInsights)**: 대화 패턴에서 발견된 관계 역학을 3개 이상의 자연어 문장으로 서술하세요. 각 인사이트에 근거가 되는 대화 패턴 요약을 함께 제공하세요.

7. **Who Am I (whoAmI)**: 상대방의 입장에서 사용자(${participants[0] || '나'})를 어떻게 느끼는지 200자 이상의 서술형 텍스트로 작성하세요. 대화 내용에서 추출한 구체적 근거를 포함하세요.

8. **관계 종합 점수 (relationshipScore)**: 관계 온도를 0~100 정수로 산출하고, 유형 라벨(절친/친구/지인/연인/썸 등)을 부여하세요. summary의 relationshipTemperature와 동일한 값을 사용하세요.

9. **재밌는 포인트 (funPoints)**: 대화에서 발견된 독특한 패턴, 반복 표현, 재미있는 에피소드를 2개 이상 추출하세요. 실제 대화 발췌를 포함하세요.

10. **공백 기간 분석 (gapAnalysis)**: 위 통계 데이터의 공백 기간을 참고하여 각 공백 기간 전후의 대화 패턴 변화를 서술하세요. 공백 기간이 없으면 gaps를 빈 배열로 반환하세요.

## 대화 데이터 (샘플)

${conversationText}`;

  return prompt;
}

/**
 * Claude 응답을 AnalysisResult JSON으로 파싱한다.
 *
 * @param {string} response - Claude의 텍스트 응답
 * @returns {object} AnalysisResult
 * @throws {AnalysisError} JSON 파싱 실패 시
 */
function parseClaudeResponse(response) {
  try {
    // JSON 블록 추출 (```json ... ``` 또는 순수 JSON)
    let jsonStr = response.trim();

    // 마크다운 코드 블록 제거
    const codeBlockMatch = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim();
    }

    // JSON 객체 시작/끝 찾기
    const firstBrace = jsonStr.indexOf('{');
    const lastBrace = jsonStr.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      jsonStr = jsonStr.slice(firstBrace, lastBrace + 1);
    }

    const result = JSON.parse(jsonStr);

    // 필수 필드 검증
    validateAnalysisResult(result);

    return result;
  } catch (err) {
    if (err instanceof AnalysisError) {
      throw err;
    }
    throw new AnalysisError(
      '분석 결과를 처리하는 중 오류가 발생했습니다',
      'ANALYSIS_PARSE_ERROR'
    );
  }
}

/**
 * AnalysisResult의 필수 필드를 검증한다.
 *
 * @param {object} result - 파싱된 결과
 * @throws {AnalysisError} 필수 필드 누락 시
 */
function validateAnalysisResult(result) {
  const requiredTopLevel = [
    'summary',
    'firstContact',
    'topicDistribution',
    'toneMine',
    'toneOther',
    'aiInsights',
    'whoAmI',
    'relationshipScore',
    'funPoints',
    'gapAnalysis',
  ];

  for (const field of requiredTopLevel) {
    if (result[field] === undefined || result[field] === null) {
      throw new AnalysisError(
        `분석 결과에 필수 항목(${field})이 누락되었습니다`,
        'ANALYSIS_MISSING_FIELD'
      );
    }
  }

  // summary 필드 검증
  if (result.summary) {
    const summaryFields = ['totalMessages', 'periodDays', 'relationshipType', 'relationshipTemperature'];
    for (const field of summaryFields) {
      if (result.summary[field] === undefined || result.summary[field] === null) {
        throw new AnalysisError(
          `분석 결과의 summary에 필수 항목(${field})이 누락되었습니다`,
          'ANALYSIS_MISSING_FIELD'
        );
      }
    }
  }

  // relationshipScore 필드 검증
  if (result.relationshipScore) {
    const scoreFields = ['score', 'label', 'description'];
    for (const field of scoreFields) {
      if (result.relationshipScore[field] === undefined || result.relationshipScore[field] === null) {
        throw new AnalysisError(
          `분석 결과의 relationshipScore에 필수 항목(${field})이 누락되었습니다`,
          'ANALYSIS_MISSING_FIELD'
        );
      }
    }
  }

  // aiInsights 배열 검증
  if (!Array.isArray(result.aiInsights) || result.aiInsights.length < 1) {
    throw new AnalysisError(
      '분석 결과의 aiInsights는 1개 이상이어야 합니다',
      'ANALYSIS_MISSING_FIELD'
    );
  }

  // funPoints 배열 검증
  if (!Array.isArray(result.funPoints) || result.funPoints.length < 1) {
    throw new AnalysisError(
      '분석 결과의 funPoints는 1개 이상이어야 합니다',
      'ANALYSIS_MISSING_FIELD'
    );
  }
}

/**
 * ParseResult와 Stats를 받아 Claude API를 호출하고 AnalysisResult를 반환한다.
 *
 * @param {object} parseResult - ParseResult
 * @param {object} stats - Stats
 * @returns {Promise<object>} AnalysisResult
 * @throws {AnalysisError} 분석 실패 시
 */
async function analyze(parseResult, stats) {
  const prompt = buildPrompt(parseResult, stats);
  const response = await callClaude(prompt);
  const result = parseClaudeResponse(response);
  return result;
}

module.exports = {
  analyze,
  buildPrompt,
  parseClaudeResponse,
  sampleMessages,
  formatMessages,
  formatGaps,
  validateAnalysisResult,
  RECENT_MESSAGES_COUNT,
  EARLY_MESSAGES_COUNT,
};
