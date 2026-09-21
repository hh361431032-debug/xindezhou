import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { Player, CardType, GameStage, PublicPlayer, RoomState } from './types';
import { createDeck } from './poker';

const app = express();
app.use(cors());
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*', methods: ['GET', 'POST'] } });

interface InternalRoom {
  id: string; name: string; smallBlind: number; bigBlind: number; pot: number;
  communityCards: CardType[]; stage: GameStage; players: Player[]; deck: CardType[];
  currentTurnSeatIndex: number; currentHighBet: number;
}
const rooms: Record<string, InternalRoom> = {};

function getPublicRoomState(room: InternalRoom): RoomState {
  const publicPlayers: PublicPlayer[] = room.players.map((p) => ({
    id: p.id, name: p.name, avatar: p.avatar, chips: p.chips, currentBet: p.currentBet,
    isFolded: p.isFolded, isAllIn: p.isAllIn, seatIndex: p.seatIndex,
    cardCount: p.cards.length, showCards: room.stage === 'showdown' ? p.cards : undefined,
  }));
  return {
    roomId: room.id, roomName: room.name, smallBlind: room.smallBlind, bigBlind: room.bigBlind,
    pot: room.pot, communityCards: room.communityCards, stage: room.stage,
    players: publicPlayers, currentTurnSeatIndex: room.currentTurnSeatIndex,
    currentHighBet: room.currentHighBet,
  };
}

io.on('connection', (socket) => {
  socket.on('create_room', ({ roomName, userName, avatar }) => {
    const roomId = 'room_' + Math.random().toString(36).substring(2, 8);
    const hostPlayer: Player = {
      id: socket.id, name: userName || '房主',
      avatar: avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + socket.id,
      chips: 5000, currentBet: 0, cards: [], isFolded: false, isAllIn: false,
      seatIndex: 0, isReady: true,
    };
    rooms[roomId] = {
      id: roomId, name: roomName || '德州大厅', smallBlind: 10, bigBlind: 20, pot: 0,
      communityCards: [], stage: 'waiting', players: [hostPlayer], deck: [],
      currentTurnSeatIndex: 0, currentHighBet: 0,
    };
    socket.join(roomId);
    socket.emit('room_created', { roomId });
    io.to(roomId).emit('room_state_update', getPublicRoomState(rooms[roomId]));
  });

  socket.on('join_room', ({ roomId, userName, avatar }) => {
    const room = rooms[roomId];
    if (!room) return socket.emit('error_message', '房间不存在！');
    if (room.players.length >= 6) return socket.emit('error_message', '房间已满（最多6人）！');

    const occupiedSeats = room.players.map((p) => p.seatIndex);
    let freeSeat = 0;
    while (occupiedSeats.includes(freeSeat)) freeSeat++;

    const newPlayer: Player = {
      id: socket.id, name: userName || '玩家_' + (freeSeat + 1),
      avatar: avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + socket.id,
      chips: 5000, currentBet: 0, cards: [], isFolded: false, isAllIn: false,
      seatIndex: freeSeat, isReady: true,
    };
    room.players.push(newPlayer);
    socket.join(roomId);
    io.to(roomId).emit('room_state_update', getPublicRoomState(room));
  });

  socket.on('start_game', ({ roomId }) => {
    const room = rooms[roomId];
    if (!room) return;
    room.deck = createDeck();
    room.communityCards = [];
    room.pot = 0;
    room.stage = 'preflop';
    room.players.forEach((p) => {
      p.cards = [room.deck.pop()!, room.deck.pop()!];
      p.isFolded = false;
      p.currentBet = 0;
      io.to(p.id).emit('your_cards', p.cards);
    });
    io.to(roomId).emit('room_state_update', getPublicRoomState(room));
  });

  socket.on('disconnect', () => {
    for (const roomId in rooms) {
      const room = rooms[roomId];
      const index = room.players.findIndex((p) => p.id === socket.id);
      if (index !== -1) {
        room.players.splice(index, 1);
        if (room.players.length === 0) delete rooms[roomId];
        else io.to(roomId).emit('room_state_update', getPublicRoomState(room));
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => console.log('德州扑克 Socket.IO 联机后端已启动，端口:', PORT));