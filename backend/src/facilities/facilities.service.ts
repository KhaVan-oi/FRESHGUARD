import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Warehouse } from '../entities/warehouse.entity';
import { Area } from '../entities/area.entity';
import { FoodType } from '../entities/food-type.entity';
import { User } from '../entities/user.entity';
import { ActionLog } from '../entities/action-log.entity';

@Injectable()
export class FacilitiesService {
  constructor(
    @InjectRepository(Warehouse) private warehouseRepo: Repository<Warehouse>,
    @InjectRepository(Area) private areaRepo: Repository<Area>,
    @InjectRepository(FoodType) private foodTypeRepo: Repository<FoodType>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(ActionLog) private actionLogRepo: Repository<ActionLog>,
  ) {}

  // ================= QUẢN LÝ KHO =================
  async createWarehouse(data: Partial<Warehouse>) {
    return await this.warehouseRepo.save(this.warehouseRepo.create(data));
  }
  // Hàm lấy Dashboard sếp giữ nguyên như cũ nha (tui rút gọn ở đây cho đỡ dài)
  async getDashboardData() {
    /* ... SQL Dashboard như cũ ... */ return [];
  }

  // ================= QUẢN LÝ KHU VỰC =================
  async getAllAreas() {
    return await this.areaRepo.find({
      relations: ['warehouse', 'user', 'current_food_type'],
    });
  }

  async createArea(data: Partial<Area>) {
    return await this.areaRepo.save(this.areaRepo.create(data));
  }

  async deleteArea(id: number) {
    await this.areaRepo.delete(id);
    return true;
  }

  async assignOperator(areaId: number, userId: number) {
    const area = await this.areaRepo.findOne({ where: { id: areaId } });
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!area || !user)
      throw new HttpException('Lỗi dữ liệu', HttpStatus.BAD_REQUEST);

    area.user = user;
    await this.areaRepo.save(area);
    return { user: user.username, area: area.area_name };
  }

  async updateAreaSettings(id: number, data: any) {
    const area = await this.areaRepo.findOne({
      where: { id },
      relations: ['warehouse'],
    });
    if (!area)
      throw new HttpException('Không tìm thấy Khu vực!', HttpStatus.NOT_FOUND);

    if (data.auto_door_timeout_sec !== undefined)
      area.auto_door_timeout_sec = data.auto_door_timeout_sec;
    if (data.manual_override_mins !== undefined)
      area.manual_override_mins = data.manual_override_mins;

    // Logic Đổi chế độ & Ghi Log
    if (data.operating_mode !== undefined) {
      const oldMode = area.operating_mode;
      area.operating_mode = data.operating_mode;
      if (oldMode !== data.operating_mode) {
        const modeName =
          data.operating_mode === 'AUTO' ? 'Tự động' : 'Tắt tự động';
        const whName = area.warehouse?.warehouse_name || 'Kho Không Tên';
        await this.actionLogRepo.save(
          this.actionLogRepo.create({
            action_type: 'MODE_CHANGE',
            action_value: `[${whName} - ${area.area_name}] đã chuyển sang ${modeName}`,
            trigger_source: 'MANUAL',
            area: area,
          }),
        );
      }
    }

    if (data.current_food_type_id !== undefined) {
      const food = await this.foodTypeRepo.findOne({
        where: { id: data.current_food_type_id },
      });
      if (food) area.current_food_type = food;
    }

    return await this.areaRepo.save(area);
  }

  // ================= QUẢN LÝ THỰC PHẨM =================
  async getAllFoodTypes() {
    return await this.foodTypeRepo.find();
  }

  async createFoodType(data: Partial<FoodType>) {
    return await this.foodTypeRepo.save(this.foodTypeRepo.create(data));
  }

  async updateFoodType(id: number, data: Partial<FoodType>) {
    await this.foodTypeRepo.update(id, data);
    return true;
  }

  async deleteFoodType(id: number) {
    await this.foodTypeRepo.delete(id);
    return true;
  }
}
