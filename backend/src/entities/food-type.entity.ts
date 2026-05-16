import { Entity, PrimaryGeneratedColumn, Column, ManyToMany } from 'typeorm';
import { Area } from './area.entity';

@Entity('food_types')
export class FoodType {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  food_name: string; // VD: 'Thịt bò', 'Rau củ'

  // Kiểu 'float' để lưu số thập phân (VD: 24.5 độ)
  @Column('float')
  min_temp: number;

  @Column('float')
  max_temp: number;

  @Column('float')
  min_humi: number;

  @Column('float')
  max_humi: number;

  @ManyToMany(() => Area, (area) => area.food_types)
  areas: Area[];
}