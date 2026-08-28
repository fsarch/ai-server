import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

// Application-specific config section (the `providers:` key in config.yaml) - not part of
// @fsarch/server's own config type.
export type OpenAiProviderConfigType = {
  type: 'open-ai';
  id: string;
  api_key: string;
  models: Array<{ id: string; name: string }>;
};

export type OpenAiToolDefinition = {
  name: string;
  description?: string;
  parameters: Record<string, unknown>;
};

export type OpenAiToolExecutor = (
  name: string,
  args: Record<string, unknown>,
) => Promise<string>;

export type GenerateResponseOptions = {
  tools?: OpenAiToolDefinition[];
  onToolCall?: OpenAiToolExecutor;
};

// Safety cap on the tool-call <-> tool-result round trips within a single generateResponse
// call, so a model that keeps requesting tools can't loop forever.
const MAX_TOOL_CALL_ITERATIONS = 5;

@Injectable()
export class OpenAiService {
  private readonly logger = new Logger(OpenAiService.name);
  private client: OpenAI | null = null;
  private modelId: string | null = null;
  private modelName: string | null = null;
  private providerId: string | null = null;

  constructor(private readonly configService: ConfigService) {
    this.initializeClient();
  }

  private initializeClient(): void {
    // Read first provider configuration
    const providers = this.configService.get<OpenAiProviderConfigType[]>('providers') || [];
    const openaiProvider = providers.find((p) => p.type === 'open-ai');

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

  /**
   * Generates a chat response, optionally giving the model a set of tools (typically sourced
   * from configured MCP servers) it can call via `onToolCall`. If the model requests a tool
   * call, `onToolCall` is invoked, its result is fed back as a tool message, and the model is
   * asked again - up to `MAX_TOOL_CALL_ITERATIONS` times - until it returns a final answer.
   */
  async generateResponse(
    messages: Array<{ role: string; content: string }>,
    options?: GenerateResponseOptions,
  ): Promise<string> {
    if (!this.client) {
      throw new Error('OpenAI service not initialized');
    }

    const tools = options?.tools?.length
      ? options.tools.map((tool) => ({
          type: 'function' as const,
          function: {
            name: tool.name,
            description: tool.description ?? '',
            parameters: tool.parameters ?? { type: 'object', properties: {} },
          },
        }))
      : undefined;

    // Loosely typed on purpose: assistant messages coming back from the API (which may carry
    // tool_calls) and the tool-result messages we append are both fed back verbatim into the
    // next request.
    const conversation: any[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      for (let iteration = 0; iteration < MAX_TOOL_CALL_ITERATIONS; iteration++) {
        const response = await this.client.chat.completions.create({
          model: this.modelId!,
          messages: conversation,
          ...(tools ? { tools } : {}),
        });

        const choice = response.choices[0];
        const toolCalls = choice?.message?.tool_calls;

        if (toolCalls && toolCalls.length > 0 && options?.onToolCall) {
          conversation.push(choice.message);

          for (const toolCall of toolCalls) {
            if (toolCall.type !== 'function') {
              continue;
            }

            let args: Record<string, unknown> = {};
            try {
              args = toolCall.function.arguments
                ? JSON.parse(toolCall.function.arguments)
                : {};
            } catch {
              args = {};
            }

            let resultContent: string;
            try {
              resultContent = await options.onToolCall(toolCall.function.name, args);
            } catch (error) {
              resultContent = `Error executing tool '${toolCall.function.name}': ${
                error instanceof Error ? error.message : 'Unknown error'
              }`;
            }

            conversation.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: resultContent,
            });
          }

          continue;
        }

        const content = choice?.message?.content;
        if (!content) {
          throw new Error('No response content from OpenAI');
        }

        return content;
      }

      throw new Error('Exceeded maximum tool call iterations');
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


