
import { Client, Room } from 'colyseus.js';
import { Entity, Particle, NetInput, NetSnapshot, ChatMessage } from '../types';
import { GameContext } from './GameContext';
import { SnapshotManager } from './network/SnapshotManager';
import { Logger } from './Logger';

export type NetworkRole = 'OFFLINE' | 'HOST' | 'CLIENT';

export class NetworkManager {
    client: Client | null = null;
    room: Room | null = null;
    role: NetworkRole = 'OFFLINE';
    myId: string = '';
    
    // Server Time Sync
    serverTimeOffset: number = 0;
    latency: number = 0;
    
    // Event Callbacks
    onChatMessage: ((msg: ChatMessage) => void) | null = null;
    onPlayerDisconnect: ((peerId: string) => void) | null = null;
    onHostDisconnect: (() => void) | null = null;

    // Offline Mode Flag
    private isOfflineMode: boolean = false;
    private pingInterval: any = null;

    constructor() {
        // Setup Colyseus Client
        const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
        let host = window.location.hostname === 'localhost' ? 'localhost:2567' : window.location.host;
        
        // Fallback if host is empty (e.g. running from file:// or some web containers)
        if (!host || host === '') {
            console.warn("NetworkManager: Hostname detection failed (possibly file://), defaulting to localhost:2567");
            host = 'localhost:2567';
        }

        try {
            this.client = new Client(`${protocol}://${host}`);
        } catch (e) {
            console.error("NetworkManager: Failed to initialize Client.", e);
            this.client = null;
        }
    }

    destroy() {
        if (this.pingInterval) clearInterval(this.pingInterval);
        if (this.room) {
            this.room.leave();
            this.room = null;
        }
        this.role = 'OFFLINE';
    }

    // Get Authoritative Time (Server Time)
    getServerTime(): number {
        return Date.now() + this.serverTimeOffset;
    }

    async init(role: NetworkRole, roomId?: string): Promise<string> {
        this.role = role;
        
        return new Promise(async (resolve, reject) => {
            // --- OFFLINE / SANDBOX MODE ---
            // Explicitly requested offline mode (e.g. Sandbox)
            if (roomId === 'offline' || role === 'OFFLINE') {
                this.enableOfflineMode();
                resolve(this.myId);
                return;
            }

            // --- ONLINE CLIENT MODE ---
            if (this.client) {
                try {
                    Logger.net(`Connecting to Global Server...`);
                    
                    // Join or Create Logic for Global Rooms
                    // We use joinOrCreate with the specific room ID requested by the Lobby
                    // This ensures everyone playing "FFA" goes to the same "official-realm-ffa" room.
                    if (roomId) {
                        Logger.net(`Attempting to join realm: ${roomId}`);
                        // Pass roomId as an option to the matchmaker to find/create that specific ID
                        this.room = await this.client.joinOrCreate("game_room", { 
                            roomId: roomId,
                            mode: roomId.includes('teams') ? '2-Teams' : 'FFA' 
                        });
                    } else {
                        // Fallback to auto-matchmaking if no ID provided (shouldn't happen with new Lobby)
                        this.room = await this.client.joinOrCreate("game_room", { mode: 'FFA' });
                    }

                    if (!this.room) throw new Error("Failed to join room");

                    this.myId = this.room.sessionId;
                    Logger.net(`Connected! Session ID: ${this.myId}`);
                    this.isOfflineMode = false;

                    // --- STATE SYNC HANDLERS ---
                    
                    // 1. Listen for State Changes (Delta Updates)
                    // Colyseus sends patches. We convert/push to SnapshotManager for interpolation.
                    this.room.onStateChange((state: any) => {
                        // Convert Colyseus Schema to our NetSnapshot
                        const snapshot: NetSnapshot = {
                            entities: [], 
                            particles: [], 
                            timestamp: Date.now(), // Client arrival time (approx)
                            chat: []
                        };
                        
                        if (state.entities) {
                            state.entities.forEach((entity: any) => {
                                snapshot.entities.push(entity);
                            });
                        }
                        
                        SnapshotManager.pushSnapshot(snapshot);
                    });

                    // 2. Message Handlers
                    this.room.onMessage("chat", (message: ChatMessage) => {
                        if (this.onChatMessage) this.onChatMessage(message);
                    });

                    this.room.onMessage("pong", (message: any) => {
                        const now = Date.now();
                        this.latency = (now - message.clientTime) / 2;
                        this.serverTimeOffset = (message.serverTime - now) + this.latency;
                    });

                    // 3. Lifecycle Handlers
                    this.room.onLeave((code) => {
                        Logger.net(`Disconnected from room. Code: ${code}`);
                        if (code !== 1000 && this.onHostDisconnect) this.onHostDisconnect();
                    });

                    this.room.onError((code, message) => {
                        Logger.error(`Colyseus Error ${code}: ${message}`);
                    });

                    // Start NTP-style Time Sync
                    this.startTimeSync();

                    resolve(this.room.roomId);

                } catch (e: any) {
                    Logger.error(`Connection Failed: ${e.message}`);
                    
                    // IMPORTANT: Do NOT automatically fallback to offline for multiplayer modes.
                    // This creates a "fake" experience where the user thinks they are online but are alone.
                    // Instead, reject the promise so the UI can show an error or retry.
                    reject(e);
                }
            } else {
                 reject(new Error("Client not initialized (invalid host configuration)"));
            }
        });
    }

    private enableOfflineMode() {
        this.isOfflineMode = true;
        this.role = 'OFFLINE';
        this.myId = `local-${Math.random().toString(36).substr(2, 9)}`;
        Logger.net('Network initialized in OFFLINE mode (Local Physics).');
    }

    private startTimeSync() {
        if (this.pingInterval) clearInterval(this.pingInterval);
        this.pingInterval = setInterval(() => {
            if (this.room) {
                this.room.send("ping", { clientTime: Date.now() });
            }
        }, 2000);
    }

    // --- GAMEPLAY INTERFACE ---

    applySnapshot(context: GameContext, predictionEnabled: boolean, interpDelay: number) {
        if (this.isOfflineMode) return; // Offline mode uses local physics engine directly

        // Online: Use SnapshotManager to interpolate state
        // This ensures smooth movement of OTHER players based on server data
        const renderTime = this.getServerTime() - interpDelay;
        SnapshotManager.applySnapshot(context, this.myId, predictionEnabled, renderTime);
    }

    broadcastSnapshot(entities: Entity[], particles: Particle[]) {
        // Deprecated: In Client-Server architecture, Client NEVER broadcasts snapshots.
        // Server sends snapshots to Client.
    }

    broadcastChat(msg: ChatMessage) {
        if (this.isOfflineMode) return; // Offline chat is local only
        if (this.room) this.room.send("chat", msg);
    }

    sendInput(input: NetInput) {
        if (this.isOfflineMode) return; // Input is handled locally in Offline mode
        if (this.room) {
            this.room.send("input", input);
        }
    }

    sendChat(msg: ChatMessage) {
        if (this.isOfflineMode) {
            // Echo locally
            if (this.onChatMessage) this.onChatMessage(msg);
        } else if (this.room) {
            this.room.send("chat", msg);
        }
    }

    getClientInput(peerId: string): NetInput | undefined {
        // Clients do not see other clients' inputs, only the resulting state.
        return undefined; 
    }
}
