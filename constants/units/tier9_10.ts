
import { WeaponSchema } from '../../types';

// --- TIER 9 (LVL 120) - COSMIC ---
export const TIER_9_UNITS: WeaponSchema[] = [
  { id: 'world_eater', name: 'World Eater', description: 'Consumes.', tier: 120, type: 'Ram', bodyType: 'Saw', barrels: [], stats: {damage:500,reload:0,range:0,speed:2,spread:0,recoil:0,bulletSize:0,bulletCount:0}, skill: {type:'GRAVITY_WELL',name:'Devour',cooldown:1200,duration:600} },
  { id: 'time_keeper', name: 'Time Keeper', description: 'Controls flow.', tier: 120, type: 'Bullet', bodyType: 'Octagon', barrels: [0, Math.PI/2, Math.PI, -Math.PI/2].map(a => ({offset:0,width:40,length:80,angle:a,delay:0,type:'Trapezoid' as const})), stats: {damage:80,reload:30,range:200,speed:15,spread:0,recoil:0,bulletSize:10,bulletCount:1}, skill: {type:'CHRONO_FIELD',name:'Stop',cooldown:1500,duration:300} },
  { id: 'galaxy', name: 'Galaxy', description: 'Spins stars.', tier: 120, type: 'Swarm', bodyType: 'Star', barrels: Array.from({length:8},(_,i)=>({offset:0,width:30,length:60,angle:i*Math.PI*2/8,delay:0})), stats: {damage:10,reload:5,range:200,speed:0,spread:0.5,recoil:0,bulletSize:6,bulletCount:60}, skill: {type:'REPEL',name:'Expansion',cooldown:600,duration:120} },
  { id: 'oblivion', name: 'Oblivion', description: 'Erasure.', tier: 120, type: 'Bullet', bodyType: 'Diamond', barrels: [{offset:0,width:100,length:120,angle:0,delay:0},{offset:0,width:110,length:80,angle:0,delay:0,type:'Construct' as const}], stats: {damage:1000,reload:300,range:500,speed:40,spread:0,recoil:100,bulletSize:30,bulletCount:1}, skill: {type:'ORBITAL_BEAM',name:'Erase',cooldown:2000,duration:60} },
  { id: 'hyperion', name: 'Hyperion', description: 'Orbit barrage.', tier: 120, type: 'Laser', barrels: [{offset:0,width:50,length:150,angle:0,delay:0},{offset:30,width:20,length:100,angle:0,delay:5},{offset:-30,width:20,length:100,angle:0,delay:5}], stats: {damage:200,reload:10,range:400,speed:50,spread:0,recoil:20,bulletSize:12,bulletCount:1}, skill: {type:'ORBITAL_BEAM',name:'Ion Cannon',cooldown:600,duration:120} },
  { id: 'dimension_rift', name: 'Rift Walker', description: 'Reality tear.', tier: 120, type: 'Bullet', bodyType: 'Crescent', barrels: [{offset:0,width:40,length:100,angle:0,delay:0},{offset:0,width:20,length:120,angle:0,delay:0}], stats: {damage:300,reload:60,range:300,speed:20,spread:0,recoil:10,bulletSize:15,bulletCount:1}, skill: {type:'TELEPORT',name:'Warp',cooldown:300,duration:20} },
  { id: 'absolute_zero_v2', name: 'Kelvin', description: 'Universe Freeze.', tier: 120, type: 'Flamethrower', barrels: Array.from({length:4},(_,i)=>({offset:0,width:50,length:90,angle:i*Math.PI/2,delay:0,type:'Construct' as const})), stats: {damage:20,reload:1,range:120,speed:15,spread:0.6,recoil:0,bulletSize:25,bulletCount:1}, effect: 'FREEZE', skill: {type:'CHRONO_FIELD',name:'Stasis Field',cooldown:1500,duration:500} },
  { id: 'zeus_prime', name: 'Olympus', description: 'Thunder God.', tier: 120, type: 'Tesla', barrels: [{offset:0,width:80,length:100,angle:0,delay:0},{offset:40,width:20,length:80,angle:0.3,delay:0},{offset:-40,width:20,length:80,angle:-0.3,delay:0}], stats: {damage:15,reload:1,range:600,speed:0,spread:0,recoil:0,bulletSize:0,bulletCount:20}, effect: 'SHOCK', skill: {type:'THUNDER_STORM',name:'Judgement',cooldown:800,duration:100} },
  { id: 'bio_hazard_max', name: 'Plaguebringer', description: 'End of Life.', tier: 120, type: 'Trap', barrels: Array.from({length:6},(_,i)=>({offset:0,width:40,length:70,angle:i*Math.PI/3,delay:0,type:'Injector' as const})), stats: {damage:50,reload:20,range:200,speed:10,spread:0.4,recoil:5,bulletSize:15,bulletCount:1}, effect: 'CORROSION', skill: {type:'GRAVITY_WELL',name:'Decay',cooldown:1500,duration:400} }
];

