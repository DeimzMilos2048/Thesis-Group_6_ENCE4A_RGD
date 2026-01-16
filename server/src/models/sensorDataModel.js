import mongoose from 'mongoose';

const sensorDataSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false
    },
    temperature: {
      type: Number,
      required: true,
      min: 50,
      max: 60
    },
    humidity: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      max: 65
    },
    moisture: {
      type: Number,
      required: true,
      min: 10,
      max: 14
    },
    weight: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      max: 25
    },
    status: {
      type: String,
      enum: ['Idle', 'Drying', 'Completed', 'Error','Warning'],
      default: 'Idle'
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  { timestamps: true }
);

// Index for efficient queries
sensorDataSchema.index({ userId: 1, timestamp: -1 });
sensorDataSchema.index({ timestamp: -1 });

export default mongoose.model('SensorData', sensorDataSchema,"sensor_readings_table");
