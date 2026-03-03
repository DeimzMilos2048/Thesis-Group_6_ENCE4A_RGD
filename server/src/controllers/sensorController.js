import Sensor from '../models/sensorModel.js';
import sendNotification from './notificationController.js';
export const updateSensor = async (req, res) => {
    try{
        const {deviceId, powerStatus,temperature,humidity,moisture1,moisture2,moisture3,moisture4,moisture5,moisture6,
            weight1} = req.body;

        const sensorData = await Sensor.create({
            deviceId,
            powerStatus,
            temperature,
            humidity,
            moisture1,
            moisture2,
            moisture3,
            moisture4,
            moisture5,
            moisture6,
            weight1,
        });

        if(!powerStatus){
            await sendNotification("Dryer is turned off", "The dryer has been turned off. Please check the device.");
        }
        if(temperature > 45){
            await sendNotification("High Temperature Alert", "The temperature has exceeded the safe limit.");
        }
        if(moisture1 > 13 || moisture1 < 14){
            await sendNotification("Please take out the tray 1 immediately");
        }
        if(moisture2 > 13 || moisture2 < 14){
            await sendNotification("Please take out the tray 2 immediately");
        }
        if(moisture3 > 13 || moisture3 < 14){
            await sendNotification("Please take out the tray 3 immediately");
        }
        if(moisture4 > 13 || moisture4 < 14){
            await sendNotification("Please take out the tray 4 immediately");
        }
        if(moisture5 > 13 || moisture5 < 14){
            await sendNotification("Please take out the tray 5 immediately");
        }
        if(moisture6 > 13 || moisture6 < 14){
            await sendNotification("Please take out the tray 6 immediately");
        }

        res.json(sensorData);
    }catch(error){
        res.status(500).json({message: error.message});
    }
};