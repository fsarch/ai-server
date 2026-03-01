import { Injectable, Logger, Inject } from '@nestjs/common';
import OpenAI from 'openai';
import type { ConfigType } from '../fsarch/configuration/config.type.js';

@Injectable()
export class OpenAiService {
  private readonly logger = new Logger(OpenAiService.name);
  private client: OpenAI | null = null;
  private modelId: string | null = null;
  private modelName: string | null = null;
  private providerId: string | null = null;

  constructor(@Inject('CONFIG') private readonly config: ConfigType) {
    this.initializeClient();
  }

  private initializeClient(): void {
    // Read first provider configuration
    const providers = (this.config as any).providers || [];
    const openaiProvider = providers.find((p: any) => p.type === 'open-ai');

    if (!openaiProvider) {
      this.logger.warn('No OpenAI provider configured');
      return;
    }

    const apiKey = openaiProvider.api_key;
    const providerId = openaiProvider.id;
    const models = openaiProvider.models || [];

    if (!apiKey || models.length === 0) {
      this.logger.warn('OpenAI provider not properly configured');
      return;
    }

    // Use first model
    this.modelId = models[0].id;
    this.modelName = models[0].name;
    this.providerId = providerId;
    this.client = new OpenAI({ apiKey });

    this.logger.log(
      `OpenAI service initialized with provider: ${this.providerId}, model: ${this.modelId} (${this.modelName})`,
    );
  }

  async generateResponse(messages: Array<{ role: string; content: string }>): Promise<string> {
    if (!this.client) {
      throw new Error('OpenAI service not initialized');
    }

    try {
      const response = await this.client.chat.completions.create({
        model: this.modelId!,
        messages: messages as OpenAI.Chat.ChatCompletionMessageParam[],
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response content from OpenAI');
      }

      return content;
    } catch (error) {
      this.logger.error(`Error calling OpenAI API: ${error}`);
      throw error;
    }
  }

  async generateConversationTitleAndDescription(
    initialMessage: string,
  ): Promise<{ title: string; description: string }> {
    if (!this.client) {
      throw new Error('OpenAI service not initialized');
    }

    try {
      const prompt = `Based on this initial message, generate a very short conversation title (max 50 characters) and a brief description (max 150 characters).

Initial message: "${initialMessage}"

Respond in JSON format only with this structure:
{
  "title": "short title here",
  "description": "brief description here"
}`;

      const response = await this.client.chat.completions.create({
        model: this.modelId!,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ] as OpenAI.Chat.ChatCompletionMessageParam[],
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response content from OpenAI');
      }

      // Parse JSON response
      const jsonMatch = content.match(/\{[\s\S]*}/);
      if (!jsonMatch) {
        throw new Error('Invalid response format from OpenAI');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return {
        title: parsed.title || 'New Conversation',
        description: parsed.description || '',
      };
    } catch (error) {
      this.logger.error(`Error generating conversation title/description: ${error}`);
      // Return default values if generation fails
      return {
        title: 'New Conversation',
        description: '',
      };
    }
  }

  getProviderId(): string {
    if (!this.providerId) {
      throw new Error('OpenAI provider not initialized');
    }
    return this.providerId;
  }

  getModelId(): string {
    if (!this.modelId) {
      throw new Error('OpenAI model not initialized');
    }
    return this.modelId;
  }

  getModelName(): string {
    if (!this.modelName) {
      throw new Error('OpenAI model name not initialized');
    }
    return this.modelName;
  }
}


