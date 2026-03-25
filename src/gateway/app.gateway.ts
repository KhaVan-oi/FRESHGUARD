import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ cors: true })
export class AppGateway {
  @WebSocketServer()
  server: Server;

  emitRealtimeData(eventName: string, data: any) {
    this.server.emit(eventName, data);
  }
}
