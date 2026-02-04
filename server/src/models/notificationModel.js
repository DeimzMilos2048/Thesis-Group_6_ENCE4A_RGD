import mongoose from "mongoose";
import {notifiDB} from "../config/db.js";

const SensorDataSchema = new mongoose.Schema({
  temperature: Number,
  humidity: Number,
  moistureContent: Number,
  weight: Number
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
  title: String,
  message: String,
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
    default: Date.now
  }
});

export default notifiDB.model("NotificationDB", NotificationSchema,"alert_notification");
