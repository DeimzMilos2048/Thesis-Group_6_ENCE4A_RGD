const API = `${process.env.REACT_APP_API_URL || 'http://10.42.0.1:5001'}/api/system`;


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