// --- TIER 10 (LVL 150) - UNIVERSAL ---
export const TIER_10_UNITS: WeaponSchema[] = [
  { id: 'zenith', name: 'Zenith', description: 'Peak.', tier: 150, type: 'Bullet', bodyType: 'Star', barrels: [...Array.from({length:6},(_,i)=>({offset:0,width:40,length:90,angle:i*Math.PI/3,delay:0})),...Array.from({length:6},(_,i)=>({offset:0,width:20,length:40,angle:i*Math.PI/3 + Math.PI/6,delay:0,type:'Auto' as const}))], stats: {damage:300,reload:10,range:250,speed:10,spread:0,recoil:0,bulletSize:12,bulletCount:1}, skill: {type:'TIME_WARP',name:'Ascend',cooldown:3000,duration:600} },
  { id: 'entropy', name: 'Entropy', description: 'Heat death.', tier: 150, type: 'Flamethrower', bodyType: 'Octagon', barrels: Array.from({length:12},(_,i)=>({offset:0,width:30,length:80,angle:i*Math.PI/6,delay:i*2,type:'Trapezoid' as const})), stats: {damage:50,reload:1,range:150,speed:15,spread:0.5,recoil:0,bulletSize:20,bulletCount:1}, effect: 'BURN', skill: {type:'GRAVITY_WELL',name:'Chaos',cooldown:1200,duration:300} },
  { id: 'singularity_prime', name: 'The Void', description: 'End.', tier: 150, type: 'Ram', bodyType: 'Diamond', barrels: [], stats: {damage:9999,reload:0,range:0,speed:5,spread:0,recoil:0,bulletSize:0,bulletCount:0}, skill: {type:'GRAVITY_WELL',name:'Event Horizon',cooldown:100,duration:999} },
  { id: 'genesis', name: 'Genesis', description: 'Creator.', tier: 150, type: 'Builder', bodyType: 'Square', barrels: [0, Math.PI/2, Math.PI, -Math.PI/2].map(a => ({offset:0,width:80,length:100,angle:a,delay:0,type:'Construct' as const})), stats: {damage:200,reload:60,range:500,speed:0,spread:0,recoil:0,bulletSize:40,bulletCount:8}, skill: {type:'CONSTRUCT_WALL',name:'Big Bang',cooldown:5000,duration:3000} },
  { id: 'alpha_omega', name: 'Alpha Omega', description: 'Cycle.', tier: 150, type: 'Bullet', bodyType: 'Octagon', barrels: [{offset:0,width:100,length:150,angle:0,delay:0},{offset:0,width:40,length:60,angle:Math.PI,delay:0,type:'Injector' as const},{offset:60,width:30,length:80,angle:0.2,delay:0},{offset:-60,width:30,length:80,angle:-0.2,delay:0}], stats: {damage:500,reload:50,range:400,speed:20,spread:0,recoil:50,bulletSize:15,bulletCount:1}, skill: {type:'BERSERK',name:'Duality',cooldown:2000,duration:500} },
  { id: 'celestial_dragon', name: 'Dragon', description: 'Mythic.', tier: 150, type: 'Flamethrower', bodyType: 'Crescent', barrels: [{offset:0,width:80,length:120,angle:0,delay:0,type:'Trapezoid' as const},{offset:30,width:40,length:80,angle:0.4,delay:0},{offset:-30,width:40,length:80,angle:-0.4,delay:0}], stats: {damage:100,reload:1,range:300,speed:20,spread:0.3,recoil:10,bulletSize:30,bulletCount:1}, effect: 'BURN', skill: {type:'DASH',name:'Draconic Dash',cooldown:1000,duration:100} },
  { id: 'multiverse', name: 'Multiverse', description: 'Everywhere.', tier: 150, type: 'Drone', bodyType: 'Star', barrels: Array.from({length:10},(_,i)=>({offset:0,width:40,length:60,angle:i*Math.PI/5,delay:0,type:'Trapezoid' as const})), stats: {damage:50,reload:20,range:0,speed:0,spread:0,recoil:0,bulletSize:15,bulletCount:100}, skill: {type:'REPEL',name:'Expand',cooldown:1200,duration:200} },
  
  // REBALANCED SUPERNOVA (SINGLE BARREL, EXTREME RECOIL)
  { 
    id: 'supernova', name: 'Supernova', description: 'Stellar Collapse.', tier: 150, type: 'Bullet', bodyType: 'Star', 
    barrels: [
        // JUST ONE MAIN RAIL FOR PHYSICS
        {offset:0, width:60, length:140, angle:0, delay:0} 
    ],
    // Extreme Recoil (200), Slow reload, Massive damage
    stats: {damage: 400, reload: 200, range: 450, speed: 12, spread: 0, recoil: 200, bulletSize: 40, bulletCount: 1}, 
    skill: {type: 'ORBITAL_BEAM', name: 'Gamma Burst', cooldown: 2000, duration: 100}
  }
];
