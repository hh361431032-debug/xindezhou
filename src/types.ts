export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface CardType { suit: Suit; rank: Rank; }
export type GameStage = 'waiting' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';

export interface Player {
  id: string; name: string; avatar: string; chips: number; currentBet: number;
  cards: CardType[]; isFolded: boolean; isAllIn: boolean; seatIndex: number; isReady: boolean;
}

export interface PublicPlayer {
  id: string; name: string; avatar: string; chips: number; currentBet: number;
  isFolded: boolean; isAllIn: boolean; seatIndex: number; cardCount: number; showCards?: CardType[];
}

export interface RoomState {
  roomId: string; roomName: string; smallBlind: number; bigBlind: number; pot: number;
  communityCards: CardType[]; stage: GameStage; players: PublicPlayer[];
  currentTurnSeatIndex: number; currentHighBet: number;
}