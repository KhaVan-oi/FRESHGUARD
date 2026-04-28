import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull } from 'typeorm';
import * as mqtt from 'mqtt';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AppGateway } from '../gateway/app.gateway';

import { Device } from '../entities/device.entity';
import { SensorReading } from '../entities/sensor-reading.entity';
import { ActionLog } from '../entities/action-log.entity';

@Injectable()
export class MqttService implements OnModuleInit {
  private client!: mqtt.MqttClient;

  // 🌟 RAM ẢO - Sổ tay nhớ Cửa mở
  private doorTimers = new Map<number, NodeJS.Timeout>();

  // 🌟 RAM ẢO - Sổ tay nhớ lệnh "Nhường quyền cho sếp" (Cooldown)
  private manualOverrides = new Map<number, number>();

  constructor(
    @InjectRepository(Device) private deviceRepo: Repository<Device>,
    @InjectRepository(SensorReading)
    private readingRepo: Repository<SensorReading>,
    @InjectRepository(ActionLog) private logRepo: Repository<ActionLog>,
    private appGateway: AppGateway,
  ) {}

  onModuleInit() {
    const clientId = `mqtt_${Math.random().toString(16).slice(3)}`;
    const adafruitUser = process.env.ADAFRUIT_USERNAME;
    const adafruitKey = process.env.ADAFRUIT_KEY;

    this.client = mqtt.connect('mqtt://io.adafruit.com', {
      clientId,
      username: adafruitUser,
      password: adafruitKey,
    });

    this.client.on('connect', () => {
      console.log('Đã kết nối MQTT Adafruit thành công!');
      this.client.subscribe(`${adafruitUser}/feeds/+`);
    });

    // ==========================================
    // LOGIC XỬ LÝ SỰ KIỆN TỪ YOLO:BIT
    // ==========================================
    this.client.on('message', async (topic, payload) => {
      const feedKey = topic.split('/').pop();
      const value = payload.toString();

      if (!isNaN(Number(feedKey))) return;
      console.log(`Nhận data từ [${feedKey}]: ${value}`);

      const numericValue = parseFloat(value);

      // 1. TÌM THIẾT BỊ TRONG DATABASE
      const device = await this.deviceRepo.findOne({
        where: { adafruit_feed_key: feedKey },
        relations: ['area', 'area.food_types', 'area.operators'],
      });

      if (!device) return;

      const area = device.area;
      const areaId = area?.id;

      // Realtime Update Giao Diện
      this.appGateway.emitRealtimeData('live_sensor_data', {
        khu_vuc: area ? area.area_name : 'Không xác định',
        thiet_bi: feedKey,
        loai_cam_bien: device.device_type,
        gia_tri: value,
      });

      // ==========================================
      // 2. NGHIỆP VỤ NÚT BẤM DẠNG CHỮ (CỬA, SOS, ĐIỀU KHIỂN)
      // ==========================================
      if (isNaN(numericValue)) {
        device.status = value;
        await this.deviceRepo.save(device);

        // 🚪 LOGIC CẢM BIẾN CỬA (Có nhớ quá khứ 30s)
        if (device.device_type === 'DOOR_SENSOR' && areaId) {
          if (value === '1' || value === 'ON') {
            console.log(`🚪 Cửa khu vực [${area.area_name}] ĐANG MỞ!`);
            this.publishToAdafruit('den1', 'MODE_1');

            if (!this.doorTimers.has(areaId)) {
              const timeoutSec = (area as any).auto_door_timeout_sec || 30;

              const timer = setTimeout(() => {
                console.log(
                  `🚨 Cảnh báo: Cửa [${area.area_name}] mở quá ${timeoutSec} giây!`,
                );
                this.publishToAdafruit('led_matrix', 'YELLOW_BLINK');

                this.logRepo.save(
                  this.logRepo.create({
                    action_type: 'DOOR_WARNING',
                    action_value: `Cửa mở quá ${timeoutSec}s, đã kích hoạt báo động!`,
                    trigger_source: 'AUTO',
                    area: area,
                    device: device,
                  }),
                );
              }, timeoutSec * 1000);

              this.doorTimers.set(areaId, timer);
            }
          } else if (value === '0' || value === 'OFF') {
            console.log(`✅ Cửa khu vực [${area.area_name}] Đã đóng.`);
            this.publishToAdafruit('den1', 'OFF');
            this.publishToAdafruit('led_matrix', 'GREEN');

            if (this.doorTimers.has(areaId)) {
              clearTimeout(this.doorTimers.get(areaId));
              this.doorTimers.delete(areaId);
            }
          }
        }

        // 🚨 NÚT KHẨN CẤP SOS
        if (device.device_type === 'EMERGENCY_BTN') {
          if (value === '1' || value === 'ON') {
            console.log(`KHẨN CẤP! Báo động tại [${area?.area_name}]!`);
            this.publishToAdafruit('led_matrix', 'RED_BLINK');
            this.logRepo.save(
              this.logRepo.create({
                action_type: 'EMERGENCY_SOS',
                action_value: 'Kích hoạt báo động khẩn cấp SOS',
                trigger_source: 'MANUAL',
                area: area,
                device: device,
              }),
            );
          } else {
            console.log(`Đã HỦY báo động khẩn cấp tại [${area?.area_name}].`);
            this.publishToAdafruit('led_matrix', 'GREEN');
          }
        }

        return;
      }

      // ==========================================
      // 3. NGHIỆP VỤ CẢM BIẾN SỐ & LOGIC AUTO (QUẠT)
      // ==========================================
      const newReading = this.readingRepo.create({
        device: device,
        sensor_type: device.device_type,
        reading_value: numericValue,
      });
      await this.readingRepo.save(newReading);

      if (
        (device.device_type === 'TEMP' || device.device_type === 'HUMI') &&
        areaId
      ) {
        // 1. Kiểm tra xem khu vực có thực phẩm nào không (nhớ đổi relations lúc query area thành ['food_types'] nha)
        if (!area || !area.food_types || area.food_types.length === 0) return;

        // 2. Tính toán "Vùng Safe Zone" khắt khe nhất từ danh sách thực phẩm
        const safeZone = area.food_types.reduce(
          (acc, f) => ({
            minT: Math.max(acc.minT, f.min_temp),
            maxT: Math.min(acc.maxT, f.max_temp),
            minH: Math.max(acc.minH, f.min_humi),
            maxH: Math.min(acc.maxH, f.max_humi),
          }),
          { minT: -99, maxT: 99, minH: 0, maxH: 100 },
        );

        // Tách cờ rõ ràng và chuẩn bị biến lưu Log
        let isTooHot = false;
        let isTooCold = false;
        let isWarning = false;
        let isNormal = false;
        let alertType = '';
        let unit = '';

        // Phân luồng Nhiệt độ và Độ ẩm
        if (device.device_type === 'TEMP') {
          isTooHot = numericValue > safeZone.maxT;
          isTooCold = numericValue < safeZone.minT;
          isWarning =
            numericValue >= safeZone.maxT - 1 && numericValue <= safeZone.maxT;
          isNormal =
            numericValue >= safeZone.minT && numericValue <= safeZone.maxT;
          alertType = 'TEMP_ALERT';
          unit = '°C';
        } else if (device.device_type === 'HUMI') {
          isTooHot = numericValue > safeZone.maxH;
          isTooCold = numericValue < safeZone.minH;
          isWarning =
            numericValue >= safeZone.maxH - 5 && numericValue <= safeZone.maxH;
          isNormal =
            numericValue >= safeZone.minH && numericValue <= safeZone.maxH;
          alertType = 'HUMI_ALERT';
          unit = '%';
        }

        // ==========================================
        // THỰC THI LOGIC DỰA TRÊN CÁC CỜ ĐÃ TÍNH
        // ==========================================
        const opMode = (area as any).operating_mode || 'AUTO';
        const expireTime = this.manualOverrides.get(areaId);

        // Gộp chung điều kiện check quyền Manual để code gọn hơn
        const isManualOccupied =
          opMode === 'MANUAL' || (expireTime && Date.now() < expireTime);

        if (isManualOccupied) {
          console.log(
            `[Khu ${areaId}] Đang ở chế độ MANUAL hoặc Sếp chiếm quyền. Auto không can thiệp.`,
          );
        } else {
          // Xóa lệnh chiếm quyền nếu đã hết giờ
          if (this.manualOverrides.has(areaId))
            this.manualOverrides.delete(areaId);

          // 1. NẾU QUÁ NÓNG / QUÁ ẨM -> BẬT QUẠT LÀM MÁT
          if (isTooHot) {
            console.log(
              `CRITICAL! Khu vực [${area.area_name}] QUÁ NÓNG/ẨM! Auto bật Quạt...`,
            );
            this.publishToAdafruit('quat1', 'ON');
            this.publishToAdafruit('led_matrix', 'RED_BLINK');

            await this.logRepo.save(
              this.logRepo.create({
                action_type: alertType,
                action_value: `Quá ngưỡng trên (${numericValue}${unit}). Auto BẬT quạt.`,
                trigger_source: 'AUTO',
                area,
                device,
              }),
            );

            this.appGateway.emitRealtimeData('critical_alert', {
              areaId,
              areaName: area.area_name,
              message: `CRITICAL: Quá nhiệt/ẩm (${numericValue}${unit}). Quạt đã bật!`,
              operatorIds: area.operators
                ? area.operators.map((op) => op.id)
                : [],
            });
          }
          // 2. NẾU QUÁ LẠNH / QUÁ KHÔ -> TẮT QUẠT (nhưng vẫn báo động đỏ vì hư đồ)
          else if (isTooCold) {
            console.log(
              `CRITICAL! Khu vực [${area.area_name}] QUÁ LẠNH/KHÔ! Auto tắt Quạt...`,
            );
            this.publishToAdafruit('quat1', 'OFF');
            this.publishToAdafruit('led_matrix', 'RED_BLINK');

            await this.logRepo.save(
              this.logRepo.create({
                action_type: alertType,
                action_value: `Quá ngưỡng dưới (${numericValue}${unit}). Yêu cầu kiểm tra.`,
                trigger_source: 'AUTO',
                area,
                device,
              }),
            );

            this.appGateway.emitRealtimeData('critical_alert', {
              areaId,
              areaName: area.area_name,
              message: `CRITICAL: Quá lạnh/khô (${numericValue}${unit}). Yêu cầu kiểm tra!`,
              operatorIds: area.operators
                ? area.operators.map((op) => op.id)
                : [],
            });
          }
          // 3. NẾU WARNING SÁT NGƯỠNG -> BÁO CAM & TẮT QUẠT (nếu đang chạy)
          else if (isWarning) {
            console.log(
              `WARNING: Khu vực [${area.area_name}] đang sát ngưỡng (${numericValue}${unit})!`,
            );
            this.publishToAdafruit('quat1', 'OFF');

            this.appGateway.emitRealtimeData('warning_alert', {
              areaId,
              areaName: area.area_name,
              message: `WARNING: Sắp vượt ngưỡng (${numericValue}${unit})!`,
              operatorIds: area.operators
                ? area.operators.map((op) => op.id)
                : [],
            });
          }
          // 4. NẾU BÌNH THƯỜNG -> TẮT QUẠT & MỞ ĐÈN XANH
          else if (isNormal) {
            console.log(`Chỉ số an toàn (${numericValue}${unit}). Tắt quạt!`);
            this.publishToAdafruit('quat1', 'OFF');
            this.publishToAdafruit('led_matrix', 'GREEN');
          }
        }
      }
    }); // <-- Kết thúc sự kiện this.client.on('message')
  } // <-- Kết thúc hàm onModuleInit()

