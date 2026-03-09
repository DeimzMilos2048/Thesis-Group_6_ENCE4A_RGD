import mongoose from "mongoose";
import {notifiDB} from "../config/db.js";

const SensorDataSchema = new mongoose.Schema({
  temperature: Number,
  humidity: Number,
  moisture1: Number,
  moisture2: Number,
  moisture3: Number,
  moisture4: Number,
  moisture5: Number,
  moisture6: Number,
  moistureavg: Number,
  weight1: Number,
}, { _id: false });

const ThresholdSchema = new mongoose.Schema({
  temperatureMax: Number,
  temperatureMin: Number, 
  humidityMax: Number,
  humidityMin: Number,
  moisture1Target: Number,
  moisture2Target: Number,
  moisture3Target: Number,
  moisture4Target: Number,
  moisture5Target: Number,
  moisture6Target: Number,
  weightMax: Number
}, { _id: false });

const NotificationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["CRITICAL", "WARNING", "STABLE"],
    required: true
  },
  event: {
    type: String,
    enum: [
      "TEMPERATURE_CRITICAL",
      "TEMPERATURE_WARNING",
      "HUMIDITY_WARNING",
      "MOISTURE_TARGET_REACHED",
      "TRAY_READY",
      "POWER_OFF",
      "POWER_ON",
      "DRYING_STARTED",
      "DRYING_COMPLETED",
      "DEVICE_OFFLINE",
      "DEVICE_ONLINE",
      "SYSTEM_ALERT"
    ],
    default: "SYSTEM_ALERT"
  },
  source: {
    type: String,
    enum: ["DEVICE", "SYSTEM", "SENSOR"],
    default: "SYSTEM"
  },
  deviceId: {
    type: String,
    default: "ESP32_001"
  },
  title: {
    type: String,
    required: true  
  },
  message: {
    type: String,
    required: true  
  },
  system: {
    type: String,
    default: "MALA"
  },
  tray_number: {
    type: Number,
    enum: [1, 2, 3, 4, 5, 6],
    default: null
  },
  sensorData: SensorDataSchema,
  thresholds: ThresholdSchema,
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

NotificationSchema.index({ isRead: 1, createdAt: -1 });
NotificationSchema.index({ deviceId: 1, createdAt: -1 });
NotificationSchema.index({ type: 1, createdAt: -1 });

export default notifiDB.model("NotificationDB", NotificationSchema,"alert_notification");
