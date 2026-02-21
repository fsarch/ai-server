import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, DeleteDateColumn, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import type { Message } from './message.entity.js';
import type { User } from './user.entity.js';

@Entity('conversation')
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 1024, nullable: true })
  external_id: string | null;

  @Column({ type: 'uuid', nullable: true })
  owner_user_id: string | null;

  @ManyToOne('User', 'owned_conversations', {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'owner_user_id' })
  owner_user: User | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  creation_time: Date;

  @DeleteDateColumn({ type: 'timestamp with time zone', nullable: true })
  deletion_time: Date | null;

  @OneToMany('Message', 'conversation', {
    cascade: true,
    onDelete: 'CASCADE',
  })
  messages: Message[];
}
