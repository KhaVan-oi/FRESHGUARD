import { Controller, Get, Post, Body, Query, Param, Put } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { SensorReading } from './entities/sensor-reading.entity';
import { ActionLog } from './entities/action-log.entity';
import { Device } from './entities/device.entity';
import { Area } from './entities/area.entity';
import { MqttService } from './mqtt/mqtt.service';
import { FoodType } from './entities/food-type.entity';

@Controller('api')
export class AppController {
  constructor(
    @InjectRepository(SensorReading)
    private readonly sensorRepo: Repository<SensorReading>,
    @InjectRepository(ActionLog)
    private readonly actionLogRepo: Repository<ActionLog>,
    @InjectRepository(Device) private readonly deviceRepo: Repository<Device>,
    @InjectRepository(Area) private readonly areaRepo: Repository<Area>,
    @InjectRepository(FoodType)
    private readonly foodTypeRepo: Repository<FoodType>,

    private readonly mqttService: MqttService,
  ) {}

  // ====================================================
  // API 1: LẤY SỐ MỚI NHẤT (Có Lọc Theo Khu Vực)
  // Đường dẫn: GET /api/sensors/latest?area_id=1
  // ====================================================
  @Get('sensors/latest')
  async getLatestReadings(@Query('area_id') area_id: number) {
    let query = this.sensorRepo
      .createQueryBuilder('sensor')
      .leftJoinAndSelect('sensor.device', 'device') // Nối qua bảng Thiết bị
      .orderBy('sensor.recorded_at', 'DESC');

    // Nếu có truyền area_id lên thì lọc, không thì lấy hết
    if (area_id) {
      query = query.where('device.area_id = :area_id', { area_id });
    }

    const data = await query.take(5).getMany();
    return { status: 'success', data };
  }

  // ====================================================
  // API 2: LẤY LỊCH SỬ VẼ BIỂU ĐỒ (Có Lọc Khu Vực)
  // Đường dẫn: GET /api/sensors/history?type=TEMP&area_id=1&limit=20
  // ====================================================
  @Get('sensors/history')
  async getHistory(
    @Query('type') type: string,
    @Query('area_id') area_id: number,
    @Query('limit') limit: number = 20,
  ) {
    let query = this.sensorRepo
      .createQueryBuilder('sensor')
      .leftJoinAndSelect('sensor.device', 'device') // Nối qua bảng Thiết bị
      .orderBy('sensor.recorded_at', 'ASC');

    // Lọc theo loại cảm biến (VD: TEMP)
    if (type) {
      query = query.andWhere('sensor.sensor_type = :type', { type });
    }

    // Lọc theo Khu vực (VD: Khu vực số 1)
    if (area_id) {
      query = query.andWhere('device.area_id = :area_id', { area_id });
    }

    const data = await query.take(limit).getMany();
    return { status: 'success', data };
  }

  // ====================================================
  // API 3 : BẤM NÚT ĐIỀU KHIỂN
  // Gửi lên action: 'ON', 'OFF', 'MODE_1', 'MODE_2', 'MODE_3'
  // ====================================================
  @Post('devices/control')
  async controlDevice(@Body() body: { device_id: string; action: string }) {
    const { device_id, action } = body;

    // 1. Kêu MqttService gửi lệnh lên Adafruit thẳng bằng action
    this.mqttService.publishToAdafruit(device_id, action);

    // 2. Tìm ID của thiết bị trong DB
    const device = await this.deviceRepo.findOne({
      where: { adafruit_feed_key: device_id },
    });
    if (!device)
      return { status: 'error', message: 'Không tìm thấy thiết bị này!' };

    // 3. Ghi Log
    await this.actionLogRepo.save(
      this.actionLogRepo.create({
        device: device,
        action_type: 'MANUAL_CONTROL',
        action_value: `Người dùng điều kiển lệnh ${action} từ Web`,
        trigger_source: 'MANUAL',
      }),
    );

    return {
      status: 'success',
      message: `Đã ghi lệnh ${action} xuống ${device_id}!`,
    };
  }

  // ====================================================
  // API 4: LẤY DỮ LIỆU TỔNG QUAN (DASHBOARD)
  // Đường dẫn: GET /api/dashboard
  // ====================================================
  @Get('dashboard')
  async getDashboardData() {
    const areas = await this.areaRepo.find({
      relations: ['current_food_type', 'devices'], // Kéo theo cả Thực phẩm và Thiết bị
    });
    return { status: 'success', data: areas };
  }

  // ====================================================
  // API 5: CÀI ĐẶT KHU VỰC
  // ====================================================
  @Put('areas/:id/settings')
  async updateAreaSettings(
    @Param('id') id: number,
    @Body()
    body: {
      auto_door_timeout_sec?: number;
      manual_override_mins?: number;
      current_food_type_id?: number; //
    },
  ) {
    const area = await this.areaRepo.findOne({ where: { id } });
    if (!area)
      return { status: 'error', message: 'Không tìm thấy Khu vực này!' };

    // Cập nhật thông số thời gian
    if (body.auto_door_timeout_sec !== undefined)
      area.auto_door_timeout_sec = body.auto_door_timeout_sec;
    if (body.manual_override_mins !== undefined)
      area.manual_override_mins = body.manual_override_mins;

    // XỬ LÝ ĐỔI LOẠI THỰC PHẨM
    if (body.current_food_type_id !== undefined) {
      const food = await this.foodTypeRepo.findOne({
        where: { id: body.current_food_type_id },
      });
      if (food) {
        area.current_food_type = food; // Gắn thực phẩm mới vào khu vực
      } else {
        return { status: 'error', message: 'Loại thực phẩm không tồn tại!' };
      }
    }

    await this.areaRepo.save(area);
    return {
      status: 'success',
      message: `Đã cập nhật Khu vực [${area.area_name}]!`,
      data: area,
    };
  }

  // ====================================================
  // API 6: LẤY DANH SÁCH THỰC PHẨM
  // Đường dẫn: GET /api/food-types
  // ====================================================
  @Get('food-types')
  async getFoodTypes() {
    const foods = await this.foodTypeRepo.find();
    return { status: 'success', data: foods };
  }
}
