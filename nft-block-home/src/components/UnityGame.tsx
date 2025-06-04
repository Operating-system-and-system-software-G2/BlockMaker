import React, { useEffect, useRef, useState, useCallback } from 'react';

interface UnityGameProps {
  onPetSlime?: () => void;
  onFeedSlime?: () => void;
  characterColor?: string;
  timeOfDay?: string;
  isPetting?: boolean;
  isFeeding?: boolean;
  showFood?: boolean;
  level?: number;
  accessory?: string;
}

declare global {
  interface Window {
    unityInstance?: any;
    UnityLoader?: any;
    createUnityInstance?: any;
  }
}

const UnityGame: React.FC<UnityGameProps> = ({
  onPetSlime,
  onFeedSlime,
  characterColor = 'pastel-blue',
  timeOfDay = 'day',
  isPetting = false,
  isFeeding = false,
  showFood = false,
  level = 0,
  accessory = 'no_accessory'
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const unityInstanceRef = useRef<any>(null);
  const previousLevelRef = useRef<number>(level); // 이전 레벨 추적
  const [canTouchUnity, setCanTouchUnity] = useState(false); // Unity 터치 가능 상태

  // Unity에 메시지 보내기
  const sendMessageToUnity = useCallback((gameObject: string, method: string, value?: any) => {
    if (unityInstanceRef.current && isLoaded) {
      try {
        unityInstanceRef.current.SendMessage(gameObject, method, value || '');
        console.log(`Unity 메시지 전송: ${gameObject}.${method}(${value})`);
      } catch (error) {
        console.warn('Unity 메시지 전송 실패:', error);
      }
    }
  }, [isLoaded]);

  // 레벨에 따른 왕관 타입 결정
  const getCrownTypeForLevel = useCallback((currentLevel: number): string => {
    if (currentLevel >= 3) {
      return 'golden_crown'; // 레벨 3 이상: 황금 왕관
    } else if (currentLevel >= 2) {
      return 'silver_crown'; // 레벨 2: 은 왕관
    } else if (currentLevel >= 1) {
      return 'bronze_crown'; // 레벨 1: 동 왕관
    } else {
      return 'no_crown'; // 레벨 0: 왕관 없음
    }
  }, []);

  // Unity 터치를 일시적으로 활성화하는 함수
  const enableUnityTouchTemporarily = useCallback((duration: number = 3000) => {
    console.log(`Unity 터치 활성화 (${duration}ms)`);
    setCanTouchUnity(true);
    
    // 지정된 시간 후 다시 비활성화
    setTimeout(() => {
      setCanTouchUnity(false);
      console.log('Unity 터치 비활성화');
    }, duration);
  }, []);

  // Unity에서 React로 메시지 받기
  useEffect(() => {
    // Unity에서 호출할 수 있는 전역 함수들 등록
    (window as any).ReactOnSlimePetted = () => {
      if (onPetSlime) {
        onPetSlime();
      }
    };

    (window as any).ReactOnSlimeFed = () => {
      if (onFeedSlime) {
        onFeedSlime();
      }
    };

    return () => {
      // 클린업
      delete (window as any).ReactOnSlimePetted;
      delete (window as any).ReactOnSlimeFed;
    };
  }, [onPetSlime, onFeedSlime]);

  // Unity 게임 상태 업데이트
  useEffect(() => {
    if (isLoaded) {
      sendMessageToUnity('GameManager', 'SetCharacterColor', characterColor);
    }
  }, [characterColor, isLoaded, sendMessageToUnity]);

  useEffect(() => {
    if (isLoaded) {
      sendMessageToUnity('GameManager', 'SetTimeOfDay', timeOfDay);
    }
  }, [timeOfDay, isLoaded, sendMessageToUnity]);

  useEffect(() => {
    if (isLoaded) {
      sendMessageToUnity('GameManager', 'SetAccessory', accessory);
    }
  }, [accessory, isLoaded, sendMessageToUnity]);

  useEffect(() => {
    if (isLoaded) {
      sendMessageToUnity('GameManager', 'SetPettingState', isPetting ? '1' : '0');
    }
  }, [isPetting, isLoaded, sendMessageToUnity]);

  useEffect(() => {
    if (isLoaded) {
      sendMessageToUnity('GameManager', 'SetFeedingState', isFeeding ? '1' : '0');
    }
  }, [isFeeding, isLoaded, sendMessageToUnity]);

  useEffect(() => {
    if (isLoaded) {
      sendMessageToUnity('GameManager', 'ShowFood', showFood ? '1' : '0');
    }
  }, [showFood, isLoaded, sendMessageToUnity]);

  // Unity 게임 로드
  useEffect(() => {
    if (!canvasRef.current) return;

    const loadUnityGame = async () => {
      try {
        // Unity Loader 스크립트가 로드되었는지 확인
        if (!window.createUnityInstance) {
          console.error('Unity Loader가 로드되지 않았습니다.');
          return;
        }

        const buildUrl = '/Build';
        const config = {
          dataUrl: `${buildUrl}/Build.data`,
          frameworkUrl: `${buildUrl}/Build.framework.js`,
          codeUrl: `${buildUrl}/Build.wasm`,
          streamingAssetsUrl: '/StreamingAssets',
          companyName: 'DefaultCompany',
          productName: 'BlockMaker',
          productVersion: '1.0',
        };

        // 로딩 진행률 콜백
        const progressCallback = (progress: number) => {
          setLoadingProgress(Math.round(progress * 100));
        };

        // Unity 인스턴스 생성
        const unityInstance = await window.createUnityInstance(
          canvasRef.current,
          config,
          progressCallback
        );

        unityInstanceRef.current = unityInstance;
        window.unityInstance = unityInstance;
        setIsLoaded(true);
        setLoadingProgress(100);

        console.log('Unity 게임이 성공적으로 로드되었습니다.');

      } catch (error) {
        console.error('Unity 게임 로딩 실패:', error);
      }
    };

    loadUnityGame();

    return () => {
      // 클린업
      if (unityInstanceRef.current) {
        try {
          unityInstanceRef.current.Quit();
        } catch (error) {
          console.warn('Unity 인스턴스 종료 중 오류:', error);
        }
      }
    };
  }, []); // 레벨 의존성 제거

  // Unity 로드 완료 후 초기 설정
  useEffect(() => {
    if (isLoaded) {
      const crownType = getCrownTypeForLevel(level);
      sendMessageToUnity('GameManager', 'SetCrownType', crownType);
      console.log(`Unity 로드 후 초기 왕관 설정: ${crownType}`);
    }
  }, [isLoaded, level, getCrownTypeForLevel, sendMessageToUnity]);

  // 레벨 변경에 따른 왕관 타입 업데이트 (Unity 재로드 없이)
  useEffect(() => {
    if (isLoaded) {
      const crownType = getCrownTypeForLevel(level);
      
      // 레벨업이 발생했는지 확인
      const isLevelUp = level > previousLevelRef.current;
      
      if (isLevelUp) {
        // 레벨업 시 Unity에 레벨업 알림
        sendMessageToUnity('GameManager', 'OnLevelUp', level.toString());
        console.log(`🎉 레벨업! ${previousLevelRef.current} → ${level}`);
        
        // 레벨업 시 Unity 터치 3초간 활성화
        enableUnityTouchTemporarily(3000);
      }
      
      // 왕관 타입 설정
      sendMessageToUnity('GameManager', 'SetCrownType', crownType);
      console.log(`레벨 ${level}에 따른 왕관 타입 변경: ${crownType}`);
      
      // 이전 레벨 업데이트
      previousLevelRef.current = level;
    }
  }, [level, isLoaded, sendMessageToUnity, getCrownTypeForLevel, enableUnityTouchTemporarily]);

  // Unity 캔버스 클릭 함수
  const triggerUnityClick = useCallback(() => {
    console.log('triggerUnityClick 함수 호출됨');
    console.log('canvasRef.current:', !!canvasRef.current);
    console.log('isLoaded:', isLoaded);
    
    if (canvasRef.current && isLoaded) {
      try {
        // 캔버스 중앙 지점 계산
        const rect = canvasRef.current.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        console.log('캔버스 중앙 좌표:', { centerX, centerY, rect });

        // 방법 1: 마우스 다운/업 이벤트 순서로 시뮬레이션
        const mouseDownEvent = new MouseEvent('mousedown', {
          bubbles: true,
          cancelable: true,
          clientX: rect.left + centerX,
          clientY: rect.top + centerY,
          button: 0
        });

        const mouseUpEvent = new MouseEvent('mouseup', {
          bubbles: true,
          cancelable: true,
          clientX: rect.left + centerX,
          clientY: rect.top + centerY,
          button: 0
        });

        const clickEvent = new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          clientX: rect.left + centerX,
          clientY: rect.top + centerY,
          button: 0
        });

        // 마우스 이벤트 순서대로 전달
        canvasRef.current.dispatchEvent(mouseDownEvent);
        setTimeout(() => {
          canvasRef.current?.dispatchEvent(mouseUpEvent);
          setTimeout(() => {
            canvasRef.current?.dispatchEvent(clickEvent);
          }, 10);
        }, 10);

        // 방법 2: Unity SendMessage로 직접 클릭 알림
        sendMessageToUnity('GameManager', 'OnCanvasClicked', '');
        
        // 방법 3: 포커스 설정
        canvasRef.current.focus();
        
        console.log('✅ Unity 캔버스 다중 클릭 이벤트 전달 완료');
      } catch (error) {
        console.error('Unity 캔버스 자동 클릭 실패:', error);
      }
    } else {
      console.warn('Unity 캔버스 클릭 실패 - canvasRef:', !!canvasRef.current, 'isLoaded:', isLoaded);
    }
  }, [isLoaded, sendMessageToUnity]);

  // 레벨업 시 자동 클릭 실행 (React에서 호출할 수 있도록 노출)
  useEffect(() => {
    // 전역에 함수 등록하여 외부에서 호출 가능하게 함
    (window as any).triggerUnityClick = triggerUnityClick;
    (window as any).enableUnityTouch = enableUnityTouchTemporarily;
    console.log('triggerUnityClick 함수를 window에 등록했습니다');
    console.log('enableUnityTouch 함수를 window에 등록했습니다');
    
    return () => {
      delete (window as any).triggerUnityClick;
      delete (window as any).enableUnityTouch;
      console.log('triggerUnityClick 함수를 window에서 제거했습니다');
      console.log('enableUnityTouch 함수를 window에서 제거했습니다');
    };
  }, [triggerUnityClick, enableUnityTouchTemporarily]);

  return (
    <div className="unity-game-container">
      <canvas
        ref={canvasRef}
        id="unity-canvas"
        style={{
          width: '100%',
          height: '100%',
          background: '#222222',
          display: isLoaded ? 'block' : 'none',
          pointerEvents: canTouchUnity ? 'auto' : 'none', // 터치 가능 상태에 따라 제어
          cursor: canTouchUnity ? 'pointer' : 'default'
        }}
      />
      
      {/* 액세서리 오버레이 */}
      {isLoaded && accessory && accessory !== 'none' && accessory !== 'no_accessory' && (
        <div className="accessory-overlay">
          <div className={`accessory ${accessory}-accessory`}></div>
        </div>
      )}
      
      {!isLoaded && (
        <div className="unity-loading">
          <div className="slime-loading-animation">
            <img src="/slimeD.gif" alt="슬라임 로딩" className="loading-slime-gif" />
          </div>
          <div className="loading-progress">
            <div 
              className="loading-bar" 
              style={{ width: `${loadingProgress}%` }}
            />
          </div>
          <div className="loading-text">
            슬라임 게임 로딩 중... {loadingProgress}%
          </div>
          {level > 0 && (
            <div className="loading-level-info">
              레벨 {level} - {getCrownTypeForLevel(level)} 준비중...
            </div>
          )}
        </div>
      )}
      
    </div>
  );
};

export default UnityGame; 