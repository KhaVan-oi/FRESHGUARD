import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as mqtt from 'mqtt';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AppGateway } from '../gateway/app.gateway';

import { Device } from '../entities/device.entity';
import { SensorReading } from '../entities/sensor-reading.entity';
import { ActionLog } from '../entities/action-log.entity';

@Injectable()
export class MqttService implements OnModuleInit {
  private client: mqtt.MqttClient;

  // RAM ẢO - Sổ tay nhớ Cửa mở
  private doorTimers = new Map<number, NodeJS.Timeout>();

  // RAM ẢO - Sổ tay nhớ lệnh "Nhường quyền cho sếp" (Cooldown)
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
        relations: ['area', 'area.food_types'],
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

        // LOGIC CẢM BIẾN CỬA (Có nhớ quá khứ 30s)
        if (device.device_type === 'DOOR_SENSOR' && areaId) {
          if (value === '1' || value === 'ON') {
            console.log(`Cửa khu vực [${area.area_name}] ĐANG MỞ!`);
            this.publishToAdafruit('den1', 'MODE_1');

            if (!this.doorTimers.has(areaId)) {
              const timeoutSec = (area as any).auto_door_timeout_sec || 30;

              const timer = setTimeout(() => {
                console.log(
                  `Cảnh báo: Cửa [${area.area_name}] mở quá ${timeoutSec} giây!`,
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
            console.log(`Cửa khu vực [${area.area_name}] Đã đóng.`);
            this.publishToAdafruit('den1', 'OFF');
            this.publishToAdafruit('led_matrix', 'GREEN');

            if (this.doorTimers.has(areaId)) {
              clearTimeout(this.doorTimers.get(areaId));
              this.doorTimers.delete(areaId);
            }
          }
        }

        // NÚT KHẨN CẤP SOS
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
        if (!area || !area.food_types || area.food_types.length === 0) return;
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
        // Tách cờ rõ ràng và chuẩn bị biến lưu Log
        let isTooHot = false;
        let isTooCold = false;
        let isWarning = false;
        let isNormal = false;
        let alertType = '';
        let unit = '';
        let typeName = '';

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
          typeName = 'Nhiệt độ';
        } else if (device.device_type === 'HUMI') {
          isTooHot = numericValue > safeZone.maxH;
          isTooCold = numericValue < safeZone.minH;
          isWarning =
            numericValue >= safeZone.maxH - 5 && numericValue <= safeZone.maxH;
          isNormal =
            numericValue >= safeZone.minH && numericValue <= safeZone.maxH;
          alertType = 'HUMI_ALERT';
          unit = '%';
          typeName = 'Độ ẩm';
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

          if (isWarning) {
            console.log(
              `WARNING! Khu vực [${area.area_name}] ${typeName} SẮP VƯỢT NGƯỠNG!`,
            );
            
            await this.logRepo.save(
              this.logRepo.create({
                action_type: alertType, // Nó sẽ tự lấy TEMP_ALERT hoặc HUMI_ALERT
                action_value: `${typeName} sắp vượt ngưỡng (${numericValue}${unit}). Cần chú ý!`,
                trigger_source: 'AUTO',
                area,
                device,
              }),
            );
             this.appGateway.emitRealtimeData('warning_alert', {
              areaId,
              areaName: area.area_name,
              message: `WARNING: ${typeName} sắp vượt ngưỡng (${numericValue}${unit}). Cần chú ý!`,
              operatorIds: area.operators
                ? area.operators.map((op) => op.id)
                : [],
            });
            
          } 
          // 1. NẾU QUÁ NÓNG / QUÁ ẨM -> BẬT QUẠT LÀM MÁT
          if (isTooHot) {
            console.log(
              `CRITICAL! Khu vực [${area.area_name}] ${typeName} QUÁ CAO! Auto bật Quạt...`,
            );
            this.publishToAdafruit('quat1', 'ON');
            this.publishToAdafruit('led_matrix', 'RED_BLINK');
            
            await this.logRepo.save(
              this.logRepo.create({
                action_type: alertType, // Nó sẽ tự lấy TEMP_ALERT hoặc HUMI_ALERT
                action_value: `${typeName} vượt ngưỡng trên (${numericValue}${unit}). Đã auto BẬT quạt.`,
                trigger_source: 'AUTO',
                area,
                device,
              }),
            );

            this.appGateway.emitRealtimeData('critical_alert', {
              areaId,
              areaName: area.area_name,
              message: `CRITICAL: ${typeName} quá cao (${numericValue}${unit}). Quạt đã bật!`,
              operatorIds: area.operators
                ? area.operators.map((op) => op.id)
                : [],
            });
            
          } 
          // 2. NẾU QUÁ LẠNH / QUÁ KHÔ
          else if (isTooCold) {
            console.log(
              `CRITICAL! Khu vực [${area.area_name}] ${typeName} QUÁ THẤP! Auto tắt Quạt...`,
            );
            this.publishToAdafruit('quat1', 'OFF');
            this.publishToAdafruit('led_matrix', 'RED_BLINK');

            await this.logRepo.save(
              this.logRepo.create({
                action_type: alertType,
                action_value: `${typeName} vượt ngưỡng dưới (${numericValue}${unit}). Yêu cầu kiểm tra.`,
                trigger_source: 'AUTO',
                area,
                device,
              }),
            );

            this.appGateway.emitRealtimeData('critical_alert', {
              areaId,
              areaName: area.area_name,
              message: `CRITICAL: ${typeName} quá thấp (${numericValue}${unit}). Yêu cầu kiểm tra!`,
              operatorIds: area.operators
                ? area.operators.map((op) => op.id)
                : [],
            });
            
          } 
    
          // 3. NẾU AN TOÀN (Logic chéo hàng xóm sếp cứ giữ nguyên)
          else if (isNormal) {
            // 1. Xác định thằng "hàng xóm" là ai (TEMP <-> HUMI)
            const neighborType =
              device.device_type === 'TEMP' ? 'HUMI' : 'TEMP';

            // 2. Kéo số liệu mới nhất của thằng hàng xóm lên
            const latestNeighborReading = await this.readingRepo.findOne({
              where: {
                device: {
                  device_type: neighborType,
                  area: { id: areaId },
                },
              },
              order: { recorded_at: 'DESC' },
            });

            let isNeighborSafe = true;

            // 3. Đọ số liệu hàng xóm với safeZone
            if (latestNeighborReading) {
              const val = latestNeighborReading.reading_value;
              if (
                neighborType === 'TEMP' &&
                (val > safeZone.maxT || val < safeZone.minT)
              ) {
                isNeighborSafe = false;
              } else if (
                neighborType === 'HUMI' &&
                (val > safeZone.maxH || val < safeZone.minH)
              ) {
                isNeighborSafe = false;
              }
            }

            // 4. Phán quyết: Cả 2 đều an toàn mới cho tắt quạt
            if (isNeighborSafe) {
              console.log(
                `Chỉ số ${device.device_type} an toàn (${numericValue}${unit}) và ${neighborType} cũng an toàn. TẮT QUẠT!`,
              );
              this.publishToAdafruit('quat1', 'OFF');
              this.publishToAdafruit('led_matrix', 'GREEN');
            } else {
              console.log(
                `Chỉ số ${device.device_type} an toàn, nhưng ${neighborType} đang báo động. GIỮ NGUYÊN QUẠT!`,
              );
            }
          }
        }
      }
    }); // <-- Kết thúc sự kiện this.client.on('message')
  } // <-- Kết thúc hàm onModuleInit()

  // ==========================================
  // HÀM MỚI: KÍCH HOẠT NHƯỜNG QUYỀN CHO SẾP (MANUAL COOLDOWN)
  // ==========================================
  public setManualCooldown(areaId: number, cooldownMins: number = 2) {
    const expireTime = Date.now() + cooldownMins * 60 * 1000;
    this.manualOverrides.set(areaId, expireTime);
    console.log(
      `Kích hoạt Ghi đè thủ công cho Khu [${areaId}] trong ${cooldownMins} phút. Auto sẽ tạm dừng.`,
    );
  }

  // ==========================================
  // ẢO HÓA DỮ LIỆU: CẢM BIẾN CO2
  // ==========================================
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
  // LEO THANG CẢNH BÁO (BR-11) - Quét mỗi phút 1 lần
  // ==========================================
  @Cron(CronExpression.EVERY_MINUTE)
  async checkAndEscalateAlerts() {
    // Tìm thời điểm cách đây 15 phút
    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);

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
        console.log(`LEO THANG: Khu vực [${alert.area?.area_name}]...`);

        this.appGateway.emitRealtimeData('escalation_alert', {
          areaName: alert.area?.area_name,
          message: `KHẨN CẤP: Khu vực ${alert.area?.area_name} có sự cố chưa được xử lý! Yêu cầu can thiệp ngay.`,
          originalLogId: alert.id,
        });

        // Đánh dấu đã leo thang
        alert.is_escalated = true;
        await this.logRepo.save(alert);

        console.log(`Đã xử lý KHẨN CẤP thành công cho Log ID: ${alert.id}`);
      } catch (err) {
        console.error(`KHÔNG THỂ XỬ LÝ KHẨN CẤP:`, err.message);
      }
    }
  }
}