  // ==========================================
  // HÀM MỚI: KÍCH HOẠT NHƯỜNG QUYỀN CHO SẾP (MANUAL COOLDOWN)
  // ==========================================
  public setManualCooldown(areaId: number, cooldownMins: number = 30) {
    const expireTime = Date.now() + cooldownMins * 60 * 1000;
    this.manualOverrides.set(areaId, expireTime);
    console.log(
      `🖐️ Kích hoạt Ghi đè thủ công cho Khu [${areaId}] trong ${cooldownMins} phút. Auto sẽ tạm dừng.`,
    );
  }

  // // ==========================================
  // // ẢO HÓA DỮ LIỆU: CẢM BIẾN CO2
  // // ==========================================
  // @Cron(CronExpression.EVERY_MINUTE)
  // async simulateCO2Sensor() {
  //   const virtualSensors = await this.deviceRepo.find({
  //     where: { device_type: 'CO2_SENSOR' },
  //     relations: ['area'],
  //   });
  //   if (virtualSensors.length === 0) return;

  //   virtualSensors.forEach(async (sensor) => {
  //     const randomCO2 = Math.floor(Math.random() * (450 - 350 + 1)) + 350;
  //     await this.readingRepo.save(
  //       this.readingRepo.create({
  //         device: sensor,
  //         sensor_type: 'CO2',
  //         reading_value: randomCO2,
  //       }),
  //     );

