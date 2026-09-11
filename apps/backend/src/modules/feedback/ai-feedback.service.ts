import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { FeedbackCategory } from '@prisma/client';
import { z } from 'zod';

const AI_MODEL = 'claude-opus-5';

const FeedbackAiResultSchema = z.object({
  reply: z.string(),
  summary: z.string(),
  category: z.enum(['COMPLAINT', 'SUGGESTION', 'GENERAL']),
});

export interface FeedbackAiResult {
  reply: string;
  summary: string;
  category: FeedbackCategory;
}

const SYSTEM_PROMPT = [
  "Siz mehmonxona uchun mehmonlar murojaatlariga javob beruvchi xushmuomala AI yordamchisiz.",
  "Mehmonning xabarini o'qib quyidagilarni qaytaring:",
  "1) reply — mehmonga qisqa (2-3 gap), xushmuomala, hamdardlik bildiruvchi javob (o'zbek tilida);",
  "2) summary — xabarning bir jumlali qisqa mazmuni (mehmonxona xodimlari uchun, o'zbek tilida);",
  "3) category — COMPLAINT (shikoyat), SUGGESTION (taklif) yoki GENERAL (umumiy) dan biri.",
].join(' ');

/**
 * Mehmon murojaatini Claude API orqali tahlil qiladi: xushmuomala javob,
 * qisqa mazmun va kategoriya generatsiya qiladi (structured output).
 * ANTHROPIC_API_KEY o'rnatilmagan bo'lsa ilova ishga tushishda emas, faqat
 * shu metod chaqirilganda xato beradi (R2Service bilan bir xil uslub).
 */
@Injectable()
export class AiFeedbackService {
  constructor(private readonly config: ConfigService) {}

  async analyze(message: string): Promise<FeedbackAiResult> {
    const apiKey = this.config.get<string>('ANTHROPIC_API_KEY');
    if (!apiKey) {
      throw new InternalServerErrorException("AI xizmati sozlanmagan (ANTHROPIC_API_KEY o'rnatilmagan)");
    }

    const client = new Anthropic({ apiKey });

    try {
      const response = await client.messages.parse({
        model: AI_MODEL,
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: message }],
        output_config: { effort: 'low', format: zodOutputFormat(FeedbackAiResultSchema) },
      });

      if (!response.parsed_output) {
        throw new InternalServerErrorException('AI javobni generatsiya qila olmadi');
      }

      return response.parsed_output;
    } catch (error) {
      if (error instanceof Anthropic.APIError) {
        throw new InternalServerErrorException(`AI xizmati xatosi: ${error.message}`);
      }
      throw error;
    }
  }
}
