import SensorData from './models/sensorDataModel.js';

export const initializeSocket = (io) => {
  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    // Send initial sensor data to newly connected client
    sendLatestSensorData(socket);

    // Handle client disconnect
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });
};

// Function to send latest sensor data from MongoDB
export const sendLatestSensorData = async (socket) => {
  try {
    // Fetch the latest sensor reading from MongoDB
    const latestReading = await SensorData.findOne()
      .sort({ timestamp: -1 })
      .limit(1);

    if (latestReading) {
      socket.emit('sensorData', {
        temperature: latestReading.temperature,
        humidity: latestReading.humidity,
        moisture: latestReading.moisture,
        weight: latestReading.weight,
        status: latestReading.status || 'Idle',
        timestamp: latestReading.timestamp
      });
    }
  } catch (error) {
    console.error('Error fetching sensor data:', error);
  }
};

// Function to broadcast sensor data to all connected clients
export const broadcastSensorData = (io, sensorData) => {
  io.emit('sensorData', {
    temperature: sensorData.temperature,
    humidity: sensorData.humidity,
    moisture: sensorData.moisture,
    weight: sensorData.weight,
    status: sensorData.status || 'Idle',
    timestamp: sensorData.timestamp
  });
};

// Setup real-time sensor data polling
export const startSensorPolling = (io, intervalMs = 5000) => {
  setInterval(async () => {
    try {
      const latestReading = await SensorData.findOne()
        .sort({ timestamp: -1 })
        .limit(1);

      if (latestReading) {
        io.emit('sensorData', {
          temperature: latestReading.temperature,
          humidity: latestReading.humidity,
          moisture: latestReading.moisture,
          weight: latestReading.weight,
          status: latestReading.status || 'Idle',
          timestamp: latestReading.timestamp
        });
      }
    } catch (error) {
      console.error('Error in sensor polling:', error);
    }
  }, intervalMs);
};
