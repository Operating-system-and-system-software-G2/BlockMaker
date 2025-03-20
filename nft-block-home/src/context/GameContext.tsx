import React, { createContext, useContext, useState, ReactNode } from 'react';
import { CharacterColor, AccessoryType } from '../models/Character';
// import { HouseStyle, HouseColor, HouseSize, Decoration } from '../models/House';

interface GameState {
  // 캐릭터 상태
  characterColor: CharacterColor;
  accessory: AccessoryType;
  accessoryColor: CharacterColor;
  
  // // 집 상태
  // houseStyle: HouseStyle;
  // houseColor: HouseColor;
  // houseSize: HouseSize;
  // decorations: Decoration[];
  
  // 게임 진행 상태
  level: number;
  experience: number;
  coins: number;
}

interface GameContextType extends GameState {
  setCharacterColor: (color: CharacterColor) => void;
  setAccessory: (accessory: AccessoryType) => void;
  setAccessoryColor: (color: CharacterColor) => void;
  // setHouseStyle: (style: HouseStyle) => void;
  // setHouseColor: (color: HouseColor) => void;
  // setHouseSize: (size: HouseSize) => void;
  // toggleDecoration: (decoration: Decoration) => void;
  addCoins: (amount: number) => void;
  addExperience: (amount: number) => void;
  reset: () => void;
}

const initialGameState: GameState = {
  characterColor: 'blue',
  accessory: 'none',
  accessoryColor: 'red',
  // houseStyle: 'modern',
  // houseColor: 'white',
  // houseSize: 'medium',
  // decorations: [],
  level: 1,
  experience: 0,
  coins: 100
};

const GameContext = createContext<GameContextType | undefined>(undefined);

export const useGame = (): GameContextType => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};

interface GameProviderProps {
  children: ReactNode;
}

export const GameProvider: React.FC<GameProviderProps> = ({ children }) => {
  const [gameState, setGameState] = useState<GameState>(initialGameState);
  
  const setCharacterColor = (color: CharacterColor) => {
    setGameState(prev => ({ ...prev, characterColor: color }));
  };
  
  const setAccessory = (accessory: AccessoryType) => {
    setGameState(prev => ({ ...prev, accessory }));
  };
  
  const setAccessoryColor = (color: CharacterColor) => {
    setGameState(prev => ({ ...prev, accessoryColor: color }));
  };
  
  // const setHouseStyle = (style: HouseStyle) => {
  //   setGameState(prev => ({ ...prev, houseStyle: style }));
  // };
  
  // const setHouseColor = (color: HouseColor) => {
  //   setGameState(prev => ({ ...prev, houseColor: color }));
  // };
  
  // const setHouseSize = (size: HouseSize) => {
  //   setGameState(prev => ({ ...prev, houseSize: size }));
  // };
  
  // const toggleDecoration = (decoration: Decoration) => {
  //   setGameState(prev => {
  //     const exists = prev.decorations.includes(decoration);
  //     const decorations = exists
  //       ? prev.decorations.filter(d => d !== decoration) 
  //       : [...prev.decorations, decoration];
  //     return { ...prev, decorations };
  //   });
  // };
  
  const addCoins = (amount: number) => {
    setGameState(prev => ({ ...prev, coins: prev.coins + amount }));
  };
  
  const addExperience = (amount: number) => {
    setGameState(prev => {
      const newExp = prev.experience + amount;
      const expNeededForLevelUp = prev.level * 100;
      
      if (newExp >= expNeededForLevelUp) {
        // 레벨 업
        return {
          ...prev,
          level: prev.level + 1,
          experience: newExp - expNeededForLevelUp,
          coins: prev.coins + 50 // 레벨업 보상
        };
      }
      
      return { ...prev, experience: newExp };
    });
  };
  
  const reset = () => {
    setGameState(initialGameState);
  };
  
  const contextValue: GameContextType = {
    ...gameState,
    setCharacterColor,
    setAccessory,
    setAccessoryColor,
    // setHouseStyle,
    // setHouseColor,
    // setHouseSize,
    // toggleDecoration,
    addCoins,
    addExperience,
    reset
  };
  
  return (
    <GameContext.Provider value={contextValue}>
      {children}
    </GameContext.Provider>
  );
}; 