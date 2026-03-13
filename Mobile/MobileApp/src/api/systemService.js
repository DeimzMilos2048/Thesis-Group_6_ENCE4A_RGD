import { SYSTEM_API_URL } from '../config/apiConfig.js';

export const startDrying = async (temperature, moisture) => {
  const res = await fetch(`${SYSTEM_API_URL}/dryer/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ temperature, moisture })
  });
  return res.json();
};

export const stopDrying = async () => {
  const res = await fetch(`${SYSTEM_API_URL}/dryer/stop`, {
    method: "POST"
  });
  return res.json();
};

export const setTemperature = async (temperature) => {
  const res = await fetch(`${SYSTEM_API_URL}/temperature`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value: temperature })  // backend reads req.body.value
  });
  return res.json();
};

export const setMoisture = async (moisture) => {
  const res = await fetch(`${SYSTEM_API_URL}/moisture`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value: moisture })
  });
  return res.json();
};

export const setTray = async (tray) => {
  const res = await fetch(`${SYSTEM_API_URL}/tray`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value: tray })
  });
  return res.json();
};
