import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { GameService } from './game/game.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService, private readonly gameService: GameService) { }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

}
