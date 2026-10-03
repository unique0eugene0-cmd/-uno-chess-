import React, {
  useState,
  useEffect,
  useCallback,
  useRef
} from 'react';
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
  CheckCircle,
  Hourglass
} from 'lucide-react';

/* =========================================================
   기본 데이터
   ========================================================= */

const PIECE_POINTS = { p: 1, n: 3, b: 3, r: 3, q: 4, k: 4 };
const PIECE_NAMES = { p: '폰', n: '나이트', b: '비숍', r: '룩', q: '퀸', k: '킹' };
const PIECE_ORDER = ['q', 'r', 'b', 'n', 'p', 'k'];

const INITIAL_COUNT = { p: 8, n: 2, b: 2, r: 2, q: 1, k: 1 };

const createEmptyCaptured = () => ({
  w: { k: false, q: false },
  b: { k: false, q: false }
});

const cloneCaptured = captured => ({
  w: { k: !!captured?.w?.k, q: !!captured?.w?.q },
  b: { k: !!captured?.b?.k, q: !!captured?.b?.q }
});

/* =========================================================
   [수정됨] 무적 체스 인스턴스 생성 (Custom FEN Forcer)
   ========================================================= */
const createSafeGame = (fen) => {
  const game = new Chess();
  if (!fen) return game;
  
  try {
    const success = game.load(fen);
    if (!success) throw new Error('Invalid FEN');
  } catch (e) {
    // 🔥 킹이 없거나 다중턴 체크 상태 등으로 FEN이 거부되면 수동으로 강제 배치합니다.
    try {
      const parts = fen.split(' ');
      const turn = parts[1] === 'b' ? 'b' : 'w';
      
      // 1. 강제로 턴을 맞춘 빈 체스판 로드 (에러 방지용 임시 킹 2개 포함)
      game.load(`4k3/8/8/8/8/8/8/4K3 ${turn} - 0 1`);
      game.remove('e1');
      game.remove('e8');
      
      // 2. 엔진 검증을 무시하고 현재 기물들을 정확한 위치에 수동(put) 배치
      const rows = parts[0].split('/');
      for (let r = 0; r < 8; r++) {
        if (!rows[r]) continue;
        let c = 0;
        for (let i = 0; i < rows[r].length; i++) {
          const char = rows[r][i];
          if (!isNaN(char)) {
            c += parseInt(char);
          } else {
            const color = char === char.toLowerCase() ? 'b' : 'w';
            game.put({ type: char.toLowerCase(), color }, String.fromCharCode(97 + c) + (8 - r));
            c++;
          }
        }
      }
    } catch (innerE) {
      console.error('[Engine Override Failed]', innerE);
    }
  }
  return game;
};

/* =========================================================
   UNO 덱
   ========================================================= */

const generateDeck = () => {
  const deck = [];
  const addCards = (type, value, count, name, color) => {
    for (let i = 0; i < count; i++) {
      deck.push({
        type, value, name, color,
        id: `${Date.now()}-${Math.random()}-${i}`
      });
    }
  };

  addCards('number', 1, 33, '1 Move', 'bg-blue-600');
  addCards('number', 2, 22, '2 Moves', 'bg-green-600');
  addCards('number', 3, 11, '3 Moves', 'bg-yellow-600');
  addCards('number', 100, 1, '100 Moves', 'bg-red-700');
  addCards('skip', null, 8, 'Skip', 'bg-purple-600');
  addCards('reverse', null, 8, 'Reverse', 'bg-pink-600');
  addCards('draw', 2, 8, 'Draw 2+', 'bg-cyan-600');
  addCards('wild', null, 2, 'Wild (Undo x3)', 'bg-gradient-to-br from-purple-500 via-pink-500 to-red-500');

  return deck.sort(() => Math.random() - 0.5);
};

/* =========================================================
   체스닷컴풍 기물 SVG
   ========================================================= */
const ChessPieceSVG = ({ type, color, squareWidth = 80 }) => {
  const isWhite = color === 'w';
  const fill = isWhite ? '#f3f0e8' : '#252522';
  const stroke = isWhite ? '#bdb9af' : '#0d0d0c';
  const highlight = isWhite ? '#ffffff' : '#55544f';
  const shadow = isWhite
    ? 'drop-shadow(0 2px 2px rgba(0,0,0,.32))'
    : 'drop-shadow(0 3px 3px rgba(0,0,0,.6))';

  return (
    <svg width={squareWidth} height={squareWidth} viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block', overflow: 'visible', filter: shadow }}>
      {type === 'k' && (
        <>
          <path d="M36 7 H44 V14 H51 V22 H44 V28 H36 V22 H29 V14 H36 Z" fill={fill} stroke={stroke} strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M30 30 C30 26 34 23 40 23 C46 23 50 26 50 30 L48 37 H32 Z" fill={fill} stroke={stroke} strokeWidth="1.7" />
          <path d="M32 35 H48 L50 43 H30 Z" fill={fill} stroke={stroke} strokeWidth="1.5" />
          <path d="M30 42 C30 48 26 53 22 58 C19 62 18 66 18 68 H62 C62 66 61 62 58 58 C54 53 50 48 50 42 Z" fill={fill} stroke={stroke} strokeWidth="1.8" />
          <path d="M15 67 C15 64 18 62 22 62 H58 C62 62 65 64 65 67 L68 72 H12 Z" fill={fill} stroke={stroke} strokeWidth="1.8" strokeLinejoin="round" />
          {isWhite && <path d="M26 48 C29 43 32 39 35 37" fill="none" stroke={highlight} strokeWidth="3" strokeLinecap="round" opacity=".8" />}
        </>
      )}
      {type === 'q' && (
        <>
          <path d="M18 30 L22 16 L31 25 L40 12 L49 25 L58 16 L62 30 L56 36 H24 Z" fill={fill} stroke={stroke} strokeWidth="1.7" strokeLinejoin="round" />
          <circle cx="22" cy="16" r="2.6" fill={highlight} />
          <circle cx="40" cy="12" r="2.6" fill={highlight} />
          <circle cx="58" cy="16" r="2.6" fill={highlight} />
          <path d="M29 34 H51 L49 43 H31 Z" fill={fill} stroke={stroke} strokeWidth="1.5" />
          <path d="M31 42 C31 48 27 53 23 58 C20 62 19 66 19 68 H61 C61 66 60 62 57 58 C53 53 49 48 49 42 Z" fill={fill} stroke={stroke} strokeWidth="1.8" />
          <path d="M15 67 C15 64 18 62 22 62 H58 C62 62 65 64 65 67 L68 72 H12 Z" fill={fill} stroke={stroke} strokeWidth="1.8" />
          {isWhite && <path d="M27 48 C30 43 33 39 36 37" fill="none" stroke={highlight} strokeWidth="3" strokeLinecap="round" opacity=".8" />}
        </>
      )}
      {type === 'r' && (
        <>
          <path d="M21 31 V17 H29 V23 H35 V17 H45 V23 H51 V17 H59 V31 L54 36 H26 Z" fill={fill} stroke={stroke} strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M28 34 H52 L50 43 C50 48 54 53 58 58 C61 62 62 66 62 68 H18 C18 66 19 62 22 58 C26 53 30 48 30 43 Z" fill={fill} stroke={stroke} strokeWidth="1.8" />
          <path d="M15 67 H65 L68 72 H12 Z" fill={fill} stroke={stroke} strokeWidth="1.8" />
        </>
      )}
      {type === 'b' && (
        <>
          <path d="M40 11 C33 14 28 21 29 28 C30 34 35 37 36 40 L31 46 H49 L44 40 C45 37 50 34 51 28 C52 21 47 14 40 11 Z" fill={fill} stroke={stroke} strokeWidth="1.8" />
          <path d="M45 18 L35 35" fill="none" stroke={isWhite ? '#a8a49b' : '#0e0e0d'} strokeWidth="3" strokeLinecap="round" />
          <path d="M31 44 C31 50 27 54 23 59 C20 63 19 66 19 68 H61 C61 66 60 63 57 59 C53 54 49 50 49 44 Z" fill={fill} stroke={stroke} strokeWidth="1.8" />
          <path d="M15 67 H65 L68 72 H12 Z" fill={fill} stroke={stroke} strokeWidth="1.8" />
        </>
      )}
      {type === 'n' && (
        <>
          <path d="M26 67 C24 59 26 52 31 46 C35 41 34 38 32 34 C29 28 30 22 35 16 C40 10 49 9 57 14 C53 18 49 21 48 25 C54 28 57 34 55 41 C53 48 48 53 47 58 C46 62 49 65 53 68 H26 Z" fill={fill} stroke={stroke} strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M36 16 L37 8 L44 16" fill={fill} stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M33 25 C38 21 43 19 49 19 C45 23 44 27 47 30 C42 29 37 28 33 25 Z" fill={highlight} opacity=".45" />
          <circle cx="47" cy="27" r="1.7" fill={isWhite ? '#444' : '#ddd'} />
          <path d="M20 66 H57 C61 66 64 68 65 72 H15 C16 69 18 67 20 66 Z" fill={fill} stroke={stroke} strokeWidth="1.8" />
        </>
      )}
      {type === 'p' && (
        <>
          <circle cx="40" cy="25" r="11" fill={fill} stroke={stroke} strokeWidth="1.8" />
          <path d="M31 35 C31 41 27 47 23 53 C20 57 19 62 19 65 H61 C61 62 60 57 57 53 C53 47 49 41 49 35 Z" fill={fill} stroke={stroke} strokeWidth="1.8" />
          <path d="M15 65 C15 62 18 60 22 60 H58 C62 60 65 62 65 65 L68 72 H12 Z" fill={fill} stroke={stroke} strokeWidth="1.8" />
          {isWhite && <circle cx="36" cy="21" r="3" fill="#fff" opacity=".8" />}
        </>
      )}
    </svg>
  );
};

