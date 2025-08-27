import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { TelegramAuthService } from './telegram-auth.service.js';

@Injectable()
export class TelegramAuthGuard implements CanActivate {
  constructor(private readonly authService: TelegramAuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const initData = request.body?.initData;

    if (!initData) return false;

    const user = this.authService.validateInitData(initData);
    request.user = user; // сохраняем пользователя в request для контроллера
    return true;
  }
}
