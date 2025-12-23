import React, { useEffect, useRef } from 'react';
import { GameSettings } from '../../types';
import { Network, Activity, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface TabProps {
    settings: GameSettings;
    update: (section: any, key: string, value: any) => void;
}

export const TabNetwork: React.FC<TabProps> = ({ settings, update }) => {
    const { t } = useTranslation();
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Defensive access
    const network = settings.network;
    const buffering = network.buffering || 'BALANCED';
    const packetRate = network.packetRate || '60';
    const prediction = network.prediction !== undefined ? network.prediction : true;
    const interpDelay = network.interpDelay !== undefined ? network.interpDelay : 100;

    const updateBuffering = (val: 'NONE' | 'MINIMUM' | 'BALANCED') => {
        let delay = 100;
        if (val === 'NONE') delay = 30;
        if (val === 'MINIMUM') delay = 60;
        if (val === 'BALANCED') delay = 100;
        
        update('network', 'buffering', val);
        update('network', 'interpDelay', delay);
    };

    // --- INTERPOLATION VISUALIZER ---
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let frameId = 0;
        let time = 0;

        const loop = () => {
            time += 0.05;
            const w = canvas.width;
            const h = canvas.height;
            const cy = h / 2;

            ctx.clearRect(0, 0, w, h);

            // Draw Server Timeline (White)
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.lineWidth = 2;
            for (let x = 0; x < w; x++) {
                const y = cy + Math.sin((x + time * 50) * 0.02) * 20;
                if (x===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
            }
            ctx.stroke();

            // Draw Client Interpolated Timeline (Cyan)
            // Lag distance based on interpDelay
            // 100ms corresponds to roughly 50px lag in this arbitrary vis
            const lagPixels = interpDelay * 0.5; 
            
            ctx.beginPath();
            ctx.strokeStyle = '#00f3ff';
            ctx.lineWidth = 2;
            for (let x = 0; x < w; x++) {
                // If prediction is OFF, the line snaps (simulated by noise or steps)
                let y;
                if (!prediction) {
                    // Step function
                    const step = 20;
                    const steppedX = Math.floor((x - lagPixels) / step) * step;
                    y = cy + Math.sin((steppedX + time * 50) * 0.02) * 20;
                } else {
                    y = cy + Math.sin((x - lagPixels + time * 50) * 0.02) * 20;
                }
                if (x===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
            }
            ctx.stroke();

            // Indicators
            const serverX = w - 20;
            const serverY = cy + Math.sin((serverX + time * 50) * 0.02) * 20;
            const clientX = w - 20;
            const clientY = prediction 
                ? cy + Math.sin((clientX - lagPixels + time * 50) * 0.02) * 20
                : cy + Math.sin((Math.floor((clientX - lagPixels)/20)*20 + time * 50) * 0.02) * 20;

            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(serverX, serverY, 4, 0, Math.PI*2); ctx.fill();
            
            ctx.fillStyle = '#00f3ff';
            ctx.beginPath(); ctx.arc(clientX, clientY, 4, 0, Math.PI*2); ctx.fill();

            // Draw connecting line
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
            ctx.setLineDash([2, 2]);
            ctx.beginPath(); ctx.moveTo(serverX, serverY); ctx.lineTo(clientX, clientY); ctx.stroke();
            ctx.setLineDash([]);

            frameId = requestAnimationFrame(loop);
        };
        loop();
        return () => cancelAnimationFrame(frameId);
    }, [interpDelay, prediction]);

    return (
        <div className="flex flex-col h-full gap-6">
            <div className="flex-1 space-y-6 overflow-y-auto custom-scrollbar pr-2">
                
                <div className="flex items-center gap-3 text-cyan-400 font-bold font-mono text-sm border-b border-white/10 pb-2">
                    <Network className="w-4 h-4" /> {t('settings_network')}
                </div>

                {/* GRAPH */}
                <div className="bg-black/60 p-4 rounded border border-white/10 relative overflow-hidden group">
                    <canvas ref={canvasRef} width={300} height={100} className="w-full h-24" />
                    <div className="absolute top-2 left-2 flex flex-col text-[9px] font-mono font-bold">
                        <span className="text-white">● SERVER</span>
                        <span className="text-cyan-400">● CLIENT (RENDER)</span>
                    </div>
                    <div className="absolute bottom-2 right-2 text-[9px] font-mono text-red-400 bg-black/50 px-1 rounded">
                        ARTIFICIAL LAG: {interpDelay}ms
                    </div>
                </div>

                {/* BUFFERING PRESETS */}
                <div className="space-y-2">
                    <label className="text-xs font-mono text-gray-400">{t('settings_buffering')}</label>
                    <div className="grid grid-cols-3 gap-2">
                        {['NONE', 'MINIMUM', 'BALANCED'].map((mode) => (
                            <button
                                key={mode}
                                onClick={() => updateBuffering(mode as any)}
                                className={`
                                    p-3 rounded border text-[10px] font-bold transition-all flex flex-col items-center gap-1
                                    ${buffering === mode 
                                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400 shadow-[0_0_10px_rgba(0,243,255,0.2)]' 
                                        : 'bg-white/5 border-white/10 text-gray-500 hover:bg-white/10'}
                                `}
                            >
                                <span className="tracking-widest">{mode}</span>
                                <span className="text-[9px] opacity-60 font-mono">
                                    {mode === 'NONE' ? '30ms (Risky)' : mode === 'MINIMUM' ? '60ms (Comp)' : '100ms (Safe)'}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* TICKRATE */}
                <div className="space-y-2">
                    <label className="text-xs font-mono text-gray-400">{t('settings_packet_rate')}</label>
                    <div className="grid grid-cols-3 gap-2">
                        {['30', '60', '120'].map((rate) => (
                            <button
                                key={rate}
                                onClick={() => update('network', 'packetRate', rate)}
                                className={`
                                    py-2 rounded border text-xs font-bold font-mono transition-all
                                    ${packetRate === rate
                                        ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400' 
                                        : 'bg-white/5 border-white/10 text-gray-500 hover:bg-white/10'}
                                `}
                            >
                                {rate} HZ
                            </button>
                        ))}
                    </div>
                </div>

                {/* ADVANCED TOGGLES */}
                <div className="bg-black/40 p-4 rounded border border-white/10 space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-300 font-bold">{t('settings_prediction')}</span>
                        <div 
                            onClick={() => update('network', 'prediction', !prediction)}
                            className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors ${prediction ? 'bg-green-500' : 'bg-gray-700'}`}
                        >
                            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${prediction ? 'left-6' : 'left-1'}`}></div>
                        </div>
                    </div>
                    
                    <div className="flex items-center justify-between opacity-70">
                        <span className="text-xs text-gray-400 font-mono">INTERP DELAY (MANUAL)</span>
                        <span className="text-xs text-cyan-400">{interpDelay}ms</span>
                    </div>
                    <input 
                        type="range" min="0" max="200" step="10"
                        value={interpDelay}
                        onChange={(e) => update('network', 'interpDelay', parseInt(e.target.value))}
                        className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                    />
                </div>

            </div>
        </div>
    );
};