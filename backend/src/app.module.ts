import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GameGateway } from './game/game.gateway';
import { GameService } from './game/game.service';
import { TelegramService } from './game/telegram.service';
import { MapGateway } from './game/map.gateway';
import { MapService } from './game/map.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // делает конфиг доступным во всем приложении
    }),
  ],
  providers: [GameGateway, GameService, TelegramService, MapGateway, MapService],
})
export class AppModule {}
