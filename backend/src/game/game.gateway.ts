import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GameService } from './game.service';
import { MapService } from './map.service';
import { createHash, createHmac } from 'crypto';

interface ChopTap {
  tileX: number;
  tileY: number;
  count: number;
}
@WebSocketGateway({
  cors: {
    origin: ['https://game.almet22.ru'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
  path: '/socket.io',
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly gameService: GameService,
    private readonly mapService: MapService,
  ) { }

  afterInit(server: Server) {
    this.gameService.setServer(server);
  }

  handleConnection(@ConnectedSocket() client: Socket) {
    const clientId = client.id;
    if (!clientId) {
      client.disconnect(true);
      return;
    }
    this.sendSnapshot(client);
  }

  handleDisconnect(@ConnectedSocket() client: Socket) {
    const clientId = client.id;
    if (!clientId) return;
    this.gameService.removePlayer(clientId);
    this.broadcastSnapshot();
  }

  @SubscribeMessage('chopTiles')
  handleChopTiles(
    @MessageBody() data: { chunkX: number; chunkY: number; taps: ChopTap[] },
    @ConnectedSocket() client: Socket
  ) {
    const clientId = client.id;
    if (!clientId) return;

    const playerState = this.gameService.getPlayer(clientId);
    if (!playerState) return;

    const chunkId = `${data.chunkX}_${data.chunkY}`;
    const chunk = this.mapService.getChunk(data.chunkX, data.chunkY);
    if (!chunk) return;

    let totalWood = 0;

    data.taps.forEach(tap => {
      const mapItem = chunk.items.find(item => item.x === tap.tileX && item.y === tap.tileY);
      if (!mapItem) return;

      if (mapItem.type === 'woodItem') {
        // добавляем ресурсы игроку
        this.gameService.addItemToInventory(clientId, 'wood', tap.count);
        totalWood += tap.count;

        // удаляем тайл с карты
        chunk.items = chunk.items.filter(item => !(item.x === tap.tileX && item.y === tap.tileY));

        // отправляем событие всем клиентам, что тайл удалён
        this.server.emit('itemRemoved', { chunk: chunkId, x: tap.tileX, y: tap.tileY });
      }
    });

    if (totalWood > 0) {
      // можно отправить обновлённый инвентарь игроку
      client.emit('chopped', { item: 'wood', amount: totalWood, inventory: this.gameService.getPlayerInventory(clientId) });
    }
  }

  @SubscribeMessage('move')
  handleMove(
    @MessageBody() data: { x: number; y: number; anim: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (!data || typeof data.x !== 'number' || typeof data.y !== 'number') return;

    const clientId = client.id;
    if (!clientId) return;

    this.gameService.updatePosition(clientId, data.x, data.y, data.anim);
    this.broadcastSnapshot();
  }

  @SubscribeMessage('requestChunks')
  handleRequestChunks(
    @MessageBody() data: { cx: number; cy: number },
    @ConnectedSocket() client: Socket,
  ) {
    if (!data || typeof data.cx !== 'number' || typeof data.cy !== 'number') return;

    const chunks: Record<string, any> = {};

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const x = data.cx + dx;
        const y = data.cy + dy;
        const chunkData = this.mapService.generateMap(x, y);
        chunks[`${x}_${y}`] = chunkData;
      }
    }

    client.emit('snapshot', {
      players: this.gameService.getSnapshot().players,
      player: this.gameService.getPlayer(client.id),
      chunks,
    });
  }

  @SubscribeMessage('dropItem')
  handleDropItem(
    @MessageBody() data: { itemType: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (!data || typeof data.itemType !== 'string') return;

    const clientId = client.id;
    if (!clientId) return;

    const playerState = this.gameService.getPlayer(clientId);
    if (!playerState) return;

    const droppedItem = this.gameService.dropItem(clientId, data.itemType);

    if (droppedItem) {
      this.server.emit('itemDropped', droppedItem);
    }
  }

  private sendSnapshot(client: Socket) {
    const snapshot = this.gameService.getSnapshot();
    client.emit('snapshot', {
      players: snapshot.players,
      player: this.gameService.getPlayer(client.id),
      chunks: {},
    });
  }

  private broadcastSnapshot() {
    const snapshot = this.gameService.getSnapshot();
    this.server.emit('snapshot', {
      players: snapshot.players,
      chunks: {},
    });
  }

  @SubscribeMessage('join')
  handleJoin(
    @MessageBody() data: { userId: any; initData: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (!data?.initData) {
      const spawn = this.gameService.addPlayer(client.id, data.userId);
      client.emit('spawn', spawn);
      return;
    }

    const isValid = this.verifyTelegramInitData(data.initData);
    console.log("isValid", isValid);
    if (!isValid) {
      console.log('❌ Подпись Telegram недействительна');
      client.disconnect(true);
      return;
    }

    if (!data.userId) {
      client.disconnect(true);
      return;
    }
    const spawn = this.gameService.addPlayer(client.id, data.userId);
    client.emit('spawn', spawn);
    this.sendSnapshot(client);
  }

  private verifyTelegramInitData(initData: string): boolean {
    try {
      const urlParams = new URLSearchParams(initData);
      const hash = urlParams.get('hash');

      if (!hash) return false;

      const dataCheckArr: string[] = [];
      urlParams.forEach((val, key) => {
        if (key !== 'hash') dataCheckArr.push(`${key}=${val}`);
      });
      dataCheckArr.sort();
      const dataCheckString = dataCheckArr.join('\n');

      const secretKey = createHmac('sha256', 'WebAppData')
        .update(process.env.TELEGRAM_BOT_TOKEN || '')
        .digest();

      const hmac = createHmac('sha256', secretKey)
        .update(dataCheckString)
        .digest('hex');

      return `${hmac}`.trim() === `${hash}`.trim();
    } catch (e) {
      console.error('verifyTelegramInitData error', e);
      return false;
    }
  }




}
