
import { Peer } from 'peerjs';
import { Entity, Particle, NetInput, NetSnapshot, ChatMessage } from '../types';
import { GameContext } from './GameContext';
import { recycleEntity, recycleParticle, removeEntity } from './Spawner';
import { lerp, lerpAngle } from './utils';

export type NetworkRole = 'OFFLINE' | 'HOST' | 'CLIENT';

export class NetworkManager {
    peer: Peer | null = null;
    role: NetworkRole = 'OFFLINE';
    connections: any[] = []; 
    hostConnection: any | null = null; 
    myId: string = '';
    
    latestInput: Map<string, NetInput> = new Map(); 
    latestSnapshot: NetSnapshot | null = null; 
    
    onChatMessage: ((msg: ChatMessage) => void) | null = null;
    onPlayerDisconnect: ((peerId: string) => void) | null = null;
    onHostDisconnect: (() => void) | null = null;

    constructor() {
        this.latestInput = new Map();
    }

    destroy() {
        this.connections.forEach(c => c.close());
        this.connections = [];
        if (this.hostConnection) this.hostConnection.close();
        if (this.peer) this.peer.destroy();
        this.role = 'OFFLINE';
    }

    async init(role: NetworkRole, roomId?: string): Promise<string> {
        this.role = role;
        return new Promise((resolve, reject) => {
            if (role === 'OFFLINE') {
                this.myId = `local-${Math.random().toString(36).substr(2, 9)}`;
                resolve(this.myId);
                return;
            }

            let hasSwitched = false;
            let connectionTimeout: any = null;

            const switchToHost = async () => {
                if (hasSwitched) return;
                hasSwitched = true;
                if (connectionTimeout) clearTimeout(connectionTimeout);
                if (this.peer) {
                    this.peer.removeAllListeners();
                    this.peer.destroy();
                    this.peer = null;
                }
                // Random delay to avoid simultaneous hosting collisions
                await new Promise(r => setTimeout(r, Math.random() * 500 + 200));
                this.init('HOST', roomId).then(resolve).catch(reject);
            };

            if (role === 'CLIENT' && roomId) {
                 this.peer = new Peer({ debug: 1 });
                 this.peer.on('open', (id) => {
                     this.myId = id;
                     connectionTimeout = setTimeout(() => {
                         if (!hasSwitched) switchToHost();
                     }, 4000);

                     const conn = this.peer!.connect(roomId, { reliable: false });
                     conn.on('open', () => {
                         if (hasSwitched) { conn.close(); return; }
                         clearTimeout(connectionTimeout);
                         this.hostConnection = conn;
                         conn.on('data', (data: any) => {
                             if (data.type === 'SNAPSHOT') {
                                 this.latestSnapshot = data.payload;
                                 if (data.payload.chat) data.payload.chat.forEach((m: ChatMessage) => this.onChatMessage?.(m));
                             } else if (data.type === 'CHAT') {
                                 this.onChatMessage?.(data.payload);
                             }
                         });
                         conn.on('close', () => this.onHostDisconnect?.());
                         resolve(roomId);
                     });
                 });
                 this.peer.on('error', (err: any) => { if (!hasSwitched) switchToHost(); });
            } else if (role === 'HOST' && roomId) {
                 this.role = 'HOST';
                 this.peer = new Peer(roomId, { debug: 1 });
                 this.peer.on('open', (id) => { this.myId = id; resolve(id); });
                 this.peer.on('connection', (conn) => {
                    this.connections.push(conn);
                    conn.on('data', (data: any) => {
                        if (data.type === 'INPUT') this.latestInput.set(conn.peer, data.payload);
                        else if (data.type === 'CHAT') {
                            this.onChatMessage?.(data.payload);
                            this.broadcastChat(data.payload);
                        }
                    });
                    conn.on('close', () => {
                        this.connections = this.connections.filter(c => c.peer !== conn.peer);
                        this.latestInput.delete(conn.peer);
                        this.onPlayerDisconnect?.(conn.peer);
                    });
                 });
                 this.peer.on('error', (err: any) => {
                     if (err.type === 'unavailable-id') switchToHost();
                     else reject(err);
                 });
            }
        });
    }

    applySnapshot(context: GameContext, predictionEnabled: boolean, interpDelay: number) {
        if (!this.latestSnapshot) return;
        const snap = this.latestSnapshot;
        const matchedIds = new Set<string>();
        const lerpFactor = 0.15; // Balanced interpolation

        snap.entities.forEach(sData => {
            if (!sData.id) return;
            matchedIds.add(sData.id);
            let local = context.entities.current.find(e => e.id === sData.id);
            
            if (local) {
                const isMyPlayer = local.ownerId === this.myId;
                if (sData.position && !isMyPlayer) {
                    local.position.x = lerp(local.position.x, sData.position.x, lerpFactor);
                    local.position.y = lerp(local.position.y, sData.position.y, lerpFactor);
                }
                if (sData.rotation !== undefined && !isMyPlayer) local.rotation = lerpAngle(local.rotation, sData.rotation, 0.2);
                if (sData.health !== undefined) local.health = sData.health;
                if (sData.maxHealth !== undefined) local.maxHealth = sData.maxHealth;
                if (sData.score !== undefined) local.score = sData.score;
                if (sData.level !== undefined) local.level = sData.level;
                if (sData.weaponId) local.weaponId = sData.weaponId;
            } else {
                const newEnt = recycleEntity(context, sData);
                // DROP-IN EFFECT FOR NEW ENTITIES
                // @ts-ignore
                newEnt.isDropIn = true; 
                // @ts-ignore
                newEnt.dropInTimer = 60;
                context.entities.current.push(newEnt);
            }
        });

        // Instant cleanup of dead/left entities
        for (let i = context.entities.current.length - 1; i >= 0; i--) {
            const e = context.entities.current[i];
            if (!matchedIds.has(e.id) && e.type !== 'WALL' && e.type !== 'ZONE') {
                removeEntity(context, i);
            }
        }
        
        if (snap.particles) context.particles.current = snap.particles.map(d => recycleParticle(context, d));
    }

    broadcastSnapshot(entities: Entity[], particles: Particle[]) {
        if (this.role !== 'HOST') return;
        const snapshot: NetSnapshot = {
            entities: entities.map(e => ({
                id: e.id, type: e.type, position: e.position, radius: e.radius, rotation: e.rotation,
                color: e.color, health: e.health, maxHealth: e.maxHealth, weaponId: e.weaponId,
                teamId: e.teamId, name: e.name, ownerId: e.ownerId, score: e.score, level: e.level
            })),
            particles: particles.slice(0, 30).map(p => ({
                id: p.id, position: p.position, size: p.size, color: p.color, life: p.life, type: p.type
            })),
            timestamp: Date.now()
        };
        this.connections.forEach(conn => conn.send({ type: 'SNAPSHOT', payload: snapshot }));
    }

    broadcastChat(msg: ChatMessage) {
        if (this.role !== 'HOST') return;
        this.connections.forEach(conn => conn.send({ type: 'CHAT', payload: msg }));
    }

    getClientInput(peerId: string): NetInput | undefined {
        return this.latestInput.get(peerId);
    }

    sendInput(input: NetInput) {
        if (this.role !== 'CLIENT' || !this.hostConnection) return;
        this.hostConnection.send({ type: 'INPUT', payload: input });
    }

    sendChat(msg: ChatMessage) {
        if (this.role === 'HOST') this.broadcastChat(msg);
        else if (this.hostConnection) this.hostConnection.send({ type: 'CHAT', payload: msg });
    }
}
