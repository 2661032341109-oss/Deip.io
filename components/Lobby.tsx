
import React, { useState, useEffect, useRef } from 'react';
import { ViewState, PlayerProfile, AccountData, LeaderboardEntry } from '../types';
import { MODES, EVOLUTION_TREE, COLORS } from '../constants';
import { Persistence, getRankInfo, getLevelProgress, RANK_DEFINITIONS, SHOP_ITEMS } from '../engine/Persistence';
import { Settings, BookOpen, Activity, Users, ShieldCheck, HelpCircle, X, ShoppingBag, Star, Zap, Database, PlayCircle, LogIn, LogOut, Edit3, Globe, TrendingUp, Lock, Gift, CheckCircle, Wifi, WifiOff, Crown } from 'lucide-react';
import { soundManager } from '../engine/SoundManager';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './Button';
import { useTranslation } from 'react-i18next';

// Imported Sub-Components
import { MissionCard } from './lobby/MissionCard';
import { AuthModal } from './lobby/AuthModal';
import { ProfileModal } from './lobby/ProfileModal';
import { LeaderboardOverlay } from './lobby/LeaderboardOverlay';
import { TeamSelectionModal } from './lobby/TeamSelectionModal';

// Fix for strict TypeScript environments where motion types might conflict
const MotionDiv = motion.div as any;
const MotionButton = motion.button as any;

interface LobbyProps {
  onStart: (profile: PlayerProfile) => void;
  onChangeView: (view: ViewState) => void;
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

      const unsubscribe = Persistence.initPresence((count) => {
          setOnlineCount(count);
      });

