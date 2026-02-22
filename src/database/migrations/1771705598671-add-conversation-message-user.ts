import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class AddConversationMessageUser1771705598671 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create user table first (no dependencies)
    await queryRunner.createTable(
      new Table({
        name: 'user',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'uuid',
          },
          {
            name: 'external_id',
            type: 'varchar',
            length: '1024',
            isNullable: true,
          },
          {
            name: 'family_name',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'given_name',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'short_name',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'is_bot',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'creation_time',
            type: 'timestamp with time zone',
            isNullable: false,
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'deletion_time',
            type: 'timestamp with time zone',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create conversation table
    await queryRunner.createTable(
      new Table({
        name: 'conversation',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'uuid',
          },
          {
            name: 'external_id',
            type: 'varchar',
            length: '1024',
            isNullable: true,
          },
          {
            name: 'owner_user_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'creation_time',
            type: 'timestamp with time zone',
            isNullable: false,
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'deletion_time',
            type: 'timestamp with time zone',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create message table
    await queryRunner.createTable(
      new Table({
        name: 'message',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'uuid',
          },
          {
            name: 'external_id',
            type: 'varchar',
            length: '1024',
            isNullable: true,
          },
          {
            name: 'conversation_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'author_user_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'content',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'creation_time',
            type: 'timestamp with time zone',
            isNullable: false,
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'deletion_time',
            type: 'timestamp with time zone',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Add foreign key constraints
    await queryRunner.createForeignKey(
      'conversation',
      new TableForeignKey({
        columnNames: ['owner_user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'user',
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createForeignKey(
      'message',
      new TableForeignKey({
        columnNames: ['conversation_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'conversation',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'message',
      new TableForeignKey({
        columnNames: ['author_user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'user',
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    const messageTable = await queryRunner.getTable('message');
    if (messageTable) {
      const foreignKeys = messageTable.foreignKeys.filter(
        (fk) => ['conversation_id', 'author_user_id'].includes(fk.columnNames[0]),
      );
      for (const fk of foreignKeys) {
        await queryRunner.dropForeignKey('message', fk);
      }
    }

    const conversationTable = await queryRunner.getTable('conversation');
    const conversationForeignKey = conversationTable?.foreignKeys.find(
      (fk) => fk.columnNames[0] === 'owner_user_id',
    );
    if (conversationForeignKey) {
      await queryRunner.dropForeignKey('conversation', conversationForeignKey);
    }

    // Drop tables
    await queryRunner.dropTable('message', true);
    await queryRunner.dropTable('conversation', true);
    await queryRunner.dropTable('user', true);
  }
}
