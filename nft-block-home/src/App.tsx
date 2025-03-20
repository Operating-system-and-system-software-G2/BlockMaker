import React, { useState, useRef, useCallback } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import BlockCharacter from './components/BlockCharacter';
import BlockHouse from './components/BlockHouse';
import { useWeb3 } from './context/Web3Context';
import { Web3Provider } from './context/Web3Context';
import { GameProvider } from './context/GameContext';
import html2canvas from 'html2canvas';
import { uploadImageToIPFS, uploadMetadataToIPFS, PUBLIC_IPFS_GATEWAY, BACKUP_IPFS_GATEWAY, INFURA_IPFS_GATEWAY } from './utils/ipfs';
import { Decoration } from './models/House';
import { RainEffect, SnowEffect, FogEffect } from './components/EnvironmentEffects';
import Ground from './components/Ground';
import './styles.css';

// Three.js 캔버스 캡처를 위한 헬퍼 컴포넌트
interface SceneCaptureProps {
  onCaptureRef: (refs: { gl: THREE.WebGLRenderer; scene: THREE.Scene; camera: THREE.Camera }) => void;
}

const SceneCapture: React.FC<SceneCaptureProps> = ({ onCaptureRef }) => {
  const { gl, scene, camera } = useThree();
  
  React.useEffect(() => {
    // gl, scene, camera 참조를 상위 컴포넌트에 전달
    onCaptureRef({ gl, scene, camera });
  }, [gl, scene, camera, onCaptureRef]);
  
  return null;
};

