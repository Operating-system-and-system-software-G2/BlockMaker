export type HouseStyle = 'modern' | 'classic' | 'cottage' | 'castle' | 'futuristic';
export type HouseColor = 'brown' | 'white' | 'gray' | 'blue' | 'red' | 'green';
export type HouseSize = 'small' | 'medium' | 'large';
export type Decoration = 'garden' | 'fence' | 'pool';

export interface House {
  id?: string;
  style: HouseStyle;
  color: HouseColor;
  size: HouseSize;
  decorations: Decoration[];
}

export const defaultHouse: House = {
  id: '1',
  style: 'modern',
  color: 'white',
  size: 'medium',
  decorations: []
}; 