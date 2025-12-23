
import { WeaponSchema } from '../../types';

export const TIER_1_UNITS: WeaponSchema[] = [
  {
    id: 'basic', name: 'Vanguard', description: 'The Core Prototype.', tier: 1, type: 'Bullet',
    barrels: [{ offset: 0, width: 22, length: 45, angle: 0, delay: 0 }],
    stats: { damage: 20, reload: 25, range: 60, speed: 6, spread: 0.05, recoil: 3, bulletSize: 9, bulletCount: 1 },
    skill: { type: 'DASH', name: 'Dash', cooldown: 300, duration: 15 }
  }
];

export const TIER_2_UNITS: WeaponSchema[] = [
  // --- STANDARD ---
  { id: 'twin', name: 'Twin', description: 'Double DPS.', tier: 15, type: 'Bullet', barrels: [{offset:5,width:20,length:42,angle:0,delay:0},{offset:-5,width:20,length:42,angle:0,delay:10}], stats: {damage:14,reload:18,range:60,speed:6,spread:0.05,recoil:3,bulletSize:9,bulletCount:1}, skill: {type:'BARRAGE',name:'Rapid Fire',cooldown:600,duration:60} },
  { id: 'sniper', name: 'Sniper', description: 'Long range.', tier: 15, type: 'Bullet', barrels: [{offset:0,width:24,length:75,angle:0,delay:0},{offset:0,width:28,length:30,angle:0,delay:0,type:'Trapezoid'}], stats: {damage:45,reload:50,range:120,speed:12,spread:0,recoil:8,bulletSize:9,bulletCount:1}, skill: {type:'STEALTH',name:'Camouflage',cooldown:900,duration:240} },
  { id: 'machine_gun', name: 'Machine Gun', description: 'Spray and pray.', tier: 15, type: 'Bullet', barrels: [{offset:0,width:26,length:38,angle:0,delay:0,type:'Trapezoid'}], stats: {damage:12,reload:8,range:45,speed:7,spread:0.4,recoil:2,bulletSize:8,bulletCount:1}, skill: {type:'FOCUS',name:'Precision',cooldown:400,duration:90} },
  { id: 'flank_guard', name: 'Flank Guard', description: 'Rear defense.', tier: 15, type: 'Bullet', barrels: [{offset:0,width:22,length:45,angle:0,delay:0},{offset:0,width:22,length:35,angle:Math.PI,delay:0}], stats: {damage:20,reload:25,range:60,speed:6,spread:0.05,recoil:3,bulletSize:9,bulletCount:1}, skill: {type:'EMP',name:'Stun Wave',cooldown:600,duration:30} },
  { id: 'director', name: 'Director', description: 'Drone controller.', tier: 15, type: 'Drone', barrels: [{offset:0,width:36,length:40,angle:0,delay:0,type:'Trapezoid'}], stats: {damage:15,reload:70,range:0,speed:0,spread:0,recoil:0,bulletSize:9,bulletCount:2}, skill: {type:'REPEL',name:'Scramble',cooldown:400,duration:60} },
  { id: 'pounder', name: 'Pounder', description: 'Heavy artillery.', tier: 15, type: 'Bullet', barrels: [{offset:0,width:40,length:50,angle:0,delay:0}], stats: {damage:60,reload:70,range:70,speed:5,spread:0,recoil:15,bulletSize:10,bulletCount:1}, skill: {type:'SHIELD',name:'Hard Shell',cooldown:600,duration:120} },
  { id: 'trapper_proto', name: 'Layer', description: 'Defensive mines.', tier: 15, type: 'Trap', barrels: [{offset:0,width:40,length:35,angle:0,delay:0,type:'Trapezoid'}], stats: {damage:20,reload:40,range:100,speed:4,spread:0,recoil:0,bulletSize:12,bulletCount:1}, skill: {type:'FORTIFY',name:'Reinforce',cooldown:900,duration:180} },
  { id: 'smasher_proto', name: 'Smasher', description: 'Hull rammer.', tier: 15, type: 'Ram', bodyType: 'Hexagon', barrels: [], stats: {damage:0,reload:0,range:0,speed:0,spread:0,recoil:0,bulletSize:0,bulletCount:0}, skill: {type:'BERSERK',name:'Rage',cooldown:600,duration:120} },
  
  // --- NEW ARCHETYPES (Tier 2 Expansion) ---
  { id: 'wave', name: 'Resonator', description: 'Sonic waves.', tier: 15, type: 'Sonic', barrels: [{offset:0,width:40,length:40,angle:0,delay:0,type:'Dish'}], stats: {damage:10,reload:35,range:80,speed:5,spread:0,recoil:2,bulletSize:12,bulletCount:1}, skill: {type:'EMP',name:'Pulse',cooldown:500,duration:20} },
  { id: 'laser_proto', name: 'Beamer', description: 'Instant hit laser.', tier: 15, type: 'Laser', barrels: [{offset:0,width:18,length:55,angle:0,delay:0}], stats: {damage:15,reload:40,range:100,speed:20,spread:0,recoil:1,bulletSize:5,bulletCount:1}, skill: {type:'FOCUS',name:'Charge',cooldown:400,duration:60} },
  { id: 'bio_proto', name: 'Spitter', description: 'Corrosive shot.', tier: 15, type: 'Bullet', barrels: [{offset:0,width:24,length:50,angle:0,delay:0,type:'Injector'}], stats: {damage:12,reload:30,range:70,speed:7,spread:0.1,recoil:2,bulletSize:8,bulletCount:1}, effect: 'CORROSION', skill: {type:'EMP',name:'Toxin',cooldown:800,duration:120} },
  { id: 'construct_proto', name: 'Assembler', description: 'Block builder.', tier: 15, type: 'Builder', bodyType: 'Square', barrels: [{offset:0,width:30,length:45,angle:0,delay:0,type:'Construct'}], stats: {damage:10,reload:45,range:90,speed:3,spread:0,recoil:5,bulletSize:12,bulletCount:1}, skill: {type:'CONSTRUCT_WALL',name:'Block',cooldown:800,duration:100} },
  { id: 'healer_proto', name: 'Medic', description: 'Support unit.', tier: 15, type: 'Healer', bodyType: 'Cross', barrels: [{offset:0,width:20,length:45,angle:0,delay:0,type:'Injector'}], stats: {damage:5,reload:20,range:80,speed:8,spread:0,recoil:2,bulletSize:8,bulletCount:1}, effect: 'HEAL', skill: {type:'SHIELD',name:'Aura',cooldown:900,duration:200} }
];
