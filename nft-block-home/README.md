# BlockMaker

블록 캐릭터와 집을 커스터마이징하고 NFT로 민팅할 수 있는 웹 애플리케이션입니다.

## 설치 방법

1. 이 저장소를 클론합니다:
```bash
git clone https://github.com/Operating-system-and-system-software-G2/BlockMaker.git
cd BlockMaker
```

2. 필요한 패키지를 설치합니다:
```bash
npm install
```

3. 환경 변수 설정:
   - `.env.example` 파일을 복사하여 `.env` 파일을 생성합니다.
   - 해당 파일에 필요한 값들을 입력합니다.

## 환경 변수 설정

`.env` 파일에 다음과 같은 환경 변수를 설정해야 합니다:

```
REACT_APP_INFURA_PROJECT_ID=your_infura_project_id
REACT_APP_CONTRACT_ADDRESS=your_deployed_contract_address
REACT_APP_CHAIN_ID=1337 # 또는 사용하려는 네트워크 체인 ID
REACT_APP_PINATA_API_KEY=your_pinata_api_key
REACT_APP_PINATA_SECRET_API_KEY=your_pinata_secret_key
```

## 실행 방법

개발 모드로 앱을 실행하려면:

```bash
npm run start
```

웹 브라우저에서 [http://localhost:3000](http://localhost:3000)로 접속하여 앱을 확인할 수 있습니다.

## 기능

- 블록 캐릭터 및 집 커스터마이징
- 날씨 및 시간 변경
- 캐릭터 표정 변경
- 캐릭터 액세서리 추가
- MetaMask를 이용한 NFT 민팅
- 민팅된 NFT 지갑에서 확인

## 기술 스택

- React.js
- Three.js (3D 렌더링)
- Web3.js (이더리움 상호작용)
- IPFS (Pinata) - NFT 메타데이터 저장

## NFT 민팅하기

1. MetaMask 지갑이 필요합니다. 아직 설치하지 않았다면 [여기](https://metamask.io/download.html)에서 설치하세요.
2. MetaMask를 연결하고 원하는 네트워크(테스트넷 권장)를 선택합니다.
3. 테스트넷에서 작업하는 경우 테스트 ETH가 필요합니다. 테스트 ETH를 받을 수 있는 faucet이 있습니다.
4. 캐릭터와 집을 커스터마이징한 후 "민팅하기" 버튼을 클릭합니다.
5. MetaMask에서 트랜잭션을 승인합니다.
6. 민팅이 완료되면 MetaMask 지갑에서 NFT를 확인할 수 있습니다.

## 문제 해결

- **MetaMask 연결 오류**: 브라우저를 새로고침하거나 MetaMask를 재시작해 보세요.
- **민팅 실패**: 충분한 ETH가 있는지, 네트워크 상태가 좋은지 확인하세요.
- **NFT가 지갑에 보이지 않는 경우**: MetaMask에서 NFT를 수동으로 가져오기 해보세요.

## 라이선스

MIT License
