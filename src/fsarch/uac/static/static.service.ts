import { Inject, Injectable } from '@nestjs/common';
import { IUacService } from '../interfaces/uac-service.interface.js';
import { ModuleConfigurationService } from '../../configuration/module/module-configuration.service.js';
import { ConfigUacType } from '../../configuration/config.type.js';

@Injectable()
export class StaticUacService implements IUacService {
  constructor(
    @Inject('UAC_CONFIG')
    private readonly uacConfigService: ModuleConfigurationService<ConfigUacType>,
  ) {}

  async hasGrant(subjectId: string, roles: Array<string>): Promise<boolean> {
    const user = this.uacConfigService
      .get('users')
      .find((user) => user.user_id === subjectId);

    if (!user) {
      return false;
    }

    return roles.some((role) => {
      return user.permissions.includes(role);
    });
  }
}
