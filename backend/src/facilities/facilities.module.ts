import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FacilitiesController } from './facilities.controller';
import { FacilitiesService } from './facilities.service';
import { Warehouse } from '../entities/warehouse.entity';
import { Area } from '../entities/area.entity';
import { FoodType } from '../entities/food-type.entity';
// 🌟 Import thêm 2 bảng này để làm assign-operator và ghi log
import { User } from '../entities/user.entity';
import { ActionLog } from '../entities/action-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Warehouse, Area, FoodType, User, ActionLog]),
  ],
  controllers: [FacilitiesController],
  providers: [FacilitiesService],
})
export class FacilitiesModule {}
