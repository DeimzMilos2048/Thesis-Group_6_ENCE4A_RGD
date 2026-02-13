import mongoose from "mongoose";
import {notifiDB} from "../config/db.js";

const SensorDataSchema = new mongoose.Schema({
  temperature: Number,
  humidity: Number,
  moisture1: Number,
  moisture2: Number,
  weight1: Number,
  weight2: Number
}, { _id: false });

const ThresholdSchema = new mongoose.Schema({
  temperatureMax: Number,
  temperatureMin: Number,
  humidityMax: Number,
  humidityMin: Number,
  moistureTarget: Number,
  weightMax: Number
}, { _id: false });

const NotificationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["CRITICAL", "WARNING", "STABLE"],
    required: true
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
    default: "Rice Grain Dryer"
  },
  sensorData: SensorDataSchema,
  thresholds: ThresholdSchema,
  isRead: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

NotificationSchema.index({ isRead: 1, createdAt: -1 });

export default notifiDB.model("NotificationDB", NotificationSchema,"alert_notification");
