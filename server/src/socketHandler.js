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
    temperature: latestReading.temperature,
    humidity: latestReading.humidity,
    moisture1: latestReading.moisture1,
    moisture2: latestReading.moisture2,
    weight1: latestReading.weight1,
    weight2: latestReading.weight2,
    status: latestReading.status || 'Idle',
    timestamp: latestReading.timestamp
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
        //   temperature: latestReading.temperature,
        //   humidity: latestReading.humidity,
        //   moisture1: latestReading.moisture1,
        //   moisture2: latestReading.moisture2,
        //   weight1: latestReading.weight1,
        //   weight2: latestReading.weight2,
        // });
        
        io.emit('sensor_readings_table', {
          temperature: latestReading.temperature,
          humidity: latestReading.humidity,
          moisture1: latestReading.moisture1,
          moisture2: latestReading.moisture2,
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