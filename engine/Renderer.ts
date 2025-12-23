
// RENDERER BARREL FILE
// This ensures existing imports in the project (like import { drawScene } from '../engine/Renderer')
// continue to work without changes, while delegating to the new modular structure.

export * from './renderer/utils';
export * from './renderer/effects';
export * from './renderer/tanks';
export * from './renderer/minimap';
export * from './renderer/scene';
