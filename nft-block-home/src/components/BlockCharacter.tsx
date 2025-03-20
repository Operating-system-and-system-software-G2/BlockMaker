import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export interface BlockCharacterProps {
  color: 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange' | 'white' | 'black';
  accessory: 'none' | 'hat' | 'glasses' | 'necklace';
  accessoryColor: 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange' | 'white' | 'black';
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: number | [number, number, number];
  style?: 'normal' | 'slim' | 'chubby' | 'tall';
  expression?: {
    eyes: 'round' | 'normal' | 'narrow' | 'wide';
    mouth: 'smile' | 'frown' | 'straight' | 'o';
  };
}

const BlockCharacter: React.FC<BlockCharacterProps> = ({ 
  color, 
  accessory, 
  accessoryColor, 
  position, 
  rotation = [0, 0, 0], 
  scale = 1,
  style = 'normal',
  expression = { eyes: 'normal', mouth: 'smile' }
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Mesh>(null);
  
  // 원래 위치를 저장 (기준점)
  const originalPosition = [...position] as [number, number, number];
  
  // 색상 코드 변환
  const getColorCode = (colorName: string): string => {
    switch(colorName) {
      case 'red': return '#ff0000';
      case 'blue': return '#0000ff';
      case 'green': return '#00ff00';
      case 'yellow': return '#ffff00';
      case 'purple': return '#800080';
      case 'orange': return '#ffa500';
      case 'white': return '#ffffff';
      case 'black': return '#000000';
      default: return '#0000ff';
    }
  };
  
  // 캐릭터 스타일에 따른 비율 조정
  const getStyleDimensions = (style: string): [number, number, number] => {
    switch(style) {
      case 'slim': return [0.7, 1.2, 0.7]; // 슬림형: 가로, 세로 비율 조정
      case 'chubby': return [1.3, 0.9, 1.3]; // 통통형: 가로, 세로 비율 조정
      case 'tall': return [0.9, 1.4, 0.9]; // 키 큰형: 가로, 세로 비율 조정
      default: return [1, 1, 1]; // 기본형: 기본 비율
    }
  };
  
  // 눈 형태 정의
  const getEyeGeometry = (type: string): [number, number, number, number, number] => {
    // [x위치, y위치, 너비, 높이, 회전]
    switch(type) {
      case 'round': return [0, 0, 0.15, 0.15, 0]; // 둥근 눈
      case 'narrow': return [0, 0, 0.2, 0.05, 0]; // 가는 눈
      case 'wide': return [0, 0, 0.2, 0.25, 0]; // 큰 눈
      default: return [0, 0, 0.15, 0.1, 0]; // 기본 눈
    }
  };
  
  // 입 형태 정의
  const getMouthGeometry = (type: string): [number, number, number, number, number] => {
    // [x위치, y위치, 너비, 높이, 회전]
    switch(type) {
      case 'smile': return [0, -0.15, 0.3, 0.1, 0]; // 웃는 입
      case 'frown': return [0, -0.2, 0.3, -0.1, Math.PI]; // 찡그린 입
      case 'o': return [0, -0.15, 0.15, 0.15, 0]; // 동그란 입
      default: return [0, -0.15, 0.3, 0.03, 0]; // 일자 입
    }
  };
  
  // 스타일 치수 계산
  const styleDimensions = getStyleDimensions(style);
  
  // 눈과 입 형태 계산
  const eyeGeometry = getEyeGeometry(expression.eyes);
  const mouthGeometry = getMouthGeometry(expression.mouth);
  
  // 캐릭터 몸 애니메이션 - 부드럽게 수정
  useFrame((state) => {
    if (groupRef.current) {
      const time = state.clock.elapsedTime;
      
      // 부드러운 상하 움직임 (높이는 땅에서 떨어지지 않게 조정)
      // 원래 y값을 유지하면서 작은 움직임만 추가
      groupRef.current.position.y = originalPosition[1] + Math.sin(time * 0.8) * 0.03;
      
      // 아주 미세한 회전 (더 자연스럽게)
      groupRef.current.rotation.y = rotation[1] + Math.sin(time * 0.5) * 0.03;
      
      // x축 랜덤 움직임 (원래 위치에서 ±0.05 범위 내에서만 움직임 - 더 세밀하게 조정)
      groupRef.current.position.x = originalPosition[0] + Math.sin(time * 0.4) * 0.05 + Math.cos(time * 0.3) * 0.03;
      
      // z축 랜덤 움직임 (원래 위치에서 ±0.05 범위 내에서만 움직임 - 더 세밀하게 조정)
      groupRef.current.position.z = originalPosition[2] + Math.cos(time * 0.5) * 0.05 + Math.sin(time * 0.35) * 0.03;
    }
  });
  
  return (
    <group 
      ref={groupRef} 
      position={position} 
      rotation={[rotation[0], rotation[1], rotation[2]]}
      scale={typeof scale === 'number' ? [scale, scale, scale] : scale}
    >
      {/* 캐릭터 몸통 */}
      <mesh 
        ref={bodyRef}
        scale={styleDimensions}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={getColorCode(color)} />
      </mesh>
      
      {/* 왼쪽 눈 */}
      <mesh position={[-0.25 * styleDimensions[0], 0.25 * styleDimensions[1], 0.51 * styleDimensions[2]]}>
        <planeGeometry args={[eyeGeometry[2], eyeGeometry[3]]} />
        <meshBasicMaterial color="#000000" />
      </mesh>
      
      {/* 오른쪽 눈 */}
      <mesh position={[0.25 * styleDimensions[0], 0.25 * styleDimensions[1], 0.51 * styleDimensions[2]]}>
        <planeGeometry args={[eyeGeometry[2], eyeGeometry[3]]} />
        <meshBasicMaterial color="#000000" />
      </mesh>
      
      {/* 입 */}
      <mesh position={[0, -0.1 * styleDimensions[1], 0.51 * styleDimensions[2]]} rotation={[0, 0, mouthGeometry[4]]}>
        <planeGeometry args={[mouthGeometry[2], mouthGeometry[3]]} />
        <meshBasicMaterial color="#000000" />
      </mesh>
      
      {/* 액세서리 */}
      {accessory === 'hat' && (
        <mesh position={[0, 0.7 * styleDimensions[1], 0]} rotation={[0.1, 0, 0]}>
          <coneGeometry args={[0.5 * styleDimensions[0], 0.7, 32]} />
          <meshStandardMaterial color={getColorCode(accessoryColor)} />
        </mesh>
      )}
      
      {accessory === 'glasses' && (
        <group position={[0, 0.25 * styleDimensions[1], 0.52 * styleDimensions[2]]}>
          {/* 왼쪽 렌즈 */}
          <mesh position={[-0.25 * styleDimensions[0], 0, 0]}>
            <ringGeometry args={[0.1, 0.18, 16]} />
            <meshStandardMaterial color={getColorCode(accessoryColor)} />
          </mesh>
          
          {/* 오른쪽 렌즈 */}
          <mesh position={[0.25 * styleDimensions[0], 0, 0]}>
            <ringGeometry args={[0.1, 0.18, 16]} />
            <meshStandardMaterial color={getColorCode(accessoryColor)} />
          </mesh>
          
          {/* 다리 */}
          <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <boxGeometry args={[0.05, 0.5 * styleDimensions[0], 0.05]} />
            <meshStandardMaterial color={getColorCode(accessoryColor)} />
          </mesh>
        </group>
      )}
      
      {accessory === 'necklace' && (
        <mesh position={[0, -0.4 * styleDimensions[1], 0.51 * styleDimensions[2]]}>
          <torusGeometry args={[0.2, 0.05, 16, 32, Math.PI]} />
          <meshStandardMaterial color={getColorCode(accessoryColor)} />
        </mesh>
      )}
    </group>
  );
};

export default BlockCharacter; 