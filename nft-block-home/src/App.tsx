import React, { useState, useRef, useCallback } from 'react';
import { useWeb3 } from './context/Web3Context';
import { Web3Provider } from './context/Web3Context';
import { GameProvider } from './context/GameContext';
import { domToPng } from 'modern-screenshot';
import { uploadImageToIPFS, uploadMetadataToIPFS, PUBLIC_IPFS_GATEWAY, BACKUP_IPFS_GATEWAY, INFURA_IPFS_GATEWAY } from './utils/ipfs';
import { chatWithSlime, getRandomSlimeReaction, ChatMessage } from './utils/chatgpt';
import UnityGame from './components/UnityGame';
import './styles.css';

// 실제 App 컴포넌트
const AppContent: React.FC = () => {
  // 캐릭터 상태
  const [characterColor, setCharacterColor] = useState<'pastel-blue' | 'pastel-pink' | 'pastel-green' | 'pastel-yellow' | 'pastel-purple'>('pastel-blue');
  const [accessory, setAccessory] = useState<'none' | 'hat' | 'glasses' | 'necklace'>('none');
  const [accessoryColor, setAccessoryColor] = useState<'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange' | 'white' | 'black'>('red');
  const [characterStyle, setCharacterStyle] = useState<'normal' | 'slim' | 'chubby' | 'tall'>('normal');
  const [expression, setExpression] = useState<'happy' | 'sad' | 'angry' | 'surprised' | 'neutral'>('happy');
  
  // 레벨 상태
  const [level, setLevel] = useState<number>(1);
  const [experience, setExperience] = useState<number>(0); 
  const expNeededForNextLevel = 100; // 다음 레벨로 가기 위해 필요한 경험치
  const expProgress = (experience / expNeededForNextLevel) * 100; // 경험치 진행률 백분율
  
  // 작업 상태
  const [petCount, setPetCount] = useState<number>(0); // 쓰다듬기 횟수
  const [feedCount, setFeedCount] = useState<number>(0); // 먹이주기 횟수
  const [feed2Count, setFeed2Count] = useState<number>(0); // 특별 간식 주기 횟수
  const [feed3Count, setFeed3Count] = useState<number>(0); // 과일 주기 횟수
  const [feed4Count, setFeed4Count] = useState<number>(0); // 보너스 먹이 주기 횟수
  const maxTaskCount = 3; // 각 작업당 최대 횟수
  const [showExpGain, setShowExpGain] = useState<boolean>(false);
  const [expGainAmount, setExpGainAmount] = useState<number>(0);
  const [isPetting, setIsPetting] = useState<boolean>(false); // 쓰다듬기 애니메이션 상태
  const [isFeeding, setIsFeeding] = useState<boolean>(false); // 먹이주기 애니메이션 상태
  const [isFeeding2, setIsFeeding2] = useState<boolean>(false); // 특별 간식 애니메이션 상태
  const [isFeeding3, setIsFeeding3] = useState<boolean>(false); // 과일 주기 애니메이션 상태
  const [isFeeding4, setIsFeeding4] = useState<boolean>(false); // 보너스 먹이 애니메이션 상태
  const [showFood, setShowFood] = useState<boolean>(false); // 먹이 표시 상태
  const [showFood2, setShowFood2] = useState<boolean>(false); // 특별 간식 표시 상태
  const [showFood3, setShowFood3] = useState<boolean>(false); // 과일 표시 상태
  const [showFood4, setShowFood4] = useState<boolean>(false); // 보너스 먹이 표시 상태
  
  // 집 상태
  const [houseStyle, setHouseStyle] = useState<'modern' | 'classic' | 'cottage' | 'castle' | 'futuristic'>('modern');
  const [houseColor, setHouseColor] = useState<'brown' | 'white' | 'gray' | 'blue' | 'red' | 'green'>('white');
  const [decorations, setDecorations] = useState<string[]>([]);
  
  // 환경 상태
  const [timeOfDay, setTimeOfDay] = useState<'day' | 'sunset' | 'night'>('day');
  const [weather, setWeather] = useState<'clear' | 'rainy' | 'snowy' | 'foggy'>('clear');
  const [groundStyle, setGroundStyle] = useState<'grass' | 'dirt' | 'sand' | 'snow' | 'stone'>('grass');
  
  // 탭 상태
  const [activeTab, setActiveTab] = useState<'character' | 'house' | 'environment'>('character');
  
  // 모달 상태
  const [showCaptureModal, setShowCaptureModal] = useState<boolean>(false);
  
  // Web3 컨텍스트 연결
  const { account, connectWallet, isConnected, isConnecting, mintNFT } = useWeb3();
  
  // NFT 민팅 상태
  const [isMinting, setIsMinting] = useState<boolean>(false);
  const [mintStatus, setMintStatus] = useState<'idle' | 'capturing' | 'uploading' | 'minting' | 'success' | 'error'>('idle');
  
  // 민팅 결과 타입 정의
  type MintResult = {
    tokenId?: string;
    error?: string;
    metadataUrl?: string;
    imageUrl?: string;
    imageHttpUrl?: string;
  } | null;
  
  const [mintResult, setMintResult] = useState<MintResult>(null);
  
  // 게임 화면 참조
  const gameSceneRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null); // 채팅 입력창 ref 추가
  
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  
  // 게임 상태
  const [coins, setCoins] = useState<number>(100); // 초기 코인 100개
  const [ownedDecorations, setOwnedDecorations] = useState<string[]>(['none']); // 소유한 꾸미기 아이템 목록
  const [placedDecorations, setPlacedDecorations] = useState<{id: string, type: string, x: number, y: number}[]>([]); // 배치된 구조물들
  const [placementMode, setPlacementMode] = useState<string | null>(null); // 현재 배치 모드 (어떤 구조물을 배치할지)
  
  // 채팅 상태
  const [chatInput, setChatInput] = useState<string>('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [currentSlimeMessage, setCurrentSlimeMessage] = useState<string>('');
  const [showSlimeMessage, setShowSlimeMessage] = useState<boolean>(false);
  const [isSlimeTyping, setIsSlimeTyping] = useState<boolean>(false);
  
  // 이미지 캡처 함수
  const captureImage = async (): Promise<File> => {
    console.log('이미지 캡처 시작...');
    
    // Unity 캔버스가 로드되었는지 확인
    const unityCanvas = document.querySelector('#unity-canvas') as HTMLCanvasElement;
    
    if (unityCanvas && window.unityInstance) {
      try {
        console.log('Unity 캔버스에서 직접 캡처 시도...');
        
        // Unity 캔버스 크기 확인
        const rect = unityCanvas.getBoundingClientRect();
        console.log('Unity 캔버스 크기:', { width: rect.width, height: rect.height });
        
        // Unity에게 캡처 준비 신호 보내기 (최적의 슬라임 상태로 설정)
        if (window.unityInstance.SendMessage) {
          console.log('Unity에 캡처 준비 신호 전송...');
          window.unityInstance.SendMessage('GameManager', 'PrepareForCapture', '');
          window.unityInstance.SendMessage('GameManager', 'SetCharacterColor', characterColor);
          window.unityInstance.SendMessage('GameManager', 'SetAccessory', accessory);
          window.unityInstance.SendMessage('GameManager', 'SetLevel', level.toString());
          await new Promise(resolve => setTimeout(resolve, 1000)); // 1초 대기 (더 충분한 시간)
        }
        
        // Unity 캔버스에서 고해상도 이미지 데이터 추출
        const imgData = unityCanvas.toDataURL('image/png', 1.0);
        
        // 캡처된 이미지가 유효한지 확인 (빈 이미지가 아닌지)
        if (imgData && imgData.length > 2000 && !imgData.includes('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA')) { // 빈 이미지 체크 강화
          console.log('Unity 캔버스에서 유효한 이미지 캡처 완료');
          setCapturedPreview(imgData);
          
          const res = await fetch(imgData);
          const blob = await res.blob();
          const filename = `BlockCharacter_LV${level}_${characterColor}_Unity_${new Date().getTime()}.png`;
          console.log('Unity 캔버스 캡처 완료:', filename, `크기: ${blob.size} bytes`);
          
          return new File([blob], filename, { type: 'image/png' });
        } else {
          console.warn('Unity 캔버스에서 유효하지 않은 이미지 데이터 (빈 이미지 또는 너무 작음), 폴백 실행');
          console.log('캡처된 데이터 크기:', imgData.length);
          throw new Error('Invalid Unity canvas data');
        }
        
      } catch (error) {
        console.warn('Unity 캔버스 직접 캡처 실패, 폴백 방법 시도:', error);
      }
    } else {
      console.warn('Unity 캔버스 또는 Unity 인스턴스를 찾을 수 없음');
    }
    
    // 폴백 1: WebGL 컨텍스트에서 직접 픽셀 데이터 추출 시도
    if (unityCanvas) {
      try {
        console.log('WebGL 컨텍스트에서 픽셀 데이터 추출 시도...');
        
        const gl = unityCanvas.getContext('webgl2') || unityCanvas.getContext('webgl');
        if (gl) {
          const width = unityCanvas.width;
          const height = unityCanvas.height;
          
          // 픽셀 데이터 읽기
          const pixels = new Uint8Array(width * height * 4);
          gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
          
          // 새 캔버스에 픽셀 데이터를 그리기
          const captureCanvas = document.createElement('canvas');
          captureCanvas.width = width;
          captureCanvas.height = height;
          const ctx = captureCanvas.getContext('2d');
          
          if (ctx) {
            const imageData = ctx.createImageData(width, height);
            
            // Y축 뒤집기 (WebGL은 Y축이 뒤집혀 있음)
            for (let y = 0; y < height; y++) {
              for (let x = 0; x < width; x++) {
                const srcIndex = ((height - y - 1) * width + x) * 4;
                const dstIndex = (y * width + x) * 4;
                
                imageData.data[dstIndex] = pixels[srcIndex];     // R
                imageData.data[dstIndex + 1] = pixels[srcIndex + 1]; // G
                imageData.data[dstIndex + 2] = pixels[srcIndex + 2]; // B
                imageData.data[dstIndex + 3] = pixels[srcIndex + 3]; // A
              }
            }
            
            ctx.putImageData(imageData, 0, 0);
            
            const imgData = captureCanvas.toDataURL('image/png', 1.0);
            if (imgData && imgData.length > 2000) {
              console.log('WebGL 픽셀 데이터 캡처 성공');
              setCapturedPreview(imgData);
              
              const res = await fetch(imgData);
              const blob = await res.blob();
              const filename = `BlockCharacter_LV${level}_${characterColor}_WebGL_${new Date().getTime()}.png`;
              console.log('WebGL 캡처 완료:', filename);
              
              return new File([blob], filename, { type: 'image/png' });
            }
          }
        }
      } catch (error) {
        console.warn('WebGL 픽셀 데이터 추출 실패:', error);
      }
    }
    
    // 폴백 2: 현재 슬라임 이미지를 가상으로 생성 (고품질 버전)
    try {
      console.log('슬라임 캐릭터 고품질 가상 이미지 생성 시도...');
      
      // 캔버스 생성 (더 큰 해상도)
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = 600;  // 해상도 증가
      canvas.height = 600;
      
      if (ctx) {
        // 배경 그라데이션 설정 (게임 환경과 유사하게)
        const gradient = ctx.createLinearGradient(0, 0, 0, 600);
        gradient.addColorStop(0, '#87CEEB'); // 하늘색
        gradient.addColorStop(1, '#98FB98'); // 연한 녹색
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 600, 600);
        
        // 슬라임 색상 매핑
        const colorMap: { [key: string]: string } = {
          'pastel-blue': '#a0d0f7',
          'pastel-pink': '#f9c0dd',
          'pastel-green': '#b5e8b5',
          'pastel-yellow': '#fcf5c7',
          'pastel-purple': '#d8c0f9'
        };
        
        const slimeColor = colorMap[characterColor] || '#a0d0f7';
        
        // 그림자 그리기
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.beginPath();
        ctx.ellipse(300, 500, 120, 30, 0, 0, 2 * Math.PI);
        ctx.fill();
        
        // 슬라임 몸체 그리기 (더 큰 크기)
        ctx.fillStyle = slimeColor;
        ctx.beginPath();
        ctx.ellipse(300, 420, 120, 90, 0, 0, 2 * Math.PI);
        ctx.fill();
        
        // 슬라임 하이라이트 (더 현실적으로)
        const highlightGradient = ctx.createRadialGradient(260, 380, 0, 260, 380, 60);
        highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
        highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = highlightGradient;
        ctx.beginPath();
        ctx.ellipse(260, 380, 50, 40, 0, 0, 2 * Math.PI);
        ctx.fill();
        
        // 눈 그리기 (더 큰 크기)
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(270, 390, 12, 0, 2 * Math.PI);
        ctx.arc(330, 390, 12, 0, 2 * Math.PI);
        ctx.fill();
        
        // 눈 하이라이트
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(275, 385, 5, 0, 2 * Math.PI);
        ctx.arc(335, 385, 5, 0, 2 * Math.PI);
        ctx.fill();
        
        // 입 그리기 (더 큰 크기)
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(300, 425, 20, 0, Math.PI);
        ctx.stroke();
        
        // 레벨에 따른 왕관 그리기 (더 정교하게)
        if (level >= 1) {
          const crownColors = {
            1: '#CD7F32', // 동색
            2: '#C0C0C0', // 은색
            3: '#FFD700'  // 금색
          };
          const crownColor = level >= 3 ? crownColors[3] : level >= 2 ? crownColors[2] : crownColors[1];
          
          // 왕관 본체
          ctx.fillStyle = crownColor;
          ctx.beginPath();
          ctx.moveTo(240, 300);
          ctx.lineTo(270, 260);
          ctx.lineTo(300, 280);
          ctx.lineTo(330, 260);
          ctx.lineTo(360, 300);
          ctx.lineTo(300, 330);
          ctx.closePath();
          ctx.fill();
          
          // 왕관 하이라이트
          ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
          ctx.beginPath();
          ctx.moveTo(250, 290);
          ctx.lineTo(270, 270);
          ctx.lineTo(290, 280);
          ctx.lineTo(280, 300);
          ctx.closePath();
          ctx.fill();
          
          // 보석 추가 (레벨 3 이상일 때)
          if (level >= 3) {
            ctx.fillStyle = '#FF0000';
            ctx.beginPath();
            ctx.arc(300, 285, 8, 0, 2 * Math.PI);
            ctx.fill();
            
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.beginPath();
            ctx.arc(298, 282, 3, 0, 2 * Math.PI);
            ctx.fill();
          }
        }
        
        // 액세서리 그리기 (더 정교하게)
        if (accessory && accessory !== 'none') {
          switch (accessory) {
            case 'hat':
              // 모자 그리기
              ctx.fillStyle = '#8B4513';
              ctx.fillRect(255, 270, 90, 15);
              ctx.fillRect(275, 250, 50, 25);
              // 모자 테두리
              ctx.strokeStyle = '#654321';
              ctx.lineWidth = 2;
              ctx.strokeRect(255, 270, 90, 15);
              ctx.strokeRect(275, 250, 50, 25);
              break;
              
            case 'glasses':
              // 안경 그리기
              ctx.strokeStyle = '#000000';
              ctx.lineWidth = 3;
              ctx.strokeRect(245, 380, 30, 20);
              ctx.strokeRect(325, 380, 30, 20);
              // 다리
              ctx.beginPath();
              ctx.moveTo(275, 390);
              ctx.lineTo(325, 390);
              ctx.stroke();
              // 안경 반사
              ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
              ctx.fillRect(250, 385, 20, 10);
              ctx.fillRect(330, 385, 20, 10);
              break;
          }
        }
        
        // 레벨과 정보 텍스트 추가 (더 큰 폰트)
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 32px Arial';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 4;
        ctx.strokeText(`LV.${level}`, 30, 60);
        ctx.fillText(`LV.${level}`, 30, 60);
        
        // 캐릭터 색상 텍스트
        ctx.font = 'bold 24px Arial';
        ctx.strokeText(`Color: ${characterColor}`, 30, 100);
        ctx.fillText(`Color: ${characterColor}`, 30, 100);
        
        // 타임스탬프 추가
        const timestamp = new Date().toLocaleString();
        ctx.font = '16px Arial';
        ctx.strokeText(`Captured: ${timestamp}`, 30, 140);
        ctx.fillText(`Captured: ${timestamp}`, 30, 140);
        
        const imgData = canvas.toDataURL('image/png', 1.0);
        setCapturedPreview(imgData);
        
        const res = await fetch(imgData);
        const blob = await res.blob();
        const filename = `SlimeCharacter_LV${level}_${characterColor}_Generated_${new Date().getTime()}.png`;
        console.log('고품질 가상 슬라임 이미지 생성 완료:', filename, `크기: ${blob.size} bytes`);
        
        return new File([blob], filename, { type: 'image/png' });
      }
    } catch (error) {
      console.error('가상 이미지 생성 실패:', error);
    }
    
    // 폴백 3: html2canvas를 사용한 캡처 (최후의 수단)
    console.log('html2canvas로 캡처 시도...');
    if (!gameSceneRef.current) {
      throw new Error("게임 화면을 찾을 수 없습니다.");
    }
    
    // 설정 수정: 고품질, 스케일 2배, 스크롤 없이 전체 캡처
    const canvas = await domToPng(gameSceneRef.current, {
      scale: 2,
      backgroundColor: null
    });
    
    // domToPng는 이미 data URL을 반환하므로 직접 사용
    setCapturedPreview(canvas);
    
    const res = await fetch(canvas);
    const blob = await res.blob();
    const filename = `BlockCharacter_html2canvas_${new Date().getTime()}.png`;
    console.log('html2canvas 캡처 완료:', filename);
    
    return new File([blob], filename, { type: 'image/png' });
  };
  
  // 색상 옵션 배열
  const characterColors = ['pastel-blue', 'pastel-pink', 'pastel-green', 'pastel-yellow', 'pastel-purple'];
  const houseColors = ['brown', 'white', 'gray', 'blue', 'red', 'green'];
  const accessoryTypes = ['none', 'hat', 'glasses', 'necklace'];
  const houseStyles = ['modern', 'classic', 'cottage', 'castle', 'futuristic'];
  const decorationOptions = ['garden', 'fence', 'pool', 'trees', 'flowers'];
  const characterStyles = ['normal', 'slim', 'chubby', 'tall'];
  const expressionTypes = ['happy', 'sad', 'angry', 'surprised', 'neutral'];
  const timeOptions = ['day', 'sunset', 'night'];
  const weatherOptions = ['clear', 'rainy', 'snowy', 'foggy'];
  
  // 장식품 토글 핸들러
  const toggleDecoration = (decoration: string) => {
    if (decorations.includes(decoration)) {
      setDecorations(decorations.filter(d => d !== decoration));
    } else {
      setDecorations([...decorations, decoration]);
    }
  };
  
  // NFT 민팅 핸들러
  const handleMintNFT = async () => {
    if (!isConnected) {
      try {
        await connectWallet();
      } catch (error) {
        console.error("지갑 연결 오류:", error);
        return;
      }
    }

    try {
      setIsMinting(true);
      setMintStatus('capturing');
      
      // 이미지가 이미 캡처되어 있는지 확인
      let imgFile: File;
      if (capturedPreview) {
        // 이미 캡처된 이미지가 있는 경우, 그것을 사용
        console.log('이미 캡처된 이미지를 사용합니다.');
        const res = await fetch(capturedPreview);
        const blob = await res.blob();
        imgFile = new File([blob], `BlockCharacter_${new Date().getTime()}.png`, { type: 'image/png' });
      } else {
        // 새로 캡처
        console.log('새로 이미지를 캡처합니다.');
        imgFile = await captureImage();
      }

      // IPFS에 이미지 업로드
      setMintStatus('uploading');
      console.log('IPFS에 이미지 업로드 시작 (App.tsx)');
      
      // 파일 크기 확인 및 경고
      if (imgFile.size > 500 * 1024) {
        console.warn(`이미지 크기(${Math.round(imgFile.size/1024)}KB)가 500KB를 초과합니다. 표시 문제가 발생할 수 있습니다.`);
      }
      
      // 이미지 업로드
      const imageIpfsUrl = await uploadImageToIPFS(imgFile);
      console.log('이미지 업로드 완료, IPFS URL:', imageIpfsUrl);
      
      // 이미지 URL 확인 - ipfs:// 형식이어야 함
      if (!imageIpfsUrl.startsWith('ipfs://')) {
        console.error('이미지 URL이 ipfs:// 형식이 아닙니다:', imageIpfsUrl);
        throw new Error('이미지 URL 형식이 올바르지 않습니다.');
      }
      
      // 이미지 해시 추출
      const imageHash = imageIpfsUrl.replace('ipfs://', '');
      console.log('이미지 해시:', imageHash);
      
      // HTTP URL로 변환 (MetaMask 호환성을 위해)
      const imageHttpUrl = `${PUBLIC_IPFS_GATEWAY}${imageHash}`;
      console.log('HTTP 이미지 URL:', imageHttpUrl);
      
      // 백업 URL 준비
      const imageBackupUrl = `${BACKUP_IPFS_GATEWAY}${imageHash}`;
      const imageInfuraUrl = `${INFURA_IPFS_GATEWAY}${imageHash}`;
      
      // 이미지가 실제로 접근 가능한지 바로 확인 (디버깅용)
      try {
        console.log('이미지 접근성 검증 중...');
        const checkResponse = await fetch(imageHttpUrl, { method: 'HEAD' });
        if (checkResponse.ok) {
          console.log('✅ 이미지가 게이트웨이에서 즉시 접근 가능함:', imageHttpUrl);
        } else {
          console.warn(`⚠️ 이미지가 게이트웨이에서 접근할 수 없음 (상태: ${checkResponse.status})`);
          
          // 백업 게이트웨이 시도
          try {
            const backupResponse = await fetch(imageBackupUrl, { method: 'HEAD' });
            if (backupResponse.ok) {
              console.log('✅ 백업 게이트웨이에서 이미지 접근 가능:', imageBackupUrl);
            } else {
              console.warn('⚠️ 백업 게이트웨이에서도 이미지 접근 불가');
            }
          } catch (err) {
            console.warn('백업 게이트웨이 접근 시도 중 오류:', err);
          }
        }
      } catch (err) {
        console.warn('이미지 접근성 검증 중 오류:', err);
      }
      
      // 캐릭터와 집 속성을 메타데이터로 구성 - MetaMask 호환 형식으로 단순화
      const characterName = `슬라임 캐릭터 #${Math.floor(Math.random() * 10000)}`;
      
      // NFT 표준 메타데이터 형식 사용 - 슬라임 캐릭터에 맞게 간소화
      const metadata = {
        name: characterName, 
        description: `${characterName}은(는) 귀여운 슬라임 NFT 캐릭터입니다. 캐릭터 색상: ${characterColor}`,
        image: imageIpfsUrl,      // 표준 형식 (ipfs://)
        attributes: [
          { trait_type: '캐릭터 색상', value: characterColor },
          { trait_type: '레벨', value: level }
        ]
      };
      
      console.log('메타데이터 생성 완료:', JSON.stringify(metadata, null, 2));
      
      // IPFS에 메타데이터 업로드
      console.log('메타데이터 업로드 시작 (App.tsx)');
      const metadataUrl = await uploadMetadataToIPFS(
        metadata.name,
        metadata.description,
        imageIpfsUrl,
        metadata.attributes
      );
      console.log('메타데이터 업로드 완료, URL:', metadataUrl);
      
      // 이미지와 메타데이터 URL 확인 로깅
      console.log('최종 이미지 IPFS URL:', imageIpfsUrl);
      console.log('최종 이미지 HTTP URL:', imageHttpUrl);
      console.log('최종 메타데이터 IPFS URL:', metadataUrl);
      
      // 메타데이터 수동 확인 - 게이트웨이 URL을 통해 메타데이터 내용 검증
      try {
        const metadataHttpUrl = metadataUrl.replace('ipfs://', PUBLIC_IPFS_GATEWAY);
        console.log('메타데이터 HTTP URL로 내용 확인 중:', metadataHttpUrl);
        
        const metadataResponse = await fetch(metadataHttpUrl);
        if (metadataResponse.ok) {
          const metadataContent = await metadataResponse.json();
          console.log('메타데이터 내용 확인:', metadataContent);
          
          // 이미지 URL 확인
          if (!metadataContent.image || !metadataContent.image.includes(imageHash)) {
            console.warn('메타데이터의 이미지 URL이 원본과 다릅니다.', {
              imageHash,
              metadataImage: metadataContent.image
            });
          } else {
            console.log('메타데이터의 이미지 URL 확인:', metadataContent.image);
          }
        }
      } catch (err) {
        console.warn('메타데이터 내용 확인 중 오류 (무시됨):', err);
      }
      
      // NFT 민팅
      setMintStatus('minting');
      console.log('NFT 민팅 시작, 메타데이터 URL:', metadataUrl);
      
      // 메타데이터 URL이 ipfs:// 형식인지 확인
      if (!metadataUrl.startsWith('ipfs://')) {
        console.error('메타데이터 URL이 ipfs:// 형식이 아닙니다:', metadataUrl);
        throw new Error('메타데이터 URL 형식이 올바르지 않습니다.');
      }
      
      const tokenId = await mintNFT(metadataUrl);
      
      if (tokenId) {
        console.log('NFT 민팅 성공, 토큰 ID:', tokenId);
        setMintStatus('success');
        // 문자열로 변환하여 저장
        setMintResult({ 
          tokenId: String(tokenId),
          metadataUrl: metadataUrl,
          imageUrl: imageIpfsUrl,
          imageHttpUrl: imageHttpUrl  // HTTP URL도 저장
        });
        
        // 추가 확인 과정: 민팅된 이미지가 실제로 게이트웨이에서 접근 가능한지 확인
        setTimeout(async () => {
          try {
            // 이미지 접근 확인
            const response = await fetch(imageHttpUrl, { method: 'HEAD' });
            
            if (response.ok) {
              console.log('✅ 민팅된 이미지가 게이트웨이에서 확인되었습니다:', imageHttpUrl);
            } else {
              console.warn('⚠️ 민팅된 이미지가 아직 게이트웨이에서 확인되지 않습니다. 전파 중일 수 있습니다.');
              
              // 백업 게이트웨이 시도
              try {
                const backupResponse = await fetch(imageBackupUrl, { method: 'HEAD' });
                if (backupResponse.ok) {
                  console.log('✅ 민팅된 이미지가 백업 게이트웨이에서 확인되었습니다:', imageBackupUrl);
                }
              } catch (err) {
                console.warn('백업 게이트웨이 확인 실패:', err);
              }
            }
          } catch (err) {
            console.warn('이미지 확인 중 오류 발생:', err);
          }
        }, 5000); // 5초 후 확인
      } else {
        throw new Error("NFT 민팅에 실패했습니다.");
      }
      
    } catch (error: any) {
      console.error("NFT 민팅 오류:", error);
      setMintStatus('error');
      setMintResult({ error: error.message || "알 수 없는 오류가 발생했습니다." });
    } finally {
      setIsMinting(false);
    }
  };
  
  // 민팅 진행 상태 메시지
  const getMintStatusMessage = () => {
    switch(mintStatus) {
      case 'capturing': return '캐릭터 이미지 캡처 중...';
      case 'uploading': return 'IPFS에 이미지 업로드 중...';
      case 'minting': return 'NFT 민팅 중... (MetaMask 확인 필요)';
      case 'success': return '성공! NFT가 민팅되었습니다!';
      case 'error': return '오류 발생: ' + (mintResult?.error || '알 수 없는 오류');
      default: return '';
    }
  };
  
  // 직접 화면 캡처 핸들러
  const handleCaptureNow = async () => {
    try {
      // 캡처 함수 실행
      const imgFile = await captureImage();
      
      // 이미지 URL 생성 및 미리보기 설정
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target && e.target.result) {
          setCapturedPreview(e.target.result as string);
        }
      };
      reader.readAsDataURL(imgFile);
    } catch (error) {
      console.error('화면 캡처 오류:', error);
      alert('화면 캡처 중 오류가 발생했습니다.');
    }
  };
  
  // 환경 설정에 따른 속성 가져오기
  const getEnvironmentProps = () => {
    switch(timeOfDay) {
      case 'day': 
        return { 
          backgroundColor: '#87CEEB' 
        };
      case 'sunset': 
        return { 
          backgroundColor: '#FFA07A' 
        };
      case 'night': 
        return { 
          backgroundColor: '#191970' 
        };
      default: 
        return { 
          backgroundColor: '#87CEEB' 
        };
    }
  };

  const environmentProps = getEnvironmentProps();
  
  // 경험치 획득 함수
  const gainExperience = (amount: number) => {
    const newExperience = experience + amount;
    
    console.log(`경험치 획득: +${amount}, 현재: ${experience} → 새로운: ${newExperience}, 필요: ${expNeededForNextLevel}`);
    
    // 경험치 획득 애니메이션 표시
    setExpGainAmount(amount);
    setShowExpGain(true);
    setTimeout(() => {
      setShowExpGain(false);
    }, 1500);
    
    if (newExperience >= expNeededForNextLevel) {
      // 레벨업
      const newLevel = level + 1;
      console.log(`🎉 레벨업 발생! ${level} → ${newLevel}`);
      setLevel(newLevel);
      setExperience(newExperience - expNeededForNextLevel);
      
      // 레벨업 시 슬라임 기쁨 표현 추가
      triggerSlimeReaction('happy');
      
      // 레벨업 시 Unity 터치를 활성화
      console.log('Unity 터치 활성화 중...');
      setTimeout(() => {
        // 방법 1: Unity 캔버스 클릭
        if ((window as any).triggerUnityClick) {
          console.log('Unity 클릭 트리거 실행 시작!');
          (window as any).triggerUnityClick();
          console.log(`레벨 ${newLevel} 달성! Unity 자동 클릭 실행 완료`);
        } else {
          console.warn('triggerUnityClick 함수를 찾을 수 없습니다!');
        }
        
        // 방법 2: Unity 터치 활성화
        if ((window as any).enableUnityTouch) {
          (window as any).enableUnityTouch(3000); // 3초간 활성화
          console.log('Unity 터치 3초간 활성화');
        }
        
        // 방법 3: Unity에 직접 레벨업 애니메이션 트리거 메시지 전송
        if (window.unityInstance) {
          try {
            window.unityInstance.SendMessage('GameManager', 'TriggerLevelUpAnimation', newLevel.toString());
            console.log('Unity에 레벨업 애니메이션 트리거 메시지 전송 완료');
          } catch (error) {
            console.warn('Unity 레벨업 애니메이션 메시지 전송 실패:', error);
          }
        }
      }, 500); // 0.5초 후 터치 활성화
    } else {
      setExperience(newExperience);
      console.log('레벨업 없음, 경험치만 증가');
    }
  };
  
  // 슬라임 쓰다듬기 함수
  const petSlime = () => {
    if (petCount < maxTaskCount && !isPetting) {
      // 쓰다듬기 애니메이션 시작
      setIsPetting(true);
      
      // 애니메이션 종료 후 카운터 증가
      setTimeout(() => {
        const newPetCount = petCount + 1;
        setPetCount(newPetCount);
        
        // 애니메이션 상태 초기화
        setIsPetting(false);
        
        // 미션 완료시에만 경험치 획득
        if (newPetCount === maxTaskCount) {
          gainExperience(60); // 쓰다듬기 미션 완료시 60 경험치 획득
          setCoins(coins + 20); // 미션 완료 보상으로 코인 20개 지급
        }
      }, 300);
    }
  };
  
  // 먹이주기 함수
  const feedSlime = () => {
    if (feedCount < maxTaskCount && !isFeeding) {
      // 먹이 표시
      setShowFood(true);
      
      // 슬라임 반응 (먹이를 받을 때)
      triggerSlimeReaction('excited');
      
      // 먹이주기 애니메이션 시작
      setTimeout(() => {
        setIsFeeding(true);
        setShowFood(false);
        
        // 애니메이션 종료 후 카운터 증가
        setTimeout(() => {
          const newFeedCount = feedCount + 1;
          setFeedCount(newFeedCount);
          
          // 애니메이션 상태 초기화
          setIsFeeding(false);
          
          // 미션 완료시에만 경험치 획득
          if (newFeedCount === maxTaskCount) {
            gainExperience(90); // 먹이주기 미션 완료시 90 경험치 획득
            setCoins(coins + 30); // 미션 완료 보상으로 코인 30개 지급
            triggerSlimeReaction('happy'); // 미션 완료 기쁨 표현
          }
        }, 800);
      }, 500);
    }
  };

  // 특별 간식 주기 함수
  const feedSlime2 = () => {
    if (feed2Count < maxTaskCount && !isFeeding2) {
      // 특별 간식 표시
      setShowFood2(true);
      
      // 슬라임 반응 (특별 간식을 받을 때)
      triggerSlimeReaction('excited');
      
      // 특별 간식 주기 애니메이션 시작
      setTimeout(() => {
        setIsFeeding2(true);
        setShowFood2(false);
        
        // 애니메이션 종료 후 카운터 증가
        setTimeout(() => {
          const newFeed2Count = feed2Count + 1;
          setFeed2Count(newFeed2Count);
          
          // 애니메이션 상태 초기화
          setIsFeeding2(false);
          
          // 미션 완료시에만 경험치 획득
          if (newFeed2Count === maxTaskCount) {
            gainExperience(100); // 특별 간식 미션 완료시 100 경험치 획득
            setCoins(coins + 40); // 미션 완료 보상으로 코인 40개 지급
            triggerSlimeReaction('happy'); // 미션 완료 기쁨 표현
          }
        }, 800);
      }, 500);
    }
  };

  // 과일 주기 함수
  const feedSlime3 = () => {
    if (feed3Count < maxTaskCount && !isFeeding3) {
      // 과일 표시
      setShowFood3(true);
      
      // 슬라임 반응 (과일을 받을 때)
      triggerSlimeReaction('excited');
      
      // 과일 주기 애니메이션 시작
      setTimeout(() => {
        setIsFeeding3(true);
        setShowFood3(false);
        
        // 애니메이션 종료 후 카운터 증가
        setTimeout(() => {
          const newFeed3Count = feed3Count + 1;
          setFeed3Count(newFeed3Count);
          
          // 애니메이션 상태 초기화
          setIsFeeding3(false);
          
          // 미션 완료시에만 경험치 획득
          if (newFeed3Count === maxTaskCount) {
            gainExperience(120); // 과일 주기 미션 완료시 120 경험치 획득
            setCoins(coins + 50); // 미션 완료 보상으로 코인 50개 지급
            triggerSlimeReaction('happy'); // 미션 완료 기쁨 표현
          }
        }, 800);
      }, 500);
    }
  };

  // 보너스 먹이 주기 함수
  const feedSlime4 = () => {
    if (feed4Count < maxTaskCount && !isFeeding4) {
      // 보너스 먹이 표시
      setShowFood4(true);
      
      // 슬라임 반응 (보너스 먹이를 받을 때)
      triggerSlimeReaction('excited');
      
      // 보너스 먹이 주기 애니메이션 시작
      setTimeout(() => {
        setIsFeeding4(true);
        setShowFood4(false);
        
        // 애니메이션 종료 후 카운터 증가
        setTimeout(() => {
          const newFeed4Count = feed4Count + 1;
          setFeed4Count(newFeed4Count);
          
          // 애니메이션 상태 초기화
          setIsFeeding4(false);
          
          // 미션 완료시에만 경험치 획득
          if (newFeed4Count === maxTaskCount) {
            gainExperience(150); // 보너스 먹이 미션 완료시 150 경험치 획득
            setCoins(coins + 60); // 미션 완료 보상으로 코인 60개 지급
            triggerSlimeReaction('happy'); // 미션 완료 기쁨 표현
          }
        }, 800);
      }, 500);
    }
  };

  // NFT 캡처 모달 열기
  const openCaptureModal = () => {
    setShowCaptureModal(true);
    // 모달을 열 때 바로 캡처 시도
    handleCaptureNow();
  };

  // NFT 캡처 모달 닫기
  const closeCaptureModal = () => {
    setShowCaptureModal(false);
    // 모달을 닫을 때 캡처 미리보기 초기화
    setCapturedPreview(null);
  };

  // 꾸미기 구매 함수
  const buyDecoration = (decorationName: string, price: number) => {
    if (coins >= price && !ownedDecorations.includes(decorationName)) {
      setCoins(coins - price);
      setOwnedDecorations([...ownedDecorations, decorationName]);
      alert(`${decorationName}을(를) 구매했습니다!`);
    } else if (ownedDecorations.includes(decorationName)) {
      alert('이미 소유한 꾸미기입니다!');
    } else {
      alert('코인이 부족합니다!');
    }
  };

  // 구조물 배치 함수
  const placeDecoration = (type: string, x: number, y: number) => {
    const newDecoration = {
      id: `${type}_${Date.now()}`,
      type: type,
      x: x,
      y: y
    };
    setPlacedDecorations([...placedDecorations, newDecoration]);
  };

  // 구조물 제거 함수
  const removeDecoration = (id: string) => {
    setPlacedDecorations(placedDecorations.filter(dec => dec.id !== id));
  };

  // 게임 씬 클릭 핸들러 (구조물 배치)
  const handleGameSceneClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (placementMode && ownedDecorations.includes(placementMode)) {
      const rect = event.currentTarget.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 100; // 퍼센트로 변환
      const y = ((event.clientY - rect.top) / rect.height) * 100;
      
      placeDecoration(placementMode, x, y);
      setPlacementMode(null); // 배치 후 모드 해제
    }
  };

  // 채팅 메시지 전송 함수 - 단순화
  const handleSendChatMessage = async () => {
    if (!chatInput.trim() || isSlimeTyping) return;
    
    const userMessage = chatInput.trim();
    setChatInput(''); // 입력창 비우기
    setIsSlimeTyping(true);
    
    // 사용자 메시지를 히스토리에 추가
    const newChatHistory = [...chatHistory, { role: 'user' as const, content: userMessage }];
    setChatHistory(newChatHistory);
    
    try {
      // ChatGPT API 호출
      const slimeResponse = await chatWithSlime(
        userMessage, 
        characterColor, 
        level, 
        newChatHistory.slice(-6) // 최근 6개 메시지만 컨텍스트로 전달
      );
      
      // 슬라임 응답을 히스토리에 추가
      setChatHistory(prev => [...prev, { role: 'assistant', content: slimeResponse }]);
      
      // 슬라임 메시지 화면에 표시
      displaySlimeMessage(slimeResponse);
      
    } catch (error) {
      console.error('채팅 오류:', error);
      const fallbackMessage = getRandomSlimeReaction('sleepy');
      displaySlimeMessage(fallbackMessage);
    } finally {
      setIsSlimeTyping(false);
    }
  };
  
  // 슬라임 메시지 화면에 표시하는 함수
  const displaySlimeMessage = (message: string) => {
    setCurrentSlimeMessage(message);
    setShowSlimeMessage(true);
    
    // 3초 후에 메시지 숨기기
    setTimeout(() => {
      setShowSlimeMessage(false);
    }, 3000);
  };
  
  // 채팅 입력 핸들러 - Controlled Component로 통일
  const handleChatInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setChatInput(e.target.value);
  };

  // 엔터키 핸들러 - 단순화
  const handleChatKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSendChatMessage();
    }
  };

  // 특정 행동에 따른 랜덤 슬라임 반응
  const triggerSlimeReaction = (emotion: 'happy' | 'excited' | 'sleepy' | 'hungry') => {
    if (!isSlimeTyping && !showSlimeMessage) {
      const reaction = getRandomSlimeReaction(emotion);
      displaySlimeMessage(reaction);
    }
  };



  return (
    <div className="game-page">
      <header className="game-header">
        <h1>Slime Raise</h1>
        <div className="currency-display">
          <img src="/coin.png" alt="Coin" className="currency-icon" />
          <span className="currency-value">{coins}</span>
        </div>
        {isConnected ? (
          <div className="wallet-info">
            <div className="wallet-indicator"></div>
            <span>{account?.slice(0, 6)}...{account?.slice(-4)}</span>
          </div>
        ) : (
          <button 
            className="connect-wallet-button"
            onClick={connectWallet}
            disabled={isConnecting}
          >
            {isConnecting ? '연결 중...' : '지갑 연결'}
          </button>
        )}
      </header>
      
      <main className="game-content">
        <div className="game-scene" ref={gameSceneRef} style={{ background: environmentProps.backgroundColor }} onClick={handleGameSceneClick}>
          <div className="unity-game-wrapper">
            <UnityGame
              onPetSlime={petSlime}
              onFeedSlime={feedSlime}
              characterColor={characterColor}
              timeOfDay={timeOfDay}
              isPetting={isPetting}
              isFeeding={isFeeding}
              showFood={showFood}
              level={level}
              accessory={accessory}
            />
            
            {/* 배치된 구조물들 표시 */}
            {placedDecorations.map((decoration) => (
              <div
                key={decoration.id}
                className={`placed-decoration ${decoration.type}-decoration`}
                style={{
                  position: 'absolute',
                  left: `${decoration.x}%`,
                  top: `${decoration.y}%`,
                  transform: 'translate(-50%, -50%)',
                  zIndex: 10,
                  cursor: 'pointer'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  removeDecoration(decoration.id);
                }}
                title="클릭하여 제거"
              />
            ))}
            
            {/* 배치 모드 안내 */}
            {placementMode && (
              <div className="placement-guide">
                <p>{placementMode === 'tree' ? '나무' : 
                     placementMode === 'flower' ? '꽃밭' :
                     placementMode === 'rock' ? '바위' :
                     placementMode === 'fountain' ? '분수대' : placementMode} 배치할 위치를 클릭하세요</p>
                <button onClick={() => setPlacementMode(null)}>취소</button>
              </div>
            )}
            
            {showExpGain && (
              <div className="exp-gain-animation">
                +{expGainAmount} EXP
              </div>
            )}
            
            {/* 슬라임 채팅 메시지 표시 (슬라임 상단 가운데) */}
            {showSlimeMessage && (
              <div className="slime-message-bubble">
                <div className="slime-message-content">
                  {currentSlimeMessage}
                </div>
                <div className="slime-message-tail"></div>
              </div>
            )}
            
            {/* 슬라임 입력 중 표시 */}
            {isSlimeTyping && (
              <div className="slime-typing-indicator">
                <div className="slime-typing-content">
                  <span>푸니...</span>
                  <div className="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            
            {/* 먹이주기 버튼들 */}
            <div className="feeding-buttons">
              <button 
                className="feed-button basic-feed" 
                onClick={feedSlime} 
                disabled={feedCount >= maxTaskCount || isFeeding}
              >
                🍖 기본 먹이
              </button>
              
              <button 
                className="feed-button special-feed" 
                onClick={feedSlime2} 
                disabled={feed2Count >= maxTaskCount || isFeeding2}
              >
                🧀 특별 간식
              </button>
              
              <button 
                className="feed-button fruit-feed" 
                onClick={feedSlime3} 
                disabled={feed3Count >= maxTaskCount || isFeeding3}
              >
                🍎 신선한 과일
              </button>
              
              <button 
                className="feed-button bonus-feed" 
                onClick={feedSlime4} 
                disabled={feed4Count >= maxTaskCount || isFeeding4}
              >
                ⭐ 보너스 먹이
              </button>
              

              
              
            </div>
          </div>
        </div>
        
        <div className="customization-container">
          <div className="customization-panel">
            <div className="character-level">LV.{level}</div>
            
            {/* 슬라임 채팅 인풋 (레벨바 상단) */}
            <div className="slime-chat-input-container">
              <div className="chat-input-wrapper">
                <input
                  type="text"
                  value={chatInput}
                  onChange={handleChatInputChange}
                  onKeyDown={handleChatKeyDown}
                  placeholder="슬라임과 대화해보세요..."
                  className="slime-chat-input"
                  disabled={isSlimeTyping}
                  maxLength={100}
                  autoComplete="off"
                  spellCheck={false}
                  style={{
                    userSelect: 'text',
                    WebkitUserSelect: 'text',
                    MozUserSelect: 'text',
                    msUserSelect: 'text',
                    pointerEvents: 'auto',
                    outline: 'none',
                    backgroundColor: 'white',
                    color: 'black',
                    border: '2px solid #000',
                    padding: '8px 12px',
                    fontSize: '14px'
                  }}
                />
                <button
                  onClick={handleSendChatMessage}
                  disabled={isSlimeTyping}
                  className="chat-send-button"
                >
                  {isSlimeTyping ? '💭' : '💬'}
                </button>
              </div>
            </div>
            
            <div className="level-progress-container">
              <div className="level-progress-bar" style={{ width: `${expProgress}%` }}></div>
            </div>
            
            <div className="tabs">
              <button
                className={`tab-button ${activeTab === 'character' ? 'active' : ''}`}
                onClick={() => setActiveTab('character')}
              >
                Misson
              </button>
              <button
                className={`tab-button ${activeTab === 'house' ? 'active' : ''}`}
                onClick={() => setActiveTab('house')}
              >
                custom
              </button>
              <button
                className={`tab-button ${activeTab === 'environment' ? 'active' : ''}`}
                onClick={() => setActiveTab('environment')}
              >
                shop
              </button>
            </div>
            
            <div className="tab-content">
              {activeTab === 'character' ? (
                <div className="character-customization">
                  {/* 미션들을 상태에 따라 정렬 - 완료되지 않은 미션을 먼저 표시 */}
    
                  
                  {feedCount < maxTaskCount && (
                    <div className="task-container">
                      <div className="task-content">
                        <div className="task-title">
                          <span className="task-icon task-icon-meat"></span>
                          🍖 기본 먹이 주기
                        </div>
                        <div className="task-progress">{feedCount} / {maxTaskCount}</div>
                      </div>
                    </div>
                  )}

                  {feed2Count < maxTaskCount && (
                    <div className="task-container">
                      <div className="task-content">
                        <div className="task-title">
                          <span className="task-icon task-icon-cheese"></span>
                          🧀 특별 간식 주기
                        </div>
                        <div className="task-progress">{feed2Count} / {maxTaskCount}</div>
                      </div>
                    </div>
                  )}

                  {feed3Count < maxTaskCount && (
                    <div className="task-container">
                      <div className="task-content">
                        <div className="task-title">
                          <span className="task-icon task-icon-fruit"></span>
                          🍎 신선한 과일 주기
                        </div>
                        <div className="task-progress">{feed3Count} / {maxTaskCount}</div>
                      </div>
                    </div>
                  )}

                  {feed4Count < maxTaskCount && (
                    <div className="task-container">
                      <div className="task-content">
                        <div className="task-title">
                          <span className="task-icon task-icon-star"></span>
                          ⭐ 보너스 먹이 주기
                        </div>
                        <div className="task-progress">{feed4Count} / {maxTaskCount}</div>
                      </div>
                    </div>
                  )}
                  
                  {/* 완료된 미션들 - 아래에 표시 */}
                  {petCount >= maxTaskCount && (
                    <div className="task-container completed">
                      <div className="task-content">
                        <div className="task-title">
                          <span className="task-icon task-icon-pet"></span>
                          슬라임 세 번 쓰다듬기
                        </div>
                        <div className="task-progress">{petCount} / {maxTaskCount}</div>
                        <div className="task-complete-badge">완료</div>
                      </div>
                    </div>
                  )}
                  
                  {feedCount >= maxTaskCount && (
                    <div className="task-container completed">
                      <div className="task-content">
                        <div className="task-title">
                          <span className="task-icon task-icon-meat"></span>
                          🍖 기본 먹이 주기
                        </div>
                        <div className="task-progress">{feedCount} / {maxTaskCount}</div>
                        <div className="task-complete-badge">완료</div>
                      </div>
                    </div>
                  )}

                  {feed2Count >= maxTaskCount && (
                    <div className="task-container completed">
                      <div className="task-content">
                        <div className="task-title">
                          <span className="task-icon task-icon-cheese"></span>
                          🧀 특별 간식 주기
                        </div>
                        <div className="task-progress">{feed2Count} / {maxTaskCount}</div>
                        <div className="task-complete-badge">완료</div>
                      </div>
                    </div>
                  )}

                  {feed3Count >= maxTaskCount && (
                    <div className="task-container completed">
                      <div className="task-content">
                        <div className="task-title">
                          <span className="task-icon task-icon-fruit"></span>
                          🍎 신선한 과일 주기
                        </div>
                        <div className="task-progress">{feed3Count} / {maxTaskCount}</div>
                        <div className="task-complete-badge">완료</div>
                      </div>
                    </div>
                  )}

                  {feed4Count >= maxTaskCount && (
                    <div className="task-container completed">
                      <div className="task-content">
                        <div className="task-title">
                          <span className="task-icon task-icon-star"></span>
                          ⭐ 보너스 먹이 주기
                        </div>
                        <div className="task-progress">{feed4Count} / {maxTaskCount}</div>
                        <div className="task-complete-badge">완료</div>
                      </div>
                    </div>
                  )}
                </div>
              ) : activeTab === 'house' ? (
                <div className="house-customization">
                  <div className="customization-section">
                    <h3>슬라임 색상</h3>
                    <div className="color-selection-container">
                      <div className="color-options">
                        {characterColors.map((color) => (
                          <div
                            key={color}
                            className={`color-option ${characterColor === color ? 'selected' : ''}`}
                            style={{ backgroundColor: color }}
                            onClick={() => setCharacterColor(color as any)}
                            title={color}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="customization-section">
                    <h3>꾸미기</h3>
                    <div className="accessory-selection">
                      {ownedDecorations.filter(dec => dec !== 'none').map((dec) => (
                        <button
                          key={dec}
                          className={`decoration-place-button ${placementMode === dec ? 'active' : ''}`}
                          onClick={() => setPlacementMode(placementMode === dec ? null : dec)}
                        >
                          {dec === 'tree' ? '🌳 나무 배치' :
                           dec === 'flower' ? '🌸 꽃밭 배치' :
                           dec === 'rock' ? '🪨 바위 배치' :
                           dec === 'fountain' ? '⛲ 분수대 배치' : `${dec} 배치`}
                        </button>
                      ))}
                      {ownedDecorations.length === 1 && (
                        <p className="no-decorations">상점에서 꾸미기를 구매하세요!</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="customization-section">    
                  </div>
                </div>
              ) : (
                <div className="environment-customization">
                  <h3 className="shop-title">꾸미기 상점</h3>
                  
                  <div className="shop-items">
                    <div className="shop-item">
                      <div className="shop-item-image tree-item"></div>
                      <div className="shop-item-info">
                        <div className="shop-item-name">나무</div>
                        <div className="shop-item-price">40 <img src="/coin.png" alt="코인" className="shop-coin-icon" /></div>
                      </div>
                      <button 
                        className={`shop-buy-button ${ownedDecorations.includes('tree') ? 'owned' : ''}`}
                        onClick={() => buyDecoration('tree', 40)}
                        disabled={ownedDecorations.includes('tree')}
                      >
                        {ownedDecorations.includes('tree') ? '보유중' : '구매하기'}
                      </button>
                    </div>
                    
                    <div className="shop-item">
                      <div className="shop-item-image flower-item"></div>
                      <div className="shop-item-info">
                        <div className="shop-item-name">꽃밭</div>
                        <div className="shop-item-price">25 <img src="/coin.png" alt="코인" className="shop-coin-icon" /></div>
                      </div>
                      <button 
                        className={`shop-buy-button ${ownedDecorations.includes('flower') ? 'owned' : ''}`}
                        onClick={() => buyDecoration('flower', 25)}
                        disabled={ownedDecorations.includes('flower')}
                      >
                        {ownedDecorations.includes('flower') ? '보유중' : '구매하기'}
                      </button>
                    </div>
                    
                    <div className="shop-item">
                      <div className="shop-item-image rock-item"></div>
                      <div className="shop-item-info">
                        <div className="shop-item-name">바위</div>
                        <div className="shop-item-price">30 <img src="/coin.png" alt="코인" className="shop-coin-icon" /></div>
                      </div>
                      <button 
                        className={`shop-buy-button ${ownedDecorations.includes('rock') ? 'owned' : ''}`}
                        onClick={() => buyDecoration('rock', 30)}
                        disabled={ownedDecorations.includes('rock')}
                      >
                        {ownedDecorations.includes('rock') ? '보유중' : '구매하기'}
                      </button>
                    </div>
                    
                    <div className="shop-item">
                      <div className="shop-item-image fountain-item"></div>
                      <div className="shop-item-info">
                        <div className="shop-item-name">분수대</div>
                        <div className="shop-item-price">80 <img src="/coin.png" alt="코인" className="shop-coin-icon" /></div>
                      </div>
                      <button 
                        className={`shop-buy-button ${ownedDecorations.includes('fountain') ? 'owned' : ''}`}
                        onClick={() => buyDecoration('fountain', 80)}
                        disabled={ownedDecorations.includes('fountain')}
                      >
                        {ownedDecorations.includes('fountain') ? '보유중' : '구매하기'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="panel-footer">
            <div className="button-container">
              <button 
                className="nft-button" 
                onClick={openCaptureModal} 
                disabled={level < 3}
              >
                {level >= 3 ? 'NFT 발행하기' : 'LV.3이 되면 NFT를 발행할 수 있습니다'}
              </button>
            </div>
          </div>
        </div>
        
        {/* 모달 수정: showCaptureModal 상태를 사용하도록 변경 */}
        {showCaptureModal && (
          <div className="custom-modal">
            <div className="modal-content">
              <button className="close-button" onClick={closeCaptureModal}>×</button>
                
              <div className="modal-header">
                <h2>NFT 발행</h2>
              </div>
              
              <div className="capture-modal">
                <div className="preview-container">
                  {capturedPreview ? (
                    <>
                      <img src={capturedPreview} alt="캡처된 NFT 이미지" className="preview-image" />
                      <p style={{color: 'white', fontSize: '14px', textAlign: 'center', margin: '10px 0'}}>
                        현재 슬라임 캐릭터 (LV.{level}, {characterColor})
                      </p>
                    </>
                  ) : (
                    <div className="loading-preview">
                      <div className="loading-spinner"></div>
                      <p>슬라임 캐릭터 이미지 생성 중...</p>
                      <p style={{fontSize: '12px', opacity: 0.8}}>Unity 게임에서 이미지를 추출하거나 현재 설정을 기반으로 이미지를 생성합니다.</p>
                    </div>
                  )}
                  
                  <div className="modal-actions">
                    <button className="capture-button" onClick={handleCaptureNow}>
                      다시 캡처하기
                    </button>
                    
                    <button 
                      className="mint-button" 
                      onClick={handleMintNFT} 
                      disabled={isMinting || !isConnected || !capturedPreview}
                    >
                      {isMinting ? (
                        <>
                          <div className="loading-spinner"></div>
                          {getMintStatusMessage()}
                        </>
                      ) : !isConnected ? (
                        '지갑 연결 필요'
                      ) : !capturedPreview ? (
                        '캡처 필요'
                      ) : (
                        `NFT 발행하기 (LV.${level} ${characterColor} 슬라임)`
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

// Web3 Provider와 함께 App 렌더링
const App: React.FC = () => {
  return (
    <Web3Provider>
      <GameProvider>
        <div className="app">
        <AppContent />
        </div>
      </GameProvider>
    </Web3Provider>
  );
};

export default App; 