/**
 * AWS Bedrock Nova API 클라이언트
 *
 * @aws-sdk/client-bedrock-runtime을 사용하여 AWS Bedrock Nova와 통신한다.
 * - AWS 자격 증명은 환경변수 또는 IAM Role에서 자동 로드
 * - us-east-1 리전의 Nova Pro 모델 사용
 * - 120초 타임아웃, 최대 2회 재시도
 */

const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
const { ClaudeAPIError, ClaudeTimeoutError, AnalysisError } = require('../errors');

const MODEL_ID = 'amazon.nova-pro-v1:0';
const REGION = process.env.AWS_REGION || 'us-east-1';
const TIMEOUT_MS = 120000; // Nova는 더 긴 응답 시간 필요
const MAX_RETRIES = 2;

/**
 * Bedrock 클라이언트 인스턴스를 생성한다.
 * AWS 자격 증명은 환경변수, ~/.aws/credentials, 또는 IAM Role에서 자동 로드된다.
 */
function createClient() {
  try {
    return new BedrockRuntimeClient({
      region: REGION,
    });
  } catch (err) {
    console.error('[Bedrock] Failed to create client:', err.message);
    throw new ClaudeAPIError();
  }
}

/**
 * AWS Bedrock Nova API를 호출하여 프롬프트에 대한 응답을 반환한다.
 *
 * @param {string} prompt - Nova에 전달할 프롬프트
 * @returns {Promise<string>} Nova의 텍스트 응답
 * @throws {ClaudeTimeoutError} 타임아웃 발생 시
 * @throws {ClaudeAPIError} 기타 API 오류 발생 시
 */
async function callClaude(prompt) {
  const client = createClient();

  try {
    console.log('[Bedrock Nova] Calling API with model:', MODEL_ID);
    console.log('[Bedrock Nova] Region:', REGION);

    let lastError;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const startTime = Date.now();

        // Nova API 요청 페이로드
        const payload = {
          messages: [
            {
              role: 'user',
              content: [
                {
                  text: prompt
                }
              ]
            }
          ],
          inferenceConfig: {
            max_new_tokens: 4096,
            temperature: 0.7,
            top_p: 0.9
          }
        };

        const command = new InvokeModelCommand({
          modelId: MODEL_ID,
          contentType: 'application/json',
          accept: 'application/json',
          body: JSON.stringify(payload),
        });

        // 타임아웃 설정
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), TIMEOUT_MS);
        });

        const response = await Promise.race([
          client.send(command),
          timeoutPromise
        ]);

        const responseBody = JSON.parse(new TextDecoder().decode(response.body));

        const elapsedTime = Date.now() - startTime;
        console.log(`[Bedrock Nova] API call successful in ${elapsedTime}ms`);

        // Nova 응답 구조에서 텍스트 추출
        if (responseBody.output && responseBody.output.message && responseBody.output.message.content) {
          const content = responseBody.output.message.content;
          const textContent = content.find(c => c.text);

          if (textContent && textContent.text) {
            const text = textContent.text;
            console.log('[Bedrock Nova] Response length:', text.length);
            return text;
          }
        }

        console.error('[Bedrock Nova] No text in response:', JSON.stringify(responseBody));
        throw new ClaudeAPIError();

      } catch (err) {
        lastError = err;

        if (err instanceof ClaudeAPIError || err instanceof ClaudeTimeoutError) {
          throw err;
        }

        if (err.message === 'Request timeout') {
          console.error('[Bedrock Nova] Request timeout');
          throw new ClaudeTimeoutError();
        }

        if (attempt < MAX_RETRIES) {
          const delay = Math.pow(2, attempt) * 1000;
          console.log(`[Bedrock Nova] Retry ${attempt + 1}/${MAX_RETRIES} after ${delay}ms`);
          console.log(`[Bedrock Nova] Error was:`, err.message);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;

  } catch (err) {
    if (err instanceof ClaudeAPIError || err instanceof ClaudeTimeoutError) {
      throw err;
    }

    console.error('[Bedrock Nova] API error:', err.message);
    console.error('[Bedrock Nova] Error type:', err.constructor.name);
    if (err.$metadata) {
      console.error('[Bedrock Nova] HTTP status:', err.$metadata.httpStatusCode);
    }

    // AWS 인증 오류
    if (err.name === 'UnrecognizedClientException' ||
        err.name === 'InvalidSignatureException' ||
        err.message?.includes('credentials')) {
      throw new AnalysisError(
        'AI 분석 서비스 인증에 실패했습니다. AWS 자격 증명을 확인해주세요.',
        'BEDROCK_AUTH_ERROR'
      );
    }

    // 모델 접근 권한 오류
    if (err.name === 'AccessDeniedException') {
      throw new AnalysisError(
        'Bedrock Nova 모델에 대한 접근 권한이 없습니다. IAM 권한을 확인해주세요.',
        'BEDROCK_ACCESS_DENIED'
      );
    }

    // 쓰로틀링 오류
    if (err.name === 'ThrottlingException' || err.$metadata?.httpStatusCode === 429) {
      throw new AnalysisError(
        '분석 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
        'BEDROCK_RATE_LIMIT'
      );
    }

    // 모델 오류
    if (err.name === 'ModelErrorException' || err.name === 'ModelTimeoutException') {
      throw new AnalysisError(
        'AI 모델 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        'BEDROCK_MODEL_ERROR'
      );
    }

    throw new ClaudeAPIError();
  }
}

module.exports = { callClaude, createClient };
