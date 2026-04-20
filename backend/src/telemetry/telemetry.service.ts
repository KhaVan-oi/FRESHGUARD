import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SensorReading } from '../entities/sensor-reading.entity';
import { ActionLog } from '../entities/action-log.entity';

@Injectable()
export class TelemetryService {
  constructor(
    @InjectRepository(SensorReading)
    private sensorRepo: Repository<SensorReading>,
    @InjectRepository(ActionLog) private actionLogRepo: Repository<ActionLog>,
  ) {}

  // Lấy lịch sử vẽ biểu đồ (Có support Time Range)
  async getHistory(
    type: string,
    areaId: number,
    startTime: string,
    endTime: string,
    limit: number,
  ) {
    let query = this.sensorRepo
      .createQueryBuilder('sensor')
      .leftJoinAndSelect('sensor.device', 'device')
      .orderBy('sensor.recorded_at', 'ASC');

    if (type) query = query.andWhere('sensor.sensor_type = :type', { type });
    if (areaId) query = query.andWhere('device.area_id = :areaId', { areaId });
    if (startTime)
      query = query.andWhere('sensor.recorded_at >= :startTime', { startTime });
    if (endTime)
      query = query.andWhere('sensor.recorded_at <= :endTime', { endTime });

    return await query.take(limit).getMany();
  }

  // Lấy Log hệ thống
  async getActionLogs(limit: number) {
    return await this.actionLogRepo
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.area', 'area')
      .orderBy('log.created_at', 'DESC')
      .take(limit)
      .getMany();
  }

  // Hàm tạo chuỗi CSV
  async generateExportCsv(areaId: number, startTime: string, endTime: string) {
    let query = this.sensorRepo
      .createQueryBuilder('sensor')
      .leftJoinAndSelect('sensor.device', 'device')
      .leftJoinAndSelect('device.area', 'area')
      .orderBy('sensor.recorded_at', 'DESC');

    if (areaId) query = query.where('device.area_id = :areaId', { areaId });
    if (startTime)
      query = query.andWhere('sensor.recorded_at >= :startTime', { startTime });
    if (endTime)
      query = query.andWhere('sensor.recorded_at <= :endTime', { endTime });

    const records = await query.take(5000).getMany();

    let csvStr = 'ID,Thoi_Gian,Khu_Vuc,Thiet_Bi,Loai_Cam_Bien,Gia_Tri\n';
    records.forEach((r) => {
      // Dùng regex để băm cái dấu phẩy trong chuỗi ngày tháng đi cho khỏi lỗi cột CSV
      const time = new Date(r.recorded_at)
        .toLocaleString('vi-VN')
        .replace(/,/g, '');
      const areaName = r.device?.area?.area_name || 'KhongXacDinh';
      const deviceName = r.device?.device_name || 'Unknown';
      csvStr += `${r.id},${time},${areaName},${deviceName},${r.sensor_type},${r.reading_value}\n`;
    });

    return csvStr;
  }
}
