import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { FacilitiesService } from './facilities.service';
import { Warehouse } from '../entities/warehouse.entity';
import { Area } from '../entities/area.entity';
import { FoodType } from '../entities/food-type.entity';

@Controller('api')
export class FacilitiesController {
  constructor(private readonly facilitiesService: FacilitiesService) {}

  // ---- WAREHOUSE ----
  @Post('facilities/warehouses')
  async createWarehouse(@Body() body: Partial<Warehouse>) {
    return {
      status: 'success',
      data: await this.facilitiesService.createWarehouse(body),
    };
  }
  @Get('warehouses/dashboard')
  async getDashboard() {
    return {
      status: 'success',
      data: await this.facilitiesService.getDashboardData(),
    };
  }

  // ---- AREA ----
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
  async updateAreaSettings(@Param('id') id: number, @Body() body: any) {
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

  // ---- FOOD TYPES ----
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
}
