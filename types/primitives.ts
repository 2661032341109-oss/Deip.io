
export interface Vector2 {
  x: number;
  y: number;
}

export enum ViewState {
  LOBBY = 'LOBBY',
  GAME = 'GAME',
  SETTINGS = 'SETTINGS',
  ENCYCLOPEDIA = 'ENCYCLOPEDIA',
  SPECTATE = 'SPECTATE',
  SHOP = 'SHOP'
}

export type Language = 'EN' | 'TH' | 'JP';
export type FontTheme = 'CORE' | 'CLEAN' | 'STRIKE' | 'TERMINAL';
