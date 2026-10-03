# UNO CHESS 배포

## Vercel에 올리기

1. 이 프로젝트 폴더를 GitHub 저장소에 업로드합니다.
2. Vercel에서 GitHub 저장소를 Import합니다.
3. Vite가 자동 감지됩니다.
4. 필요하면 다음 값만 확인합니다.
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`
5. Deploy를 누릅니다.
6. 생성된 HTTPS 주소를 친구에게 보내면 됩니다.

친구는 Node.js, npm, VS Code를 설치할 필요가 없습니다.

## 로컬 테스트

```bash
npm install
npm run dev
```

## 온라인 대전

방장이 온라인 대전에서 방 코드를 만든 뒤 친구에게 코드를 보내고, 친구가 같은 사이트의 온라인 대전 메뉴에서 코드를 입력합니다.

현재 온라인 대전은 PeerJS Cloud + WebRTC 방식입니다. 일부 학교/회사/공공망처럼 P2P 연결을 막는 네트워크에서는 연결이 제한될 수 있습니다.
