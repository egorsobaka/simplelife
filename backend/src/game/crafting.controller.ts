import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { CraftingService, CraftableItem } from './crafting.service.js';
import { CraftingGateway } from './crafting.gateway.js';
import { TelegramAuthGuard } from './telegram-auth.guard.js';

@Controller('crafting')
export class CraftingController {
  constructor(
    private readonly craftingService: CraftingService,
    private readonly gateway: CraftingGateway,
  ) {}

  @Post('check')
  @UseGuards(TelegramAuthGuard)
  checkCraftable(@Body() body: any): CraftableItem[] {
    const { inventory, ownedItems = [] } = body;
    return this.craftingService.generateCrafting(inventory, ownedItems);
  }

  @Post('craft')
  @UseGuards(TelegramAuthGuard)
  craft(@Body() body: any, @Body('user') user: any) {
    return this.craftingService.craftItem(
      body.itemName,
      body.inventory,
      body.ownedItems,
      (event, payload) => {
        this.gateway.server.emit(event, { user, ...payload });
      },
    );
  }
}
