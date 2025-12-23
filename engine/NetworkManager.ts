
import { Peer } from 'peerjs';
import { Entity, Particle, NetInput, NetSnapshot, ChatMessage } from '../types';
import { GameContext } from './GameContext'; // Needed for type context in helper
import { recycleEntity, recycleParticle, removeEntity } from './Spawner';
import { lerp, lerpAngle } from './utils';

export type NetworkRole = 'OFFLINE' | 'HOST' | 'CLIENT';

// Use a deterministic room ID prefix for modes
const ROOM_PREFIX = 'corebound-v1-';

export class NetworkManager {
    peer: Peer | null = null;
    role: NetworkRole = 'OFFLINE';
    connections: any[] = []; // List of DataConnections
    hostConnection: any | null = null; // Client side
    
    myId: string = '';
    
    // Data Buffers
    latestInput: Map<string, NetInput> = new Map(); // Host stores inputs from clients
    latestSnapshot: NetSnapshot | null = null; // Client stores snapshot from host
    
    // Chat Event Listener
    onChatMessage: ((msg: ChatMessage) => void) | null = null;
    
    // Disconnect Event Listener (Host Only)
    onPlayerDisconnect: ((peerId: string) => void) | null = null;
    
    // Host Disconnect Event Listener (Client Only)
    onHostDisconnect: (() => void) | null = null;

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
            // FIX: Ensure we have an ID even in OFFLINE mode for Chat linkage
            if (role === 'OFFLINE') {
                this.myId = `local-${Math.random().toString(36).substr(2, 9)}`;
                console.log(`[NET] Offline Mode Initialized. Fake ID: ${this.myId}`);
                resolve(this.myId);
                return;
            }

            let hasSwitched = false;
            let connectionTimeout: any = null;

            const switchToHost = async () => {
                if (hasSwitched) return;
                hasSwitched = true;
                
                // Clear any pending client timeouts to prevent double-logging or logic errors
                if (connectionTimeout) clearTimeout(connectionTimeout);
                
                console.log(`[NET] Host not found. Initiating Host Election...`);

                // Cleanup existing peer if any
                if (this.peer) {
                    this.peer.removeAllListeners();
                    this.peer.destroy();
                    this.peer = null;
                }
                
                // --- HOST ELECTION DELAY ---
                // Add a random delay (200-800ms) to prevent multiple clients from 
                // trying to host the exact same room ID simultaneously (Race Condition).
                const delay = Math.floor(Math.random() * 600) + 200;
                await new Promise(r => setTimeout(r, delay));

                console.log(`[NET] Election finished. Switching to HOST mode for room: ${roomId}`);

                // Recursively init as HOST
                this.init('HOST', roomId).then(resolve).catch(reject);
            };

