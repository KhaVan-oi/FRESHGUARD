import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';

// Import 5 cái Module con
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { FacilitiesModule } from './facilities/facilities.module';
import { IotModule } from './iot/iot.module';
import { TelemetryModule } from './telemetry/telemetry.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    // 1. Cấu hình Database
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: '',
      database: 'freshguard',
      // Tự động quét hết tất cả Entity trong các folder
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: false, // Tự tạo bảng mới nếu chưa có
    }),

    // 2. Kích hoạt tính năng Hẹn giờ tự động
    ScheduleModule.forRoot(),

    // 3. Nạp 5 Module chức năng vào hệ thống
    AuthModule,
    UsersModule,
    FacilitiesModule,
    IotModule,
    TelemetryModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