  //     this.appGateway.emitRealtimeData('live_sensor_data', {
  //       khu_vuc: sensor.area ? sensor.area.area_name : 'Khu vực Ảo',
  //       thiet_bi: sensor.adafruit_feed_key,
  //       loai_cam_bien: 'CO2',
  //       gia_tri: randomCO2,
  //     });
  //   });
  // }

  publishToAdafruit(feedKey: string, value: string) {
    const adafruitUser = process.env.ADAFRUIT_USERNAME;
    if (!adafruitUser) return;
    this.client.publish(`${adafruitUser}/feeds/${feedKey}`, value);
  }

  // ==========================================
  // BR-13: LẬP LỊCH THEO TỪNG THIẾT BỊ (SCHEDULED CONTROL)
  // Quét mỗi 1 phút để thực thi lệnh hẹn giờ
  // ==========================================
  @Cron(CronExpression.EVERY_MINUTE)
  async dynamicScheduledControl() {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    // 1. Lấy tất cả thiết bị có cài đặt lịch, kèm thông tin Khu vực & Thực phẩm
    const devices = await this.deviceRepo.find({
      where: [
        { schedule_on_time: Not(IsNull()) },
        { schedule_off_time: Not(IsNull()) },
      ],
      relations: ['area', 'area.food_types'],
    });

    for (const device of devices) {
      const area = device.area;
      if (!area) continue;

      // 🛑 THỰC THI THỨ TỰ ƯU TIÊN BR-13 🛑

      // ƯU TIÊN 1: Nếu Khu vực đang có Manual Override -> Bỏ qua lịch của thiết bị này
      if (this.manualOverrides.has(area.id)) {
        console.log(
          `[Lập lịch] Thiết bị ${device.device_name}: Tạm dừng vì Sếp đang chiếm quyền tại ${area.area_name}.`,
        );
        continue;
      }

      // ƯU TIÊN 2: Nếu Khu vực đang có Báo động (Auto Mode) -> Bỏ qua lịch
      // (Check nhanh vùng an toàn của Area đó)
      const isCritical = await this.checkIfAreaIsCritical(area);
      if (isCritical) {
        console.log(
          `[Lập lịch] Thiết bị ${device.device_name}: Tạm dừng vì Auto đang xử lý sự cố môi trường.`,
        );
        continue;
      }

      // ✅ NẾU RẢNH RỖI -> THỰC THI LỊCH CHO TỪNG CON
      if (currentTime === device.schedule_on_time) {
        console.log(
          `⏰ Lập lịch: BẬT ${device.device_name} tại ${area.area_name}`,
        );
        this.publishToAdafruit(device.adafruit_feed_key, 'ON');
      } else if (currentTime === device.schedule_off_time) {
        console.log(
          `⏰ Lập lịch: TẮT ${device.device_name} tại ${area.area_name}`,
        );
        this.publishToAdafruit(device.adafruit_feed_key, 'OFF');
      }
    }
  }

