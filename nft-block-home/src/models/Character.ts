// 캐릭터 색상 타입
export type CharacterColor = 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange' | 'white' | 'black';

// 캐릭터 액세서리 타입
export type AccessoryType = 'none' | 'hat' | 'glasses' | 'necklace';

// 캐릭터 모델
export interface Character {
  name: string;
  color: CharacterColor;
  accessory: AccessoryType;
  accessoryColor: CharacterColor;
  level: number;
  experience: number;
}

// 캐릭터 및 집 설정을 포함한 전체 사용자 데이터
import { House } from './House';

export interface UserGameData {
  character: Character;
  house: House;
}

// 초기 캐릭터 데이터
export const defaultCharacter: Character = {
  name: '블록 캐릭터',
  color: 'blue',
  accessory: 'none',
  accessoryColor: 'red',
  level: 1,
  experience: 0
};

// NFT 메타데이터 인터페이스
export interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
  }>;
} 