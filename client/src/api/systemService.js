const API = "https://objurgatory-darrell-nonconversantly.ngrok-free.dev";


export const setTemperature = async (value) => {
  const res = await fetch(`${API}/temperature`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value })
  });

  return res.json();
};

export const setMoisture = async (value) => {
  const res = await fetch(`${API}/moisture`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value })
  });

  return res.json();
};

export const setTray = async (value) => {
  const res = await fetch(`${API}/tray`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value })
  });

  return res.json();
};