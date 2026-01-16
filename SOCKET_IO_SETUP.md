# Real-Time Sensor Data with Socket.io Integration

## Overview
The Dashboard now displays real-time sensor data from MongoDB using Socket.io for live updates.

## What Was Modified

### Frontend (Client)
**File: `client/src/components/dashboard/Dashboard.jsx`**

#### Changes:
1. **Added Socket.io import** and connection setup
2. **Added sensor state management** for real-time data
3. **Implemented Socket.io listener** for incoming sensor data
4. **Updated JSX** to display dynamic values instead of hardcoded data

#### Key Features:
- Auto-reconnects if connection is lost
- Listens for `sensorData` events from the server
- Updates progress bars dynamically based on sensor values
- Displays system status in real-time

### Backend (Server)
**Files Created/Modified:**

#### 1. `server/src/socketHandler.js` (New)
Handles all Socket.io logic including:
- Connection management
- Sending initial sensor data to new clients
- Broadcasting sensor updates to all connected clients
- Polling MongoDB for latest sensor readings every 5 seconds

#### 2. `server/src/models/sensorDataModel.js` (New)
MongoDB schema for sensor data with fields:
- `temperature` (0-100)
- `humidity` (0-100%)
- `moisture` (0-30%)
- `weight` (in kg)
- `status` (Idle, Drying, Completed, Error)
- `timestamp` (automatically set)
- `userId` (for multi-user support)

#### 3. `server/src/server.js` (Modified)
- Integrated Socket.io server with HTTP server
- Added CORS configuration for Socket.io
- Initialized socket handlers
- Started real-time sensor polling

#### 4. `server/package.json` (Modified)
- Added `socket.io` dependency

## How It Works

### Data Flow:
1. **Arduino/Sensor Device** → Sends data to MongoDB (via another endpoint)
2. **MongoDB** → Stores sensor readings
3. **Socket.io Server** → Polls MongoDB every 5 seconds
4. **Socket.io Server** → Broadcasts data to all connected clients
5. **React Dashboard** → Receives data and updates UI in real-time

### Progress Bar Calculations:
- **Temperature**: `(value / 60) * 100`
- **Humidity**: Direct percentage value
- **Moisture**: `(value / 14) * 100`
- **Weight**: `(value / 25) * 100`

## Setup Instructions

### 1. Install Dependencies

**Server:**
```bash
cd server
npm install
```

**Client:** (Socket.io-client already installed)
No additional installation needed.

### 2. Database Setup
Ensure MongoDB is running and connected. The sensor data will be stored in the `sensor_readings_table` collection.

### 3. Environment Variables (if needed)
Add to `server/.env`:
```
MONGODB_URI=your_mongodb_connection_string
PORT=5000
```

### 4. Start the Server
```bash
cd server
npm run dev  # Development with auto-reload
# or
npm start    # Production
```

The server will:
- Start on `http://localhost:5000`
- Initialize Socket.io connection handlers
- Begin polling MongoDB for sensor data

### 5. Access the Dashboard
Open the client application at `http://localhost:3000`
The dashboard will automatically connect to the Socket.io server and display real-time data.

## Testing the Real-Time Updates

### Option 1: Using MongoDB directly
Insert sample data into the `sensor_readings_table` collection:
```javascript
db.sensor_readings_table.insertOne({
  temperature: 55.6,
  humidity: 39,
  moisture: 13.0,
  weight: 16.4,
  status: "Drying",
  timestamp: new Date()
})
```

### Option 2: Create an API endpoint
Create a route to insert sensor data and test it:
```javascript
router.post('/api/sensor/insert', async (req, res) => {
  const sensorData = new SensorData(req.body);
  await sensorData.save();
  res.json({ success: true });
});
```

Then POST to this endpoint with sensor values.

## Socket.io Events

### Server → Client
- **`sensorData`**: Emitted when sensor data is available
  ```javascript
  {
    temperature: number,
    humidity: number,
    moisture: number,
    weight: number,
    status: string,
    timestamp: Date
  }
  ```

### Connection Events
- **`connect`**: Client connects successfully
- **`disconnect`**: Client disconnects
- **`error`**: Connection error occurs

## Monitoring in Real-Time
The dashboard updates automatically every time new sensor data is available (polling interval: 5 seconds).

### Customizing Update Interval:
Edit `server/src/server.js`:
```javascript
// Change 5000 (5 seconds) to desired milliseconds
startSensorPolling(io, 5000);
```

## Troubleshooting

### "Cannot find socket.io"
- Run `npm install socket.io` in server directory

### Client not receiving data
1. Check if server is running: `http://localhost:5000`
2. Check browser console for connection errors
3. Verify CORS settings in server if accessing from different domain
4. Check MongoDB connection and data availability

### Data not updating
1. Check MongoDB has sensor data entries in `sensor_readings_table` collection
2. Verify `sensorDataModel.js` collection name is set to `sensor_readings_table`
3. Check server console for polling errors
4. Ensure Socket.io connection is active (check browser DevTools)

## Future Enhancements

1. **User-specific data**: Filter sensor data by `userId`
2. **Data persistence**: Store sensor history in time-series database
3. **Alerts**: Emit alert events when sensor values exceed thresholds
4. **Commands**: Send commands from dashboard to control the system
5. **Analytics**: Calculate average, min, max sensor values
6. **Historical charts**: Display sensor data trends over time

## File Structure
```
server/
├── src/
│   ├── server.js (modified - Socket.io integration)
│   ├── socketHandler.js (new - Socket.io logic)
│   ├── models/
│   │   └── sensorDataModel.js (new - Sensor schema)
│   ├── routes/
│   └── middleware/
└── package.json (modified - socket.io added)

client/
└── src/
    └── components/
        └── dashboard/
            └── Dashboard.jsx (modified - Real-time updates)
```
