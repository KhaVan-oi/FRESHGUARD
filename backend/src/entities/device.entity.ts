import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Area } from './area.entity';

@Entity('DEVICES')
export class Device {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  device_code: string; // Nhập từ Web, VD: 'DHT_TU_01'

  @Column()
  device_name: string; // VD: 'Cảm biến nhiệt Khu vực 1'

  @Column()
  device_type: string; // 'SENSOR' hoặc 'ACTUATOR'

  @Column({ nullable: true })
  adafruit_feed_key: string; // FE tự nhập luông, VD: 'nhietdo1'

  @Column({ default: 'ONLINE' })
  status: string;

  // Thiết bị này được khoan/lắp vào khu vực nào?
  @ManyToOne(() => Area, (area) => area.devices)
  @JoinColumn({ name: 'area_id' })
  area: Area;
}
