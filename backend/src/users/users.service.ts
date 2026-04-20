import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private userRepo: Repository<User>) {}

  async getAllUsers() {
    return await this.userRepo.find();
  }

  async createUser(data: Partial<User>) {
    const newUser = this.userRepo.create(data);
    return await this.userRepo.save(newUser);
  }

  async updateUser(id: number, data: Partial<User>) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Không tìm thấy User!');

    await this.userRepo.update(id, data);
    return true;
  }

  async deleteUser(id: number) {
    await this.userRepo.delete(id);
    return true;
  }
}
