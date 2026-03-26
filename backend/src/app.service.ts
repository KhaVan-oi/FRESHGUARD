import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Area } from './entities/area.entity';

@Injectable()
export class AppService {
  constructor(@InjectRepository(Area) private areaRepo: Repository<Area>) {}

  async getDashboardData() {
    // Kéo toàn bộ Khu Vực, kèm theo Thực phẩm đang chứa và Danh sách thiết bị
    const areas = await this.areaRepo.find({
      relations: ['current_food_type', 'devices'],
    });

    // Trả về định dạng JSON chuẩn API RESTful
    return {
      status: 'success',
      message: 'Lấy dữ liệu Dashboard thành công!',
      data: areas,
    };
  }
}