// 실제 App 컴포넌트
const AppContent: React.FC = () => {
  // 캐릭터 상태
  const [characterColor, setCharacterColor] = useState<'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange' | 'white' | 'black'>('blue');
  const [accessory, setAccessory] = useState<'none' | 'hat' | 'glasses' | 'necklace'>('none');
  const [accessoryColor, setAccessoryColor] = useState<'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange' | 'white' | 'black'>('red');
  const [characterStyle, setCharacterStyle] = useState<'normal' | 'slim' | 'chubby' | 'tall'>('normal');
  const [expression, setExpression] = useState<'happy' | 'sad' | 'angry' | 'surprised' | 'neutral'>('happy');
  
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
  
  // Three.js 캡처 관련 상태
  interface ThreeCaptureRefs {
    gl: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.Camera;
  }
  
  const [threeCapture, setThreeCapture] = useState<ThreeCaptureRefs | null>(null);
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  
  // Three.js 캡처 참조 콜백
  const handleCaptureRef = useCallback((refs: ThreeCaptureRefs) => {
    setThreeCapture(refs);
  }, []);
  
  // 이미지 캡처 함수
  const captureImage = async (): Promise<File> => {
    console.log('이미지 캡처 시작...');
    
    // Three.js 렌더러를 통해 직접 캡처
    if (threeCapture && threeCapture.gl && threeCapture.scene && threeCapture.camera) {
      console.log('Three.js 렌더러로 직접 캡처 시도...');
      const { gl, scene, camera } = threeCapture;
      
      // 현재 카메라 상태를 그대로 사용 (사용자가 조정한 시점)
      console.log('현재 카메라 위치:', camera.position);
      console.log('현재 카메라 회전:', camera.rotation);
      
      // 원본 캔버스 비율 유지
      const originalSize = gl.getSize(new THREE.Vector2());
      const aspectRatio = originalSize.width / originalSize.height;
      
      // 고해상도 캡처를 위한 크기 설정 (비율 유지)
      const captureWidth = 1024;
      const captureHeight = Math.round(captureWidth / aspectRatio);
      
      // 임시로 크기 조정하여 고해상도 캡처
      gl.setSize(captureWidth, captureHeight);
      gl.render(scene, camera);
      
      // 캔버스에서 이미지 데이터 추출
      const imgData = gl.domElement.toDataURL('image/png');
      
      // 원래 크기로 복원하고 다시 렌더링
      gl.setSize(originalSize.width, originalSize.height);
      gl.render(scene, camera);
      
      // 캡처 미리보기 설정
      setCapturedPreview(imgData);
      
      // 이미지를 파일로 변환
      const res = await fetch(imgData);
      const blob = await res.blob();
      const filename = `BlockCharacter_${new Date().getTime()}.png`;
      console.log('Three.js 렌더러로 직접 캡처 완료:', filename);
      
      return new File([blob], filename, { type: 'image/png' });
    }
    
    // 폴백: html2canvas를 사용한 캡처
    console.log('html2canvas로 폴백 캡처 시도...');
    if (!gameSceneRef.current) {
      throw new Error("게임 화면을 찾을 수 없습니다.");
    }
    
    // 설정 수정: 고품질, 스케일 2배, 스크롤 없이 전체 캡처
    const canvas = await html2canvas(gameSceneRef.current, {
      useCORS: true, 
      allowTaint: true,
      scale: 2,
      backgroundColor: null,
      windowWidth: gameSceneRef.current.offsetWidth,
      windowHeight: gameSceneRef.current.offsetHeight
    });
    
    const imgData = canvas.toDataURL('image/png');
    setCapturedPreview(imgData);
    
    const res = await fetch(imgData);
    const blob = await res.blob();
    const filename = `BlockCharacter_${new Date().getTime()}.png`;
    console.log('html2canvas 캡처 완료:', filename);
    
    return new File([blob], filename, { type: 'image/png' });
  };
  
  // 색상 옵션 배열
  const characterColors = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'white', 'black'];
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
      
      // 캐릭터와 집 속성을 메타데이터로 구성 - MetaMask 호환 형식으로 단순화
      const characterName = `블록 캐릭터 #${Math.floor(Math.random() * 10000)}`;
      
      // MetaMask에서 이미지가 표시되도록 HTTP URL을 사용
      const metadata = {
        name: characterName, 
        description: `${characterName}은(는) ${houseStyle} 스타일의 집에 살고 있는 블록 캐릭터입니다.`,
        image: imageHttpUrl,      // HTTP URL 사용 (MetaMask 호환성)
        image_url: imageHttpUrl,  // OpenSea 호환성
        external_url: null,
        attributes: [
          { trait_type: '캐릭터 색상', value: characterColor },
          { trait_type: '액세서리', value: accessory },
          { trait_type: '액세서리 색상', value: accessoryColor },
          { trait_type: '집 스타일', value: houseStyle },
          { trait_type: '집 색상', value: houseColor },
          { trait_type: '장식 수', value: decorations.length }
        ],
        // 대체 URL 제공
        image_ipfs: imageIpfsUrl,
        image_ipfs_io: imageBackupUrl,
        image_infura: imageInfuraUrl
      };
      
      console.log('메타데이터 생성 완료:', JSON.stringify(metadata, null, 2));
      
      // IPFS에 메타데이터 업로드
      console.log('메타데이터 업로드 시작 (App.tsx)');
      const metadataUrl = await uploadMetadataToIPFS(
        metadata.name,
        metadata.description,
        imageHttpUrl, // HTTP URL 전달 (MetaMask 호환성 위해)
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
  
  // 캐릭터 표현식에 따른 표정 조절 (BlockCharacter 컴포넌트에 전달)
  const getExpressionProps = (expression: string) => {
    switch(expression) {
      case 'happy': return { eyes: 'round' as const, mouth: 'smile' as const };
      case 'sad': return { eyes: 'round' as const, mouth: 'frown' as const };
      case 'angry': return { eyes: 'narrow' as const, mouth: 'frown' as const };
      case 'surprised': return { eyes: 'wide' as const, mouth: 'o' as const };
      case 'neutral': return { eyes: 'normal' as const, mouth: 'straight' as const };
      default: return { eyes: 'round' as const, mouth: 'smile' as const };
    }
  };

  // 땅 스타일에 따른 색상 가져오기
  const getGroundColor = (style: string): string => {
    switch(style) {
      case 'grass': return '#567d46';  // 풀
      case 'dirt': return '#8b7355';   // 흙
      case 'sand': return '#c2b280';   // 모래
      case 'snow': return '#f8f8ff';   // 눈
      case 'stone': return '#a9a9a9';  // 돌
      default: return '#8b7355';
    }
  };

  // 환경 설정에 따른 속성 가져오기
  const getEnvironmentProps = () => {
    switch(timeOfDay) {
      case 'day': 
        return { 
          ambientLight: 0.7, 
          directionalLight: 1.0, 
          directionalLightColor: '#ffffff',
          backgroundColor: '#87CEEB' 
        };
      case 'sunset': 
        return { 
          ambientLight: 0.5, 
          directionalLight: 0.8, 
          directionalLightColor: '#FF7E00',
          backgroundColor: '#FFA07A' 
        };
      case 'night': 
        return { 
          ambientLight: 0.2, 
          directionalLight: 0.1, 
          directionalLightColor: '#3A3A9E',
          backgroundColor: '#191970' 
        };
      default: 
        return { 
          ambientLight: 0.7, 
          directionalLight: 1.0, 
          directionalLightColor: '#ffffff',
          backgroundColor: '#87CEEB' 
        };
    }
  };

  const environmentProps = getEnvironmentProps();
  const expressionProps = getExpressionProps(expression);
  // 땅 색상 계산
  const groundColor = getGroundColor(groundStyle);

  return (
    <div className="app">
      <header className="game-header">
        <h1>블록 캐릭터 홈</h1>
        {isConnected ? (
          <div className="wallet-info">
            <span>연결됨: {account?.slice(0, 6)}...{account?.slice(-4)}</span>
          </div>
        ) : (
          <button 
            className="connect-wallet-button"
            onClick={connectWallet}
            disabled={isConnecting}
          >
            {isConnecting ? '연결 중...' : 'MetaMask 연결'}
          </button>
        )}
      </header>
      
      <main className="game-content">
        <div className="game-scene" ref={gameSceneRef} style={{ background: environmentProps.backgroundColor }}>
          <Canvas ref={canvasRef}>
            {/* Three.js 캡처 컴포넌트 */}
            <SceneCapture onCaptureRef={handleCaptureRef} />
            
            {/* 조명 설정 - 환경에 따라 조절 */}
            <ambientLight intensity={environmentProps.ambientLight} />
            <directionalLight 
              position={[10, 10, 5]} 
              intensity={environmentProps.directionalLight} 
              color={environmentProps.directionalLightColor}
            />
            
            {/* 카메라 컨트롤 */}
            <OrbitControls 
              enableZoom={true} 
              enablePan={false}
              minDistance={3}
              maxDistance={10}
              maxPolarAngle={Math.PI / 2}
              target={[0, 0, 0]}
              makeDefault
            />
            
            {/* 기본 카메라 설정 - 정면에서 약간 위에서 보는 각도 */}
            <PerspectiveCamera 
              makeDefault 
              position={[0, 1, 5]} 
              fov={50}
            />
            
            {/* 환경 효과 추가 - 날씨에 따라 조절 */}
            {weather === 'rainy' && <RainEffect />}
            {weather === 'snowy' && <SnowEffect />}
            {weather === 'foggy' && <FogEffect />}
            
            {/* 바닥/땅 추가 - 스타일 적용 */}
            <Ground 
              color={groundStyle === 'snow' && timeOfDay === 'night' ? '#e6e6fa' : groundColor} 
              position={[0, -0.5, 0]} 
            />
            
            {/* 캐릭터 - 위치 조정 */}
            <BlockCharacter 
              color={characterColor}
              accessory={accessory}
              accessoryColor={accessoryColor}
              position={[2.5, 0, 0.5]}
              scale={0.8}
              rotation={[0, -Math.PI / 6, 0]}
              style={characterStyle}
              expression={expressionProps}
            />
            
            {/* 집 - 위치 조정 */}
            <BlockHouse 
              style={houseStyle}
              color={houseColor}
              size="medium"
              decorations={decorations as Decoration[]}
              position={[-2.5, 0, -1]}
              rotation={[0, Math.PI / 4, 0]}
            />
          </Canvas>
        </div>
        
        {/* 화면 캡처 UI를 캐릭터 화면 아래로 이동 */}
        <div className="capture-section">
          <div className="capture-controls">
            <button 
              className="capture-button" 
              onClick={handleCaptureNow}
            >
              현재 화면 캡처하기
            </button>
            <p className="capture-help">원하는 각도로 조절 후 캡처하세요</p>
          </div>
        
          {capturedPreview && (
            <div className="image-preview">
              <img src={capturedPreview} alt="캡처된 이미지" className="preview-image" />
            </div>
          )}
        </div>
        
        <div className="customization-container">
          <div className="customization-panel">
            <div className="tabs">
              <button
                className={`tab-button ${activeTab === 'character' ? 'active' : ''}`}
                onClick={() => setActiveTab('character')}
              >
                캐릭터 꾸미기
              </button>
              <button
                className={`tab-button ${activeTab === 'house' ? 'active' : ''}`}
                onClick={() => setActiveTab('house')}
              >
                집 꾸미기
              </button>
              <button
                className={`tab-button ${activeTab === 'environment' ? 'active' : ''}`}
                onClick={() => setActiveTab('environment')}
              >
                환경 설정
              </button>
            </div>
            
            <div className="tab-content">
              {activeTab === 'character' ? (
                <div className="character-customization">
                  <div className="customization-section">
                    <h3>캐릭터 스타일</h3>
                    <div className="style-options">
                      {characterStyles.map((style) => (
                        <button
                          key={style}
                          className={`style-option ${characterStyle === style ? 'selected' : ''}`}
                          onClick={() => setCharacterStyle(style as any)}
                        >
                          {style === 'normal' ? '기본형' : 
                           style === 'slim' ? '슬림형' : 
                           style === 'chubby' ? '통통형' : '키 큰형'}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="customization-section">
                    <h3>캐릭터 표정</h3>
                    <div className="expression-options">
                      {expressionTypes.map((expr) => (
                        <button
                          key={expr}
                          className={`expression-option ${expression === expr ? 'selected' : ''}`}
                          onClick={() => setExpression(expr as any)}
                          value={expr}
                        >
                          {expr === 'happy' ? '행복' : 
                           expr === 'sad' ? '슬픔' : 
                           expr === 'angry' ? '화남' :
                           expr === 'surprised' ? '놀람' : '무표정'}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="customization-section">
                    <h3>캐릭터 색상</h3>
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
                  
                  <div className="customization-section">
                    <h3>액세서리</h3>
                    <div className="accessory-options">
                      {accessoryTypes.map((type) => (
                        <button
                          key={type}
                          className={`accessory-option ${accessory === type ? 'selected' : ''}`}
                          onClick={() => setAccessory(type as any)}
                        >
                          {type === 'none' ? '없음' : 
                           type === 'hat' ? '모자' : 
                           type === 'glasses' ? '안경' : '목걸이'}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {accessory !== 'none' && (
                    <div className="customization-section">
                      <h3>액세서리 색상</h3>
                      <div className="color-options">
                        {characterColors.map((color) => (
                          <div
                            key={color}
                            className={`color-option ${accessoryColor === color ? 'selected' : ''}`}
                            style={{ backgroundColor: color }}
                            onClick={() => setAccessoryColor(color as any)}
                            title={color}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : activeTab === 'house' ? (
                <div className="house-customization">
                  <div className="customization-section">
                    <h3>집 스타일</h3>
                    <div className="style-options">
                      {houseStyles.map((style) => (
                        <button
                          key={style}
                          className={`style-option ${houseStyle === style ? 'selected' : ''}`}
                          onClick={() => setHouseStyle(style as any)}
                        >
                          {style === 'modern' ? '모던' : 
                           style === 'classic' ? '클래식' : 
                           style === 'cottage' ? '코티지' :
                           style === 'castle' ? '성' : '미래적'}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="customization-section">
                    <h3>집 색상</h3>
                    <div className="color-options">
                      {houseColors.map((color) => (
                        <div
                          key={color}
                          className={`color-option ${houseColor === color ? 'selected' : ''}`}
                          style={{ backgroundColor: color }}
                          onClick={() => setHouseColor(color as any)}
                          title={color}
                        />
                      ))}
                    </div>
                  </div>
                  
                  <div className="customization-section">
                    <h3>장식품</h3>
                    <div className="decoration-options">
                      {decorationOptions.map((decoration) => (
                        <label key={decoration} className="decoration-option">
                          <input
                            type="checkbox"
                            checked={decorations.includes(decoration)}
                            onChange={() => toggleDecoration(decoration)}
                          />
                          {decoration === 'garden' ? '정원' : 
                           decoration === 'fence' ? '울타리' : 
                           decoration === 'pool' ? '수영장' :
                           decoration === 'trees' ? '나무' : '꽃'}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="environment-customization">
                  <div className="customization-section">
                    <h3>시간대</h3>
                    <div className="time-options">
                      {timeOptions.map((time) => (
                        <button
                          key={time}
                          className={`time-option ${timeOfDay === time ? 'selected' : ''}`}
                          onClick={() => setTimeOfDay(time as any)}
                          value={time}
                        >
                          {time === 'day' ? '낮' : 
                           time === 'sunset' ? '노을' : '밤'}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="customization-section">
                    <h3>날씨</h3>
                    <div className="weather-options">
                      {weatherOptions.map((type) => (
                        <button
                          key={type}
                          className={`weather-option ${weather === type ? 'selected' : ''}`}
                          onClick={() => setWeather(type as any)}
                          value={type}
                        >
                          {type === 'clear' ? '맑음' : 
                           type === 'rainy' ? '비' : 
                           type === 'snowy' ? '눈' : '안개'}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* 땅 스타일 선택 추가 */}
                  <div className="customization-section">
                    <h3>땅 스타일</h3>
                    <div className="ground-options">
                      <button 
                        className={`ground-option ${groundStyle === 'grass' ? 'selected' : ''}`}
                        onClick={() => setGroundStyle('grass')}
                        value="grass"
                      >
                        잔디
                      </button>
                      <button 
                        className={`ground-option ${groundStyle === 'dirt' ? 'selected' : ''}`}
                        onClick={() => setGroundStyle('dirt')}
                        value="dirt"
                      >
                        흙
                      </button>
                      <button 
                        className={`ground-option ${groundStyle === 'sand' ? 'selected' : ''}`}
                        onClick={() => setGroundStyle('sand')}
                        value="sand"
                      >
                        모래
                      </button>
                      <button 
                        className={`ground-option ${groundStyle === 'snow' ? 'selected' : ''}`}
                        onClick={() => setGroundStyle('snow')}
                        value="snow"
                      >
                        눈
                      </button>
                      <button 
                        className={`ground-option ${groundStyle === 'stone' ? 'selected' : ''}`}
                        onClick={() => setGroundStyle('stone')}
                        value="stone"
                      >
                        돌
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="note">
          <p>
            캐릭터와 집을 원하는 대로 커스터마이징한 후, 
            MetaMask 지갑과 연결하여 NFT로 민팅할 수 있습니다.
          </p>
          
          <div className="minting-section">
            {mintStatus === 'success' && mintResult?.tokenId ? (
              <div className="success-message">
                <h3>🎉 NFT 민팅 성공! 🎉</h3>
                <p>토큰 ID: {mintResult.tokenId}</p>
                
                <div className="nft-info">
                  <h4>NFT 정보</h4>
                  
                  {mintResult.imageHttpUrl && (
                    <div className="nft-preview">
                      <img 
                        src={mintResult.imageHttpUrl} 
                        alt="NFT 이미지" 
                        className="nft-image-preview"
                        onError={(e) => {
                          // 이미지 로드 실패 시 다른 게이트웨이 시도
                          const target = e.target as HTMLImageElement;
                          if (target.src.includes('gateway.pinata.cloud')) {
                            console.log('Pinata 게이트웨이 실패, IPFS.io 시도 중...');
                            target.src = mintResult.imageUrl?.replace('ipfs://', 'https://ipfs.io/ipfs/') || '';
                          } else if (target.src.includes('ipfs.io')) {
                            console.log('IPFS.io 게이트웨이 실패, Infura 시도 중...');
                            target.src = mintResult.imageUrl?.replace('ipfs://', 'https://ipfs.infura.io/ipfs/') || '';
                          }
                        }}
                      />
                    </div>
                  )}
                  
                  <div className="nft-details">
                    <p><strong>컨트랙트 주소:</strong> <span className="contract-address">{process.env.REACT_APP_NFT_CONTRACT_ADDRESS}</span></p>
                    <p><strong>토큰 ID:</strong> <span className="token-id">{mintResult.tokenId}</span></p>
                    
                    <div className="url-info">
                      <p><strong>메타데이터 URL:</strong></p>
                      <p className="metadata-url">{mintResult.metadataUrl}</p>
                      <p><strong>이미지 URL (IPFS):</strong></p>
                      <p className="image-url">{mintResult.imageUrl}</p>
                      {mintResult.imageHttpUrl && (
                        <>
                          <p><strong>이미지 URL (HTTP):</strong></p>
                          <p className="image-url">{mintResult.imageHttpUrl}</p>
                        </>
                      )}
                    </div>
                    
                    <div className="gateway-links">
                      <p><strong>이미지 직접 확인:</strong></p>
                      <div className="image-links">
                        <a href={mintResult.imageHttpUrl} target="_blank" rel="noopener noreferrer">Pinata</a> | 
                        <a href={mintResult.imageUrl?.replace('ipfs://', 'https://ipfs.io/ipfs/')} target="_blank" rel="noopener noreferrer"> IPFS.io</a> | 
                        <a href={mintResult.imageUrl?.replace('ipfs://', 'https://ipfs.infura.io/ipfs/')} target="_blank" rel="noopener noreferrer"> Infura</a>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="troubleshooting-info">
                  <p className="help-text">MetaMask에서 NFT 이미지가 표시되지 않나요?</p>
                  <ul className="nft-tips">
                    <li><strong>1단계:</strong> MetaMask 앱을 열고 <strong>NFT 탭</strong>으로 이동하세요.</li>
                    <li><strong>2단계:</strong> 화면 하단의 <strong>NFT 가져오기</strong> 버튼을 탭하세요.</li>
                    <li><strong>3단계:</strong> 주소 필드에 <strong>{process.env.REACT_APP_NFT_CONTRACT_ADDRESS}</strong>를 입력하세요.</li>
                    <li><strong>4단계:</strong> ID 필드에 <strong>{mintResult.tokenId}</strong>를 입력하세요.</li>
                    <li><strong>5단계:</strong> <strong>NFT 가져오기</strong> 버튼을 탭하세요.</li>
                    
                    <li className="important-tip">
                      <strong>메타데이터 팁:</strong> MetaMask는 HTTP 이미지 URL을 선호합니다. 이 NFT의 메타데이터에는 HTTP 이미지 URL이 사용되어 있어 MetaMask에서도 이미지가 잘 표시될 것입니다.
                    </li>
                    
                    <li className="important-tip">
                      <strong>이미지가 보이지 않는 경우:</strong> IPFS 네트워크에 이미지가 전파되는 데 시간이 필요합니다. 몇 분 후에 다시 확인하세요. 또는 NFT를 다시 가져와보세요.
                    </li>
                    
                    <li className="important-tip">
                      <strong>MetaMask 캐시 지우기:</strong> MetaMask 설정 {'>'} 고급 {'>'} 계정 데이터 지우기 {'>'} NFT 데이터 초기화를 선택한 후 다시 NFT를 가져오세요.
                    </li>
                  </ul>
                </div>
                
                <button 
                  className="mint-button again" 
                  onClick={() => {
                    setCapturedPreview(null);
                    setMintStatus('idle');
                    setMintResult(null);
                  }}
                >
                  다른 NFT 만들기
                </button>
              </div>
            ) : mintStatus === 'error' ? (
              <div className="error-message">
                <h3>❌ 오류 발생</h3>
                <p>{mintResult?.error}</p>
                <button className="mint-button retry" onClick={handleMintNFT}>
                  다시 시도
                </button>
              </div>
            ) : (
              <button 
                className="mint-button" 
                onClick={handleMintNFT}
                disabled={isMinting || !isConnected}
              >
                {!isConnected ? '지갑 연결 후 NFT 민팅하기' : 
                 isMinting ? getMintStatusMessage() : 'NFT 민팅하기'}
              </button>
            )}
            
            {isMinting && (
              <div className="loading-spinner"></div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

// Web3 Provider와 함께 App 렌더링
const App: React.FC = () => {
  return (
    <Web3Provider>
      <GameProvider>
        <AppContent />
      </GameProvider>
    </Web3Provider>
  );
};

export default App; 