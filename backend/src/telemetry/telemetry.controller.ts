import { Controller, Get, Query, Res, Put, Param, Body } from '@nestjs/common';
import * as express from 'express';
import { TelemetryService } from './telemetry.service';

@Controller('api')
export class TelemetryController {
  constructor(private readonly telemetryService: TelemetryService) {}

  @Get('sensors/history')
  async getHistory(
    @Query('type') type: string,
    @Query('area_id') area_id: number,
    @Query('start_time') start_time: string,
    @Query('end_time') end_time: string,
    @Query('limit') limit: number = 200,
  ) {
    const data = await this.telemetryService.getHistory(
      type,
      area_id,
      start_time,
      end_time,
      limit,
    );
    return { status: 'success', data };
  }

  @Get('action-logs')
  async getActionLogs(@Query('limit') limit: number = 20) {
    try {
      const data = await this.telemetryService.getActionLogs(limit);
      return { status: 'success', data };
    } catch (error) {
      return { status: 'error', data: [] };
    }
  }

  @Get('sensors/export')
  async exportCsv(
    @Query('area_id') area_id: number,
    @Query('start_time') start_time: string,
    @Query('end_time') end_time: string,
    @Res() res: express.Response,
  ) {
    const csvStr = await this.telemetryService.generateExportCsv(
      area_id,
      start_time,
      end_time,
    );

    res.header('Content-Type', 'text/csv');
    res.attachment(`Bao_Cao_Moi_Truong_${Date.now()}.csv`);
    return res.send(csvStr);
  }

  // Cập nhật trạng thái xử lý cảnh báo
  @Put('action-logs/:id/resolve')
  async resolveAlert(@Param('id') id: number, @Body('note') note: string) {
    const log = await this.telemetryService['actionLogRepo'].findOne({
      where: { id },
    });
    if (!log) return { status: 'error', message: 'Không tìm thấy log!' };

    log.action_value = `[ĐÃ XỬ LÝ] ${log.action_value} - Ghi chú: ${note || 'Không có'}`;
    await this.telemetryService['actionLogRepo'].save(log);

    return { status: 'success', message: 'Đã cập nhật trạng thái cảnh báo!' };
  }
}
