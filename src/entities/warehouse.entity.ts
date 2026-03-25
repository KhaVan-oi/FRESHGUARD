import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Area } from './area.entity';

@Entity('WAREHOUSES')
export class Warehouse {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  warehouse_name: string;

  // 1 Kho có nhiều Khu vực
  @OneToMany(() => Area, (area) => area.warehouse)
  areas: Area[];
}
