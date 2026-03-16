import express from "express";
import axios from "axios";
import SystemConfig from "../models/systemConfigModel.js";
import DryingSession from "../models/dryingSessionModel.js";
import SensorData from "../models/sensorDataModel.js";

const router = express.Router();

/*
GET CURRENT SYSTEM CONFIG
*/
router.get("/config", async (req, res) => {
  try {

    let config = await SystemConfig.findOne();

    if (!config) {
      config = await SystemConfig.create({});
    }

    res.json({
      config: {
        selectedTemperature: config.selectedTemperature,
        selectedMoisture: config.selectedMoisture,
        selectedTrays: config.selectedTrays || []
      },
      running: config.dryerStatus === "drying"
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


/*
SET TEMPERATURE
*/
router.post("/temperature", async (req, res) => {

  try {

    const { value } = req.body;

    if (![40, 41, 42, 43, 44, 45].includes(value)) {
      return res.status(400).json({ error: "Invalid temperature" });
    }

    let config = await SystemConfig.findOne();
    if (!config) config = new SystemConfig();

    config.selectedTemperature = value;

    await config.save();

    res.json({
      success: true,
      message: "Temperature updated",
      config
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }

});


/*
SET MOISTURE
*/
router.post("/moisture", async (req, res) => {

  try {

    const { value } = req.body;

    if (![13, 14].includes(value)) {
      return res.status(400).json({ error: "Invalid moisture" });
    }

    let config = await SystemConfig.findOne();
    if (!config) config = new SystemConfig();

    config.selectedMoisture = value;

    await config.save();

    res.json({
      success: true,
      message: "Moisture updated",
      config
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }

});


/*
SET TRAY
*/
router.post("/tray", async (req, res) => {
  try {

    const tray = parseInt(req.body.value, 10);

    const config = await SystemConfig.findOneAndUpdate(
      {},
      { $addToSet: { selectedTrays: tray } },   // Mongo atomic add
      { new: true, upsert: true }
    );

    res.json({
      success: true,
      trays: config.selectedTrays
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
/*
START DRYING
*/
router.post("/dryer/start", async (req, res) => {
  try {

    const { temperature, moisture } = req.body;

    let config = await SystemConfig.findOne();
    if (!config) config = new SystemConfig();

    config.dryerStatus = "drying";
    config.dryingStartTime = new Date();
    config.dryingElapsedSeconds = 0;
    config.dryingStoppedAt = null;

    if (temperature) config.selectedTemperature = temperature;
    if (moisture) config.selectedMoisture = moisture;

    await config.save();

    await axios.post("http://10.42.0.1:5001/api/system/start", {
      temperature: config.selectedTemperature,
      moisture: config.selectedMoisture,
      trays: config.selectedTrays
    });

    const io = req.app.get("io");

    if (io) {
      io.emit("dryer:status_updated", {
        status: "drying",
        startTime: config.dryingStartTime,
        temperature: config.selectedTemperature,
        moisture: config.selectedMoisture,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      message: "Drying started",
      data: {
        status: config.dryerStatus,
        startTime: config.dryingStartTime
      }
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});





/*
STOP DRYING
*/
router.post("/dryer/stop", async (req, res) => {

  try {

    let config = await SystemConfig.findOne();

    if (!config) {
      return res.status(400).json({ error: "System config not found" });
    }

    let elapsedSeconds = 0;

    if (config.dryingStartTime) {
      const now = new Date();
      elapsedSeconds = Math.floor(
        (now.getTime() - config.dryingStartTime.getTime()) / 1000
      );
    }

    const latestSensor = await SensorData.findOne().sort({ timestamp: -1 });

    const dryingSession = new DryingSession({
      startTime: config.dryingStartTime || new Date(),
      endTime: new Date(),
      elapsedSeconds,
      temperature: config.selectedTemperature,
      selectedMoisture: config.selectedMoisture,
      humidity: latestSensor?.humidity || 0,
      moistureavg: latestSensor?.moistureavg || 0,
      status: "Stopped"
    });

    await dryingSession.save();

    config.dryerStatus = "idle";
    config.dryingElapsedSeconds = elapsedSeconds;
    config.dryingStoppedAt = new Date();
    config.dryingStartTime = null;

    await config.save();

    try {
      await axios.post("http://10.42.0.1:5001/api/system/stop");
    } catch (error) {
      console.error("ESP server error:", error.message);
    }

    res.json({
      success: true,
      message: "Drying stopped",
      elapsedSeconds
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }

});

//Dryer remove

router.post("/tray/remove", async (req, res) => {
  try {

    const tray = Number(req.body.value);

    let config = await SystemConfig.findOne();
    if (!config) return res.status(404).json({ error: "Config not found" });

    if (!config.selectedTrays) config.selectedTrays = [];

    config.selectedTrays = config.selectedTrays.filter(t => t !== tray);

    await config.save();

    res.json({
      success: true,
      trays: config.selectedTrays
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


/*
GET DRYER STATUS
*/
router.get("/dryer/status", async (req, res) => {

  try {

    let config = await SystemConfig.findOne();
    if (!config) config = new SystemConfig();

    let elapsedSeconds = 0;
    let isRunning = config.dryerStatus === "drying";

    if (isRunning && config.dryingStartTime) {
      const now = new Date();
      elapsedSeconds = Math.floor(
        (now.getTime() - config.dryingStartTime.getTime()) / 1000
      );
    }

    res.json({
      success: true,
      data: {
        status: config.dryerStatus,
        isRunning,
        startTime: config.dryingStartTime,
        elapsedSeconds,
        temperature: config.selectedTemperature,
        moisture: config.selectedMoisture,
        trays: config.selectedTrays
      }
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }

});

export default router;