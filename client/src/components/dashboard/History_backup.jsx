import React, { useState, useEffect } from 'react';
import { AlertTriangle, BarChart2, Activity, Bell, Clock, Thermometer, Droplets, Waves, Weight, Download, ChevronDown, ChevronUp, CircleUser, LogOut, User, HelpCircle, Settings } from 'lucide-react';
import './History.css';
import { useNavigate, useLocation } from 'react-router-dom';
import authService from '../../api/authService';
import dryerService from '../../api/dryerService';
import { useSocket } from '../../contexts/SocketContext.js';
import { useDrying } from '../../contexts/DryingContext.js';
import { useWeight } from '../../contexts/WeightContext.js';
import { useToast } from '../../contexts/ToastContext.js';
import { useNotifications } from '../../contexts/NotificationContext.js';
import { setTemperature, setMoisture, setTray } from '../../api/systemService';
import * as XLSX from 'xlsx';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, BarChart, Bar } from 'recharts';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import logo from "../../assets/images/logo2.png";

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

export default function History({ view }) {
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('history');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [isMonitoringMoisture, setIsMonitoringMoisture] = useState(false);
  const [targetMoistureReached, setTargetMoistureReached] = useState(false);
  const [currentMoisture, setCurrentMoisture] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();

  const { socket, sensorData } = useSocket();
  const { dryingStartTime, dryingEndTime } = useDrying();
  const { savedWeights, savedAfterWeights } = useWeight();
  const { showToast } = useToast();
  const { unreadCount } = useNotifications();

  const selectedTrays = Object.keys(savedWeights).filter(trayNum => savedWeights[trayNum]?.frozen);
  const selectedTraysCount = selectedTrays.length;

  let totalMoisture = 0;
  selectedTrays.forEach(trayNum => {
    totalMoisture += sensorData[`moisture${trayNum}`] || 0;
  });
  const averageMoistureFromSelected = selectedTraysCount > 0 ? totalMoisture / selectedTraysCount : 0;

  useEffect(() => {
    const path = location.pathname;
    const tab = path.split('/')[1];
    if (tab) setActiveTab(tab);
  }, [location]);

  useEffect(() => {
    const isMounted = true;
    const fetchHistoryData = async () => {
      try {
        const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/api/drying/history`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        const sensorData = Array.isArray(result.data) ? result.data : [result.data];

        const safeToString = (value, fallback = 'N/A') => {
          if (value !== undefined && value !== null) {
            const num = parseFloat(value);
            return isNaN(num) ? value.toString() : num.toFixed(2);
          }
          return fallback;
        };

        const formattedData = sensorData.map((item, index) => {
          return {
            id: item._id || item.id || index + 1,
            date: item.timestamp
              ? new Date(item.timestamp).toLocaleDateString('en-US', {
                    month: '2-digit',
                    day: '2-digit',
                    year: 'numeric',
                  })
                : 'N/A',
            startTime:
              item.startTime
                ? new Date(item.startTime).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                  })
                : (item.timestamp
                  ? new Date(item.timestamp).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true,
                    })
                  : 'N/A'),
            endTime: item.endTime
              ? new Date(item.endTime).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                  })
                : 'N/A',
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

        console.log('Formatted History Data:', formattedData);
        setHistoryData(formattedData);
        setError(null);
        setLoading(false);
      } catch (err) {
        if (isMounted) {
          console.error('History fetch error:', err);
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

  // Monitor moisture content and auto-stop when reaching 14%
  useEffect(() => {
    if (!isMonitoringMoisture || targetMoistureReached) return;

    const monitorMoisture = async () => {
      try {
        const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/api/sensor/latest`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          console.warn('Failed to fetch latest sensor data:', response.status);
          return;
        }

        const result = await response.json();
        const latestData = Array.isArray(result.data) ? result.data[0] : result.data;

        if (latestData && latestData.moistureavg !== undefined) {
          const avgMoisture = parseFloat(latestData.moistureavg);
          setCurrentMoisture(avgMoisture);

          if (avgMoisture <= 14 && !targetMoistureReached) {
            console.log(`✓ Target moisture reached! Average: ${avgMoisture}%`);
            setTargetMoistureReached(true);
            setIsMonitoringMoisture(false);

            try {
              const stopResponse = await dryerService.stopDrying();
              if (stopResponse.success) {
                console.log('Drying automatically stopped at target moisture');
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

  const handleNavigation = (path, tab) => {
    setActiveTab(tab);
    navigate(path);
  };

  const handleLogoutClick = () => setShowLogoutConfirm(true);
  const handleLogoutConfirm = async () => {
    try {
      await dryerService.stopDrying().catch(() => {});
      localStorage.removeItem('sensorData');
      localStorage.removeItem('dryingStatus');
      localStorage.removeItem('dryingStartTime');
      localStorage.removeItem('targetMoisture');
      localStorage.removeItem('targetTemperature');
      await authService.logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      navigate('/login');
    }
  };
  const handleLogoutCancel = () => setShowLogoutConfirm(false);

  const startMoistureMonitoring = () => {
    setIsMonitoringMoisture(true);
    setTargetMoistureReached(false);
    setCurrentMoisture(null);
    console.log('Started monitoring moisture for auto-stop at 14%');
  };

  const stopMoistureMonitoring = () => {
    setIsMonitoringMoisture(false);
    console.log('Stopped monitoring moisture');
  };

  // ── Excel export ────────────────────────────────────────────────────
  const handleDownloadExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(historyData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'History');
    XLSX.writeFile(workbook, `drying_history_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // ── Graph export helpers ─────────────────────────────────────────────
  // Helper function to get selected trays for highlighting
  const getSelectedTraysForSession = (row) => {
    // Get selected trays from savedWeights (frozen trays)
    const selectedTrayNumbers = Object.keys(savedWeights).filter(trayNum => savedWeights[trayNum]?.frozen);
    return selectedTrayNumbers.map(num => `T${num}`);
  };

  // Renders an off-screen SVG line chart and returns a canvas via html2canvas.
  const buildSvgLineChart = (dataSets, colors, labels, unit, minVal, maxVal, width = 740, height = 280) => {
    const pts = dataSets[0].length;
    const padL = 48, padR = 20, padT = 20, padB = 60;
    const chartW = width - padL - padR;
    const chartH = height - padT - padB;
    const range = maxVal - minVal || 1;

    const xOf = (i) => padL + (i / (pts - 1)) * chartW;
    const yOf = (v) => padT + chartH - ((v - minVal) / range) * chartH;

    // Generate time labels based on actual drying session time
    const timeLabels = Array.from({ length: pts }, (_, i) => {
      let startTime, endTime;
      
      if (dryingStartTime && dryingEndTime) {
        // Use actual session time
        startTime = new Date(dryingStartTime);
        endTime = new Date(dryingEndTime);
      } else if (dryingStartTime) {
        // Session in progress, estimate end time
        startTime = new Date(dryingStartTime);
        endTime = new Date();
      } else {
        // No session data, use default
        startTime = new Date();
        startTime.setHours(startTime.getHours() - 2);
        endTime = new Date();
      }
      
      const totalMinutes = (endTime - startTime) / (1000 * 60);
      const currentTime = new Date(startTime.getTime() + (i * totalMinutes / (pts - 1)));
      
      return currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    });

    // Y axis ticks (5 ticks)
    const yTicks = Array.from({ length: 5 }, (_, i) => minVal + (range / 4) * i);
    const yTicksSvg = yTicks.map(v =>
      `<line x1="${padL}" y1="${yOf(v)}" x2="${padL + chartW}" y2="${yOf(v)}" stroke="#e0e0e0" stroke-width="1"/>
       <text x="${padL - 6}" y="${yOf(v)}" text-anchor="end" dominant-baseline="central" font-size="11" fill="#666">${v.toFixed(1)}</text>`
    ).join('');

    // X axis ticks (time labels)
    const xTicks = timeLabels.map((time, i) => {
      const xPos = xOf(i);
      const showLabel = i % Math.ceil(pts / 8) === 0; // Show every nth label to avoid crowding
      return showLabel ? `
        <text x="${xPos}" y="${height - 35}" text-anchor="middle" font-size="10" fill="#666" transform="rotate(-45 ${xPos} ${height - 35})">${time}</text>
        <line x1="${xPos}" y1="${padT + chartH}" x2="${xPos}" y2="${padT + chartH + 5}" stroke="#ccc" stroke-width="1"/>
      ` : '';
    }).join('');

    // Grid lines
    const gridLines = Array.from({ length: 5 }, (_, i) => 
      `<line x1="${padL}" y1="${yOf(minVal + (range / 4) * i)}" x2="${padL + chartW}" y2="${yOf(minVal + (range / 4) * i)}" stroke="#f0f0f0" stroke-width="1"/>`
    ).join('');

    // Lines - enhanced for highlighting selected trays
    const linesSvg = dataSets.map((data, idx) => {
      const points = data.map((v, i) => `${xOf(i)},${yOf(v)}`).join(' ');
      const strokeWidth = colors[idx].includes('80') ? '4' : '2.5'; // Thicker lines for selected trays
      return `<polyline points="${points}" fill="none" stroke="${colors[idx].replace('80', '')}" stroke-width="${strokeWidth}" stroke-linejoin="round"/>`;
    }).join('');

    // Axes
    const axes = `
      <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT + chartH}" stroke="#333" stroke-width="2"/>
      <line x1="${padL}" y1="${padT + chartH}" x2="${padL + chartW}" y2="${padT + chartH}" stroke="#333" stroke-width="2"/>
    `;

    // Legend
    const legendSvg = labels.map((lbl, i) => {
      const color = colors[i].replace('80', ''); // Remove transparency for legend
      return `<rect x="${padL + i * 100}" y="${height - 25}" width="12" height="12" fill="${color}"/>
       <text x="${padL + i * 100 + 16}" y="${height - 15}" font-size="11" fill="#444">${lbl}${unit}</text>`
    }).join('');

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" style="background:#fff;font-family:Arial">
      ${gridLines}
      ${axes}
      ${yTicksSvg}
      ${xTicks}
      ${linesSvg}
      <text x="${padL + chartW / 2}" y="${height - 8}" text-anchor="middle" font-size="12" fill="#333">Time</text>
      <text x="${padL - 35}" y="${padT + chartH / 2}" text-anchor="middle" font-size="12" fill="#333" transform="rotate(-90 ${padL - 35} ${padT + chartH / 2})">Value${unit}</text>
      ${legendSvg}
    </svg>`;
  };

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
      const imgData = canvas.toDataURL('image/png');
      const imgW = 277, imgH = (canvas.height * imgW) / canvas.width;
      pdf.addImage(imgData, 'PNG', 10, 10, imgW, Math.min(imgH, 180));
      pdf.save(filename);
    } finally {
      if (document.body.contains(container)) document.body.removeChild(container);
    }
  };

  const exportTemperatureGraph = async (item) => {
    const row = item || selectedRow;
    if (!row) return;
    const data = generateTimeSeriesData(40, 42, 20, 0.05);
    const svg = `<div style="padding:16px;background:#fff;font-family:Arial">
      <h3 style="margin:0 0 12px;color:#333">Temperature — Session ${row.id}</h3>
      ${buildSvgLineChart([data], ['#efb944'], ['Temp'], '°C', 35, 50)}
    </div>`;
    await exportChartAsPdf(svg, `MALA_${row.id}_temperature_graph.pdf`);
  };

  const exportHumidityGraph = async (item) => {
    const row = item || selectedRow;
    if (!row) return;
    const data = generateTimeSeriesData(65, 60, 20, 0.08);
    const svg = `<div style="padding:16px;background:#fff;font-family:Arial">
      <h3 style="margin:0 0 12px;color:#333">Humidity — Session ${row.id}</h3>
      ${buildSvgLineChart([data], ['#3b82f6'], ['Humidity'], '%', 50, 80)}
    </div>`;
    await exportChartAsPdf(svg, `MALA_${row.id}_humidity_graph.pdf`);
  };

  const exportMoistureGraph = async (item) => {
    const row = item || selectedRow;
    if (!row) return;
    const selectedTrays = getSelectedTraysForSession(row);
    
    const datasets = [
      generateTimeSeriesData(22, 14, 20, 0.1),
      generateTimeSeriesData(21, 13.5, 20, 0.1),
      generateTimeSeriesData(23, 14.5, 20, 0.1),
      generateTimeSeriesData(20, 13, 20, 0.1),
      generateTimeSeriesData(24, 15, 20, 0.1),
      generateTimeSeriesData(22.5, 14.2, 20, 0.1),
    ];
    const colors = ['#22c55e', '#16a34a', '#15803d', '#166534', '#14532d', '#052e16'];
    const labels = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6'];
    
    // Highlight selected trays by making their lines thicker and more prominent
    const adjustedColors = labels.map((label, idx) => {
      const isSelected = selectedTrays.includes(label);
      return isSelected ? colors[idx] : colors[idx] + '80'; // Add transparency for non-selected
    });
    
    const svg = `<div style="padding:16px;background:#fff;font-family:Arial">
      <h3 style="margin:0 0 12px;color:#333">Moisture Content — Session ${row.id}</h3>
      ${buildSvgLineChart(datasets, adjustedColors, labels, '%', 10, 30)}
    </div>`;
    await exportChartAsPdf(svg, `MALA_${row.id}_moisture_graph.pdf`);
  };

  const exportWeightGraph = async (item) => {
    const row = item || selectedRow;
    if (!row) return;
    const selectedTrays = getSelectedTraysForSession(row);
    const trays = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6'];
    const beforeVals = trays.map(t => parseFloat(row[`beforeWeight${t}`]) || 10);
    const afterVals  = trays.map(t => parseFloat(row[`afterWeight${t}`]) || 9);
    
    // Highlight selected trays with different colors
    const colors = trays.map(tray => {
      const isSelected = selectedTrays.includes(tray);
      return isSelected ? '#8884d8' : '#22c55e'; // Selected trays in blue, others in green
    });
    
    const svg = `<div style="padding:16px;background:#fff;font-family:Arial">
      <h3 style="margin:0 0 12px;color:#333">Weight per Tray — Session ${row.id}</h3>
      ${buildSvgLineChart([beforeVals, afterVals], colors, ['Before', 'After'], ' kg', 0, Math.max(...beforeVals) + 1)}
    </div>`;
    await exportChartAsPdf(svg, `MALA_${row.id}_weight_graph.pdf`);
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

      {/* Logout Confirmation Modal */}
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

      {/* Topbar */}
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

      {/* Main Content */}
      <div className="main-content">
        <div className="unified-dashboard">
          <div className="dashboard-header history-header">
            <div className="history-header-text">
              <h1>History</h1>
              <p>Review past drying sessions and activity.</p>
            </div>
            <div className="history-header-controls" style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="download-btn" onClick={handleDownloadExcel}>Export Excel</button>
            </div>
          </div>

          {/* Moisture Monitoring Status Bar */}
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
                        <td>{item.startTime}</td>
                        <td>{item.endTime}</td>

                        <td>
                          <span style={{
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

                        {/* Initial Moisture */}
                        <td>{item.initialMoistureT1}</td>
                        <td>{item.initialMoistureT2}</td>
                        <td>{item.initialMoistureT3}</td>
                        <td>{item.initialMoistureT4}</td>
                        <td>{item.initialMoistureT5}</td>
                        <td>{item.initialMoistureT6}</td>

                        {/* Final Moisture + AVG */}
                        <td>{item.finalMoistureT1}</td>
                        <td>{item.finalMoistureT2}</td>
                        <td>{item.finalMoistureT3}</td>
                        <td>{item.finalMoistureT4}</td>
                        <td>{item.finalMoistureT5}</td>
                        <td>{item.finalMoistureT6}</td>
                        <td style={{ fontWeight: '600', color: isTargetReached ? '#059669' : '#d97706' }}>
                          {item.moistureavg}
                        </td>

                        {/* Env */}
                        <td>{item.temperature}</td>
                        <td>{item.humidity}</td>

                        {/* Before Weight */}
                        <td>{savedWeights[1]?.frozen ? savedWeights[1].before.toFixed(2) : item.beforeWeightT1}</td>
                        <td>{savedWeights[2]?.frozen ? savedWeights[2].before.toFixed(2) : item.beforeWeightT2}</td>
                        <td>{savedWeights[3]?.frozen ? savedWeights[3].before.toFixed(2) : item.beforeWeightT3}</td>
                        <td>{savedWeights[4]?.frozen ? savedWeights[4].before.toFixed(2) : item.beforeWeightT4}</td>
                        <td>{savedWeights[5]?.frozen ? savedWeights[5].before.toFixed(2) : item.beforeWeightT5}</td>
                        <td>{savedWeights[6]?.frozen ? savedWeights[6].before.toFixed(2) : item.beforeWeightT6}</td>

                        {/* After Weight */}
                        <td>{savedAfterWeights[1]?.frozen ? savedAfterWeights[1].after.toFixed(2) : item.afterWeightT1}</td>
                        <td>{savedAfterWeights[2]?.frozen ? savedAfterWeights[2].after.toFixed(2) : item.afterWeightT2}</td>
                        <td>{savedAfterWeights[3]?.frozen ? savedAfterWeights[3].after.toFixed(2) : item.afterWeightT3}</td>
                        <td>{savedAfterWeights[4]?.frozen ? savedAfterWeights[4].after.toFixed(2) : item.afterWeightT4}</td>
                        <td>{savedAfterWeights[5]?.frozen ? savedAfterWeights[5].after.toFixed(2) : item.afterWeightT5}</td>
                        <td>{savedAfterWeights[6]?.frozen ? savedAfterWeights[6].after.toFixed(2) : item.afterWeightT6}</td>

                        {/* Status */}
                        <td>
                          <span className={`status ${item.status.toLowerCase()}`}>
                            {item.status}
                          </span>
                        </td>

                        {/* Export Actions */}
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
