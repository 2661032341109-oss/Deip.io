
import { Client, Room } from 'colyseus.js';
import { Peer, DataConnection } from 'peerjs';
import { Entity, Particle, NetInput, NetSnapshot, ChatMessage } from '../types';
import { GameContext } from './GameContext';
import { SnapshotManager } from './network/SnapshotManager';
import { Logger } from './Logger';

export type NetworkRole = 'OFFLINE' | 'HOST' | 'CLIENT' | 'HOST_P2P' | 'CLIENT_P2P';

export class NetworkManager {
    // Colyseus (Dedicated Server)
    client: Client | null = null;
    room: Room | null = null;
    
    // PeerJS (P2P)
    peer: Peer | null = null;
    connections: Map<string, DataConnection> = new Map();
    hostConn: DataConnection | null = null;

    role: NetworkRole = 'OFFLINE';
    myId: string = '';
    
    // Server Time Sync
    serverTimeOffset: number = 0;
    latency: number = 0;
    
    // Event Callbacks
    onChatMessage: ((msg: ChatMessage) => void) | null = null;
    onPlayerDisconnect: ((peerId: string) => void) | null = null;
    onHostDisconnect: (() => void) | null = null;
    onPeerJoin: ((peerId: string) => void) | null = null;

    private pingInterval: any = null;
    private p2pBroadcastInterval: any = null;

    constructor() {
        // Initialize Colyseus Client (Keep for dedicated server support)
        try {
            const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
            let host = window.location.hostname === 'localhost' ? 'localhost:2567' : window.location.host;
            if (!host || host === '' || window.location.protocol === 'file:') host = 'localhost:2567';
            this.client = new Client(`${protocol}://${host}`);
        } catch (e) {
            console.warn("NetworkManager: Colyseus init failed", e);
        }
    }

    destroy() {
        if (this.pingInterval) clearInterval(this.pingInterval);
        if (this.p2pBroadcastInterval) clearInterval(this.p2pBroadcastInterval);
        
        if (this.room) {
            this.room.leave();
            this.room = null;
        }
        
        if (this.peer) {
            this.peer.destroy();
            this.peer = null;
        }
        this.connections.clear();
        this.role = 'OFFLINE';
    }

    getServerTime(): number {
        return Date.now() + this.serverTimeOffset;
    }

    async init(role: NetworkRole, roomId?: string): Promise<string> {
        this.role = role;
        
        // --- OFFLINE ---
        if (role === 'OFFLINE') {
            this.myId = `local-${Math.random().toString(36).substr(2, 9)}`;
            Logger.net('OFFLINE Mode Active');
            return this.myId;
        }

        // --- P2P HOST ---
        if (role === 'HOST_P2P') {
            return new Promise((resolve, reject) => {
                Logger.net('Initializing P2P Host...');
                this.peer = new Peer();
                
                this.peer.on('open', (id) => {
                    this.myId = id; // Host ID is the Peer ID
                    Logger.net(`P2P Host Started. ID: ${id}`);
                    resolve(id);
                });

                this.peer.on('connection', (conn) => {
                    Logger.net(`New peer connected: ${conn.peer}`);
                    this.connections.set(conn.peer, conn);
                    if (this.onPeerJoin) this.onPeerJoin(conn.peer);

                    conn.on('data', (data: any) => {
                        this.handleP2PData(data, conn.peer);
                    });
                    
                    conn.on('close', () => {
                         this.connections.delete(conn.peer);
                         if (this.onPlayerDisconnect) this.onPlayerDisconnect(conn.peer);
                    });
                });

                this.peer.on('error', (err) => reject(err));
            });
        }

        // --- P2P CLIENT ---
        if (role === 'CLIENT_P2P') {
             return new Promise((resolve, reject) => {
                if (!roomId) return reject(new Error("No Host ID provided"));
                Logger.net(`Connecting to P2P Host: ${roomId}...`);
                
                this.peer = new Peer();
                this.peer.on('open', (id) => {
                    this.myId = id;
                    // Connect to Host
                    const conn = this.peer!.connect(roomId);
                    
                    conn.on('open', () => {
                        Logger.net("Connected to Host!");
                        this.hostConn = conn;
                        this.startTimeSyncP2P();
                        resolve(roomId);
                    });

                    conn.on('data', (data: any) => {
                        this.handleP2PData(data, 'HOST');
                    });

                    conn.on('close', () => {
                        Logger.net("Disconnected from Host");
                        if (this.onHostDisconnect) this.onHostDisconnect();
                    });
                    
                    conn.on('error', (err) => {
                         Logger.error(`Connection Error: ${err}`);
                         reject(err);
                    });
                });
                
                this.peer.on('error', (err) => reject(err));
             });
        }

        // --- DEDICATED SERVER CLIENT (Legacy) ---
        return new Promise(async (resolve, reject) => {
             if (!this.client) return reject("No Client");
             try {
                this.room = await this.client.joinOrCreate("game_room", { roomId: roomId || 'ffa' });
                this.myId = this.room.sessionId;
                
                this.room.onStateChange((state: any) => {
                    // Adapt Colyseus Schema to Snapshot
                    const snapshot: NetSnapshot = {
                        entities: state.entities || [],
                        particles: [],
                        timestamp: Date.now(),
                        chat: []
                    };
                    SnapshotManager.pushSnapshot(snapshot);
                });
                
                this.room.onMessage("chat", (msg) => { if(this.onChatMessage) this.onChatMessage(msg); });
                resolve(this.room.roomId);
             } catch(e) {
                 reject(e);
             }
        });
    }

