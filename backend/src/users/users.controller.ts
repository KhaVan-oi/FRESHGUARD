import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from '../entities/user.entity';

@Controller('api/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async getAllUsers() {
    return { status: 'success', data: await this.usersService.getAllUsers() };
  }

  @Post()
  async createUser(@Body() body: Partial<User>) {
    return {
      status: 'success',
      data: await this.usersService.createUser(body),
    };
  }

  @Put(':id')
  async updateUser(@Param('id') id: number, @Body() body: Partial<User>) {
    await this.usersService.updateUser(id, body);
    return { status: 'success', message: 'Đã cập nhật User' };
  }

  @Delete(':id')
  async deleteUser(@Param('id') id: number) {
    await this.usersService.deleteUser(id);
    return { status: 'success', message: 'Đã xóa User' };
  }

  // Cập nhật profile cá nhân
  @Put('profile/:id')
  async updateProfile(
    @Param('id') id: number,
    @Body()
    body: {
      full_name?: string;
      email?: string;
      phone?: string;
      password?: string;
    },
  ) {
    await this.usersService.updateUser(id, body);
    return {
      status: 'success',
      message: 'Cập nhật thông tin cá nhân thành công!',
    };
  }
}
