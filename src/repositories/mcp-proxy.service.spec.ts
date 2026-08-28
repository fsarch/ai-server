import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Readable } from 'node:stream';
import { NotFoundException, BadGatewayException } from '@nestjs/common';
import { McpProxyService, resolveMcpTargetUrl } from './mcp-proxy.service.js';

const PROTOCOL_VERSION = '2025-11-25';

type CapturedRequest = { message: any; headers: Headers; method: string };

/**
 * A minimal in-memory stand-in for an `@rekog/mcp-nest` `StreamableHttpTransport` server:
 * handles the initialize handshake, session-id issuance/enforcement, `tools/list` and
 * `tools/call`, and rejects GET (no server-initiated stream) with 405 like a real one would.
 */
function createFakeMcpServerFetch(options: {
  tools?: Array<{ name: string; description?: string; inputSchema?: any }>;
  toolResult?: any;
  requireSessionId?: boolean;
} = {}) {
  const requests: CapturedRequest[] = [];
  let sessionId: string | undefined;

  const fetchMock = jest.fn(async (_url: any, init: any = {}) => {
    const method = (init.method || 'GET').toUpperCase();
    const headers = new Headers(init.headers || {});

    if (method === 'GET') {
      return new Response(null, { status: 405 });
    }
    if (method === 'DELETE') {
      return new Response(null, { status: 200 });
    }

    const msg = JSON.parse(String(init.body ?? '{}'));
    requests.push({ message: msg, headers, method });

    if (options.requireSessionId !== false && msg.method !== 'initialize') {
      const incomingSessionId = headers.get('mcp-session-id');
      if (sessionId && incomingSessionId !== sessionId) {
        return new Response(
          JSON.stringify({ jsonrpc: '2.0', id: msg.id, error: { code: -32001, message: 'Session not found' } }),
          { status: 404, headers: { 'content-type': 'application/json' } },
        );
      }
    }

    if (msg.method === 'initialize') {
      sessionId = 'session-123';
      return new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id: msg.id,
          result: {
            protocolVersion: PROTOCOL_VERSION,
            capabilities: {},
            serverInfo: { name: 'fake-mcp-server', version: '1.0.0' },
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json', 'mcp-session-id': sessionId } },
      );
    }

    if (msg.method === 'notifications/initialized') {
      return new Response(null, { status: 202 });
    }

    if (msg.method === 'tools/list') {
      return new Response(
        JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: { tools: options.tools ?? [] } }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }

    if (msg.method === 'tools/call') {
      return new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id: msg.id,
          result: options.toolResult ?? { content: [{ type: 'text', text: 'ok' }] },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ jsonrpc: '2.0', id: msg.id, error: { code: -32601, message: 'Method not found' } }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  });

  return { fetchMock, requests };
}

describe('resolveMcpTargetUrl', () => {
  it('preserves a base path on the configured server URL', () => {
    expect(resolveMcpTargetUrl('http://localhost:8080/.ai', '/mcp')).toBe(
      'http://localhost:8080/.ai/mcp',
    );
  });

  it('preserves a base path with a trailing slash', () => {
    expect(resolveMcpTargetUrl('http://localhost:8080/.ai/', '/mcp/sub')).toBe(
      'http://localhost:8080/.ai/mcp/sub',
    );
  });

  it('works when the base URL has no path', () => {
    expect(resolveMcpTargetUrl('http://localhost:8080', '/mcp')).toBe(
      'http://localhost:8080/mcp',
    );
  });
});

function createMockConfigService(mcpServers: unknown) {
  return { get: (key: string) => (key === 'mcp' ? mcpServers : undefined) };
}

