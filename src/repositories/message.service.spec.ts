import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MessageService } from './message.service.js';
import { Message } from '../database/entities/message.entity.js';
import { OpenAiService } from './openai.service.js';
import { UserService } from './user.service.js';
import { McpProxyService } from './mcp-proxy.service.js';

describe('MessageService', () => {
  let service: MessageService;

  const mockRepository = {
    create: jest.fn((data: any) => data),
    save: jest.fn((entity: any) => Promise.resolve({ id: 'msg-1', creation_time: new Date(), deletion_time: null, ...entity })),
  };

  const mockOpenAiService = {
    generateResponse: jest.fn<(...args: any[]) => any>().mockResolvedValue('ai response'),
    getProviderId: jest.fn<(...args: any[]) => any>().mockReturnValue('provider-1'),
    getModelId: jest.fn<(...args: any[]) => any>().mockReturnValue('model-1'),
    getModelName: jest.fn<(...args: any[]) => any>().mockReturnValue('Model One'),
  };

  const mockUserService = {
    getOrCreateBotUser: jest.fn<(...args: any[]) => any>().mockResolvedValue({ id: 'bot-1' }),
  };

  const mockMcpProxyService = {
    listConfiguredServers: jest.fn<(...args: any[]) => any>().mockReturnValue([]),
    listTools: jest.fn<(...args: any[]) => any>().mockResolvedValue([]),
    callTool: jest.fn<(...args: any[]) => any>(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockMcpProxyService.listConfiguredServers.mockReturnValue([]);
    mockMcpProxyService.listTools.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessageService,
        { provide: getRepositoryToken(Message), useValue: mockRepository },
        { provide: OpenAiService, useValue: mockOpenAiService },
        { provide: UserService, useValue: mockUserService },
        { provide: McpProxyService, useValue: mockMcpProxyService },
      ],
    }).compile();

    service = module.get<MessageService>(MessageService);
  });

  describe('createWithAiResponse', () => {
    const messageDbo = {
      external_id: null,
      conversation_id: 'conv-1',
      author_user_id: 'user-1',
      content: 'hello',
    };

    it('generates a response without tools when no MCP servers are configured', async () => {
      await service.createWithAiResponse(messageDbo, [], 'user-access-token');

      expect(mockOpenAiService.generateResponse).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({ tools: [], onToolCall: expect.any(Function) }),
      );
    });

    it('exposes tools from configured MCP servers, qualified by server id', async () => {
      mockMcpProxyService.listConfiguredServers.mockReturnValue([
        { id: 'material-tracing', url: 'http://localhost:8080/.ai' },
      ]);
      mockMcpProxyService.listTools.mockResolvedValue([
        { name: 'find_part', description: 'Finds a part', inputSchema: { type: 'object' } },
      ]);

      await service.createWithAiResponse(messageDbo, [], 'user-access-token');

      const options = mockOpenAiService.generateResponse.mock.calls[0][1];
      expect(options.tools).toEqual([
        {
          name: 'material-tracing__find_part',
          description: 'Finds a part',
          parameters: { type: 'object' },
        },
      ]);
    });

    it('propagates the requesting user access token to listTools as an authorization header', async () => {
      mockMcpProxyService.listConfiguredServers.mockReturnValue([
        { id: 'material-tracing', url: 'http://localhost:8080/.ai' },
      ]);

      await service.createWithAiResponse(messageDbo, [], 'user-access-token');

      expect(mockMcpProxyService.listTools).toHaveBeenCalledWith('material-tracing', {
        authorization: 'Bearer user-access-token',
      });
    });

    it('does not set an authorization header when no access token is available', async () => {
      mockMcpProxyService.listConfiguredServers.mockReturnValue([
        { id: 'material-tracing', url: 'http://localhost:8080/.ai' },
      ]);

      await service.createWithAiResponse(messageDbo, []);

      expect(mockMcpProxyService.listTools).toHaveBeenCalledWith('material-tracing', {});
    });

    it('routes a tool-call executor invocation to the right MCP server with the qualified name stripped', async () => {
      mockMcpProxyService.listConfiguredServers.mockReturnValue([
        { id: 'material-tracing', url: 'http://localhost:8080/.ai' },
      ]);
      mockMcpProxyService.listTools.mockResolvedValue([{ name: 'find_part' }]);
      mockMcpProxyService.callTool.mockResolvedValue('part found');

      await service.createWithAiResponse(messageDbo, [], 'user-access-token');

      const options = mockOpenAiService.generateResponse.mock.calls[0][1];
      const result = await options.onToolCall('material-tracing__find_part', { id: '1' });

      expect(mockMcpProxyService.callTool).toHaveBeenCalledWith(
        'material-tracing',
        'find_part',
        { id: '1' },
        { authorization: 'Bearer user-access-token' },
      );
      expect(result).toBe('part found');
    });

    it("returns an 'unknown tool' message instead of throwing for an unrecognized tool name", async () => {
      await service.createWithAiResponse(messageDbo, [], 'user-access-token');

      const options = mockOpenAiService.generateResponse.mock.calls[0][1];
      const result = await options.onToolCall('nonexistent__tool', {});

      expect(result).toContain("Unknown tool");
      expect(mockMcpProxyService.callTool).not.toHaveBeenCalled();
    });

    it('saves both the user message and the AI response', async () => {
      const result = await service.createWithAiResponse(messageDbo, [], 'user-access-token');

      expect(result).toHaveLength(2);
      expect(mockRepository.save).toHaveBeenCalledTimes(2);
    });
  });
});
