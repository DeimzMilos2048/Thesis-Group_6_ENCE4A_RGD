import mongoose from 'mongoose';
import { sensorDB } from '../config/db.js';

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
      default: 0
    },
    humidity: {
      type: Number,
      required: true,
      default: 0
    },
    moisture1: {
      type: Number,
      required: true,
      default: 0
    },
    moisture2: {
      type: Number,
      required: true,
      default: 0
    },
    moisture3: {
      type: Number,
      required: true,
      default: 0
    },
    moisture4: {
      type: Number,
      required: true,
      default: 0
    },
    moisture5: {
      type: Number,
      required: true,
      default: 0
    },
    moisture6: {
      type: Number,
      required: true,
      default: 0
    },
    moistureavg: {
      type: Number,
      required: true,
      default: 0
    },
    weight1: {
      type: Number,
      required: true,
      default: 0
    },
    weight2: {
      type: Number,
      required: false,
      default: 0
    },
    status: {
      type: String,
      enum: ['Idle', 'Drying', 'Finished', 'Completed', 'Error', 'Warning'],
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

export default sensorDB.model('esp32_db', sensorDataSchema, "sensor_readings_table");