describe('McpProxyService', () => {
  let service: McpProxyService;

  const mockMcpServers = [
    {
      id: 'test-server',
      url: 'http://localhost:8080',
      auth: {
        type: 'bearer' as const,
        token: 'test-token',
      },
    },
    {
      id: 'proxy-server',
      url: 'http://localhost:9090/.ai',
      auth: {
        type: 'credential-propagation' as const,
      },
    },
  ];

  let originalFetch: typeof fetch;

  beforeEach(async () => {
    originalFetch = global.fetch;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        McpProxyService,
        {
          provide: ConfigService,
          useValue: createMockConfigService(mockMcpServers),
        },
      ],
    }).compile();

    service = module.get<McpProxyService>(McpProxyService);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getMcpServer', () => {
    it('should return server config for valid id', () => {
      const server = service.getMcpServer('test-server');
      expect(server).toEqual({
        id: 'test-server',
        url: 'http://localhost:8080',
        auth: {
          type: 'bearer',
          token: 'test-token',
        },
      });
    });

    it('should throw NotFoundException for invalid id', () => {
      expect(() => service.getMcpServer('invalid-id')).toThrow(NotFoundException);
    });

    it('should handle missing mcp config', () => {
      const emptyConfigService = new McpProxyService(createMockConfigService(undefined) as any);

      expect(() => emptyConfigService.getMcpServer('test')).toThrow(NotFoundException);
    });
  });

  describe('listConfiguredServers', () => {
    it('returns all configured servers', () => {
      expect(service.listConfiguredServers().map((s) => s.id)).toEqual([
        'test-server',
        'proxy-server',
      ]);
    });

    it('returns an empty array when none are configured', () => {
      const emptyConfigService = new McpProxyService(createMockConfigService(undefined) as any);
      expect(emptyConfigService.listConfiguredServers()).toEqual([]);
    });
  });

  describe('proxyRequest', () => {
    it('resolves the target URL against the configured base path (regression: used to drop it)', async () => {
      const fetchMock = jest.fn<(...args: any[]) => any>().mockResolvedValue(new Response('{}', { status: 200 }));
      global.fetch = fetchMock as any;

      await service.proxyRequest('proxy-server', 'GET', '/mcp/endpoint', {});

      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:9090/.ai/mcp/endpoint',
        expect.objectContaining({ method: 'GET' }),
      );
    });

    it('applies bearer auth, overriding any client-supplied authorization header', async () => {
      const fetchMock = jest.fn<(...args: any[]) => any>().mockResolvedValue(new Response('{}', { status: 200 }));
      global.fetch = fetchMock as any;

      await service.proxyRequest('test-server', 'GET', '/mcp', { authorization: 'Bearer client-token' });

      const [, init] = fetchMock.mock.calls[0];
      expect(init.headers.authorization).toBe('Bearer test-token');
    });

    it('forwards the client authorization header unchanged for credential-propagation', async () => {
      const fetchMock = jest.fn<(...args: any[]) => any>().mockResolvedValue(new Response('{}', { status: 200 }));
      global.fetch = fetchMock as any;

      await service.proxyRequest('proxy-server', 'GET', '/mcp', { authorization: 'Bearer client-token' });

      const [, init] = fetchMock.mock.calls[0];
      expect(init.headers.authorization).toBe('Bearer client-token');
    });

    it('never sends a body for GET requests, even if one was passed', async () => {
      const fetchMock = jest.fn<(...args: any[]) => any>().mockResolvedValue(new Response('{}', { status: 200 }));
      global.fetch = fetchMock as any;

      await service.proxyRequest('test-server', 'GET', '/mcp', {}, { should: 'be dropped' });

      const [, init] = fetchMock.mock.calls[0];
      expect(init.body).toBeUndefined();
    });

    it('serializes a body for POST requests', async () => {
      const fetchMock = jest.fn<(...args: any[]) => any>().mockResolvedValue(new Response('{}', { status: 200 }));
      global.fetch = fetchMock as any;

      await service.proxyRequest('test-server', 'POST', '/mcp', {}, { hello: 'world' });

      const [, init] = fetchMock.mock.calls[0];
      expect(init.body).toBe(JSON.stringify({ hello: 'world' }));
    });

    it('streams the upstream response body through rather than buffering it', async () => {
      const fetchMock = jest.fn<(...args: any[]) => any>().mockResolvedValue(
        new Response(Readable.toWeb(Readable.from([Buffer.from('chunk-1'), Buffer.from('chunk-2')])) as any, {
          status: 200,
          headers: { 'content-type': 'text/event-stream' },
        }),
      );
      global.fetch = fetchMock as any;

      const result = await service.proxyRequest('test-server', 'GET', '/mcp', {});

      expect(result.status).toBe(200);
      expect(result.headers['content-type']).toBe('text/event-stream');
      expect(result.body).not.toBeNull();

      const chunks: Buffer[] = [];
      for await (const chunk of Readable.fromWeb(result.body as any)) {
        chunks.push(chunk as Buffer);
      }
      expect(Buffer.concat(chunks).toString('utf8')).toBe('chunk-1chunk-2');
    });

    it('wraps a network failure in a BadGatewayException', async () => {
      global.fetch = jest.fn<(...args: any[]) => any>().mockRejectedValue(new Error('connection refused')) as any;

      await expect(service.proxyRequest('test-server', 'GET', '/mcp', {})).rejects.toThrow(
        BadGatewayException,
      );
    });
  });

  describe('listTools', () => {
    it('returns the tools reported by the MCP server', async () => {
      const { fetchMock } = createFakeMcpServerFetch({
        tools: [{ name: 'find_part', description: 'Finds a part', inputSchema: { type: 'object' } }],
      });
      global.fetch = fetchMock as any;

      const tools = await service.listTools('test-server', { authorization: 'Bearer user-token' });

      expect(tools).toEqual([
        { name: 'find_part', description: 'Finds a part', inputSchema: { type: 'object' } },
      ]);
    });

    it('forwards the caller-supplied headers to every request (credential propagation)', async () => {
      const { fetchMock, requests } = createFakeMcpServerFetch({ tools: [] });
      global.fetch = fetchMock as any;

      await service.listTools('proxy-server', { authorization: 'Bearer user-token' });

      const listToolsRequest = requests.find((r) => r.message.method === 'tools/list');
      expect(listToolsRequest?.headers.get('authorization')).toBe('Bearer user-token');
    });

    it('reuses the session id issued at initialize for later calls', async () => {
      const { fetchMock, requests } = createFakeMcpServerFetch({ tools: [] });
      global.fetch = fetchMock as any;

      await service.listTools('test-server', {});

      const listToolsRequest = requests.find((r) => r.message.method === 'tools/list');
      expect(listToolsRequest?.headers.get('mcp-session-id')).toBe('session-123');
    });

    it('returns an empty list instead of throwing when the server is unreachable', async () => {
      global.fetch = jest.fn<(...args: any[]) => any>().mockRejectedValue(new Error('ECONNREFUSED')) as any;

      await expect(service.listTools('test-server', {})).resolves.toEqual([]);
    });
  });

  describe('callTool', () => {
    it('extracts text content from the tool result', async () => {
      const { fetchMock } = createFakeMcpServerFetch({
        toolResult: { content: [{ type: 'text', text: 'the answer is 42' }] },
      });
      global.fetch = fetchMock as any;

      const result = await service.callTool('test-server', 'find_part', { id: '1' }, {});

      expect(result).toBe('the answer is 42');
    });

    it('sends the tool name and arguments to the server', async () => {
      const { fetchMock, requests } = createFakeMcpServerFetch({});
      global.fetch = fetchMock as any;

      await service.callTool('test-server', 'find_part', { id: 'abc' }, {});

      const callRequest = requests.find((r) => r.message.method === 'tools/call');
      expect(callRequest?.message.params).toEqual({ name: 'find_part', arguments: { id: 'abc' } });
    });

    it('propagates an error when the server cannot be reached', async () => {
      global.fetch = jest.fn<(...args: any[]) => any>().mockRejectedValue(new Error('ECONNREFUSED')) as any;

      await expect(service.callTool('test-server', 'find_part', {}, {})).rejects.toThrow();
    });
  });
});
