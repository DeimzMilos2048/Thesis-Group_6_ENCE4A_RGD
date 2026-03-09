import SensorData from './models/sensorDataModel.js';
import { sendDryingNotification } from './controllers/notificationController.js';

// Helper function to build complete sensor data payload with all weight fields
const buildSensorDataPayload = (reading) => {
  return {
    temperature: reading.temperature || 0,
    humidity: reading.humidity || 0,
    moisture1: reading.moisture1 || 0,
    moisture2: reading.moisture2 || 0,
    moisture3: reading.moisture3 || 0,
    moisture4: reading.moisture4 || 0,
    moisture5: reading.moisture5 || 0,
    moisture6: reading.moisture6 || 0,
    moistureavg: reading.moistureavg || 0,
    weight1: reading.weight1 || 0,
    weight2: reading.weight2 || 0,
    status: reading.status || 'Idle',
    timestamp: reading.timestamp,
    // Per-tray weight data (before/after)
    weightbefore1: reading.weight1_t1 || 0,
    weightbefore2: reading.weight1_t2 || 0,
    weightbefore3: reading.weight1_t3 || 0,
    weightbefore4: reading.weight1_t4 || 0,
    weightbefore5: reading.weight1_t5 || 0,
    weightbefore6: reading.weight1_t6 || 0,
    weightafter1: reading.weight2_t1 || 0,
    weightafter2: reading.weight2_t2 || 0,
    weightafter3: reading.weight2_t3 || 0,
    weightafter4: reading.weight2_t4 || 0,
    weightafter5: reading.weight2_t5 || 0,
    weightafter6: reading.weight2_t6 || 0,
  };
};

export const initializeSocket = (io) => {
  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id, '| Total clients:', io.engine.clientsCount);
    sendLatestSensorData(socket);

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id, '| Remaining clients:', io.engine.clientsCount);
    });

    // Handle drying process start
    socket.on('drying_started', async (data) => {
      console.log('Drying started:', data);
      // Broadcast to all connected clients so mobile and web sync
      io.emit('drying_started', {
        ...data,
        clientId: socket.id
      });
      
      // Send push notifications to all users
      try {
        await sendDryingNotification({
          eventType: 'started',
          temperature: data.temperature || 0,
          moisture: data.moisture || 0,
          dryingSeconds: 0
        });
      } catch (notifError) {
        console.error('Error sending drying started notification:', notifError);
        // Don't fail the entire event if notification fails
      }
    });

    // Handle drying process stop
    socket.on('drying_stopped', async (data) => {
      console.log('Drying stopped:', data);
      // Broadcast to all connected clients
      io.emit('drying_stopped', {
        ...data,
        clientId: socket.id
      });
      
      // Send push notifications to all users
      try {
        await sendDryingNotification({
          eventType: 'stopped',
          temperature: data.temperature || 0,
          moisture: data.moisture || 0,
          dryingSeconds: data.dryingSeconds || 0
        });
      } catch (notifError) {
        console.error('Error sending drying stopped notification:', notifError);
        // Don't fail the entire event if notification fails
      }
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });
};


// Function to send latest sensor data from MongoDB
export const sendLatestSensorData = async (socket) => {
  try {
    const latestReading = await SensorData.findOne()
      .sort({ timestamp: -1 })
      .limit(1);

    if (latestReading) {
      const payload = buildSensorDataPayload(latestReading);
      socket.emit('sensor_readings_table', payload);
      console.log('Sent initial data to client:', socket.id);
    } else {
      console.log('No sensor data found for initial send');
    }
  } catch (error) {
    console.error('Error fetching sensor data:', error);
  }
};

// Function to broadcast sensor data to all connected clients
export const broadcastSensorData = (io, sensorData) => {
  const payload = buildSensorDataPayload(sensorData);
  io.emit('sensor_readings_table', payload);
};

// Setup real-time sensor data polling
export const startSensorPolling = (io, intervalMs = 5000) => {
  console.log(`Starting sensor polling every ${intervalMs}ms`);
  
  setInterval(async () => {
    try {
      const latestReading = await SensorData.findOne()
        .sort({ timestamp: -1 })
        .limit(1);

      if (latestReading) {
        const payload = buildSensorDataPayload(latestReading);
        io.emit('sensor_readings_table', payload);
      } else {
        console.log('No sensor data found in MongoDB');
      }
    } catch (error) {
      console.error('Error in sensor polling:', error);
    }
  }, intervalMs);
};