  // Hàm hỗ trợ check nhanh trạng thái Area cho BR-13
  private async checkIfAreaIsCritical(area: any): Promise<boolean> {
    if (!area.food_types || area.food_types.length === 0) return false;

    // Lấy thông số cảm biến mới nhất của Khu vực này
    const latestReading = await this.readingRepo.findOne({
      where: { device: { area: { id: area.id } } },
      order: { recorded_at: 'DESC' },
    });

    if (!latestReading) return false;

    // Tính vùng an toàn
    const safeZone = area.food_types.reduce(
      (acc, f) => ({
        maxT: Math.min(acc.maxT, f.max_temp),
        minT: Math.max(acc.minT, f.min_temp),
        maxH: Math.min(acc.maxH, f.max_humi),
        minH: Math.max(acc.minH, f.min_humi),
      }),
      { maxT: 99, minT: -99, maxH: 100, minH: 0 },
    );

    // Đọ số liệu xem có đang cháy/nóng/ẩm quá không
    if (latestReading.sensor_type === 'TEMP') {
      return (
        latestReading.reading_value > safeZone.maxT ||
        latestReading.reading_value < safeZone.minT
      );
    } else if (latestReading.sensor_type === 'HUMI') {
      return (
        latestReading.reading_value > safeZone.maxH ||
        latestReading.reading_value < safeZone.minH
      );
    }

    return false;
  }

