import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import Peer from 'peerjs';
import { 
  Swords, 
  Bot, 
  Users,
  RotateCcw, 
  SkipForward, 
  Undo2, 
  AlertTriangle,
  Play,
  Copy,
  Wifi,
  HelpCircle,
  X,
  BookOpen,
  Loader2,
  Smartphone,
  CheckCircle2,
  Hourglass
} from 'lucide-react';

const generateDeck = () => {
  let deck = [];
  const addCards = (type, value, count, name, color) => {
    for (let i = 0; i < count; i++) deck.push({ type, value, name, color, id: Math.random() });
  };
  
  addCards('number', 1, 33, '1 Move', 'bg-blue-600');
  addCards('number', 2, 22, '2 Moves', 'bg-green-600');
  addCards('number', 3, 11, '3 Moves', 'bg-yellow-600');
  // 4 이동 카드는 지나치게 강해 삭제했습니다. 100 이동 카드는 희귀한 초대형 카드로 유지합니다.
  addCards('number', 100, 1, '100 Moves', 'bg-red-700');
  
  addCards('skip', null, 8, 'Skip', 'bg-purple-600');
  addCards('reverse', null, 8, 'Reverse', 'bg-pink-600');
  addCards('draw', 2, 8, 'Draw 2+', 'bg-cyan-600');
  // 와일드는 4장 -> 2장, 롤백도 5턴 -> 3턴으로 조정합니다.
  addCards('wild', null, 2, 'Wild (Undo x3)', 'bg-gradient-to-br from-purple-500 via-pink-500 to-red-500');
  
  return deck.sort(() => Math.random() - 0.5);
};

const Toast = ({ message, type = "info", onClose }) => {
  useEffect(() => {
    if (message) {
      const timer = setTimeout(onClose, 4000);
      return () => clearTimeout(timer);
    }
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-neutral-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 z-50 animate-bounce border border-neutral-700">
      <AlertTriangle size={18} className={type === 'error' ? "text-red-500" : "text-yellow-400"} />
      <span className="font-semibold text-lg">{message}</span>
    </div>
  );
};

const TutorialModal = ({ onClose }) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
    <div className="bg-neutral-800 text-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl border border-neutral-600">
      <div className="flex justify-between items-center p-6 border-b border-neutral-700 bg-neutral-900/50 rounded-t-3xl shadow-sm">
        <h2 className="text-3xl font-black flex items-center gap-3 text-yellow-400">
          <BookOpen size={32} /> 우노 체스 규칙 안내
        </h2>
        <button onClick={onClose} className="p-2 bg-neutral-700 hover:bg-red-500 rounded-full transition-colors">
          <X size={24} />
        </button>
      </div>
      
      <div className="p-6 overflow-y-auto flex flex-col gap-6 text-neutral-200">
        <section>
          <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">🎯 기본 규칙</h3>
          <p className="bg-neutral-900 p-4 rounded-xl border border-neutral-700 leading-relaxed text-lg">
            일반 체스 세팅에서 게임을 시작합니다.<br/>
            가장 중요한 규칙: <strong className="text-yellow-400">내 턴이 시작되면 반드시 화면 우측의 [UNO 덱]을 클릭해서 카드를 먼저 1장 뽑아야 합니다.</strong> 카드를 뽑기 전에는 체스말을 만지거나 움직일 수 없습니다!
          </p>
        </section>
        
        <section>
          <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">🃏 카드 종류 및 특수 효과</h3>
          <div className="grid gap-3">
            <div className="bg-neutral-900 p-4 rounded-xl border border-neutral-700 flex items-start gap-4">
              <span className="text-3xl">🔢</span>
              <div>
                <strong className="text-white block mb-1 text-lg">숫자 카드 (1, 2, 3, 100)</strong>
                나온 숫자만큼 내 체스말을 <span className="text-green-400 font-bold">연속으로</span> 움직일 수 있습니다.
              </div>
            </div>
            <div className="bg-neutral-900 p-4 rounded-xl border border-neutral-700 flex items-start gap-4">
              <span className="text-3xl text-purple-400"><SkipForward size={32}/></span>
              <div>
                <strong className="text-white block mb-1 text-lg">스킵 (Skip)</strong>
                현재 턴에 아무런 행동도 하지 못하고, 즉시 턴이 상대방에게 넘어갑니다.
              </div>
            </div>
            <div className="bg-neutral-900 p-4 rounded-xl border border-neutral-700 flex items-start gap-4">
              <span className="text-3xl text-pink-400"><RotateCcw size={32}/></span>
              <div>
                <strong className="text-white block mb-1 text-lg">리버스 (Reverse)</strong>
                체스판 배열이 회전하며 나와 상대방의 <span className="text-pink-400 font-bold">진영(흑/백)과 시점이 180도 완전히 바뀝니다!</span>
              </div>
            </div>
            <div className="bg-neutral-900 p-4 rounded-xl border border-neutral-700 flex items-start gap-4">
              <span className="text-3xl font-black text-cyan-400 leading-none mt-1">+2</span>
              <div>
                <strong className="text-white block mb-1 text-lg">드로우 (Draw 2+)</strong>
                잡혀서 죽은 기물을 포인트에 맞게 무덤에서 직접 골라, 내 진영의 2랭크 빈칸에 부활시킵니다.
              </div>
            </div>
            <div className="bg-neutral-900 p-4 rounded-xl border border-neutral-700 flex items-start gap-4">
              <span className="text-3xl text-yellow-400"><Undo2 size={32}/></span>
              <div>
                <strong className="text-white block mb-1 text-lg">와일드 (Wild)</strong>
                체크메이트 위기이거나 킹을 잡을 수 있는 상황에 발동하여 <span className="text-yellow-400 font-bold">시간을 3턴 전으로 되돌립니다.</span>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">👑 승리 조건</h3>
          <p className="bg-red-900/30 text-red-100 p-4 rounded-xl border border-red-500/50 leading-relaxed font-semibold text-lg">
            상대방의 <strong className="text-red-400">킹과 퀸을 모두 잡으면</strong> 승리합니다. 체크메이트 자체는 게임 종료 조건이 아닙니다!
          </p>
        </section>
      </div>
      
      <div className="p-5 border-t border-neutral-700 bg-neutral-900/50 rounded-b-3xl text-center">
        <button onClick={onClose} className="px-10 py-4 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-bold text-xl transition-all hover:scale-105 shadow-[0_0_20px_rgba(79,70,229,0.4)]">
          확인 완료
        </button>
      </div>
    </div>
  </div>
);

