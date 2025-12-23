
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
    
    // Maps PeerID -> Input State
    latestInput: Map<string, NetInput> = new Map(); 
    latestSnapshot: NetSnapshot | null = null; 
    
    onChatMessage: ((msg: ChatMessage) => void) | null = null;
    onPlayerDisconnect: ((peerId: string) => void) | null = null;
    onHostDisconnect: (() => void) | null = null;
    
    // NEW: Callback when we successfully join and get our ID
    onGameJoined: ((myPlayerId: string) => void) | null = null;

    constructor() {
        this.latestInput = new Map();
    }

    destroy() {
        console.log('[NET] Destroying Network Manager...');
        this.connections.forEach(c => c.close());
        this.connections = [];
        if (this.hostConnection) {
            this.hostConnection.close();
            this.hostConnection = null;
        }
        if (this.peer) {
            this.peer.destroy();
            this.peer = null;
        }
        this.role = 'OFFLINE';
    }

    async init(role: NetworkRole, roomId?: string): Promise<string> {
        this.role = role;
        
        return new Promise((resolve, reject) => {
            if (role === 'OFFLINE') {
                this.myId = 'player-HOST'; // Offline plays as Host ID implicitly
                resolve(this.myId);
                return;
            }

            if (role === 'CLIENT' && roomId) {
                 this.peer = new Peer({ debug: 0 });
                 
                 this.peer.on('open', (id) => {
                     this.myId = id;
                     console.log(`[NET] Client ID: ${id}, Connecting to: ${roomId}`);
                     
                     const conn = this.peer!.connect(roomId, { reliable: false });
                     
                     conn.on('open', () => {
                         console.log(`[NET] Connected to Host.`);
                         this.hostConnection = conn;
                         
                         // Send HELLO to request join
                         conn.send({ type: 'HELLO', payload: { name: 'Player' } });

                         conn.on('data', (data: any) => {
                             if (data.type === 'WELCOME') {
                                 // Host assigned us an ID (usually our PeerID)
                                 console.log(`[NET] Joined Game as ${data.payload.id}`);
                                 if (this.onGameJoined) this.onGameJoined(data.payload.id);
                                 resolve(roomId);
                             } 
                             else if (data.type === 'SNAPSHOT') {
                                 this.latestSnapshot = data.payload;
                                 if (data.payload.chat && this.onChatMessage) {
                                     data.payload.chat.forEach((msg: ChatMessage) => this.onChatMessage!(msg));
                                 }
                             } 
                             else if (data.type === 'CHAT' && this.onChatMessage) {
                                 this.onChatMessage(data.payload);
                             }
                         });
                         
                         conn.on('close', () => {
                             if (this.onHostDisconnect) this.onHostDisconnect();
                         });
                     });

                     conn.on('error', (err) => {
                         console.error('[NET] Connection Error:', err);
                         // Fallback logic could go here
                     });
                 });
                 
                 this.peer.on('error', (err) => reject(err));

            } else if (role === 'HOST' && roomId) {
                 this.role = 'HOST';
                 // Host always plays as 'player-HOST' internally, or use PeerID
                 // For consistency, let's wait for Open
                 this.peer = new Peer(roomId, { debug: 0 });

                 this.peer.on('open', (id) => {
                     this.myId = id;
                     console.log(`[NET] Hosting Room: ${id}`);
                     resolve(id);
                 });

                 this.peer.on('connection', (conn) => {
                    console.log(`[NET] Client connected: ${conn.peer}`);
                    this.connections.push(conn);
                    
                    conn.on('data', (data: any) => {
                        if (data.type === 'HELLO') {
                            // Client wants to join. Acknowledge them.
                            // We use their PeerID as the entity ownerId
                            conn.send({ type: 'WELCOME', payload: { id: conn.peer } });
                        }
                        else if (data.type === 'INPUT') {
                            // Store input mapped to the CLIENT'S PEER ID
                            this.latestInput.set(conn.peer, data.payload);
                        } 
                        else if (data.type === 'CHAT') {
                            if (this.onChatMessage) this.onChatMessage(data.payload);
                            this.broadcastChat(data.payload);
                        }
                    });

                    conn.on('close', () => {
                        this.connections = this.connections.filter(c => c.peer !== conn.peer);
                        this.latestInput.delete(conn.peer);
                        if (this.onPlayerDisconnect) this.onPlayerDisconnect(conn.peer);
                    });
                 });

                 this.peer.on('error', (err) => {
                     console.error('[NET] Host Error:', err);
                     reject(err); // Or handle auto-retry
                 });
            }
        });
    }

    // --- CLIENT: Interpolation Logic ---
    applySnapshot(context: GameContext, predictionEnabled: boolean, interpDelay: number) {
        if (!this.latestSnapshot) return;
        
        const snap = this.latestSnapshot;
        const matchedIds = new Set<string>();
        const lerpFactor = 0.3; // Smoother interpolation

        // 1. Process Entities
        snap.entities.forEach(sData => {
            if (!sData.id) return;
            matchedIds.add(sData.id);
            
            // Find entity by ID
            let local = context.entities.current.find(e => e.id === sData.id);
            const isMyPlayer = local && local.ownerId === this.myId;

            if (local) {
                // If it's ME, I might predict movement (Client Prediction), 
                // BUT for now, to fix "possession", let's trust Server Position mostly
                // or only reconcile if deviation is too large.
                
                if (isMyPlayer && predictionEnabled) {
                    // Reconciliation: If we drifted too far from server, snap back
                    if (sData.position) {
                        const dist = Math.sqrt(Math.pow(local.position.x - sData.position.x, 2) + Math.pow(local.position.y - sData.position.y, 2));
                        if (dist > 100) { 
                            // Lag snap
                            local.position.x = sData.position.x;
                            local.position.y = sData.position.y;
                        }
                        // Else: Trust local physics (calculated in useGameCore loop)
                    }
                } else {
                    // It's OTHER players or objects. Strictly interpolate.
                    if (sData.position) {
                        local.targetPosition = sData.position;
                        local.position.x = lerp(local.position.x, sData.position.x, lerpFactor);
                        local.position.y = lerp(local.position.y, sData.position.y, lerpFactor);
                    }
                    if (sData.rotation !== undefined) {
                        local.rotation = lerpAngle(local.rotation, sData.rotation, lerpFactor);
                    }
                }

                // Sync stats for EVERYONE
                if (sData.health !== undefined) local.health = sData.health;
                if (sData.maxHealth !== undefined) local.maxHealth = sData.maxHealth;
                if (sData.score !== undefined) local.score = sData.score;
                if (sData.level !== undefined) local.level = sData.level;
                if (sData.statusEffects) local.statusEffects = sData.statusEffects;
                if (sData.chatText !== undefined) local.chatText = sData.chatText;
                if (sData.chatTimer !== undefined) local.chatTimer = sData.chatTimer;

            } else {
                // NEW ENTITY: Spawn it
                const newEnt = recycleEntity(context, sData);
                // Ensure position is valid
                if (sData.position) {
                    newEnt.position.x = sData.position.x;
                    newEnt.position.y = sData.position.y;
                }
                context.entities.current.push(newEnt);
            }
        });

        // 2. Remove Missing Entities (Except local particle effects)
        for (let i = context.entities.current.length - 1; i >= 0; i--) {
            const e = context.entities.current[i];
            // Don't delete client-side only effects if any (future proofing)
            // But strictly sync game entities
            if (!matchedIds.has(e.id)) {
                removeEntity(context, i);
            }
        }
    }

    // --- HOST: Broadcast ---
    broadcastSnapshot(entities: Entity[], particles: Particle[]) {
        if (this.role !== 'HOST') return;

        const snapshot: NetSnapshot = {
            entities: entities.map(e => ({
                id: e.id,
                type: e.type,
                position: e.position,
                radius: e.radius,
                rotation: e.rotation,
                color: e.color,
                health: e.health,
                maxHealth: e.maxHealth,
                weaponId: e.weaponId,
                statusEffects: e.statusEffects,
                ownerId: e.ownerId, // Crucial for client to know "Is this me?"
                score: e.score,
                level: e.level,
                name: e.name,
                teamId: e.teamId
            })),
            particles: [], // Particles are visual-only, save bandwidth by not syncing heavy particles
            timestamp: Date.now()
        };

        this.connections.forEach(conn => {
            conn.send({ type: 'SNAPSHOT', payload: snapshot });
        });
    }

    broadcastChat(msg: ChatMessage) {
        if (this.role !== 'HOST') return;
        this.connections.forEach(conn => {
            conn.send({ type: 'CHAT', payload: msg });
        });
    }

    getClientInput(peerId: string): NetInput | undefined {
        return this.latestInput.get(peerId);
    }

    sendInput(input: NetInput) {
        if (this.role !== 'CLIENT' || !this.hostConnection) return;
        this.hostConnection.send({ type: 'INPUT', payload: input });
    }

    sendChat(msg: ChatMessage) {
        if (this.role === 'HOST') {
            this.broadcastChat(msg);
        } else if (this.hostConnection) {
            this.hostConnection.send({ type: 'CHAT', payload: msg });
        }
    }
}
