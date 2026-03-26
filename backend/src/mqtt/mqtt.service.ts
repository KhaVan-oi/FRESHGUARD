import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as mqtt from 'mqtt';
import { Cron, CronExpression } from '@nestjs/schedule'; // Giả lập đo nồng độ CO2
import { AppGateway } from '../gateway/app.gateway'; //App Gateway - realtime

import { Device } from '../entities/device.entity';
import { SensorReading } from '../entities/sensor-reading.entity';
import { ActionLog } from '../entities/action-log.entity';

@Injectable()
export class MqttService implements OnModuleInit {
  private client: mqtt.MqttClient;
  // Biến lưu thời gian mở cửa để tính toán 30s
  private doorOpenTimer: any = null;

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

      // DÙNG WILDCARD (+) để LẤY TẤT CẢ các thiết bị đang có trên Adafruit
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

      // REALTIME UPDATE
      this.appGateway.emitRealtimeData('live_sensor_data', {
        khu_vuc: 'Kho Lạnh',
        thiet_bi: feedKey,
        loai_cam_bien: 'LIVE',
        gia_tri: value,
      });

      const numericValue = parseFloat(value);

      // 1. TÌM THIẾT BỊ TRONG DATABASE
      const device = await this.deviceRepo.findOne({
        where: { adafruit_feed_key: feedKey },
        relations: ['area', 'area.current_food_type'],
      });

      // 2. NẾU KHÔNG TÌM THẤY THIẾT BỊ NÀO THÌ BỎ QUA
      if (!device) {
        console.log(`Không tìm thấy thiết bị [${feedKey}] trong Database!`);
        return;
      }

      const area = device.area; // Lấy thông tin khu vực

      // App Gateway - realtime (Cập nhật lại tên khu vực cho chuẩn)
      this.appGateway.emitRealtimeData('live_sensor_data', {
        khu_vuc: area ? area.area_name : 'Không xác định',
        thiet_bi: device.device_name,
        loai_cam_bien: device.device_type,
        gia_tri: value,
      });

