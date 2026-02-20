import mongoose from "mongoose";
import {HistoryDB} from "../config/db.js";
const historySchema = new mongoose.Schema({

 device_id: String,
 temperature: Number,
 humidity: Number,
 moisture: Number,
 weight: Number,
 status: String,

 timestamp:{
  type: Date,
  default: Date.now
 }

});

module.exports = HistoryDB.model("HistoryDB", historySchema,"history_date");