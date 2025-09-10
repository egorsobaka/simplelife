import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
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
import { MongooseModule } from '@nestjs/mongoose';
import { PlayerSchema } from './game/player.schema';
import { ChunkSchema } from './game/chunk.schema';
import { ChunkController } from './game/chunk.controller';

@Module({
  controllers: [CraftingController, ChunkController],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([
      { name: 'Player', schema: PlayerSchema },
      { name: 'Chunk', schema: ChunkSchema }
    ]),
  ],
  providers: [
    TelegramAuthService,
    CraftingGateway,
    GameGateway,
    GameService,
    TelegramService,
    MapGateway,
    MapService,
    AppController,
    CraftingController,
    AppService,
    CraftingService,
    ChunkController,
  ],
})
export class AppModule { }