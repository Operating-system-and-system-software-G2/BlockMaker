import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh, Group, MeshStandardMaterial } from 'three';
import { HouseStyle, HouseColor, HouseSize, Decoration } from '../models/House';

// 집 색상을 Three.js 색상 값으로 변환
const getHouseColor = (color: HouseColor): string => {
  const colorMap: Record<HouseColor, string> = {
    brown: '#8B4513',
    white: '#FFFFFF',
    gray: '#808080',
    blue: '#4169E1',
    red: '#B22222',
    green: '#228B22'
  };
  return colorMap[color];
};

interface BlockHouseProps {
  style: HouseStyle;
  color: HouseColor;
  size: HouseSize;
  decorations: Decoration[];
  position?: [number, number, number];
  rotation?: [number, number, number];
}

const BlockHouse: React.FC<BlockHouseProps> = ({
  style,
  color,
  size,
  decorations,
  position = [0, 0, 0],
  rotation = [0, 0, 0]
}) => {
  // 메시 참조
  const houseGroupRef = useRef<Group>(null);
  const roofRef = useRef<Mesh>(null);
  const bodyRef = useRef<Mesh>(null);
  const chimneyRef = useRef<Mesh>(null);
  const doorRef = useRef<Mesh>(null);
  const windowRefs = useRef<Mesh[]>([]);
  
  // 크기 스케일 계산
  const getScaleFactor = () => {
    const sizeFactors: Record<HouseSize, number> = {
      small: 0.8,
      medium: 1.0,
      large: 1.2
    };
    return sizeFactors[size];
  };
  
  // 집 스타일에 따른 옵션 계산
  const getStyleOptions = () => {
    const scaleFactor = getScaleFactor();
    
    const baseOptions = {
      roofHeight: 0.7 * scaleFactor,
      bodyHeight: 1.4 * scaleFactor,
      bodyWidth: 2.0 * scaleFactor,
      bodyDepth: 1.6 * scaleFactor,
      hasChimney: false,
      windowCount: 2,
      roofStyle: 'flat',
      roofColor: '#8B4513'
    };
    
    switch (style) {
      case 'modern':
        return {
          ...baseOptions,
          roofStyle: 'flat',
          windowCount: 4,
          roofColor: '#708090'
        };
      case 'classic':
        return {
          ...baseOptions,
          roofStyle: 'pitched',
          hasChimney: true,
          roofColor: '#8B4513'
        };
      case 'cottage':
        return {
          ...baseOptions,
          roofStyle: 'pitched',
          hasChimney: true,
          bodyHeight: 1.2 * scaleFactor,
          bodyWidth: 1.8 * scaleFactor,
          roofColor: '#A0522D'
        };
      case 'castle':
        return {
          ...baseOptions,
          roofStyle: 'towers',
          roofHeight: 1.0 * scaleFactor,
          bodyHeight: 1.8 * scaleFactor,
          windowCount: 6,
          roofColor: '#808080'
        };
      case 'futuristic':
        return {
          ...baseOptions,
          roofStyle: 'dome',
          windowCount: 6,
          roofColor: '#B0E0E6'
        };
      default:
        return baseOptions;
    }
  };
  
  // 집 스타일 옵션
  const styleOptions = getStyleOptions();
  
  // 애니메이션
  useFrame((state) => {
    if (houseGroupRef.current) {
      // 가벼운 호버링 애니메이션
      const time = state.clock.getElapsedTime();
      houseGroupRef.current.position.y = position[1] + Math.sin(time * 0.5) * 0.03;
      
      // 현대식, 미래적 스타일일 경우 회전
      if (style === 'futuristic') {
        if (roofRef.current) {
          roofRef.current.rotation.y = time * 0.2;
        }
      }
      
      // 창문 깜빡임 (밤이라고 가정)
      if (style === 'modern' || style === 'futuristic') {
        windowRefs.current.forEach((windowRef, index) => {
          if (windowRef && Math.sin(time * 1.5 + index) > 0.7) {
            // Material을 MeshStandardMaterial로 타입 캐스팅
            const material = windowRef.material as MeshStandardMaterial;
            material.emissive.set('#FFFFE0');
            material.emissiveIntensity = 0.5 + Math.sin(time * 2) * 0.2;
          } else if (windowRef) {
            const material = windowRef.material as MeshStandardMaterial;
            material.emissiveIntensity = 0.1;
          }
        });
      }
    }
  });
  
  return (
    <group
      ref={houseGroupRef}
      position={position}
      rotation={rotation as any}
    >
      {/* 집 몸체 */}
      <mesh 
        ref={bodyRef} 
        position={[0, styleOptions.bodyHeight / 2, 0]}
      >
        <boxGeometry 
          args={[
            styleOptions.bodyWidth, 
            styleOptions.bodyHeight, 
            styleOptions.bodyDepth
          ]} 
        />
        <meshStandardMaterial color={getHouseColor(color)} />
      </mesh>
      
      {/* 지붕 */}
      {styleOptions.roofStyle === 'flat' && (
        <mesh 
          ref={roofRef} 
          position={[0, styleOptions.bodyHeight + 0.05, 0]}
        >
          <boxGeometry 
            args={[
              styleOptions.bodyWidth + 0.3, 
              0.1, 
              styleOptions.bodyDepth + 0.3
            ]} 
          />
          <meshStandardMaterial color={styleOptions.roofColor} />
        </mesh>
      )}
      
      {styleOptions.roofStyle === 'pitched' && (
        <mesh 
          ref={roofRef} 
          position={[0, styleOptions.bodyHeight + styleOptions.roofHeight / 2, 0]}
          rotation={[0, 0, 0]}
        >
          <coneGeometry 
            args={[
              Math.max(styleOptions.bodyWidth, styleOptions.bodyDepth) * 0.85, 
              styleOptions.roofHeight, 
              4
            ]} 
          />
          <meshStandardMaterial color={styleOptions.roofColor} />
        </mesh>
      )}
      
      {styleOptions.roofStyle === 'dome' && (
        <mesh 
          ref={roofRef} 
          position={[0, styleOptions.bodyHeight + styleOptions.roofHeight / 2, 0]}
        >
          <sphereGeometry 
            args={[
              Math.min(styleOptions.bodyWidth, styleOptions.bodyDepth) * 0.6, 
              16, 16, 
              0, Math.PI * 2, 
              0, Math.PI / 2
            ]} 
          />
          <meshStandardMaterial 
            color={styleOptions.roofColor} 
            transparent={true} 
            opacity={0.7} 
          />
        </mesh>
      )}
      
      {styleOptions.roofStyle === 'towers' && (
        <>
          <mesh 
            ref={roofRef}
            position={[
              styleOptions.bodyWidth * 0.4, 
              styleOptions.bodyHeight + styleOptions.roofHeight / 2, 
              styleOptions.bodyDepth * 0.4
            ]}
          >
            <cylinderGeometry args={[0.2, 0.3, styleOptions.roofHeight, 8]} />
            <meshStandardMaterial color={styleOptions.roofColor} />
          </mesh>
          
          <mesh 
            position={[
              -styleOptions.bodyWidth * 0.4, 
              styleOptions.bodyHeight + styleOptions.roofHeight / 2, 
              styleOptions.bodyDepth * 0.4
            ]}
          >
            <cylinderGeometry args={[0.2, 0.3, styleOptions.roofHeight, 8]} />
            <meshStandardMaterial color={styleOptions.roofColor} />
          </mesh>
          
          <mesh 
            position={[
              styleOptions.bodyWidth * 0.4, 
              styleOptions.bodyHeight + styleOptions.roofHeight / 2, 
              -styleOptions.bodyDepth * 0.4
            ]}
          >
            <cylinderGeometry args={[0.2, 0.3, styleOptions.roofHeight, 8]} />
            <meshStandardMaterial color={styleOptions.roofColor} />
          </mesh>
          
          <mesh 
            position={[
              -styleOptions.bodyWidth * 0.4, 
              styleOptions.bodyHeight + styleOptions.roofHeight / 2, 
              -styleOptions.bodyDepth * 0.4
            ]}
          >
            <cylinderGeometry args={[0.2, 0.3, styleOptions.roofHeight, 8]} />
            <meshStandardMaterial color={styleOptions.roofColor} />
          </mesh>
        </>
      )}
      
      {/* 굴뚝 */}
      {styleOptions.hasChimney && (
        <mesh 
          ref={chimneyRef}
          position={[
            styleOptions.bodyWidth * 0.3, 
            styleOptions.bodyHeight + styleOptions.roofHeight / 2, 
            0
          ]}
        >
          <boxGeometry args={[0.2, styleOptions.roofHeight, 0.2]} />
          <meshStandardMaterial color="#8B4513" />
        </mesh>
      )}
      
      {/* 문 */}
      <mesh 
        ref={doorRef}
        position={[0, styleOptions.bodyHeight * 0.25, styleOptions.bodyDepth / 2 + 0.01]}
      >
        <planeGeometry args={[0.5, 1.0]} />
        <meshStandardMaterial color="#4B3621" />
      </mesh>
      
      {/* 창문 */}
      {Array.from({ length: styleOptions.windowCount }).map((_, index) => {
        const isLeft = index % 2 === 0;
        const row = Math.floor(index / 2);
        return (
          <mesh 
            key={index}
            ref={(el: Mesh) => {
              if (el) windowRefs.current[index] = el;
            }}
            position={[
              (isLeft ? -1 : 1) * styleOptions.bodyWidth * 0.25,
              styleOptions.bodyHeight * (0.5 + row * 0.3),
              styleOptions.bodyDepth / 2 + 0.01
            ]}
          >
            <planeGeometry args={[0.4, 0.4]} />
            <meshStandardMaterial 
              color="#87CEEB" 
              emissive="#FFFFE0" 
              emissiveIntensity={0.1}
            />
          </mesh>
        );
      })}
      
      {/* 장식품 */}
      {decorations.map((decoration, index) => {
        switch (decoration) {
          case 'garden':
            return (
              <mesh
                key={`garden-${index}`}
                position={[
                  styleOptions.bodyWidth * 0.7,
                  0.1,
                  styleOptions.bodyDepth * 0.5
                ]}
              >
                <cylinderGeometry args={[0.4, 0.5, 0.2, 16]} />
                <meshStandardMaterial color="#228B22" />
              </mesh>
            );
          case 'fence':
            return (
              <group key={`fence-${index}`}>
                {Array.from({ length: 8 }).map((_, fenceIndex) => {
                  const angle = (fenceIndex / 8) * Math.PI * 2;
                  const radius = Math.max(styleOptions.bodyWidth, styleOptions.bodyDepth) * 0.9;
                  return (
                    <mesh
                      key={`fence-post-${fenceIndex}`}
                      position={[
                        Math.sin(angle) * radius,
                        0.3,
                        Math.cos(angle) * radius
                      ]}
                      scale={[0.1, 0.6, 0.1]}
                    >
                      <boxGeometry args={[1, 1, 1]} />
                      <meshStandardMaterial color="#A0522D" />
                    </mesh>
                  );
                })}
              </group>
            );
          case 'pool':
            return (
              <mesh
                key={`pool-${index}`}
                position={[
                  -styleOptions.bodyWidth * 0.7,
                  0.05,
                  -styleOptions.bodyDepth * 0.5
                ]}
                rotation={[Math.PI / 2, 0, 0]}
              >
                <cylinderGeometry args={[0.5, 0.5, 0.1, 16]} />
                <meshStandardMaterial color="#1E90FF" />
              </mesh>
            );
          default:
            return null;
        }
      })}
    </group>
  );
};

export default BlockHouse; 