
import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { ArrowLeft, ShoppingBag, Lock, Unlock, Star, Zap, Shield, Crosshair, Hexagon, Wind, Flag, RefreshCw } from 'lucide-react';
import { Persistence, SHOP_ITEMS, Rarity } from '../engine/Persistence';
import { AccountData, SkinId, TrailId, FlagId } from '../types';
import { soundManager } from '../engine/SoundManager';
import { TankPreview } from './TankPreview';
import { EVOLUTION_TREE, COLORS } from '../constants';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { ImageCache } from '../engine/ImageCache';

// Fix for strict TypeScript environments where motion types might conflict
const MotionDiv = motion.div as any;

interface ShopProps {
  onBack: () => void;
  onPurchase: () => void; // Trigger update in parent
}

const RarityColors: Record<Rarity, string> = {
    'COMMON': 'border-gray-600 text-gray-400',
    'RARE': 'border-blue-500 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.3)]',
    'EPIC': 'border-purple-500 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.4)]',
    'LEGENDARY': 'border-yellow-500 text-yellow-400 shadow-[0_0_20px_rgba(234,179,8,0.5)]',
    'MYTHIC': 'border-red-500 text-red-500 shadow-[0_0_25px_rgba(239,68,68,0.6)] animate-pulse',
};

const RarityBg: Record<Rarity, string> = {
    'COMMON': 'bg-gray-800',
    'RARE': 'bg-blue-900/40',
    'EPIC': 'bg-purple-900/40',
    'LEGENDARY': 'bg-yellow-900/40',
    'MYTHIC': 'bg-red-900/40',
};

