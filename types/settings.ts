
import { Language, FontTheme } from './primitives';

export type QualityPreset = 'LOW' | 'MEDIUM' | 'HIGH' | 'ULTRA';

export interface GameSettings {
  language: Language; 
  fontTheme: FontTheme;
  qualityPreset: QualityPreset;
  
  graphics: {
    resolution: number; 
    particles: number; 
    bloom: boolean;
    motionBlur: boolean;
    shake: boolean;
    shadows: boolean;
    damageNumbers: boolean; 
    chromaticAberration: boolean; 
    gridVisibility: number; 
  };
  
  controls: {
    sensitivity: number; 
    mobileOrientation: 'AUTO' | 'LANDSCAPE' | 'PORTRAIT';
    haptic: boolean;
    leftHanded: boolean;
    joystickSize: number; 
    joystickOpacity: number; 
    joystickDeadzone: number; 
    aimAssistStrength: number;
    touchSmoothing: number;
  };
  
  interface: {
    crosshairType: 'DEFAULT' | 'CROSS' | 'CIRCLE' | 'DOT' | 'OFF'; 
    crosshairColor: string; 
    showNetGraph: boolean; 
    minimapScale: number; 
    minimapOpacity: number; 
    streamerMode: boolean; 
    aimLine: boolean; 
  };

  gameplay: {
    autoLevelPriority: boolean; 
  };

  network: {
    interpDelay: number;
    buffering: 'NONE' | 'MINIMUM' | 'BALANCED';
    prediction: boolean;
    packetRate: '30' | '60' | '120';
  };

  advanced: {
    lowLatencyMode: boolean;
    fpsCap: number;
    rawInput: boolean;
    batterySaver: boolean;
  };

  audio: {
    master: number; 
    sfx: number;
    music: number;
  };

  accessibility: {
    colorblindMode: 'NONE' | 'PROTANOPIA' | 'DEUTERANOPIA' | 'TRITANOPIA';
    screenFlash: boolean;
    uiScale: number;
  }
}
