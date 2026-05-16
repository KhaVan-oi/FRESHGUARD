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
  // Biến static lưu các schedule ID đã xử lý trong phút hiện tại để chống trùng tuyệt đối
  private static lastProcessedMinute: string = '';
  private static processedScheduleIdsInMinute = new Set<number>();

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

  async createDevice(data: Partial<Device> & { area?: { id: number } }) {
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
    this.mqttService.publishToAdafruit(deviceId, action);

    const device = await this.deviceRepo.findOne({
      where: { adafruit_feed_key: deviceId },
      relations: ['area'],
    });

    if (!device)
      throw new HttpException('Không tìm thấy thiết bị!', HttpStatus.NOT_FOUND);

    let cooldownMsg = '';
    if (device.area) {
      const cooldownMins = (device.area as any).manual_override_mins || 30;
      this.mqttService.setManualCooldown(device.area.id, cooldownMins);
      cooldownMsg = ` Auto nhường Sếp ${cooldownMins} phút.`;
    }

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

  // ⏰ HÀM CRON CHẠY TỰ ĐỘNG MỖI PHÚT - ĐÃ FIX MÚI GIỜ & CHỐNG DUPLICATE LOG
  @Cron(CronExpression.EVERY_MINUTE)
  async handleCron() {
    // 🌟 Lấy thời gian hiện tại theo Múi giờ Việt Nam (Asia/Ho_Chi_Minh)
    const options = { timeZone: 'Asia/Ho_Chi_Minh', hour12: false } as const;
    const localDateStr = new Date().toLocaleString('en-US', options);
    const localDate = new Date(localDateStr);

    const currentTime =
      localDate.getHours().toString().padStart(2, '0') +
      ':' +
      localDate.getMinutes().toString().padStart(2, '0');

    console.log(`⏰ [CRON] Đang quét lịch hẹn lúc: ${currentTime} (Giờ Việt Nam)`);

    // Reset danh sách ID đã quét nếu hệ thống bước sang phút mới
    if (IotService.lastProcessedMinute !== currentTime) {
      IotService.lastProcessedMinute = currentTime;
      IotService.processedScheduleIdsInMinute.clear();
    }

    // Tìm các lịch đang kích hoạt và khớp giờ bắt đầu
    const schedules = await this.scheduleRepo.find({
      where: { is_active: true, start_time: currentTime },
      relations: ['device', 'device.area'],
    });

    for (const schedule of schedules) {
      // 🌟 GUARD CHỐNG DUPLICATE TUYỆT ĐỐI: Bỏ qua nếu ID lịch trình này đã chạy trong phút này
      if (IotService.processedScheduleIdsInMinute.has(schedule.id)) {
        console.warn(
          `[CRON] Bỏ qua schedule ID=${schedule.id} — đã thực hiện xử lý trong phút này để tránh trùng log.`,
        );
        continue;
      }
      IotService.processedScheduleIdsInMinute.add(schedule.id);

      console.log(
        `🚀 [AUTO] Kích hoạt lệnh ${schedule.action} cho ${schedule.device.device_name}`,
      );
      this.mqttService.publishToAdafruit(
        schedule.device.adafruit_feed_key,
        schedule.action,
      );

      // Lưu nhật ký hệ thống — Cam đoan ra đúng 1 dòng duy nhất và đúng múi giờ
      await this.actionLogRepo.save(
        this.actionLogRepo.create({
          action_type: 'AUTO_SCHEDULE',
          action_value: `Hệ thống tự động thực hiện lịch hẹn: ${schedule.action}`,
          trigger_source: 'SYSTEM',
          device: schedule.device,
          area: schedule.device.area ?? undefined,
        }),
      );
    }
  }

  async createSchedule(data: any) {
    return await this.scheduleRepo.save(this.scheduleRepo.create(data));
  }

  async getAllSchedules() {
    return await this.scheduleRepo.find({ relations: ['device'] });
  }

  async updateSchedule(id: number, body: any) {
    await this.scheduleRepo.update(id, body);
    return await this.scheduleRepo.findOneBy({ id });
  }

  async removeSchedule(id: number) {
    return await this.scheduleRepo.delete(id);
  }
}