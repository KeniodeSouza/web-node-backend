import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthDto } from './dto/auth.dto';
import { Public } from 'src/common/guards/decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('login') // Público
  async login(@Body() data: AuthDto) {
    return this.authService.login(data.email, data.passwd);
  }

  @Public()
  @Post('reset') // Público
  async reset(@Body() data: AuthDto) {
    return this.authService.reset(data.email, data.passwd);
  }

}
