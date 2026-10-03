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
    for (let i = 0; i < count; i++) {
      deck.push({ type, value, name, color, id: Math.random() });
    }
  };
  
  addCards('number', 1, 33, '1 Move', 'bg-blue-600');
  addCards('number', 2, 22, '2 Moves', 'bg-green-600');
  addCards('number', 3, 11, '3 Moves', 'bg-yellow-600');
  // 4 이동 카드는 삭제
  addCards('number', 100, 1, '100 Moves', 'bg-red-700');
  
  addCards('skip', null, 8, 'Skip', 'bg-purple-600');
  addCards('reverse', null, 8, 'Reverse', 'bg-pink-600');
  addCards('draw', 2, 8, 'Draw 2+', 'bg-cyan-600');
  addCards('draw', 4, 4, 'Draw 4+', 'bg-teal-600');
  
  // 와일드: 4장 -> 2장, 5턴 롤백 -> 3턴 롤백
  addCards(
    'wild',
    null,
    2,
    'Wild (Undo x3)',
    'bg-gradient-to-br from-purple-500 via-pink-500 to-red-500'
  );
  
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
      <AlertTriangle
        size={18}
        className={type === 'error' ? "text-red-500" : "text-yellow-400"}
      />
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

        <button
          onClick={onClose}
          className="p-2 bg-neutral-700 hover:bg-red-500 rounded-full transition-colors"
        >
          <X size={24} />
        </button>
      </div>
      
      <div className="p-6 overflow-y-auto flex flex-col gap-6 text-neutral-200">
        <section>
          <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
            🎯 기본 규칙
          </h3>

          <p className="bg-neutral-900 p-4 rounded-xl border border-neutral-700 leading-relaxed text-lg">
            일반 체스 세팅에서 게임을 시작합니다.<br/>
            가장 중요한 규칙:
            <strong className="text-yellow-400">
              내 턴이 시작되면 반드시 화면 우측의 [UNO 덱]을 클릭해서 카드를 먼저 1장 뽑아야 합니다.
            </strong>
            카드를 뽑기 전에는 체스말을 만지거나 움직일 수 없습니다!
          </p>
        </section>
        
        <section>
          <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
            🃏 카드 종류 및 특수 효과
          </h3>

          <div className="grid gap-3">
            <div className="bg-neutral-900 p-4 rounded-xl border border-neutral-700 flex items-start gap-4">
              <span className="text-3xl">🔢</span>

              <div>
                <strong className="text-white block mb-1 text-lg">
                  숫자 카드 (1, 2, 3, 100)
                </strong>

                나온 숫자만큼 내 체스말을
                <span className="text-green-400 font-bold"> 연속으로 </span>
                움직일 수 있습니다.
              </div>
            </div>

            <div className="bg-neutral-900 p-4 rounded-xl border border-neutral-700 flex items-start gap-4">
              <span className="text-3xl text-purple-400">
                <SkipForward size={32}/>
              </span>

              <div>
                <strong className="text-white block mb-1 text-lg">
                  스킵 (Skip)
                </strong>

                현재 턴에 아무런 행동도 하지 못하고,
                즉시 턴이 상대방에게 넘어갑니다.
              </div>
            </div>

            <div className="bg-neutral-900 p-4 rounded-xl border border-neutral-700 flex items-start gap-4">
              <span className="text-3xl text-pink-400">
                <RotateCcw size={32}/>
              </span>

              <div>
                <strong className="text-white block mb-1 text-lg">
                  리버스 (Reverse)
                </strong>

                체스판 배열이 회전하며 나와 상대방의
                <span className="text-pink-400 font-bold">
                  진영(흑/백)과 시점이 180도 완전히 바뀝니다!
                </span>
              </div>
            </div>

            <div className="bg-neutral-900 p-4 rounded-xl border border-neutral-700 flex items-start gap-4">
              <span className="text-3xl font-black text-cyan-400 leading-none mt-1">
                +2
              </span>

              <div>
                <strong className="text-white block mb-1 text-lg">
                  드로우 (Draw 2+ / 4+)
                </strong>

                잡혀서 죽은 기물을 포인트에 맞게
                내 진영 빈칸에 무작위로 부활시킵니다.
              </div>
            </div>

            <div className="bg-neutral-900 p-4 rounded-xl border border-neutral-700 flex items-start gap-4">
              <span className="text-3xl text-yellow-400">
                <Undo2 size={32}/>
              </span>

              <div>
                <strong className="text-white block mb-1 text-lg">
                  와일드 (Wild)
                </strong>

                체크메이트 위기에서 발동하여
                <span className="text-yellow-400 font-bold">
                  3턴 전으로 되돌립니다.
                </span>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
            👑 승리 조건
          </h3>

          <p className="bg-red-900/30 text-red-100 p-4 rounded-xl border border-red-500/50 leading-relaxed font-semibold text-lg">
            상대방의
            <strong className="text-red-400">
              킹과 퀸을 모두 잡으면
            </strong>
            승리합니다.
            체크메이트 자체는 게임 종료 조건이 아닙니다!
          </p>
        </section>
      </div>
      
      <div className="p-5 border-t border-neutral-700 bg-neutral-900/50 rounded-b-3xl text-center">
        <button
          onClick={onClose}
          className="px-10 py-4 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-bold text-xl transition-all hover:scale-105 shadow-[0_0_20px_rgba(79,70,229,0.4)]"
        >
          확인 완료
        </button>
      </div>
    </div>
  </div>
);

