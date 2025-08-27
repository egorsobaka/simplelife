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
    console.log("initData", initData);
    try {
      const urlParams = new URLSearchParams(initData);
      const hash = urlParams.get('hash');

      console.log("hash", hash);

      if (!hash) return false;

      const dataCheckArr: string[] = [];
      urlParams.forEach((val, key) => {
        if (key !== 'hash') dataCheckArr.push(`${key}=${val}`);
      });
      dataCheckArr.sort();
      const dataCheckString = dataCheckArr.join('\n');

      console.log("hmac", dataCheckString);

      const secretKey =
        createHash('sha256')
          .update(process.env.TELEGRAM_BOT_TOKEN || '')
          .digest();

      const hmac =
        createHmac('sha256', secretKey)
          .update(dataCheckString)
          .digest('hex');

      console.log("hmac", hash);

      return hmac === hash;
    } catch (e) {
      console.error('verifyTelegramInitData error', e);
      return false;
    }
  }


}
