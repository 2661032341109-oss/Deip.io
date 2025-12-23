
import React, { useState, useEffect, useRef } from 'react';
import { ViewState, PlayerProfile, AccountData, LeaderboardEntry } from '../types';
import { MODES, EVOLUTION_TREE, COLORS } from '../constants';
import { Persistence, getRankInfo, getLevelProgress, RANK_DEFINITIONS, SHOP_ITEMS } from '../engine/Persistence';
import { Settings, BookOpen, Activity, Users, ShieldCheck, HelpCircle, X, ShoppingBag, Star, Zap, Database, PlayCircle, LogIn, LogOut, Edit3, Globe, TrendingUp, Lock, Gift, CheckCircle, Wifi, WifiOff, Crown, Server, Share2, Copy } from 'lucide-react';
import { soundManager } from '../engine/SoundManager';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './Button';
import { useTranslation } from 'react-i18next';
import { supabase } from '../supabaseClient';

// Imported Sub-Components
import { MissionCard } from './lobby/MissionCard';
import { AuthModal } from './lobby/AuthModal';
import { ProfileModal } from './lobby/ProfileModal';
import { LeaderboardOverlay } from './lobby/LeaderboardOverlay';
import { TeamSelectionModal } from './lobby/TeamSelectionModal';

const MotionDiv = motion.div as any;
const MotionButton = motion.button as any;

interface LobbyProps {
  onStart: (profile: PlayerProfile) => void;
  onChangeView: (view: ViewState) => void;
}

interface P2PRoom {
    id: string;
    host: string;
    mode: string;
    players: number;
    ping: number;
}

