import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IotController } from './iot.controller';
import { IotService } from './iot.service';
import { Device } from '../entities/device.entity';
import { DeviceSchedule } from '../entities/device-schedule.entity';
import { ActionLog } from '../entities/action-log.entity';
import { MqttService } from '../mqtt/mqtt.service';
import { SensorReading } from '../entities/sensor-reading.entity';
import { AppGateway } from '../gateway/app.gateway';

@Module({
  imports: [
    // 🌟 ĐÃ XÓA ScheduleModule.forRoot() ở đây để tránh chạy song song trùng lặp lệnh
    TypeOrmModule.forFeature([
      Device,
      DeviceSchedule,
      ActionLog,
      SensorReading,
    ]),
  ],
  controllers: [IotController],
  providers: [IotService, MqttService, AppGateway],
})
export class IotModule {}