import React, { useEffect, useState } from 'react';
import { socket } from './socket';

interface PublicPlayer { id: string; name: string; avatar: string; chips: number; currentBet: number; isFolded: boolean; isAllIn: boolean; seatIndex: number; cardCount: number; }
interface RoomState { roomId: string; roomName: string; smallBlind: number; bigBlind: number; pot: number; communityCards: { suit: string; rank: string }[]; stage: string; players: PublicPlayer[]; currentTurnSeatIndex: number; currentHighBet: number; }

const PokerCard = ({ suit, rank }: { suit: string; rank: string }) => {
  const isRed = suit === 'hearts' || suit === 'diamonds' || suit === '♥️' || suit === '♦️';
  const displaySuit = suit === 'hearts' || suit === 'H' ? '♥' : suit === 'diamonds' || suit === 'D' ? '♦' : suit === 'clubs' || suit === 'C' ? '♣' : '♠';
  return <div className={'w-14 h-20 bg-white rounded-lg shadow-md border border-gray-300 flex flex-col justify-between p-1.5 select-none ' + (isRed ? 'text-red-600' : 'text-gray-900')}>
    <div className="text-xs font-bold leading-none"><div>{rank}</div><div className="text-sm">{displaySuit}</div></div>
    <div className="text-xl self-center leading-none">{displaySuit}</div>
    <div className="text-xs font-bold leading-none self-end rotate-180"><div>{rank}</div><div className="text-sm">{displaySuit}</div></div>
  </div>;
};

export default function App() {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [userName, setUserName] = useState('');
  const [roomIdInput, setRoomIdInput] = useState('');
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [myCards, setMyCards] = useState<{ suit: string; rank: string }[]>([]);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);
    const onRoomStateUpdate = (state: RoomState) => setRoomState(state);
    const onYourCards = (cards: { suit: string; rank: string }[]) => setMyCards(cards);
    const onError = (msg: string) => { setErrorMessage(msg); setTimeout(() => setErrorMessage(''), 3000); };
    socket.on('connect', onConnect); socket.on('disconnect', onDisconnect);
    socket.on('room_state_update', onRoomStateUpdate); socket.on('your_cards', onYourCards); socket.on('error_message', onError);
    return () => {
      socket.off('connect', onConnect); socket.off('disconnect', onDisconnect);
      socket.off('room_state_update', onRoomStateUpdate); socket.off('your_cards', onYourCards); socket.off('error_message', onError);
    };
  }, []);

  const createRoom = () => {
    if (!userName.trim()) return alert('请输入你的玩家昵称！');
    socket.emit('create_room', { roomName: userName + ' 的俱乐部', userName });
  };
  const joinRoom = () => {
    if (!userName.trim()) return alert('请输入你的玩家昵称！');
    if (!roomIdInput.trim()) return alert('请输入房间号！');
    socket.emit('join_room', { roomId: roomIdInput.trim(), userName });
  };
  const startGame = () => { if (roomState) socket.emit('start_game', { roomId: roomState.roomId }); };

  return <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center p-4 font-sans">
    <header className="w-full max-w-5xl flex justify-between items-center bg-slate-900 border border-slate-800 rounded-xl px-6 py-3 mb-6 shadow-lg">
      <div className="flex items-center gap-3"><span className="text-2xl">♠️</span><h1 className="text-xl font-bold text-amber-400">Texas Hold'em Online</h1></div>
      <div className="flex items-center gap-2 text-sm"><span className={'w-3 h-3 rounded-full ' + (isConnected ? 'bg-emerald-500' : 'bg-rose-500')}></span><span className="text-slate-400">{isConnected ? '服务器在线 (4000)' : '未连接到服务器'}</span></div>
    </header>
    {errorMessage && <div className="w-full max-w-5xl bg-rose-500/20 border border-rose-500/50 text-rose-300 px-4 py-3 rounded-xl mb-4 text-center">⚠️ {errorMessage}</div>}

    {!roomState ? <main className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
      <h2 className="text-lg font-semibold text-center text-slate-200 mb-6">进入扑克竞技场</h2>
      <label className="block text-xs text-slate-400 mb-1">玩家昵称</label>
      <input className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 mb-4" placeholder="例如: Vegas_Pro" value={userName} onChange={e => setUserName(e.target.value)} />
      <button onClick={createRoom} className="w-full bg-emerald-600 hover:bg-emerald-500 font-semibold py-3 rounded-lg mb-3">➕ 创建新对局房间</button>
      <div className="flex gap-2"><input className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2" placeholder="房间 ID" value={roomIdInput} onChange={e => setRoomIdInput(e.target.value)} /><button onClick={joinRoom} className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg">加入</button></div>
    </main> : <main className="w-full max-w-5xl flex flex-col items-center">
      <div className="w-full flex justify-between mb-4 text-xs text-slate-400"><span>房间号: <b className="text-amber-400">{roomState.roomId}</b></span><span>阶段: <b className="text-emerald-400">{roomState.stage}</b></span></div>
      <div className="w-full relative bg-emerald-900 border-[12px] border-amber-950 rounded-[100px] p-8 min-h-[460px] flex flex-col justify-between items-center">
        <div className="w-full grid grid-cols-3 gap-4">{roomState.players.slice(0,3).map(p => <div key={p.id} className="flex flex-col items-center p-2 rounded-xl bg-slate-900/80 border border-slate-800"><span className="text-xs font-bold">{p.name}{p.id === socket.id ? ' (你)' : ''}</span><span className="text-xs text-amber-400">{'$'}{p.chips}</span><div className="flex gap-1 mt-1">{Array.from({length:p.cardCount}).map((_,i)=><div key={i} className="w-4 h-6 bg-blue-800 rounded border border-blue-600"/>)}</div></div>)}</div>
        <div className="flex flex-col items-center gap-3 my-auto"><div className="bg-black/60 border border-amber-500/40 rounded-full px-6 py-1.5"><span className="text-xs text-amber-200/70 mr-2">POT</span><span className="text-lg font-bold text-amber-400">{'$'}{roomState.pot}</span></div>
          <div className="flex gap-2 min-h-[88px] items-center bg-black/30 p-3 rounded-2xl">{roomState.communityCards.length ? roomState.communityCards.map((c,i)=><PokerCard key={i} suit={c.suit} rank={c.rank}/>) : <span className="text-xs text-emerald-300/50">等待发牌...</span>}</div>
        </div>
        <div className="w-full grid grid-cols-3 gap-4">{roomState.players.slice(3,6).map(p => <div key={p.id} className="flex flex-col items-center p-2 rounded-xl bg-slate-900/80 border border-slate-800"><span className="text-xs font-bold">{p.name}{p.id === socket.id ? ' (你)' : ''}</span><span className="text-xs text-amber-400">{'$'}{p.chips}</span><div className="flex gap-1 mt-1">{Array.from({length:p.cardCount}).map((_,i)=><div key={i} className="w-4 h-6 bg-blue-800 rounded border border-blue-600"/>)}</div></div>)}</div>
      </div>
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-4 mt-6 flex justify-between items-center"><div><div className="text-xs text-slate-400 mb-2">你的底牌（仅自己可见）</div><div className="flex gap-2 min-h-[80px]">{myCards.length ? myCards.map((c,i)=><PokerCard key={i} suit={c.suit} rank={c.rank}/>) : <span className="text-xs text-slate-500 self-center">暂未发牌</span>}</div></div>{roomState.stage === 'waiting' && <button onClick={startGame} className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold px-6 py-3 rounded-xl">🎲 开始发牌</button>}</div>
    </main>}
  </div>;
}