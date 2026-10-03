# UNO CHESS

React + Vite + Tailwind CSS + PeerJS 기반의 1:1 UNO CHESS 웹 게임입니다.

## 바로 실행

```bash
npm install
npm run dev
```

## 배포

이 폴더 전체를 GitHub에 올린 뒤 Vercel에서 저장소를 Import하면 됩니다.

- Framework: Vite가 자동 감지됨
- Build Command: `npm run build`
- Output Directory: `dist`

배포 후 친구는 생성된 HTTPS 주소만 열면 됩니다. Node.js나 VS Code를 친구 컴퓨터에 설치할 필요가 없습니다.

## 온라인 대전

온라인 대전은 PeerJS Cloud + WebRTC를 사용합니다. 방장이 표시되는 방 코드를 친구에게 보내고, 친구가 같은 페이지의 온라인 대전 메뉴에서 코드를 입력하면 됩니다.

참고: WebRTC는 네트워크 환경에 따라 P2P 연결이 제한될 수 있습니다. 일반적인 네트워크에서는 STUN을 통해 연결을 시도합니다.
