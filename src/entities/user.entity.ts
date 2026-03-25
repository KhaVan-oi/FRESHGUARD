import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { Area } from './area.entity';

@Entity('USERS')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  username: string;

  // 🌟 THÊM DÒNG NÀY VÔ NÈ ÔNG
  @Column()
  password: string;

  @Column({ default: 'OPERATOR' })
  role: string;

  @Column({ nullable: true })
  full_name: string;

  @ManyToMany(() => Area, (area) => area.operators)
  @JoinTable({ name: 'user_area_management' })
  managed_areas: Area[];
}
