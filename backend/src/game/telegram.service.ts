import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
const TelegramBot = require('node-telegram-bot-api');

@Injectable()
export class TelegramService {
  private bot: typeof TelegramBot;

  constructor(private configService: ConfigService) {
    const token = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    if (!token) throw new Error('Telegram token not set in .env');

    this.bot = new TelegramBot(token, { polling: false });
  }

  notifyPlayers(p1Id: string, p2Id: string) {
    // this.bot.sendMessage(p1Id, `Вы встретились с игроком ${p2Id}!`);
    // this.bot.sendMessage(p2Id, `Вы встретились с игроком ${p1Id}!`);
  }
}
