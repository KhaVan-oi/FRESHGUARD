import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { User } from '../entities/user.entity';
import { ActionLog } from '../entities/action-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, ActionLog])],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
