import React, { useState, useRef, useCallback } from 'react';
import { useWeb3 } from './context/Web3Context';
import { Web3Provider } from './context/Web3Context';
import { GameProvider } from './context/GameContext';
import html2canvas from 'html2canvas';
import { uploadImageToIPFS, uploadMetadataToIPFS, PUBLIC_IPFS_GATEWAY, BACKUP_IPFS_GATEWAY, INFURA_IPFS_GATEWAY } from './utils/ipfs';
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
  const [level, setLevel] = useState<number>(0);
  const [experience, setExperience] = useState<number>(0); 
  const expNeededForNextLevel = 100; // 다음 레벨로 가기 위해 필요한 경험치
  const expProgress = (experience / expNeededForNextLevel) * 100; // 경험치 진행률 백분율
  
  // 작업 상태
  const [petCount, setPetCount] = useState<number>(0); // 쓰다듬기 횟수
  const [feedCount, setFeedCount] = useState<number>(0); // 먹이주기 횟수
  const maxTaskCount = 3; // 각 작업당 최대 횟수
  const [showExpGain, setShowExpGain] = useState<boolean>(false);
  const [expGainAmount, setExpGainAmount] = useState<number>(0);
  const [isPetting, setIsPetting] = useState<boolean>(false); // 쓰다듬기 애니메이션 상태
  const [isFeeding, setIsFeeding] = useState<boolean>(false); // 먹이주기 애니메이션 상태
  const [showFood, setShowFood] = useState<boolean>(false); // 먹이 표시 상태
  
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
  
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  
  // 이미지 캡처 함수
  const captureImage = async (): Promise<File> => {
    console.log('이미지 캡처 시작...');
    
    // 3D 캡처 대신 html2canvas를 사용한 캡처
    console.log('html2canvas로 캡처 시도...');
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
    const filename = `SlimeCharacter_${new Date().getTime()}.png`;
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
    
    // 경험치 획득 애니메이션 표시
    setExpGainAmount(amount);
    setShowExpGain(true);
    setTimeout(() => {
      setShowExpGain(false);
    }, 1500);
    
    if (newExperience >= expNeededForNextLevel) {
      // 레벨업
      setLevel(level + 1);
      setExperience(newExperience - expNeededForNextLevel);
    } else {
      setExperience(newExperience);
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
        }
      }, 300);
    }
  };
  
  // 먹이주기 함수
  const feedSlime = () => {
    if (feedCount < maxTaskCount && !isFeeding) {
      // 먹이 표시
      setShowFood(true);
      
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

  return (
    <div className="game-page">
      <header className="game-header">
        <h1>Slime Raise</h1>
        <div className="currency-display">
          <img src="/coin.png" alt="Coin" className="currency-icon" />
          <span className="currency-value">10</span>
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
        <div className="game-scene" ref={gameSceneRef} style={{ background: environmentProps.backgroundColor }}>
          <div className="slime-image-container">
            <img 
              src="/slimeD.gif" 
              alt="Slime Character" 
              className={`slime-image ${isPetting ? 'petting' : ''} ${isFeeding ? 'feeding' : ''} slime-${characterColor}`}
              onClick={petSlime}
              style={{ cursor: petCount >= maxTaskCount ? 'default' : 'pointer' }}
            />
            {showFood && (
              <div className="food-item"></div>
            )}
            {showExpGain && (
              <div className="exp-gain-animation">
                +{expGainAmount} EXP
              </div>
            )}
            <button 
              className="feed-button" 
              onClick={feedSlime} 
              disabled={feedCount >= maxTaskCount || isFeeding}
            >
              먹이주기
            </button>
          </div>
        </div>
        
        <div className="customization-container">
          <div className="customization-panel">
            <div className="character-level">LV.{level}</div>
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
                  {petCount < maxTaskCount && (
                    <div className="task-container">
                      <div className="task-content">
                        <div className="task-title">슬라임 세 번 쓰다듬기</div>
                        <div className="task-progress">{petCount} / {maxTaskCount}</div>
                      </div>
                    </div>
                  )}
                  
                  {feedCount < maxTaskCount && (
                    <div className="task-container">
                      <div className="task-content">
                        <div className="task-title">먹이주기</div>
                        <div className="task-progress">{feedCount} / {maxTaskCount}</div>
                      </div>
                    </div>
                  )}
                  
                  {/* 완료된 미션들 - 아래에 표시 */}
                  {petCount >= maxTaskCount && (
                    <div className="task-container completed">
                      <div className="task-content">
                        <div className="task-title">슬라임 세 번 쓰다듬기</div>
                        <div className="task-progress">{petCount} / {maxTaskCount}</div>
                        <div className="task-complete-badge">완료</div>
                      </div>
                    </div>
                  )}
                  
                  {feedCount >= maxTaskCount && (
                    <div className="task-container completed">
                      <div className="task-content">
                        <div className="task-title">먹이주기</div>
                        <div className="task-progress">{feedCount} / {maxTaskCount}</div>
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
                </div>
              ) : (
                <div className="environment-customization">
                  <h3 className="shop-title">액세서리 상점</h3>
                  
                  <div className="shop-items">
                    <div className="shop-item">
                      <div className="shop-item-image hat-item"></div>
                      <div className="shop-item-info">
                        <div className="shop-item-name">모자</div>
                        <div className="shop-item-price">50 <img src="/coin.png" alt="코인" className="shop-coin-icon" /></div>
                      </div>
                      <button className="shop-buy-button">구매하기</button>
                    </div>
                    
                    <div className="shop-item">
                      <div className="shop-item-image glasses-item"></div>
                      <div className="shop-item-info">
                        <div className="shop-item-name">안경</div>
                        <div className="shop-item-price">30 <img src="/coin.png" alt="코인" className="shop-coin-icon" /></div>
                      </div>
                      <button className="shop-buy-button">구매하기</button>
                    </div>
                    
                    <div className="shop-item">
                      <div className="shop-item-image sword-item"></div>
                      <div className="shop-item-info">
                        <div className="shop-item-name">픽셀 검</div>
                        <div className="shop-item-price">100 <img src="/coin.png" alt="코인" className="shop-coin-icon" /></div>
                      </div>
                      <button className="shop-buy-button">구매하기</button>
                    </div>
                    
                    <div className="shop-item">
                      <div className="shop-item-image shield-item"></div>
                      <div className="shop-item-info">
                        <div className="shop-item-name">방패</div>
                        <div className="shop-item-price">80 <img src="/coin.png" alt="코인" className="shop-coin-icon" /></div>
                      </div>
                      <button className="shop-buy-button">구매하기</button>
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
                disabled={level < 1}
              >
                {level >= 1 ? 'NFT 발행하기' : 'LV.1이 되면 NFT를 발행할 수 있습니다'}
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
                    <img src={capturedPreview} alt="캡처된 NFT 이미지" className="preview-image" />
                  ) : (
                    <div className="loading-preview">
                      <div className="loading-spinner"></div>
                      <p>이미지 캡처 중...</p>
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
                        'NFT 발행하기'
                      )}
                    </button>
                  </div>
                </div>
                
                {mintStatus === 'success' && mintResult?.tokenId && (
                  <div className="success-message">
                    <h3>민팅 성공!</h3>
                    <p>토큰 ID: {mintResult.tokenId}</p>
                </div>
                )}
                
                {mintStatus === 'error' && (
              <div className="error-message">
                    <h3>오류 발생</h3>
                <p>{mintResult?.error}</p>
              </div>
            )}
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