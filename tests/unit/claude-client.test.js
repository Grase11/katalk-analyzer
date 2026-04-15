/**
 * AWS Bedrock Nova API 클라이언트 단위 테스트
 */

let mockSend;
let ClaudeAPIError;
let ClaudeTimeoutError;
let AnalysisError;
let callClaude;

// 각 테스트 전에 모듈을 새로 로드하여 환경변수 변경이 반영되도록 한다
beforeEach(() => {
  jest.resetModules();

  mockSend = jest.fn();

  // SDK 모킹: BedrockRuntimeClient 생성자가 send를 가진 객체를 반환
  jest.mock('@aws-sdk/client-bedrock-runtime', () => {
    return {
      BedrockRuntimeClient: jest.fn(() => ({
        send: mockSend,
      })),
      InvokeModelCommand: jest.fn((params) => params),
    };
  });

  const errors = require('../../server/errors');
  ClaudeAPIError = errors.ClaudeAPIError;
  ClaudeTimeoutError = errors.ClaudeTimeoutError;
  AnalysisError = errors.AnalysisError;

  process.env.AWS_REGION = 'us-east-1';

  callClaude = require('../../server/lib/claude-client').callClaude;
});

afterEach(() => {
  delete process.env.AWS_REGION;
  jest.restoreAllMocks();
});

// Nova 응답 헬퍼
function novaResponse(text) {
  return {
    body: new TextEncoder().encode(JSON.stringify({
      output: {
        message: {
          content: [{ text }],
        },
      },
    })),
  };
}

describe('bedrock-nova-client', () => {
  describe('callClaude', () => {
    it('프롬프트를 전달하고 텍스트 응답을 반환한다', async () => {
      mockSend.mockResolvedValue(novaResponse('분석 결과입니다.'));

      const result = await callClaude('테스트 프롬프트');

      expect(result).toBe('분석 결과입니다.');
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          modelId: 'amazon.nova-pro-v1:0',
          contentType: 'application/json',
        })
      );
    });

    it('응답에 text가 없으면 ClaudeAPIError를 던진다', async () => {
      mockSend.mockResolvedValue({
        body: new TextEncoder().encode(JSON.stringify({
          output: { message: { content: [] } },
        })),
      });

      await expect(callClaude('test')).rejects.toThrow(ClaudeAPIError);
    });

    it('타임아웃 발생 시 ClaudeTimeoutError를 던진다', async () => {
      mockSend.mockRejectedValue(new Error('Request timeout'));

      await expect(callClaude('test')).rejects.toThrow(ClaudeTimeoutError);
    });

    it('AccessDeniedException 발생 시 AnalysisError를 던진다', async () => {
      const err = new Error('Access denied');
      err.name = 'AccessDeniedException';
      mockSend.mockRejectedValue(err);

      await expect(callClaude('test')).rejects.toThrow(AnalysisError);
    });

    it('ThrottlingException 발생 시 AnalysisError를 던진다', async () => {
      const err = new Error('Too many requests');
      err.name = 'ThrottlingException';
      mockSend.mockRejectedValue(err);

      await expect(callClaude('test')).rejects.toThrow(AnalysisError);
    });

    it('알 수 없는 에러 발생 시 ClaudeAPIError를 던진다', async () => {
      mockSend.mockRejectedValue(new Error('unknown'));

      await expect(callClaude('test')).rejects.toThrow(ClaudeAPIError);
    });
  });
});
