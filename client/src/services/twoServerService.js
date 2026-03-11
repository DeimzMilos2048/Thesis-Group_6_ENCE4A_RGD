import axios from '../utils/axios';
import SERVER_CONFIG from '../config/serverConfig';

// Two-Server Architecture Service
// Server A: Web/Mobile Interface (View Only)
// Server B: ESP32 Communication & Raspberry Pi Interface

class TwoServerService {
  constructor() {
    this.serverA = SERVER_CONFIG.serverA;
    this.serverB = SERVER_CONFIG.serverB;
    this.fallbackA = SERVER_CONFIG.fallbackA;
    this.fallbackB = SERVER_CONFIG.fallbackB;
    
    console.log('=== Two Server Service Config ===');
    console.log('Server A (Web/Mobile):', this.serverA);
    console.log('Server B (ESP32/Pi):', this.serverB);
    console.log('Fallback A:', this.fallbackA);
    console.log('Fallback B:', this.fallbackB);
    console.log('==============================');
  }

  // Server A Methods (Web/Mobile Interface - View Only)
  async getSensorData() {
    try {
      const res = await axios.get('/api/sensor/data');
      return res.data;
    } catch (error) {
      console.error('Error getting sensor data from Server A:', error);
      throw error;
    }
  }

  async getSystemStatus() {
    try {
      const res = await axios.get('/api/system/status');
      return res.data;
    } catch (error) {
      console.error('Error getting system status from Server A:', error);
      throw error;
    }
  }

  async getHistory() {
    try {
      const res = await axios.get('/api/history');
      return res.data;
    } catch (error) {
      console.error('Error getting history from Server A:', error);
      throw error;
    }
  }

  // Server B Methods (ESP32 Communication & Raspberry Pi Interface)
  async startDrying(temperature, moisture) {
    try {
      // Forward command to Server B
      const res = await axios.post('/api/system/start', { 
        temperature, 
        moisture,
        targetServer: 'server-b' 
      });
      return res.data;
    } catch (error) {
      console.error('Error starting drying via Server B:', error);
      throw error;
    }
  }

  async stopDrying() {
    try {
      // Forward command to Server B
      const res = await axios.post('/api/system/stop', {
        targetServer: 'server-b'
      });
      return res.data;
    } catch (error) {
      console.error('Error stopping drying via Server B:', error);
      throw error;
    }
  }

  async setTemperature(temperature) {
    try {
      // Forward command to Server B
      const res = await axios.post('/api/system/temperature', { 
        value: temperature,
        targetServer: 'server-b'
      });
      return res.data;
    } catch (error) {
      console.error('Error setting temperature via Server B:', error);
      throw error;
    }
  }

  async setMoisture(moisture) {
    try {
      // Forward command to Server B
      const res = await axios.post('/api/system/moisture', { 
        value: moisture,
        targetServer: 'server-b'
      });
      return res.data;
    } catch (error) {
      console.error('Error setting moisture via Server B:', error);
      throw error;
    }
  }

  // Authentication (Server A)
  async login(email, password) {
    try {
      const res = await axios.post('/api/auth/login', { email, password });
      return res.data;
    } catch (error) {
      console.error('Error logging in to Server A:', error);
      throw error;
    }
  }

  async register(userData) {
    try {
      const res = await axios.post('/api/auth/register', userData);
      return res.data;
    } catch (error) {
      console.error('Error registering with Server A:', error);
      throw error;
    }
  }

  async getProfile() {
    try {
      const res = await axios.get('/api/auth/me');
      return res.data;
    } catch (error) {
      console.error('Error getting profile from Server A:', error);
      throw error;
    }
  }

  // Notifications (Server A)
  async getNotifications() {
    try {
      const res = await axios.get('/api/notifications');
      return res.data;
    } catch (error) {
      console.error('Error getting notifications from Server A:', error);
      throw error;
    }
  }

  async markNotificationAsRead(id) {
    try {
      const res = await axios.put(`/api/notifications/${id}/read`);
      return res.data;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }
}

const twoServerService = new TwoServerService();
export default twoServerService;
