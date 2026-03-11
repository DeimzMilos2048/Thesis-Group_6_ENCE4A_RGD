import axios from '../utils/axios';

export const startDrying = async (temperature, moisture) => {
  const res = await axios.post('/api/system/start', { temperature, moisture });
  return res.data;
};

export const stopDrying = async () => {
  const res = await axios.post('/api/system/stop');
  return res.data;
};

export const setTemperature = async (temperature) => {
  const res = await axios.post('/api/system/temperature', { value: temperature });
  return res.data;
};

export const setMoisture = async (moisture) => {
  const res = await axios.post('/api/system/moisture', { value: moisture });
  return res.data;
};

export const setTray = async (tray) => {
  const res = await axios.post('/api/system/tray', { value: tray });
  return res.data;
};
