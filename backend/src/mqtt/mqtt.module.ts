import { Module } from '@nestjs/common';
import { MqttService } from './mqtt.service'; // 🌟 Dòng này bị lỡ tay xóa mất nè!

@Module({
  imports: [],
  controllers: [],
  providers: [MqttService],
  exports: [MqttService],
})
export class MqttModule {}
