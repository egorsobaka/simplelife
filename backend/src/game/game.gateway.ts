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

@WebSocketGateway({ cors: true })
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly gameService: GameService) {}

  handleConnection(@ConnectedSocket() client: Socket) {
    try {
      const clientId = client.id;
      if (!clientId) {
        console.warn('Некорректный client.id при подключении:', client.id);
        client.disconnect(true);
        return;
      }

      this.gameService.addPlayer(clientId, clientId);
      this.broadcast();
    } catch (err) {
      console.error('Ошибка при подключении клиента:', err);
      client.disconnect(true);
    }
  }

  handleDisconnect(@ConnectedSocket() client: Socket) {
    try {
      const clientId = client.id;
      if (!clientId) {
        this.gameService.removePlayer(clientId);
        this.broadcast();
      }
    } catch (err) {
      console.error('Ошибка при отключении клиента:', err);
    }
  }

  @SubscribeMessage('move')
  handleMove(
    @MessageBody() data: { x: number; y: number },
    @ConnectedSocket() client: Socket
  ) {
    try {
      if (!data || typeof data.x !== 'number' || typeof data.y !== 'number') {
        console.warn('Некорректные данные движения:', data);
        return;
      }

      const clientId = client.id;
      if (!clientId) return;

      this.gameService.updatePosition(clientId, data.x, data.y);
      this.broadcast();
    } catch (err) {
      console.error('Ошибка в handleMove:', err);
      client.emit('error', { message: 'Ошибка при обработке движения' });
    }
  }

  private broadcast() {
    try {
      const snapshot = this.gameService.getSnapshot();
      if (!snapshot || typeof snapshot !== 'object') {
        console.warn('Некорректный snapshot для рассылки:', snapshot);
        return;
      }
      this.server.emit('snapshot', snapshot);
    } catch (err) {
      console.error('Ошибка при broadcast:', err);
    }
  }
}
