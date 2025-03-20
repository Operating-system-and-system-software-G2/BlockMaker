import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// 비 효과
export const RainEffect: React.FC = () => {
  const rainCount = 1000;
  const rainRef = useRef<THREE.Points>(null);
  
  // 빗방울 위치 생성
  const positionArray = new Float32Array(rainCount * 3);
  for (let i = 0; i < rainCount; i++) {
    const i3 = i * 3;
    positionArray[i3] = (Math.random() - 0.5) * 10; // x
    positionArray[i3 + 1] = Math.random() * 10; // y
    positionArray[i3 + 2] = (Math.random() - 0.5) * 10; // z
  }
  
  useFrame(() => {
    if (rainRef.current) {
      const positions = (rainRef.current.geometry as THREE.BufferGeometry).attributes.position.array as Float32Array;
      
      for (let i = 0; i < rainCount; i++) {
        const i3 = i * 3;
        positions[i3 + 1] -= 0.1; // 빗방울을 아래로 이동
        
        // 화면 아래로 떨어지면 다시 위로 이동
        if (positions[i3 + 1] < -5) {
          positions[i3 + 1] = 5;
        }
      }
      
      (rainRef.current.geometry as THREE.BufferGeometry).attributes.position.needsUpdate = true;
    }
  });
  
  return (
    <points ref={rainRef}>
      <bufferGeometry>
        <bufferAttribute 
          attach="attributes-position" 
          count={rainCount} 
          array={positionArray} 
          itemSize={3} 
        />
      </bufferGeometry>
      <pointsMaterial size={0.1} color="#8cdfff" transparent opacity={0.6} />
    </points>
  );
};

// 눈 효과
export const SnowEffect: React.FC = () => {
  const snowCount = 500;
  const snowRef = useRef<THREE.Points>(null);
  
  // 눈송이 위치 생성
  const positionArray = new Float32Array(snowCount * 3);
  for (let i = 0; i < snowCount; i++) {
    const i3 = i * 3;
    positionArray[i3] = (Math.random() - 0.5) * 10; // x
    positionArray[i3 + 1] = Math.random() * 10; // y
    positionArray[i3 + 2] = (Math.random() - 0.5) * 10; // z
  }
  
  // 눈송이별 속도
  const speeds = new Float32Array(snowCount);
  for (let i = 0; i < snowCount; i++) {
    speeds[i] = 0.01 + Math.random() * 0.05;
  }
  
  useFrame(() => {
    if (snowRef.current) {
      const positions = (snowRef.current.geometry as THREE.BufferGeometry).attributes.position.array as Float32Array;
      
      for (let i = 0; i < snowCount; i++) {
        const i3 = i * 3;
        positions[i3 + 1] -= speeds[i]; // 눈송이를 아래로 이동
        positions[i3] += Math.sin(Date.now() * 0.001 + i) * 0.01; // 좌우 흔들림
        
        // 화면 아래로 떨어지면 다시 위로 이동
        if (positions[i3 + 1] < -5) {
          positions[i3 + 1] = 5;
          positions[i3] = (Math.random() - 0.5) * 10;
          positions[i3 + 2] = (Math.random() - 0.5) * 10;
        }
      }
      
      (snowRef.current.geometry as THREE.BufferGeometry).attributes.position.needsUpdate = true;
    }
  });
  
  return (
    <points ref={snowRef}>
      <bufferGeometry>
        <bufferAttribute 
          attach="attributes-position" 
          count={snowCount} 
          array={positionArray} 
          itemSize={3} 
        />
      </bufferGeometry>
      <pointsMaterial size={0.2} color="#ffffff" transparent opacity={0.8} />
    </points>
  );
};

// 안개 효과
export const FogEffect: React.FC = () => {
  return (
    <fog attach="fog" args={['#b8c5d9', 0.5, 15]} />
  );
}; 