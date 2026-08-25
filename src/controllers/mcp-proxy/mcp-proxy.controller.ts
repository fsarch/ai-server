import {
  All,
  Controller,
  Param,
  Req,
  Res,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Readable } from 'node:stream';
import { McpProxyService } from '../../repositories/mcp-proxy.service.js';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';

@ApiTags('mcp-proxy')
@Controller({
  path: '.ai/mcp-proxy',
  version: '1',
})
@ApiBearerAuth()
export class McpProxyController {
  private readonly logger = new Logger(McpProxyController.name);

  constructor(private readonly mcpProxyService: McpProxyService) {}

  // `{/*splat}` is an optional wildcard group (path-to-regexp v8 / Express 5 syntax - a bare
  // trailing `*` is no longer valid there). This matches both the exact MCP endpoint
  // (`/:id/mcp`, as used by the Streamable-HTTP transport, which has no sub-paths) and any
  // sub-path a non-standard MCP server might expose under `/mcp/`.
  @All(':id/mcp{/*splat}')
  @ApiOperation({ summary: 'Proxy requests to configured MCP servers' })
  @ApiParam({ name: 'id', description: 'MCP server ID from configuration' })
  async proxyToMcp(
    @Param('id') id: string,
    @Req() req: any,
    @Res() res: any,
  ) {
    const targetPath = this.buildTargetPath(id, req);

    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(req.headers)) {
      if (typeof value === 'string') {
        headers[key] = value;
      } else if (Array.isArray(value)) {
        headers[key] = value[0];
      }
    }

    let response;
    try {
      response = await this.mcpProxyService.proxyRequest(
        id,
        req.method,
        targetPath,
        headers,
        req.body,
      );
    } catch (error) {
      this.logger.error(`Failed to proxy request to MCP server '${id}': ${error}`);
      res.status(HttpStatus.BAD_GATEWAY).json({
        message: 'Failed to proxy request',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return;
    }

    for (const [key, value] of Object.entries(response.headers)) {
      // Skip some headers that shouldn't be forwarded
      if (
        !['transfer-encoding', 'connection', 'keep-alive'].includes(
          key.toLowerCase(),
        )
      ) {
        res.setHeader(key, value);
      }
    }
    res.status(response.status);

    if (!response.body) {
      res.end();
      return;
    }

    try {
      await new Promise<void>((resolve, reject) => {
        const nodeStream = Readable.fromWeb(response.body as any);
        nodeStream.on('error', reject);
        res.on('finish', resolve);
        res.on('error', reject);
        nodeStream.pipe(res);
      });
    } catch (error) {
      this.logger.error(`Error while streaming MCP response for '${id}': ${error}`);
      if (!res.headersSent) {
        res.status(HttpStatus.BAD_GATEWAY).json({
          message: 'Failed to proxy request',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      } else {
        res.end();
      }
    }
  }

  /**
   * Extracts everything after `/:id/mcp` (empty string for the bare endpoint) plus any
   * query string, and prefixes it with `/mcp` again to build the path forwarded to
   * `McpProxyService`.
   */
  private buildTargetPath(id: string, req: any): string {
    const marker = `/${id}/mcp`;
    const markerIndex = req.path.indexOf(marker);
    const subPath = markerIndex !== -1 ? req.path.substring(markerIndex + marker.length) : '';

    const queryIndex = req.url.indexOf('?');
    const queryString = queryIndex !== -1 ? req.url.substring(queryIndex) : '';

    return `/mcp${subPath}${queryString}`;
  }
}
