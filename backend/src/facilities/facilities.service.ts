import {
  Injectable,
  HttpException,
  HttpStatus,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
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

  async getAllWarehouses() {
    return await this.warehouseRepo.find();
  }
  // Hàm lấy Dashboard sếp giữ nguyên như cũ nha
  async getDashboardData() {
    // Thằng TypeORM sẽ tự động join các bảng lại với nhau dựa trên Entity mình đã khai báo
    return await this.warehouseRepo.find({
      relations: {
        areas: {
          food_types: true, // Lấy thông tin thực phẩm (ngưỡng nhiệt độ)
          devices: true, // Lấy danh sách thiết bị trong khu vực đó
          operators: true, // Lấy thêm tên nhân viên quản lý (nếu có)
        },
      },
    });
  }

  // ================= QUẢN LÝ KHU VỰC =================
  async getAllAreas() {
    return await this.areaRepo.find({
      relations: ['warehouse', 'operators', 'food_types'],
    });
  }

  async getAreaList() {
    return await this.areaRepo.find({
      select: ['id', 'area_name'],
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
    const area = await this.areaRepo.findOne({
      where: { id: areaId },
      relations: ['operators'],
    });
    const user = await this.userRepo.findOne({ where: { id: userId } });

    if (!area || !user)
      throw new HttpException('Lỗi dữ liệu', HttpStatus.BAD_REQUEST);

    const currentOperators = area.operators || [];
    currentOperators.push(user);
    area.operators = currentOperators;

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

  // ================= THÊM THỰC PHẨM VÀO KHO =================
  async addFoodToArea(areaId: number, foodTypeId: number) {
    // 1. Lấy Khu vực
    const area = await this.areaRepo.findOne({
      where: { id: areaId },
      relations: ['food_types'],
    });

    if (!area) throw new NotFoundException('Không tìm thấy khu vực này');

    // Khởi tạo mảng rỗng nếu chưa có gì (chống lỗi TypeORM)
    const currentFoods = area.food_types || [];

    // 2. Lấy thực phẩm mới định thêm vào
    const newFood = await this.foodTypeRepo.findOne({
      where: { id: foodTypeId },
    });
    if (!newFood)
      throw new NotFoundException('Không tìm thấy loại thực phẩm này');

    // 3. Nếu khu vực đã có thực phẩm, tiến hành check "Vùng giao thoa"
    if (currentFoods.length > 0) {
      const allFoods = [...currentFoods, newFood];

      // Tìm dải nhiệt độ và độ ẩm giao thoa (Strict Intersection)
      const bounds = allFoods.reduce(
        (acc, f) => ({
          minT: Math.max(acc.minT, f.min_temp),
          maxT: Math.min(acc.maxT, f.max_temp),
          minH: Math.max(acc.minH, f.min_humi),
          maxH: Math.min(acc.maxH, f.max_humi),
        }),
        { minT: -99, maxT: 99, minH: 0, maxH: 100 },
      );

      // Nếu dải Min vượt quá dải Max -> Không có tiếng nói chung
      if (bounds.minT > bounds.maxT || bounds.minH > bounds.maxH) {
        throw new BadRequestException(
          'Xung đột thông số! Thực phẩm này không thể để chung với các loại hiện có do lệch dải nhiệt độ/độ ẩm.',
        );
      }
    }

    // 4. Lưu liên kết mới vào bảng trung gian
    currentFoods.push(newFood);
    area.food_types = currentFoods;
    await this.areaRepo.save(area);

    return {
      status: 'success',
      message: 'Đã thêm thực phẩm vào khu vực thành công.',
    };
  }

  async resolveAlert(logId: number) {
    const log = await this.actionLogRepo.findOne({ where: { id: logId } });
    if (!log) throw new NotFoundException('Không tìm thấy log cảnh báo');

    log.is_resolved = true;
    await this.actionLogRepo.save(log);

    // Ghi nhận thêm 1 log là nhân viên đã dọn dẹp xong
    return { status: 'success', message: 'Đã xác nhận xử lý cảnh báo!' };
  }
}
