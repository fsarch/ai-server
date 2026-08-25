import { Test, TestingModule } from '@nestjs/testing';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Readable } from 'node:stream';
import { PassThrough } from 'node:stream';
import * as supertest from 'supertest';

const request = (supertest as unknown as { default?: typeof supertest }).default ?? supertest;
import { McpProxyController } from './mcp-proxy.controller.js';
import { McpProxyService } from '../../repositories/mcp-proxy.service.js';

function webStreamFromString(text: string): ReadableStream<Uint8Array> {
  return Readable.toWeb(Readable.from([Buffer.from(text)])) as ReadableStream<Uint8Array>;
}

function createMockRes() {
  const stream = new PassThrough();
  const chunks: Buffer[] = [];
  stream.on('data', (chunk) => chunks.push(chunk));

  const res: any = Object.assign(stream, {
    statusCode: 200,
    headersSent: false,
    setHeader: jest.fn(),
    json: jest.fn(),
  });
  res.status = jest.fn((code: number) => {
    res.statusCode = code;
    return res;
  });

  return { res, getBody: () => Buffer.concat(chunks).toString('utf8') };
}

describe('McpProxyController', () => {
  let controller: McpProxyController;

  const mockMcpProxyService = {
    proxyRequest: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [McpProxyController],
      providers: [
        {
          provide: McpProxyService,
          useValue: mockMcpProxyService,
        },
      ],
    }).compile();

    controller = module.get<McpProxyController>(McpProxyController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('proxyToMcp', () => {
    it('extracts the correct path and streams the response for a sub-path request', async () => {
      const mockReq = {
        path: '/v1/.ai/mcp-proxy/test-server/mcp/endpoint',
        url: '/v1/.ai/mcp-proxy/test-server/mcp/endpoint?foo=bar',
        method: 'GET',
        headers: { authorization: 'Bearer token' },
        body: undefined,
      };

      mockMcpProxyService.proxyRequest.mockResolvedValue({
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: webStreamFromString('{"success":true}'),
      });

      const { res, getBody } = createMockRes();
      await controller.proxyToMcp('test-server', mockReq, res);

      expect(mockMcpProxyService.proxyRequest).toHaveBeenCalledWith(
        'test-server',
        'GET',
        '/mcp/endpoint?foo=bar',
        { authorization: 'Bearer token' },
        undefined,
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(getBody()).toBe('{"success":true}');
    });

    it('extracts an empty sub-path for the bare MCP endpoint (single-endpoint transport)', async () => {
      const mockReq = {
        path: '/v1/.ai/mcp-proxy/material-tracing/mcp',
        url: '/v1/.ai/mcp-proxy/material-tracing/mcp',
        method: 'POST',
        headers: { authorization: 'Bearer token', 'content-type': 'application/json' },
        body: { jsonrpc: '2.0', id: 1, method: 'tools/list' },
      };

      mockMcpProxyService.proxyRequest.mockResolvedValue({
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: webStreamFromString('{"jsonrpc":"2.0","id":1,"result":{}}'),
      });

      const { res } = createMockRes();
      await controller.proxyToMcp('material-tracing', mockReq, res);

      expect(mockMcpProxyService.proxyRequest).toHaveBeenCalledWith(
        'material-tracing',
        'POST',
        '/mcp',
        expect.any(Object),
        mockReq.body,
      );
    });

    it('does not forward hop-by-hop headers', async () => {
      const mockReq = {
        path: '/v1/.ai/mcp-proxy/test-server/mcp',
        url: '/v1/.ai/mcp-proxy/test-server/mcp',
        method: 'GET',
        headers: {},
        body: undefined,
      };

      mockMcpProxyService.proxyRequest.mockResolvedValue({
        status: 200,
        headers: {
          'content-type': 'application/json',
          'transfer-encoding': 'chunked',
          connection: 'keep-alive',
        },
        body: webStreamFromString('{}'),
      });

      const { res } = createMockRes();
      await controller.proxyToMcp('test-server', mockReq, res);

      expect(res.setHeader).toHaveBeenCalledWith('content-type', 'application/json');
      expect(res.setHeader).not.toHaveBeenCalledWith('transfer-encoding', expect.anything());
      expect(res.setHeader).not.toHaveBeenCalledWith('connection', expect.anything());
    });

    it('returns 502 when the service throws before a response is obtained', async () => {
      const mockReq = {
        path: '/v1/.ai/mcp-proxy/unknown/mcp',
        url: '/v1/.ai/mcp-proxy/unknown/mcp',
        method: 'GET',
        headers: {},
        body: undefined,
      };

      mockMcpProxyService.proxyRequest.mockRejectedValue(new Error('boom'));

      const { res } = createMockRes();
      await controller.proxyToMcp('unknown', mockReq, res);

      expect(res.status).toHaveBeenCalledWith(502);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Failed to proxy request' }),
      );
    });

    it('ends the response with no body when the upstream has none', async () => {
      const mockReq = {
        path: '/v1/.ai/mcp-proxy/test-server/mcp',
        url: '/v1/.ai/mcp-proxy/test-server/mcp',
        method: 'DELETE',
        headers: {},
        body: undefined,
      };

      mockMcpProxyService.proxyRequest.mockResolvedValue({
        status: 204,
        headers: {},
        body: null,
      });

      const { res, getBody } = createMockRes();
      await controller.proxyToMcp('test-server', mockReq, res);

      expect(res.status).toHaveBeenCalledWith(204);
      expect(getBody()).toBe('');
    });
  });

  // Regression test: with Express 5 / path-to-regexp v8 (as used by this project), a bare
  // trailing `*` in a route (the previous `:id/mcp/*` pattern) throws "Missing parameter
  // name" at route-registration time, crashing the whole app on startup. This boots a real
  // Express HTTP server on top of the controller to make sure the route registers and both
  // the bare endpoint and a sub-path resolve.
  describe('route registration (Express 5 compatibility)', () => {
    let app: NestExpressApplication;

    beforeEach(async () => {
      mockMcpProxyService.proxyRequest.mockResolvedValue({
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: webStreamFromString('{"ok":true}'),
      });

      const module: TestingModule = await Test.createTestingModule({
        controllers: [McpProxyController],
        providers: [{ provide: McpProxyService, useValue: mockMcpProxyService }],
      }).compile();

      app = module.createNestApplication<NestExpressApplication>();
      await app.init();
    });

    afterEach(async () => {
      await app.close();
    });

    it('registers and matches the bare MCP endpoint with no sub-path', async () => {
      await request(app.getHttpServer())
        .post('/.ai/mcp-proxy/test-server/mcp')
        .send({ jsonrpc: '2.0', id: 1, method: 'tools/list' })
        .expect(200);

      expect(mockMcpProxyService.proxyRequest).toHaveBeenCalledWith(
        'test-server',
        'POST',
        '/mcp',
        expect.any(Object),
        expect.any(Object),
      );
    });

    it('still matches a sub-path under /mcp/', async () => {
      await request(app.getHttpServer())
        .get('/.ai/mcp-proxy/test-server/mcp/sub/path')
        .expect(200);

      expect(mockMcpProxyService.proxyRequest).toHaveBeenCalledWith(
        'test-server',
        'GET',
        '/mcp/sub/path',
        expect.any(Object),
        undefined,
      );
    });
  });
});
