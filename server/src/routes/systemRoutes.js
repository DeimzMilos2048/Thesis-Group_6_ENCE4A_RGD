import express from "express";
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

    if(!config){
      config = await SystemConfig.create({});
    }

    res.json({
      success:true,
      config
    });

  } catch(err){
    res.status(500).json({error:err.message});
  }
});


/*
SET TEMPERATURE BUTTON
*/
router.post("/temperature", async (req,res)=>{

  try{

    const {value} = req.body;

    if(![40,41,42,43,44,45].includes(value)){
      return res.status(400).json({error:"Invalid temperature"});
    }

    let config = await SystemConfig.findOne();
    if(!config) config = new SystemConfig();

    config.selectedTemperature = value;

    await config.save();

    res.json({
      success:true,
      message:"Temperature updated",
      config
    });

  }catch(err){
    res.status(500).json({error:err.message});
  }

});


/*
SET MOISTURE BUTTON
*/
router.post("/moisture", async (req,res)=>{

  try{

    const {value} = req.body;

    if(![13,14].includes(value)){
      return res.status(400).json({error:"Invalid moisture"});
    }

    let config = await SystemConfig.findOne();
    if(!config) config = new SystemConfig();

    config.selectedMoisture = value;

    await config.save();

    res.json({
      success:true,
      message:"Moisture updated",
      config
    });

  }catch(err){
    res.status(500).json({error:err.message});
  }

});


/*
SET TRAY BUTTON
*/
router.post("/tray", async (req,res)=>{

  try{

    const {value} = req.body;

    if(![1,2,3,4,5,6].includes(value)){
      return res.status(400).json({error:"Invalid tray"});
    }

    let config = await SystemConfig.findOne();
    if(!config) config = new SystemConfig();

    config.selectedTray = value;

    await config.save();

    res.json({
      success:true,
      message:"Tray updated",
      config
    });

  }catch(err){
    res.status(500).json({error:err.message});
  }

});

/*
START DRYING - Backend is source of truth
*/
router.post("/dryer/start", async (req, res) => {
  try {
    const { temperature, moisture } = req.body;

    let config = await SystemConfig.findOne();
    if (!config) config = new SystemConfig();

    // Set drying state with current server timestamp
    config.dryerStatus = "drying";
    config.dryingStartTime = new Date();
    config.dryingElapsedSeconds = 0;
    config.dryingStoppedAt = null;

    // Update temperature and moisture if provided
    if (temperature && [40, 41, 42, 43, 44, 45].includes(temperature)) {
      config.selectedTemperature = temperature;
    }
    if (moisture && [13, 14].includes(moisture)) {
      config.selectedMoisture = moisture;
    }

    await config.save();

    // Emit socket event for real-time sync across clients
    const io = req.app.get("io");
    if (io) {
      io.emit("dryer:status_updated", {
        status: "drying",
        startTime: config.dryingStartTime,
        temperature: config.selectedTemperature,
        moisture: config.selectedMoisture,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      message: "Drying started",
      data: {
        status: config.dryerStatus,
        startTime: config.dryingStartTime,
        temperature: config.selectedTemperature,
        moisture: config.selectedMoisture,
      },
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

    // Calculate elapsed time
    let elapsedSeconds = 0;
    if (config.dryingStartTime) {
      const now = new Date();
      elapsedSeconds = Math.floor(
        (now.getTime() - config.dryingStartTime.getTime()) / 1000
      );
    }

    // Get latest sensor data for the drying session record
    const latestSensor = await SensorData.findOne().sort({ timestamp: -1 });

    // Create a drying session record with endTime
    const dryingSession = new DryingSession({
      startTime: config.dryingStartTime || new Date(),
      endTime: new Date(),
      elapsedSeconds: elapsedSeconds,
      temperature: config.selectedTemperature,
      selectedMoisture: config.selectedMoisture,
      humidity: latestSensor?.humidity || 0,
      moisture1: latestSensor?.moisture1 || 0,
      moisture2: latestSensor?.moisture2 || 0,
      moisture3: latestSensor?.moisture3 || 0,
      moisture4: latestSensor?.moisture4 || 0,
      moisture5: latestSensor?.moisture5 || 0,
      moisture6: latestSensor?.moisture6 || 0,
      moistureavg: latestSensor?.moistureavg || 0,
      weight1_t1: latestSensor?.weight1_t1 || null,
      weight1_t2: latestSensor?.weight1_t2 || null,
      weight1_t3: latestSensor?.weight1_t3 || null,
      weight1_t4: latestSensor?.weight1_t4 || null,
      weight1_t5: latestSensor?.weight1_t5 || null,
      weight1_t6: latestSensor?.weight1_t6 || null,
      weight2_t1: latestSensor?.weight2_t1 || null,
      weight2_t2: latestSensor?.weight2_t2 || null,
      weight2_t3: latestSensor?.weight2_t3 || null,
      weight2_t4: latestSensor?.weight2_t4 || null,
      weight2_t5: latestSensor?.weight2_t5 || null,
      weight2_t6: latestSensor?.weight2_t6 || null,
      status: 'Stopped'
    });

    await dryingSession.save();

    // Update system config status
    config.dryerStatus = "idle";
    config.dryingElapsedSeconds = elapsedSeconds;
    config.dryingStoppedAt = new Date();
    config.dryingStartTime = null;

    await config.save();

    // Emit socket event for real-time sync
    const io = req.app.get("io");
    if (io) {
      io.emit("dryer:status_updated", {
        status: "idle",
        elapsedSeconds: elapsedSeconds,
        stoppedAt: config.dryingStoppedAt,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      message: "Drying stopped",
      data: {
        status: config.dryerStatus,
        elapsedSeconds: elapsedSeconds,
        dryingSession: dryingSession
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/*
GET DRYER STATUS AND CALCULATE ELAPSED TIME
Backend calculates elapsed time, not frontend
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
    } else if (config.dryerStatus === "idle") {
      elapsedSeconds = config.dryingElapsedSeconds;
    }

    res.json({
      success: true,
      data: {
        status: config.dryerStatus,
        isRunning: isRunning,
        startTime: config.dryingStartTime,
        elapsedSeconds: elapsedSeconds,
        temperature: config.selectedTemperature,
        moisture: config.selectedMoisture,
        tray: config.selectedTray,
        lastUpdated: new Date().toISOString(),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;