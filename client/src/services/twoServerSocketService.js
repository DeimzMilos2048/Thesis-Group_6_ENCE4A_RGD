import { io } from 'socket.io-client';
import SERVER_CONFIG from '../config/serverConfig';

// Two-Server Socket Service
// Server A: Web/Mobile Interface (View Only)
// Server B: ESP32 Communication & Raspberry Pi Interface

class TwoServerSocketService {
  constructor() {
    this.serverA = SERVER_CONFIG.serverA;
    this.serverB = SERVER_CONFIG.serverB;
    this.fallbackA = SERVER_CONFIG.fallbackA;
    this.fallbackB = SERVER_CONFIG.fallbackB;
    
    this.socketA = null; // Socket to Server A (Web/Mobile)
    this.socketB = null; // Socket to Server B (ESP32/Pi)
    
    console.log('=== Two Server Socket Service Config ===');
    console.log('Socket A (Web/Mobile):', this.serverA);
    console.log('Socket B (ESP32/Pi):', this.serverB);
    console.log('Fallback A:', this.fallbackA);
    console.log('Fallback B:', this.fallbackB);
    console.log('=====================================');
  }

  // Connect to Server A (Web/Mobile Interface)
  connectToServerA() {
    if (this.socketA) {
      console.log('Already connected to Server A');
      return this.socketA;
    }

    console.log('Connecting to Server A:', this.serverA);
    
    this.socketA = io(this.serverA, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5001,
      reconnectionAttempts: 5,
      transports: ['websocket', 'polling'],
      upgrade: true
    });

    this.socketA.on('connect', () => {
      console.log('Connected to Server A:', this.socketA.id);
    });

    this.socketA.on('disconnect', () => {
      console.log('Disconnected from Server A');
    });

    this.socketA.on('error', (error) => {
      console.error('Server A Socket error:', error);
      // Try fallback if available
      if (this.fallbackA && !this.socketA.connected) {
        console.log('Trying fallback Server A:', this.fallbackA);
        this.connectToFallbackA();
      }
    });

    return this.socketA;
  }

  // Connect to Server B (ESP32 Communication & Raspberry Pi)
  connectToServerB() {
    if (this.socketB) {
      console.log('Already connected to Server B');
      return this.socketB;
    }

    console.log('Connecting to Server B:', this.serverB);
    
    this.socketB = io(this.serverB, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5001,
      reconnectionAttempts: 5,
      transports: ['websocket', 'polling'],
      upgrade: true
    });

    this.socketB.on('connect', () => {
      console.log('Connected to Server B:', this.socketB.id);
    });

    this.socketB.on('disconnect', () => {
      console.log('Disconnected from Server B');
    });

    this.socketB.on('error', (error) => {
      console.error('Server B Socket error:', error);
      // Try fallback if available
      if (this.fallbackB && !this.socketB.connected) {
        console.log('Trying fallback Server B:', this.fallbackB);
        this.connectToFallbackB();
      }
    });

    return this.socketB;
  }

  // Fallback connections
  connectToFallbackA() {
    if (this.fallbackA && !this.socketA.connected) {
      console.log('Connecting to fallback Server A:', this.fallbackA);
      this.socketA = io(this.fallbackA, {
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5001,
        reconnectionAttempts: 5,
        transports: ['websocket', 'polling'],
        upgrade: true
      });
    }
  }

  connectToFallbackB() {
    if (this.fallbackB && !this.socketB.connected) {
      console.log('Connecting to fallback Server B:', this.fallbackB);
      this.socketB = io(this.fallbackB, {
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5001,
        reconnectionAttempts: 5,
        transports: ['websocket', 'polling'],
        upgrade: true
      });
    }
  }

  // Get socket instances
  getSocketA() {
    return this.socketA || this.connectToServerA();
  }

  getSocketB() {
    return this.socketB || this.connectToServerB();
  }

  // Disconnect from servers
  disconnectFromServerA() {
    if (this.socketA) {
      this.socketA.disconnect();
      this.socketA = null;
      console.log('Disconnected from Server A');
    }
  }

  disconnectFromServerB() {
    if (this.socketB) {
      this.socketB.disconnect();
      this.socketB = null;
      console.log('Disconnected from Server B');
    }
  }

  // Disconnect from all servers
  disconnectAll() {
    this.disconnectFromServerA();
    this.disconnectFromServerB();
  }

  // Check connection status
  isServerAConnected() {
    return this.socketA && this.socketA.connected;
  }

  isServerBConnected() {
    return this.socketB && this.socketB.connected;
  }
}

const twoServerSocketService = new TwoServerSocketService();
export default twoServerSocketService;
