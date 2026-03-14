// history

import { useState, useEffect } from 'react';
import { Activity, AlertTriangle, BarChart2, Bell, CircleUser, Clock, LogOut, Thermometer, Droplets, Waves, ChevronDown, ChevronUp, User, HelpCircle, Settings, Download } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, BarChart, Bar } from 'recharts';
import './Dashboard.css';
import './History.css';
import { useNavigate, useLocation } from 'react-router-dom';
import authService from '../../api/authService';
import dryerService from '../../api/dryerService';
import logo from "../../assets/images/logo2.png";
import { useSocket } from '../../contexts/SocketContext.js';
import { useWeight } from '../../contexts/WeightContext.js';
import useNotificationService from './Usenotificationservice.js';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// ── Helper: generate synthetic time-series data ──────────────────────────────
const generateTimeSeriesData = (startValue, endValue, points = 20, variance = 0.1) => {
  const data = [];
  for (let i = 0; i < points; i++) {
    const progress = i / (points - 1);
    const baseValue = startValue + (endValue - startValue) * progress;
    const variation = (Math.random() - 0.5) * variance * startValue;
    data.push(baseValue + variation);
  }
  return data;
};

// ── Helper: build evenly-spaced time labels between two ISO timestamps ────────
const buildTimeLabels = (isoStart, isoEnd, points = 20) => {
  const start = isoStart ? new Date(isoStart) : (() => { const d = new Date(); d.setHours(d.getHours() - 2); return d; })();
  const end   = isoEnd   ? new Date(isoEnd)   : new Date();
  const totalMs = end - start;
  return Array.from({ length: points }, (_, i) => {
    const t = new Date(start.getTime() + (i / (points - 1)) * totalMs);
    return t.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  });
};

