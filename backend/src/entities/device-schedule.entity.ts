import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { Device } from './device.entity';

@Entity('device_schedules')
export class DeviceSchedule {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  action: string; // Lệnh gửi đi (VD: 'ON', 'OFF', 'MODE_1')

  @Column({ type: 'time' })
  start_time: string; // Giờ bắt đầu (Định dạng HH:mm)

  @Column({ type: 'time', nullable: true })
  end_time: string; // Giờ kết thúc (Nếu có)

  @Column({ default: true })
  is_active: boolean; // Trạng thái lịch (Bật/Tắt lịch)

  @ManyToOne(() => Device)
  device: Device;

  @CreateDateColumn()
  created_at: Date;
}