      return () => {
          if (unsubscribe) unsubscribe();
      };
  }, []);
  
  // --- GLOBAL ROOM AUTOMATION STRATEGY ---
  // Using fixed room IDs ensures everyone joins the same instance per mode.
  // This mimics MMO/Roblox style where you just "Join the game" and see others.
  const getGlobalRoomId = (mode: string) => { 
      const modeKey = mode.toLowerCase().replace(/ /g, '-');
      // "OFFICIAL-REALM" prefix ensures we look for the main persistent room
      return `official-realm-${modeKey}`; 
  };

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

  const handleModeSelect = (mode: string, resume: boolean = false) => {
    if (!nickname.trim()) { alert("Please enter a nickname first."); return; }
    if (!account.nickname) { 
        const data = Persistence.load(); data.nickname = nickname; Persistence.save(data); 
    }
    soundManager.initialize(); soundManager.playUiClick();

    if (mode === '2-Teams' && !resume) {
        setShowTeamSelect(true);
        return;
    }

    const runToCarry = account.savedRun;

    onStart({ 
        nickname, 
        gameMode: mode, 
        roomId: getGlobalRoomId(mode), // AUTO-CONNECT: Always use the global room ID
        isHost: false, 
        skinId: account.equippedSkin, 
        trailId: account.equippedTrail || 'NONE', 
        flagId: account.equippedFlag || 'NONE', 
        savedRun: resume ? (account.savedRun || undefined) : (runToCarry || undefined) 
    });
  };

  const handleTeamSelected = (teamId: number) => {
      setShowTeamSelect(false);
      const runToCarry = account.savedRun;
      onStart({ 
          nickname, 
          gameMode: '2-Teams', 
          roomId: getGlobalRoomId('2-Teams'), // AUTO-CONNECT: Global Team Room
          isHost: false, 
          skinId: account.equippedSkin, 
          trailId: account.equippedTrail || 'NONE', 
          flagId: account.equippedFlag || 'NONE',
          teamId: teamId,
          savedRun: runToCarry || undefined
      });
  };

  const rankInfo = getRankInfo(account.rank);
  const progressData = getLevelProgress(account.totalExp, account.rank);
  const savedRun = account.savedRun;
  const savedWeapon = savedRun ? EVOLUTION_TREE.find(w => w.id === savedRun.weaponId) : null;
  const savedWeaponName = savedWeapon ? t(`unit_${savedWeapon.id}_name`, { defaultValue: savedWeapon.name }) : 'Unknown Unit';
  const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemVariants = { hidden: { opacity: 0, x: -20 }, show: { opacity: 1, x: 0 } };

  return (
    <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col h-full p-4 lg:p-8 overflow-y-auto lg:overflow-hidden custom-scrollbar">
      
      {/* MODALS */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} nickname={nickname} onUpdateNickname={updateNickname} />
      <ProfileModal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} currentName={nickname} onSaveName={updateNickname} account={account} />
      <LeaderboardOverlay isOpen={showGlobalLeaderboard} onClose={() => setShowGlobalLeaderboard(false)} entries={globalLeaderboard} />
      <TeamSelectionModal isOpen={showTeamSelect} onClose={() => setShowTeamSelect(false)} onSelect={handleTeamSelected} />

      {/* DAILY BONUS BANNER */}
      <AnimatePresence>
      {dailyBonus > 0 && (
          <MotionDiv initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -50 }} className="absolute top-20 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-md">
              <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/50 p-4 rounded-lg flex items-center gap-4 backdrop-blur-md shadow-[0_0_30px_rgba(234,179,8,0.4)]">
                  <MotionDiv animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="p-3 bg-yellow-500 rounded-full shrink-0"><Star className="w-6 h-6 text-black" fill="black" /></MotionDiv>
                  <div className="flex-1"><div className="text-yellow-400 font-bold font-mono tracking-widest text-xs md:text-sm">{t('lobby_daily_reward')}</div><div className="text-white font-black text-xl md:text-2xl">+{dailyBonus} DUST</div></div>
                  <button onClick={() => setDailyBonus(0)} className="ml-2 text-gray-400 hover:text-white"><X /></button>
              </div>
          </MotionDiv>
      )}
      </AnimatePresence>

      {/* HEADER */}
      <MotionDiv initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, ease: "easeOut" }} className="mb-4 lg:mb-8 text-center relative group shrink-0">
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white font-sans tracking-tighter drop-shadow-2xl">CORE<span className="text-cyan-400">BOUND</span></h1>
        <div className="text-cyan-400/80 font-mono text-[10px] md:text-xs lg:text-sm tracking-[0.5em] mt-1 lg:mt-2">EVOLUTION PROTOCOL v2.0 [ONLINE]</div>
      </MotionDiv>

      {/* MAIN GRID */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 h-auto lg:h-[650px]">
          {/* LEFT PANEL: PROFILE & MISSIONS */}
          <MotionDiv initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="lg:col-span-4 flex flex-col gap-4 h-auto lg:h-full order-1 lg:order-none">
            <div className="glass-panel p-4 lg:p-6 rounded-sm border-l-4 border-l-cyan-500 flex flex-col gap-4">
                <div className="flex justify-between items-center"><label className="text-xs font-mono text-cyan-500/70 block uppercase">Operative_Identity</label>
                {user ? (
                    <div className="flex items-center gap-2 bg-green-900/20 px-2 py-1 rounded border border-green-500/30">
                        <Wifi className="w-3 h-3 text-green-400" />
                        <span className="text-[10px] text-green-400 font-mono font-bold">ONLINE ({user.email ? 'EMAIL' : 'DISCORD'})</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 bg-gray-800/50 px-2 py-1 rounded border border-white/10">
                        <WifiOff className="w-3 h-3 text-gray-500" />
                        <span className="text-[10px] text-gray-500 font-mono font-bold">GUEST MODE</span>
                    </div>
                )}
                </div>
                
                {account.role === 'ADMIN' && (
                    <div className="bg-red-500/20 border border-red-500/50 p-2 rounded flex items-center justify-center gap-2 animate-pulse">
                        <Crown className="w-4 h-4 text-red-500" />
                        <span className="text-xs font-black text-red-400 font-sans tracking-widest">SYSTEM ADMINISTRATOR</span>
                    </div>
                )}

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

                {user ? (
                    <button onClick={handleLogout} className="w-full py-2 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 hover:border-red-500 text-red-400 hover:text-white rounded text-xs font-bold font-mono tracking-widest transition-all flex items-center justify-center gap-2 group">
                        <LogOut className="w-3 h-3 group-hover:rotate-180 transition-transform" />
                        DISCONNECT UPLINK
                    </button>
                ) : (
                    <button onClick={handleAuthClick} className="w-full py-2 bg-indigo-500/20 hover:bg-indigo-500/40 border border-indigo-500/50 text-indigo-300 hover:text-white rounded text-xs font-bold font-mono tracking-widest transition-all flex items-center justify-center gap-2 group">
                        <LogIn className="w-3 h-3" />
                        LOGIN / REGISTER (SAVE PROGRESS)
                    </button>
                )}
                
                {/* RANK PROGRESS */}
                <MotionDiv whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => { soundManager.playUiClick(); setShowRankOverview(true); }} className="bg-black/40 border border-white/10 hover:border-cyan-500/50 p-4 rounded-lg relative overflow-hidden group cursor-pointer transition-colors">
                    <div className="absolute top-2 right-2 text-gray-600 group-hover:text-cyan-400 transition-colors flex items-center gap-1"><TrendingUp className="w-4 h-4" /><span className="text-[9px] font-mono">ROAD MAP</span></div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4"><div className="w-10 h-10 lg:w-12 lg:h-12 rounded flex items-center justify-center text-xl lg:text-2xl shadow-lg border border-white/10" style={{ backgroundColor: `${rankInfo.current.color}20`, borderColor: rankInfo.current.color }}>{rankInfo.current.icon}</div><div><div className="text-xs lg:text-sm font-bold font-mono tracking-wider" style={{ color: rankInfo.current.color }}>{rankInfo.current.tier}</div><div className="text-xl lg:text-2xl font-black text-white font-sans leading-none">RANK {account.rank}</div></div></div>
                        <div className="flex justify-between text-[9px] font-mono text-gray-500 mb-1"><span>LEVEL PROGRESS</span><span>{Math.floor(progressData.current).toLocaleString()} / {progressData.required.toLocaleString()} XP</span></div>
                        <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden mb-1 relative"><MotionDiv className="h-full relative overflow-hidden" style={{ backgroundColor: rankInfo.current.color }} initial={{ width: 0 }} animate={{ width: `${progressData.percent}%` }} transition={{ duration: 1.5, ease: "circOut" }}></MotionDiv></div>
                        <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4"><div className="flex flex-col"><span className="text-[10px] text-gray-500 font-mono">COSMIC DUST</span><span className="text-lg lg:text-xl font-bold text-yellow-400 flex items-center gap-1"><Zap className="w-4 h-4 fill-yellow-400" /> {account.currency.toLocaleString()}</span></div><div className="flex flex-col text-right"><span className="text-[10px] text-gray-500 font-mono">{t('stats_score').toUpperCase()}</span><span className="text-base lg:text-lg font-bold text-white">{account.highScore.toLocaleString()}</span></div></div>
                    </div>
                </MotionDiv>
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
                          GLOBAL OPERATIVES ONLINE
                      </div>
                  </div>
                  <div className="text-xl font-black text-white font-mono flex items-center gap-2">
                      <Users className="w-5 h-5 text-gray-500" />
                      {onlineCount.toLocaleString()}
                  </div>
              </div>

              {/* GAME MODES LIST */}
              <div className="glass-panel p-4 md:p-6 lg:p-8 rounded-sm flex flex-col flex-1 border border-white/10 min-h-[350px]">
                  <div className="flex justify-between items-end mb-4 border-b border-white/10 pb-2 shrink-0"><h2 className="text-lg md:text-xl font-bold text-white font-sans tracking-widest flex items-center gap-2"><Activity className="w-5 h-5 text-cyan-400" />{t('lobby_select_zone')}</h2><div className="text-[10px] md:text-xs font-mono text-gray-500 hidden sm:block">SELECT A ZONE TO DEPLOY</div></div>
                  <MotionDiv variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 gap-2 overflow-y-auto custom-scrollbar pr-2 flex-1">
                      {savedRun && (<MotionButton variants={itemVariants} onClick={() => handleModeSelect(savedRun.gameMode, true)} className="group relative flex items-center justify-between p-3 md:p-4 bg-yellow-900/10 border border-yellow-500/30 hover:bg-yellow-500/20 hover:border-yellow-500 transition-all text-left rounded shadow-[0_0_15px_rgba(234,179,8,0.1)] mb-2" onMouseEnter={() => soundManager.playUiHover()} whileHover={{ scale: 1.01, x: 5 }} whileTap={{ scale: 0.99 }}><div className="flex items-center gap-4"><div className="w-12 h-12 bg-yellow-500/20 rounded flex items-center justify-center border border-yellow-500/50 relative overflow-hidden"><PlayCircle className="w-6 h-6 text-yellow-400 relative z-10" /><div className="absolute inset-0 bg-yellow-500/10 animate-pulse"></div></div><div><div className="text-lg font-black text-yellow-400 font-sans tracking-wide uppercase flex items-center gap-2">RESUME: {savedWeaponName}<span className="text-[10px] bg-yellow-500 text-black px-1.5 rounded font-bold animate-pulse">SAVED</span></div><div className="text-[10px] font-mono text-gray-400 flex items-center gap-2"><span>LVL {savedRun.level}</span><span className="w-1 h-1 bg-gray-600 rounded-full"></span><span>SCORE: {savedRun.score.toLocaleString()}</span></div></div></div><div className="text-yellow-400 font-bold font-mono text-xs flex items-center gap-1">CONTINUE <PlayCircle className="w-3 h-3" /></div></MotionButton>)}
                      {MODES.map((mode) => { const isSandbox = mode === 'Sandbox'; return (<MotionButton variants={itemVariants} key={mode} onClick={() => handleModeSelect(mode)} className={`group relative flex items-center justify-between p-3 md:p-4 bg-white/5 border border-white/5 hover:bg-cyan-500/10 hover:border-cyan-500/50 transition-all text-left rounded`} onMouseEnter={() => soundManager.playUiHover()} whileHover={{ scale: 1.01, x: 5 }} whileTap={{ scale: 0.99 }}><div className="flex items-center gap-3 md:gap-4"><div className={`w-10 h-10 md:w-12 md:h-12 bg-black/50 rounded flex items-center justify-center border group-hover:border-cyan-500/50 transition-colors shrink-0 border-white/10`}>{isSandbox ? <Database className="w-5 h-5 text-gray-500" /> : <span className={`font-mono font-bold text-base md:text-lg text-gray-500 group-hover:text-cyan-400`}>{mode.substring(0,2).toUpperCase()}</span>}</div><div><div className="text-base md:text-lg font-bold text-gray-200 group-hover:text-white font-sans uppercase flex items-center gap-2">{mode}{savedRun && !isSandbox && (<span className="text-[9px] bg-yellow-500/20 text-yellow-400 border border-yellow-500/50 px-1.5 rounded flex items-center gap-1"><Database className="w-2 h-2" /> STATS CARRIED OVER</span>)}{isSandbox ? (<span className="text-[9px] bg-gray-700 text-gray-300 px-1.5 rounded font-mono">UNRANKED</span>) : (<span className="text-[9px] bg-green-900/50 text-green-400 border border-green-500/30 px-1.5 rounded font-mono flex items-center gap-1"><Users className="w-2 h-2" /> MULTIPLAYER</span>)}</div><div className="flex items-center gap-2 text-[10px] font-mono text-gray-500"><span className="text-gray-600">● SERVER: GLOBAL</span></div></div></div><div className="flex items-center gap-2 md:gap-6"><div className={`px-4 py-2 md:px-6 md:py-2 font-bold font-mono text-[10px] md:text-xs rounded border transition-all bg-cyan-500/20 text-cyan-400 border-cyan-500/50 group-hover:bg-cyan-500 group-hover:text-black`}>{t('lobby_deploy')}</div></div></MotionButton>)})}
                  </MotionDiv>
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

      <div className="mt-4 md:mt-6 flex flex-wrap justify-center md:justify-start gap-4 text-[9px] md:text-[10px] font-mono text-gray-600 pb-4"><div className="flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> SECURE CONNECTION</div><div>PROTOCOL: REALTIME-SYNC</div><div>REGION: GLOBAL</div></div>
      
      {/* TUTORIAL MODAL (SIMPLE) */}
      <AnimatePresence>{showTutorial && (<MotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4"><MotionDiv initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="glass-panel w-full max-w-4xl p-6 md:p-8 rounded-lg max-h-[90vh] overflow-y-auto"><div className="flex justify-between items-center mb-6"><h2 className="text-xl md:text-2xl font-black text-white">{t('help_title')}</h2><button onClick={() => setShowTutorial(false)}><X className="text-white" /></button></div><div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-gray-300 font-mono text-sm"><div><h3 className="text-cyan-400 font-bold mb-2">{t('help_controls')}</h3><p className="whitespace-pre-line leading-relaxed">{t('help_controls_desc')}</p></div><div><h3 className="text-yellow-400 font-bold mb-2">{t('help_progression')}</h3><p className="whitespace-pre-line leading-relaxed">{t('help_progression_desc')}</p></div></div><Button variant="primary" onClick={() => setShowTutorial(false)} className="mt-8 w-full">{t('help_dismiss')}</Button></MotionDiv></MotionDiv>)}</AnimatePresence>
      
      {/* RANK ROADMAP (COMPLEX HORIZONTAL SCROLL) */}
      <AnimatePresence>{showRankOverview && (<MotionDiv initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="absolute inset-0 bg-black/95 backdrop-blur-xl z-[100] flex flex-col p-0 md:p-4 overflow-hidden"><div className="flex justify-between items-center p-4 shrink-0 bg-black/40 border-b border-white/5 relative z-20"><div className="flex items-center gap-4"><div className="bg-cyan-500/20 p-2 rounded shadow-[0_0_15px_rgba(0,243,255,0.3)]"><TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-cyan-400" /></div><div><h2 className="text-lg md:text-2xl font-black text-white font-sans tracking-widest uppercase flex items-center gap-2">{t('rank_title')} <span className="text-cyan-500 text-[10px] md:text-sm align-middle hidden sm:inline">/// COMMANDER CLEARANCE</span></h2><div className="text-[10px] md:text-xs font-mono text-gray-500 flex items-center gap-2"><span>{t('rank_current')}: RANK {account.rank}</span><span className="w-1 h-1 bg-gray-500 rounded-full"></span><span className="text-yellow-400">{t('rank_next')}: {RANK_DEFINITIONS.find(r => r.minRank > account.rank)?.tier || 'MAX'}</span></div></div></div><button onClick={() => setShowRankOverview(false)} className="text-gray-500 hover:text-white p-2 bg-white/5 rounded-full hover:bg-red-500/20 transition-all"><X className="w-5 h-5 md:w-6 md:h-6" /></button></div><div className="flex-1 relative overflow-hidden bg-[#050508] cursor-grab active:cursor-grabbing select-none" ref={constraintsRef}><div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none"></div><div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-black to-black pointer-events-none"></div><MotionDiv drag="x" dragConstraints={{ left: -2000, right: 0 }} className="w-full h-full flex items-center pl-[10vw]"><div className="relative flex items-center gap-12 md:gap-24 py-20 min-w-max"><div className="absolute top-1/2 left-0 right-0 h-1 bg-white/5 -z-10 rounded-full"></div><MotionDiv className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-cyan-500 to-blue-600 shadow-[0_0_20px_rgba(0,243,255,0.6)] -z-10" initial={{ width: 0 }} animate={{ width: `${Math.min(100, (account.rank / 100) * 100)}%` }} transition={{ duration: 2, ease: "easeInOut" }}><div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-[0_0_15px_#fff] animate-pulse"></div></MotionDiv>{RANK_DEFINITIONS.map((def, idx) => { const isReached = account.rank >= def.minRank; const isCurrent = rankInfo.current.tier === def.tier; return (<MotionDiv key={def.tier} className="relative flex flex-col items-center group" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}><div className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 md:w-4 md:h-4 rounded-full border-2 bg-[#050508] z-0 transition-colors duration-300 ${isReached ? 'border-cyan-500 shadow-[0_0_10px_#00f3ff]' : 'border-gray-800'}`}></div><MotionDiv whileHover={{ scale: 1.1, y: -5 }} className={`w-24 h-28 md:w-36 md:h-40 flex flex-col items-center justify-center transition-all duration-300 relative clip-path-polygon ${isReached ? 'bg-gradient-to-b from-gray-800 to-black border-none' : 'bg-black/40 grayscale opacity-40'} ${isCurrent ? 'ring-4 ring-cyan-500 shadow-[0_0_50px_rgba(0,243,255,0.3)] z-10 scale-110' : ''}`} style={{ clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)", border: isReached ? undefined : '1px solid #333' }}>{isReached && <div className="absolute inset-0 bg-gradient-to-t from-cyan-900/20 to-transparent pointer-events-none"></div>}<div className={`text-3xl md:text-5xl mb-2 drop-shadow-md transition-transform group-hover:scale-110 ${isReached ? 'grayscale-0' : 'grayscale'}`}>{def.icon}</div><div className={`text-[9px] md:text-xs font-black font-sans tracking-widest uppercase ${isReached ? 'text-white' : 'text-gray-500'}`}>{def.tier}</div><div className={`text-[8px] md:text-[9px] font-mono mt-1 px-2 py-0.5 rounded ${isReached ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-600'}`}>LVL {def.minRank}</div>{!isReached && (<div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm"><Lock className="w-5 h-5 md:w-6 md:h-6 text-gray-500" /></div>)}</MotionDiv>{isCurrent && (<div className="absolute -bottom-8 flex flex-col items-center animate-bounce"><div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[8px] border-b-cyan-400"></div><span className="text-[10px] font-bold text-cyan-400 tracking-widest bg-cyan-900/50 px-2 py-0.5 rounded mt-1 border border-cyan-500/30">YOU</span></div>)}{def.reward && (<MotionDiv initial={{ opacity: 0, y: 10 }} whileHover={{ opacity: 1, y: 0, scale: 1.05 }} className={`absolute -top-24 md:-top-32 left-1/2 -translate-x-1/2 p-2 md:p-3 rounded-lg border backdrop-blur-md w-40 md:w-48 flex flex-col items-center text-center transition-all duration-300 shadow-xl opacity-60 hover:opacity-100 hover:z-50 ${isReached ? 'bg-gray-900/90 border-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.15)] opacity-100' : 'bg-black/80 border-white/10'}`}><div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 rotate-45 bg-gray-900 border-r border-b ${isReached ? 'border-yellow-500/50' : 'border-white/10'}`}></div><div className="flex items-center gap-2 mb-2 w-full justify-center border-b border-white/5 pb-2">{def.reward.type === 'SKIN' ? <ShoppingBag className={`w-3 h-3 md:w-4 md:h-4 ${isReached ? 'text-pink-400' : 'text-gray-500'}`} /> : <Gift className={`w-3 h-3 md:w-4 md:h-4 ${isReached ? 'text-green-400' : 'text-gray-500'}`} />}<span className="text-[9px] font-bold text-gray-400 tracking-wider">{t('rank_reward')}</span></div><div className={`text-[10px] md:text-xs font-bold font-sans ${isReached ? 'text-white' : 'text-gray-500'}`}>{def.reward.label}</div>{isReached ? (<div className="mt-2 text-[8px] md:text-[9px] bg-green-500/20 text-green-400 px-3 py-1 rounded-full border border-green-500/30 flex items-center gap-1 font-bold"><CheckCircle className="w-3 h-3" /> {t('rank_acquired')}</div>) : (<div className="mt-2 text-[8px] md:text-[9px] text-gray-500 font-mono">{t('rank_reach_lvl')} {def.minRank}</div>)}</MotionDiv>)}</MotionDiv>);}) }</div></MotionDiv></div></MotionDiv>)}</AnimatePresence>
    </div>
  );
};
