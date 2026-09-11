import { InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiFeedbackService } from './ai-feedback.service';

const parseMock = jest.fn();

jest.mock('@anthropic-ai/sdk', () => {
  class MockAPIError extends Error {}
  const ctor = jest.fn().mockImplementation(() => ({ messages: { parse: parseMock } }));
  (ctor as unknown as { APIError: typeof MockAPIError }).APIError = MockAPIError;
  return { __esModule: true, default: ctor };
});

// eslint-disable-next-line @typescript-eslint/no-var-requires
const MockAPIError = (jest.requireMock('@anthropic-ai/sdk').default as { APIError: typeof Error }).APIError;

describe('AiFeedbackService.analyze', () => {
  let config: { get: jest.Mock };
  let service: AiFeedbackService;

  beforeEach(() => {
    parseMock.mockReset();
    config = { get: jest.fn() };
    service = new AiFeedbackService(config as unknown as ConfigService);
  });

  it("ANTHROPIC_API_KEY o'rnatilmagan bo'lsa InternalServerErrorException tashlaydi", async () => {
    config.get.mockReturnValue(undefined);

    await expect(service.analyze('Xonam sovuq')).rejects.toBeInstanceOf(InternalServerErrorException);
    expect(parseMock).not.toHaveBeenCalled();
  });

  it("to'g'ri sozlamalar bilan AI natijasini qaytaradi", async () => {
    config.get.mockReturnValue('sk-test-key');
    parseMock.mockResolvedValue({
      parsed_output: { reply: 'Kechirasiz...', summary: 'Xona sovuq', category: 'COMPLAINT' },
    });

    const result = await service.analyze('Xonam juda sovuq, isitgich ishlamayapti');

    expect(result).toEqual({ reply: 'Kechirasiz...', summary: 'Xona sovuq', category: 'COMPLAINT' });
    expect(parseMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'claude-opus-5',
        messages: [{ role: 'user', content: 'Xonam juda sovuq, isitgich ishlamayapti' }],
      }),
    );
  });

  it('parsed_output bo\'sh bo\'lsa InternalServerErrorException tashlaydi', async () => {
    config.get.mockReturnValue('sk-test-key');
    parseMock.mockResolvedValue({ parsed_output: null });

    await expect(service.analyze('Salom')).rejects.toBeInstanceOf(InternalServerErrorException);
  });

  it('Anthropic APIError InternalServerErrorException sifatida qayta uzatiladi', async () => {
    config.get.mockReturnValue('sk-test-key');
    parseMock.mockRejectedValue(new MockAPIError('rate limited'));

    await expect(service.analyze('Salom')).rejects.toBeInstanceOf(InternalServerErrorException);
  });
});
