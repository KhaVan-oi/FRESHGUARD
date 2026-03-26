import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('FOOD_TYPES')
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
}
