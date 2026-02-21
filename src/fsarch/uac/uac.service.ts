import { Injectable } from '@nestjs/common';
import { IUacService } from './interfaces/uac-service.interface.js';
import { StaticUacService } from './static/static.service.js';

@Injectable()
export class UacService implements IUacService {
  private readonly uacService: IUacService;

  constructor(private readonly staticUacService: StaticUacService) {
    const authType = 'static';
    this.uacService = authType === 'static' ? staticUacService : undefined;
  }

  hasGrant(subjectId: string, roles: Array<string>): Promise<boolean> {
    return this.uacService.hasGrant(subjectId, roles);
  }
}
