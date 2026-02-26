import Sensor from '../models/sensorModel.js';
import sendNotification from './notificationController.js';
export const updateSensor = async (req, res) => {
    try{
        const {deviceId, powerStatus,temperature,humidity,moisture1,moisture2,moisture3,moisture4,moisture5,moisture6,
            weight1,weight2,weight3,weight4,weight5,weight6} = req.body;

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
            weight2,
            weight3,
            weight4,
            weight5,
            weight6
        });

        if(!powerStatus){
            await sendNotification("Dryer is turned off", "The dryer has been turned off. Please check the device.");
        }
        if(temperature > 50){
            await sendNotification("High Temperature Alert", "The temperature has exceeded the safe limit.");
        }
        res.json(sensorData);
    }catch(error){
        res.status(500).json({message: error.message});
    }
};