export default function App() {
  const [mode, setMode] = useState('menu');

  const [game, setGame] = useState(() => new Chess());
  const [fen, setFen] = useState(() => new Chess().fen());
  const [fenHistory, setFenHistory] = useState(() => [new Chess().fen()]);
  
  const [deck, setDeck] = useState(generateDeck);
  const [activeCard, setActiveCard] = useState(null);
  const [movesRemaining, setMovesRemaining] = useState(0);
  
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

  const stateRef = useRef({
    fen,
    activeCard,
    movesRemaining,
    unoTurnColor,
    deck,
    gameOverMsg,
    boardOrientation,
    capturedTargets
  });

  useEffect(() => {
    stateRef.current = {
      fen,
      activeCard,
      movesRemaining,
      unoTurnColor,
      deck,
      gameOverMsg,
      boardOrientation,
      capturedTargets
    };
  }, [
    fen,
    activeCard,
    movesRemaining,
    unoTurnColor,
    deck,
    gameOverMsg,
    boardOrientation,
    capturedTargets
  ]);

  const showToast = useCallback((msg, type = 'info') => {
    setToast({ msg, type });
  }, []);

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

        try {
          newPeer.destroy();
        } catch (e) {}

        peerRef.current = null;
        setPeer(null);

        showToast(
          "P2P 서버 연결 시간이 초과되었습니다. 네트워크를 확인해 주세요.",
          "error"
        );
      }
    }, 12000);

    newPeer.on('open', (id) => {
      clearTimeout(timeoutId);

      isConnectingRef.current = false;
      setPeerId(id);
      setIsConnecting(false);
      setIsHost(true);

      setMyColor('b');
      setBoardOrientation('black');
      setMode('p2p_lobby');

      console.log('[P2P] 방 생성 완료:', id);
    });

    newPeer.on('connection', (connection) => {
      console.log('[P2P] 상대방 접속 요청:', connection.peer);

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

      showToast(
        `P2P 오류: ${err?.type || err?.message || 'unknown'}`,
        "error"
      );
    });
  };

  const connectToPeer = () => {
    const activePeer = peerRef.current || peer;
    const targetId = remotePeerId.trim();

    if (!activePeer || activePeer.destroyed) {
      showToast(
        "먼저 온라인 대전을 눌러 방을 생성해 주세요.",
        "error"
      );
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
    setMyColor('w');
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
        const newGame = new Chess();

        if (data.fen) {
          newGame.load(data.fen);
        }

        setGame(newGame);
        setFen(data.fen || newGame.fen());

        if (data.deck) {
          setDeck(data.deck);
        }

        if (data.unoTurnColor) {
          setUnoTurnColor(data.unoTurnColor);
        }

        if (data.boardOrientation) {
          setBoardOrientation(data.boardOrientation);
        }

        setGameOverMsg('');

        const initialCaptured =
          data.capturedTargets || {
            w: { k: false, q: false },
            b: { k: false, q: false }
          };

        setCapturedTargets(initialCaptured);
        setCaptureHistory([initialCaptured]);

        setActiveCard(null);
        setMovesRemaining(0);
        setMode('p2p');

        showToast("게임이 시작되었습니다!");
        return;
      }

      if (data.type === 'REVERSE') {
        setBoardOrientation(prev =>
          prev === 'white' ? 'black' : 'white'
        );

        setMyColor(prev =>
          prev === 'w' ? 'b' : 'w'
        );

        if (data.unoTurnColor) {
          setUnoTurnColor(data.unoTurnColor);
        }

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

          if (data.activeCard !== undefined) {
            setActiveCard(data.activeCard);
          }

          if (data.movesRemaining !== undefined) {
            setMovesRemaining(data.movesRemaining);
          }

          if (data.unoTurnColor !== undefined) {
            setUnoTurnColor(data.unoTurnColor);
          }

          if (data.deck !== undefined) {
            setDeck(data.deck);
          }

          if (data.gameOverMsg !== undefined) {
            setGameOverMsg(data.gameOverMsg);
          }

          if (data.capturedTargets !== undefined) {
            setCapturedTargets(data.capturedTargets);
          }

          if (data.toast) {
            showToast(data.toast);
          }
        } catch (e) {
          console.error('[P2P] SYNC 오류:', e);
        }
      }
    });

    connection.on('close', () => {
      setOpponentConnected(false);
      showToast(
        "상대방과의 연결이 끊어졌습니다.",
        "error"
      );
    });
  };

  const sendMessage = useCallback((message) => {
    const connection = connRef.current || conn;

    if (!connection || !connection.open) {
      return false;
    }

    try {
      connection.send(message);
      return true;
    } catch (e) {
      return false;
    }
  }, [conn]);

  const syncState = useCallback((overrides = {}) => {
    const connection = connRef.current || conn;

    if (!connection || !connection.open) {
      return;
    }

    const current = stateRef.current;

    try {
      connection.send({
        type: 'SYNC',

        fen:
          overrides.fen !== undefined
            ? overrides.fen
            : current.fen,

        activeCard:
          overrides.activeCard !== undefined
            ? overrides.activeCard
            : current.activeCard,

        movesRemaining:
          overrides.movesRemaining !== undefined
            ? overrides.movesRemaining
            : current.movesRemaining,

        unoTurnColor:
          overrides.unoTurnColor !== undefined
            ? overrides.unoTurnColor
            : current.unoTurnColor,

        deck:
          overrides.deck !== undefined
            ? overrides.deck
            : current.deck,

        gameOverMsg:
          overrides.gameOverMsg !== undefined
            ? overrides.gameOverMsg
            : current.gameOverMsg,

        capturedTargets:
          overrides.capturedTargets !== undefined
            ? overrides.capturedTargets
            : current.capturedTargets,

        boardOrientation:
          overrides.boardOrientation !== undefined
            ? overrides.boardOrientation
            : current.boardOrientation,

        toast:
          overrides.toast !== undefined
            ? overrides.toast
            : ''
      });
    } catch (e) {}
  }, [conn]);

  const handleStartGame = () => {
    const freshGame = new Chess();
    const initialFen = freshGame.fen();
    const initialDeck = generateDeck();

    const initialCaptured = {
      w: { k: false, q: false },
      b: { k: false, q: false }
    };

    setGame(freshGame);
    setFen(initialFen);
    setFenHistory([initialFen]);
    setDeck(initialDeck);
    setActiveCard(null);
    setMovesRemaining(0);
    setUnoTurnColor('w');
    setGameOverMsg('');

    setCapturedTargets(initialCaptured);
    setCaptureHistory([initialCaptured]);

    setBoardOrientation('black');
    setMode('p2p');

    sendMessage({
      type: 'START_GAME',
      fen: initialFen,
      deck: initialDeck,
      unoTurnColor: 'w',
      boardOrientation: 'white',
      capturedTargets: initialCaptured
    });
  };

  const safelyPassTurn = useCallback((currentFen) => {
    const parts = currentFen.split(' ');

    const nextColor =
      parts[1] === 'w'
        ? 'b'
        : 'w';

    parts[1] = nextColor;
    parts[3] = '-';

    const newFen = parts.join(' ');

    try {
      const newGame = new Chess();
      newGame.load(newFen);

      setGame(newGame);
      setFen(newFen);
      setUnoTurnColor(nextColor);

      setFenHistory(prev => [
        ...prev,
        newFen
      ]);

      syncState({
        fen: newFen,
        unoTurnColor: nextColor,
        movesRemaining: 0,
        activeCard: null
      });
    } catch (e) {
      const msg =
        "잘못된 위치! 킹이 위협받습니다. 게임 오버!";

      setGameOverMsg(msg);
      syncState({
        gameOverMsg: msg
      });
    }
  }, [syncState]);

  const endTurn = useCallback((currentFen, extraSync = {}) => {
    setActiveCard(null);
    setMovesRemaining(0);

    const currentGame = new Chess(currentFen);

    if (currentGame.turn() === unoTurnColor) {
      if (Object.keys(extraSync).length > 0) {
        const parts = currentFen.split(' ');

        const nextColor =
          parts[1] === 'w'
            ? 'b'
            : 'w';

        parts[1] = nextColor;
        parts[3] = '-';

        const nextFen = parts.join(' ');

        try {
          const nextGame = new Chess(nextFen);

          setGame(nextGame);
          setFen(nextFen);
          setUnoTurnColor(nextColor);

          setFenHistory(prev => [
            ...prev,
            nextFen
          ]);

          syncState({
            fen: nextFen,
            unoTurnColor: nextColor,
            movesRemaining: 0,
            activeCard: null,
            ...extraSync
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

      setFenHistory(prev => [
        ...prev,
        currentFen
      ]);

      syncState({
        fen: currentFen,
        unoTurnColor: nextColor,
        movesRemaining: 0,
        activeCard: null,
        ...extraSync
      });
    }
  }, [
    unoTurnColor,
    safelyPassTurn,
    syncState
  ]);

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

      syncState({
        fen: newFen
      });
    } catch (e) {
      showToast(
        "상대방이 체크 상태이므로 연속 이동할 수 없습니다!"
      );

      endTurn(currentFen);
    }
  }, [
    unoTurnColor,
    endTurn,
    showToast,
    syncState
  ]);

  const handleRevive = useCallback((maxPoints, currentFen) => {
    const points = {
      p: 1,
      n: 3,
      b: 3,
      r: 3,
      q: 4
    };

    const initialCount = {
      p: 8,
      n: 2,
      b: 2,
      r: 2,
      q: 1
    };

    const currentCount = {
      p: 0,
      n: 0,
      b: 0,
      r: 0,
      q: 0
    };

    const currentGame = new Chess(currentFen);

    currentGame.board().forEach(row => {
      row.forEach(piece => {
        if (
          piece &&
          piece.color === unoTurnColor
        ) {
          currentCount[piece.type]++;
        }
      });
    });

    let revivedPoints = 0;
    const piecesToRevive = [];

    const types = [
      'q',
      'r',
      'b',
      'n',
      'p'
    ];

    for (const type of types) {
      let missing =
        initialCount[type] -
        currentCount[type];

      while (
        missing > 0 &&
        revivedPoints + points[type] <= maxPoints
      ) {
        piecesToRevive.push(type);
        revivedPoints += points[type];
        missing--;
      }
    }

    if (piecesToRevive.length === 0) {
      showToast(
        "부활시킬 죽은 기물이 없습니다. 1회 이동합니다.",
        "info"
      );

      setMovesRemaining(1);

      syncState({
        movesRemaining: 1
      });

      return;
    }

    const emptySquares = [];

    const rankStart =
      unoTurnColor === 'w'
        ? 4
        : 0;

    const rankEnd =
      unoTurnColor === 'w'
        ? 8
        : 4;

    const board = currentGame.board();

    for (
      let r = rankStart;
      r < rankEnd;
      r++
    ) {
      for (
        let c = 0;
        c < 8;
        c++
      ) {
        if (board[r][c] === null) {
          emptySquares.push(
            String.fromCharCode(97 + c) +
            (8 - r)
          );
        }
      }
    }

    emptySquares.sort(
      () => Math.random() - 0.5
    );

    piecesToRevive.forEach(
      (type, index) => {
        if (emptySquares[index]) {
          currentGame.put(
            {
              type,
              color: unoTurnColor
            },
            emptySquares[index]
          );
        }
      }
    );

    const newFen = currentGame.fen();

    setGame(currentGame);
    setFen(newFen);

    setFenHistory(prev => [
      ...prev,
      newFen
    ]);

    showToast(
      "기물 부활 완료! 턴이 종료됩니다."
    );

    setTimeout(() => {
      endTurn(newFen);
    }, 2500);
  }, [
    unoTurnColor,
    endTurn,
    showToast,
    syncState
  ]);

  const handleWildCard = useCallback((currentFen) => {
    const currentGame = new Chess(currentFen);

    const isMated =
      currentGame.isCheckmate();

    if (isMated) {
      showToast(
        "와일드! 3턴 전으로 되돌립니다!",
        "info"
      );

      let newFen = currentFen;
      const historyCopy = [...fenHistory];

      for (let i = 0; i < 3; i++) {
        if (historyCopy.length > 1) {
          historyCopy.pop();
          newFen =
            historyCopy[
              historyCopy.length - 1
            ];
        }
      }

      const newGame = new Chess();
      newGame.load(newFen);

      setGame(newGame);
      setFen(newFen);
      setFenHistory(historyCopy);

      const restoredTargets =
        captureHistory[
          Math.max(
            0,
            captureHistory.length - 4
          )
        ] || {
          w: { k: false, q: false },
          b: { k: false, q: false }
        };

      setCapturedTargets(restoredTargets);

      syncState({
        fen: newFen,
        capturedTargets: restoredTargets,
        toast:
          "와일드카드로 3턴 전으로 롤백되었습니다!"
      });

      setTimeout(() => {
        endTurn(newFen, {
          capturedTargets: restoredTargets
        });
      }, 1800);
    } else {
      showToast(
        "체크메이트 위기에서만 3턴 롤백이 가능합니다.",
        "info"
      );

      setMovesRemaining(2);

      syncState({
        movesRemaining: 2
      });
    }
  }, [
    fenHistory,
    captureHistory,
    endTurn,
    showToast,
    syncState
  ]);

  const handleDrawCard = useCallback(() => {
    if (gameOverMsg || activeCard) {
      return;
    }

    if (
      (mode === 'p2p' || mode === 'ai') &&
      unoTurnColor !== myColor
    ) {
      showToast(
        "상대방의 턴입니다.",
        "error"
      );
      return;
    }

    const currentGame = new Chess(fen);

    if (
      currentGame.turn() !==
      unoTurnColor
    ) {
      showToast(
        "현재 턴인 플레이어만 카드를 뽑을 수 있습니다!",
        "error"
      );
      return;
    }

    let currentDeck = [...deck];

    if (currentDeck.length === 0) {
      currentDeck = generateDeck();
    }

    const card = currentDeck.pop();

    setDeck(currentDeck);
    setActiveCard(card);

    if (card.type === 'number') {
      setMovesRemaining(card.value);

      syncState({
        activeCard: card,
        deck: currentDeck,
        movesRemaining: card.value
      });
    }

    else if (card.type === 'skip') {
      setMovesRemaining(0);

      syncState({
        activeCard: card,
        deck: currentDeck,
        movesRemaining: 0
      });

      showToast(
        "스킵! 턴이 넘어갑니다."
      );

      setTimeout(() => {
        endTurn(fen);
      }, 1200);
    }

    else if (card.type === 'reverse') {
      const newOrient =
        boardOrientation === 'white'
          ? 'black'
          : 'white';

      setBoardOrientation(newOrient);

      if (
        mode === 'p2p' ||
        mode === 'ai'
      ) {
        setMyColor(prev =>
          prev === 'w'
            ? 'b'
            : 'w'
        );
      }

      setMovesRemaining(0);

      syncState({
        activeCard: card,
        deck: currentDeck,
        movesRemaining: 0
      });

      sendMessage({
        type: 'REVERSE',
        boardOrientation: newOrient,
        myColor:
          myColor === 'w'
            ? 'b'
            : 'w',
        unoTurnColor,
        activeCard: card
      });

      showToast(
        "리버스! 진영과 시점이 180도 뒤집혔습니다!",
        "info"
      );

      // FEN의 턴은 그대로 유지합니다.
      // 진영이 뒤집혔기 때문에 현재 색을 새로 조종하게 된 플레이어가 턴을 가집니다.
      setTimeout(() => {
        setActiveCard(null);
        setMovesRemaining(0);

        syncState({
          activeCard: null,
          movesRemaining: 0,
          unoTurnColor
        });
      }, 1200);
    }

    else if (card.type === 'draw') {
      syncState({
        activeCard: card,
        deck: currentDeck,
        movesRemaining: 0
      });

      handleRevive(
        card.value,
        fen
      );
    }

    else if (card.type === 'wild') {
      syncState({
        activeCard: card,
        deck: currentDeck,
        movesRemaining: 0
      });

      handleWildCard(fen);
    }
  }, [
    deck,
    gameOverMsg,
    activeCard,
    fen,
    unoTurnColor,
    myColor,
    mode,
    boardOrientation,
    endTurn,
    handleRevive,
    handleWildCard,
    showToast,
    syncState,
    sendMessage
  ]);

  const onDrop = (sourceSquare, targetSquare) => {
    if (gameOverMsg) {
      return false;
    }

    if (
      (mode === 'p2p' || mode === 'ai') &&
      unoTurnColor !== myColor
    ) {
      showToast(
        "상대방의 턴입니다.",
        "error"
      );
      return false;
    }

    if (
      !activeCard ||
      movesRemaining <= 0
    ) {
      return false;
    }

    const currentGame = new Chess(fen);
    const piece =
      currentGame.get(sourceSquare);

    if (
      !piece ||
      piece.color !== unoTurnColor
    ) {
      showToast(
        "현재 턴인 진영의 말만 움직일 수 있습니다!",
        "error"
      );
      return false;
    }

    const targetPiece =
      currentGame.get(targetSquare);

    /*
     * =========================================================
     * 킹 / 퀸 직접 캡처 처리
     * =========================================================
     */

    if (
      targetPiece &&
      targetPiece.color !== unoTurnColor &&
      (
        targetPiece.type === 'k' ||
        targetPiece.type === 'q'
      )
    ) {
      if (
        capturedTargets[
          targetPiece.color
        ]?.[targetPiece.type]
      ) {
        showToast(
          `이미 잡힌 ${
            targetPiece.type === 'k'
              ? '킹'
              : '퀸'
          }입니다.`,
          'error'
        );

        return false;
      }

      let canCapture = false;

      try {
        if (targetPiece.type === 'k') {
          /*
           * chess.js는 킹을 실제로 잡는 것을 허용하지 않습니다.
           * 따라서 임시 Chess 객체에서 킹을 제거한 뒤
           * 해당 이동이 가능한지 검사합니다.
           */
          const test =
            new Chess(
              currentGame.fen()
            );

          test.remove(targetSquare);

          test.move({
            from: sourceSquare,
            to: targetSquare,
            promotion: 'q'
          });

          canCapture = true;
        } else {
          const legalMoves =
            currentGame.moves({
              square: sourceSquare,
              verbose: true
            });

          canCapture =
            legalMoves.some(
              move =>
                move.to === targetSquare
            );
        }
      } catch (e) {
        canCapture = false;
      }

      if (!canCapture) {
        return false;
      }

      const nextCaptured = {
        w: {
          ...capturedTargets.w
        },
        b: {
          ...capturedTargets.b
        }
      };

      nextCaptured[
        targetPiece.color
      ][targetPiece.type] = true;

      let nextGame = currentGame;

      /*
       * 퀸은 실제 체스판에서도 제거합니다.
       *
       * 킹은 chess.js의 규칙 때문에 실제 FEN에서는
       * 제거하지 않고 capturedTargets에서만 잡힌 것으로 기록합니다.
       */
      if (targetPiece.type === 'q') {
        const move =
          currentGame.move({
            from: sourceSquare,
            to: targetSquare,
            promotion: 'q'
          });

        if (!move) {
          return false;
        }

        nextGame = currentGame;
      }

      const newMovesRemaining =
        movesRemaining - 1;

      const newFen =
        nextGame.fen();

      const targetName =
        targetPiece.type === 'k'
          ? '킹'
          : '퀸';

      setCapturedTargets(
        nextCaptured
      );

      setCaptureHistory(prev => [
        ...prev,
        nextCaptured
      ]);

      setGame(nextGame);
      setFen(newFen);
      setFenHistory(prev => [
        ...prev,
        newFen
      ]);
      setMovesRemaining(
        newMovesRemaining
      );

      /*
       * 킹 + 퀸을 모두 잡았으면 즉시 승리.
       */
      const opponent =
        targetPiece.color;

      const hasWon =
        nextCaptured[opponent].k &&
        nextCaptured[opponent].q;

      if (hasWon) {
        const winnerMsg =
          "상대방의 킹과 퀸을 모두 잡았습니다! 승리!";

        setGameOverMsg(
          winnerMsg
        );

        setMovesRemaining(0);
        setActiveCard(null);

        syncState({
          gameOverMsg: winnerMsg,
          capturedTargets: nextCaptured,
          movesRemaining: 0,
          activeCard: null,
          toast:
            `상대방의 ${targetName}을 잡았습니다.`
        });

        return true;
      }

      showToast(
        `${targetName}을 잡았습니다! ${
          targetName === '킹'
            ? '퀸도 잡아야 승리합니다.'
            : '킹도 잡아야 승리합니다.'
        }`
      );

      /*
       * 아직 같은 카드로 이동할 수 있다면 계속 이동.
       */
      if (newMovesRemaining > 0) {
        forceKeepTurn(newFen);
      }

      /*
       * ======================================================
       * 핵심 수정 부분
       * ======================================================
       *
       * 킹은 chess.js에서 실제 이동을 하지 않기 때문에
       * newFen의 active color가 그대로 남아 있습니다.
       *
       * 따라서 킹만 잡고 마지막 이동을 사용했을 경우에는
       * endTurn()에만 의존하지 않고,
       *
       * 1. 다음 턴 색 계산
       * 2. FEN active color 변경
       * 3. unoTurnColor 변경
       * 4. activeCard 제거
       * 5. movesRemaining 0
       * 6. 상대방에게 새로운 FEN 전송
       *
       * 을 한 번에 처리합니다.
       */
      else {
        const parts =
          newFen.split(' ');

        const nextColor =
          parts[1] === 'w'
            ? 'b'
            : 'w';

        parts[1] = nextColor;
        parts[3] = '-';

        const nextFen =
          parts.join(' ');

        try {
          const nextGame =
            new Chess(nextFen);

          setGame(nextGame);
          setFen(nextFen);
          setUnoTurnColor(
            nextColor
          );
          setMovesRemaining(0);
          setActiveCard(null);

          setFenHistory(prev => [
            ...prev,
            nextFen
          ]);

          syncState({
            fen: nextFen,
            unoTurnColor: nextColor,
            activeCard: null,
            movesRemaining: 0,
            capturedTargets: nextCaptured
          });
        } catch (e) {
          console.error(
            '[턴 전환] 킹 캡처 후 다음 턴 전환 실패:',
            e
          );

          endTurn(
            newFen,
            {
              capturedTargets:
                nextCaptured
            }
          );
        }
      }

      return true;
    }

    /*
     * =========================================================
     * 일반 체스 이동
     * =========================================================
     */

    try {
      const move =
        currentGame.move({
          from: sourceSquare,
          to: targetSquare,
          promotion: 'q'
        });

      if (move === null) {
        return false;
      }

      const newMovesRemaining =
        movesRemaining - 1;

      const newFen =
        currentGame.fen();

      setMovesRemaining(
        newMovesRemaining
      );

      setGame(currentGame);
      setFen(newFen);

      setFenHistory(prev => [
        ...prev,
        newFen
      ]);

      setCaptureHistory(prev => [
        ...prev,
        capturedTargets
      ]);

      if (newMovesRemaining > 0) {
        forceKeepTurn(newFen);
      } else {
        endTurn(newFen);
      }

      return true;
    } catch (e) {
      console.error(
        '[onDrop] 이동 오류:',
        e
      );

      return false;
    }
  };

  /*
   * =========================================================
   * AI
   * =========================================================
   */

  useEffect(() => {
    const aiColor =
      myColor === 'w'
        ? 'b'
        : 'w';

    if (
      mode !== 'ai' ||
      gameOverMsg ||
      unoTurnColor !== aiColor ||
      isTransitioning.current
    ) {
      return;
    }

    isTransitioning.current = true;

    const currentDelay =
      stateRef.current.activeCard
        ? 900
        : 1000;

    const timer = setTimeout(() => {
      const current =
        stateRef.current;

      try {
        /*
         * AI가 카드를 아직 뽑지 않았다면 카드부터 뽑습니다.
         */
        if (!current.activeCard) {
          let currentDeck =
            Array.isArray(current.deck)
              ? [...current.deck]
              : [];

          if (currentDeck.length === 0) {
            currentDeck =
              generateDeck();
          }

          const card =
            currentDeck.pop();

          setDeck(currentDeck);
          setActiveCard(card);

          syncState({
            activeCard: card,
            deck: currentDeck,
            movesRemaining:
              card.type === 'number'
                ? card.value
                : 0
          });

          if (card.type === 'number') {
            setMovesRemaining(
              card.value
            );

            showToast(
              `AI 카드: ${card.name}`
            );
          }

          else if (card.type === 'skip') {
            showToast(
              'AI 카드: Skip'
            );

            setTimeout(() => {
              setActiveCard(null);
              setMovesRemaining(0);

              safelyPassTurn(
                stateRef.current.fen
              );

              isTransitioning.current =
                false;
            }, 900);

            return;
          }

          else if (card.type === 'reverse') {
            showToast(
              'AI 카드: Reverse'
            );

            setBoardOrientation(
              prev =>
                prev === 'white'
                  ? 'black'
                  : 'white'
            );

            setMyColor(prev =>
              prev === 'w'
                ? 'b'
                : 'w'
            );

            setTimeout(() => {
              setActiveCard(null);
              setMovesRemaining(0);

              syncState({
                activeCard: null,
                movesRemaining: 0,
                unoTurnColor:
                  stateRef.current.unoTurnColor
              });

              isTransitioning.current =
                false;
            }, 900);

            return;
          }

          else if (card.type === 'draw') {
            showToast(
              `AI 카드: Draw ${card.value}+`
            );

            handleRevive(
              card.value,
              current.fen
            );

            isTransitioning.current =
              false;

            return;
          }

          else if (card.type === 'wild') {
            showToast(
              'AI 카드: Wild'
            );

            handleWildCard(
              current.fen
            );

            isTransitioning.current =
              false;

            return;
          }

          isTransitioning.current =
            false;

          return;
        }

        /*
         * AI 숫자 카드 연속 이동
         */
        if (
          current.activeCard.type ===
            'number' &&
          current.movesRemaining > 0
        ) {
          const currentGame =
            new Chess(current.fen);

          const possibleMoves =
            currentGame.moves({
              verbose: true
            });

          if (
            possibleMoves.length === 0
          ) {
            setActiveCard(null);
            setMovesRemaining(0);

            safelyPassTurn(
              current.fen
            );

            isTransitioning.current =
              false;

            return;
          }

          const move =
            possibleMoves[
              Math.floor(
                Math.random() *
                possibleMoves.length
              )
            ];

          const targetPiece =
            currentGame.get(move.to);

          const moverColor =
            currentGame.get(
              move.from
            )?.color;

          if (
            moverColor !== aiColor
          ) {
            forceKeepTurn(
              current.fen
            );

            isTransitioning.current =
              false;

            return;
          }

          let nextCaptured = {
            w: {
              ...current.capturedTargets.w
            },
            b: {
              ...current.capturedTargets.b
            }
          };

          if (
            targetPiece &&
            targetPiece.color === 'w' &&
            (
              targetPiece.type === 'k' ||
              targetPiece.type === 'q'
            )
          ) {
            nextCaptured.w[
              targetPiece.type
            ] = true;
          }

          currentGame.move(move);

          const newFen =
            currentGame.fen();

          const remaining =
            current.movesRemaining - 1;

          setGame(currentGame);
          setFen(newFen);

          setFenHistory(prev => [
            ...prev,
            newFen
          ]);

          setCapturedTargets(
            nextCaptured
          );

          setCaptureHistory(prev => [
            ...prev,
            nextCaptured
          ]);

          if (
            nextCaptured.w.k &&
            nextCaptured.w.q
          ) {
            const msg =
              'AI가 당신의 킹과 퀸을 모두 잡았습니다! 패배!';

            setGameOverMsg(msg);
            setMovesRemaining(0);
            setActiveCard(null);

            syncState({
              gameOverMsg: msg,
              capturedTargets:
                nextCaptured,
              movesRemaining: 0,
              activeCard: null
            });
          }

          else if (remaining > 0) {
            setMovesRemaining(
              remaining
            );

            forceKeepTurn(
              newFen
            );
          }

          else {
            endTurn(newFen, {
              capturedTargets:
                nextCaptured
            });
          }
        }

        else {
          isTransitioning.current =
            false;

          return;
        }
      } catch (e) {
        console.error(
          '[AI] 턴 처리 오류:',
          e
        );

        isTransitioning.current =
          false;
      }

      isTransitioning.current =
        false;
    }, currentDelay);

    return () => {
      clearTimeout(timer);
    };
  }, [
    mode,
    gameOverMsg,
    unoTurnColor,
    activeCard,
    movesRemaining,
    fen,
    deck,
    boardOrientation,
    handleRevive,
    handleWildCard,
    forceKeepTurn,
    endTurn,
    safelyPassTurn,
    syncState,
    showToast,
    myColor
  ]);

  const resetGame = () => {
    const newGame =
      new Chess();

    const emptyCaptured = {
      w: { k: false, q: false },
      b: { k: false, q: false }
    };

    setGame(newGame);
    setFen(newGame.fen());
    setFenHistory([
      newGame.fen()
    ]);

    setDeck(
      generateDeck()
    );

    setActiveCard(null);
    setMovesRemaining(0);

    if (mode === 'p2p') {
      setBoardOrientation(
        myColor === 'b'
          ? 'black'
          : 'white'
      );
    } else {
      setMyColor('w');
      setBoardOrientation('white');
    }

    setUnoTurnColor('w');
    setGameOverMsg('');

    setCapturedTargets(
      emptyCaptured
    );

    setCaptureHistory([
      emptyCaptured
    ]);

    if (connRef.current?.open) {
      syncState({
        fen: newGame.fen(),
        unoTurnColor: 'w',
        activeCard: null,
        movesRemaining: 0,
        gameOverMsg: '',
        capturedTargets:
          emptyCaptured
      });
    }
  };

  const getStatusMessage = () => {
    if (gameOverMsg) {
      return gameOverMsg;
    }

    const currentGame =
      new Chess(fen);

    if (
      currentGame.isCheckmate()
    ) {
      return "체크메이트 상태 — 킹과 퀸을 모두 잡아야 승리합니다.";
    }

    const turnName =
      unoTurnColor === 'w'
        ? '백색 (White)'
        : '흑색 (Black)';

    if (
      currentGame.isCheck()
    ) {
      return `체크! ${turnName} 턴`;
    }

    return `${turnName} 턴`;
  };

  /*
   * =========================================================
   * 메뉴
   * =========================================================
   */

  if (mode === 'menu') {
    return (
      <div className="min-h-screen bg-neutral-900 text-white flex flex-col items-center justify-center p-4">

        <h1 className="text-6xl font-black mb-12 text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-yellow-400 to-blue-500 flex items-center gap-4 text-center">
          <Swords
            size={60}
            className="text-white hidden sm:block"
          />
          UNO CHESS
        </h1>

        <div className="flex flex-col gap-4 w-full max-w-md">

          <button 
            onClick={() => {
              setMode('ai');
              resetGame();
            }}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 rounded-2xl text-xl font-bold transition-all transform hover:scale-105 flex items-center justify-center gap-3 shadow-lg"
          >
            <Bot size={28} />
            AI와 대전하기
          </button>
          
          <button 
            onClick={() => {
              setMode('local_pvp');
              resetGame();
              setBoardOrientation('white');
            }}
            className="w-full py-4 bg-teal-600 hover:bg-teal-500 rounded-2xl text-xl font-bold transition-all transform hover:scale-105 flex items-center justify-center gap-3 shadow-lg"
          >
            <Smartphone size={28} />
            같은 기기 1:1 대전 (로컬 추천 ⭐)
          </button>

          <button 
            onClick={initPeer}
            disabled={isConnecting}
            className={`w-full py-4 rounded-2xl text-xl font-bold transition-all flex items-center justify-center gap-3 shadow-lg ${
              isConnecting
                ? 'bg-neutral-700 text-neutral-400 cursor-wait'
                : 'bg-green-600 hover:bg-green-500 transform hover:scale-105'
            }`}
          >
            {
              isConnecting
                ? <Loader2 size={28} className="animate-spin text-green-400" />
                : <Wifi size={28} />
            }

            {
              isConnecting
                ? '서버 연결 중...'
                : '실시간 온라인 대전 (대기실)'
            }
          </button>
          
          <button 
            onClick={() =>
              setShowTutorial(true)
            }
            className="w-full py-4 bg-neutral-700 hover:bg-neutral-600 rounded-2xl text-xl font-bold transition-all transform hover:scale-105 flex items-center justify-center gap-3 shadow-lg border border-neutral-600 mt-2 text-neutral-200"
          >
            <BookOpen
              size={28}
              className="text-yellow-400"
            />

            게임 룰 & 튜토리얼 보기
          </button>
        </div>

        {
          showTutorial && (
            <TutorialModal
              onClose={() =>
                setShowTutorial(false)
              }
            />
          )
        }

        <Toast
          message={toast.msg}
          type={toast.type}
          onClose={() =>
            setToast({
              msg: '',
              type: ''
            })
          }
        />
      </div>
    );
  }

  /*
   * =========================================================
   * P2P 대기실
   * =========================================================
   */

  if (mode === 'p2p_lobby') {
    return (
      <div className="min-h-screen bg-neutral-900 text-white flex flex-col items-center justify-center p-4">

        <div className="bg-neutral-800 p-8 rounded-3xl shadow-2xl border border-neutral-700 max-w-md w-full">

          <h2 className="text-3xl font-bold mb-6 flex items-center gap-2 text-yellow-400">
            <Users />
            온라인 대기실
          </h2>
          
          <div className="mb-6">

            <label className="block text-neutral-400 text-sm font-bold mb-2">
              내 방 코드 (친구에게 공유):
            </label>

            <div className="flex bg-black rounded-lg p-1 border border-neutral-700">

              <input
                readOnly
                value={peerId}
                className="bg-transparent w-full p-2 outline-none text-green-400 font-mono text-xl text-center"
              />

              <button
                onClick={() => {
                  navigator.clipboard.writeText(
                    peerId
                  );

                  showToast(
                    "코드가 복사되었습니다!"
                  );
                }}
                className="p-2 bg-neutral-700 hover:bg-neutral-600 rounded text-white"
              >
                <Copy size={20} />
              </button>
            </div>
          </div>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-neutral-600"></div>

            <span className="flex-shrink-0 mx-4 text-neutral-400 text-sm">
              참가하기
            </span>

            <div className="flex-grow border-t border-neutral-600"></div>
          </div>

          <div className="mt-2 mb-6">

            <label className="block text-neutral-400 text-sm font-bold mb-2">
              친구 방 코드 입력:
            </label>

            <div className="flex gap-2">

              <input 
                type="text"
                placeholder="코드 입력..."
                value={remotePeerId}
                onChange={e =>
                  setRemotePeerId(
                    e.target.value
                  )
                }
                className="w-full bg-black border border-neutral-700 rounded-lg p-3 outline-none focus:border-indigo-500 font-mono text-white text-center uppercase"
              />

              <button
                onClick={connectToPeer}
                disabled={
                  !remotePeerId ||
                  opponentConnected
                }
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-neutral-700 rounded-lg font-bold transition-colors whitespace-nowrap"
              >
                입장
              </button>
            </div>
          </div>

          <div className="bg-neutral-900 p-4 rounded-2xl border border-neutral-700 flex flex-col items-center justify-center gap-3 mb-6">

            {opponentConnected ? (
              <div className="flex items-center gap-2 text-green-400 font-bold text-lg animate-pulse">
                <CheckCircle2 size={24} />
                상대방 접속 완료!
              </div>
            ) : (
              <div className="flex items-center gap-2 text-neutral-400 font-medium">
                <Hourglass
                  size={20}
                  className="animate-spin"
                />
                상대방의 입장을 기다리는 중...
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

            {!isHost &&
              opponentConnected && (
                <p className="text-yellow-400 font-bold text-sm text-center">
                  방장이 게임을 시작하기를 기다리고 있습니다...
                </p>
              )}
          </div>
          
          <button
            onClick={() => {
              setMode('menu');
              setPeerId('');
              setOpponentConnected(false);

              connRef.current?.close();
              connRef.current = null;

              setConn(null);

              if (peerRef.current) {
                try {
                  peerRef.current.destroy();
                } catch (e) {}
              }

              peerRef.current = null;
              setPeer(null);
            }}
            className="text-neutral-400 hover:text-white underline w-full text-center text-sm"
          >
            메뉴로 돌아가기
          </button>

        </div>

        <Toast
          message={toast.msg}
          type={toast.type}
          onClose={() =>
            setToast({
              msg: '',
              type: ''
            })
          }
        />
      </div>
    );
  }

  /*
   * =========================================================
   * 실제 게임 화면
   * =========================================================
   */

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100 font-sans flex flex-col">

      <header className="bg-neutral-800 p-4 shadow-md flex justify-between items-center border-b border-neutral-700">

        <h1
          className="text-2xl font-bold flex items-center gap-2 text-white cursor-pointer"
          onClick={() => {
            setMode('menu');
            setOpponentConnected(false);

            connRef.current?.close();
            connRef.current = null;

            setConn(null);

            if (peerRef.current) {
              try {
                peerRef.current.destroy();
              } catch (e) {}
            }

            peerRef.current = null;
            setPeer(null);
          }}
        >
          <Swords className="text-red-500" />

          Uno Chess

          {mode === 'p2p' && (
            <span className="text-xs bg-green-600 px-2 py-1 rounded ml-2">
              P2P 대기실 연동됨
            </span>
          )}

          {mode === 'local_pvp' && (
            <span className="text-xs bg-teal-600 px-2 py-1 rounded ml-2">
              로컬 2인용
            </span>
          )}
        </h1>

        <div className="flex gap-4 items-center">

          <button
            onClick={() =>
              setShowTutorial(true)
            }
            className="p-2 bg-neutral-700 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center gap-2 px-3"
          >
            <HelpCircle size={20} />

            <span className="hidden sm:inline font-bold">
              규칙 보기
            </span>
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
        
        <div className="w-full max-w-[650px] flex-shrink-0 flex flex-col gap-4">

          <div className={`p-4 rounded-xl border text-center font-black text-2xl tracking-wide shadow-lg ${
            gameOverMsg
              ? 'bg-red-900/50 border-red-500 text-red-400 animate-pulse'
              : 'bg-green-900/40 border-green-500 text-green-400'
          }`}>
            {getStatusMessage()}
          </div>

          <div className="bg-neutral-800 p-4 rounded-xl shadow-2xl border border-neutral-700">

            <Chessboard
              position={fen}
              onPieceDrop={onDrop}
              boardOrientation={boardOrientation}
              customDarkSquareStyle={{
                backgroundColor: '#475569'
              }}
              customLightSquareStyle={{
                backgroundColor: '#cbd5e1'
              }}
              animationDuration={200}
            />

          </div>
        </div>

        <div className="w-full max-w-[400px] flex flex-col gap-4">

          <div className="bg-neutral-800 p-6 rounded-xl border border-neutral-700 shadow-xl flex flex-col items-center flex-1 min-h-[500px]">

            <h2 className="text-xl font-bold mb-8 text-neutral-300 uppercase tracking-widest border-b border-neutral-700 pb-2 w-full text-center">
              UNO 덱 영역
            </h2>

            <div className="flex-1 flex flex-col items-center justify-center w-full relative">

              {!activeCard ? (
                <button
                  onClick={handleDrawCard}
                  disabled={
                    !!gameOverMsg ||
                    (mode === 'p2p' &&
                      unoTurnColor !== myColor) ||
                    activeCard
                  }
                  className="w-52 h-72 rounded-2xl bg-gradient-to-br from-red-600 via-yellow-500 to-blue-600 shadow-[0_0_40px_rgba(255,255,255,0.1)] border-4 border-white/20 hover:scale-105 transition-transform flex flex-col items-center justify-center"
                >
                  <div className="text-white text-5xl font-black italic transform -rotate-12">
                    UNO
                  </div>

                  <div className="text-white/80 text-sm font-bold mt-3">
                    CARD DECK
                  </div>

                  <div className="mt-6 text-white font-bold text-lg">
                    카드 뽑기
                  </div>
                </button>
              ) : (
                <div className={`w-52 h-72 rounded-2xl ${activeCard.color} shadow-2xl border-4 border-white/20 flex flex-col items-center justify-center text-white transform rotate-1`}>

                  <div className="text-4xl font-black mb-4 text-center px-3">
                    {activeCard.name}
                  </div>

                  {activeCard.type === 'number' && (
                    <div className="text-7xl font-black">
                      {activeCard.value}
                    </div>
                  )}

                  {activeCard.type === 'skip' && (
                    <SkipForward size={80} />
                  )}

                  {activeCard.type === 'reverse' && (
                    <RotateCcw size={80} />
                  )}

                  {activeCard.type === 'draw' && (
                    <div className="text-6xl font-black">
                      +{activeCard.value}
                    </div>
                  )}

                  {activeCard.type === 'wild' && (
                    <Undo2 size={80} />
                  )}

                  <div className="absolute -bottom-12 text-neutral-400 font-bold text-sm">
                    남은 이동:
                    <span className="text-yellow-400 text-xl ml-2">
                      {movesRemaining}
                    </span>
                  </div>
                </div>
              )}

            </div>

            <div className="w-full mt-8 text-center">

              <div className="text-neutral-400 text-sm mb-2">
                현재 턴
              </div>

              <div className={`text-2xl font-black ${
                unoTurnColor === 'w'
                  ? 'text-white'
                  : 'text-neutral-400'
              }`}>
                {unoTurnColor === 'w'
                  ? 'WHITE'
                  : 'BLACK'}
              </div>

              <div className="text-xs text-neutral-500 mt-2">
                {
                  mode === 'p2p'
                    ? `내 진영: ${
                        myColor === 'w'
                          ? 'WHITE'
                          : 'BLACK'
                      }`
                    : ''
                }
              </div>

            </div>
          </div>
        </div>
      </main>

      {showTutorial && (
        <TutorialModal
          onClose={() =>
            setShowTutorial(false)
          }
        />
      )}

      <Toast
        message={toast.msg}
        type={toast.type}
        onClose={() =>
          setToast({
            msg: '',
            type: ''
          })
        }
      />
    </div>
  );
}
