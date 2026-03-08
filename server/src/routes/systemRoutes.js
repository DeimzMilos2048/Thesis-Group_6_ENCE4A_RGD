import express from "express";
import SystemConfig from "../models/systemConfigModel.js";

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

export default router;