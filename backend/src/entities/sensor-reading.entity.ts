import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Device } from './device.entity';

@Entity('SENSOR_READINGS')
export class SensorReading {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  sensor_type: string; // 'TEMP', 'HUMI', 'LIGHT'

  @Column('float')
  reading_value: number;

  @CreateDateColumn()
  recorded_at: Date;

  @ManyToOne(() => Device)
  @JoinColumn({ name: 'device_id' })
  device: Device;
}