            // --- AUTO-HOSTING LOGIC FOR SINGLE ROOM ---
            if (role === 'CLIENT' && roomId) {
                 // Try to connect as Client first
                 this.peer = new Peer({ debug: 0 });
                 
                 this.peer.on('open', (id) => {
                     this.myId = id;
                     console.log(`[NET] Client initialized ${id}, attempting to join ${roomId}`);
                     
                     // Set a timeout for the connection attempt
                     connectionTimeout = setTimeout(() => {
                         if (!hasSwitched) {
                             console.log(`[NET] Connection to room ${roomId} timed out.`);
                             switchToHost();
                         }
                     }, 3000);

                     // Attempt connection
                     // FASTSYNC CHANGE: reliable: false for UDP-like performance
                     const conn = this.peer!.connect(roomId, { reliable: false });
                     
                     conn.on('open', () => {
                         if (hasSwitched) {
                             conn.close();
                             return;
                         }
                         clearTimeout(connectionTimeout);
                         console.log(`[NET] Connected to Host: ${roomId}`);
                         this.hostConnection = conn;
                         
                         // Setup Data Listeners
                         conn.on('data', (data: any) => {
                             if (data.type === 'SNAPSHOT') {
                                 this.latestSnapshot = data.payload;
                                 if (data.payload.chat) {
                                     // Process batched chat messages from snapshot if any
                                     data.payload.chat.forEach((msg: ChatMessage) => {
                                         if (this.onChatMessage) this.onChatMessage(msg);
                                     });
                                 }
                             } else if (data.type === 'CHAT') {
                                 // Direct Chat Message (from Host)
                                 console.log(`%c[NET] 📨 Client Recv Chat: "${data.payload.text}"`, 'color: #00ff9d');
                                 if (this.onChatMessage) this.onChatMessage(data.payload);
                             }
                         });
                         
                         conn.on('close', () => {
                             console.log('[NET] Disconnected from host');
                             if (this.onHostDisconnect) this.onHostDisconnect();
                         });

                         conn.on('error', (err) => {
                             console.error('[NET] Connection Error:', err);
                         });

                         resolve(roomId);
                     });

                     conn.on('error', (err) => {
                         if (!hasSwitched) {
                             console.log(`[NET] Connection error:`, err);
                         }
                     });
                 });
                 
                 this.peer.on('error', (err: any) => {
                     if (!hasSwitched) {
                         if (err.type !== 'peer-unavailable') {
                             console.log(`[NET] Client Error (${err.type}), switching to HOST.`);
                         }
                         switchToHost();
                     }
                 });

            } else if (role === 'HOST' && roomId) {
                 // Initialize as Host with the specific Room ID
                 this.role = 'HOST';
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
                        if (data.type === 'INPUT') {
                            this.latestInput.set(conn.peer, data.payload);
                        } else if (data.type === 'PING') {
                            conn.send({ 
                                type: 'PONG', 
                                payload: { 
                                    players: this.connections.length + 1 
                                } 
                            });
                        } else if (data.type === 'CHAT') {
                            // If host receives chat from a client
                            console.log(`%c[NET] 📨 Host Recv Chat from ${conn.peer}: "${data.payload.text}"`, 'color: #ffaa00');
                            
                            // 1. Show it to host
                            if (this.onChatMessage) this.onChatMessage(data.payload);
                            // 2. Broadcast it to ALL clients (so others see it)
                            this.broadcastChat(data.payload);
                        }
                    });

                    conn.on('close', () => {
                        console.log(`[NET] Client disconnected: ${conn.peer}`);
                        this.connections = this.connections.filter(c => c.peer !== conn.peer);
                        this.latestInput.delete(conn.peer);
                        
                        // Notify Game Engine
                        if (this.onPlayerDisconnect) this.onPlayerDisconnect(conn.peer);
                    });
                    
                    conn.on('error', (err) => {
                        console.error(`[NET] Client error ${conn.peer}:`, err);
                        // Treat error as disconnect
                        this.connections = this.connections.filter(c => c.peer !== conn.peer);
                        this.latestInput.delete(conn.peer);
                        if (this.onPlayerDisconnect) this.onPlayerDisconnect(conn.peer);
                    });
                 });

                 this.peer.on('error', (err: any) => {
                     if (err.type === 'unavailable-id') {
                         console.error('[NET] ID Taken. Attempting fallback ID...');
                         if (!hasSwitched) {
                             hasSwitched = true; 
                             this.peer?.destroy();
                             const fallbackId = `${roomId}-${Math.floor(Math.random() * 10000)}`;
                             this.init('HOST', fallbackId).then(resolve).catch(reject);
                         }
                     } else {
                         console.error('[NET] Host Error:', err);
                         if (!hasSwitched) reject(err);
                     }
                 });
            }
        });
    }

    // --- LOGIC: APPLY SNAPSHOT (CLIENT SIDE) ---
    applySnapshot(context: GameContext, predictionEnabled: boolean, interpDelay: number) {
        if (!this.latestSnapshot) return;
        
        const snap = this.latestSnapshot;
        const matchedIds = new Set<string>();
        const lerpFactor = 1.0 / (interpDelay / 16.6);

        snap.entities.forEach(sData => {
            if (!sData.id) return;
            matchedIds.add(sData.id);
            let local = context.entities.current.find(e => e.id === sData.id);
            
            if (local) {
                // Determine if we should interpolate this entity
                // We do NOT interpolate our own player if we are controlling it (Client Prediction)
                const isMyPlayer = local.ownerId === this.myId;
                
                if (sData.position && !isMyPlayer) {
                    local.targetPosition = sData.position;
                    
                    if (!predictionEnabled) {
                        // Snap directly if no prediction
                        local.position.x = sData.position.x;
                        local.position.y = sData.position.y;
                    } else {
                        // Interpolate
                        local.position.x = lerp(local.position.x, sData.position.x, lerpFactor);
                        local.position.y = lerp(local.position.y, sData.position.y, lerpFactor);
                    }
                }

                if (sData.rotation !== undefined && !isMyPlayer) local.serverRotation = sData.rotation;
                
                // Sync non-physics state
                if (sData.health !== undefined) local.health = sData.health;
                if (sData.maxHealth !== undefined) local.maxHealth = sData.maxHealth;
                if (sData.score !== undefined) local.score = sData.score;
                if (sData.level !== undefined) local.level = sData.level;
                if (sData.weaponId) local.weaponId = sData.weaponId;
                
                if (sData.barrelRecoils) local.barrelRecoils = sData.barrelRecoils;
                if (sData.statusEffects) local.statusEffects = sData.statusEffects;
                if (sData.chatText) local.chatText = sData.chatText;
                if (sData.chatTimer) local.chatTimer = sData.chatTimer;

            } else {
                // Create new entity from snapshot
                const newEnt = recycleEntity(context, sData);
                if (sData.position) {
                    newEnt.targetPosition = sData.position;
                    newEnt.position.x = sData.position.x;
                    newEnt.position.y = sData.position.y;
                }
                context.entities.current.push(newEnt);
            }
        });

        // Remove entities not in snapshot
        for (let i = context.entities.current.length - 1; i >= 0; i--) {
            const e = context.entities.current[i];
            if (!matchedIds.has(e.id)) {
                removeEntity(context, i);
            }
        }
        
        // Sync Particles
        if (snap.particles) {
           context.particles.current = snap.particles.map(d => recycleParticle(context, d));
        }

        // Apply rotation interpolation for others
        context.entities.current.forEach(e => {
            if (e.ownerId === this.myId) return;
            if (e.serverRotation !== undefined) {
                e.rotation = lerpAngle(e.rotation, e.serverRotation, 0.2);
            }
        });
    }

    // --- HOST METHODS ---
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
                statusEffects: e.statusEffects.map(s => ({ type: s.type, magnitude: s.magnitude, duration: s.duration })),
                depth: e.depth,
                teamId: e.teamId,
                name: e.name,
                isGodMode: e.isGodMode,
                skillState: e.skillState,
                barrelRecoils: e.barrelRecoils,
                ownerId: e.ownerId,
                score: e.score,
                level: e.level
            })),
            particles: particles.map(p => ({
                id: p.id,
                position: p.position,
                velocity: p.velocity, 
                size: p.size,
                color: p.color,
                life: p.life,
                type: p.type,
                text: p.text,
                rotation: p.rotation
            })),
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

    // --- CLIENT METHODS ---
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
