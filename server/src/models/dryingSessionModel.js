import mongoose from 'mongoose';
import { sensorDB } from '../config/db.js';

const dryingSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false
    },
    startTime: {
      type: Date,
      required: true
    },
    endTime: {
      type: Date,
      required: true
    },
    elapsedSeconds: {
      type: Number,
      default: 0
    },
    temperature: {
      type: Number,
      default: 0
    },
    selectedMoisture: {
      type: Number,
      default: 13
    },
    // Latest sensor readings when stopped
    temperature: {
      type: Number,
      default: 0
    },
    humidity: {
      type: Number,
      default: 0
    },
    moisture1: {
      type: Number,
      default: 0
    },
    moisture2: {
      type: Number,
      default: 0
    },
    moisture3: {
      type: Number,
      default: 0
    },
    moisture4: {
      type: Number,
      default: 0
    },
    moisture5: {
      type: Number,
      default: 0
    },
    moisture6: {
      type: Number,
      default: 0
    },
    moistureavg: {
      type: Number,
      default: 0
    },
    weight1_t1: { type: Number, default: null },
    weight1_t2: { type: Number, default: null },
    weight1_t3: { type: Number, default: null },
    weight1_t4: { type: Number, default: null },
    weight1_t5: { type: Number, default: null },
    weight1_t6: { type: Number, default: null },
    weight2_t1: { type: Number, default: null },
    weight2_t2: { type: Number, default: null },
    weight2_t3: { type: Number, default: null },
    weight2_t4: { type: Number, default: null },
    weight2_t5: { type: Number, default: null },
    weight2_t6: { type: Number, default: null },
    status: {
      type: String,
      enum: ['Completed', 'Stopped', 'Error'],
      default: 'Stopped'
    }
  },
  { timestamps: true }
);

// Index for efficient queries
dryingSessionSchema.index({ userId: 1, startTime: -1 });
dryingSessionSchema.index({ startTime: -1 });

export default sensorDB.model('DryingSession', dryingSessionSchema, 'drying_sessions');