export default function App() {
  const [mode, setMode] = useState('menu'); // 'menu', 'ai', 'local_pvp', 'p2p_lobby', 'p2p'
  const [game, setGame] = useState(() => new Chess());
  const [fen, setFen] = useState(() => new Chess().fen());
  const [fenHistory, setFenHistory] = useState(() => [new Chess().fen()]);
  
  const [deck, setDeck] = useState(generateDeck);
  const [activeCard, setActiveCard] = useState(null);
  const [movesRemaining, setMovesRemaining] = useState(0);
  const [revivePoints, setRevivePoints] = useState(0);
  const [selectedRevivePiece, setSelectedRevivePiece] = useState(null);
  
  const [myColor, setMyColor] = useState('w');
  const [boardOrientation, setBoardOrientation] = useState('white');
  const [unoTurnColor, setUnoTurnColor] = useState('w'); 
  
  const [peer, setPeer] = useState(null);
  const [peerId, setPeerId] = useState('');
  const [remotePeerId, setRemotePeerId] = useState('');
  const [conn, setConn] = useState(null);
  
  // 대기실 상태 추가
  const [isHost, setIsHost] = useState(false);
  const [opponentConnected, setOpponentConnected] = useState(false);
  
  const [toast, setToast] = useState({ msg: '', type: 'info' });
  const [gameOverMsg, setGameOverMsg] = useState('');
  // 각 진영의 킹/퀸이 잡혔는지 기록합니다.
  const [capturedTargets, setCapturedTargets] = useState({
    w: { k: false, q: false },
    b: { k: false, q: false }
  });
  const [captureHistory, setCaptureHistory] = useState(() => [{
    w: { k: false, q: false },
    b: { k: false, q: false }
  }]);
  const [showTutorial, setShowTutorial] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  
  const isConnectingRef = useRef(false);
  const isTransitioning = useRef(false);
  const peerRef = useRef(null);
  const connRef = useRef(null);

  const stateRef = useRef({ fen, activeCard, movesRemaining, revivePoints, unoTurnColor, deck, gameOverMsg, boardOrientation, capturedTargets });
  useEffect(() => {
    stateRef.current = { fen, activeCard, movesRemaining, revivePoints, unoTurnColor, deck, gameOverMsg, boardOrientation, capturedTargets };
  }, [fen, activeCard, movesRemaining, revivePoints, unoTurnColor, deck, gameOverMsg, boardOrientation, capturedTargets]);

  const showToast = useCallback((msg, type = 'info') => setToast({ msg, type }), []);

  const initPeer = () => {
    if (peerRef.current && !peerRef.current.destroyed) {
      setMode('p2p_lobby');
      return;
    }

    setIsConnecting(true);
    isConnectingRef.current = true;

    let newPeer;
    try {
      newPeer = new Peer(undefined, {
        host: '0.peerjs.com',
        port: 443,
        secure: true,
        debug: 3,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        }
      });
    } catch (e) {
      console.error('Peer 생성 실패:', e);
      isConnectingRef.current = false;
      setIsConnecting(false);
      showToast("P2P 객체 생성에 실패했습니다.", "error");
      return;
    }

    peerRef.current = newPeer;
    setPeer(newPeer);

    const timeoutId = setTimeout(() => {
      if (isConnectingRef.current) {
        isConnectingRef.current = false;
        setIsConnecting(false);
        try { newPeer.destroy(); } catch (e) {}
        peerRef.current = null;
        setPeer(null);
        showToast("P2P 서버 연결 시간이 초과되었습니다. 네트워크를 확인해 주세요.", "error");
      }
    }, 12000);

    newPeer.on('open', (id) => {
      clearTimeout(timeoutId);
      isConnectingRef.current = false;
      setPeerId(id);
      setIsConnecting(false);
      setIsHost(true);
      setMyColor('b'); // 방장은 흑색, 접속자는 백색
      setBoardOrientation('black');
      setMode('p2p_lobby');
      console.log('[P2P] 방 생성 완료:', id);
    });

    newPeer.on('connection', (connection) => {
      console.log('[P2P] 상대방 접속 요청 들어옴:', connection.peer);
      if (connRef.current && connRef.current.open) {
        connection.close();
        return;
      }

      connRef.current = connection;
      setConn(connection);
      setupConnection(connection);
    });

    newPeer.on('error', (err) => {
      console.error('[P2P] PeerJS Error:', err);
      clearTimeout(timeoutId);
      isConnectingRef.current = false;
      setIsConnecting(false);
      showToast(`P2P 오류: ${err?.type || err?.message || 'unknown'}`, "error");
    });
  };

  const connectToPeer = () => {
    const activePeer = peerRef.current || peer;
    const targetId = remotePeerId.trim();

    if (!activePeer || activePeer.destroyed) {
      showToast("먼저 온라인 대전을 눌러 방을 생성해 주세요.", "error");
      return;
    }

    if (!targetId) {
      showToast("입장할 방 코드를 입력해 주세요.", "error");
      return;
    }

    if (targetId === peerId) {
      showToast("내 방 코드에는 입장할 수 없습니다.", "error");
      return;
    }

    if (connRef.current?.open) {
      showToast("이미 연결되어 있습니다.", "info");
      return;
    }

    const connection = activePeer.connect(targetId, {
      reliable: true,
      serialization: 'json'
    });

    connRef.current = connection;
    setConn(connection);
    setIsHost(false);
    setMyColor('w'); // 접속자는 백색
    setBoardOrientation('white');
    setupConnection(connection);

    showToast("방에 접속하는 중...");
  };

  const setupConnection = (connection) => {
    connection.on('open', () => {
      console.log('[P2P] 데이터 채널 오픈 성공!');
      setOpponentConnected(true);
      showToast("상대방이 대기실에 입장했습니다!");
    });

    connection.on('data', (data) => {
      if (!data || typeof data !== 'object') return;

      if (data.type === 'START_GAME') {
        // 방장이 시작 버튼을 누르면 전달받은 초기 상태로 게임에 진입합니다.
        const newGame = new Chess();
        if (data.fen) newGame.load(data.fen);
        setGame(newGame);
        setFen(data.fen || newGame.fen());
        if (data.deck) setDeck(data.deck);
        if (data.unoTurnColor) setUnoTurnColor(data.unoTurnColor);
        if (data.boardOrientation) setBoardOrientation(data.boardOrientation);
        setGameOverMsg('');
        setCapturedTargets(data.capturedTargets || { w: { k: false, q: false }, b: { k: false, q: false } });
        setCaptureHistory([data.capturedTargets || { w: { k: false, q: false }, b: { k: false, q: false } }]);
        setActiveCard(null);
        setMovesRemaining(0);
        setRevivePoints(0);
        setSelectedRevivePiece(null);
        setMode('p2p');
        showToast("게임이 시작되었습니다!");
        return;
      }

      if (data.type === 'REVERSE') {
        // 상대방도 자기 진영/시점을 반대로 뒤집습니다.
        setBoardOrientation(prev => prev === 'white' ? 'black' : 'white');
        setMyColor(prev => prev === 'w' ? 'b' : 'w');
        if (data.unoTurnColor) setUnoTurnColor(data.unoTurnColor);
        setActiveCard(data.activeCard || null);
        setMovesRemaining(0);
        return;
      }

      if (data.type === 'SYNC') {
        try {
          if (data.fen) {
            const newGame = new Chess();
            newGame.load(data.fen);
            setGame(newGame);
            setFen(data.fen);
          }
          if (data.activeCard !== undefined) setActiveCard(data.activeCard);
          if (data.movesRemaining !== undefined) setMovesRemaining(data.movesRemaining);
          if (data.revivePoints !== undefined) setRevivePoints(data.revivePoints);
          if (data.unoTurnColor !== undefined) setUnoTurnColor(data.unoTurnColor);
          if (data.deck !== undefined) setDeck(data.deck);
          if (data.gameOverMsg !== undefined) setGameOverMsg(data.gameOverMsg);
          if (data.capturedTargets !== undefined) setCapturedTargets(data.capturedTargets);
          if (data.toast) showToast(data.toast);
        } catch (e) {
          console.error('[P2P] SYNC 오류:', e);
        }
      }
    });

    connection.on('close', () => {
      setOpponentConnected(false);
      showToast("상대방과의 연결이 끊어졌습니다.", "error");
    });
  };

  const sendMessage = useCallback((message) => {
    const connection = connRef.current || conn;
    if (!connection || !connection.open) return false;
    try {
      connection.send(message);
      return true;
    } catch (e) {
      return false;
    }
  }, [conn]);

  const syncState = useCallback((overrides = {}) => {
    const connection = connRef.current || conn;
    if (!connection || !connection.open) return;
    const current = stateRef.current;
    try {
      connection.send({
        type: 'SYNC',
        fen: overrides.fen !== undefined ? overrides.fen : current.fen,
        activeCard: overrides.activeCard !== undefined ? overrides.activeCard : current.activeCard,
        movesRemaining: overrides.movesRemaining !== undefined ? overrides.movesRemaining : current.movesRemaining,
        revivePoints: overrides.revivePoints !== undefined ? overrides.revivePoints : current.revivePoints,
        unoTurnColor: overrides.unoTurnColor !== undefined ? overrides.unoTurnColor : current.unoTurnColor,
        deck: overrides.deck !== undefined ? overrides.deck : current.deck,
        gameOverMsg: overrides.gameOverMsg !== undefined ? overrides.gameOverMsg : current.gameOverMsg,
        capturedTargets: overrides.capturedTargets !== undefined ? overrides.capturedTargets : current.capturedTargets,
        boardOrientation: overrides.boardOrientation !== undefined ? overrides.boardOrientation : current.boardOrientation,
        toast: overrides.toast !== undefined ? overrides.toast : ''
      });
    } catch (e) {}
  }, [conn]);

  // 방장이 [게임 시작] 버튼을 눌렀을 때
  const handleStartGame = () => {
    const freshGame = new Chess();
    const initialFen = freshGame.fen();
    const initialDeck = generateDeck();

    setGame(freshGame);
    setFen(initialFen);
    setFenHistory([initialFen]);
    setDeck(initialDeck);
    setActiveCard(null);
    setMovesRemaining(0);
    setUnoTurnColor('w');
    setGameOverMsg('');
    const initialCaptured = { w: { k: false, q: false }, b: { k: false, q: false } };
    setCapturedTargets(initialCaptured);
    setCaptureHistory([initialCaptured]);
    setBoardOrientation('black'); // 방장은 흑색 시점
    setMode('p2p');

    // 상대방에게 시작 신호와 초기 세팅을 보냄 (상대방은 백색 시점)
    sendMessage({
      type: 'START_GAME',
      fen: initialFen,
      deck: initialDeck,
      unoTurnColor: 'w',
      boardOrientation: 'white', // 접속자는 백색 시점
      capturedTargets: initialCaptured
    });
  };

  const safelyPassTurn = useCallback((currentFen) => {
    const parts = currentFen.split(' ');
    const nextColor = parts[1] === 'w' ? 'b' : 'w';
    parts[1] = nextColor;
    parts[3] = '-';
    const newFen = parts.join(' ');

    try {
      const newGame = new Chess();
      newGame.load(newFen);
      setGame(newGame);
      setFen(newFen);
      setUnoTurnColor(nextColor);
      setFenHistory(prev => [...prev, newFen]);
      syncState({
        fen: newFen,
        unoTurnColor: nextColor,
        movesRemaining: 0,
        activeCard: null,
      });
    } catch (e) {
      const msg = "잘못된 위치! 킹이 위협받습니다. 게임 오버!";
      setGameOverMsg(msg);
      syncState({ gameOverMsg: msg });
    }
  }, [syncState]);

  const endTurn = useCallback((currentFen, extraSync = {}) => {
    setActiveCard(null);
    setMovesRemaining(0);

    const currentGame = new Chess(currentFen);
    if (currentGame.turn() === unoTurnColor) {
      // 현재 FEN의 턴이 아직 내 UNO 턴과 같다면, FEN의 active color까지 직접 넘긴다.
      // 추가 상태(킹/퀸 포획 기록)도 다음 턴과 함께 동기화한다.
      if (Object.keys(extraSync).length > 0) {
        const parts = currentFen.split(' ');
        const nextColor = parts[1] === 'w' ? 'b' : 'w';
        parts[1] = nextColor;
        parts[3] = '-';
        const nextFen = parts.join(' ');
        try {
          const nextGame = new Chess(nextFen);
          setGame(nextGame);
          setFen(nextFen);
          setUnoTurnColor(nextColor);
          setFenHistory(prev => [...prev, nextFen]);
          syncState({
            fen: nextFen,
            unoTurnColor: nextColor,
            movesRemaining: 0,
            activeCard: null,
            ...extraSync,
          });
        } catch (e) {
          safelyPassTurn(currentFen);
        }
      } else {
        safelyPassTurn(currentFen);
      }
    } else {
      const nextColor = currentGame.turn();
      setUnoTurnColor(nextColor);
      setFenHistory(prev => [...prev, currentFen]);
      syncState({
        fen: currentFen,
        unoTurnColor: nextColor,
        movesRemaining: 0,
        activeCard: null,
        ...extraSync,
      });
    }
  }, [unoTurnColor, safelyPassTurn, syncState]);

  const forceKeepTurn = useCallback((currentFen) => {
    const parts = currentFen.split(' ');
    parts[1] = unoTurnColor;
    parts[3] = '-';
    const newFen = parts.join(' ');

    try {
      const newGame = new Chess();
      newGame.load(newFen);
      setGame(newGame);
      setFen(newFen);
      syncState({ fen: newFen });
    } catch (e) {
      showToast("상대방이 체크 상태이므로 연속 이동할 수 없습니다!");
      endTurn(currentFen, { revivePoints: 0 });
    }
  }, [unoTurnColor, endTurn, showToast, syncState]);

  // +카드: 죽은 기물을 플레이어가 직접 골라서 부활시킵니다.
  // +2 = 2포인트. 폰 1, 나이트/비숍/룩 3, 퀸 4 포인트입니다.
  const getDeadPieces = useCallback((currentFen = fen) => {
    const points = { p: 1, n: 3, b: 3, r: 3, q: 4, k: 4 };
    const initialCount = { p: 8, n: 2, b: 2, r: 2, q: 1, k: 1 };
    const currentCount = { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 };
    const currentGame = new Chess(currentFen);

    currentGame.board().forEach(row => row.forEach(piece => {
      if (piece && piece.color === unoTurnColor) currentCount[piece.type]++;
    }));

    // 킹은 chess.js 특성상 실제 FEN에서 제거하지 않으므로 캡처 기록을 우선합니다.
    const dead = [];
    const typeOrder = ['q', 'r', 'b', 'n', 'p', 'k'];
    typeOrder.forEach(type => {
      let missing = initialCount[type] - currentCount[type];
      if (type === 'k' && capturedTargets[unoTurnColor]?.k) missing = 1;
      if (type === 'q' && capturedTargets[unoTurnColor]?.q) missing = Math.max(1, missing);
      for (let i = 0; i < Math.max(0, missing); i++) {
        dead.push({ type, points: points[type] });
      }
    });
    return dead;
  }, [fen, unoTurnColor, capturedTargets]);

  const getReviveSquares = useCallback((currentFen = fen) => {
    const currentGame = new Chess(currentFen);
    const squares = [];
    // '내 진영 기준 2랭크': 백 = 1,2랭크 / 흑 = 7,8랭크
    const ranks = unoTurnColor === 'w' ? [1, 2] : [7, 8];
    ranks.forEach(rank => {
      for (let file = 0; file < 8; file++) {
        const square = String.fromCharCode(97 + file) + rank;
        const piece = currentGame.get(square);
        const isCapturedKingPlaceholder =
          piece?.type === 'k' &&
          piece?.color === unoTurnColor &&
          capturedTargets[unoTurnColor]?.k;
        if (!piece || isCapturedKingPlaceholder) squares.push(square);
      }
    });
    return squares;
  }, [fen, unoTurnColor, capturedTargets]);

  const finishRevive = useCallback(() => {
    if (!activeCard || activeCard.type !== 'draw') return;
    setSelectedRevivePiece(null);
    setRevivePoints(0);
    const currentFen = stateRef.current.fen;
    setActiveCard(null);
    setMovesRemaining(0);
    endTurn(currentFen);
  }, [activeCard, endTurn]);

  const startRevive = useCallback((card, currentFen) => {
    const deadPieces = getDeadPieces(currentFen);
    if (deadPieces.length === 0) {
      showToast("무덤에 부활 가능한 기물이 없습니다. 1회 이동합니다.", "info");
      setMovesRemaining(1);
      syncState({ activeCard: card, movesRemaining: 1 });
      return;
    }
    setRevivePoints(card.value);
    setSelectedRevivePiece(null);
    syncState({ activeCard: card, movesRemaining: 0, revivePoints: card.value });
    showToast(`+${card.value}: 무덤에서 기물을 선택하고 내 진영 2랭크에 놓으세요.`, "info");
  }, [getDeadPieces, showToast, syncState]);

  const handleRevivePieceSelect = useCallback((type) => {
    if (!activeCard || activeCard.type !== 'draw' || revivePoints <= 0) return;
    if ((mode === 'p2p' || mode === 'ai') && unoTurnColor !== myColor) return;
    const deadPieces = getDeadPieces(stateRef.current.fen);
    const available = deadPieces.find(piece => piece.type === type && piece.points <= revivePoints);
    if (!available) {
      showToast(`현재 ${revivePoints}포인트로 부활할 수 없는 기물입니다.`, "error");
      return;
    }
    setSelectedRevivePiece(type);
    showToast(`${type === 'p' ? '폰' : type === 'n' ? '나이트' : type === 'b' ? '비숍' : type === 'r' ? '룩' : type === 'q' ? '퀸' : '킹'} 선택됨. 내 진영 2랭크의 빈칸을 클릭하세요.`, "info");
  }, [activeCard, revivePoints, getDeadPieces, showToast, mode, unoTurnColor, myColor]);

  const handleReviveSquareClick = useCallback((square) => {
    if (!activeCard || activeCard.type !== 'draw' || !selectedRevivePiece) return;
    if ((mode === 'p2p' || mode === 'ai') && unoTurnColor !== myColor) return;
    if (revivePoints <= 0) return;

    const currentFen = stateRef.current.fen;
    const currentGame = new Chess(currentFen);
    const rank = Number(square[1]);
    const validRank = unoTurnColor === 'w' ? (rank === 1 || rank === 2) : (rank === 7 || rank === 8);
    if (!validRank) {
      showToast("내 진영의 2랭크 안에서만 부활시킬 수 있습니다.", "error");
      return;
    }
    const squarePiece = currentGame.get(square);
    const isCapturedKingPlaceholderOnSquare =
      squarePiece?.type === 'k' &&
      squarePiece?.color === unoTurnColor &&
      capturedTargets[unoTurnColor]?.k;
    if (squarePiece && !isCapturedKingPlaceholderOnSquare) {
      showToast("빈 칸에만 부활시킬 수 있습니다.", "error");
      return;
    }

    const points = { p: 1, n: 3, b: 3, r: 3, q: 4, k: 4 };
    const cost = points[selectedRevivePiece];
    if (cost > revivePoints) {
      showToast(`포인트가 부족합니다. 필요한 포인트: ${cost}`, "error");
      return;
    }

    const deadPieces = getDeadPieces(currentFen);
    const deadIndex = deadPieces.findIndex(piece => piece.type === selectedRevivePiece && piece.points <= revivePoints);
    if (deadIndex === -1) {
      showToast("해당 기물이 무덤에 없습니다.", "error");
      setSelectedRevivePiece(null);
      return;
    }

    try {
      if (selectedRevivePiece === 'k') {
        for (let rankNo = 1; rankNo <= 8; rankNo++) {
          for (let fileNo = 0; fileNo < 8; fileNo++) {
            const sq = String.fromCharCode(97 + fileNo) + rankNo;
            const piece = currentGame.get(sq);
            if (piece?.type === 'k' && piece.color === unoTurnColor) {
              currentGame.remove(sq);
            }
          }
        }
      }
      currentGame.put({ type: selectedRevivePiece, color: unoTurnColor }, square);
      const newFen = currentGame.fen();
      const nextPoints = revivePoints - cost;

      const nextCaptured = {
        w: { ...capturedTargets.w },
        b: { ...capturedTargets.b }
      };
      nextCaptured[unoTurnColor][selectedRevivePiece] = false;
      setCapturedTargets(nextCaptured);
      setCaptureHistory(prev => [...prev, nextCaptured]);

      setGame(currentGame);
      setFen(newFen);
      setFenHistory(prev => [...prev, newFen]);
      setRevivePoints(nextPoints);
      setSelectedRevivePiece(null);
      syncState({ fen: newFen, activeCard, movesRemaining: 0, revivePoints: nextPoints, capturedTargets: nextCaptured });

      if (nextPoints <= 0) {
        showToast("부활 포인트를 모두 사용했습니다! 턴이 종료됩니다.", "info");
        setTimeout(() => finishRevive(), 350);
      } else {
        const nextDead = getDeadPieces(newFen).filter(piece => piece.points <= nextPoints);
        if (nextDead.length === 0) {
          showToast("남은 포인트로 부활 가능한 기물이 없습니다. 턴을 종료하세요.", "info");
        } else {
          showToast(`${cost}포인트 사용! ${nextPoints}포인트 남음.`, "info");
        }
      }
    } catch (e) {
      console.error('[부활] 기물 배치 실패:', e);
      showToast("이 칸에는 기물을 부활시킬 수 없습니다.", "error");
    }
  }, [activeCard, selectedRevivePiece, revivePoints, unoTurnColor, myColor, mode, capturedTargets, getDeadPieces, syncState, showToast, finishRevive]);

  const handleAIRevive = useCallback((maxPoints, currentFen) => {
    const currentGame = new Chess(currentFen);
    const points = { p: 1, n: 3, b: 3, r: 3, q: 4, k: 4 };
    let remaining = maxPoints;
    const deadPieces = getDeadPieces(currentFen);
    const ranks = unoTurnColor === 'w' ? [1, 2] : [7, 8];

    const emptySquares = [];
    ranks.forEach(rank => {
      for (let file = 0; file < 8; file++) {
        const square = String.fromCharCode(97 + file) + rank;
        if (!currentGame.get(square)) emptySquares.push(square);
      }
    });

    // AI는 비용이 허용되는 범위에서 비싼 기물부터 부활시키고, 위치는 2랭크 안에서 무작위로 정합니다.
    const reviveTypes = ['q', 'r', 'b', 'n', 'p', 'k'];
    for (const type of reviveTypes) {
      const index = deadPieces.findIndex(piece => piece.type === type);
      while (index !== -1 && remaining >= points[type] && emptySquares.length > 0) {
        const squareIndex = Math.floor(Math.random() * emptySquares.length);
        const square = emptySquares.splice(squareIndex, 1)[0];
        currentGame.put({ type, color: unoTurnColor }, square);
        remaining -= points[type];
        const nextIndex = deadPieces.findIndex(piece => piece.type === type);
        if (nextIndex === -1) break;
        deadPieces.splice(nextIndex, 1);
        if (deadPieces.filter(piece => piece.type === type).length === 0) break;
      }
    }

    const newFen = currentGame.fen();
    setGame(currentGame);
    setFen(newFen);
    setFenHistory(prev => [...prev, newFen]);
    setRevivePoints(0);
    setSelectedRevivePiece(null);
    setActiveCard(null);
    setMovesRemaining(0);
    syncState({ fen: newFen, activeCard: null, movesRemaining: 0 });
    setTimeout(() => endTurn(newFen), 500);
  }, [getDeadPieces, unoTurnColor, endTurn, syncState]);

  const handleWildCard = useCallback((currentFen) => {
    const currentGame = new Chess(currentFen);
    const isMated = currentGame.isCheckmate();

    if (isMated) {
      showToast("와일드! 3턴 전으로 되돌립니다!", "info");
      let newFen = currentFen;
      const historyCopy = [...fenHistory];
      const captureHistoryCopy = [...captureHistory];

      for (let i = 0; i < 3; i++) {
        if (historyCopy.length > 1) {
          historyCopy.pop();
          newFen = historyCopy[historyCopy.length - 1];
        }
        if (captureHistoryCopy.length > 1) captureHistoryCopy.pop();
      }

      const restoredTargets = captureHistoryCopy[captureHistoryCopy.length - 1] || { w: { k: false, q: false }, b: { k: false, q: false } };
      const newGame = new Chess(newFen);
      setGame(newGame);
      setFen(newFen);
      setFenHistory(historyCopy);
      setCaptureHistory(captureHistoryCopy);
      setCapturedTargets(restoredTargets);
      syncState({ fen: newFen, capturedTargets: restoredTargets, toast: "와일드카드로 3턴 전으로 롤백되었습니다!" });
      setTimeout(() => endTurn(newFen), 1800);
    } else {
      showToast("와일드! 체크메이트 위기에서만 3턴 롤백이 가능합니다.", "info");
      setMovesRemaining(2);
      syncState({ movesRemaining: 2 });
    }
  }, [fenHistory, captureHistory, endTurn, showToast, syncState]);

  const handleDrawCard = useCallback(() => {
    if (gameOverMsg || activeCard) return;

    if ((mode === 'p2p' || mode === 'ai') && unoTurnColor !== myColor) {
      showToast("상대방의 턴입니다.", "error");
      return;
    }

    const currentGame = new Chess(fen);
    if (currentGame.turn() !== unoTurnColor) {
      showToast("현재 턴인 플레이어만 카드를 뽑을 수 있습니다!", "error");
      return;
    }

    let currentDeck = [...deck];
    if (currentDeck.length === 0) currentDeck = generateDeck();
    const card = currentDeck.pop();

    setDeck(currentDeck);
    setActiveCard(card);
    setRevivePoints(0);
    setSelectedRevivePiece(null);

    if (card.type === 'number') {
      setMovesRemaining(card.value);
      syncState({ activeCard: card, deck: currentDeck, movesRemaining: card.value });
    } else if (card.type === 'skip') {
      setMovesRemaining(0);
      syncState({ activeCard: card, deck: currentDeck, movesRemaining: 0 });
      showToast("스킵! 턴이 넘어갑니다.");
      setTimeout(() => endTurn(stateRef.current.fen), 1200);
    } else if (card.type === 'reverse') {
      // 2인 UNO에서 리버스는 진영/시점을 서로 뒤집고, 현재 색의 턴을 상대방에게 넘깁니다.
      const newOrient = boardOrientation === 'white' ? 'black' : 'white';
      const newColor = myColor === 'w' ? 'b' : 'w';
      setBoardOrientation(newOrient);
      if (mode === 'p2p') setMyColor(newColor);
      setMovesRemaining(0);

      syncState({ activeCard: card, deck: currentDeck, movesRemaining: 0, unoTurnColor });
      sendMessage({ type: 'REVERSE', boardOrientation: newOrient, myColor: newColor, unoTurnColor, activeCard: card });
      showToast("리버스! 진영과 시점이 180도 뒤집혔습니다!", "info");

      // FEN의 턴 색은 유지합니다. 진영이 교체되었기 때문에 같은 색을 상대가 조종하게 됩니다.
      setTimeout(() => {
        setActiveCard(null);
        setMovesRemaining(0);
        syncState({ activeCard: null, movesRemaining: 0, unoTurnColor });
      }, 1200);
    } else if (card.type === 'draw') {
      syncState({ activeCard: card, deck: currentDeck, movesRemaining: 0 });
      startRevive(card, fen);
    } else if (card.type === 'wild') {
      syncState({ activeCard: card, deck: currentDeck, movesRemaining: 0 });
      handleWildCard(fen);
    }
  }, [deck, gameOverMsg, activeCard, fen, unoTurnColor, myColor, mode, boardOrientation, endTurn, startRevive, handleWildCard, showToast, syncState, sendMessage]);

  const onSquareClick = (square) => {
    if (activeCard?.type === 'draw' && revivePoints > 0 && selectedRevivePiece) {
      handleReviveSquareClick(square);
    }
  };

  const customPieces = {
    wK: ({ squareWidth }) => capturedTargets.w.k ? null : (
      <div style={{ width: squareWidth, height: squareWidth, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: squareWidth * 0.78, lineHeight: 1, color: '#f8fafc', textShadow: '0 2px 3px rgba(0,0,0,.65)' }}>♔</div>
    ),
    bK: ({ squareWidth }) => capturedTargets.b.k ? null : (
      <div style={{ width: squareWidth, height: squareWidth, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: squareWidth * 0.78, lineHeight: 1, color: '#111827', textShadow: '0 1px 2px rgba(255,255,255,.25)' }}>♚</div>
    )
  };

  const reviveSquareStyles = {};
  if (activeCard?.type === 'draw' && revivePoints > 0 && selectedRevivePiece) {
    getReviveSquares(fen).forEach(square => {
      reviveSquareStyles[square] = {
        boxShadow: 'inset 0 0 0 5px rgba(250, 204, 21, 0.95)',
        backgroundColor: 'rgba(250, 204, 21, 0.22)'
      };
    });
  }

  const onDrop = (sourceSquare, targetSquare) => {
    if (gameOverMsg) return false;

    if ((mode === 'p2p' || mode === 'ai') && unoTurnColor !== myColor) {
      showToast("상대방의 턴입니다.", "error");
      return false;
    }

    if (!activeCard || movesRemaining <= 0) return false;

    const currentGame = new Chess(fen);
    const piece = currentGame.get(sourceSquare);
    if (!piece || piece.color !== unoTurnColor) {
      showToast("현재 턴인 진영의 말만 움직일 수 있습니다!", "error");
      return false;
    }

    const targetPiece = currentGame.get(targetSquare);
    if (targetPiece && targetPiece.color !== unoTurnColor && (targetPiece.type === 'k' || targetPiece.type === 'q')) {
      if (capturedTargets[targetPiece.color]?.[targetPiece.type]) {
        showToast(`이미 잡힌 ${targetPiece.type === 'k' ? '킹' : '퀸'}입니다.`, 'error');
        return false;
      }
      // 킹은 체스 엔진의 '킹 캡처 불가' 규칙 때문에 실제 FEN에서 제거하지 않고,
      // 승리 판정용 기록만 남깁니다. 퀸은 일반 체스 캡처로 제거합니다.
      let canCapture = false;
      try {
        if (targetPiece.type === 'k') {
          const test = new Chess(currentGame.fen());
          test.remove(targetSquare);
          test.move({ from: sourceSquare, to: targetSquare, promotion: 'q' });
          canCapture = true;
        } else {
          const legalMoves = currentGame.moves({ square: sourceSquare, verbose: true });
          canCapture = legalMoves.some(move => move.to === targetSquare);
        }
      } catch (e) {
        canCapture = false;
      }

      if (!canCapture) return false;

      const nextCaptured = {
        w: { ...capturedTargets.w },
        b: { ...capturedTargets.b }
      };
      nextCaptured[targetPiece.color][targetPiece.type] = true;

      let nextGame = currentGame;
      if (targetPiece.type === 'q') {
        const move = currentGame.move({ from: sourceSquare, to: targetSquare, promotion: 'q' });
        if (!move) return false;
        nextGame = currentGame;
      }

      const newMovesRemaining = movesRemaining - 1;
      const newFen = nextGame.fen();
      const targetName = targetPiece.type === 'k' ? '킹' : '퀸';

      setCapturedTargets(nextCaptured);
      setCaptureHistory(prev => [...prev, nextCaptured]);
      setGame(nextGame);
      setFen(newFen);
      setFenHistory(prev => [...prev, newFen]);
      setMovesRemaining(newMovesRemaining);

      const opponent = targetPiece.color;
      const hasWon = nextCaptured[opponent].k && nextCaptured[opponent].q;
      if (hasWon) {
        const winnerMsg = `상대방의 킹과 퀸을 모두 잡았습니다! 승리!`;
        setGameOverMsg(winnerMsg);
        syncState({ gameOverMsg: winnerMsg, capturedTargets: nextCaptured, movesRemaining: 0, toast: `상대방의 ${targetName}을 잡았습니다.` });
        return true;
      }

      showToast(`${targetName}을 잡았습니다! ${targetName === '킹' ? '퀸도 잡아야 승리합니다.' : '킹도 잡아야 승리합니다.'}`);

      if (newMovesRemaining > 0) {
        forceKeepTurn(newFen);
      } else {
        // 킹은 chess.js가 실제로 이동시키지 않기 때문에 newFen의 active color가
        // 그대로 남아 있습니다. 이 경우에는 endTurn에 맡기지 않고 다음 턴 색을
        // 명시적으로 계산해서 FEN과 UNO 턴을 동시에 넘깁니다.
        const parts = newFen.split(' ');
        const nextColor = parts[1] === 'w' ? 'b' : 'w';
        parts[1] = nextColor;
        parts[3] = '-';
        const nextFen = parts.join(' ');

        try {
          const nextGame = new Chess(nextFen);
          setGame(nextGame);
          setFen(nextFen);
          setUnoTurnColor(nextColor);
          setMovesRemaining(0);
          setActiveCard(null);
          setFenHistory(prev => [...prev, nextFen]);
          syncState({
            fen: nextFen,
            unoTurnColor: nextColor,
            activeCard: null,
            movesRemaining: 0,
            capturedTargets: nextCaptured
          });
        } catch (e) {
          console.error('[턴 전환] 킹 캡처 후 다음 턴 전환 실패:', e);
          endTurn(newFen, { capturedTargets: nextCaptured });
        }
      }
      return true;
    }

    try {
      let move = currentGame.move({ from: sourceSquare, to: targetSquare, promotion: 'q' });

      // UNO Chess에서는 체크/체크메이트가 게임 종료 조건이 아닙니다.
      // 따라서 체크메이트 상태에서도 UNO 이동은 계속 가능해야 합니다.
      // chess.js가 왕의 안전 때문에 일반 이동을 거부하면, 실제 보드에서 왕을 잠시
      // 안전한 칸으로 옮긴 복제본에서 이동을 적용한 뒤 왕을 원래 칸으로 되돌려
      // '체스의 체크 판정'만 우회한 최종 FEN을 만듭니다.
      if (move === null && currentGame.isCheck()) {
        const relaxed = new Chess(fen);
        const movingPiece = relaxed.get(sourceSquare);
        const ownKingSquare = (() => {
          for (const row of relaxed.board()) {
            for (const p of row) {
              if (p && p.color === unoTurnColor && p.type === 'k') {
                // board()에는 square가 없으므로 아래 별도 탐색으로 찾습니다.
              }
            }
          }
          for (let rank = 1; rank <= 8; rank++) {
            for (let file = 0; file < 8; file++) {
              const sq = String.fromCharCode(97 + file) + rank;
              const p = relaxed.get(sq);
              if (p && p.color === unoTurnColor && p.type === 'k') return sq;
            }
          }
          return null;
        })();

        if (movingPiece && ownKingSquare) {
          const safeSquares = [];
          for (let rank = 1; rank <= 8; rank++) {
            for (let file = 0; file < 8; file++) {
              const sq = String.fromCharCode(97 + file) + rank;
              if (sq !== ownKingSquare && sq !== sourceSquare && sq !== targetSquare && !relaxed.get(sq)) {
                safeSquares.push(sq);
              }
            }
          }

          let relaxedMove = null;
          for (const safeSquare of safeSquares) {
            const test = new Chess(fen);
            try {
              test.remove(ownKingSquare);
              test.put({ type: 'k', color: unoTurnColor }, safeSquare);
              const candidate = test.move({ from: sourceSquare, to: targetSquare, promotion: 'q' });
              if (candidate) {
                // 이동 후 왕을 원래 자리로 복구합니다. 목적지에 말이 있다면 왕을
                // 복구할 수 없으므로 해당 칸은 후보에서 제외했습니다.
                test.remove(safeSquare);
                test.put({ type: 'k', color: unoTurnColor }, ownKingSquare);
                relaxedMove = test;
                break;
              }
            } catch (e) {}
          }

          if (relaxedMove) {
            const relaxedFen = relaxedMove.fen();
            currentGame.load(relaxedFen);
            move = { from: sourceSquare, to: targetSquare };
          }
        }
      }

      if (move === null) return false;

      const newMovesRemaining = movesRemaining - 1;
      const newFen = currentGame.fen();
      setMovesRemaining(newMovesRemaining);
      setGame(currentGame);
      setFen(newFen);
      setFenHistory(prev => [...prev, newFen]);
      setCaptureHistory(prev => [...prev, capturedTargets]);
      if (newMovesRemaining > 0) forceKeepTurn(newFen);
      else endTurn(newFen);
      return true;
    } catch (e) {
      return false;
    }
  };

  useEffect(() => {
    const aiColor = myColor === 'w' ? 'b' : 'w';
    if (mode !== 'ai' || gameOverMsg || unoTurnColor !== aiColor || isTransitioning.current) return;

    isTransitioning.current = true;
    const timer = setTimeout(() => {
      const current = stateRef.current;

      try {
        // AI가 아직 카드를 뽑지 않았다면 먼저 카드를 뽑습니다.
        if (!current.activeCard) {
          let currentDeck = Array.isArray(current.deck) ? [...current.deck] : [];
          if (currentDeck.length === 0) currentDeck = generateDeck();
          const card = currentDeck.pop();

          setDeck(currentDeck);
          setActiveCard(card);
          syncState({ activeCard: card, deck: currentDeck, movesRemaining: card.type === 'number' ? card.value : 0 });

          if (card.type === 'number') {
            setMovesRemaining(card.value);
            showToast(`AI 카드: ${card.name}`);
          } else if (card.type === 'skip') {
            showToast('AI 카드: Skip');
            setTimeout(() => {
              setActiveCard(null);
              setMovesRemaining(0);
              safelyPassTurn(stateRef.current.fen);
              isTransitioning.current = false;
            }, 900);
            return;
          } else if (card.type === 'reverse') {
            showToast('AI 카드: Reverse');
            setBoardOrientation(prev => prev === 'white' ? 'black' : 'white');
            setMyColor(prev => prev === 'w' ? 'b' : 'w');
            // AI 모드에서도 진영이 뒤집히지만 AI는 계속 흑색 진영을 담당하도록 게임 로직은 유지합니다.
            setTimeout(() => {
              // 진영이 바뀌었으므로 FEN의 현재 색은 그대로 두고 상대에게 넘깁니다.
              setActiveCard(null);
              setMovesRemaining(0);
              syncState({ activeCard: null, movesRemaining: 0, unoTurnColor: stateRef.current.unoTurnColor });
              isTransitioning.current = false;
            }, 900);
            return;
          } else if (card.type === 'draw') {
            showToast(`AI 카드: Draw ${card.value}+`);
            handleAIRevive(card.value, current.fen);
            isTransitioning.current = false;
            return;
          } else if (card.type === 'wild') {
            showToast('AI 카드: Wild');
            handleWildCard(current.fen);
            isTransitioning.current = false;
            return;
          }

          isTransitioning.current = false;
          return;
        }

        if (current.activeCard.type === 'number' && current.movesRemaining > 0) {
          const currentGame = new Chess(current.fen);
          const possibleMoves = currentGame.moves({ verbose: true });
          if (possibleMoves.length === 0) {
            setActiveCard(null);
            setMovesRemaining(0);
            safelyPassTurn(current.fen);
            isTransitioning.current = false;
            return;
          }

          const move = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
          const targetPiece = currentGame.get(move.to);
          const moverColor = currentGame.get(move.from)?.color;
          if (moverColor !== aiColor) {
            // 혹시 FEN의 턴이 백으로 뒤집혔으면 AI 턴으로 강제 복구합니다.
            forceKeepTurn(current.fen);
            isTransitioning.current = false;
            return;
          }

          // AI도 킹/퀸을 잡았는지 기록합니다. 킹 캡처는 엔진 특성상 직접 제거하지 않습니다.
          let nextCaptured = { w: { ...current.capturedTargets.w }, b: { ...current.capturedTargets.b } };
          if (targetPiece && targetPiece.color === 'w' && (targetPiece.type === 'k' || targetPiece.type === 'q')) {
            nextCaptured.w[targetPiece.type] = true;
          }

          currentGame.move(move);
          const newFen = currentGame.fen();
          const remaining = current.movesRemaining - 1;

          setGame(currentGame);
          setFen(newFen);
          setFenHistory(prev => [...prev, newFen]);
          setCapturedTargets(nextCaptured);
          setCaptureHistory(prev => [...prev, nextCaptured]);

          if (nextCaptured.w.k && nextCaptured.w.q) {
            const msg = 'AI가 당신의 킹과 퀸을 모두 잡았습니다! 패배!';
            setGameOverMsg(msg);
            setMovesRemaining(0);
            setActiveCard(null);
            syncState({ gameOverMsg: msg, capturedTargets: nextCaptured, movesRemaining: 0, activeCard: null });
          } else if (remaining > 0) {
            setMovesRemaining(remaining);
            // chess.js는 방금 움직인 뒤 백 턴으로 바꾸므로 AI의 연속 이동을 위해 흑 턴으로 복구합니다.
            forceKeepTurn(newFen);
          } else {
            endTurn(newFen);
          }
        } else {
          isTransitioning.current = false;
          return;
        }
      } catch (e) {
        console.error('[AI] 턴 처리 오류:', e);
        isTransitioning.current = false;
      }

      isTransitioning.current = false;
    }, current.activeCard ? 900 : 1000);

    return () => clearTimeout(timer);
  }, [mode, gameOverMsg, unoTurnColor, activeCard, movesRemaining, fen, deck, boardOrientation, handleRevive, handleWildCard, forceKeepTurn, endTurn, safelyPassTurn, syncState, showToast, myColor]);

  const resetGame = () => {
    const newGame = new Chess();
    setGame(newGame);
    setFen(newGame.fen());
    setFenHistory([newGame.fen()]);
    setDeck(generateDeck());
    setActiveCard(null);
    setMovesRemaining(0);
    if (mode === 'p2p') {
      setBoardOrientation(myColor === 'b' ? 'black' : 'white');
    } else {
      setMyColor('w');
      setBoardOrientation('white');
    }
    setUnoTurnColor('w');
    setGameOverMsg('');
    const emptyCaptured = { w: { k: false, q: false }, b: { k: false, q: false } };
    setCapturedTargets(emptyCaptured);
    setCaptureHistory([emptyCaptured]);
    if (connRef.current?.open) {
      syncState({
        fen: newGame.fen(),
        unoTurnColor: 'w',
        activeCard: null,
        movesRemaining: 0,
        gameOverMsg: '',
        capturedTargets: emptyCaptured
      });
    }
  };

  const getStatusMessage = () => {
    if (gameOverMsg) return gameOverMsg;
    const currentGame = new Chess(fen);
    if (currentGame.isCheckmate()) return "체크메이트 상태 — 킹과 퀸을 모두 잡아야 승리합니다.";
    const turnName = unoTurnColor === 'w' ? '백색 (White)' : '흑색 (Black)';
    if (currentGame.isCheck()) return `체크! ${turnName} 턴`;
    return `${turnName} 턴`;
  };

  if (mode === 'menu') {
    return (
      <div className="min-h-screen bg-neutral-900 text-white flex flex-col items-center justify-center p-4">
        <h1 className="text-6xl font-black mb-12 text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-yellow-400 to-blue-500 flex items-center gap-4 text-center">
          <Swords size={60} className="text-white hidden sm:block" /> UNO CHESS
        </h1>
        <div className="flex flex-col gap-4 w-full max-w-md">
          <button 
            onClick={() => { setMode('ai'); resetGame(); }}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 rounded-2xl text-xl font-bold transition-all transform hover:scale-105 flex items-center justify-center gap-3 shadow-lg"
          >
            <Bot size={28} /> AI와 대전하기
          </button>
          
          <button 
            onClick={() => { setMode('local_pvp'); resetGame(); setBoardOrientation('white'); }}
            className="w-full py-4 bg-teal-600 hover:bg-teal-500 rounded-2xl text-xl font-bold transition-all transform hover:scale-105 flex items-center justify-center gap-3 shadow-lg"
          >
            <Smartphone size={28} /> 같은 기기 1:1 대전 (로컬 추천 ⭐)
          </button>

          <button 
            onClick={initPeer}
            disabled={isConnecting}
            className={`w-full py-4 rounded-2xl text-xl font-bold transition-all flex items-center justify-center gap-3 shadow-lg ${
              isConnecting ? 'bg-neutral-700 text-neutral-400 cursor-wait' : 'bg-green-600 hover:bg-green-500 transform hover:scale-105'
            }`}
          >
            {isConnecting ? <Loader2 size={28} className="animate-spin text-green-400" /> : <Wifi size={28} />} 
            {isConnecting ? '서버 연결 중...' : '실시간 온라인 대전 (대기실)'}
          </button>
          
          <button 
            onClick={() => setShowTutorial(true)}
            className="w-full py-4 bg-neutral-700 hover:bg-neutral-600 rounded-2xl text-xl font-bold transition-all transform hover:scale-105 flex items-center justify-center gap-3 shadow-lg border border-neutral-600 mt-2 text-neutral-200"
          >
            <BookOpen size={28} className="text-yellow-400" /> 게임 룰 & 튜토리얼 보기
          </button>
        </div>
        {showTutorial && <TutorialModal onClose={() => setShowTutorial(false)} />}
        <Toast message={toast.msg} type={toast.type} onClose={() => setToast({msg:'', type:''})} />
      </div>
    );
  }

  // 대기실 화면 (방장 및 접속자 모두 이곳을 거침)
  if (mode === 'p2p_lobby') {
    return (
      <div className="min-h-screen bg-neutral-900 text-white flex flex-col items-center justify-center p-4">
        <div className="bg-neutral-800 p-8 rounded-3xl shadow-2xl border border-neutral-700 max-w-md w-full">
          <h2 className="text-3xl font-bold mb-6 flex items-center gap-2 text-yellow-400"><Users /> 온라인 대기실</h2>
          
          {/* 내 방 코드 섹션 */}
          <div className="mb-6">
            <label className="block text-neutral-400 text-sm font-bold mb-2">내 방 코드 (친구에게 공유):</label>
            <div className="flex bg-black rounded-lg p-1 border border-neutral-700">
              <input readOnly value={peerId} className="bg-transparent w-full p-2 outline-none text-green-400 font-mono text-xl text-center" />
              <button 
                onClick={() => { navigator.clipboard.writeText(peerId); showToast("코드가 복사되었습니다!"); }}
                className="p-2 bg-neutral-700 hover:bg-neutral-600 rounded text-white"
              >
                <Copy size={20} />
              </button>
            </div>
          </div>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-neutral-600"></div>
            <span className="flex-shrink-0 mx-4 text-neutral-400 text-sm">참가하기</span>
            <div className="flex-grow border-t border-neutral-600"></div>
          </div>

          {/* 친구 방 입장 입력 칸 */}
          <div className="mt-2 mb-6">
             <label className="block text-neutral-400 text-sm font-bold mb-2">친구 방 코드 입력:</label>
             <div className="flex gap-2">
               <input 
                 type="text" 
                 placeholder="코드 입력..."
                 value={remotePeerId}
                 onChange={(e) => setRemotePeerId(e.target.value)}
                 className="w-full bg-black border border-neutral-700 rounded-lg p-3 outline-none focus:border-indigo-500 font-mono text-white text-center uppercase"
               />
               <button 
                 onClick={connectToPeer}
                 disabled={!remotePeerId || opponentConnected}
                 className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-neutral-700 rounded-lg font-bold transition-colors whitespace-nowrap"
               >
                 입장
               </button>
             </div>
          </div>

          {/* 상대방 접속 상태 표시 및 시작 버튼 */}
          <div className="bg-neutral-900 p-4 rounded-2xl border border-neutral-700 flex flex-col items-center justify-center gap-3 mb-6">
            {opponentConnected ? (
              <div className="flex items-center gap-2 text-green-400 font-bold text-lg animate-pulse">
                <CheckCircle2 size={24} /> 상대방 접속 완료!
              </div>
            ) : (
              <div className="flex items-center gap-2 text-neutral-400 font-medium">
                <Hourglass size={20} className="animate-spin" /> 상대방의 입장을 기다리는 중...
              </div>
            )}

            {isHost && (
              <button 
                onClick={handleStartGame}
                disabled={!opponentConnected}
                className="w-full py-4 mt-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:from-neutral-700 disabled:to-neutral-700 disabled:text-neutral-500 text-white rounded-xl font-black text-xl shadow-lg transition-all transform hover:scale-105"
              >
                🎮 게임 시작하기
              </button>
            )}

            {!isHost && opponentConnected && (
              <p className="text-yellow-400 font-bold text-sm text-center">
                방장이 게임을 시작하기를 기다리고 있습니다...
              </p>
            )}
          </div>
          
          <button onClick={() => {
              setMode('menu');
              setPeerId('');
              setOpponentConnected(false);
              connRef.current?.close();
              connRef.current = null;
              setConn(null);
              if (peerRef.current) {
                try { peerRef.current.destroy(); } catch (e) {}
              }
              peerRef.current = null;
              setPeer(null);
            }} className="text-neutral-400 hover:text-white underline w-full text-center text-sm">
            메뉴로 돌아가기
          </button>
        </div>
        <Toast message={toast.msg} type={toast.type} onClose={() => setToast({msg:'', type:''})} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100 font-sans flex flex-col">
      <header className="bg-neutral-800 p-4 shadow-md flex justify-between items-center border-b border-neutral-700">
        <h1 className="text-2xl font-bold flex items-center gap-2 text-white cursor-pointer" onClick={() => {
            setMode('menu');
            setOpponentConnected(false);
            connRef.current?.close();
            connRef.current = null;
            setConn(null);
            if (peerRef.current) {
              try { peerRef.current.destroy(); } catch (e) {}
            }
            peerRef.current = null;
            setPeer(null);
          }}>
          <Swords className="text-red-500" /> Uno Chess
          {mode === 'p2p' && <span className="text-xs bg-green-600 px-2 py-1 rounded ml-2">P2P 대기실 연동됨</span>}
          {mode === 'local_pvp' && <span className="text-xs bg-teal-600 px-2 py-1 rounded ml-2">로컬 2인용</span>}
        </h1>
        <div className="flex gap-4 items-center">
          <button 
            onClick={() => setShowTutorial(true)}
            className="p-2 bg-neutral-700 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center gap-2 px-3"
          >
            <HelpCircle size={20} /> <span className="hidden sm:inline font-bold">규칙 보기</span>
          </button>
          <button 
            onClick={resetGame}
            className="p-2 bg-neutral-700 hover:bg-red-600 text-white rounded-lg transition-colors"
            title="재시작"
          >
            <RotateCcw size={20} />
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col xl:flex-row max-w-7xl w-full mx-auto p-4 gap-8 items-center xl:items-start justify-center mt-4">
        
        <div className="w-full max-w-[850px] flex-shrink-0 flex flex-col gap-4">
          <div className="flex flex-col xl:flex-row gap-4 items-stretch">
            <div className="w-full xl:w-[180px] bg-neutral-800 rounded-xl border border-neutral-700 shadow-xl p-3 flex-shrink-0">
            <div className="w-full mb-5 rounded-xl border border-neutral-700 bg-neutral-900/70 p-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-black text-sm text-neutral-300">🪦 내 무덤</h3>
                {activeCard?.type === 'draw' ? <span className="text-cyan-300 font-black text-sm">+{revivePoints}P 남음</span> : <span className="text-neutral-500 text-xs">부활 대기</span>}
              </div>
              <div className="flex flex-wrap gap-2 min-h-[42px]">
                {getDeadPieces(fen).length === 0 ? (
                  <span className="text-xs text-neutral-500">잡힌 기물이 없습니다.</span>
                ) : getDeadPieces(fen).map((piece, index) => {
                  const label = { p:'♟', n:'♞', b:'♝', r:'♜', q:'♛', k:'♚' }[piece.type];
                  const name = { p:'폰', n:'나이트', b:'비숍', r:'룩', q:'퀸', k:'킹' }[piece.type];
                  const canChooseRevive = !(mode === 'p2p' || mode === 'ai') || unoTurnColor === myColor;
                  const selectable = canChooseRevive && activeCard?.type === 'draw' && revivePoints >= piece.points;
                  const selected = selectedRevivePiece === piece.type;
                  return (
                    <button
                      key={`${piece.type}-${index}`}
                      onClick={() => selectable && handleRevivePieceSelect(piece.type)}
                      disabled={!selectable}
                      title={`${name} · ${piece.points}포인트`}
                      className={`grave-piece ${selected ? 'grave-piece-selected' : ''} ${selectable ? 'grave-piece-available' : 'grave-piece-disabled'}`}
                    >
                      <span className="text-2xl leading-none">{label}</span>
                      <span className="text-[10px] font-bold">{piece.points}P</span>
                    </button>
                  );
                })}
              </div>
              {activeCard?.type === 'draw' && revivePoints > 0 && (
                <div className="mt-3 text-center text-xs text-yellow-300 font-bold">
                  {selectedRevivePiece ? '✨ 선택한 기물을 내 진영 2랭크의 빈칸에 놓으세요.' : '👆 부활할 죽은 기물을 선택하세요.'}
                </div>
              )}
            </div>

            </div>
            <div className="w-full max-w-[650px]">
          <div className={`p-4 rounded-xl border text-center font-black text-2xl tracking-wide shadow-lg ${
            gameOverMsg ? 'bg-red-900/50 border-red-500 text-red-400 animate-pulse' : 'bg-green-900/40 border-green-500 text-green-400'
          }`}>
            {getStatusMessage()}
          </div>

          <div className="bg-neutral-800 p-4 rounded-xl shadow-2xl border border-neutral-700">
            <Chessboard 
              position={fen} 
              onPieceDrop={onDrop}
              onSquareClick={onSquareClick}
              boardOrientation={boardOrientation}
              customSquareStyles={reviveSquareStyles}
              customPieces={customPieces}
              customDarkSquareStyle={{ backgroundColor: '#475569' }}
              customLightSquareStyle={{ backgroundColor: '#cbd5e1' }}
              animationDuration={200}
            />
          </div>
          </div>
        </div>
        </div>

        <div className="w-full max-w-[400px] flex flex-col gap-4">
          <div className="bg-neutral-800 p-6 rounded-xl border border-neutral-700 shadow-xl flex flex-col items-center flex-1 min-h-[500px]">
            <h2 className="text-xl font-bold mb-4 text-neutral-300 uppercase tracking-widest border-b border-neutral-700 pb-2 w-full text-center">
              UNO 덱 영역
            </h2>
            
            <div className="flex-1 flex flex-col items-center justify-center w-full relative">
              {!activeCard ? (
                <button 
                  onClick={handleDrawCard}
                  disabled={gameOverMsg !== ''}
                  className="w-56 h-80 rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.6)] border-8 border-white flex flex-col items-center justify-center transition-all bg-gradient-to-br from-red-600 via-yellow-600 to-blue-600 hover:scale-105 cursor-pointer"
                >
                  <div className="bg-white text-black px-8 py-3 rounded-full font-black text-3xl transform -rotate-12 shadow-2xl mb-6">
                    UNO
                  </div>
                  <div className="text-white font-bold text-xl flex items-center gap-2 bg-black/50 px-5 py-2 rounded-full">
                    <Play fill="currentColor" size={20} /> 카드 뽑기
                  </div>
                  <div className="mt-8 text-sm font-semibold bg-black/40 px-3 py-1 rounded text-neutral-200">
                    남은 카드: {deck.length}장
                  </div>
                </button>
              ) : (
                <div className="flex flex-col items-center animate-in zoom-in duration-300">
                  <div className={`w-56 h-80 ${activeCard.color} rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] border-8 border-white flex flex-col items-center justify-center relative overflow-hidden`}>
                    <div className="absolute w-[85%] h-[92%] border-4 border-white/30 rounded-xl"></div>
                    <div className="text-center z-10 drop-shadow-2xl">
                      {activeCard.type === 'number' && (
                        <span className="text-8xl font-black text-white">{activeCard.value}</span>
                      )}
                      {activeCard.type === 'skip' && <SkipForward size={80} className="text-white mx-auto" />}
                      {activeCard.type === 'reverse' && <RotateCcw size={80} className="text-white mx-auto" />}
                      {activeCard.type === 'draw' && <span className="text-7xl font-black text-white">+{activeCard.value}</span>}
                      {activeCard.type === 'wild' && <Undo2 size={80} className="text-white mx-auto" />}
                      
                      <div className="mt-6 text-white font-black text-2xl uppercase tracking-widest bg-black/40 px-4 py-2 rounded-lg border border-white/20">
                        {activeCard.name}
                      </div>
                    </div>
                  </div>
                  
                  {activeCard.type === 'number' && (
                    <div className="mt-8 bg-neutral-900 px-8 py-4 rounded-full border-2 border-neutral-600 shadow-inner flex items-center gap-4">
                      <span className="text-xl text-neutral-300 font-semibold">남은 이동: </span>
                      <span className="text-4xl font-black text-yellow-400">{movesRemaining}</span>
                    </div>
                  )}
                </div>
              )}

              {activeCard?.type === 'draw' && revivePoints > 0 && (
                <button
                  onClick={finishRevive}
                  className="mt-5 px-6 py-3 rounded-xl bg-yellow-600 hover:bg-yellow-500 text-white font-black shadow-lg transition-all"
                >
                  부활 종료 · 남은 {revivePoints}P 사용하지 않기
                </button>
              )}
            </div>
            
            {!activeCard && !gameOverMsg && (
               <p className="mt-8 text-yellow-400 font-bold animate-pulse text-center bg-yellow-900/30 px-6 py-2 rounded-full">
                 👉 우노 덱을 눌러 카드를 뽑으세요!
               </p>
            )}
          </div>
        </div>
      </main>

      {showTutorial && <TutorialModal onClose={() => setShowTutorial(false)} />}
      <Toast message={toast.msg} type={toast.type} onClose={() => setToast({msg:'', type:''})} />
    </div>
  );
}