const customPieces = {
  wK: ({ squareWidth }) => <ChessPieceSVG type="k" color="w" squareWidth={squareWidth} />,
  wQ: ({ squareWidth }) => <ChessPieceSVG type="q" color="w" squareWidth={squareWidth} />,
  wR: ({ squareWidth }) => <ChessPieceSVG type="r" color="w" squareWidth={squareWidth} />,
  wB: ({ squareWidth }) => <ChessPieceSVG type="b" color="w" squareWidth={squareWidth} />,
  wN: ({ squareWidth }) => <ChessPieceSVG type="n" color="w" squareWidth={squareWidth} />,
  wP: ({ squareWidth }) => <ChessPieceSVG type="p" color="w" squareWidth={squareWidth} />,
  bK: ({ squareWidth }) => <ChessPieceSVG type="k" color="b" squareWidth={squareWidth} />,
  bQ: ({ squareWidth }) => <ChessPieceSVG type="q" color="b" squareWidth={squareWidth} />,
  bR: ({ squareWidth }) => <ChessPieceSVG type="r" color="b" squareWidth={squareWidth} />,
  bB: ({ squareWidth }) => <ChessPieceSVG type="b" color="b" squareWidth={squareWidth} />,
  bN: ({ squareWidth }) => <ChessPieceSVG type="n" color="b" squareWidth={squareWidth} />,
  bP: ({ squareWidth }) => <ChessPieceSVG type="p" color="b" squareWidth={squareWidth} />
};

/* =========================================================
   Toast Component
   ========================================================= */
const Toast = ({ message, type = 'info', onClose }) => {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onClose, 3500);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-neutral-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 z-[200] border border-neutral-700">
      <AlertTriangle size={18} className={type === 'error' ? 'text-red-500' : 'text-yellow-400'} />
      <span className="font-semibold">{message}</span>
    </div>
  );
};

/* =========================================================
   Tutorial Component
   ========================================================= */
const TutorialModal = ({ onClose }) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
    <div className="bg-neutral-800 text-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl border border-neutral-600">
      <div className="flex justify-between items-center p-6 border-b border-neutral-700 bg-neutral-900/50 rounded-t-3xl">
        <h2 className="text-2xl sm:text-3xl font-black flex items-center gap-3 text-yellow-400">
          <BookOpen size={30} /> 우노 체스 규칙
        </h2>
        <button onClick={onClose} className="p-2 bg-neutral-700 hover:bg-red-500 rounded-full transition-colors">
          <X size={22} />
        </button>
      </div>

      <div className="p-6 overflow-y-auto flex flex-col gap-5 text-neutral-200">
        <section>
          <h3 className="text-xl font-bold text-white mb-2">🎯 기본 규칙</h3>
          <p className="bg-neutral-900 p-4 rounded-xl border border-neutral-700 leading-relaxed">
            내 턴이 시작되면 반드시 UNO 덱에서 카드를 한 장 뽑아야 합니다.<br />
            카드를 뽑기 전에는 기물을 움직일 수 없습니다.
          </p>
        </section>
        <section>
          <h3 className="text-xl font-bold text-white mb-3">🃏 카드</h3>
          <div className="grid gap-3">
            <div className="bg-neutral-900 p-4 rounded-xl border border-neutral-700">
              <b className="text-blue-400">숫자 카드</b><br />나온 숫자만큼 연속으로 기물을 움직입니다.
            </div>
            <div className="bg-neutral-900 p-4 rounded-xl border border-neutral-700">
              <b className="text-purple-400">Skip</b><br />아무 행동 없이 턴을 넘깁니다.
            </div>
            <div className="bg-neutral-900 p-4 rounded-xl border border-neutral-700">
              <b className="text-pink-400">Reverse</b><br />체스판 시점이 반전되며 내가 반대 진영으로 한 번 더 행동합니다!
            </div>
            <div className="bg-neutral-900 p-4 rounded-xl border border-neutral-700">
              <b className="text-cyan-400">Draw 2+</b><br />잡힌 기물을 포인트를 사용해 자신의 1~2랭크에 부활시킵니다.
            </div>
            <div className="bg-neutral-900 p-4 rounded-xl border border-neutral-700">
              <b className="text-yellow-400">Wild</b><br />체크메이트 상황에서 최근 3개의 이동을 되돌립니다.
            </div>
          </div>
        </section>
        <section>
          <h3 className="text-xl font-bold text-white mb-2">👑 승리 조건</h3>
          <p className="bg-red-900/30 text-red-100 p-4 rounded-xl border border-red-500/50 leading-relaxed">
            상대방의 <b className="text-red-400">킹과 퀸을 모두 잡으면</b> 승리합니다.<br />
            일반 체스의 체크메이트만으로는 게임이 끝나지 않습니다.
          </p>
        </section>
      </div>
      <div className="p-5 border-t border-neutral-700 bg-neutral-900/50 rounded-b-3xl text-center">
        <button onClick={onClose} className="px-10 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-bold text-lg transition-all">
          확인
        </button>
      </div>
    </div>
  </div>
);

/* =========================================================
   APP
   ========================================================= */

