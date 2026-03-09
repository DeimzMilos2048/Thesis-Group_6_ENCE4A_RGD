const API = "https://objurgatory-darrell-nonconversantly.ngrok-free.dev/api/system";

export const startDrying = async (temperature, moisture) => {

  const res = await fetch(`${API}/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      temperature,
      moisture
    })
  });

  return res.json();
};

export const stopDrying = async () => {

  const res = await fetch(`${API}/stop`, {
    method: "POST"
  });

  return res.json();
};