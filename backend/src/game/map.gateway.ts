import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { MapService } from './map.service';

@WebSocketGateway({ cors: true })
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
