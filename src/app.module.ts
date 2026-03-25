import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppGateway } from './gateway/app.gateway'; //Gateway cho Realtimes

// Đăng ký 7 thực thể (DB)
import { Warehouse } from './entities/warehouse.entity';
import { Area } from './entities/area.entity';
import { User } from './entities/user.entity';
import { FoodType } from './entities/food-type.entity';
import { Device } from './entities/device.entity';
import { SensorReading } from './entities/sensor-reading.entity';
import { ActionLog } from './entities/action-log.entity';

// Import cái Module MQTT
import { MqttModule } from './mqtt/mqtt.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(), // Kích hoạt crosscron

    TypeOrmModule.forRoot({
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: '',
      database: 'freshguard',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: false, // Tự động tạo bảng DB
    }),

    // KHAI BÁO 7 BẢNG
    TypeOrmModule.forFeature([
      Warehouse,
      Area,
      User,
      FoodType,
      Device,
      SensorReading,
      ActionLog,
    ]),

    MqttModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
