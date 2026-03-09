const API = "https://objurgatory-darrell-nonconversantly.ngrok-free.dev/api/system";

export const startDrying = async (temperature, moisture) => {
  const res = await fetch(`${API}/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ temperature, moisture })
  });
  return res.json();
};

export const stopDrying = async () => {
  const res = await fetch(`${API}/stop`, {
    method: "POST"
  });
  return res.json();
};

export const setTemperature = async (temperature) => {
  const res = await fetch(`${API}/temperature`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value: temperature })  // backend reads req.body.value
  });
  return res.json();
};

export const setMoisture = async (moisture) => {
  const res = await fetch(`${API}/moisture`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value: moisture })
  });
  return res.json();
};

export const setTray = async (tray) => {
  const res = await fetch(`${API}/tray`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value: tray })
  });
  return res.json();
};
