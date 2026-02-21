export class UserDto {
  id: string;
  external_id: string | null;
  family_name: string;
  given_name: string;
  short_name: string;
  creation_time: Date;
  deletion_time: Date | null;
}
