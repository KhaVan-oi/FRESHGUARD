import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  ManyToMany,
  JoinColumn,
} from 'typeorm';
import { Warehouse } from './warehouse.entity';
import { Device } from './device.entity';
import { FoodType } from './food-type.entity';
import { User } from './user.entity';

@Entity('AREAS')
export class Area {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  area_name: string;

  @Column({ default: 30 }) // Mặc định 30 giây báo động cửa
  auto_door_timeout_sec: number;

  @Column({ default: 5 }) // Mặc định 5 phút ưu tiên chỉnh tay
  manual_override_mins: number;

  // 1. Nằm trong Kho nào?
  @ManyToOne(() => Warehouse, (warehouse) => warehouse.areas)
  @JoinColumn({ name: 'warehouse_id' })
  warehouse: Warehouse;

  // 2. Chứa Thực phẩm gì?
  @ManyToOne(() => FoodType, { nullable: true })
  @JoinColumn({ name: 'current_food_type_id' })
  current_food_type: FoodType;

  // 3. Có những Thiết bị nào?
  @OneToMany(() => Device, (device) => device.area)
  devices: Device[];

  // 4. Bị quản lý bởi ai? (Quan hệ Nhiều - Nhiều)
  @ManyToMany(() => User, (user) => user.managed_areas)
  operators: User[];
}