export const Shop: React.FC<ShopProps> = ({ onBack, onPurchase }) => {
  const { t } = useTranslation();
  const [account, setAccount] = useState<AccountData>(Persistence.load());
  const [activeTab, setActiveTab] = useState<'SKIN' | 'TRAIL' | 'FLAG'>('SKIN');
  const [selectedItem, setSelectedItem] = useState(SHOP_ITEMS.find(i => i.type === 'SKIN') || SHOP_ITEMS[0]);
  
  // Force re-render to load images if not ready
  const [, setTick] = useState(0);
  useEffect(() => {
      if (activeTab === 'FLAG') {
          const interval = setInterval(() => setTick(t => t+1), 500);
          return () => clearInterval(interval);
      }
  }, [activeTab]);

  const previewWeapon = EVOLUTION_TREE.find(w => w.id === 'tank') || EVOLUTION_TREE[0];

  const handleBuy = () => {
      // @ts-ignore
      if (Persistence.unlockItem(selectedItem.type, selectedItem.id, selectedItem.cost)) {
          soundManager.playKillConfirm(); 
          const updated = Persistence.load();
          setAccount(updated);
          onPurchase();
      }
  };

  const handleEquip = () => {
      // @ts-ignore
      Persistence.equipItem(selectedItem.type, selectedItem.id);
      const updated = Persistence.load();
      setAccount(updated);
      soundManager.playUiClick();
      onPurchase();
  };

  const filteredItems = SHOP_ITEMS.filter(item => item.type === activeTab);

  const isUnlocked = selectedItem.type === 'SKIN' 
      ? account.unlockedSkins.includes(selectedItem.id as SkinId)
      : selectedItem.type === 'TRAIL' 
      ? (account.unlockedTrails || []).includes(selectedItem.id as TrailId)
      : (account.unlockedFlags || []).includes(selectedItem.id as FlagId);

  const isEquipped = selectedItem.type === 'SKIN'
      ? account.equippedSkin === selectedItem.id
      : selectedItem.type === 'TRAIL'
      ? account.equippedTrail === selectedItem.id
      : account.equippedFlag === selectedItem.id;

  const canAfford = account.currency >= selectedItem.cost;

  // Determine Preview Props
  const previewColor = selectedItem.type === 'SKIN' ? selectedItem.color : (
      SHOP_ITEMS.find(i => i.id === account.equippedSkin && i.type === 'SKIN')?.color || COLORS.player
  );
  
  const previewTrail = selectedItem.type === 'TRAIL' ? selectedItem.id as TrailId : account.equippedTrail;
  const previewFlag = selectedItem.type === 'FLAG' ? selectedItem.id as FlagId : account.equippedFlag;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-8 bg-black/90">
      <div className="glass-panel w-full h-full md:max-w-7xl md:h-[85vh] flex flex-col md:flex-row rounded-none md:rounded-xl overflow-hidden shadow-2xl border-0 md:border border-white/10">
        
        {/* LEFT COLUMN: Categories & Items */}
        <div className="w-full md:w-5/12 bg-black/40 border-t md:border-t-0 md:border-r border-white/10 flex flex-col h-[55%] md:h-full order-2 md:order-1">
           {/* Header */}
           <div className="p-4 border-b border-white/10 flex items-center gap-4 bg-cyan-900/10 shrink-0 pt-safe-top">
               <Button onClick={onBack} variant="secondary" className="px-3 py-2 text-xs">
                   <ArrowLeft className="w-4 h-4" />
               </Button>
               <div className="flex-1">
                   <h2 className="font-sans font-black text-white tracking-widest text-xl">{t('shop_title')}</h2>
                   <div className="text-xs font-mono text-yellow-400 flex items-center gap-1">
                       <Star className="w-3 h-3 fill-yellow-400" />
                       {account.currency.toLocaleString()} DUST
                   </div>
               </div>
           </div>

           {/* Tabs */}
           <div className="flex p-2 gap-2 border-b border-white/10 bg-black/20">
               <button 
                  onClick={() => { setActiveTab('SKIN'); setSelectedItem(SHOP_ITEMS.find(i=>i.type==='SKIN')!); }}
                  className={`flex-1 py-3 rounded font-bold font-mono text-xs flex items-center justify-center gap-2 transition-all ${activeTab === 'SKIN' ? 'bg-cyan-500 text-black shadow-lg' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
               >
                   <Hexagon className="w-4 h-4" /> CHASSIS
               </button>
               <button 
                  onClick={() => { setActiveTab('TRAIL'); setSelectedItem(SHOP_ITEMS.find(i=>i.type==='TRAIL')!); }}
                  className={`flex-1 py-3 rounded font-bold font-mono text-xs flex items-center justify-center gap-2 transition-all ${activeTab === 'TRAIL' ? 'bg-pink-500 text-black shadow-lg' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
               >
                   <Wind className="w-4 h-4" /> ENGINES
               </button>
               <button 
                  onClick={() => { setActiveTab('FLAG'); setSelectedItem(SHOP_ITEMS.find(i=>i.type==='FLAG')!); }}
                  className={`flex-1 py-3 rounded font-bold font-mono text-xs flex items-center justify-center gap-2 transition-all ${activeTab === 'FLAG' ? 'bg-yellow-500 text-black shadow-lg' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
               >
                   <Flag className="w-4 h-4" /> EMBLEMS
               </button>
           </div>
           
           {/* Item Grid */}
           <div className="flex-1 overflow-y-auto custom-scrollbar p-3 pb-20 md:pb-3">
               <div className="grid grid-cols-2 gap-3">
                   {filteredItems.map(item => {
                       const unlocked = item.type === 'SKIN' 
                           ? account.unlockedSkins.includes(item.id as SkinId) 
                           : item.type === 'TRAIL'
                           ? (account.unlockedTrails || []).includes(item.id as TrailId)
                           : (account.unlockedFlags || []).includes(item.id as FlagId);

                       const equipped = item.type === 'SKIN' 
                           ? account.equippedSkin === item.id 
                           : item.type === 'TRAIL'
                           ? account.equippedTrail === item.id
                           : account.equippedFlag === item.id;
                       
                       const isFlag = item.type === 'FLAG';

                       return (
                           <button
                               key={item.id}
                               onClick={() => { setSelectedItem(item); soundManager.playUiHover(); }}
                               className={`
                                   relative flex flex-col p-3 rounded border-2 transition-all group overflow-hidden
                                   ${selectedItem.id === item.id ? 'border-white bg-white/10 scale-[1.02]' : `${RarityColors[item.rarity].split(' ')[0].replace('text','border').replace('shadow','')} bg-black/40 hover:bg-white/5`}
                               `}
                           >
                               {/* Rarity Stripe */}
                               <div className={`absolute top-0 right-0 px-2 py-0.5 text-[8px] font-bold font-mono ${RarityBg[item.rarity]} text-white rounded-bl z-10`}>
                                   {item.rarity}
                               </div>

                               <div className="flex-1 flex items-center justify-center mb-2 pt-4">
                                   {isFlag ? (
                                       // --- NEW FLAG RENDERING (Rectangular & High Detail) ---
                                       <div className="w-20 h-14 rounded-md shadow-lg border border-white/20 bg-[#050508] relative overflow-hidden group-hover:border-white/40 transition-colors">
                                            {item.id === 'NONE' ? (
                                                <div className="w-full h-full flex items-center justify-center bg-white/5">
                                                    <Shield className="w-6 h-6 text-gray-600" />
                                                </div>
                                            ) : (
                                                <>
                                                    <img 
                                                        src={`https://flagcdn.com/w160/${item.id.toLowerCase()}.png`} 
                                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                        alt={item.name}
                                                        loading="lazy"
                                                        onLoad={() => ImageCache.getFlag(item.id)}
                                                    />
                                                    {/* Gloss / Fabric Overlay */}
                                                    <div className="absolute inset-0 bg-gradient-to-tr from-black/40 via-transparent to-white/10 pointer-events-none"></div>
                                                    {/* Subtle Scanline for tech feel */}
                                                    <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.2)_1px,transparent_1px)] bg-[length:3px_100%] opacity-20 pointer-events-none"></div>
                                                </>
                                            )}
                                       </div>
                                   ) : item.type === 'SKIN' ? (
                                       <div className="w-12 h-12 rounded-full shadow-lg border-2 border-white/20" style={{ backgroundColor: item.color }}></div>
                                   ) : (
                                       // TRAIL
                                       <div className="w-12 h-12 rounded-full shadow-lg border-2 border-white/20 bg-black flex items-center justify-center relative overflow-hidden">
                                           <Wind className="w-6 h-6 text-gray-500" />
                                           <div className={`absolute inset-0 opacity-30 ${item.id === 'RAINBOW' ? 'bg-gradient-to-r from-red-500 via-green-500 to-blue-500' : (item.id === 'FIRE' ? 'bg-orange-500' : 'bg-gray-500')}`}></div>
                                       </div>
                                   )}
                               </div>

                               <div className="text-left w-full relative z-10">
                                   <div className={`font-bold font-sans text-xs truncate ${selectedItem.id === item.id ? 'text-white' : 'text-gray-300'}`}>{item.name}</div>
                                   <div className="flex justify-between items-center mt-1">
                                       <div className="text-[10px] font-mono text-gray-500">{item.cost === 0 ? 'FREE' : item.cost}</div>
                                       {equipped ? <div className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_5px_#0f0]"></div> : 
                                        !unlocked ? <Lock className="w-3 h-3 text-gray-600" /> : null}
                                   </div>
                               </div>
                           </button>
                       );
                   })}
               </div>
           </div>
        </div>

        {/* RIGHT COLUMN: Preview & Actions */}
        <div className="flex-1 relative bg-gradient-to-br from-[#0a0a10] to-[#151520] flex flex-col h-[45%] md:h-full order-1 md:order-2">
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none"></div>
            <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none"></div>
            
            <div className="flex-1 flex items-center justify-center relative min-h-0">
                {/* Dynamic Glow based on item */}
                <div 
                    className="absolute w-64 h-64 bg-cyan-500/10 rounded-full blur-[80px] animate-pulse transition-colors duration-500"
                    style={{ backgroundColor: selectedItem.type === 'SKIN' ? selectedItem.color : '#ffffff' }}
                ></div>
                
                <MotionDiv 
                    key={selectedItem.id}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", damping: 15 }}
                    className="relative z-10 transform scale-150 md:scale-[2.5]"
                >
                    <TankPreview 
                        weapon={previewWeapon} 
                        size={120} 
                        color={previewColor} 
                        trailId={previewTrail} 
                        flagId={previewFlag} // Pass flag ID to preview
                        className="drop-shadow-2xl" 
                    />
                </MotionDiv>

                <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-8 text-white/20 font-mono text-[10px] tracking-[0.3em]">
                    <span>PREVIEW // {activeTab}</span>
                </div>
            </div>

            <div className="p-6 md:p-8 border-t border-white/10 bg-black/60 backdrop-blur-md">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <div className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded inline-block mb-2 ${RarityBg[selectedItem.rarity]} ${RarityColors[selectedItem.rarity].split(' ')[1]}`}>
                            {selectedItem.rarity} CLASS
                        </div>
                        <h1 className="text-2xl md:text-4xl font-black text-white font-sans uppercase mb-1 drop-shadow-lg">{selectedItem.name}</h1>
                        <p className="text-gray-400 font-mono text-xs md:text-sm">{selectedItem.desc}</p>
                    </div>
                    <div className="text-right">
                         <div className="text-[10px] text-gray-500 font-mono mb-1">{t('shop_cost')}</div>
                         <div className={`text-2xl md:text-3xl font-bold font-mono flex items-center justify-end gap-2 ${canAfford || isUnlocked ? 'text-white' : 'text-red-500'}`}>
                             {selectedItem.cost === 0 ? 'FREE' : selectedItem.cost.toLocaleString()} <span className="text-sm text-yellow-500">DUST</span>
                         </div>
                    </div>
                </div>

                <div className="h-14">
                    {isEquipped ? (
                        <Button variant="secondary" disabled className="w-full h-full opacity-50 cursor-default border-green-500/50 text-green-400 bg-green-500/10 text-sm md:text-lg tracking-widest">
                            <Shield className="w-5 h-5 mr-2" /> {t('shop_equipped')}
                        </Button>
                    ) : isUnlocked ? (
                        <Button variant="primary" onClick={handleEquip} className="w-full h-full bg-white/10 hover:bg-white/20 border-white/30 text-white text-sm md:text-lg tracking-widest">
                            {t('shop_equip')}
                        </Button>
                    ) : (
                        <Button variant="primary" onClick={handleBuy} disabled={!canAfford} className={`w-full h-full text-sm md:text-lg tracking-widest ${!canAfford ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}>
                            {canAfford ? <><ShoppingBag className="w-5 h-5 mr-2" /> {t('shop_buy')}</> : <><Lock className="w-5 h-5 mr-2" /> INSUFFICIENT FUNDS</>}
                        </Button>
                    )}
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};