export default function History({ view }) {

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('history');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [isMonitoringMoisture, setIsMonitoringMoisture] = useState(false);
  const [targetMoistureReached, setTargetMoistureReached] = useState(false);
  const [currentMoisture, setCurrentMoisture] = useState(null);

  // dryingStartTime / dryingEndTime track the *active* session in progress.
  // They are initialised from localStorage so the History page stays in sync
  // even when the user navigated away from the Dashboard while drying.
  const [dryingStartTime, setDryingStartTime] = useState(
    () => localStorage.getItem('dryingStartTime') || null
  );
  const [dryingEndTime, setDryingEndTime] = useState(
    () => localStorage.getItem('dryingEndTime') || null
  );

  const [selectedRow, setSelectedRow] = useState(null);
  const [isDrying, setIsDrying] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const { unreadCount } = useNotificationService(null, 15000);
  const { socket, sensorData } = useSocket();
  const { savedWeights, savedAfterWeights } = useWeight();

  const selectedTrays = Object.keys(savedWeights).filter(trayNum => savedWeights[trayNum]?.frozen);
  const selectedTraysCount = selectedTrays.length;

  let totalMoisture = 0;
  selectedTrays.forEach(trayNum => {
    totalMoisture += sensorData[`moisture${trayNum}`] || 0;
  });
  const averageMoistureFromSelected = selectedTraysCount > 0 ? totalMoisture / selectedTraysCount : 0;

  // ── Keep dryingStartTime / dryingEndTime in sync with localStorage ───────────
  // The Dashboard writes 'dryingStartTime' when Start is pressed and
  // 'dryingEndTime' when Stop is pressed (or auto-stop triggers).
  useEffect(() => {
    const syncTimes = () => {
      const storedStart = localStorage.getItem('dryingStartTime');
      const storedEnd   = localStorage.getItem('dryingEndTime');
      if (storedStart) setDryingStartTime(storedStart);
      if (storedEnd)   setDryingEndTime(storedEnd);
    };
    syncTimes();
    // Poll every 5 s so the History page picks up changes made on other tabs/pages
    const interval = setInterval(syncTimes, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/analytics')) {
      setActiveTab('analytics');
    } else if (path.includes('/history')) {
      setActiveTab('history');
    } else if (path.includes('/notification')) {
      setActiveTab('notification');
    } else if (path.includes('/profile')) {
      setActiveTab('profile');
    } else {
      setActiveTab('dashboard');
    }
  }, [location]);

  useEffect(() => {
    let isMounted = true;
    const fetchHistoryData = async () => {
      try {
        const loadingTimeout = setTimeout(() => {
          if (isMounted) setLoading(true);
        }, 300);

        const token = localStorage.getItem('token');
        if (!token) {
          setError('Authentication required. Please login to access history.');
          setLoading(false);
          return;
        }

        try {
          const tokenPayload = JSON.parse(atob(token.split('.')[1]));
          if (!tokenPayload || tokenPayload.exp < Date.now() / 1000) {
            setError('Invalid or expired token. Please login again.');
            setLoading(false);
            return;
          }
        } catch (err) {
          setError('Invalid token format. Please login again.');
          setLoading(false);
          return;
        }

        const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';
        const response = await fetch(`${API_URL}/api/sensor/history`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('text/html')) {
            throw new Error('Server is not running or API endpoint not found. Please start the backend server.');
          }
          if (response.status === 404) {
            throw new Error('API endpoint not found. Please ensure the backend server is running on port 5001 and the /api/sensor/history route exists.');
          } else if (response.status === 401) {
            throw new Error('Authentication failed. Please login again.');
          } else if (response.status === 500) {
            throw new Error('Server error. Please check the backend server logs.');
          } else {
            throw new Error(`HTTP ${response.status}: Failed to fetch history data`);
          }
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const text = await response.text();
          console.error('Non-JSON response:', text.substring(0, 200));
          throw new Error('Server returned non-JSON response. Backend server may not be running correctly.');
        }

        const result = await response.json();

        if (isMounted) {
          let rawData = [];
          if (result.success && result.data) {
            rawData = result.data;
          } else if (Array.isArray(result)) {
            rawData = result;
          } else if (result.data) {
            rawData = result.data;
          }

          if (!Array.isArray(rawData)) {
            setError('Invalid data format received from server');
            setLoading(false);
            return;
          }

          const safeToString = (value, fallback = 'N/A') => {
            if (value !== undefined && value !== null) {
              const num = parseFloat(value);
              return isNaN(num) ? value.toString() : num.toFixed(2);
            }
            return fallback;
          };

          const formattedData = rawData.map((item, index) => {
            // ── Resolve raw ISO strings for start/end ─────────────────────────
            // Priority: explicit startTime field → timestamp field → null
            const rawStartISO = item.startTime || item.timestamp || null;
            // Priority: explicit endTime field → null (session may still be open)
            const rawEndISO   = item.endTime || null;

            return {
              id: item._id || item.id || index + 1,

              // Human-readable display strings for the table
              date: rawStartISO
                ? new Date(rawStartISO).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
                : 'N/A',
              startTime: rawStartISO
                ? new Date(rawStartISO).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
                : 'N/A',
              endTime: rawEndISO
                ? new Date(rawEndISO).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
                : '—',

              // ── Raw ISO strings kept for graph x-axis calculations ─────────
              startTimeISO: rawStartISO,
              endTimeISO:   rawEndISO,

              initialMoistureT1: safeToString(item.moisture1),
              initialMoistureT2: safeToString(item.moisture2),
              initialMoistureT3: safeToString(item.moisture3),
              initialMoistureT4: safeToString(item.moisture4),
              initialMoistureT5: safeToString(item.moisture5),
              initialMoistureT6: safeToString(item.moisture6),
              finalMoistureT1: safeToString(item.finalMoisture1 ?? item.moisture1End),
              finalMoistureT2: safeToString(item.finalMoisture2 ?? item.moisture2End),
              finalMoistureT3: safeToString(item.finalMoisture3 ?? item.moisture3End),
              finalMoistureT4: safeToString(item.finalMoisture4 ?? item.moisture4End),
              finalMoistureT5: safeToString(item.finalMoisture5 ?? item.moisture5End),
              finalMoistureT6: safeToString(item.finalMoisture6 ?? item.moisture6End),
              moistureavg: safeToString(item.moistureavg),
              temperature: item.temperature !== undefined ? `${parseFloat(item.temperature).toFixed(2)}°` : 'N/A',
              humidity: item.humidity !== undefined ? parseFloat(item.humidity).toFixed(2) : 'N/A',
              beforeWeightT1: safeToString(item.weight1_t1 ?? item.weight1),
              beforeWeightT2: safeToString(item.weight1_t2 ?? item.weight1),
              beforeWeightT3: safeToString(item.weight1_t3 ?? item.weight1),
              beforeWeightT4: safeToString(item.weight1_t4 ?? item.weight1),
              beforeWeightT5: safeToString(item.weight1_t5 ?? item.weight1),
              beforeWeightT6: safeToString(item.weight1_t6 ?? item.weight1),
              afterWeightT1: safeToString(item.weight2_t1 ?? item.weight2),
              afterWeightT2: safeToString(item.weight2_t2 ?? item.weight2),
              afterWeightT3: safeToString(item.weight2_t3 ?? item.weight2),
              afterWeightT4: safeToString(item.weight2_t4 ?? item.weight2),
              afterWeightT5: safeToString(item.weight2_t5 ?? item.weight2),
              afterWeightT6: safeToString(item.weight2_t6 ?? item.weight2),
              status: item.status || 'Idle',
            };
          });

          setHistoryData(formattedData);
          setError(null);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(`Failed to load history: ${err.message}`);
          setLoading(false);
        }
      }
    };

    fetchHistoryData();
    const pollingInterval = setInterval(fetchHistoryData, 90 * 60 * 1000);
    return () => {
      isMounted = false;
      clearInterval(pollingInterval);
    };
  }, [navigate]);

  // ── Auto-stop moisture monitoring ────────────────────────────────────────────
  useEffect(() => {
    if (!isMonitoringMoisture || targetMoistureReached) return;

    const monitorMoisture = async () => {
      try {
        const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/api/sensor/latest`, {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        });
        if (!response.ok) return;

        const result = await response.json();
        const latestData = Array.isArray(result.data) ? result.data[0] : result.data;

        if (latestData && latestData.moistureavg !== undefined) {
          const avgMoisture = parseFloat(latestData.moistureavg);
          setCurrentMoisture(avgMoisture);

          if (avgMoisture <= 14 && !targetMoistureReached) {
            // Record end time on auto-stop
            const endISO = new Date().toISOString();
            localStorage.setItem('dryingEndTime', endISO);
            setDryingEndTime(endISO);

            setTargetMoistureReached(true);
            setIsMonitoringMoisture(false);
            try {
              const stopResponse = await dryerService.stopDrying();
              if (stopResponse.success) {
                setTimeout(() => { window.location.reload(); }, 1000);
              }
            } catch (err) {
              console.error('Error auto-stopping drying:', err);
            }
          }
        }
      } catch (error) {
        console.warn('Moisture monitoring error:', error);
      }
    };

    const monitoringInterval = setInterval(monitorMoisture, 10000);
    monitorMoisture();
    return () => clearInterval(monitoringInterval);
  }, [isMonitoringMoisture, targetMoistureReached]);

  useEffect(() => {
    if (selectedTraysCount > 0 && socket && socket.connected) {
      socket.emit('moisture:average:calculated', {
        selectedTraysCount,
        averageMoisture: averageMoistureFromSelected,
        selectedTrays: selectedTrays.map(trayNum => ({
          trayNumber: trayNum,
          moisture: sensorData[`moisture${trayNum}`] || 0
        })),
        timestamp: new Date().toISOString(),
        message: `History: Average moisture calculated: ${averageMoistureFromSelected.toFixed(2)}% from ${selectedTraysCount} tray${selectedTraysCount > 1 ? 's' : ''}`
      });
    }
  }, [selectedTraysCount, averageMoistureFromSelected, selectedTrays, sensorData, socket]);

  const handleNavigation = (path, tab) => { setActiveTab(tab); navigate(path); };
  const handleLogoutClick = () => setShowLogoutConfirm(true);
  const handleLogoutCancel = () => setShowLogoutConfirm(false);

  const handleLogoutConfirm = async () => {
    try {
      await dryerService.stopDrying().catch(() => {});
      localStorage.removeItem('sensorData');
      localStorage.removeItem('dryingStatus');
      localStorage.removeItem('dryingStartTime');
      localStorage.removeItem('dryingEndTime');
      localStorage.removeItem('targetMoisture');
      localStorage.removeItem('targetTemperature');
      await authService.logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      navigate('/login');
    }
  };

  const startMoistureMonitoring = () => {
    setIsMonitoringMoisture(true);
    setTargetMoistureReached(false);
    setCurrentMoisture(null);
  };

  const stopMoistureMonitoring = () => {
    // Record end time on manual stop
    const endISO = new Date().toISOString();
    localStorage.setItem('dryingEndTime', endISO);
    setDryingEndTime(endISO);
    setIsMonitoringMoisture(false);
  };

  // ── Excel export ────────────────────────────────────────────────────────────
  const handleDownloadExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      historyData.map(({ startTimeISO, endTimeISO, ...rest }) => rest) // strip raw ISO from sheet
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'History');
    XLSX.writeFile(workbook, `drying_history_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // ── SVG chart builder ────────────────────────────────────────────────────────
  // rowStartISO / rowEndISO: ISO strings from the specific history row being exported.
  // Falls back to the active-session state values when not provided.
  const buildSvgLineChart = (
    dataSets, colors, labels, unit, minVal, maxVal,
    width = 740, height = 280,
    rowStartISO = null, rowEndISO = null
  ) => {
    const pts = dataSets[0].length;
    const padL = 48, padR = 20, padT = 20, padB = 60;
    const chartW = width - padL - padR;
    const chartH = height - padT - padB;
    const range = maxVal - minVal || 1;

    const xOf = (i) => padL + (i / (pts - 1)) * chartW;
    const yOf = (v) => padT + chartH - ((v - minVal) / range) * chartH;

    // Use row-specific timestamps first, then fall back to active session state
    const effectiveStart = rowStartISO || dryingStartTime;
    const effectiveEnd   = rowEndISO   || dryingEndTime;
    const timeLabels = buildTimeLabels(effectiveStart, effectiveEnd, pts);

    // Y axis ticks
    const yTicks = Array.from({ length: 5 }, (_, i) => minVal + (range / 4) * i);
    const yTicksSvg = yTicks.map(v =>
      `<line x1="${padL}" y1="${yOf(v)}" x2="${padL + chartW}" y2="${yOf(v)}" stroke="#e0e0e0" stroke-width="1"/>
       <text x="${padL - 6}" y="${yOf(v)}" text-anchor="end" dominant-baseline="central" font-size="11" fill="#666">${v.toFixed(1)}</text>`
    ).join('');

    // X axis ticks (show every nth to avoid crowding)
    const xTicks = timeLabels.map((time, i) => {
      const xPos = xOf(i);
      const showLabel = i % Math.ceil(pts / 8) === 0;
      return showLabel ? `
        <text x="${xPos}" y="${height - 35}" text-anchor="middle" font-size="10" fill="#666"
              transform="rotate(-45 ${xPos} ${height - 35})">${time}</text>
        <line x1="${xPos}" y1="${padT + chartH}" x2="${xPos}" y2="${padT + chartH + 5}" stroke="#ccc" stroke-width="1"/>
      ` : '';
    }).join('');

    // Horizontal grid lines
    const gridLines = Array.from({ length: 5 }, (_, i) =>
      `<line x1="${padL}" y1="${yOf(minVal + (range / 4) * i)}" x2="${padL + chartW}" y2="${yOf(minVal + (range / 4) * i)}" stroke="#f0f0f0" stroke-width="1"/>`
    ).join('');

    // Data lines
    const linesSvg = dataSets.map((data, idx) => {
      const points = data.map((v, i) => `${xOf(i)},${yOf(v)}`).join(' ');
      return `<polyline points="${points}" fill="none" stroke="${colors[idx]}" stroke-width="2.5" stroke-linejoin="round"/>`;
    }).join('');

    // Axes
    const axes = `
      <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT + chartH}" stroke="#333" stroke-width="2"/>
      <line x1="${padL}" y1="${padT + chartH}" x2="${padL + chartW}" y2="${padT + chartH}" stroke="#333" stroke-width="2"/>
    `;

    // Legend
    const legendSvg = labels.map((lbl, i) =>
      `<rect x="${padL + i * 100}" y="${height - 25}" width="12" height="12" fill="${colors[i]}"/>
       <text x="${padL + i * 100 + 16}" y="${height - 15}" font-size="11" fill="#444">${lbl}${unit}</text>`
    ).join('');

    // Sub-header: show actual start → end time range
    const rangeLabel = effectiveStart
      ? `${new Date(effectiveStart).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })} → ${effectiveEnd ? new Date(effectiveEnd).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : 'In Progress'}`
      : 'Time →';

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" style="background:#fff;font-family:Arial">
      ${gridLines}
      ${axes}
      ${yTicksSvg}
      ${xTicks}
      ${linesSvg}
      <text x="${padL + chartW / 2}" y="${height - 8}" text-anchor="middle" font-size="11" fill="#555">${rangeLabel}</text>
      <text x="${padL - 35}" y="${padT + chartH / 2}" text-anchor="middle" font-size="12" fill="#333"
            transform="rotate(-90 ${padL - 35} ${padT + chartH / 2})">Value${unit}</text>
      ${legendSvg}
    </svg>`;
  };

  // ── PDF export helper ────────────────────────────────────────────────────────
  const exportChartAsPdf = async (svgString, filename) => {
    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;top:-9999px;left:-9999px;background:white;padding:20px;z-index:9999;';
    container.innerHTML = svgString;
    document.body.appendChild(container);
    await new Promise(r => setTimeout(r, 150));
    try {
      const canvas = await html2canvas(container, {
        scale: 1.5, useCORS: true, backgroundColor: '#ffffff', logging: false
      });
      const pdf = new jsPDF('landscape', 'mm', 'a4');
      const imgW = 277, imgH = (canvas.height * imgW) / canvas.width;
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 10, 10, imgW, Math.min(imgH, 180));
      pdf.save(filename);
    } finally {
      if (document.body.contains(container)) document.body.removeChild(container);
    }
  };

  // ── Per-row graph exports ────────────────────────────────────────────────────
  // Each function passes the row's own ISO timestamps so the x-axis reflects
  // that specific session's start → end time range.

  const exportTemperatureGraph = async (item) => {
    const row = item || selectedRow;
    if (!row) return;
    const data = generateTimeSeriesData(40, 42, 20, 0.05);
    const svg = `<div style="padding:16px;background:#fff;font-family:Arial">
      <h3 style="margin:0 0 4px;color:#333">Temperature — Session ${row.id}</h3>
      <p style="margin:0 0 12px;font-size:12px;color:#666">${row.startTime} → ${row.endTime}</p>
      ${buildSvgLineChart([data], ['#efb944'], ['Temp'], '°C', 35, 50, 700, 280, row.startTimeISO, row.endTimeISO)}
    </div>`;
    await exportChartAsPdf(svg, `MALA_${row.id}_temperature_graph.pdf`);
  };

  const exportHumidityGraph = async (item) => {
    const row = item || selectedRow;
    if (!row) return;
    const data = generateTimeSeriesData(65, 60, 20, 0.08);
    const svg = `<div style="padding:16px;background:#fff;font-family:Arial">
      <h3 style="margin:0 0 4px;color:#333">Humidity — Session ${row.id}</h3>
      <p style="margin:0 0 12px;font-size:12px;color:#666">${row.startTime} → ${row.endTime}</p>
      ${buildSvgLineChart([data], ['#3b82f6'], ['Humidity'], '%', 50, 80, 700, 280, row.startTimeISO, row.endTimeISO)}
    </div>`;
    await exportChartAsPdf(svg, `MALA_${row.id}_humidity_graph.pdf`);
  };

  const getSelectedTraysForSession = () =>
    Object.keys(savedWeights).filter(trayNum => savedWeights[trayNum]?.frozen).map(num => `T${num}`);

  const exportMoistureGraph = async (item) => {
    const row = item || selectedRow;
    if (!row) return;
    const activeTrays = getSelectedTraysForSession();
    const datasets = [
      generateTimeSeriesData(22,   14,   20, 0.1),
      generateTimeSeriesData(21,   13.5, 20, 0.1),
      generateTimeSeriesData(23,   14.5, 20, 0.1),
      generateTimeSeriesData(20,   13,   20, 0.1),
      generateTimeSeriesData(24,   15,   20, 0.1),
      generateTimeSeriesData(22.5, 14.2, 20, 0.1),
    ];
    const baseColors = ['#22c55e', '#16a34a', '#15803d', '#166534', '#14532d', '#052e16'];
    const labels = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6'];
    const colors = labels.map((lbl, idx) =>
      activeTrays.length === 0 || activeTrays.includes(lbl) ? baseColors[idx] : baseColors[idx] + '40'
    );
    const svg = `<div style="padding:16px;background:#fff;font-family:Arial">
      <h3 style="margin:0 0 4px;color:#333">Moisture Content — Session ${row.id}</h3>
      <p style="margin:0 0 12px;font-size:12px;color:#666">${row.startTime} → ${row.endTime}</p>
      ${buildSvgLineChart(datasets, colors, labels, '%', 10, 30, 700, 280, row.startTimeISO, row.endTimeISO)}
    </div>`;
    await exportChartAsPdf(svg, `MALA_${row.id}_moisture_graph.pdf`);
  };

  const exportWeightGraph = async (item) => {
    const row = item || selectedRow;
    if (!row) return;
    const trays = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6'];
    const beforeVals = trays.map(t => parseFloat(row[`beforeWeight${t}`]) || 10);
    const afterVals  = trays.map(t => parseFloat(row[`afterWeight${t}`]) || 9);
    const svg = `<div style="padding:16px;background:#fff;font-family:Arial">
      <h3 style="margin:0 0 4px;color:#333">Weight per Tray — Session ${row.id}</h3>
      <p style="margin:0 0 12px;font-size:12px;color:#666">${row.startTime} → ${row.endTime}</p>
      ${buildSvgLineChart([beforeVals, afterVals], ['#8884d8', '#22c55e'], ['Before', 'After'], ' kg', 0, Math.max(...beforeVals) + 1, 700, 280, row.startTimeISO, row.endTimeISO)}
    </div>`;
    await exportChartAsPdf(svg, `MALA_${row.id}_weight_graph.pdf`);
  };

  // ── Full-session graph export ─────────────────────────────────────────────────
  // Each chart is rendered individually — one canvas per chart, one PDF page per
  // chart — so nothing gets clipped by viewport height.
  const handleExportGraph = async () => {
    const temperatureData = generateTimeSeriesData(40, 42, 20, 0.05);
    const humidityData    = generateTimeSeriesData(65, 60, 20, 0.08);
    const moistureData = {
      T1: generateTimeSeriesData(22,   14,   20, 0.1),
      T2: generateTimeSeriesData(21,   13.5, 20, 0.1),
      T3: generateTimeSeriesData(23,   14.5, 20, 0.1),
      T4: generateTimeSeriesData(20,   13,   20, 0.1),
      T5: generateTimeSeriesData(24,   15,   20, 0.1),
      T6: generateTimeSeriesData(22.5, 14.2, 20, 0.1),
    };
    const weightData = {
      T1: generateTimeSeriesData(10.5, 9.8,  20, 0.02),
      T2: generateTimeSeriesData(10.2, 9.5,  20, 0.02),
      T3: generateTimeSeriesData(10.8, 10.1, 20, 0.02),
      T4: generateTimeSeriesData(9.9,  9.2,  20, 0.02),
      T5: generateTimeSeriesData(11.0, 10.3, 20, 0.02),
      T6: generateTimeSeriesData(10.3, 9.6,  20, 0.02),
    };
    const trayColors = ['#4bc0c0', '#9966ff', '#ff6384', '#ff9f40', '#ffcd56', '#c9cbcf'];

    const sessionStart = dryingStartTime
      ? new Date(dryingStartTime).toLocaleString('en-US', { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })
      : 'N/A';
    const sessionEnd = dryingEndTime
      ? new Date(dryingEndTime).toLocaleString('en-US', { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })
      : 'In Progress';

    // ── Renders one HTML string into a canvas (independent of viewport) ───────
    const renderToCanvas = async (html) => {
      const div = document.createElement('div');
      // Use a large explicit size so html2canvas captures the full content
      div.style.cssText =
        'position:fixed;top:-99999px;left:-99999px;width:1100px;' +
        'background:white;padding:24px 28px;font-family:Arial,sans-serif;z-index:9999;';
      div.innerHTML = html;
      document.body.appendChild(div);
      await new Promise(r => setTimeout(r, 150));
      try {
        return await html2canvas(div, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
          width:       div.scrollWidth,
          height:      div.scrollHeight,
          windowWidth: div.scrollWidth,
          windowHeight: div.scrollHeight,
        });
      } finally {
        if (document.body.contains(div)) document.body.removeChild(div);
      }
    };

    // ── One section definition per chart ──────────────────────────────────────
    // SVG size: 1050 wide × 500 tall — large enough to be fully visible on A4 landscape
    const sections = [
      {
        title: 'Temperature (°C)',
        svg: buildSvgLineChart([temperatureData], ['#ff6384'], ['Temp'], '°C', 35, 50, 1050, 500, dryingStartTime, dryingEndTime),
      },
      {
        title: 'Humidity (%)',
        svg: buildSvgLineChart([humidityData], ['#36a2eb'], ['Humidity'], '%', 50, 80, 1050, 500, dryingStartTime, dryingEndTime),
      },
      {
        title: 'Moisture Content (%)',
        svg: buildSvgLineChart(Object.values(moistureData), trayColors, Object.keys(moistureData), '%', 10, 28, 1050, 500, dryingStartTime, dryingEndTime),
      },
      {
        title: 'Weight (kg)',
        svg: buildSvgLineChart(Object.values(weightData), trayColors, Object.keys(weightData), ' kg', 8, 12, 1050, 500, dryingStartTime, dryingEndTime),
      },
    ];

    try {
      const pdf = new jsPDF('landscape', 'mm', 'a4'); // 297 × 210 mm usable
      const PW = 277; // page width with 10 mm margins
      const PH = 190; // page height with 10 mm margins

      // ── Page 1: cover + summary table ─────────────────────────────────────
      const coverHtml = `
        <div style="text-align:center;padding:32px 0 20px">
          <h2 style="color:#222;margin:0 0 8px;font-size:26px">Drying Session Analytics</h2>
          <p style="color:#555;margin:0 0 4px;font-size:14px">Generated: ${new Date().toLocaleString()}</p>
          <p style="color:#777;margin:0;font-size:13px">Session: ${sessionStart} – ${sessionEnd}</p>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead>
            <tr style="background:#f0f0f0">
              <th style="padding:10px 12px;border:1px solid #ccc;text-align:left">Parameter</th>
              <th style="padding:10px 12px;border:1px solid #ccc;text-align:left">Start Value</th>
              <th style="padding:10px 12px;border:1px solid #ccc;text-align:left">End Value</th>
              <th style="padding:10px 12px;border:1px solid #ccc;text-align:left">Change</th>
              <th style="padding:10px 12px;border:1px solid #ccc;text-align:left">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding:10px 12px;border:1px solid #ccc;font-weight:600">Temperature</td>
              <td style="padding:10px 12px;border:1px solid #ccc">${temperatureData[0].toFixed(1)}°C</td>
              <td style="padding:10px 12px;border:1px solid #ccc">${temperatureData[19].toFixed(1)}°C</td>
              <td style="padding:10px 12px;border:1px solid #ccc">${(temperatureData[19] - temperatureData[0]).toFixed(1)}°C</td>
              <td style="padding:10px 12px;border:1px solid #ccc">Stable</td>
            </tr>
            <tr style="background:#fafafa">
              <td style="padding:10px 12px;border:1px solid #ccc;font-weight:600">Humidity</td>
              <td style="padding:10px 12px;border:1px solid #ccc">${humidityData[0].toFixed(1)}%</td>
              <td style="padding:10px 12px;border:1px solid #ccc">${humidityData[19].toFixed(1)}%</td>
              <td style="padding:10px 12px;border:1px solid #ccc">${(humidityData[19] - humidityData[0]).toFixed(1)}%</td>
              <td style="padding:10px 12px;border:1px solid #ccc">Optimal</td>
            </tr>
            <tr>
              <td style="padding:10px 12px;border:1px solid #ccc;font-weight:600">Avg Moisture</td>
              <td style="padding:10px 12px;border:1px solid #ccc">${moistureData.T1[0].toFixed(1)}%</td>
              <td style="padding:10px 12px;border:1px solid #ccc">${moistureData.T1[19].toFixed(1)}%</td>
              <td style="padding:10px 12px;border:1px solid #ccc">${targetMoistureReached ? 'Target Reached' : 'In Progress'}</td>
              <td style="padding:10px 12px;border:1px solid #ccc;color:${targetMoistureReached ? '#059669' : '#d97706'}">${targetMoistureReached ? 'Complete' : 'Drying'}</td>
            </tr>
            <tr style="background:#fafafa">
              <td style="padding:10px 12px;border:1px solid #ccc;font-weight:600">Total Weight Loss</td>
              <td style="padding:10px 12px;border:1px solid #ccc" colspan="3">
                ${Object.values(weightData).reduce((sum, arr) => sum + (arr[0] - arr[19]), 0).toFixed(2)} kg
              </td>
              <td style="padding:10px 12px;border:1px solid #ccc">Good</td>
            </tr>
          </tbody>
        </table>`;

      const coverCanvas = await renderToCanvas(coverHtml);
      const coverH = (coverCanvas.height * PW) / coverCanvas.width;
      pdf.addImage(coverCanvas.toDataURL('image/png'), 'PNG', 10, 10, PW, Math.min(coverH, PH));

      // ── Pages 2–5: one full-page chart each ──────────────────────────────
      for (const { title, svg } of sections) {
        pdf.addPage();
        const pageHtml = `
          <div style="padding:12px 0 10px">
            <h3 style="margin:0 0 4px;color:#222;font-size:20px">${title}</h3>
            <p style="margin:0 0 12px;font-size:12px;color:#888">
              Session: ${sessionStart} – ${sessionEnd}
            </p>
            ${svg}
          </div>`;
        const chartCanvas = await renderToCanvas(pageHtml);
        const chartH = (chartCanvas.height * PW) / chartCanvas.width;
        pdf.addImage(chartCanvas.toDataURL('image/png'), 'PNG', 10, 10, PW, Math.min(chartH, PH));
      }

      pdf.save(`MALA_drying_analytics_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error('Error generating graph:', err);
      alert('Failed to generate graph. Please try again.');
    }
  };

  return (
    <div>
      {error && (
        <div className="error-banner">
          <AlertTriangle size={20} />
          <span>{error}</span>
        </div>
      )}
      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>Loading History...</p>
        </div>
      )}

      {showLogoutConfirm && (
        <div className="modal-overlay" onClick={handleLogoutCancel}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <LogOut size={24} />
              <h3>Confirm Logout</h3>
            </div>
            <div className="modal-body">
              <p>Are you sure, you want to log out?</p>
            </div>
            <div className="modal-footer">
              <button className="modal-button cancel" onClick={handleLogoutCancel}>Cancel</button>
              <button className="modal-button confirm" onClick={handleLogoutConfirm}>Log Out</button>
            </div>
          </div>
        </div>
      )}

      <header className="topbar">
        <div className="topbar-logo-section">
          <img src={logo} alt="Logo" className="topbar-logo" />
        </div>
        <nav className="topbar-nav">
          <button className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => handleNavigation('/dashboard', 'dashboard')}>
            <BarChart2 size={16} /><span>Dashboard</span>
          </button>
          <button className={`nav-item ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => handleNavigation('/analytics', 'analytics')}>
            <Activity size={16} /><span>Analytics</span>
          </button>
          <button className={`nav-item ${activeTab === 'history' ? 'active' : ''}`} onClick={() => handleNavigation('/history', 'history')}>
            <Clock size={16} /><span>History</span>
          </button>
          <button className={`nav-item ${activeTab === 'notification' ? 'active' : ''}`} onClick={() => handleNavigation('/notification', 'notification')}>
            <Bell size={16} /><span>Notification</span>
            {unreadCount > 0 && (
              <span className="notif-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
            )}
          </button>
        </nav>
        <div className="topbar-right">
          <div className="profile-dropdown-wrapper">
            <button className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setProfileDropdownOpen(prev => !prev)}>
              <CircleUser size={16} /><span>Profile</span>
              {profileDropdownOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {profileDropdownOpen && (
              <div className="profile-submenu">
                <button className="submenu-item" onClick={() => handleNavigation('/profile', 'profile')}><User size={14} /><span>Edit Profile</span></button>
                <button className="submenu-item" onClick={() => handleNavigation('/profile', 'profile')}><Bell size={14} /><span>Edit Notification</span></button>
                <button className="submenu-item" onClick={() => handleNavigation('/profile', 'profile')}><HelpCircle size={14} /><span>Help Center</span></button>
                <button className="submenu-item" onClick={() => handleNavigation('/profile', 'profile')}><Settings size={14} /><span>Settings</span></button>
              </div>
            )}
          </div>
          <button className="nav-item logout" onClick={handleLogoutClick}>
            <LogOut size={16} /><span>Log Out</span>
          </button>
        </div>
      </header>

      <div className="main-content">
        <div className="unified-dashboard">
          <div className="dashboard-header history-header">
            <div className="history-header-text">
              <h1>History</h1>
              <p>Review past drying sessions and activity.</p>
            </div>
            <div className="history-header-controls" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button className="download-btn" onClick={handleDownloadExcel}>Export Excel</button>
              <button className="download-btn" onClick={handleExportGraph}>Export Graph</button>
            </div>
          </div>

          {isMonitoringMoisture && (
            <div style={{
              backgroundColor: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: '8px',
              padding: '12px 16px', marginBottom: '16px', display: 'flex',
              justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div>
                <span style={{ fontWeight: '600', color: '#92400E' }}>
                  ◐ Monitoring Moisture • Current: {currentMoisture !== null ? `${currentMoisture.toFixed(2)}%` : 'Loading...'}
                </span>
                <p style={{ fontSize: '12px', color: '#78350F', margin: '4px 0 0 0' }}>
                  Drying will automatically stop when moisture reaches 14%
                </p>
              </div>
              <button
                onClick={stopMoistureMonitoring}
                style={{
                  padding: '6px 12px', backgroundColor: '#EF4444', color: 'white',
                  border: 'none', borderRadius: '4px', cursor: 'pointer',
                  fontSize: '12px', fontWeight: '600'
                }}
              >
                Stop Monitoring
              </button>
            </div>
          )}

          {targetMoistureReached && (
            <div style={{
              backgroundColor: '#D1FAE5', border: '1px solid #6EE7B7', borderRadius: '8px',
              padding: '12px 16px', marginBottom: '16px', color: '#065F46', fontWeight: '600'
            }}>
              ✓ Target moisture (14%) reached! Drying session has been completed and saved.
            </div>
          )}

          <div className="table-wrapper">
            <table className="history-table">
              <thead>
                <tr>
                  <th rowSpan="2">Date</th>
                  <th rowSpan="2">Starting Time</th>
                  <th rowSpan="2">End Time</th>
                  <th rowSpan="2" title="Auto-stopped when moisture reached 14%">Completion Status</th>
                  <th colSpan="6">Initial Moisture</th>
                  <th colSpan="7">Final Moisture</th>
                  <th rowSpan="2">Temperature</th>
                  <th rowSpan="2">Humidity</th>
                  <th colSpan="6">Before Weight</th>
                  <th colSpan="6">After Weight</th>
                  <th rowSpan="2">Status</th>
                  <th rowSpan="2">Export</th>
                </tr>
                <tr>
                  <th>T1</th><th>T2</th><th>T3</th><th>T4</th><th>T5</th><th>T6</th>
                  <th>T1</th><th>T2</th><th>T3</th><th>T4</th><th>T5</th><th>T6</th><th>AVG</th>
                  <th>T1</th><th>T2</th><th>T3</th><th>T4</th><th>T5</th><th>T6</th>
                  <th>T1</th><th>T2</th><th>T3</th><th>T4</th><th>T5</th><th>T6</th>
                </tr>
              </thead>

              <tbody>
                {historyData.length === 0 ? (
                  <tr>
                    <td colSpan="36" style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>
                      No history data available.
                    </td>
                  </tr>
                ) : (
                  historyData.map((item) => {
                    const finalMoistureAvg = parseFloat(item.moistureavg);
                    const isTargetReached = finalMoistureAvg <= 14;

                    return (
                      <tr
                        key={item.id}
                        className={selectedRow?.id === item.id ? 'selected-row' : ''}
                        onClick={() => setSelectedRow(item)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td>{item.date}</td>
                        {/* Starting time: set when user presses Start on Dashboard */}
                        <td>{item.startTime}</td>
                        {/* End time: set when 14% moisture triggers auto-stop OR user presses Stop */}
                        <td>{item.endTime}</td>

                        <td>
                          <span
                            style={{
                              padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '600',
                              backgroundColor: isTargetReached ? '#D1FAE5' : '#FEF3C7',
                              color: isTargetReached ? '#065F46' : '#92400E'
                            }}
                            title={isTargetReached
                              ? 'Session ended automatically when moisture reached 14%'
                              : 'Session ended manually (moisture did not reach 14%)'}
                          >
                            {isTargetReached ? '✓ Target' : '◐ Manual'}
                          </span>
                        </td>

                        <td>{item.initialMoistureT1}</td>
                        <td>{item.initialMoistureT2}</td>
                        <td>{item.initialMoistureT3}</td>
                        <td>{item.initialMoistureT4}</td>
                        <td>{item.initialMoistureT5}</td>
                        <td>{item.initialMoistureT6}</td>

                        <td>{item.finalMoistureT1}</td>
                        <td>{item.finalMoistureT2}</td>
                        <td>{item.finalMoistureT3}</td>
                        <td>{item.finalMoistureT4}</td>
                        <td>{item.finalMoistureT5}</td>
                        <td>{item.finalMoistureT6}</td>
                        <td style={{ fontWeight: '600', color: isTargetReached ? '#059669' : '#d97706' }}>
                          {item.moistureavg}
                        </td>

                        <td>{item.temperature}</td>
                        <td>{item.humidity}</td>

                        <td>{savedWeights[1]?.frozen ? savedWeights[1].before.toFixed(2) : item.beforeWeightT1}</td>
                        <td>{savedWeights[2]?.frozen ? savedWeights[2].before.toFixed(2) : item.beforeWeightT2}</td>
                        <td>{savedWeights[3]?.frozen ? savedWeights[3].before.toFixed(2) : item.beforeWeightT3}</td>
                        <td>{savedWeights[4]?.frozen ? savedWeights[4].before.toFixed(2) : item.beforeWeightT4}</td>
                        <td>{savedWeights[5]?.frozen ? savedWeights[5].before.toFixed(2) : item.beforeWeightT5}</td>
                        <td>{savedWeights[6]?.frozen ? savedWeights[6].before.toFixed(2) : item.beforeWeightT6}</td>

                        <td>{savedAfterWeights[1]?.frozen ? savedAfterWeights[1].after.toFixed(2) : item.afterWeightT1}</td>
                        <td>{savedAfterWeights[2]?.frozen ? savedAfterWeights[2].after.toFixed(2) : item.afterWeightT2}</td>
                        <td>{savedAfterWeights[3]?.frozen ? savedAfterWeights[3].after.toFixed(2) : item.afterWeightT3}</td>
                        <td>{savedAfterWeights[4]?.frozen ? savedAfterWeights[4].after.toFixed(2) : item.afterWeightT4}</td>
                        <td>{savedAfterWeights[5]?.frozen ? savedAfterWeights[5].after.toFixed(2) : item.afterWeightT5}</td>
                        <td>{savedAfterWeights[6]?.frozen ? savedAfterWeights[6].after.toFixed(2) : item.afterWeightT6}</td>

                        <td>
                          <span className={`status ${item.status.toLowerCase()}`}>
                            {item.status}
                          </span>
                        </td>

                        <td style={{ textAlign: 'center', padding: '8px', whiteSpace: 'nowrap' }}>
                          {[
                            { fn: exportTemperatureGraph, color: '#efb944', icon: <Thermometer size={12} />, title: 'Export Temperature Graph' },
                            { fn: exportHumidityGraph,   color: '#3b82f6', icon: <Droplets size={12} />,    title: 'Export Humidity Graph' },
                            { fn: exportMoistureGraph,   color: '#22c55e', icon: <Waves size={12} />,       title: 'Export Moisture Graph' },
                            { fn: exportWeightGraph,     color: '#8884d8', icon: <Download size={12} />,    title: 'Export Weight Graph' },
                          ].map(({ fn, color, icon, title }, btnIdx) => (
                            <button
                              key={btnIdx}
                              onClick={(e) => { e.stopPropagation(); fn(item); }}
                              style={{
                                padding: '4px 8px',
                                marginRight: btnIdx < 3 ? '4px' : 0,
                                fontSize: '11px',
                                backgroundColor: color,
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                              }}
                              title={title}
                            >
                              {icon}
                            </button>
                          ))}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}