import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  ManyToMany,
  JoinColumn,
  JoinTable
} from 'typeorm';
import { Warehouse } from './warehouse.entity';
import { Device } from './device.entity';
import { FoodType } from './food-type.entity';
import { User } from './user.entity';

@Entity('areas')
export class Area {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  area_name: string;

  @Column({ default: 30 }) // Mặc định 30 giây báo động cửa
  auto_door_timeout_sec: number;

  // 1. Nằm trong Kho nào?
  @ManyToOne(() => Warehouse, (warehouse) => warehouse.areas)
  @JoinColumn({ name: 'warehouse_id' })
  warehouse: Warehouse;

  // 2. Chứa Thực phẩm gì?
  @ManyToMany(() => FoodType)
  @JoinTable({
    name: 'area_food_types', 
    joinColumn: { name: 'area_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'food_type_id', referencedColumnName: 'id' },
  })
  food_types: FoodType[];


  // 3. Có những Thiết bị nào?
  @OneToMany(() => Device, (device) => device.area)
  devices: Device[];

  // 4. Bị quản lý bởi ai? (Quan hệ Nhiều - Nhiều)
  @ManyToMany(() => User, (user) => user.areas)
  @JoinTable({
    name: 'user_area_management', // Tên bảng trung gian
    joinColumn: { name: 'area_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'user_id', referencedColumnName: 'id' },
  })
  operators: User[];

  @Column({ type: 'varchar', length: 20, default: 'AUTO' })
  operating_mode: string;

  @Column({ type: 'int', default: 30 })
  manual_override_mins: number;
}