    // --- P2P HANDLERS ---
    
    private handleP2PData(data: any, senderId: string) {
        if (data.type === 'snapshot') {
            // Client receives snapshot from Host
            const snap = data.payload as NetSnapshot;
            snap.timestamp = Date.now(); // Adjust for local interp
            SnapshotManager.pushSnapshot(snap);
        } 
        else if (data.type === 'input') {
            // Host receives input from Client
            // This needs to be accessed by the Game Loop, handled via a queue or callback
            // For now, we'll store it in a public map for the loop to read
            this.pendingInputs.set(senderId, data.payload);
        }
        else if (data.type === 'chat') {
            if (this.onChatMessage) this.onChatMessage(data.payload);
            // If Host, broadcast to others
            if (this.role === 'HOST_P2P') {
                 this.broadcastP2P({ type: 'chat', payload: data.payload }, senderId);
            }
        }
        else if (data.type === 'ping') {
             if (this.hostConn) this.hostConn.send({ type: 'pong', clientTime: data.clientTime, serverTime: Date.now() });
             else if (this.role === 'HOST_P2P') {
                 const conn = this.connections.get(senderId);
                 if (conn) conn.send({ type: 'pong', clientTime: data.clientTime, serverTime: Date.now() });
             }
        }
        else if (data.type === 'pong') {
            const now = Date.now();
            this.latency = (now - data.clientTime) / 2;
            this.serverTimeOffset = (data.serverTime - now) + this.latency;
        }
    }

    public pendingInputs: Map<string, NetInput> = new Map();

    public getClientInput(peerId: string): NetInput | undefined {
        const input = this.pendingInputs.get(peerId);
        // Do not delete immediately if you want to reuse last input, 
        // but typically we consume it. For packet loss safety, maybe keep it until new one?
        // Let's consume it.
        // this.pendingInputs.delete(peerId); 
        return input;
    }

    private startTimeSyncP2P() {
        if (this.pingInterval) clearInterval(this.pingInterval);
        this.pingInterval = setInterval(() => {
            if (this.hostConn && this.hostConn.open) {
                this.hostConn.send({ type: 'ping', clientTime: Date.now() });
            }
        }, 1000);
    }

    // --- INTERFACE METHODS ---

    broadcastSnapshot(entities: Entity[], particles: Particle[]) {
        if (this.role !== 'HOST_P2P') return;
        
        // Strip heavy data for bandwidth optimization if needed (currently sending full)
        // Ideally we only send changed data (Delta compression), but for MVP P2P, full snapshot is safer.
        const snapshot: NetSnapshot = {
            entities: entities.map(e => ({
                id: e.id, type: e.type, position: e.position, velocity: e.velocity, 
                rotation: e.rotation, health: e.health, maxHealth: e.maxHealth,
                color: e.color, name: e.name, score: e.score, level: e.level,
                weaponId: e.weaponId, ownerId: e.ownerId, teamId: e.teamId,
                skillState: e.skillState, statusEffects: e.statusEffects // Crucial for visuals
            })),
            particles: particles.filter(p => p.type === 'text' || p.type === 'explosion_core'), // Only sync important particles
            timestamp: Date.now()
        };

        const msg = { type: 'snapshot', payload: snapshot };
        this.connections.forEach(conn => {
            if (conn.open) conn.send(msg);
        });
    }

    broadcastChat(msg: ChatMessage) {
        if (this.role === 'HOST_P2P') {
            this.broadcastP2P({ type: 'chat', payload: msg });
        } else if (this.hostConn) {
            this.hostConn.send({ type: 'chat', payload: msg });
        }
    }
    
    private broadcastP2P(data: any, exceptId?: string) {
        this.connections.forEach((conn, peerId) => {
            if (peerId !== exceptId && conn.open) conn.send(data);
        });
    }

    sendInput(input: NetInput) {
        if (this.role === 'CLIENT_P2P' && this.hostConn && this.hostConn.open) {
            this.hostConn.send({ type: 'input', payload: input });
        }
    }

    sendChat(msg: ChatMessage) {
        // Local echo
        if (this.onChatMessage) this.onChatMessage(msg);
        
        if (this.role === 'OFFLINE') return;
        
        if (this.role === 'HOST_P2P') {
             this.broadcastP2P({ type: 'chat', payload: msg });
        } else if (this.role === 'CLIENT_P2P' && this.hostConn) {
             this.hostConn.send({ type: 'chat', payload: msg });
        } else if (this.room) {
             this.room.send("chat", msg);
        }
    }

    applySnapshot(context: GameContext, predictionEnabled: boolean, interpDelay: number) {
        if (this.role === 'OFFLINE' || this.role === 'HOST_P2P') return; 
        
        // P2P Client or Server Client
        const renderTime = this.getServerTime() - interpDelay;
        SnapshotManager.applySnapshot(context, this.myId, predictionEnabled, renderTime);
    }
}
