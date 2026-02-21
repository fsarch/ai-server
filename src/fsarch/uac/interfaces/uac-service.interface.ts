export interface IUacService {
  hasGrant(subjectId: string, roles: Array<string>): Promise<boolean>;
}