  // ==========================================
  // LEO THANG CẢNH BÁO (BR-11) - Quét mỗi phút 1 lần
  // ==========================================
  @Cron(CronExpression.EVERY_MINUTE)
  async checkAndEscalateAlerts() {
    // Tìm thời điểm cách đây 15 phút
    const fifteenMinsAgo = new Date(Date.now() - 0.5 * 60 * 1000);

    // Truy vấn các log Critical (TEMP_ALERT, HUMI_ALERT, EMERGENCY_SOS)
    // Mà chưa được xử lý (is_resolved = false)
    // Sinh ra quá 15 phút, và chưa từng bị leo thang (is_escalated = false)
    const neglectedAlerts = await this.logRepo
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.area', 'area')
      .where('log.action_type IN (:...types)', {
        types: ['TEMP_ALERT', 'HUMI_ALERT', 'EMERGENCY_SOS'],
      })
      .andWhere('log.is_resolved = :resolved', { resolved: false })
      .andWhere('log.is_escalated = :escalated', { escalated: false })
      .andWhere('log.created_at <= :timeLimit', { timeLimit: fifteenMinsAgo })
      .getMany();

    if (neglectedAlerts.length === 0) return;

    for (const alert of neglectedAlerts) {
      try {
        console.log(`🚀 LEO THANG: Khu vực [${alert.area?.area_name}]...`);

        this.appGateway.emitRealtimeData('escalation_alert', {
          areaName: alert.area?.area_name,
          message: `KHẨN CẤP: Khu vực ${alert.area?.area_name} có sự cố chưa được xử lý! Yêu cầu can thiệp ngay.`,
          originalLogId: alert.id,
        });

        // Đánh dấu đã leo thang
        alert.is_escalated = true;
        await this.logRepo.save(alert);

        console.log(`✅ Đã xử lý KHẨN CẤP thành công cho Log ID: ${alert.id}`);
      } catch (err) {
        console.error(`❌ KHÔNG THỂ Xử lý KHẨN CẤP:`, err.message);
      }
    }
  }
}
