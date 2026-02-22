import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, DeleteDateColumn, OneToMany } from 'typeorm';
import type { Conversation } from './conversation.entity.js';
import type { Message } from './message.entity.js';

@Entity('user')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 1024, nullable: true })
  external_id: string | null;

  @Column({ type: 'varchar', length: 1024 })
  family_name: string;

  @Column({ type: 'varchar', length: 1024 })
  given_name: string;

  @Column({ type: 'varchar', length: 1024 })
  short_name: string;

  @Column({ type: 'boolean', default: false })
  is_bot: boolean;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  creation_time: Date;

  @DeleteDateColumn({ type: 'timestamp with time zone', nullable: true })
  deletion_time: Date | null;

  @OneToMany('Conversation', 'owner_user', {
    onDelete: 'SET NULL',
  })
  owned_conversations: Conversation[];

  @OneToMany('Message', 'author_user', {
    onDelete: 'SET NULL',
  })
  authored_messages: Message[];
}
