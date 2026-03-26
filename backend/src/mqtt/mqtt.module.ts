import { Module } from '@nestjs/common';
import { MqttService } from './mqtt.service';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Device } from '../entities/device.entity';
import { SensorReading } from '../entities/sensor-reading.entity';
import { ActionLog } from '../entities/action-log.entity';
import { FoodType } from '../entities/food-type.entity';
import { Area } from '../entities/area.entity';
import { AppGateway } from '../gateway/app.gateway';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Device,
      SensorReading,
      ActionLog,
      Area,
      FoodType,
    ]),
  ],
  providers: [MqttService, AppGateway],
  exports: [MqttService], // Phải có dòng export này và class tên MqttModule nha!
})
export class MqttModule {} // Chữ MqttModule này phải khớp y chang với bên app.module.ts
