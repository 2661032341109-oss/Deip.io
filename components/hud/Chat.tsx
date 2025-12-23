
import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Send } from 'lucide-react';
import { ChatMessage, GameSettings } from '../../types';
import { soundManager } from '../../engine/SoundManager';

interface ChatProps {
    messages: ChatMessage[];
    onSend: (text: string) => void;
    isMobile: boolean;
    settings: GameSettings;
}

export const Chat: React.FC<ChatProps> = ({ messages, onSend, isMobile, settings }) => {
    const [input, setInput] = useState('');
    const [showInput, setShowInput] = useState(false);
    const [visible, setVisible] = useState(false);
    const endRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const fadeTimeout = useRef<any>(null);

    // Auto-scroll
    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, showInput, visible]);

    // Visibility Logic
    useEffect(() => {
        if (messages.length > 0) {
            setVisible(true);
            if (fadeTimeout.current) clearTimeout(fadeTimeout.current);
            if (!showInput) fadeTimeout.current = setTimeout(() => setVisible(false), 6000);
        }
    }, [messages]);

    // Focus Input
    useEffect(() => {
        if (showInput) {
            setVisible(true);
            if (fadeTimeout.current) clearTimeout(fadeTimeout.current);
            setTimeout(() => inputRef.current?.focus(), 10);
        } else {
            fadeTimeout.current = setTimeout(() => setVisible(false), 3000);
        }
    }, [showInput]);

    // Global Key Listener for Enter
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Enter' && !showInput) {
                setShowInput(true);
                soundManager.playUiHover();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showInput]);

    const handleSend = () => {
        if (input.trim()) {
            onSend(input.trim());
            setInput('');
            setVisible(true);
            if (fadeTimeout.current) clearTimeout(fadeTimeout.current);
        }
        setShowInput(false);
        soundManager.playUiClick();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        e.stopPropagation();
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSend();
        }
    };

    const stopProp = (e: any) => e.stopPropagation();

    return (
        <motion.div 
            layout
            className={`
                absolute bottom-24 left-4 z-40 w-64 md:w-80 flex flex-col gap-2 
                transition-all duration-300
                ${showInput ? 'pointer-events-auto' : 'pointer-events-none'}
            `}
            onTouchStart={stopProp} onMouseDown={stopProp}
        >
            <div 
                className={`
                    max-h-32 md:max-h-48 overflow-y-auto custom-scrollbar flex flex-col gap-1 p-2 rounded-lg 
                    transition-all duration-500
                    ${showInput ? 'bg-black/60 border border-white/10 backdrop-blur-sm' : 'bg-transparent border-transparent'}
                    ${visible ? 'opacity-100' : 'opacity-0'}
                `}
                style={{
                    maskImage: showInput ? 'none' : 'linear-gradient(to bottom, transparent 0%, black 20%)',
                    WebkitMaskImage: showInput ? 'none' : 'linear-gradient(to bottom, transparent 0%, black 20%)'
                }}
            >
                {messages.length === 0 && showInput && (
                    <div className="text-[10px] text-gray-500 font-mono italic">No recent comms...</div>
                )}
                {messages.slice(-10).map((msg) => (
                    <div key={msg.id} className="text-[10px] md:text-xs font-mono py-0.5 break-words drop-shadow-md text-shadow-sm animate-in slide-in-from-left-2 duration-200">
                        {msg.system ? (
                            <span className="font-bold tracking-wider text-yellow-400">{msg.text}</span>
                        ) : (
                            <>
                                <span className="font-bold text-cyan-400">
                                    {settings.interface.streamerMode ? 'Player' : msg.sender}:
                                </span> <span className="text-white font-medium">{msg.text}</span>
                            </>
                        )}
                    </div>
                ))}
                <div ref={endRef}></div>
            </div>

            <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: showInput ? 0 : 20, opacity: showInput ? 1 : 0 }}
                className="pointer-events-auto"
            >
                <div className="flex items-center gap-2 bg-black/90 p-2 rounded border border-cyan-500/50 shadow-lg backdrop-blur-md">
                    <MessageSquare className="w-3 h-3 text-cyan-500" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onMouseDown={stopProp}
                        onTouchStart={stopProp}
                        className="bg-transparent border-none outline-none text-white font-mono text-xs w-full placeholder-gray-500"
                        placeholder="Enter message..."
                        maxLength={60}
                        autoComplete="off"
                    />
                    <button onClick={handleSend} className="p-1 bg-cyan-500/20 rounded hover:bg-cyan-500/40 text-cyan-400">
                        <Send className="w-3 h-3" />
                    </button>
                </div>
            </motion.div>

            {isMobile && !showInput && (
                 <button 
                    onClick={() => { setShowInput(true); soundManager.playUiClick(); }}
                    className={`self-start p-2 bg-black/40 border border-white/10 rounded-full text-gray-400 hover:text-white hover:border-cyan-500 backdrop-blur-md transition-all active:scale-95 pointer-events-auto ${visible ? 'opacity-100' : 'opacity-50'}`}
                >
                    <MessageSquare className="w-4 h-4" />
                </button>
            )}
        </motion.div>
    );
};
