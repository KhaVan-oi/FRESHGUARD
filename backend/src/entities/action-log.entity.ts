import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Area } from './area.entity';
import { Device } from './device.entity';

@Entity('ACTION_LOGS')
export class ActionLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  action_type: string; // VD: 'TURN_ON', 'CHANGE_FOOD', 'ALERT_HIGH_TEMP'

  @Column()
  action_value: string; // VD: 'Bật quạt', 'Đổi sang Thịt bò', 'Nhiệt độ lên 30 độ'

  @Column()
  trigger_source: string; // 3 loại: 'MANUAL', 'AUTO', 'SCHEDULE'

  @CreateDateColumn()
  created_at: Date;

  // Ai làm? (Có thể NULL nếu là AUTO hoặc SCHEDULE)
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  // Xảy ra ở Tủ nào?
  @ManyToOne(() => Area)
  @JoinColumn({ name: 'area_id' })
  area: Area;
  // Thao tác trên Thiết bị nào? (Có thể NULL nếu thao tác đổi thực phẩm)
  @ManyToOne(() => Device, { nullable: true })
  @JoinColumn({ name: 'device_id' })
  device: Device;
}
