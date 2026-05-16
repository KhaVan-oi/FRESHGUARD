import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ForbiddenException,
  UseGuards,
} from '@nestjs/common';
import { FacilitiesService } from './facilities.service';
import { Warehouse } from '../entities/warehouse.entity';
import { Area } from '../entities/area.entity';
import { FoodType } from '../entities/food-type.entity';
import { Req } from '@nestjs/common';
import type { Request } from 'express';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@Controller('api')
export class FacilitiesController {
  constructor(private readonly facilitiesService: FacilitiesService) {}

  // ==================== WAREHOUSE CRUD ====================

  @Get('warehouses')
  async getAllWarehouses(@Query('user_id') userId?: string) {
    const data = userId
      ? await this.facilitiesService.getWarehousesByOperator(Number(userId))
      : await this.facilitiesService.getAllWarehouses();
    return { status: 'success', data };
  }

  // ⚠️ Phải đặt TRƯỚC :id để tránh nhầm 'dashboard' thành id
  @Get('warehouses/dashboard')
  async getDashboard() {
    return {
      status: 'success',
      data: await this.facilitiesService.getDashboardData(),
    };
  }

  @Get('warehouses/:id')
  async getWarehouseById(@Param('id') id: number) {
    return {
      status: 'success',
      data: await this.facilitiesService.getWarehouseById(id),
    };
  }

  @Post('warehouses')
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  async createWarehouse(@Body() body: Partial<Warehouse> & { role?: string }) {
    return {
      status: 'success',
      data: await this.facilitiesService.createWarehouse(body),
    };
  }

  @Put('warehouses/:id')
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  async updateWarehouse(
    @Param('id') id: number,
    @Body() body: Partial<Warehouse> & { role?: string },
  ) {
    return {
      status: 'success',
      data: await this.facilitiesService.updateWarehouse(id, body),
    };
  }

  @Delete('warehouses/:id')
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  async deleteWarehouse(
    @Param('id') id: number,
    @Query('role') role?: string,
  ) {
    await this.facilitiesService.deleteWarehouse(id);
    return { status: 'success', message: 'Đã xóa kho lạnh' };
  }

  // ==================== AREA ====================

  @Get('areas')
  async getAllAreas() {
    return {
      status: 'success',
      data: await this.facilitiesService.getAllAreas(),
    };
  }

  @Post('areas')
  async createArea(@Body() body: Partial<Area>) {
    return {
      status: 'success',
      data: await this.facilitiesService.createArea(body),
    };
  }

  @Delete('areas/:id')
  async deleteArea(@Param('id') id: number) {
    await this.facilitiesService.deleteArea(id);
    return { status: 'success', message: 'Đã xóa khu vực' };
  }

  @Put('areas/:id/settings')
  @Roles('ADMIN', 'OPERATOR')
  @UseGuards(RolesGuard)
  async updateAreaSettings(
    @Param('id') id: number,
    @Body() body: any,
  ) {
    const role: string = body.role ?? '';
    const userId: number | undefined = body.user_id;

    // OPERATOR: kiểm tra họ có được gán vào khu vực này không
    if (role.toUpperCase() === 'OPERATOR' && userId) {
      const hasAccess = await this.facilitiesService.checkOperatorAccess(
        Number(userId),
        id,
      );
      if (!hasAccess) {
        throw new ForbiddenException(
          'Bạn không có quyền chỉnh sửa khu vực này',
        );
      }
      // OPERATOR không được thay đổi người phụ trách → loại bỏ operator_id
      delete body.operator_id;
    }

    const data = await this.facilitiesService.updateAreaSettings(id, body);
    return { status: 'success', message: 'Đã cập nhật Khu vực!', data };
  }

  @Post('areas/:id/assign-operator')
  async assignOperator(
    @Param('id') areaId: number,
    @Body('user_id') userId: number,
  ) {
    const res = await this.facilitiesService.assignOperator(areaId, userId);
    return {
      status: 'success',
      message: `Đã gán ${res.user} vào khu ${res.area}`,
    };
  }

  @Post('areas/:id/add-food')
  @Roles('ADMIN', 'OPERATOR')
  @UseGuards(RolesGuard)
  async addFood(
    @Param('id') id: number,
    @Body('food_type_id') foodTypeId: number,
    @Body('role') role?: string,
    @Body('user_id') userId?: number,
  ) {
    // Nếu là OPERATOR, kiểm tra họ có được gán vào khu vực này không
    if (role?.toUpperCase() === 'OPERATOR' && userId) {
      const hasAccess = await this.facilitiesService.checkOperatorAccess(
        Number(userId),
        id,
      );
      if (!hasAccess) {
        throw new ForbiddenException(
          'Bạn không có quyền gán thực phẩm cho khu vực này',
        );
      }
    }
    return await this.facilitiesService.addFoodToArea(id, foodTypeId);
  }

  // ==================== FOOD TYPES ====================

  @Get('food-types')
  async getFoodTypes() {
    return {
      status: 'success',
      data: await this.facilitiesService.getAllFoodTypes(),
    };
  }

  @Post('food-types')
  async createFoodType(@Body() body: Partial<FoodType>) {
    return {
      status: 'success',
      data: await this.facilitiesService.createFoodType(body),
    };
  }

  @Put('food-types/:id')
  async updateFoodType(
    @Param('id') id: number,
    @Body() body: Partial<FoodType>,
  ) {
    await this.facilitiesService.updateFoodType(id, body);
    return { status: 'success', message: 'Đã cập nhật quy tắc bảo quản' };
  }