      // 3. NẾU DỮ LIỆU LÀ CHỮ (ON, OFF, MODE_1...) -> CẬP NHẬT TRẠNG THÁI THIẾT BỊ
      if (isNaN(numericValue)) {
        console.log(
          `⚙️ Cập nhật trạng thái [${value}] cho thiết bị điều khiển [${feedKey}].`,
        );
        device.status = value;
        await this.deviceRepo.save(device);

        // --- XỬ LÝ NGHIỆP VỤ CHO NÚT BẤM DẠNG CHỮ Ở ĐÂY ---

        // CỬA SENSOR (1 là Mở, 0 là Đóng)
        if (device.device_type === 'DOOR_SENSOR') {
          if (value === '1' || value === 'ON') {
            console.log(`Cửa khu vực [${area?.area_name}] ĐANG MỞ!`);
            this.publishToAdafruit('den1', 'MODE_1');
            if (!this.doorOpenTimer) {
              this.doorOpenTimer = setTimeout(() => {
                console.log('Cảnh báo: Cửa mở quá 30 giây!');
                this.publishToAdafruit('led_matrix', 'YELLOW_BLINK');
                this.logRepo.save(
                  this.logRepo.create({
                    action_type: 'DOOR_WARNING',
                    action_value: 'Cửa mở quá 30 giây, thất thoát nhiệt!',
                    trigger_source: 'AUTO',
                    area: area,
                    device: device,
                  }),
                );
              }, 30000);
            }
          } else if (value === '0' || value === 'OFF') {
            console.log(`Cửa khu vực [${area?.area_name}] Đã đóng.`);
            this.publishToAdafruit('den1', 'OFF');
            this.publishToAdafruit('led_matrix', 'GREEN');
            if (this.doorOpenTimer) {
              clearTimeout(this.doorOpenTimer);
              this.doorOpenTimer = null;
            }
          }
        }

        // NÚT KHẨN CẤP
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
          } else if (value === '0' || value === 'OFF') {
            console.log(`Đã HỦY báo động khẩn cấp tại [${area?.area_name}].`);
            this.publishToAdafruit('led_matrix', 'GREEN');
          }
        }

        return; // Xử lý xong nghiệp vụ chữ thì kết thúc, không chạy xuống phần số
      }

      // 4. NẾU DỮ LIỆU LÀ SỐ (25, 60.5...) -> LƯU VÀO BẢNG SENSOR_READINGS VÀ CHECK CẢNH BÁO
      const newReading = this.readingRepo.create({
        device: device,
        sensor_type: device.device_type,
        reading_value: numericValue,
      });

      await this.readingRepo.save(newReading);
      console.log(
        `Đã lưu chỉ số ${numericValue} vào DB cho cảm biến [${device.device_name}]!`,
      );

      // --- XỬ LÝ NGHIỆP VỤ CHO CẢM BIẾN SỐ (Nhiệt/Ẩm) ---
      if (device.device_type === 'TEMP' || device.device_type === 'HUMI') {
        if (!area || !area.current_food_type) return;
        const foodType = area.current_food_type;

        let isOverheating = false;
        if (device.device_type === 'TEMP') {
          if (
            numericValue > foodType.max_temp ||
            numericValue < foodType.min_temp
          ) {
            isOverheating = true;
          }
        }

        if (isOverheating) {
          console.log(`QUÁ NHIỆT! Khu vực [${area.area_name}] vượt ngưỡng!`);
          this.publishToAdafruit('quat1', 'ON'); // Bật quạt
          this.publishToAdafruit('led_matrix', 'RED_BLINK'); // Đèn LED chớp đỏ

          await this.logRepo.save(
            this.logRepo.create({
              action_type: 'TEMP_ALERT',
              action_value: `Vượt ngưỡng (Hiện tại: ${numericValue})`,
              trigger_source: 'AUTO',
              area: area,
              device: device,
            }),
          );
        }
      }
    }); // <-- Kết thúc sự kiện this.client.on('message')
  } // <-- Kết thúc hàm onModuleInit()

  // ==========================================
  // ẢO HÓA DỮ LIỆU: CẢM BIẾN CO2 (Chạy tự động mỗi 1 phút)
  // ==========================================
  @Cron(CronExpression.EVERY_MINUTE)
  async simulateCO2Sensor() {
    const virtualSensors = await this.deviceRepo.find({
      where: { device_type: 'CO2_SENSOR' },
      relations: ['area'],
    });

    if (virtualSensors.length === 0) return;

    virtualSensors.forEach(async (sensor) => {
      const randomCO2 = Math.floor(Math.random() * (450 - 350 + 1)) + 350;

      console.log(` Dữ liệu CO2 tại [${sensor.device_name}]: ${randomCO2} ppm`);

      await this.readingRepo.save(
        this.readingRepo.create({
          device: sensor,
          sensor_type: 'CO2',
          reading_value: randomCO2,
        }),
      );

      this.appGateway.emitRealtimeData('live_sensor_data', {
        khu_vuc: sensor.area ? sensor.area.area_name : 'Khu vực Ảo',
        thiet_bi: sensor.device_name, // Chỗ này truyền tên thiết bị
        loai_cam_bien: 'CO2',
        gia_tri: randomCO2,
      });

      // TRUYỀN THÊM MỘT DATA THEO ADAFRUIT_FEED_KEY CHO UI NÓ NHẬN DIỆN ĐƯỢC
      this.appGateway.emitRealtimeData('live_sensor_data', {
        khu_vuc: sensor.area ? sensor.area.area_name : 'Khu vực Ảo',
        thiet_bi: sensor.adafruit_feed_key, // UI hứng bằng cái key này
        loai_cam_bien: 'CO2',
        gia_tri: randomCO2,
      });
    });
  }

  publishToAdafruit(feedKey: string, value: string) {
    const adafruitUser = process.env.ADAFRUIT_USERNAME;
    if (!adafruitUser) return;
    const topic = `${adafruitUser}/feeds/${feedKey}`;
    this.client.publish(topic, value);
  }
}
