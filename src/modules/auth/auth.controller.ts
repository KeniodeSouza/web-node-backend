import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login') // Público
  async login(@Body() body: AuthDto) {
    return this.authService.login(body.email, body.passwd);
  }

}
