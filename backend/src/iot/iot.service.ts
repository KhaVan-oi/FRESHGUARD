import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Device } from '../entities/device.entity';
import { ActionLog } from '../entities/action-log.entity';
import { MqttService } from '../mqtt/mqtt.service';
import { DeviceSchedule } from '../entities/device-schedule.entity';

@Injectable()
export class IotService {
  constructor(
    @InjectRepository(Device) private deviceRepo: Repository<Device>,
    @InjectRepository(ActionLog) private actionLogRepo: Repository<ActionLog>,
    @InjectRepository(DeviceSchedule)
    private scheduleRepo: Repository<DeviceSchedule>,
    private mqttService: MqttService,
  ) {}

  // ---- CRUD DEVICES ----
  async getAllDevices() {
    return await this.deviceRepo.find({ relations: ['area'] });
  }

  async createDevice(data: Partial<Device>) {
    return await this.deviceRepo.save(this.deviceRepo.create(data));
  }

  async updateDevice(id: number, data: Partial<Device>) {
    await this.deviceRepo.update(id, data);
    return true;
  }

  async deleteDevice(id: number) {
    await this.deviceRepo.delete(id);
    return true;
  }

  async controlDevice(deviceId: string, action: string) {
    // 1. Gửi lệnh xuống Adafruit
    this.mqttService.publishToAdafruit(deviceId, action);

    // 2. Tìm thiết bị trong DB
    const device = await this.deviceRepo.findOne({
      where: { adafruit_feed_key: deviceId },
      relations: ['area'],
    });

    if (!device)
      throw new HttpException('Không tìm thấy thiết bị!', HttpStatus.NOT_FOUND);

    // 3. Logic Nhường quyền Auto (Cooldown)
    let cooldownMsg = '';
    if (device.area) {
      const cooldownMins = (device.area as any).manual_override_mins || 30;
      this.mqttService.setManualCooldown(device.area.id, cooldownMins);
      cooldownMsg = ` Auto nhường Sếp ${cooldownMins} phút.`;
    }

    // 4. Ghi Log
    await this.actionLogRepo.save(
      this.actionLogRepo.create({
        device: device,
        action_type: 'MANUAL_CONTROL',
        action_value: `Điều khiển thủ công: lệnh ${action} cho ${device.device_name}.${cooldownMsg}`,
        trigger_source: 'MANUAL',
        area: device.area,
      }),
    );

    return cooldownMsg;
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async handleCron() {
    const now = new Date();
    // Lấy giờ hiện tại định dạng HH:mm
    const currentTime =
      now.getHours().toString().padStart(2, '0') +
      ':' +
      now.getMinutes().toString().padStart(2, '0');

    console.log(`⏰ [CRON] Đang quét lịch hẹn lúc: ${currentTime}`);

    // Tìm các lịch đang kích hoạt và khớp giờ bắt đầu
    const schedules = await this.scheduleRepo.find({
      where: { is_active: true, start_time: currentTime },
      relations: ['device'],
    });

    for (const schedule of schedules) {
      console.log(
        `🚀 [AUTO] Kích hoạt lệnh ${schedule.action} cho ${schedule.device.device_name}`,
      );
      this.mqttService.publishToAdafruit(
        schedule.device.adafruit_feed_key,
        schedule.action,
      );

      // Ghi Log hệ thống
      await this.actionLogRepo.save(
        this.actionLogRepo.create({
          action_type: 'AUTO_SCHEDULE',
          action_value: `Hệ thống tự động thực hiện lịch hẹn: ${schedule.action}`,
          trigger_source: 'SYSTEM',
          device: schedule.device,
        }),
      );
    }
  }

  // API CRUD Lịch hẹn cho người dùng chỉnh
  async createSchedule(data: any) {
    return await this.scheduleRepo.save(this.scheduleRepo.create(data));
  }

  async getAllSchedules() {
    return await this.scheduleRepo.find({ relations: ['device'] });
  }
}
