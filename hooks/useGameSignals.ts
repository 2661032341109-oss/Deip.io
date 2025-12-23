
import { useEffect, useRef } from 'react';
import { GameContext } from '../engine/GameContext';
import { SandboxOptions, EntityType } from '../types';
import { spawnBoss, spawnParticle, removeEntity, spawnShape } from '../engine/Spawner';
import { Logger } from '../engine/Logger';

export const useGameSignals = (
    context: GameContext, 
    sandboxOptions: SandboxOptions, 
    engineState: string,
    deathInfo: any
) => {
    const prevSignals = useRef({ 
        spawnBoss: 0, 
        resetLevel: 0, 
        heal: 0,
        maxLevel: 0,
        maxStats: 0,
        suicide: 0,
        clearEnemies: 0,
        spawnFood: 0,
        lastStatOverride: null as any
    });

    useEffect(() => {
        if (engineState !== 'READY') return;
        
        const player = context.entities.current.find(e => e.type === EntityType.PLAYER && (e.id === 'player' || e.ownerId === context.network.current.myId));
        
        // 1. Continuous State Updates
        if (player) {
            player.isGodMode = sandboxOptions.godMode;
            if (sandboxOptions.infiniteAmmo) {
                player.reloadTimer = 0; // Force reload reset
            }
        }

        // 2. Discrete Signal Processing
        // Spawn Boss
        if (sandboxOptions.spawnBossSignal > prevSignals.current.spawnBoss) {
            if (player) spawnBoss(context, player.position.x + 300, player.position.y);
            else if (deathInfo) spawnBoss(context, 0, 0); 
            prevSignals.current.spawnBoss = sandboxOptions.spawnBossSignal;
            Logger.info('ADMIN: Spawned Boss');
        }

        // Reset Level
        if (sandboxOptions.resetLevelSignal > prevSignals.current.resetLevel) {
            if (player) {
                player.level = 1; context.gameState.current.level = 1;
                player.score = 0; context.gameState.current.score = 0;
                context.gameState.current.exp = 0; context.gameState.current.nextLevelExp = 50;
                context.gameState.current.upgradesPoints = 0;
                context.playerStats.current.forEach(s => s.level = 0);
                spawnParticle(context, player.position, '#ff0000', 'text', 'LEVEL RESET');
            }
            prevSignals.current.resetLevel = sandboxOptions.resetLevelSignal;
        }

        // Heal
        if (sandboxOptions.healSignal > prevSignals.current.heal) {
            if (player) {
                player.health = player.maxHealth;
                spawnParticle(context, player.position, '#00ff00', 'text', 'HEALED');
            }
            prevSignals.current.heal = sandboxOptions.healSignal;
        }

        // Max Level (NOW INCLUDES SCORE)
        if (sandboxOptions.maxLevelSignal > prevSignals.current.maxLevel) {
            if (player) {
                player.level = 100; 
                context.gameState.current.level = 100;
                
                // Give Max Score appropriate for level 100 (1 Million)
                player.score = 1000000;
                context.gameState.current.score = 1000000;
                
                // Set XP to just below next level to look clean
                context.gameState.current.exp = 999999;
                
                // Set Upgrade Points to Max (Level 100 = 99 points)
                context.gameState.current.upgradesPoints = 99;
                
                spawnParticle(context, player.position, '#ffd700', 'text', 'MAX LEVEL & SCORE');
            }
            prevSignals.current.maxLevel = sandboxOptions.maxLevelSignal;
        }

        // Max Stats
        if (sandboxOptions.maxStatsSignal > prevSignals.current.maxStats) {
            context.playerStats.current.forEach(s => s.level = s.maxLevel);
            // Consuming points visually not strictly necessary since maxStats essentially cheats them in
            // But if we want logic consistency, we can deduct them from available points if we had them.
            // For Sandbox, just forcing them to max is fine.
            if (player) spawnParticle(context, player.position, '#ffd700', 'text', 'MAX STATS');
            prevSignals.current.maxStats = sandboxOptions.maxStatsSignal;
        }

        // Suicide
        if (sandboxOptions.suicideSignal > prevSignals.current.suicide) {
            if (player) { 
                player.health = -1; 
                spawnParticle(context, player.position, '#ff0000', 'text', 'TERMINATED'); 
            }
            prevSignals.current.suicide = sandboxOptions.suicideSignal;
        }

        // Nuke Enemies
        if (sandboxOptions.clearEnemiesSignal > prevSignals.current.clearEnemies) {
            for(let i=context.entities.current.length-1; i>=0; i--) {
                const e = context.entities.current[i];
                if (e.type === EntityType.ENEMY || e.type.startsWith('DRONE')) removeEntity(context, i);
            }
            if (player) spawnParticle(context, player.position, '#ff0000', 'text', 'ENEMIES CLEARED');
            prevSignals.current.clearEnemies = sandboxOptions.clearEnemiesSignal;
        }

        // Spawn Food
        if (sandboxOptions.spawnFoodSignal > prevSignals.current.spawnFood) {
            for(let i=0; i<20; i++) spawnShape(context);
            if (player) spawnParticle(context, player.position, '#00ff00', 'text', 'FOOD SPAWNED');
            prevSignals.current.spawnFood = sandboxOptions.spawnFoodSignal;
        }

    }, [sandboxOptions, engineState, deathInfo]);
};
