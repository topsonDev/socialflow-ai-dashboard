import 'reflect-metadata';
import { AIService } from '../AIService';
import { CircuitBreakerService } from '../CircuitBreakerService';
import { BadRequestError } from '../../lib/errors';

jest.mock('../../lib/logger', () => ({ createLogger: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }) }));
jest.mock('../../lib/eventBus', () => ({ eventBus: { emitJobProgress: jest.fn() } }));
jest.mock('../../services/BillingService', () => ({ billingService: { deductCreditsForTokens: jest.fn() } }));
jest.mock('@opentelemetry/api', () => ({
  trace: { getTracer: () => ({ startSpan: () => ({ setAttribute: jest.fn(), setStatus: jest.fn(), recordException: jest.fn(), end: jest.fn() }) }) },
  SpanStatusCode: { OK: 0, ERROR: 1 },
}));

const MAX_PROMPT_LENGTH = 4_000_000;

describe('AIService — prompt size validation', () => {
  let service: AIService;

  beforeEach(() => {
    service = new AIService(new CircuitBreakerService());
    // Set model so the "not initialized" guard doesn't fire
    (service as any).model = {};
    (service as any).genAI = { models: { generateContent: jest.fn() } };
  });

  it('throws BadRequestError before any network call when prompt exceeds MAX_PROMPT_LENGTH', async () => {
    const oversizedPrompt = 'a'.repeat(MAX_PROMPT_LENGTH + 1);
    await expect(service.generateContent(oversizedPrompt)).rejects.toThrow(BadRequestError);
    expect((service as any).genAI.models.generateContent).not.toHaveBeenCalled();
  });

  it('throws with code PROMPT_TOO_LARGE', async () => {
    const oversizedPrompt = 'a'.repeat(MAX_PROMPT_LENGTH + 1);
    await expect(service.generateContent(oversizedPrompt)).rejects.toMatchObject({
      code: 'PROMPT_TOO_LARGE',
      statusCode: 400,
    });
  });

  it('does not throw for a prompt exactly at the limit', async () => {
    const exactPrompt = 'a'.repeat(MAX_PROMPT_LENGTH);
    (service as any).genAI.models.generateContent = jest.fn().mockResolvedValue({
      text: 'ok',
      usageMetadata: { totalTokenCount: 1 },
    });
    jest.spyOn((service as any).circuitBreaker, 'execute').mockImplementation(async (_name: string, fn: () => Promise<unknown>) => fn());
    await expect(service.generateContent(exactPrompt)).resolves.toBeDefined();
  });
});
