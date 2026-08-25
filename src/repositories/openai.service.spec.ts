import { Test, TestingModule } from '@nestjs/testing';
import { OpenAiService } from './openai.service.js';

function createService(create: jest.Mock): OpenAiService {
  const config = {
    providers: [
      {
        id: 'openai-provider',
        type: 'open-ai',
        api_key: 'test-key',
        models: [{ id: 'gpt-test', name: 'GPT Test' }],
      },
    ],
  };

  const service = new OpenAiService(config as any);
  // Swap in a fake OpenAI client so no real network calls happen; initializeClient() above
  // already set modelId/providerId/modelName from the config.
  (service as any).client = { chat: { completions: { create } } };
  return service;
}

function completion(message: Partial<{ content: string | null; tool_calls: any[] }>) {
  return { choices: [{ message: { role: 'assistant', ...message } }] };
}

describe('OpenAiService', () => {
  it('throws if the client was never initialized (e.g. no provider configured)', async () => {
    const service = new OpenAiService({ providers: [] } as any);
    await expect(service.generateResponse([{ role: 'user', content: 'hi' }])).rejects.toThrow(
      'OpenAI service not initialized',
    );
  });

  it('returns the plain content when the model does not call a tool', async () => {
    const create = jest.fn().mockResolvedValue(completion({ content: 'Hello there' }));
    const service = createService(create);

    const result = await service.generateResponse([{ role: 'user', content: 'hi' }]);

    expect(result).toBe('Hello there');
    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0][0].tools).toBeUndefined();
  });

  it('includes the given tools in the request payload', async () => {
    const create = jest.fn().mockResolvedValue(completion({ content: 'done' }));
    const service = createService(create);

    await service.generateResponse([{ role: 'user', content: 'hi' }], {
      tools: [{ name: 'my_tool', description: 'does a thing', parameters: { type: 'object' } }],
    });

    expect(create.mock.calls[0][0].tools).toEqual([
      {
        type: 'function',
        function: { name: 'my_tool', description: 'does a thing', parameters: { type: 'object' } },
      },
    ]);
  });

  it('dispatches a tool call via onToolCall and feeds the result back for a final answer', async () => {
    const create = jest
      .fn()
      .mockResolvedValueOnce(
        completion({
          content: null,
          tool_calls: [
            {
              id: 'call-1',
              type: 'function',
              function: { name: 'my_tool', arguments: JSON.stringify({ id: '1' }) },
            },
          ],
        }),
      )
      .mockResolvedValueOnce(completion({ content: 'final answer' }));
    const service = createService(create);
    const onToolCall = jest.fn().mockResolvedValue('tool result text');

    const result = await service.generateResponse([{ role: 'user', content: 'hi' }], {
      tools: [{ name: 'my_tool', parameters: { type: 'object' } }],
      onToolCall,
    });

    expect(result).toBe('final answer');
    expect(onToolCall).toHaveBeenCalledWith('my_tool', { id: '1' });
    expect(create).toHaveBeenCalledTimes(2);

    const secondCallMessages = create.mock.calls[1][0].messages;
    expect(secondCallMessages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ role: 'tool', tool_call_id: 'call-1', content: 'tool result text' }),
      ]),
    );
  });

  it('feeds an error message back to the model when the tool executor throws', async () => {
    const create = jest
      .fn()
      .mockResolvedValueOnce(
        completion({
          content: null,
          tool_calls: [
            { id: 'call-1', type: 'function', function: { name: 'my_tool', arguments: '{}' } },
          ],
        }),
      )
      .mockResolvedValueOnce(completion({ content: 'recovered' }));
    const service = createService(create);
    const onToolCall = jest.fn().mockRejectedValue(new Error('downstream unavailable'));

    const result = await service.generateResponse([{ role: 'user', content: 'hi' }], {
      tools: [{ name: 'my_tool', parameters: { type: 'object' } }],
      onToolCall,
    });

    expect(result).toBe('recovered');
    const secondCallMessages = create.mock.calls[1][0].messages;
    const toolMessage = secondCallMessages.find((m: any) => m.role === 'tool');
    expect(toolMessage.content).toContain('downstream unavailable');
  });

  it('gives up after too many tool-call round trips instead of looping forever', async () => {
    const create = jest.fn().mockResolvedValue(
      completion({
        content: null,
        tool_calls: [
          { id: 'call-1', type: 'function', function: { name: 'my_tool', arguments: '{}' } },
        ],
      }),
    );
    const service = createService(create);
    const onToolCall = jest.fn().mockResolvedValue('result');

    await expect(
      service.generateResponse([{ role: 'user', content: 'hi' }], {
        tools: [{ name: 'my_tool', parameters: { type: 'object' } }],
        onToolCall,
      }),
    ).rejects.toThrow('Exceeded maximum tool call iterations');
  });
});
