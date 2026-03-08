import mongoose from "mongoose";
import { sensorDB } from "../config/db.js";

const systemConfigSchema = new mongoose.Schema({
  selectedTemperature: {
    type: Number,
    enum: [40, 41, 42, 43, 44, 45],
    default: 40
  },
  selectedMoisture: {
    type: Number,
    enum: [13, 14],
    default: 13
  },
  selectedTray: {
    type: Number,
    enum: [1,2,3,4,5,6],
    default: 1
  }
});

export default sensorDB.model("system_config", systemConfigSchema);