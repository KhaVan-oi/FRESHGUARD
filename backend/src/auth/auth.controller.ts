import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() body: { username: string; password?: string }) {
    const user = await this.authService.login(body.username, body.password);
    return { status: 'success', message: 'Đăng nhập thành công', data: user };
  }

  @Post('logout')
  async logout() {
    return { status: 'success', message: 'Đã đăng xuất!' };
  }
}
