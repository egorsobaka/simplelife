import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { MapService } from './map.service';

@WebSocketGateway({
  cors: {
    origin: ['https://game.almet22.ru'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
  path: '/socket.io', // чтобы совпадало с фронтендом
})
export class MapGateway {
  @WebSocketServer()
  server: Server;

  constructor(private readonly mapService: MapService) { }

  @SubscribeMessage('getChunk')
  handleGetChunk(@MessageBody() data: { x: number; y: number }) {
    if (!data || typeof data.x !== 'number' || typeof data.y !== 'number') {
      return { error: 'Invalid chunk coordinates' };
    }
    try {
      return this.mapService.generateMap(data.x, data.y);
    } catch (err) {
      console.error('Error generating chunk:', err);
      return { error: 'Failed to generate chunk' };
    }
  }

}