export default function App() {
  const [mode, setMode] = useState('menu');
  const [game, setGame] = useState(() => createSafeGame());
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
  const [isHost, setIsHost] = useState(false);
  const [opponentConnected, setOpponentConnected] = useState(false);

  const [toast, setToast] = useState({ msg: '', type: 'info' });
  const [gameOverMsg, setGameOverMsg] = useState('');
  const [capturedTargets, setCapturedTargets] = useState(createEmptyCaptured());
  const [captureHistory, setCaptureHistory] = useState(() => [createEmptyCaptured()]);
  const [showTutorial, setShowTutorial] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const isConnectingRef = useRef(false);
  const isTransitioning = useRef(false);
  const peerRef = useRef(null);
  const connRef = useRef(null);
  const stateRef = useRef({});

  useEffect(() => {
    return () => {
      try { connRef.current?.close(); } catch {}
      try { peerRef.current?.destroy(); } catch {}
    };
  }, []);

  useEffect(() => {
    stateRef.current = {
      fen, activeCard, movesRemaining, revivePoints, unoTurnColor,
      deck, gameOverMsg, boardOrientation, capturedTargets, myColor
    };
  }, [fen, activeCard, movesRemaining, revivePoints, unoTurnColor, deck, gameOverMsg, boardOrientation, capturedTargets, myColor]);

  const showToast = useCallback((msg, type = 'info') => {
    setToast({ msg, type });
  }, []);

  const canControlCurrentTurn = useCallback(() => {
    if (mode === 'local_pvp') return true;
    return unoTurnColor === myColor;
  }, [mode, unoTurnColor, myColor]);

  const setupConnection = useCallback(connection => {
    connection.on('open', () => {
      setOpponentConnected(true);
      showToast('상대방이 입장했습니다!');
    });

    connection.on('data', data => {
      if (!data || typeof data !== 'object') return;

      if (data.type === 'START_GAME') {
        const newGame = createSafeGame(data.fen || new Chess().fen());
        setGame(newGame);
        setFen(newGame.fen());
        setFenHistory([newGame.fen()]);
        setDeck(data.deck || generateDeck());
        setActiveCard(null);
        setMovesRemaining(0);
        setRevivePoints(0);
        setSelectedRevivePiece(null);
        setUnoTurnColor(data.unoTurnColor || 'w');
        setBoardOrientation('white');
        
        const initialCaptured = cloneCaptured(data.capturedTargets);
        setCapturedTargets(initialCaptured);
        setCaptureHistory([initialCaptured]);
        setGameOverMsg('');
        setMode('p2p');
        showToast('게임이 시작되었습니다!');
        return;
      }

      if (data.type === 'REVERSE') {
        setBoardOrientation(data.boardOrientation || 'white');
        setMyColor(prev => prev === 'w' ? 'b' : 'w');
        setActiveCard(data.activeCard || null);
        setMovesRemaining(0);
        return;
      }

      if (data.type === 'SYNC') {
        try {
          if (data.fen) {
            const newGame = createSafeGame(data.fen);
            setGame(newGame);
            setFen(data.fen);
          }
          if (data.activeCard !== undefined) setActiveCard(data.activeCard);
          if (data.movesRemaining !== undefined) setMovesRemaining(data.movesRemaining);
          if (data.revivePoints !== undefined) setRevivePoints(data.revivePoints);
          if (data.unoTurnColor !== undefined) setUnoTurnColor(data.unoTurnColor);
          if (data.deck !== undefined) setDeck(data.deck);
          if (data.gameOverMsg !== undefined) setGameOverMsg(data.gameOverMsg);
          if (data.capturedTargets !== undefined) setCapturedTargets(cloneCaptured(data.capturedTargets));
          if (data.boardOrientation !== undefined) setBoardOrientation(data.boardOrientation);
          if (data.toast) showToast(data.toast);
        } catch (e) {
          console.error('[P2P SYNC]', e);
        }
      }
    });

    connection.on('close', () => {
      setOpponentConnected(false);
      showToast('상대방과의 연결이 끊어졌습니다.', 'error');
    });
  }, [showToast]);

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
        debug: 2,
        config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }] }
      });
    } catch (e) {
      setIsConnecting(false);
      isConnectingRef.current = false;
      showToast('P2P 객체 생성에 실패했습니다.', 'error');
      return;
    }

    peerRef.current = newPeer;
    setPeer(newPeer);

    const timeoutId = setTimeout(() => {
      if (isConnectingRef.current) {
        isConnectingRef.current = false;
        setIsConnecting(false);
        try { newPeer.destroy(); } catch {}
        peerRef.current = null;
        setPeer(null);
        showToast('P2P 서버 연결 시간이 초과되었습니다.', 'error');
      }
    }, 12000);

    newPeer.on('open', id => {
      clearTimeout(timeoutId);
      isConnectingRef.current = false;
      setPeerId(id);
      setIsConnecting(false);
      setIsHost(true);
      setMyColor('b');
      setBoardOrientation('black');
      setMode('p2p_lobby');
    });

    newPeer.on('connection', connection => {
      if (connRef.current?.open) { connection.close(); return; }
      connRef.current = connection;
      setConn(connection);
      setupConnection(connection);
    });

    newPeer.on('error', err => {
      clearTimeout(timeoutId);
      isConnectingRef.current = false;
      setIsConnecting(false);
      showToast(`P2P 오류: ${err?.type || err?.message || 'unknown'}`, 'error');
    });
  };

  const connectToPeer = () => {
    const activePeer = peerRef.current || peer;
    const targetId = remotePeerId.trim();

    if (!activePeer || activePeer.destroyed) {
      showToast('먼저 온라인 대전을 눌러주세요.', 'error');
      return;
    }
    if (!targetId) { showToast('방 코드를 입력해주세요.', 'error'); return; }
    if (targetId === peerId) { showToast('내 방에는 입장할 수 없습니다.', 'error'); return; }

    const connection = activePeer.connect(targetId, { reliable: true, serialization: 'json' });
    connRef.current = connection;
    setConn(connection);
    setIsHost(false);
    setMyColor('w');
    setBoardOrientation('white');
    setupConnection(connection);
    showToast('방에 접속하는 중...');
  };

  const sendMessage = useCallback(message => {
    const connection = connRef.current || conn;
    if (!connection || !connection.open) return false;
    try { connection.send(message); return true; } catch { return false; }
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
    } catch {}
  }, [conn]);

  const handleStartGame = () => {
    const freshGame = createSafeGame();
    const initialFen = freshGame.fen();
    const initialDeck = generateDeck();
    const initialCaptured = createEmptyCaptured();

    setGame(freshGame);
    setFen(initialFen);
    setFenHistory([initialFen]);
    setDeck(initialDeck);
    setActiveCard(null);
    setMovesRemaining(0);
    setRevivePoints(0);
    setSelectedRevivePiece(null);
    setUnoTurnColor('w');
    setGameOverMsg('');
    setCapturedTargets(initialCaptured);
    setCaptureHistory([initialCaptured]);
    setBoardOrientation('black');
    setMode('p2p');

    sendMessage({
      type: 'START_GAME', fen: initialFen, deck: initialDeck,
      unoTurnColor: 'w', boardOrientation: 'white', capturedTargets: initialCaptured
    });
  };

  const endTurn = useCallback((currentFen, extraSync = {}) => {
    try {
      const currentGame = createSafeGame(currentFen);
      let nextFen = currentFen;
      let nextColor = currentGame.turn();

      if (currentGame.turn() === unoTurnColor) {
        const parts = currentFen.split(' ');
        nextColor = parts[1] === 'w' ? 'b' : 'w';
        parts[1] = nextColor;
        parts[3] = '-';
        nextFen = parts.join(' ');
      }

      const nextGame = createSafeGame(nextFen);
      setGame(nextGame);
      setFen(nextFen);
      setUnoTurnColor(nextColor);
      setActiveCard(null);
      setMovesRemaining(0);
      setRevivePoints(0);
      setSelectedRevivePiece(null);

      setFenHistory(prev => (prev[prev.length - 1] === nextFen ? prev : [...prev, nextFen]));

      syncState({
        fen: nextFen, unoTurnColor: nextColor, activeCard: null,
        movesRemaining: 0, revivePoints: 0, ...extraSync
      });
    } catch (e) { console.error('[END TURN]', e); }
  }, [unoTurnColor, syncState]);

  const getDeadPieces = useCallback((currentFen = stateRef.current.fen, capturedOverride = stateRef.current.capturedTargets, colorOverride = stateRef.current.unoTurnColor) => {
    const currentGame = createSafeGame(currentFen);
    const currentCount = { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 };

    currentGame.board().forEach(row => {
      row.forEach(piece => {
        if (piece && piece.color === colorOverride && currentCount[piece.type] !== undefined) {
          currentCount[piece.type]++;
        }
      });
    });

    const dead = [];
    PIECE_ORDER.forEach(type => {
      let missing = INITIAL_COUNT[type] - currentCount[type];
      if (type === 'k' && capturedOverride?.[colorOverride]?.k) missing = 1;
      if (type === 'q' && capturedOverride?.[colorOverride]?.q) missing = Math.max(1, missing);
      for (let i = 0; i < Math.max(0, missing); i++) {
        dead.push({ type, points: PIECE_POINTS[type] });
      }
    });
    return dead;
  }, []);

  const getReviveSquares = useCallback((currentFen = stateRef.current.fen, capturedOverride = stateRef.current.capturedTargets, colorOverride = stateRef.current.unoTurnColor) => {
    const currentGame = createSafeGame(currentFen);
    const squares = [];
    const ranks = colorOverride === 'w' ? [1, 2] : [7, 8];

    ranks.forEach(rank => {
      for (let file = 0; file < 8; file++) {
        const square = String.fromCharCode(97 + file) + rank;
        const piece = currentGame.get(square);
        const kingPlaceholder = piece?.type === 'k' && piece?.color === colorOverride && capturedOverride?.[colorOverride]?.k;
        if (!piece || kingPlaceholder) squares.push(square);
      }
    });
    return squares;
  }, []);

  const finishRevive = useCallback((fenOverride = null) => {
    const current = stateRef.current;
    if (!current.activeCard || current.activeCard.type !== 'draw') return;
    const currentFen = fenOverride || current.fen;
    setSelectedRevivePiece(null);
    setRevivePoints(0);
    setActiveCard(null);
    setMovesRemaining(0);
    endTurn(currentFen, { revivePoints: 0, activeCard: null, movesRemaining: 0 });
  }, [endTurn]);

  const startRevive = useCallback((card, currentFen) => {
    const currentCaptured = stateRef.current.capturedTargets;
    const currentColor = stateRef.current.unoTurnColor;
    const deadPieces = getDeadPieces(currentFen, currentCaptured, currentColor);

    if (deadPieces.length === 0) {
      showToast('부활할 기물이 없어 1회 이동합니다.');
      setActiveCard(card);
      setRevivePoints(0);
      setMovesRemaining(1);
      syncState({ activeCard: card, revivePoints: 0, movesRemaining: 1 });
      return;
    }

    const affordable = deadPieces.filter(piece => piece.points <= card.value);
    if (affordable.length === 0) {
      showToast(`+${card.value}P로 부활할 수 있는 기물이 없습니다. 턴을 종료합니다.`);
      setTimeout(() => { finishRevive(currentFen); }, 300);
      return;
    }

    setRevivePoints(card.value);
    setSelectedRevivePiece(null);
    syncState({ activeCard: card, movesRemaining: 0, revivePoints: card.value });
    showToast(`+${card.value}P · 부활할 기물을 선택하세요.`);
  }, [getDeadPieces, finishRevive, showToast, syncState]);

  const handleRevivePieceSelect = useCallback(type => {
    const current = stateRef.current;
    if (!current.activeCard || current.activeCard.type !== 'draw' || current.revivePoints <= 0) return;
    if (!canControlCurrentTurn()) return;

    const deadPieces = getDeadPieces(current.fen, current.capturedTargets, current.unoTurnColor);
    const available = deadPieces.find(piece => piece.type === type && piece.points <= current.revivePoints);

    if (!available) { showToast(`현재 ${current.revivePoints}P로 부활할 수 없는 기물입니다.`, 'error'); return; }
    setSelectedRevivePiece(type);
    showToast(`${PIECE_NAMES[type]} 선택됨 · 내 진영 1~2랭크의 빈칸을 클릭하세요.`);
  }, [canControlCurrentTurn, getDeadPieces, showToast]);

  const handleReviveSquareClick = useCallback(square => {
    const current = stateRef.current;
    if (!current.activeCard || current.activeCard.type !== 'draw' || !selectedRevivePiece) return;
    if (!canControlCurrentTurn()) return;
    if (current.revivePoints <= 0) return;

    const currentGame = createSafeGame(current.fen);
    const rank = Number(square[1]);
    const validRank = current.unoTurnColor === 'w' ? rank === 1 || rank === 2 : rank === 7 || rank === 8;

    if (!validRank) { showToast('내 진영의 1~2랭크에서만 부활할 수 있습니다.', 'error'); return; }

    const squarePiece = currentGame.get(square);
    const kingPlaceholder = squarePiece?.type === 'k' && squarePiece?.color === current.unoTurnColor && current.capturedTargets?.[current.unoTurnColor]?.k;

    if (squarePiece && !kingPlaceholder) { showToast('빈 칸에만 부활할 수 있습니다.', 'error'); return; }

    const cost = PIECE_POINTS[selectedRevivePiece];
    if (cost > current.revivePoints) { showToast(`포인트가 부족합니다. ${cost}P가 필요합니다.`, 'error'); return; }

    const deadPieces = getDeadPieces(current.fen, current.capturedTargets, current.unoTurnColor);
    const deadIndex = deadPieces.findIndex(piece => piece.type === selectedRevivePiece && piece.points <= current.revivePoints);

    if (deadIndex === -1) { showToast('해당 기물이 무덤에 없습니다.', 'error'); setSelectedRevivePiece(null); return; }

    try {
      if (selectedRevivePiece === 'k') {
        for (let rankNo = 1; rankNo <= 8; rankNo++) {
          for (let fileNo = 0; fileNo < 8; fileNo++) {
            const sq = String.fromCharCode(97 + fileNo) + rankNo;
            const piece = currentGame.get(sq);
            if (piece?.type === 'k' && piece.color === current.unoTurnColor) { currentGame.remove(sq); }
          }
        }
      }

      if (kingPlaceholder) currentGame.remove(square);
      currentGame.put({ type: selectedRevivePiece, color: current.unoTurnColor }, square);

      const newFen = currentGame.fen();
      const nextPoints = current.revivePoints - cost;
      const nextCaptured = cloneCaptured(current.capturedTargets);
      nextCaptured[current.unoTurnColor][selectedRevivePiece] = false;

      setCapturedTargets(nextCaptured);
      setCaptureHistory(prev => [...prev, cloneCaptured(nextCaptured)]);
      setGame(currentGame);
      setFen(newFen);
      setFenHistory(prev => [...prev, newFen]);
      setRevivePoints(nextPoints);
      setSelectedRevivePiece(null);

      syncState({ fen: newFen, activeCard: current.activeCard, movesRemaining: 0, revivePoints: nextPoints, capturedTargets: nextCaptured });

      const nextDead = getDeadPieces(newFen, nextCaptured, current.unoTurnColor);

      if (nextPoints <= 0) {
        showToast('부활 포인트를 모두 사용했습니다. 턴이 종료됩니다.');
        setTimeout(() => { finishRevive(newFen); }, 300);
        return;
      }

      const affordableNext = nextDead.filter(piece => piece.points <= nextPoints);
      if (affordableNext.length === 0) {
        showToast(`남은 ${nextPoints}P로 부활할 수 있는 기물이 없습니다. 턴이 종료됩니다.`);
        setTimeout(() => { finishRevive(newFen); }, 350);
        return;
      }

      showToast(`${cost}P 사용 · ${nextPoints}P 남음`);
    } catch (e) {
      console.error('[REVIVE]', e);
      showToast('이 칸에는 기물을 부활시킬 수 없습니다.', 'error');
    }
  }, [selectedRevivePiece, canControlCurrentTurn, getDeadPieces, finishRevive, showToast, syncState]);

  const handleAIRevive = useCallback((maxPoints, currentFen) => {
    try {
      const current = stateRef.current;
      const color = current.unoTurnColor;
      const currentGame = createSafeGame(currentFen);
      let remaining = maxPoints;
      const captured = cloneCaptured(current.capturedTargets);
      let deadPieces = getDeadPieces(currentFen, captured, color);

      const ranks = color === 'w' ? [1, 2] : [7, 8];
      const emptySquares = [];

      ranks.forEach(rank => {
        for (let file = 0; file < 8; file++) {
          const square = String.fromCharCode(97 + file) + rank;
          const piece = currentGame.get(square);
          const kingPlaceholder = piece?.type === 'k' && piece.color === color && captured?.[color]?.k;
          if (!piece || kingPlaceholder) emptySquares.push(square);
        }
      });

      const reviveTypes = ['q', 'r', 'b', 'n', 'p', 'k'];
      for (const type of reviveTypes) {
        while (remaining >= PIECE_POINTS[type] && deadPieces.some(piece => piece.type === type) && emptySquares.length > 0) {
          const index = Math.floor(Math.random() * emptySquares.length);
          const square = emptySquares.splice(index, 1)[0];
          const target = currentGame.get(square);

          if (target?.type === 'k' && target.color === color) { currentGame.remove(square); }
          currentGame.put({ type, color }, square);
          remaining -= PIECE_POINTS[type];
          deadPieces = deadPieces.filter(piece => piece.type !== type);
          captured[color][type] = false;
        }
      }

      const newFen = currentGame.fen();
      setGame(currentGame);
      setFen(newFen);
      setFenHistory(prev => [...prev, newFen]);
      setCapturedTargets(captured);
      setCaptureHistory(prev => [...prev, cloneCaptured(captured)]);
      setRevivePoints(0);
      setSelectedRevivePiece(null);
      setActiveCard(null);
      setMovesRemaining(0);

      syncState({ fen: newFen, activeCard: null, movesRemaining: 0, revivePoints: 0, capturedTargets: captured });
      return newFen;
    } catch (e) {
      console.error('[AI REVIVE]', e);
      setActiveCard(null);
      setMovesRemaining(0);
      setRevivePoints(0);
      return currentFen;
    }
  }, [getDeadPieces, syncState]);

  const handleWildCard = useCallback((currentFen, isAI = false) => {
    const currentGame = createSafeGame(currentFen);
    if (!currentGame.isCheckmate()) {
      showToast('와일드는 체크메이트 상태에서만 3턴 롤백이 가능합니다.');
      setMovesRemaining(2);
      syncState({ movesRemaining: 2 });
      return currentFen;
    }

    showToast('Wild! 최근 3턴을 롤백합니다.');
    const historyCopy = [...fenHistory];
    const captureCopy = captureHistory.map(item => cloneCaptured(item));
    let newFen = currentFen;

    for (let i = 0; i < 3; i++) {
      if (historyCopy.length > 1) {
        historyCopy.pop();
        newFen = historyCopy[historyCopy.length - 1];
      }
      if (captureCopy.length > 1) {
        captureCopy.pop();
      }
    }

    const restored = captureCopy[captureCopy.length - 1] || createEmptyCaptured();
    const restoredGame = createSafeGame(newFen);

    setGame(restoredGame);
    setFen(newFen);
    setFenHistory(historyCopy);
    setCaptureHistory(captureCopy);
    setCapturedTargets(cloneCaptured(restored));

    syncState({ fen: newFen, capturedTargets: restored, toast: 'Wild로 3턴 전으로 롤백되었습니다.' });

    if (!isAI) { setTimeout(() => { endTurn(newFen); }, 1200); }
    return newFen;
  }, [fenHistory, captureHistory, endTurn, showToast, syncState]);

  const handleDrawCard = useCallback(() => {
    const current = stateRef.current;
    if (current.gameOverMsg || current.activeCard) return;

    if (!canControlCurrentTurn()) { showToast('상대방의 턴입니다.', 'error'); return; }

    const currentGame = createSafeGame(current.fen);
    if (currentGame.turn() !== current.unoTurnColor) { showToast('현재 턴의 플레이어만 카드를 뽑을 수 있습니다.', 'error'); return; }

    let currentDeck = [...current.deck];
    if (currentDeck.length === 0) currentDeck = generateDeck();
    const card = currentDeck.pop();

    setDeck(currentDeck);
    setActiveCard(card);
    setRevivePoints(0);
    setSelectedRevivePiece(null);

    if (card.type === 'number') {
      setMovesRemaining(card.value);
      syncState({ activeCard: card, deck: currentDeck, movesRemaining: card.value, revivePoints: 0 });
      return;
    }

    if (card.type === 'skip') {
      setMovesRemaining(0);
      syncState({ activeCard: card, deck: currentDeck, movesRemaining: 0 });
      showToast('Skip! 턴이 넘어갑니다.');
      setTimeout(() => { endTurn(stateRef.current.fen); }, 900);
      return;
    }

    if (card.type === 'reverse') {
      const newOrientation = current.boardOrientation === 'white' ? 'black' : 'white';
      setBoardOrientation(newOrientation);
      
      // 🔥 [수정 1] Reverse 시 내 컨트롤 색상도 무조건 스왑
      const nextMyColor = myColor === 'w' ? 'b' : 'w';
      setMyColor(nextMyColor);
      setMovesRemaining(0);

      if (mode === 'p2p') {
        sendMessage({ type: 'REVERSE', boardOrientation: newOrientation, activeCard: card });
      }

      syncState({ activeCard: card, deck: currentDeck, movesRemaining: 0, boardOrientation: newOrientation });
      showToast('Reverse! 진영이 바뀌며 턴을 한 번 더 진행합니다.');

      setTimeout(() => {
        setActiveCard(null);
        setMovesRemaining(0);
        // endTurn이 unoTurnColor를 뒤집으므로 결과적으로 내가 한 번 더 하게 됨 (Skip 효과)
        endTurn(current.fen, { boardOrientation: newOrientation });
      }, 900);
      return;
    }

    if (card.type === 'draw') {
      syncState({ activeCard: card, deck: currentDeck, movesRemaining: 0, revivePoints: card.value });
      startRevive(card, current.fen);
      return;
    }

    if (card.type === 'wild') {
      syncState({ activeCard: card, deck: currentDeck, movesRemaining: 0 });
      handleWildCard(current.fen, false);
    }
  }, [canControlCurrentTurn, mode, myColor, endTurn, startRevive, handleWildCard, showToast, syncState, sendMessage]);

  const onSquareClick = useCallback(square => {
    if (stateRef.current.activeCard?.type === 'draw' && stateRef.current.revivePoints > 0 && selectedRevivePiece) {
      handleReviveSquareClick(square);
    }
  }, [selectedRevivePiece, handleReviveSquareClick]);

  const reviveSquareStyles = {};
  if (activeCard?.type === 'draw' && revivePoints > 0 && selectedRevivePiece) {
    getReviveSquares(fen, capturedTargets, unoTurnColor).forEach(square => {
      reviveSquareStyles[square] = { boxShadow: 'inset 0 0 0 5px rgba(250,204,21,.95)', backgroundColor: 'rgba(250,204,21,.22)' };
    });
  }

  const onDrop = useCallback((sourceSquare, targetSquare) => {
    const current = stateRef.current;
    if (current.gameOverMsg) return false;
    if (!canControlCurrentTurn()) { showToast('상대방의 턴입니다.', 'error'); return false; }
    if (!current.activeCard || current.movesRemaining <= 0) return false;

    const currentGame = createSafeGame(current.fen);
    const piece = currentGame.get(sourceSquare);

    if (!piece || piece.color !== current.unoTurnColor) { showToast('현재 턴의 기물만 움직일 수 있습니다.', 'error'); return false; }

    const targetPiece = currentGame.get(targetSquare);
    let nextGame = currentGame;
    const remaining = current.movesRemaining - 1;

    if (targetPiece && targetPiece.color !== current.unoTurnColor && (targetPiece.type === 'k' || targetPiece.type === 'q')) {
      if (current.capturedTargets[targetPiece.color]?.[targetPiece.type]) {
        showToast(`이미 잡힌 ${PIECE_NAMES[targetPiece.type]}입니다.`, 'error');
        return false;
      }

      let canCapture = false;
      try {
        if (targetPiece.type === 'k') {
          const test = createSafeGame(current.fen);
          test.remove(targetSquare);
          const move = test.move({ from: sourceSquare, to: targetSquare, promotion: 'q' });
          canCapture = !!move;
        } else {
          const moves = currentGame.moves({ square: sourceSquare, verbose: true });
          canCapture = moves.some(move => move.to === targetSquare);
        }
      } catch { canCapture = false; }

      if (!canCapture) return false;

      const nextCaptured = cloneCaptured(current.capturedTargets);
      nextCaptured[targetPiece.color][targetPiece.type] = true;

      if (targetPiece.type === 'k') {
        currentGame.remove(targetSquare);
        const move = currentGame.move({ from: sourceSquare, to: targetSquare, promotion: 'q' });
        if (!move) {
          currentGame.put({ type: piece.type, color: piece.color }, targetSquare);
          currentGame.remove(sourceSquare);
        }
        nextGame = currentGame;
      } else if (targetPiece.type === 'q') {
        const move = currentGame.move({ from: sourceSquare, to: targetSquare, promotion: 'q' });
        if (!move) return false;
        nextGame = currentGame;
      }

      let nextFen = nextGame.fen();
      if (remaining > 0) {
        // 🔥 [수정 2] 연속 이동시 강제 FEN 조작 후 안전한 게임으로 로드
        const parts = nextFen.split(' ');
        parts[1] = current.unoTurnColor;
        parts[3] = '-';
        nextFen = parts.join(' ');
        nextGame = createSafeGame(nextFen);
      }

      const targetName = PIECE_NAMES[targetPiece.type];
      const opponent = targetPiece.color;
      const won = nextCaptured[opponent].k && nextCaptured[opponent].q;

      setCapturedTargets(nextCaptured);
      setCaptureHistory(prev => [...prev, cloneCaptured(nextCaptured)]);
      setGame(nextGame);
      setFen(nextFen);
      setFenHistory(prev => [...prev, nextFen]);
      setMovesRemaining(remaining);

      if (won) {
        const winnerMsg = '상대방의 킹과 퀸을 모두 잡았습니다! 승리!';
        setGameOverMsg(winnerMsg);
        setMovesRemaining(0);
        setActiveCard(null);
        syncState({ gameOverMsg: winnerMsg, capturedTargets: nextCaptured, movesRemaining: 0, activeCard: null, fen: nextFen });
        return true;
      }

      showToast(`${targetName}을 잡았습니다!`);
      if (remaining > 0) {
        syncState({ fen: nextFen, movesRemaining: remaining, capturedTargets: nextCaptured });
      } else {
        endTurn(nextFen, { capturedTargets: nextCaptured });
      }
      return true;
    }

    try {
      let move = currentGame.move({ from: sourceSquare, to: targetSquare, promotion: 'q' });

      if (move === null && currentGame.isCheck()) {
        const relaxed = createSafeGame(current.fen);
        let ownKingSquare = null;
        for (let rank = 1; rank <= 8; rank++) {
          for (let file = 0; file < 8; file++) {
            const sq = String.fromCharCode(97 + file) + rank;
            const p = relaxed.get(sq);
            if (p && p.color === current.unoTurnColor && p.type === 'k') { ownKingSquare = sq; break; }
          }
          if (ownKingSquare) break;
        }

        if (ownKingSquare) {
          const king = relaxed.get(ownKingSquare);
          relaxed.remove(ownKingSquare);
          try {
            const candidate = relaxed.move({ from: sourceSquare, to: targetSquare, promotion: 'q' });
            if (candidate) {
              relaxed.remove(ownKingSquare);
              relaxed.put(king, ownKingSquare);
              currentGame.load(relaxed.fen());
              move = candidate;
            }
          } catch {}
        }
      }

      if (!move) return false;

      let nextFen = currentGame.fen();
      nextGame = currentGame;

      if (remaining > 0) {
        const parts = nextFen.split(' ');
        parts[1] = current.unoTurnColor;
        parts[3] = '-';
        nextFen = parts.join(' ');
        nextGame = createSafeGame(nextFen);
      }

      setMovesRemaining(remaining);
      setGame(nextGame);
      setFen(nextFen);
      setFenHistory(prev => [...prev, nextFen]);
      setCaptureHistory(prev => [...prev, cloneCaptured(current.capturedTargets)]);

      if (remaining > 0) {
        syncState({ fen: nextFen, movesRemaining: remaining });
      } else {
        endTurn(nextFen);
      }
      return true;
    } catch (e) {
      console.error('[MOVE]', e);
      return false;
    }
  }, [canControlCurrentTurn, showToast, endTurn, syncState]);

  /* =======================================================
     🔥 AI Effect: 비동기 Stale State 및 다중 이동 수정
     ======================================================= */
  useEffect(() => {
    const currentInit = stateRef.current;
    
    if (
      mode !== 'ai' ||
      currentInit.gameOverMsg ||
      currentInit.unoTurnColor !== (myColor === 'w' ? 'b' : 'w') ||
      isTransitioning.current
    ) {
      return;
    }

    isTransitioning.current = true;

    const executeAI = async () => {
      const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
      await wait(850);
      
      let latest = stateRef.current; 
      const aiColor = latest.unoTurnColor;

      try {
        if (!latest.activeCard) {
          let aiDeck = [...latest.deck];
          if (aiDeck.length === 0) aiDeck = generateDeck();
          const card = aiDeck.pop();

          setDeck(aiDeck);
          setActiveCard(card);
          syncState({ activeCard: card, deck: aiDeck });

          if (card.type === 'number') {
            setMovesRemaining(card.value);
            showToast(`AI 카드: ${card.name}`);
            return;
          }
          if (card.type === 'skip') {
            showToast('AI 카드: Skip');
            await wait(700);
            latest = stateRef.current; 
            endTurn(latest.fen);
            return;
          }
          if (card.type === 'reverse') {
            showToast('AI 카드: Reverse');
            const newOrientation = latest.boardOrientation === 'white' ? 'black' : 'white';
            setBoardOrientation(newOrientation);
            setMyColor(prev => prev === 'w' ? 'b' : 'w'); // 🔥 AI도 Reverse시 색상 스왑!
            await wait(700);
            latest = stateRef.current;
            setActiveCard(null);
            setMovesRemaining(0);
            endTurn(latest.fen, { boardOrientation: newOrientation });
            return;
          }
          if (card.type === 'draw') {
            showToast(`AI 카드: Draw ${card.value}+`);
            const newFen = handleAIRevive(card.value, latest.fen);
            await wait(450);
            endTurn(newFen);
            return;
          }
          if (card.type === 'wild') {
            showToast('AI 카드: Wild');
            const newFen = handleWildCard(latest.fen, true);
            await wait(1200);
            endTurn(newFen);
            return;
          }
          return;
        }

        if (latest.activeCard?.type === 'number' && latest.movesRemaining > 0) {
          const currentGame = createSafeGame(latest.fen);
          let legalMoves = currentGame.moves({ verbose: true });
          
          const opponentColor = aiColor === 'w' ? 'b' : 'w';
          let opponentKingSquare = null;
          for (let r = 1; r <= 8; r++) {
            for (let c = 0; c < 8; c++) {
              const sq = String.fromCharCode(97 + c) + r;
              const p = currentGame.get(sq);
              if (p && p.type === 'k' && p.color === opponentColor) { opponentKingSquare = sq; break; }
            }
            if (opponentKingSquare) break;
          }

          if (opponentKingSquare) {
             const relaxed = createSafeGame(latest.fen);
             relaxed.remove(opponentKingSquare);
             relaxed.put({type: 'q', color: opponentColor}, opponentKingSquare);
             const relaxedMoves = relaxed.moves({ verbose: true });
             const attacks = relaxedMoves.filter(m => m.to === opponentKingSquare && relaxed.get(m.from)?.color === aiColor);
             attacks.forEach(att => { legalMoves.push({ ...att, captured: 'k' }); });
          }

          const aiMoves = legalMoves.filter(m => currentGame.get(m.from)?.color === aiColor);

          if (aiMoves.length === 0) {
            showToast('AI가 움직일 수 있는 기물이 없어 턴을 넘깁니다.');
            endTurn(latest.fen);
            return;
          }

          const priorityMoves = aiMoves.filter(m => {
            const target = currentGame.get(m.to);
            return target && target.color !== aiColor && (target.type === 'k' || target.type === 'q');
          });

          const candidates = priorityMoves.length > 0 ? priorityMoves : aiMoves;
          const move = candidates[Math.floor(Math.random() * candidates.length)];
          const target = currentGame.get(move.to);
          const nextCaptured = cloneCaptured(latest.capturedTargets);
          let won = false;

          if (target && target.color !== aiColor && (target.type === 'k' || target.type === 'q')) {
            nextCaptured[target.color][target.type] = true;
            if (nextCaptured[target.color].k && nextCaptured[target.color].q) { won = true; }
          }

          if (target && target.type === 'k') {
            currentGame.remove(move.to);
            const res = currentGame.move(move);
            if (!res) {
               const mover = currentGame.get(move.from);
               currentGame.put(mover, move.to);
               currentGame.remove(move.from);
            }
          } else {
            currentGame.move(move);
          }

          let nextFen = currentGame.fen();
          let nextGame = currentGame;
          const remaining = latest.movesRemaining - 1;

          if (won) {
            const msg = 'AI가 당신의 킹과 퀸을 모두 잡았습니다! 패배!';
            setGameOverMsg(msg);
            setMovesRemaining(0);
            setActiveCard(null);
            setCapturedTargets(nextCaptured);
            setGame(nextGame);
            setFen(nextFen);
            syncState({ gameOverMsg: msg, capturedTargets: nextCaptured, movesRemaining: 0, activeCard: null, fen: nextFen });
            return;
          }

          if (remaining > 0) {
            // 🔥 [수정 2] try-catch 블록 제거: createSafeGame이 에러 없이 무조건 처리함
            const parts = nextFen.split(' ');
            parts[1] = latest.unoTurnColor;
            parts[3] = '-';
            nextFen = parts.join(' ');
            nextGame = createSafeGame(nextFen);
          }

          setGame(nextGame);
          setFen(nextFen);
          setFenHistory(prev => [...prev, nextFen]);
          setCapturedTargets(nextCaptured);
          setCaptureHistory(prev => [...prev, cloneCaptured(nextCaptured)]);
          setMovesRemaining(remaining);

          if (remaining > 0) {
            syncState({ fen: nextFen, movesRemaining: remaining, capturedTargets: nextCaptured });
          } else {
            endTurn(nextFen, { capturedTargets: nextCaptured });
          }
          return;
        }

        if (latest.activeCard && latest.movesRemaining <= 0) {
          endTurn(latest.fen);
        }

      } catch (e) {
        console.error('[AI 로직 에러]', e);
        endTurn(latest.fen);
      } finally {
        isTransitioning.current = false;
      }
    };

    executeAI();
  }, [mode, fen, activeCard, movesRemaining, unoTurnColor, myColor, gameOverMsg, endTurn, handleAIRevive, handleWildCard, syncState, showToast]);

  /* =======================================================
     리셋
     ======================================================= */
  const resetGame = () => {
    const newGame = createSafeGame();
    const initialFen = newGame.fen();
    const emptyCaptured = createEmptyCaptured();

    setGame(newGame);
    setFen(initialFen);
    setFenHistory([initialFen]);
    setDeck(generateDeck());
    setActiveCard(null);
    setMovesRemaining(0);
    setRevivePoints(0);
    setSelectedRevivePiece(null);
    setUnoTurnColor('w');
    setGameOverMsg('');
    setCapturedTargets(emptyCaptured);
    setCaptureHistory([emptyCaptured]);
    
    isTransitioning.current = false;

    if (mode === 'p2p') {
      setBoardOrientation(myColor === 'b' ? 'black' : 'white');
    } else {
      setMyColor('w');
      setBoardOrientation('white');
    }

    if (connRef.current?.open) {
      syncState({
        fen: initialFen, unoTurnColor: 'w', activeCard: null, movesRemaining: 0,
        revivePoints: 0, gameOverMsg: '', capturedTargets: emptyCaptured,
        boardOrientation: mode === 'p2p' ? (myColor === 'b' ? 'black' : 'white') : 'white'
      });
    }
  };

  const getStatusMessage = () => {
    if (gameOverMsg) return gameOverMsg;
    const currentGame = createSafeGame(fen);
    if (currentGame.isCheckmate()) return '체크메이트 상태 — 킹과 퀸을 모두 잡아야 승리합니다.';
    
    const turnName = unoTurnColor === 'w' ? '백색 White' : '흑색 Black';
    if (currentGame.isCheck()) return `체크! ${turnName} 턴`;
    return `${turnName} 턴`;
  };

  const leaveOnline = () => {
    setMode('menu');
    setPeerId('');
    setRemotePeerId('');
    setOpponentConnected(false);
    try { connRef.current?.close(); } catch {}
    connRef.current = null;
    setConn(null);
    try { peerRef.current?.destroy(); } catch {}
    peerRef.current = null;
    setPeer(null);
    setIsHost(false);
  };

  /* =======================================================
     MENU
     ======================================================= */
  if (mode === 'menu') {
    return (
      <div className="min-h-screen bg-neutral-900 text-white flex flex-col items-center justify-center p-4">
        <h1 className="text-5xl sm:text-6xl font-black mb-12 text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-yellow-400 to-blue-500 flex items-center gap-4 text-center">
          <Swords size={60} className="text-white hidden sm:block" />
          UNO CHESS
        </h1>

        <div className="flex flex-col gap-4 w-full max-w-md">
          <button onClick={() => { setMode('ai'); resetGame(); }} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 rounded-2xl text-xl font-bold transition-all hover:scale-[1.02] flex items-center justify-center gap-3 shadow-lg">
            <Bot size={28} /> AI와 대전하기
          </button>
          <button onClick={() => { setMode('local_pvp'); setMyColor('w'); setBoardOrientation('white'); resetGame(); }} className="w-full py-4 bg-teal-600 hover:bg-teal-500 rounded-2xl text-xl font-bold transition-all hover:scale-[1.02] flex items-center justify-center gap-3 shadow-lg">
            <Smartphone size={28} /> 같은 기기 1:1 대전
          </button>
          <button onClick={initPeer} disabled={isConnecting} className={`w-full py-4 rounded-2xl text-xl font-bold transition-all flex items-center justify-center gap-3 shadow-lg ${isConnecting ? 'bg-neutral-700 text-neutral-400 cursor-wait' : 'bg-green-600 hover:bg-green-500 hover:scale-[1.02]'}`}>
            {isConnecting ? <Loader2 size={28} className="animate-spin text-green-400" /> : <Wifi size={28} />}
            {isConnecting ? '서버 연결 중...' : '실시간 온라인 대전'}
          </button>
          <button onClick={() => setShowTutorial(true)} className="w-full py-4 bg-neutral-700 hover:bg-neutral-600 rounded-2xl text-xl font-bold transition-all hover:scale-[1.02] flex items-center justify-center gap-3 shadow-lg border border-neutral-600 mt-2">
            <BookOpen size={28} className="text-yellow-400" /> 게임 룰 & 튜토리얼
          </button>
        </div>

        {showTutorial && <TutorialModal onClose={() => setShowTutorial(false)} />}
        <Toast message={toast.msg} type={toast.type} onClose={() => setToast({ msg: '', type: 'info' })} />
      </div>
    );
  }

  /* =======================================================
     P2P LOBBY
     ======================================================= */
  if (mode === 'p2p_lobby') {
    return (
      <div className="min-h-screen bg-neutral-900 text-white flex flex-col items-center justify-center p-4">
        <div className="bg-neutral-800 p-8 rounded-3xl shadow-2xl border border-neutral-700 max-w-md w-full">
          <h2 className="text-3xl font-bold mb-6 flex items-center gap-2 text-yellow-400">
            <Users /> 온라인 대기실
          </h2>

          <div className="mb-6">
            <label className="block text-neutral-400 text-sm font-bold mb-2">내 방 코드</label>
            <div className="flex bg-black rounded-lg p-1 border border-neutral-700">
              <input readOnly value={peerId} className="bg-transparent w-full p-2 outline-none text-green-400 font-mono text-xl text-center" />
              <button onClick={() => { navigator.clipboard.writeText(peerId); showToast('방 코드가 복사되었습니다!'); }} className="p-2 bg-neutral-700 hover:bg-neutral-600 rounded text-white">
                <Copy size={20} />
              </button>
            </div>
          </div>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-neutral-600" />
            <span className="mx-4 text-neutral-400 text-sm">참가하기</span>
            <div className="flex-grow border-t border-neutral-600" />
          </div>

          <div className="mt-2 mb-6">
            <label className="block text-neutral-400 text-sm font-bold mb-2">친구 방 코드</label>
            <div className="flex gap-2">
              <input type="text" placeholder="코드 입력..." value={remotePeerId} onChange={e => setRemotePeerId(e.target.value)} className="w-full bg-black border border-neutral-700 rounded-lg p-3 outline-none focus:border-indigo-500 font-mono text-white text-center uppercase" />
              <button onClick={connectToPeer} disabled={!remotePeerId || opponentConnected} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-neutral-700 rounded-lg font-bold whitespace-nowrap">
                입장
              </button>
            </div>
          </div>

          <div className="bg-neutral-900 p-4 rounded-2xl border border-neutral-700 flex flex-col items-center justify-center gap-3 mb-6">
            {opponentConnected ? (
              <div className="flex items-center gap-2 text-green-400 font-bold text-lg"><CheckCircle size={24} /> 상대방 접속 완료!</div>
            ) : (
              <div className="flex items-center gap-2 text-neutral-400"><Hourglass size={20} className="animate-spin" /> 상대방을 기다리는 중...</div>
            )}
            {isHost && (
              <button onClick={handleStartGame} disabled={!opponentConnected} className="w-full py-4 mt-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:from-neutral-700 disabled:to-neutral-700 disabled:text-neutral-500 rounded-xl font-black text-xl shadow-lg transition-all">
                🎮 게임 시작
              </button>
            )}
            {!isHost && opponentConnected && (
              <p className="text-yellow-400 font-bold text-sm text-center">방장이 게임을 시작하기를 기다리고 있습니다.</p>
            )}
          </div>
          <button onClick={leaveOnline} className="text-neutral-400 hover:text-white underline w-full text-center text-sm">메뉴로 돌아가기</button>
        </div>
        <Toast message={toast.msg} type={toast.type} onClose={() => setToast({ msg: '', type: 'info' })} />
      </div>
    );
  }

  /* =======================================================
     GAME
     ======================================================= */
  const deadPieces = getDeadPieces(fen, capturedTargets, unoTurnColor);

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100 font-sans flex flex-col">
      <header className="bg-neutral-800 p-4 shadow-md flex justify-between items-center border-b border-neutral-700">
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2 text-white cursor-pointer" onClick={() => { mode === 'p2p' ? leaveOnline() : setMode('menu'); }}>
          <Swords className="text-red-500" /> Uno Chess
          {mode === 'p2p' && <span className="text-xs bg-green-600 px-2 py-1 rounded">P2P</span>}
          {mode === 'local_pvp' && <span className="text-xs bg-teal-600 px-2 py-1 rounded">LOCAL 2P</span>}
          {mode === 'ai' && <span className="text-xs bg-indigo-600 px-2 py-1 rounded">AI</span>}
        </h1>
        <div className="flex gap-2 items-center">
          <button onClick={() => setShowTutorial(true)} className="p-2 bg-neutral-700 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center gap-2 px-3">
            <HelpCircle size={20} /> <span className="hidden sm:inline font-bold">규칙</span>
          </button>
          <button onClick={resetGame} className="p-2 bg-neutral-700 hover:bg-red-600 text-white rounded-lg transition-colors" title="재시작">
            <RotateCcw size={20} />
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col xl:flex-row max-w-7xl w-full mx-auto p-4 gap-6 items-center xl:items-start justify-center mt-4">
        <div className="w-full max-w-[850px] flex-shrink-0 flex flex-col gap-4">
          <div className="flex flex-col xl:flex-row gap-4 items-stretch">
            
            {/* GRAVEYARD */}
            <div className="w-full xl:w-[180px] bg-neutral-800 rounded-xl border border-neutral-700 shadow-xl p-3 flex-shrink-0">
              <div className="w-full mb-5 rounded-xl border border-neutral-700 bg-neutral-900/70 p-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-black text-sm text-neutral-300">🪦 내 무덤</h3>
                  {activeCard?.type === 'draw' ? (
                    <span className="text-cyan-300 font-black text-sm">+{revivePoints}P</span>
                  ) : (
                    <span className="text-neutral-500 text-xs">대기</span>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 min-h-[42px]">
                  {deadPieces.length === 0 ? (
                    <span className="text-xs text-neutral-500">잡힌 기물이 없습니다.</span>
                  ) : (
                    deadPieces.map((piece, index) => {
                      const label = { p: '♟', n: '♞', b: '♝', r: '♜', q: '♛', k: '♚' }[piece.type];
                      const selectable = canControlCurrentTurn() && activeCard?.type === 'draw' && revivePoints >= piece.points;
                      const selected = selectedRevivePiece === piece.type;
                      return (
                        <button key={`${piece.type}-${index}`} onClick={() => selectable && handleRevivePieceSelect(piece.type)} disabled={!selectable} title={`${PIECE_NAMES[piece.type]} · ${piece.points}P`} className={`grave-piece ${selected ? 'grave-piece-selected' : ''} ${selectable ? 'grave-piece-available' : 'grave-piece-disabled'}`}>
                          <span className="text-2xl leading-none">{label}</span>
                          <span className="text-[10px] font-bold">{piece.points}P</span>
                        </button>
                      );
                    })
                  )}
                </div>

                {activeCard?.type === 'draw' && revivePoints > 0 && (
                  <div className="mt-3 text-center text-xs text-yellow-300 font-bold">
                    {selectedRevivePiece ? '✨ 내 진영 1~2랭크의 빈칸을 클릭하세요.' : '👆 부활할 기물을 선택하세요.'}
                  </div>
                )}
              </div>
            </div>

            {/* CHESSBOARD */}
            <div className="w-full max-w-[650px]">
              <div className={`p-3 sm:p-4 rounded-xl border text-center font-black text-lg sm:text-2xl tracking-wide shadow-lg mb-4 ${gameOverMsg ? 'bg-red-900/50 border-red-500 text-red-400' : 'bg-green-900/40 border-green-500 text-green-400'}`}>
                {getStatusMessage()}
              </div>
              <div className="bg-neutral-800 p-3 sm:p-4 rounded-xl shadow-2xl border border-neutral-700">
                <Chessboard
                  position={fen}
                  onPieceDrop={onDrop}
                  onSquareClick={onSquareClick}
                  boardOrientation={boardOrientation}
                  customPieces={customPieces}
                  customSquareStyles={reviveSquareStyles}
                  customDarkSquareStyle={{ backgroundColor: '#475569' }}
                  customLightSquareStyle={{ backgroundColor: '#cbd5e1' }}
                  animationDuration={200}
                  arePiecesDraggable={!gameOverMsg && !!activeCard && movesRemaining > 0 && canControlCurrentTurn()}
                />
              </div>
            </div>
          </div>
        </div>

        {/* UNO AREA */}
        <div className="w-full max-w-[400px] flex flex-col gap-4">
          <div className="bg-neutral-800 p-6 rounded-xl border border-neutral-700 shadow-xl flex flex-col items-center min-h-[500px]">
            <h2 className="text-xl font-bold mb-4 text-neutral-300 uppercase tracking-widest border-b border-neutral-700 pb-2 w-full text-center">UNO 덱</h2>
            <div className="flex-1 flex flex-col items-center justify-center w-full relative">
              {!activeCard ? (
                <button onClick={handleDrawCard} disabled={!!gameOverMsg || !canControlCurrentTurn()} className="w-56 h-80 rounded-2xl shadow-[0_0_40px_rgba(0,0,0,.6)] border-8 border-white flex flex-col items-center justify-center transition-all bg-gradient-to-br from-red-600 via-yellow-600 to-blue-600 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 cursor-pointer">
                  <div className="bg-white text-black px-8 py-3 rounded-full font-black text-3xl -rotate-12 shadow-2xl mb-6">UNO</div>
                  <div className="text-white font-bold text-xl flex items-center gap-2 bg-black/50 px-5 py-2 rounded-full"><Play fill="currentColor" size={20} /> 카드 뽑기</div>
                  <div className="mt-8 text-sm font-semibold bg-black/40 px-3 py-1 rounded text-neutral-200">남은 카드: {deck.length}장</div>
                </button>
              ) : (
                <div className="flex flex-col items-center">
                  <div className={`w-56 h-80 ${activeCard.color} rounded-2xl shadow-[0_0_50px_rgba(0,0,0,.5)] border-8 border-white flex flex-col items-center justify-center relative overflow-hidden`}>
                    <div className="absolute w-[85%] h-[92%] border-4 border-white/30 rounded-xl" />
                    <div className="text-center z-10">
                      {activeCard.type === 'number' && <span className="text-8xl font-black text-white">{activeCard.value}</span>}
                      {activeCard.type === 'skip' && <SkipForward size={80} className="text-white mx-auto" />}
                      {activeCard.type === 'reverse' && <RotateCcw size={80} className="text-white mx-auto" />}
                      {activeCard.type === 'draw' && <span className="text-7xl font-black text-white">+{activeCard.value}</span>}
                      {activeCard.type === 'wild' && <Undo2 size={80} className="text-white mx-auto" />}
                      <div className="mt-6 text-white font-black text-xl uppercase tracking-widest bg-black/40 px-4 py-2 rounded-lg border border-white/20">{activeCard.name}</div>
                    </div>
                  </div>
                  {activeCard.type === 'number' && (
                    <div className="mt-8 bg-neutral-900 px-8 py-4 rounded-full border-2 border-neutral-600 shadow-inner flex items-center gap-4">
                      <span className="text-lg text-neutral-300 font-semibold">남은 이동</span>
                      <span className="text-4xl font-black text-yellow-400">{movesRemaining}</span>
                    </div>
                  )}
                </div>
              )}

              {activeCard?.type === 'draw' && revivePoints > 0 && (
                <button onClick={() => finishRevive()} disabled={!canControlCurrentTurn()} className="mt-5 px-6 py-3 rounded-xl bg-yellow-600 hover:bg-yellow-500 disabled:bg-neutral-700 text-white font-black shadow-lg transition-all">
                  부활 종료 · 남은 {revivePoints}P 사용하지 않기
                </button>
              )}
            </div>

            {!activeCard && !gameOverMsg && canControlCurrentTurn() && (
              <p className="mt-8 text-yellow-400 font-bold animate-pulse text-center bg-yellow-900/30 px-6 py-2 rounded-full">👉 UNO 덱을 눌러 카드를 뽑으세요!</p>
            )}
            {!activeCard && !gameOverMsg && !canControlCurrentTurn() && (
              <p className="mt-8 text-neutral-400 font-bold text-center bg-neutral-900 px-6 py-2 rounded-full">상대방의 턴입니다.</p>
            )}
          </div>
        </div>
      </main>

      {showTutorial && <TutorialModal onClose={() => setShowTutorial(false)} />}
      <Toast message={toast.msg} type={toast.type} onClose={() => setToast({ msg: '', type: 'info' })} />
    </div>
  );
}
