
import React, { useState, useEffect, useRef } from 'react';
import { GameContext } from '../../engine/GameContext';
import { Logger, LogEntry } from '../../engine/Logger';
import { X, Activity, Terminal, Bug, Cpu, Wifi } from 'lucide-react';

interface DebugPanelProps {
    gameContext: GameContext;
    onClose: () => void;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({ gameContext, onClose }) => {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [activeTab, setActiveTab] = useState<'LOGS' | 'STATS'>('LOGS');
    const [stats, setStats] = useState<any>({});
    
    // Auto-update stats loop
    useEffect(() => {
        const interval = setInterval(() => {
            if (activeTab === 'STATS') {
                const ctx = gameContext;
                setStats({
                    entities: ctx.entities.current.length,
                    particles: ctx.particles.current.length,
                    fps: Math.round(1000 / 16.6), // Approximate
                    mapSize: ctx.gameState.current.mapSize,
                    camX: Math.round(ctx.camera.current.x),
                    camY: Math.round(ctx.camera.current.y),
                    zoom: ctx.camera.current.zoom.toFixed(2),
                    mouse: `${Math.round(ctx.mouse.current.x)},${Math.round(ctx.mouse.current.y)}`,
                    network: ctx.network.current.role,
                    ping: ctx.network.current.role === 'CLIENT' ? 'Connected' : 'Host/Offline'
                });
            }
        }, 500);
        return () => clearInterval(interval);
    }, [activeTab, gameContext]);

    // Subscribe to Logger
    useEffect(() => {
        setLogs(Logger.getLogs());
        return Logger.subscribe(setLogs);
    }, []);

    return (
        <div className="absolute top-20 left-4 z-[100] w-80 bg-black/90 border border-cyan-500/30 rounded shadow-2xl font-mono text-[10px] flex flex-col max-h-[400px] pointer-events-auto backdrop-blur-md">
            <div className="flex items-center justify-between p-2 bg-cyan-900/20 border-b border-cyan-500/30 cursor-move">
                <div className="flex items-center gap-2 text-cyan-400 font-bold">
                    <Bug className="w-3 h-3" /> DEBUG_CONSOLE
                </div>
                <button onClick={onClose} className="text-gray-500 hover:text-white"><X className="w-3 h-3" /></button>
            </div>

            <div className="flex border-b border-white/10">
                <button 
                    onClick={() => setActiveTab('LOGS')}
                    className={`flex-1 p-2 text-center hover:bg-white/5 ${activeTab === 'LOGS' ? 'text-cyan-400 bg-white/5' : 'text-gray-500'}`}
                >
                    <Terminal className="w-3 h-3 inline mr-1" /> LOGS
                </button>
                <button 
                    onClick={() => setActiveTab('STATS')}
                    className={`flex-1 p-2 text-center hover:bg-white/5 ${activeTab === 'STATS' ? 'text-yellow-400 bg-white/5' : 'text-gray-500'}`}
                >
                    <Activity className="w-3 h-3 inline mr-1" /> ENGINE
                </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 bg-black/50">
                {activeTab === 'LOGS' ? (
                    <div className="space-y-1">
                        {logs.map(log => (
                            <div key={log.id} className="break-all border-b border-white/5 pb-1 mb-1">
                                <span className="text-gray-600">[{new Date(log.timestamp).toLocaleTimeString().split(' ')[0]}]</span>
                                <span className={`font-bold mx-1 ${
                                    log.type === 'ERROR' ? 'text-red-500' : 
                                    log.type === 'WARN' ? 'text-orange-400' : 
                                    log.type === 'NET' ? 'text-blue-400' : 
                                    log.type === 'GAME' ? 'text-green-400' : 'text-gray-300'
                                }`}>{log.type}</span>
                                <span className="text-gray-300">{log.message}</span>
                            </div>
                        ))}
                        {logs.length === 0 && <div className="text-gray-600 italic">No logs captured.</div>}
                    </div>
                ) : (
                    <div className="space-y-2 text-gray-300">
                        <div className="text-yellow-400 font-bold border-b border-white/10 pb-1">PERFORMANCE</div>
                        <div className="grid grid-cols-2 gap-1">
                            <div>ENTITIES: <span className="text-white">{stats.entities}</span></div>
                            <div>PARTICLES: <span className="text-white">{stats.particles}</span></div>
                            <div>EST. FPS: <span className="text-green-400">{stats.fps}</span></div>
                        </div>

                        <div className="text-cyan-400 font-bold border-b border-white/10 pb-1 mt-2">WORLD</div>
                        <div className="grid grid-cols-1 gap-1">
                            <div>MAP SIZE: {stats.mapSize}</div>
                            <div>CAMERA: X:{stats.camX} Y:{stats.camY} (x{stats.zoom})</div>
                            <div>MOUSE: {stats.mouse}</div>
                        </div>

                        <div className="text-blue-400 font-bold border-b border-white/10 pb-1 mt-2">NETWORK</div>
                        <div className="grid grid-cols-1 gap-1">
                            <div>ROLE: {stats.network}</div>
                            <div>STATUS: {stats.ping}</div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
