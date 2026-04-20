import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TelemetryController } from './telemetry.controller';
import { TelemetryService } from './telemetry.service';
import { SensorReading } from '../entities/sensor-reading.entity';
import { ActionLog } from '../entities/action-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SensorReading, ActionLog])],
  controllers: [TelemetryController],
  providers: [TelemetryService],
})
export class TelemetryModule {}