export const Lobby: React.FC<LobbyProps> = ({ onStart, onChangeView }) => {
  const { t } = useTranslation();
  const [nickname, setNickname] = useState('');
  const [onlineCount, setOnlineCount] = useState(1); 
  const [showTutorial, setShowTutorial] = useState(false);
  const [showRankOverview, setShowRankOverview] = useState(false);
  
  // Modals State
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showGlobalLeaderboard, setShowGlobalLeaderboard] = useState(false);
  const [showTeamSelect, setShowTeamSelect] = useState(false);
  
  // P2P State
  const [p2pRooms, setP2pRooms] = useState<P2PRoom[]>([]);
  const [isP2PMode, setIsP2PMode] = useState(true); // Default to P2P now since Vercel has no backend
  const [customRoomId, setCustomRoomId] = useState('');
  
  const [activeLeaderboardTab, setActiveLeaderboardTab] = useState<'LOCAL' | 'GLOBAL'>('LOCAL');
  const [globalLeaderboard, setGlobalLeaderboard] = useState<LeaderboardEntry[]>([]);
  
  const [account, setAccount] = useState<AccountData>(Persistence.load());
  const [dailyBonus, setDailyBonus] = useState(0);
  const [user, setUser] = useState<any>(null); 
  
  const constraintsRef = useRef(null);

  // --- INIT LOGIC ---
  useEffect(() => {
      Persistence.initAuth((u) => {
          setUser(u);
          const loaded = Persistence.load();
          setAccount(loaded);
          if (loaded.nickname) setNickname(loaded.nickname);
      });

      const result = Persistence.checkDailyLogic();
      if (result.bonus > 0) { setDailyBonus(result.bonus); soundManager.playKillConfirm(); }
      
      const loaded = Persistence.load();
      if (loaded.nickname) setNickname(loaded.nickname);
      else { const savedName = localStorage.getItem('COREBOUND_NICKNAME'); if (savedName) setNickname(savedName); }
      
      Persistence.fetchGlobalLeaderboard().then(data => { setGlobalLeaderboard(data); });

      // Supabase Presence for P2P Discovery
      const roomChannel = supabase.channel('p2p_lobby');
      roomChannel
          .on('presence', { event: 'sync' }, () => {
              const state = roomChannel.presenceState();
              const rooms: P2PRoom[] = [];
              let totalOnline = 0;
              
              for (const key in state) {
                  totalOnline += state[key].length;
                  state[key].forEach((presence: any) => {
                      if (presence.isHost) {
                          rooms.push(presence.roomData);
                      }
                  });
              }
              setP2pRooms(rooms);
              setOnlineCount(totalOnline);
          })
          .subscribe(async (status) => {
              if (status === 'SUBSCRIBED') {
                  await roomChannel.track({ 
                      user_id: user?.id || 'guest', 
                      online_at: new Date().toISOString(),
                      isHost: false 
                  });
              }
          });

      return () => {
          roomChannel.unsubscribe();
      };
  }, []);
  
  const handleClaimMission = (id: string) => { const updatedAccount = Persistence.claimMission(id); if (updatedAccount) { setAccount(updatedAccount); soundManager.playKillConfirm(); } };
  const handleAuthClick = () => { soundManager.playUiClick(); setShowAuthModal(true); };
  const handleProfileClick = () => { soundManager.playUiClick(); setShowProfileModal(true); };
  const handleLogout = () => { soundManager.playUiClick(); Persistence.logout(); };
  
  const updateNickname = async (name: string): Promise<boolean> => {
      setNickname(name);
      const current = Persistence.load();
      current.nickname = name;
      localStorage.setItem('COREBOUND_NICKNAME', name);
      Persistence.save(current); 
      setAccount(Persistence.load());
      return true;
  };

  const handleDeploy = (mode: string) => {
      if (!nickname.trim()) { alert("Please enter a nickname first."); return; }
      if (!account.nickname) { const data = Persistence.load(); data.nickname = nickname; Persistence.save(data); }
      soundManager.initialize(); soundManager.playUiClick();

      // P2P HOST
      if (isP2PMode) {
          onStart({ 
              nickname, 
              gameMode: mode, 
              roomId: 'host', // Magic string to trigger Host logic
              isHost: true, 
              skinId: account.equippedSkin, 
              trailId: account.equippedTrail || 'NONE', 
              flagId: account.equippedFlag || 'NONE', 
          });
      } else {
          // Legacy Server Mode (If enabled)
          onStart({ 
              nickname, 
              gameMode: mode, 
              roomId: `official-${mode.toLowerCase()}`, 
              isHost: false, 
              skinId: account.equippedSkin, 
              trailId: account.equippedTrail || 'NONE', 
              flagId: account.equippedFlag || 'NONE', 
          });
      }
  };

  const handleJoinP2P = (hostId: string) => {
      if (!nickname.trim()) { alert("Please enter a nickname."); return; }
      soundManager.initialize(); soundManager.playUiClick();
      onStart({
          nickname,
          gameMode: 'FFA', // Client mode adapts to host
          roomId: hostId, // This is the Peer ID
          isHost: false,
          skinId: account.equippedSkin,
          trailId: account.equippedTrail || 'NONE',
          flagId: account.equippedFlag || 'NONE',
      });
  };

  const rankInfo = getRankInfo(account.rank);
  const progressData = getLevelProgress(account.totalExp, account.rank);
  const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemVariants = { hidden: { opacity: 0, x: -20 }, show: { opacity: 1, x: 0 } };

  return (
    <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col h-full p-4 lg:p-8 overflow-y-auto lg:overflow-hidden custom-scrollbar">
      
      {/* MODALS */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} nickname={nickname} onUpdateNickname={updateNickname} />
      <ProfileModal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} currentName={nickname} onSaveName={updateNickname} account={account} />
      <LeaderboardOverlay isOpen={showGlobalLeaderboard} onClose={() => setShowGlobalLeaderboard(false)} entries={globalLeaderboard} />
      <TeamSelectionModal isOpen={showTeamSelect} onClose={() => setShowTeamSelect(false)} onSelect={(id) => {}} />

      {/* HEADER */}
      <MotionDiv initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, ease: "easeOut" }} className="mb-4 lg:mb-8 text-center relative group shrink-0">
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white font-sans tracking-tighter drop-shadow-2xl">CORE<span className="text-cyan-400">BOUND</span></h1>
        <div className="text-cyan-400/80 font-mono text-[10px] md:text-xs lg:text-sm tracking-[0.5em] mt-1 lg:mt-2">EVOLUTION PROTOCOL v2.1 [DECENTRALIZED]</div>
      </MotionDiv>

      {/* MAIN GRID */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 h-auto lg:h-[650px]">
          {/* LEFT PANEL: PROFILE */}
          <MotionDiv initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="lg:col-span-4 flex flex-col gap-4 h-auto lg:h-full order-1 lg:order-none">
            <div className="glass-panel p-4 lg:p-6 rounded-sm border-l-4 border-l-cyan-500 flex flex-col gap-4">
                <div className="flex justify-between items-center"><label className="text-xs font-mono text-cyan-500/70 block uppercase">Operative_Identity</label>
                {user ? (
                    <div className="flex items-center gap-2 bg-green-900/20 px-2 py-1 rounded border border-green-500/30">
                        <Wifi className="w-3 h-3 text-green-400" />
                        <span className="text-[10px] text-green-400 font-mono font-bold">ONLINE</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 bg-gray-800/50 px-2 py-1 rounded border border-white/10">
                        <WifiOff className="w-3 h-3 text-gray-500" />
                        <span className="text-[10px] text-gray-500 font-mono font-bold">GUEST</span>
                    </div>
                )}
                </div>
                
                <div className="relative group">
                    <input 
                        type="text" 
                        placeholder={t('lobby_enter_name')} 
                        className="w-full bg-black/40 border border-white/10 text-white p-3 lg:p-4 font-mono text-lg lg:text-xl focus:border-cyan-500 focus:outline-none transition-all placeholder-white/20 uppercase rounded pr-12 cursor-pointer group-hover:bg-white/5" 
                        value={nickname} 
                        onChange={(e) => setNickname(e.target.value)}
                        onBlur={() => updateNickname(nickname)}
                    />
                    <button onClick={handleProfileClick} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-cyan-400 transition-colors"><Edit3 className="w-4 h-4" /></button>
                </div>
                
                {/* Mode Toggle */}
                <div className="flex gap-2 p-1 bg-black/40 rounded border border-white/10">
                    <button onClick={() => setIsP2PMode(true)} className={`flex-1 py-2 text-[10px] font-bold font-mono rounded transition-all flex items-center justify-center gap-2 ${isP2PMode ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50' : 'text-gray-500 hover:text-white'}`}>
                        <Share2 className="w-3 h-3" /> P2P (HOST/JOIN)
                    </button>
                    {/* Disabled dedicated server for now as Vercel doesn't support it */}
                    <button onClick={() => alert("Dedicated Servers are offline. Please use P2P Mode.")} className={`flex-1 py-2 text-[10px] font-bold font-mono rounded transition-all flex items-center justify-center gap-2 opacity-50 cursor-not-allowed`}>
                        <Server className="w-3 h-3" /> DEDICATED
                    </button>
                </div>
            </div>
            
            {/* MISSIONS TAB */}
            <div className="glass-panel p-0 rounded-sm flex-1 flex flex-col bg-black/60 min-h-[200px] overflow-hidden">
                <div className="flex border-b border-white/10">
                    <button onClick={() => setActiveLeaderboardTab('LOCAL')} className={`flex-1 py-3 text-xs font-bold font-mono transition-colors ${activeLeaderboardTab === 'LOCAL' ? 'text-white bg-white/10' : 'text-gray-500 hover:text-gray-300'}`}>MISSIONS</button>
                    <button onClick={() => { setActiveLeaderboardTab('GLOBAL'); setShowGlobalLeaderboard(true); }} className={`flex-1 py-3 text-xs font-bold font-mono transition-colors flex items-center justify-center gap-2 ${activeLeaderboardTab === 'GLOBAL' ? 'text-cyan-400 bg-cyan-900/20' : 'text-gray-500 hover:text-gray-300'}`}><Globe className="w-3 h-3" /> GLOBAL RANK</button>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
                    <div className="space-y-2">{account.missions.length > 0 ? (account.missions.map(m => <MissionCard key={m.id} mission={m} onClaim={handleClaimMission} />)) : (<div className="text-center text-gray-500 text-xs py-4">{t('lobby_no_missions')}</div>)}</div>
                </div>
            </div>
          </MotionDiv>

          {/* RIGHT PANEL: GAME SELECTOR */}
          <MotionDiv initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="lg:col-span-8 flex flex-col gap-4 h-auto lg:h-full order-2 lg:order-none">
              
              {/* REALTIME TRAFFIC MONITOR */}
              <div className="glass-panel p-3 flex justify-between items-center bg-black/60 border border-green-500/20 shadow-[0_0_15px_rgba(0,255,100,0.05)]">
                  <div className="flex items-center gap-3">
                      <div className="relative">
                          <div className="w-3 h-3 bg-green-500 rounded-full animate-ping absolute top-0 left-0"></div>
                          <div className="w-3 h-3 bg-green-500 rounded-full relative z-10 shadow-[0_0_10px_#0f0]"></div>
                      </div>
                      <div className="text-green-400 font-bold font-mono tracking-widest text-xs">
                          DECENTRALIZED NETWORK ACTIVE
                      </div>
                  </div>
                  <div className="text-xl font-black text-white font-mono flex items-center gap-2">
                      <Users className="w-5 h-5 text-gray-500" />
                      {onlineCount.toLocaleString()} PEERS
                  </div>
              </div>

              {/* GAME LIST */}
              <div className="glass-panel p-4 md:p-6 rounded-sm flex flex-col flex-1 border border-white/10 min-h-[350px]">
                  
                  {isP2PMode ? (
                      <div className="flex flex-col h-full">
                           <div className="flex justify-between items-end mb-4 border-b border-white/10 pb-2">
                               <h2 className="text-lg font-bold text-white font-sans tracking-widest flex items-center gap-2"><Share2 className="w-5 h-5 text-cyan-400" /> P2P LOBBY</h2>
                               <div className="flex gap-2">
                                   <input type="text" placeholder="Paste Room ID..." className="bg-black/50 border border-white/20 rounded px-2 py-1 text-xs font-mono text-white w-32 md:w-48 focus:border-cyan-500 outline-none" value={customRoomId} onChange={e => setCustomRoomId(e.target.value)} />
                                   <button onClick={() => handleJoinP2P(customRoomId)} disabled={!customRoomId} className="bg-white/10 hover:bg-cyan-500/20 text-cyan-400 text-[10px] font-bold px-3 py-1 rounded border border-white/10 disabled:opacity-50">JOIN ID</button>
                               </div>
                           </div>
                           
                           <div className="flex-1 overflow-y-auto custom-scrollbar mb-4 space-y-2">
                               {p2pRooms.length === 0 && <div className="text-center text-gray-500 font-mono text-xs py-8">NO PUBLIC HOSTS FOUND. CREATE ONE!</div>}
                               {p2pRooms.map(room => (
                                   <div key={room.id} className="flex justify-between items-center p-3 bg-white/5 border border-white/5 rounded hover:bg-white/10 transition-colors">
                                       <div>
                                           <div className="font-bold text-sm text-cyan-400 font-mono">{room.host}'s GAME</div>
                                           <div className="text-[10px] text-gray-400 font-mono">{room.mode} • {room.players}/10 PLAYERS</div>
                                       </div>
                                       <button onClick={() => handleJoinP2P(room.id)} className="bg-green-500/20 text-green-400 border border-green-500/50 px-4 py-2 rounded text-xs font-bold hover:bg-green-500 hover:text-black transition-all">JOIN</button>
                                   </div>
                               ))}
                           </div>

                           <div className="border-t border-white/10 pt-4">
                               <h3 className="text-xs font-bold text-gray-400 font-mono mb-2">HOST A NEW GAME</h3>
                               <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                   {MODES.map(mode => (
                                       <button key={mode} onClick={() => handleDeploy(mode)} className="bg-cyan-900/20 border border-cyan-500/30 hover:bg-cyan-500/20 hover:border-cyan-400 text-cyan-100 p-2 rounded text-xs font-bold font-mono transition-all">
                                           HOST {mode}
                                       </button>
                                   ))}
                               </div>
                           </div>
                      </div>
                  ) : (
                      <div className="flex-1 flex items-center justify-center text-center text-gray-500 font-mono text-xs">
                          DEDICATED SERVERS ARE CURRENTLY OFFLINE.<br/>PLEASE USE P2P MODE.
                      </div>
                  )}

              </div>

              {/* FOOTER BUTTONS */}
              <div className="grid grid-cols-4 gap-2 md:gap-3 h-14 md:h-16 shrink-0">
                    <MotionButton whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => { soundManager.playUiClick(); onChangeView(ViewState.SHOP); }} className="col-span-1 bg-yellow-900/20 border border-yellow-500/20 hover:bg-yellow-500/20 hover:border-yellow-500/50 text-yellow-400 rounded flex flex-col items-center justify-center transition-all group p-1"><ShoppingBag className="w-4 h-4 md:w-5 md:h-5 mb-1 group-hover:scale-110 transition-transform" /><span className="text-[9px] md:text-[10px] font-bold font-mono text-center leading-none">{t('shop_title')}</span></MotionButton>
                    <MotionButton whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => { soundManager.playUiClick(); onChangeView(ViewState.SETTINGS); }} className="flex flex-col items-center justify-center p-1 md:p-3 bg-white/5 border border-white/5 hover:bg-white/10 hover:border-cyan-500/50 transition-all group rounded"><Settings className="w-4 h-4 md:w-5 md:h-5 text-gray-400 group-hover:text-cyan-400 mb-1" /><span className="font-mono text-[9px] md:text-[10px] text-gray-500 group-hover:text-white text-center leading-none">{t('settings_title')}</span></MotionButton>
                    <MotionButton whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => { soundManager.playUiClick(); onChangeView(ViewState.ENCYCLOPEDIA); }} className="flex flex-col items-center justify-center p-1 md:p-3 bg-white/5 border border-white/5 hover:bg-white/10 hover:border-pink-500/50 transition-all group rounded"><BookOpen className="w-4 h-4 md:w-5 md:h-5 text-gray-400 group-hover:text-pink-400 mb-1" /><span className="font-mono text-[9px] md:text-[10px] text-gray-500 group-hover:text-white text-center leading-none">DATA</span></MotionButton>
                    <MotionButton whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => { soundManager.playUiClick(); setShowTutorial(true); }} className="flex flex-col items-center justify-center p-1 md:p-3 bg-white/5 border border-white/5 hover:bg-white/10 hover:border-yellow-500/50 transition-all group rounded"><HelpCircle className="w-4 h-4 md:w-5 md:h-5 text-gray-400 group-hover:text-yellow-400 mb-1" /><span className="font-mono text-[9px] md:text-[10px] text-gray-500 group-hover:text-white text-center leading-none">HELP</span></MotionButton>
              </div>
          </MotionDiv>
      </div>
      
      {/* ... (Tutorial & Rank Overview Code remains same) ... */}
    </div>
  );
};
