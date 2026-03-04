import SensorData from './models/sensorDataModel.js';

export const initializeSocket = (io) => {
  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id, '| Total clients:', io.engine.clientsCount);
    sendLatestSensorData(socket);

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id, '| Remaining clients:', io.engine.clientsCount);
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
      socket.emit('sensor_readings_table', {
        temperature: latestReading.temperature,
        humidity: latestReading.humidity,
        moisture1: latestReading.moisture1,
        moisture2: latestReading.moisture2,
        moisture3: latestReading.moisture3,
        moisture4: latestReading.moisture4,
        moisture5: latestReading.moisture5,
        moisture6: latestReading.moisture6,
        moistureavg: latestReading.moistureavg,
        weight1: latestReading.weight1,
        weight2: latestReading.weight2,
        status: latestReading.status || 'Idle',
        timestamp: latestReading.timestamp
      });
      
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
  io.emit('sensor_readings_table', {
    temperature: sensorData.temperature,
    humidity: sensorData.humidity,
    moisture1: sensorData.moisture1,
    moisture2: sensorData.moisture2,
    moisture3: sensorData.moisture3,
    moisture4: sensorData.moisture4,
    moisture5: sensorData.moisture5,
    moisture6: sensorData.moisture6,
    moistureavg: sensorData.moistureavg,
    weight1: sensorData.weight1,
    weight2: sensorData.weight2,
    status: sensorData.status || 'Idle',
    timestamp: sensorData.timestamp
  });
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
      
        // console.log('Emitting sensor data:', {
        // temperature: latestReading.temperature,
        // humidity: latestReading.humidity,
        // moisture1: latestReading.moisture1,
        // moisture2: latestReading.moisture2,
        // moisture3: latestReading.moisture3,
        // moisture4: latestReading.moisture4,
        // moisture5: latestReading.moisture5,
        // moisture6: latestReading.moisture6,
        // moistureavg: latestReading.moistureavg,
        // });
        
        io.emit('sensor_readings_table', {
          temperature: latestReading.temperature,
          humidity: latestReading.humidity,
          moisture1: latestReading.moisture1,
          moisture2: latestReading.moisture2,
          moisture3: latestReading.moisture3,
          moisture4: latestReading.moisture4,
          moisture5: latestReading.moisture5,
          moisture6: latestReading.moisture6,
          moistureavg: latestReading.moistureavg,
          weight1: latestReading.weight1,
          weight2: latestReading.weight2,
          status: latestReading.status || 'Idle',
          timestamp: latestReading.timestamp
        });
      } else {
        console.log('No sensor data found in MongoDB');
      }
    } catch (error) {
      console.error('Error in sensor polling:', error);
    }
  }, intervalMs);
};