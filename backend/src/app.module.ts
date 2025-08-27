import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GameGateway } from './game/game.gateway';
import { GameService } from './game/game.service';
import { TelegramService } from './game/telegram.service';
import { MapGateway } from './game/map.gateway';
import { MapService } from './game/map.service';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CraftingService } from './game/crafting.service';
import { CraftingController } from './game/crafting.controller';
import { CraftingGateway } from './game/crafting.gateway';
import { TelegramAuthService } from './game/telegram-auth.service';

@Module({
  controllers: [CraftingController],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // делает конфиг доступным во всем приложении
    }),
  ],
  providers: [TelegramAuthService, CraftingGateway, GameGateway, GameService, TelegramService, MapGateway, MapService, AppController, CraftingController, AppService, CraftingService],
})
export class AppModule { }
