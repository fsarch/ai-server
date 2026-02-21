import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, DeleteDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import type { Conversation } from './conversation.entity.js';
import type { User } from './user.entity.js';

@Entity('message')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 1024, nullable: true })
  external_id: string | null;

  @Column({ type: 'uuid' })
  conversation_id: string;

  @Column({ type: 'uuid', nullable: true })
  author_user_id: string | null;

  @Column({ type: 'text', nullable: true })
  content: string | null;

  @ManyToOne('Conversation', 'messages', {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'conversation_id' })
  conversation: Conversation;

  @ManyToOne('User', 'authored_messages', {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'author_user_id' })
  author_user: User | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  creation_time: Date;

  @DeleteDateColumn({ type: 'timestamp with time zone', nullable: true })
  deletion_time: Date | null;
}
