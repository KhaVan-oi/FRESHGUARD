import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { IotService } from './iot.service';
import { Device } from '../entities/device.entity';

@Controller('api/devices')
export class IotController {
  constructor(private readonly iotService: IotService) {}

  @Get()
  async getAllDevices() {
    return { status: 'success', data: await this.iotService.getAllDevices() };
  }

  @Post()
  async createDevice(@Body() body: Partial<Device>) {
    return {
      status: 'success',
      data: await this.iotService.createDevice(body),
    };
  }

  @Put(':id')
  async updateDevice(@Param('id') id: number, @Body() body: Partial<Device>) {
    await this.iotService.updateDevice(id, body);
    return { status: 'success', message: 'Cập nhật thiết bị thành công' };
  }

  @Delete(':id')
  async deleteDevice(@Param('id') id: number) {
    await this.iotService.deleteDevice(id);
    return { status: 'success', message: 'Đã xóa thiết bị' };
  }

  @Post('control')
  async controlDevice(@Body() body: { device_id: string; action: string }) {
    const cooldownMsg = await this.iotService.controlDevice(
      body.device_id,
      body.action,
    );
    return {
      status: 'success',
      message: `Đã gửi lệnh ${body.action} xuống ${body.device_id}!${cooldownMsg}`,
    };
  }

  @Post('schedules')
  async addSchedule(@Body() body: any) {
    const data = await this.iotService.createSchedule(body);
    return { status: 'success', message: 'Đã lưu lịch hẹn thành công!', data };
  }

  @Get('schedules')
  async getSchedules() {
    return { status: 'success', data: await this.iotService.getAllSchedules() };
  }
}
