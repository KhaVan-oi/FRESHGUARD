import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  BeforeInsert,
} from 'typeorm';
import { User } from './user.entity';
import { Area } from './area.entity';
import { Device } from './device.entity';

@Entity('action_logs')
export class ActionLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  action_type: string;

  @Column()
  action_value: string;

  @Column()
  trigger_source: string;

  @Column({ type: 'datetime' })
  created_at: Date;

  // Lưu thời gian UTC chuẩn — frontend convert sang giờ VN khi hiển thị
  @BeforeInsert()
  setCreatedAt() {
    this.created_at = new Date(); // UTC thật, không giả lập timezone
  }

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

  @Column({ default: false })
  is_resolved: boolean; // Trạng thái đã xử lý chưa?

  @Column({ default: false })
  is_escalated: boolean;

  @Column({ type: 'timestamp', nullable: true })
  resolved_at: Date; // Thời gian bấm xác nhận

  @Column({ type: 'text', nullable: true })
  resolve_note: string; // Lý do xử lý (VD: "Đã đóng cửa kho")
}