import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { ActionLog } from '../entities/action-log.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(ActionLog) private actionLogRepo: Repository<ActionLog>,
  ) {}

  async login(username: string, password?: string) {
    const user = await this.userRepo.findOne({ where: { username } });
    if (!user) {
      throw new HttpException(
        'Tài khoản không tồn tại!',
        HttpStatus.UNAUTHORIZED,
      );
    }

    // Thực tế sẽ dùng bcrypt check password ở đây. Đồ án thì check nhanh:
    // if (user.password !== password) throw new HttpException('Sai mật khẩu!', HttpStatus.UNAUTHORIZED);

    // Ghi log người dùng đăng nhập
    await this.actionLogRepo.save(
      this.actionLogRepo.create({
        action_type: 'USER_LOGIN',
        action_value: `User ${user.username} đăng nhập vào hệ thống`,
        trigger_source: 'SYSTEM',
      }),
    );

    return user;
  }
}