  @Delete('food-types/:id')
  async deleteFoodType(@Param('id') id: number) {
    await this.facilitiesService.deleteFoodType(id);
    return { status: 'success', message: 'Đã xóa loại thực phẩm' };
  }

  @Put('action-logs/:id/resolve')
  async resolveAlert(
    @Param('id') id: number,
    @Body() body: { note: string; user_id: number },
  ) {
    return this.facilitiesService.resolveAlert(id, body.note, body.user_id);
  }

  // ==================== SCHEDULES (theo Kho → Khu vực) ====================

  /**
   * GET /api/warehouses/:warehouseId/areas/:areaId/schedules
   * Lấy tất cả schedules của các thiết bị trong khu vực đó.
   * OPERATOR chỉ xem được khu vực mình được gán.
   * Query: ?user_id=...&role=... (FE tự truyền từ localStorage)
   */
  @Get('warehouses/:warehouseId/areas/:areaId/schedules')
  async getSchedulesByArea(
    @Param('warehouseId') warehouseId: number,
    @Param('areaId') areaId: number,
    @Query('user_id') userId?: string,
    @Query('role') role?: string,
  ) {
    // Kiểm tra quyền: nếu là OPERATOR thì phải được gán vào khu vực này
    if (role?.toUpperCase() === 'OPERATOR' && userId) {
      const hasAccess = await this.facilitiesService.checkOperatorAccess(
        Number(userId),
        areaId,
      );
      if (!hasAccess) {
        throw new ForbiddenException(
          'Bạn không có quyền xem lịch trình khu vực này',
        );
      }
    }

    const data = await this.facilitiesService.getSchedulesByArea(
      warehouseId,
      areaId,
    );
    return { status: 'success', data };
  }

  /**
   * POST /api/warehouses/:warehouseId/areas/:areaId/schedules
   * Tạo schedule mới cho thiết bị trong khu vực.
   * Body: { action, start_time, end_time?, is_active?, device_id, user_id, role }
   */
  @Post('warehouses/:warehouseId/areas/:areaId/schedules')
  async createScheduleInArea(
    @Param('warehouseId') warehouseId: number,
    @Param('areaId') areaId: number,
    @Body()
    body: {
      action: string;
      start_time: string;
      end_time?: string;
      is_active?: boolean;
      device_id: number;
      user_id?: number;
      role?: string;
    },
  ) {
    // Kiểm tra quyền
    if (body.role?.toUpperCase() === 'OPERATOR' && body.user_id) {
      const hasAccess = await this.facilitiesService.checkOperatorAccess(
        body.user_id,
        areaId,
      );
      if (!hasAccess) {
        throw new ForbiddenException(
          'Bạn không có quyền tạo lịch trình cho khu vực này',
        );
      }
    }

    // Kiểm tra device có thuộc area này không
    await this.facilitiesService.assertDeviceBelongsToArea(
      body.device_id,
      areaId,
    );

    const data = await this.facilitiesService.createSchedule({
      action: body.action,
      start_time: body.start_time,
      end_time: body.end_time,
      is_active: body.is_active ?? true,
      device: { id: body.device_id },
    });
    return { status: 'success', data };
  }

  /**
   * PUT /api/warehouses/:warehouseId/areas/:areaId/schedules/:scheduleId
   * Cập nhật schedule. Chỉ operator được gán mới được sửa.
   */
  @Put('warehouses/:warehouseId/areas/:areaId/schedules/:scheduleId')
  async updateScheduleInArea(
    @Param('warehouseId') warehouseId: number,
    @Param('areaId') areaId: number,
    @Param('scheduleId') scheduleId: number,
    @Body()
    body: {
      action?: string;
      start_time?: string;
      end_time?: string;
      is_active?: boolean;
      user_id?: number;
      role?: string;
    },
  ) {
    if (body.role?.toUpperCase() === 'OPERATOR' && body.user_id) {
      const hasAccess = await this.facilitiesService.checkOperatorAccess(
        body.user_id,
        areaId,
      );
      if (!hasAccess) {
        throw new ForbiddenException(
          'Bạn không có quyền sửa lịch trình khu vực này',
        );
      }
    }

    const data = await this.facilitiesService.updateSchedule(scheduleId, body);
    return { status: 'success', data };
  }

  /**
   * DELETE /api/warehouses/:warehouseId/areas/:areaId/schedules/:scheduleId
   * Xóa schedule. Chỉ operator được gán mới được xóa.
   */
  @Delete('warehouses/:warehouseId/areas/:areaId/schedules/:scheduleId')
  async deleteScheduleInArea(
    @Param('warehouseId') warehouseId: number,
    @Param('areaId') areaId: number,
    @Param('scheduleId') scheduleId: number,
    @Query('user_id') userId?: string,
    @Query('role') role?: string,
  ) {
    if (role?.toUpperCase() === 'OPERATOR' && userId) {
      const hasAccess = await this.facilitiesService.checkOperatorAccess(
        Number(userId),
        areaId,
      );
      if (!hasAccess) {
        throw new ForbiddenException(
          'Bạn không có quyền xóa lịch trình khu vực này',
        );
      }
    }

    await this.facilitiesService.deleteSchedule(scheduleId);
    return { status: 'success', message: 'Đã xóa lịch trình' };
  }
}