import React from 'react';
import * as THREE from 'three';

interface GroundProps {
  size?: number;
  color?: string;
  position?: [number, number, number];
}

const Ground: React.FC<GroundProps> = ({ 
  size = 20, 
  color = '#8b7355', 
  position = [0, -0.5, 0] 
}) => {
  return (
    <mesh 
      rotation={[-Math.PI / 2, 0, 0]} 
      position={position} 
      receiveShadow
    >
      <planeGeometry args={[size, size]} />
      <meshStandardMaterial 
        color={color}
        roughness={0.8}
        metalness={0.2}
        side={THREE.DoubleSide}
      />
      
      {/* 격자 무늬 추가 */}
      <gridHelper 
        args={[size, size / 2, '#000000', '#444444']} 
        position={[0, 0.01, 0]} 
        rotation={[Math.PI / 2, 0, 0]}
      />
    </mesh>
  );
};

export default Ground; 