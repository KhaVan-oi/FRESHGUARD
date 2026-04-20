import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Area } from './area.entity';

@Entity('USERS')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  username: string;

  @Column()
  password: string;

  @Column({ default: 'OPERATOR' })
  role: string;

  @Column({ nullable: true })
  full_name: string;

  @OneToMany(() => Area, (area) => area.user)
  areas: Area[];
}
