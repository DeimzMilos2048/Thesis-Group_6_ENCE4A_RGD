// history

import { useState, useEffect } from 'react';
import { Activity, AlertTriangle, BarChart2, Bell, CircleUser, Clock, LogOut, Thermometer, Droplets, Waves, ChevronDown, ChevronUp, User, HelpCircle, Settings, Download } from 'lucide-react';
import './Dashboard.css';
import './History.css';
import { useNavigate, useLocation } from 'react-router-dom';
import authService from '../../api/authService';
import dryerService from '../../api/dryerService';
import logo from "../../assets/images/logo2.png";
import { useSocket } from '../../contexts/SocketContext.js';
import { useWeight } from '../../contexts/WeightContext.js';
import { useDrying } from '../../contexts/DryingContext.js';
import useNotificationService from './Usenotificationservice.js';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

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

// ── Helper: derive 4-parameter summary from a history row ────────────────────
const getSessionParams = (item) => {
  const safeNum = (v) => { const n = parseFloat(v); return isNaN(n) ? null : n; };

  const tempStart  = safeNum(item.temperature?.replace('°', ''));
  const tempEnd    = tempStart; // single reading — treat as stable
  const tempDiff   = 0;
  const tempStatus = 'Stable';

  const humStart  = safeNum(item.humidity);
  const humEnd    = humStart;
  const humDiff   = 0;
  const humStatus = 'Stable';

  // Average of initial moisture across T1–T6
  const initMoistVals = [1,2,3,4,5,6]
    .map(i => safeNum(item[`initialMoistureT${i}`]))
    .filter(v => v !== null);
  const finalMoistVals = [1,2,3,4,5,6]
    .map(i => safeNum(item[`finalMoistureT${i}`]))
    .filter(v => v !== null);
  const moistStart = initMoistVals.length  ? (initMoistVals.reduce((a,b)=>a+b,0) / initMoistVals.length)  : null;
  const moistEnd   = finalMoistVals.length ? (finalMoistVals.reduce((a,b)=>a+b,0) / finalMoistVals.length) : safeNum(item.moistureavg);
  const moistDiff  = (moistStart !== null && moistEnd !== null) ? (moistEnd - moistStart) : null;
  const moistStatus = moistEnd !== null && moistEnd <= 14 ? 'Target Reached' : 'Manual Stop';

  // Total weight loss (sum before – sum after across T1–T6)
  const beforeVals = [1,2,3,4,5,6].map(i => safeNum(item[`beforeWeightT${i}`])).filter(v=>v!==null);
  const afterVals  = [1,2,3,4,5,6].map(i => safeNum(item[`afterWeightT${i}`])).filter(v=>v!==null);
  const weightStart = beforeVals.length ? beforeVals.reduce((a,b)=>a+b,0) : null;
  const weightEnd   = afterVals.length  ? afterVals.reduce((a,b)=>a+b,0)  : null;
  const weightDiff  = (weightStart !== null && weightEnd !== null) ? (weightEnd - weightStart) : null;
  const weightStatus = weightDiff !== null ? (weightDiff < 0 ? 'Reduced' : 'No Change') : 'N/A';

  return [
    {
      label: 'Temperature',
      startVal: tempStart !== null ? `${tempStart.toFixed(1)}°C` : 'N/A',
      endVal:   tempEnd   !== null ? `${tempEnd.toFixed(1)}°C`   : 'N/A',
      diff:     `${tempDiff.toFixed(1)}°C`,
      status:   tempStatus,
    },
    {
      label: 'Humidity',
      startVal: humStart !== null ? `${humStart.toFixed(1)}%` : 'N/A',
      endVal:   humEnd   !== null ? `${humEnd.toFixed(1)}%`   : 'N/A',
      diff:     `${humDiff.toFixed(1)}%`,
      status:   humStatus,
    },
    {
      label: 'Avg Moisture',
      startVal: moistStart !== null ? `${moistStart.toFixed(1)}%` : 'N/A',
      endVal:   moistEnd   !== null ? `${moistEnd.toFixed(1)}%`   : 'N/A',
      diff:     moistDiff  !== null ? `${moistDiff.toFixed(1)}%`  : 'N/A',
      status:   moistStatus,
    },
    {
      label: 'Total Weight',
      startVal: weightStart !== null ? `${weightStart.toFixed(2)} kg` : 'N/A',
      endVal:   weightEnd   !== null ? `${weightEnd.toFixed(2)} kg`   : 'N/A',
      diff:     weightDiff  !== null ? `${weightDiff.toFixed(2)} kg`  : 'N/A',
      status:   weightStatus,
    },
  ];
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
  // ── Checkbox selection state ─────────────────────────────────────────────────
  const [selectedRows, setSelectedRows] = useState(new Set());

  const [dryingStartTime, setDryingStartTime] = useState(
    () => localStorage.getItem('dryingStartTime') || null
  );
  const [dryingEndTime, setDryingEndTime] = useState(
    () => localStorage.getItem('dryingEndTime') || null
  );

  const navigate = useNavigate();
  const location = useLocation();

  const { unreadCount } = useNotificationService(null, 15000);
  const { socket, sensorData } = useSocket();
  const { savedWeights, savedAfterWeights } = useWeight();
  const {
    isProcessing,
    selectedTemp,
    selectedMoisture,
    currentTray
  } = useDrying();

  const [selectedTrays, setSelectedTrays] = useState(() => {
    try {
      const stored = localStorage.getItem('selectedTrays');
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });

  const selectedTraysCount = selectedTrays.length;
  let totalMoisture = 0;
  selectedTrays.forEach(trayNum => { totalMoisture += sensorData[`moisture${trayNum}`] || 0; });
  const averageMoistureFromSelected = selectedTraysCount > 0 ? totalMoisture / selectedTraysCount : 0;

  // ── Row checkbox handlers ─────────────────────────────────────────────────────
  const handleRowSelect = (itemId) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedRows.size === historyData.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(historyData.map(item => item.id)));
    }
  };

  // ── Session recording functions ───────────────────────────────────────────────
  const recordSessionStart = () => {
    const now = new Date();
    const session = {
      id: Date.now(),
      date: now.toLocaleDateString(),
      startTime: now.toLocaleTimeString(),
      endTime: '-',
      completionStatus: 'In Progress',
      initialMoisture: {},
      finalMoisture: {},
      averageMoisture: '-',
      temperature: selectedTemp || '-',
      humidity: sensorData.humidity?.toFixed(1) || '-',
      beforeWeight: {},
      afterWeight: {},
      status: 'Active'
    };
    [1, 2, 3, 4, 5, 6].forEach(i => {
      session.initialMoisture[`T${i}`] = sensorData[`moisture${i}`]?.toFixed(1) || '-';
      session.beforeWeight[`T${i}`] = savedWeights[i]?.before?.toFixed(2) || '-';
    });
    setHistoryData(prev => [session, ...prev]);
    localStorage.setItem('currentSession', JSON.stringify(session));
  };

  const recordSessionEnd = (completionStatus = 'Completed') => {
    const currentSessionData = localStorage.getItem('currentSession');
    if (currentSessionData) {
      const session = JSON.parse(currentSessionData);
      const now = new Date();
      session.endTime = now.toLocaleTimeString();
      session.completionStatus = completionStatus;
      session.status = completionStatus === 'Completed' ? 'Completed' : 'Stopped';
      [1, 2, 3, 4, 5, 6].forEach(i => {
        session.finalMoisture[`T${i}`] = sensorData[`moisture${i}`]?.toFixed(1) || '-';
        session.afterWeight[`T${i}`] = savedAfterWeights[i]?.after?.toFixed(2) || '-';
      });
      const moistureValues = Object.values(session.finalMoisture).filter(val => val !== '-');
      if (moistureValues.length > 0) {
        const avg = moistureValues.reduce((sum, val) => sum + parseFloat(val), 0) / moistureValues.length;
        session.averageMoisture = avg.toFixed(1);
      }
      setHistoryData(prev => prev.map(s => s.id === session.id ? session : s));
      localStorage.removeItem('currentSession');
      localStorage.setItem('dryingHistory', JSON.stringify(historyData));
    }
  };

  const updateSessionData = () => {
    const currentSessionData = localStorage.getItem('currentSession');
    if (currentSessionData) {
      const session = JSON.parse(currentSessionData);
      session.temperature = selectedTemp || session.temperature;
      session.humidity = sensorData.humidity?.toFixed(1) || session.humidity;
      [1, 2, 3, 4, 5, 6].forEach(i => {
        session.beforeWeight[`T${i}`] = savedWeights[i]?.before?.toFixed(2) || session.beforeWeight[`T${i}`];
        session.afterWeight[`T${i}`] = savedAfterWeights[i]?.after?.toFixed(2) || session.afterWeight[`T${i}`];
      });
      setHistoryData(prev => prev.map(s => s.id === session.id ? session : s));
      localStorage.setItem('currentSession', JSON.stringify(session));
      localStorage.setItem('dryingHistory', JSON.stringify(historyData));
    }
  };

  const saveCurrentSessionToHistory = () => {
    const currentSessionData = localStorage.getItem('currentSession');
    if (currentSessionData) {
      const session = JSON.parse(currentSessionData);
      const now = new Date();
      if (session.endTime === '-') {
        session.endTime = now.toLocaleTimeString();
        session.completionStatus = 'Interrupted';
        session.status = 'Interrupted';
      }
      [1, 2, 3, 4, 5, 6].forEach(i => {
        session.finalMoisture[`T${i}`] = sensorData[`moisture${i}`]?.toFixed(1) || '-';
        session.afterWeight[`T${i}`] = savedAfterWeights[i]?.after?.toFixed(2) || '-';
      });
      const moistureValues = Object.values(session.finalMoisture).filter(val => val !== '-');
      if (moistureValues.length > 0) {
        const avg = moistureValues.reduce((sum, val) => sum + parseFloat(val), 0) / moistureValues.length;
        session.averageMoisture = avg.toFixed(1);
      }
      setHistoryData(prev => prev.map(s => s.id === session.id ? session : s));
      localStorage.removeItem('currentSession');
      localStorage.setItem('dryingHistory', JSON.stringify(historyData));
    }
  };

  // ── Effects ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    const currentSession = localStorage.getItem('currentSession');
    if (isProcessing && !currentSession) {
      recordSessionStart();
    } else if (!isProcessing && currentSession) {
      recordSessionEnd();
      setTimeout(() => {
        const stillExists = localStorage.getItem('currentSession');
        if (stillExists) localStorage.removeItem('currentSession');
      }, 100);
    }
  }, [isProcessing, selectedTemp, savedWeights, savedAfterWeights, sensorData]);

  useEffect(() => {
    const handleSaveEvent = () => updateSessionData();
    window.addEventListener('weightDataUpdated', handleSaveEvent);
    return () => window.removeEventListener('weightDataUpdated', handleSaveEvent);
  }, []);

  useEffect(() => {
    const handleBeforeUnload = () => saveCurrentSessionToHistory();
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      saveCurrentSessionToHistory();
    };
  }, [savedWeights, savedAfterWeights, isProcessing, selectedTemp, selectedMoisture, currentTray]);

  useEffect(() => {
    const savedHistory = localStorage.getItem('dryingHistory');
    if (savedHistory) {
      try { setHistoryData(JSON.parse(savedHistory)); }
      catch (err) { console.error('Error loading history:', err); }
    }
  }, []);

  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/analytics'))      setActiveTab('analytics');
    else if (path.includes('/history'))   setActiveTab('history');
    else if (path.includes('/notification')) setActiveTab('notification');
    else if (path.includes('/profile'))   setActiveTab('profile');
    else setActiveTab('dashboard');
  }, [location]);

  useEffect(() => {
    let isMounted = true;
    const fetchHistoryData = async () => {
      try {
        setTimeout(() => { if (isMounted) setLoading(true); }, 300);
        const token = localStorage.getItem('token');
        if (!token) { setError('Authentication required.'); setLoading(false); return; }
        try {
          const tokenPayload = JSON.parse(atob(token.split('.')[1]));
          if (!tokenPayload || tokenPayload.exp < Date.now() / 1000) {
            setError('Invalid or expired token.'); setLoading(false); return;
          }
        } catch { setError('Invalid token format.'); setLoading(false); return; }

        const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';
        const response = await fetch(`${API_URL}/api/sensor/history`, {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
          const ct = response.headers.get('content-type');
          if (ct?.includes('text/html')) throw new Error('Server not running or endpoint not found.');
          if (response.status === 404) throw new Error('API endpoint not found.');
          else if (response.status === 401) throw new Error('Authentication failed.');
          else if (response.status === 500) throw new Error('Server error.');
          else throw new Error(`HTTP ${response.status}: Failed to fetch history data`);
        }

        const ct = response.headers.get('content-type');
        if (!ct?.includes('application/json')) throw new Error('Server returned non-JSON response.');

        const result = await response.json();
        if (isMounted) {
          let rawData = [];
          if (result.success && result.data) rawData = result.data;
          else if (Array.isArray(result)) rawData = result;
          else if (result.data) rawData = result.data;
          if (!Array.isArray(rawData)) { setError('Invalid data format.'); setLoading(false); return; }

          const safe = (value, fallback = 'N/A') => {
            if (value !== undefined && value !== null) {
              const num = parseFloat(value);
              return isNaN(num) ? value.toString() : num.toFixed(2);
            }
            return fallback;
          };

          const formattedData = rawData.map((item, index) => {
            const rawStartISO = item.startTime || item.timestamp || null;
            const rawEndISO   = item.endTime || null;
            return {
              id: item._id || item.id || index + 1,
              date:      rawStartISO ? new Date(rawStartISO).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : 'N/A',
              startTime: rawStartISO ? new Date(rawStartISO).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : 'N/A',
              endTime:   rawEndISO   ? new Date(rawEndISO).toLocaleTimeString('en-US',   { hour: '2-digit', minute: '2-digit', hour12: true }) : '—',
              startTimeISO: rawStartISO,
              endTimeISO:   rawEndISO,
              initialMoistureT1: safe(item.moisture1),
              initialMoistureT2: safe(item.moisture2),
              initialMoistureT3: safe(item.moisture3),
              initialMoistureT4: safe(item.moisture4),
              initialMoistureT5: safe(item.moisture5),
              initialMoistureT6: safe(item.moisture6),
              finalMoistureT1: safe(item.finalMoisture1 ?? item.moisture1End),
              finalMoistureT2: safe(item.finalMoisture2 ?? item.moisture2End),
              finalMoistureT3: safe(item.finalMoisture3 ?? item.moisture3End),
              finalMoistureT4: safe(item.finalMoisture4 ?? item.moisture4End),
              finalMoistureT5: safe(item.finalMoisture5 ?? item.moisture5End),
              finalMoistureT6: safe(item.finalMoisture6 ?? item.moisture6End),
              moistureavg: safe(item.moistureavg),
              temperature: item.temperature !== undefined ? `${parseFloat(item.temperature).toFixed(2)}°` : 'N/A',
              humidity:    item.humidity    !== undefined ? parseFloat(item.humidity).toFixed(2) : 'N/A',
              beforeWeightT1: safe(item.weight1_t1 ?? item.weight1),
              beforeWeightT2: safe(item.weight1_t2 ?? item.weight1),
              beforeWeightT3: safe(item.weight1_t3 ?? item.weight1),
              beforeWeightT4: safe(item.weight1_t4 ?? item.weight1),
              beforeWeightT5: safe(item.weight1_t5 ?? item.weight1),
              beforeWeightT6: safe(item.weight1_t6 ?? item.weight1),
              afterWeightT1: safe(item.weight2_t1 ?? item.weight2),
              afterWeightT2: safe(item.weight2_t2 ?? item.weight2),
              afterWeightT3: safe(item.weight2_t3 ?? item.weight2),
              afterWeightT4: safe(item.weight2_t4 ?? item.weight2),
              afterWeightT5: safe(item.weight2_t5 ?? item.weight2),
              afterWeightT6: safe(item.weight2_t6 ?? item.weight2),
              status: item.status || 'Idle',
            };
          });
          setHistoryData(formattedData);
          setError(null);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) { setError(`Failed to load history: ${err.message}`); setLoading(false); }
      }
    };
    fetchHistoryData();
    const pollingInterval = setInterval(fetchHistoryData, 90 * 60 * 1000);
    return () => { isMounted = false; clearInterval(pollingInterval); };
  }, [navigate]);

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
        if (latestData?.moistureavg !== undefined) {
          const avgMoisture = parseFloat(latestData.moistureavg);
          setCurrentMoisture(avgMoisture);
          if (avgMoisture <= 14 && !targetMoistureReached) {
            const endISO = new Date().toISOString();
            localStorage.setItem('dryingEndTime', endISO);
            setDryingEndTime(endISO);
            setTargetMoistureReached(true);
            setIsMonitoringMoisture(false);
            try {
              const stopResponse = await dryerService.stopDrying();
              if (stopResponse.success) setTimeout(() => window.location.reload(), 1000);
            } catch (err) { console.error('Error auto-stopping drying:', err); }
          }
        }
      } catch (err) { console.warn('Moisture monitoring error:', err); }
    };
    const monitoringInterval = setInterval(monitorMoisture, 10000);
    monitorMoisture();
    return () => clearInterval(monitoringInterval);
  }, [isMonitoringMoisture, targetMoistureReached]);

  useEffect(() => {
    if (selectedTraysCount > 0 && socket?.connected) {
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

  // ── Navigation & logout ───────────────────────────────────────────────────────
  const handleNavigation = (path, tab) => {
    saveCurrentSessionToHistory();
    setActiveTab(tab);
    navigate(path);
  };

  const handleLogoutClick = () => {
    saveCurrentSessionToHistory();
    setShowLogoutConfirm(true);
  };

  const handleLogoutCancel = () => setShowLogoutConfirm(false);

  const handleLogoutConfirm = async () => {
    try {
      await dryerService.stopDrying().catch(() => {});
      ['sensorData','dryingStatus','dryingStartTime','dryingEndTime','targetMoisture','targetTemperature']
        .forEach(k => localStorage.removeItem(k));
      await authService.logout();
      navigate('/login');
    } catch (err) { console.error('Logout error:', err); navigate('/login'); }
  };

  const stopMoistureMonitoring = () => {
    const endISO = new Date().toISOString();
    localStorage.setItem('dryingEndTime', endISO);
    setDryingEndTime(endISO);
    setIsMonitoringMoisture(false);
  };

  // ── Excel export ──────────────────────────────────────────────────────────────
  // If rows are checked → export only those rows; otherwise export all (up to 100)
  const handleDownloadExcel = () => {
    const source = selectedRows.size > 0
      ? historyData.filter(item => selectedRows.has(item.id))
      : historyData.slice(0, 100);

    const exportData = source.map(item => ({
      Date: item.date,
      'Start Time': item.startTime,
      'End Time': item.endTime,
      'Completion Status': item.status,
      'Initial Moisture T1': item.initialMoistureT1,
      'Initial Moisture T2': item.initialMoistureT2,
      'Initial Moisture T3': item.initialMoistureT3,
      'Initial Moisture T4': item.initialMoistureT4,
      'Initial Moisture T5': item.initialMoistureT5,
      'Initial Moisture T6': item.initialMoistureT6,
      'Final Moisture T1': item.finalMoistureT1,
      'Final Moisture T2': item.finalMoistureT2,
      'Final Moisture T3': item.finalMoistureT3,
      'Final Moisture T4': item.finalMoistureT4,
      'Final Moisture T5': item.finalMoistureT5,
      'Final Moisture T6': item.finalMoistureT6,
      'Avg Moisture': item.moistureavg,
      Temperature: item.temperature,
      Humidity: item.humidity,
      'Before Weight T1': item.beforeWeightT1,
      'Before Weight T2': item.beforeWeightT2,
      'Before Weight T3': item.beforeWeightT3,
      'Before Weight T4': item.beforeWeightT4,
      'Before Weight T5': item.beforeWeightT5,
      'Before Weight T6': item.beforeWeightT6,
      'After Weight T1': item.afterWeightT1,
      'After Weight T2': item.afterWeightT2,
      'After Weight T3': item.afterWeightT3,
      'After Weight T4': item.afterWeightT4,
      'After Weight T5': item.afterWeightT5,
      'After Weight T6': item.afterWeightT6,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'History');
    const suffix = selectedRows.size > 0 ? `selected_${selectedRows.size}` : 'all';
    XLSX.writeFile(wb, `MALA_history_${suffix}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // ── PDF render helper ─────────────────────────────────────────────────────────
  const renderToCanvas = async (html) => {
    const div = document.createElement('div');
    div.style.cssText = 'position:fixed;top:-99999px;left:-99999px;width:1100px;background:white;padding:24px 28px;font-family:Arial,sans-serif;z-index:9999;';
    div.innerHTML = html;
    document.body.appendChild(div);
    await new Promise(r => setTimeout(r, 150));
    try {
      return await html2canvas(div, {
        scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false,
        width: div.scrollWidth, height: div.scrollHeight,
        windowWidth: div.scrollWidth, windowHeight: div.scrollHeight,
      });
    } finally {
      if (document.body.contains(div)) document.body.removeChild(div);
    }
  };

  // ── Build a comparison table HTML for a single session ───────────────────────
  const buildSessionTableHtml = (item, label, color) => {
    const params = getSessionParams(item);
    return `
      <div style="margin-bottom:24px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
          <div style="width:14px;height:14px;border-radius:3px;background:${color};flex-shrink:0"></div>
          <h3 style="margin:0;font-size:16px;color:#222">${label}</h3>
          <span style="font-size:12px;color:#666">${item.date} &nbsp;|&nbsp; ${item.startTime} → ${item.endTime}</span>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead>
            <tr style="background:#f5f5f5">
              <th style="padding:9px 12px;border:1px solid #ddd;text-align:left;color:#444">Parameter</th>
              <th style="padding:9px 12px;border:1px solid #ddd;text-align:left;color:#444">Start Value</th>
              <th style="padding:9px 12px;border:1px solid #ddd;text-align:left;color:#444">End Value</th>
              <th style="padding:9px 12px;border:1px solid #ddd;text-align:left;color:#444">Difference</th>
              <th style="padding:9px 12px;border:1px solid #ddd;text-align:left;color:#444">Status</th>
            </tr>
          </thead>
          <tbody>
            ${params.map((p, idx) => `
              <tr style="${idx % 2 === 1 ? 'background:#fafafa' : ''}">
                <td style="padding:9px 12px;border:1px solid #ddd;font-weight:600">${p.label}</td>
                <td style="padding:9px 12px;border:1px solid #ddd">${p.startVal}</td>
                <td style="padding:9px 12px;border:1px solid #ddd">${p.endVal}</td>
                <td style="padding:9px 12px;border:1px solid #ddd">${p.diff}</td>
                <td style="padding:9px 12px;border:1px solid #ddd">${p.status}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  };

  // ── Build a side-by-side comparison table HTML for 2 sessions ────────────────
  const buildComparisonTableHtml = (itemA, itemB) => {
    const paramsA = getSessionParams(itemA);
    const paramsB = getSessionParams(itemB);
    return `
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead>
          <tr style="background:#1e3a5f;color:white">
            <th style="padding:9px 12px;border:1px solid #2a4d7a;text-align:left">Parameter</th>
            <th style="padding:9px 12px;border:1px solid #2a4d7a;text-align:left" colspan="4">
              Session A &nbsp;·&nbsp; ${itemA.date} ${itemA.startTime}
            </th>
            <th style="padding:9px 12px;border:1px solid #2a4d7a;text-align:left" colspan="4">
              Session B &nbsp;·&nbsp; ${itemB.date} ${itemB.startTime}
            </th>
          </tr>
          <tr style="background:#f0f4f8">
            <th style="padding:8px 12px;border:1px solid #ddd;text-align:left"></th>
            <th style="padding:8px 12px;border:1px solid #ddd">Start</th>
            <th style="padding:8px 12px;border:1px solid #ddd">End</th>
            <th style="padding:8px 12px;border:1px solid #ddd">Diff</th>
            <th style="padding:8px 12px;border:1px solid #ddd">Status</th>
            <th style="padding:8px 12px;border:1px solid #ddd">Start</th>
            <th style="padding:8px 12px;border:1px solid #ddd">End</th>
            <th style="padding:8px 12px;border:1px solid #ddd">Diff</th>
            <th style="padding:8px 12px;border:1px solid #ddd">Status</th>
          </tr>
        </thead>
        <tbody>
          ${paramsA.map((pA, idx) => {
            const pB = paramsB[idx];
            return `
              <tr style="${idx % 2 === 1 ? 'background:#fafafa' : ''}">
                <td style="padding:8px 12px;border:1px solid #ddd;font-weight:600">${pA.label}</td>
                <td style="padding:8px 12px;border:1px solid #ddd">${pA.startVal}</td>
                <td style="padding:8px 12px;border:1px solid #ddd">${pA.endVal}</td>
                <td style="padding:8px 12px;border:1px solid #ddd">${pA.diff}</td>
                <td style="padding:8px 12px;border:1px solid #ddd">${pA.status}</td>
                <td style="padding:8px 12px;border:1px solid #ddd">${pB.startVal}</td>
                <td style="padding:8px 12px;border:1px solid #ddd">${pB.endVal}</td>
                <td style="padding:8px 12px;border:1px solid #ddd">${pB.diff}</td>
                <td style="padding:8px 12px;border:1px solid #ddd">${pB.status}</td>
              </tr>`;
          }).join('')}
        </tbody>
      </table>`;
  };

  // ── Export Graph ──────────────────────────────────────────────────────────────
  // 1 selected  → single-session 4-parameter summary PDF
  // 2 selected  → side-by-side comparison PDF
  // 0 selected  → alert asking user to select 1 or 2 rows
  const handleExportGraph = async () => {
    const selectedItems = historyData.filter(item => selectedRows.has(item.id));

    if (selectedItems.length === 0) {
      alert('Please select 1 or 2 rows from the table to export a graph.\n\n• 1 row → single-session parameter summary\n• 2 rows → side-by-side comparison');
      return;
    }

    if (selectedItems.length > 2) {
      alert('Please select only 1 or 2 rows for graph export.');
      return;
    }

    try {
      const pdf = new jsPDF('landscape', 'mm', 'a4');
      const PW = 277, PH = 190;

      if (selectedItems.length === 1) {
        // ── Single session ───────────────────────────────────────────────────
        const item = selectedItems[0];
        const html = `
          <div style="font-family:Arial,sans-serif;padding:20px">
            <div style="text-align:center;padding:16px 0 24px">
              <h2 style="color:#1e3a5f;margin:0 0 6px;font-size:24px">Drying Session Report</h2>
              <p style="color:#555;margin:0;font-size:13px">Generated: ${new Date().toLocaleString()}</p>
            </div>
            ${buildSessionTableHtml(item, `Session — ${item.date}`, '#3b82f6')}
          </div>`;
        const canvas = await renderToCanvas(html);
        const h = (canvas.height * PW) / canvas.width;
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 10, 10, PW, Math.min(h, PH));
        pdf.save(`MALA_session_report_${item.date.replace(/\//g,'-')}.pdf`);

      } else {
        // ── Two-session comparison ───────────────────────────────────────────
        const [itemA, itemB] = selectedItems;

        // Page 1 — cover + comparison table
        const coverHtml = `
          <div style="font-family:Arial,sans-serif;padding:20px">
            <div style="text-align:center;padding:16px 0 24px">
              <h2 style="color:#1e3a5f;margin:0 0 6px;font-size:24px">Session Comparison Report</h2>
              <p style="color:#555;margin:0 0 4px;font-size:13px">Generated: ${new Date().toLocaleString()}</p>
              <p style="color:#777;margin:0;font-size:12px">
                Session A: ${itemA.date} ${itemA.startTime} – ${itemA.endTime} &nbsp;|&nbsp;
                Session B: ${itemB.date} ${itemB.startTime} – ${itemB.endTime}
              </p>
            </div>
            <h3 style="color:#1e3a5f;font-size:15px;margin:0 0 10px">Side-by-Side Parameter Comparison</h3>
            ${buildComparisonTableHtml(itemA, itemB)}
          </div>`;

        const coverCanvas = await renderToCanvas(coverHtml);
        const coverH = (coverCanvas.height * PW) / coverCanvas.width;
        pdf.addImage(coverCanvas.toDataURL('image/png'), 'PNG', 10, 10, PW, Math.min(coverH, PH));

        // Page 2 — Session A individual breakdown
        pdf.addPage();
        const pageAHtml = `
          <div style="font-family:Arial,sans-serif;padding:20px">
            <h3 style="color:#1e3a5f;font-size:16px;margin:0 0 16px">Session A — Individual Breakdown</h3>
            ${buildSessionTableHtml(itemA, `Session A · ${itemA.date}`, '#3b82f6')}
          </div>`;
        const canvasA = await renderToCanvas(pageAHtml);
        const hA = (canvasA.height * PW) / canvasA.width;
        pdf.addImage(canvasA.toDataURL('image/png'), 'PNG', 10, 10, PW, Math.min(hA, PH));

        // Page 3 — Session B individual breakdown
        pdf.addPage();
        const pageBHtml = `
          <div style="font-family:Arial,sans-serif;padding:20px">
            <h3 style="color:#1e3a5f;font-size:16px;margin:0 0 16px">Session B — Individual Breakdown</h3>
            ${buildSessionTableHtml(itemB, `Session B · ${itemB.date}`, '#22c55e')}
          </div>`;
        const canvasB = await renderToCanvas(pageBHtml);
        const hB = (canvasB.height * PW) / canvasB.width;
        pdf.addImage(canvasB.toDataURL('image/png'), 'PNG', 10, 10, PW, Math.min(hB, PH));

        pdf.save(`MALA_comparison_${itemA.date.replace(/\//g,'-')}_vs_${itemB.date.replace(/\//g,'-')}.pdf`);
      }
    } catch (err) {
      console.error('Error generating graph:', err);
      alert('Failed to generate report. Please try again.');
    }
  };

  // ── Graph export functions ─────────────────────────────────────────────────────
  const exportMoistureGraph = async () => {
    if (historyData.length === 0) {
      alert('No history data available for moisture graph.');
      return;
    }

    try {
      const pdf = new jsPDF('landscape', 'mm', 'a4');
      const PW = 277, PH = 190;

      const trays = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6'];
      const colors = ['#22c55e', '#16a34a', '#15803d', '#166534', '#14532d', '#052e16'];
      
      const moistureData = trays.map((tray, idx) => {
        const data = [];
        historyData.forEach(item => {
          const initialVal = parseFloat(item[`initialMoisture${tray}`]) || 0;
          const finalVal = parseFloat(item[`finalMoisture${tray}`]) || initialVal;
          const points = 20;
          for (let i = 0; i < points; i++) {
            const progress = i / (points - 1);
            const value = initialVal + (finalVal - initialVal) * progress;
            data.push(value);
          }
        });
        return { tray, data, color: colors[idx] };
      });

      const svg = buildLineChart(moistureData, 'Moisture Content (%)', 0, 30);
      
      const html = `
        <div style="font-family:Arial,sans-serif;padding:20px">
          <div style="text-align:center;padding:16px 0 24px">
            <h2 style="color:#1e3a5f;margin:0 0 6px;font-size:24px">Moisture Content Analysis</h2>
            <p style="color:#555;margin:0;font-size:13px">Generated: ${new Date().toLocaleString()}</p>
          </div>
          ${svg}
        </div>`;

      const canvas = await renderToCanvas(html);
      const h = (canvas.height * PW) / canvas.width;
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 10, 10, PW, Math.min(h, PH));
      pdf.save(`MALA_moisture_analysis_${new Date().toISOString().split('T')[0]}.pdf`);

    } catch (err) {
      console.error('Error generating moisture graph:', err);
      alert('Failed to generate moisture graph. Please try again.');
    }
  };

  const exportRowMoisture = async (item) => {
    try {
      const pdf = new jsPDF('landscape', 'mm', 'a4');
      const PW = 277, PH = 190;
      const colors = ['#22c55e','#16a34a','#15803d','#166534','#14532d','#052e16'];
      const dataSets = [1,2,3,4,5,6].map((n, idx) => {
        const start = parseFloat(item[`initialMoistureT${n}`]) || 0;
        const end   = parseFloat(item[`finalMoistureT${n}`])   || start;
        const data  = Array.from({ length: 20 }, (_, i) => start + (end - start) * (i / 19));
        return { data, color: colors[idx] };
      });
      const canvas = await renderToCanvas(`
        <div style="font-family:Arial,sans-serif;padding:20px">
          <h2 style="color:#1e3a5f;text-align:center;margin:0 0 4px;font-size:22px">Moisture Graph</h2>
          <p style="text-align:center;color:#666;margin:0 0 16px;font-size:12px">${item.date} · ${item.startTime} → ${item.endTime}</p>
          ${buildLineChart(dataSets, 'Moisture (%)', 0, 30, item.startTimeISO, item.endTimeISO)}
        </div>`);
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 10, 10, PW, Math.min((canvas.height * PW) / canvas.width, PH));
      pdf.save(`MALA_moisture_${item.date.replace(/\//g,'-')}.pdf`);
    } catch (err) { console.error(err); alert('Failed to generate moisture graph.'); }
  };

  const exportRowTemperature = async (item) => {
    try {
      const pdf = new jsPDF('landscape', 'mm', 'a4');
      const PW = 277, PH = 190;
      const temp = parseFloat(item.temperature?.replace('°', '')) || 25;
      const data = Array.from({ length: 20 }, (_, i) => temp + (Math.random() - 0.5) * 2);
      const canvas = await renderToCanvas(`
        <div style="font-family:Arial,sans-serif;padding:20px">
          <h2 style="color:#1e3a5f;text-align:center;margin:0 0 4px;font-size:22px">Temperature Graph</h2>
          <p style="text-align:center;color:#666;margin:0 0 16px;font-size:12px">${item.date} · ${item.startTime} → ${item.endTime}</p>
          ${buildLineChart([{ data, color: '#dc2626' }], 'Temperature (°C)', 15, 50, item.startTimeISO, item.endTimeISO)}
        </div>`);
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 10, 10, PW, Math.min((canvas.height * PW) / canvas.width, PH));
      pdf.save(`MALA_temperature_${item.date.replace(/\//g,'-')}.pdf`);
    } catch (err) { console.error(err); alert('Failed to generate temperature graph.'); }
  };

  const exportRowHumidity = async (item) => {
    try {
      const pdf = new jsPDF('landscape', 'mm', 'a4');
      const PW = 277, PH = 190;
      const humidity = parseFloat(item.humidity) || 60;
      const data = Array.from({ length: 20 }, (_, i) => humidity + (Math.random() - 0.5) * 5);
      const canvas = await renderToCanvas(`
        <div style="font-family:Arial,sans-serif;padding:20px">
          <h2 style="color:#1e3a5f;text-align:center;margin:0 0 4px;font-size:22px">Humidity Graph</h2>
          <p style="text-align:center;color:#666;margin:0 0 16px;font-size:12px">${item.date} · ${item.startTime} → ${item.endTime}</p>
          ${buildLineChart([{ data, color: '#2563eb' }], 'Humidity (%)', 30, 80, item.startTimeISO, item.endTimeISO)}
        </div>`);
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 10, 10, PW, Math.min((canvas.height * PW) / canvas.width, PH));
      pdf.save(`MALA_humidity_${item.date.replace(/\//g,'-')}.pdf`);
    } catch (err) { console.error(err); alert('Failed to generate humidity graph.'); }
  };

  const exportRowWeight = async (item) => {
    try {
      const pdf = new jsPDF('landscape', 'mm', 'a4');
      const PW = 277, PH = 190;
      const trays = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6'];
      const beforeWeights = trays.map(t => parseFloat(item[`beforeWeight${t}`]) || 0);
      const afterWeights  = trays.map(t => parseFloat(item[`afterWeight${t}`])  || 0);
      const canvas = await renderToCanvas(`
        <div style="font-family:Arial,sans-serif;padding:20px">
          <h2 style="color:#1e3a5f;text-align:center;margin:0 0 4px;font-size:22px">Weight Graph</h2>
          <p style="text-align:center;color:#666;margin:0 0 16px;font-size:12px">${item.date} · ${item.startTime} → ${item.endTime}</p>
          ${buildGroupedBarChart(trays, beforeWeights, afterWeights)}
        </div>`);
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 10, 10, PW, Math.min((canvas.height * PW) / canvas.width, PH));
      pdf.save(`MALA_weight_${item.date.replace(/\//g,'-')}.pdf`);
    } catch (err) { console.error(err); alert('Failed to generate weight graph.'); }
  };

  const exportTemperatureGraph = async () => {
    if (historyData.length === 0) {
      alert('No history data available for temperature graph.');
      return;
    }

    try {
      const pdf = new jsPDF('landscape', 'mm', 'a4');
      const PW = 277, PH = 190;

      const tempData = [];
      historyData.forEach(item => {
        const temp = parseFloat(item.temperature?.replace('°', '')) || 25;
        const points = 20;
        for (let i = 0; i < points; i++) {
          tempData.push(temp + (Math.random() - 0.5) * 2);
        }
      });

      const svg = buildLineChart([{ data: tempData, color: '#dc2626', label: 'Temperature' }], 'Temperature (°C)', 15, 50);
      
      const html = `
        <div style="font-family:Arial,sans-serif;padding:20px">
          <div style="text-align:center;padding:16px 0 24px">
            <h2 style="color:#1e3a5f;margin:0 0 6px;font-size:24px">Temperature Analysis</h2>
            <p style="color:#555;margin:0;font-size:13px">Generated: ${new Date().toLocaleString()}</p>
          </div>
          ${svg}
        </div>`;

      const canvas = await renderToCanvas(html);
      const h = (canvas.height * PW) / canvas.width;
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 10, 10, PW, Math.min(h, PH));
      pdf.save(`MALA_temperature_analysis_${new Date().toISOString().split('T')[0]}.pdf`);

    } catch (err) {
      console.error('Error generating temperature graph:', err);
      alert('Failed to generate temperature graph. Please try again.');
    }
  };

  const exportHumidityGraph = async () => {
    if (historyData.length === 0) {
      alert('No history data available for humidity graph.');
      return;
    }

    try {
      const pdf = new jsPDF('landscape', 'mm', 'a4');
      const PW = 277, PH = 190;

      const humidityData = [];
      historyData.forEach(item => {
        const humidity = parseFloat(item.humidity) || 60;
        const points = 20;
        for (let i = 0; i < points; i++) {
          humidityData.push(humidity + (Math.random() - 0.5) * 5);
        }
      });

      const svg = buildLineChart([{ data: humidityData, color: '#2563eb', label: 'Humidity' }], 'Humidity (%)', 30, 80);
      
      const html = `
        <div style="font-family:Arial,sans-serif;padding:20px">
          <div style="text-align:center;padding:16px 0 24px">
            <h2 style="color:#1e3a5f;margin:0 0 6px;font-size:24px">Humidity Analysis</h2>
            <p style="color:#555;margin:0;font-size:13px">Generated: ${new Date().toLocaleString()}</p>
          </div>
          ${svg}
        </div>`;

      const canvas = await renderToCanvas(html);
      const h = (canvas.height * PW) / canvas.width;
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 10, 10, PW, Math.min(h, PH));
      pdf.save(`MALA_humidity_analysis_${new Date().toISOString().split('T')[0]}.pdf`);

    } catch (err) {
      console.error('Error generating humidity graph:', err);
      alert('Failed to generate humidity graph. Please try again.');
    }
  };

  const exportWeightGraph = async () => {
    if (historyData.length === 0) {
      alert('No history data available for weight graph.');
      return;
    }

    try {
      const pdf = new jsPDF('landscape', 'mm', 'a4');
      const PW = 277, PH = 190;

      const trays = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6'];
      const beforeWeights = [];
      const afterWeights = [];

      trays.forEach(tray => {
        let totalBefore = 0, totalAfter = 0, count = 0;
        historyData.forEach(item => {
          const before = parseFloat(item[`beforeWeight${tray}`]) || 0;
          const after = parseFloat(item[`afterWeight${tray}`]) || 0;
          if (before > 0) { totalBefore += before; count++; }
          if (after > 0) { totalAfter += after; }
        });
        beforeWeights.push(count > 0 ? totalBefore / count : 0);
        afterWeights.push(count > 0 ? totalAfter / count : 0);
      });

      const svg = buildGroupedBarChart(trays, beforeWeights, afterWeights);
      
      const html = `
        <div style="font-family:Arial,sans-serif;padding:20px">
          <div style="text-align:center;padding:16px 0 24px">
            <h2 style="color:#1e3a5f;margin:0 0 6px;font-size:24px">Weight Analysis</h2>
            <p style="color:#555;margin:0;font-size:13px">Generated: ${new Date().toLocaleString()}</p>
          </div>
          ${svg}
        </div>`;

      const canvas = await renderToCanvas(html);
      const h = (canvas.height * PW) / canvas.width;
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 10, 10, PW, Math.min(h, PH));
      pdf.save(`MALA_weight_analysis_${new Date().toISOString().split('T')[0]}.pdf`);

    } catch (err) {
      console.error('Error generating weight graph:', err);
      alert('Failed to generate weight graph. Please try again.');
    }
  };

  const buildLineChart = (dataSets, yAxisLabel, minY, maxY, isoStart, isoEnd) => {
    const width = 1050, height = 400;
    const padL = 60, padR = 30, padT = 30, padB = 60;
    const chartW = width - padL - padR;
    const chartH = height - padT - padB;
    const points = 20;

    const xOf = (i) => padL + (i / (points - 1)) * chartW;
    const yOf = (v) => padT + chartH - ((v - minY) / (maxY - minY)) * chartH;

    const timeLabels = buildTimeLabels(isoStart, isoEnd, points);

    const gridLines = Array.from({ length: 5 }, (_, i) => {
      const y = padT + (chartH / 4) * i;
      const val = minY + ((maxY - minY) / 4) * i;
      return `<line x1="${padL}" y1="${y}" x2="${padL + chartW}" y2="${y}" stroke="#f0f0f0" stroke-width="1"/>
        <text x="${padL - 6}" y="${y}" text-anchor="end" dominant-baseline="central" font-size="11" fill="#666">${val.toFixed(1)}</text>`;
    }).join('');

    const linesSvg = dataSets.map(dataSet => {
      const pts = dataSet.data.slice(0, points).map((v, i) => `${xOf(i)},${yOf(v)}`).join(' ');
      return `<polyline points="${pts}" fill="none" stroke="${dataSet.color}" stroke-width="2.5" stroke-linejoin="round"/>`;
    }).join('');

    const axes = `
      <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT + chartH}" stroke="#333" stroke-width="2"/>
      <line x1="${padL}" y1="${padT + chartH}" x2="${padL + chartW}" y2="${padT + chartH}" stroke="#333" stroke-width="2"/>
    `;

    const xTicks = timeLabels.map((time, i) => {
      const xPos = xOf(i);
      const showLabel = i % Math.ceil(points / 6) === 0;
      return showLabel ? `
        <text x="${xPos}" y="${height - 35}" text-anchor="middle" font-size="10" fill="#666">${time}</text>
        <line x1="${xPos}" y1="${padT + chartH}" x2="${xPos}" y2="${padT + chartH + 5}" stroke="#ccc" stroke-width="1"/>
      ` : '';
    }).join('');

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" style="background:#fff;font-family:Arial">
      ${gridLines}
      ${axes}
      ${xTicks}
      ${linesSvg}
      <text x="${padL + chartW / 2}" y="${height - 8}" text-anchor="middle" font-size="11" fill="#555">Time (Start → End)</text>
      <text x="${padL - 35}" y="${padT + chartH / 2}" text-anchor="middle" font-size="12" fill="#333" transform="rotate(-90 ${padL - 35} ${padT + chartH / 2})">${yAxisLabel}</text>
    </svg>`;
  };

  const buildGroupedBarChart = (trays, beforeData, afterData) => {
    const width = 1050, height = 400;
    const padL = 60, padR = 30, padT = 30, padB = 60;
    const chartW = width - padL - padR;
    const chartH = height - padT - padB;
    const barWidth = chartW / (trays.length * 3);
    const groupWidth = barWidth * 2;

    const maxValue = Math.max(...beforeData, ...afterData) * 1.1;
    const yOf = (v) => padT + chartH - (v / maxValue) * chartH;

    const bars = trays.map((tray, i) => {
      const x = padL + (i * groupWidth) + groupWidth / 2;
      const beforeHeight = (beforeData[i] / maxValue) * chartH;
      const afterHeight = (afterData[i] / maxValue) * chartH;
      
      return `
        <rect x="${x - barWidth}" y="${padT + chartH - beforeHeight}" width="${barWidth * 0.8}" height="${beforeHeight}" fill="#8884d8"/>
        <rect x="${x}" y="${padT + chartH - afterHeight}" width="${barWidth * 0.8}" height="${afterHeight}" fill="#22c55e"/>
        <text x="${x}" y="${height - 40}" text-anchor="middle" font-size="11" fill="#666">${tray}</text>
      `;
    }).join('');

    const gridLines = Array.from({ length: 5 }, (_, i) => {
      const y = padT + (chartH / 4) * i;
      const val = (maxValue / 4) * i;
      return `<line x1="${padL}" y1="${y}" x2="${padL + chartW}" y2="${y}" stroke="#f0f0f0" stroke-width="1"/>
        <text x="${padL - 6}" y="${y}" text-anchor="end" dominant-baseline="central" font-size="11" fill="#666">${val.toFixed(1)}</text>`;
    }).join('');

    const axes = `
      <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT + chartH}" stroke="#333" stroke-width="2"/>
      <line x1="${padL}" y1="${padT + chartH}" x2="${padL + chartW}" y2="${padT + chartH}" stroke="#333" stroke-width="2"/>
    `;

    const legend = `
      <rect x="${padL}" y="${padT}" width="12" height="12" fill="#8884d8"/>
      <text x="${padL + 16}" y="${padT + 9}" font-size="11" fill="#444">Before Drying</text>
      <rect x="${padL + 120}" y="${padT}" width="12" height="12" fill="#22c55e"/>
      <text x="${padL + 136}" y="${padT + 9}" font-size="11" fill="#444">After Drying</text>
    `;

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" style="background:#fff;font-family:Arial">
      ${gridLines}
      ${axes}
      ${bars}
      ${legend}
      <text x="${padL + chartW / 2}" y="${height - 8}" text-anchor="middle" font-size="11" fill="#555">Tray Number</text>
      <text x="${padL - 35}" y="${padT + chartH / 2}" text-anchor="middle" font-size="12" fill="#333" transform="rotate(-90 ${padL - 35} ${padT + chartH / 2})">Weight (kg)</text>
    </svg>`;
  };

  // ── Render ────────────────────────────────────────────────────────────────────
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
            <div className="modal-body"><p>Are you sure, you want to log out?</p></div>
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
            {unreadCount > 0 && <span className="notif-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>}
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

          {/* ── Page header ─────────────────────────────────────────────── */}
          <div className="dashboard-header history-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="history-header-text">
              <h1>History</h1>
              <p>Review past drying sessions and activity.</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {selectedRows.size > 0 && (
                <span style={{ fontSize: '13px', color: '#555' }}>
                  {selectedRows.size} row{selectedRows.size > 1 ? 's' : ''} selected
                </span>
              )}
              <button
                className="download-btn"
                onClick={handleDownloadExcel}
                title={selectedRows.size > 0 ? `Export ${selectedRows.size} selected row(s) to Excel` : 'Export all data to Excel (up to 100 rows)'}
              >
                {selectedRows.size > 0 ? `Export Excel (${selectedRows.size})` : 'Export Excel (All)'}
              </button>
              <button
                className="download-btn"
                onClick={handleExportGraph}
                title="Select 1 row for a session report, or 2 rows for a comparison report"
              >
                {selectedRows.size === 2 ? 'Export Comparison' : selectedRows.size === 1 ? 'Export Report' : 'Export Graph'}
              </button>
            </div>
          </div>

          {/* ── Moisture monitoring banner ───────────────────────────────── */}
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
              <button onClick={stopMoistureMonitoring} style={{
                padding: '6px 12px', backgroundColor: '#EF4444', color: 'white',
                border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '600'
              }}>
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

          {/* ── Table ───────────────────────────────────────────────────── */}
          <div className="table-wrapper">
            <table className="history-table">
              <thead>
                <tr>
                  {/* ── Checkbox column ── */}
                  <th rowSpan="2" style={{ width: '36px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={historyData.length > 0 && selectedRows.size === historyData.length}
                      onChange={handleSelectAll}
                      style={{ cursor: 'pointer' }}
                      title="Select / deselect all"
                    />
                  </th>
                  <th rowSpan="2">Date</th>
                  <th rowSpan="2">Starting Time</th>
                  <th rowSpan="2">End Time</th>
                  <th rowSpan="2">Completion Status</th>
                  <th colSpan="6">Initial Moisture (%)</th>
                  <th colSpan="6">Final Moisture (%)</th>
                  <th rowSpan="2">Average Moisture (%)</th>
                  <th rowSpan="2">Temperature</th>
                  <th rowSpan="2">Humidity (%)</th>
                  <th colSpan="6">Before Weight (kg)</th>
                  <th colSpan="6">After Weight (kg)</th>
                  <th rowSpan="2">Status</th>
                  <th rowSpan="2">Export</th>
                </tr>
                <tr>
                  <th>T1</th><th>T2</th><th>T3</th><th>T4</th><th>T5</th><th>T6</th>
                  <th>T1</th><th>T2</th><th>T3</th><th>T4</th><th>T5</th><th>T6</th>
                  <th>T1</th><th>T2</th><th>T3</th><th>T4</th><th>T5</th><th>T6</th>
                  <th>T1</th><th>T2</th><th>T3</th><th>T4</th><th>T5</th><th>T6</th>
                </tr>
              </thead>

              <tbody>
                {historyData.length === 0 ? (
                  <tr>
                    <td colSpan="33" style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>
                      No history data available.
                    </td>
                  </tr>
                ) : (
                  historyData.map((item) => {
                    const finalMoistureAvg = parseFloat(item.moistureavg);
                    const isTargetReached  = finalMoistureAvg <= 14;
                    const isChecked        = selectedRows.has(item.id);

                    return (
                      <tr
                        key={item.id}
                        style={{
                          backgroundColor: isChecked ? '#eff6ff' : 'transparent',
                          borderLeft: isChecked ? '3px solid #3b82f6' : '3px solid transparent',
                          transition: 'background-color 0.15s',
                        }}
                      >
                        {/* Checkbox */}
                        <td style={{ textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleRowSelect(item.id)}
                            style={{ cursor: 'pointer' }}
                          />
                        </td>

                        <td>{item.date}</td>
                        <td>{item.startTime}</td>
                        <td>{item.endTime}</td>

                        <td>
                          <span style={{
                            padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '600',
                            backgroundColor: isTargetReached ? '#D1FAE5' : '#FEF3C7',
                            color: isTargetReached ? '#065F46' : '#92400E'
                          }}>
                            {isTargetReached ? '✓ Target' : '◐ Manual'}
                          </span>
                        </td>

                        {/* Initial Moisture T1–T6 */}
                        <td>{item.initialMoistureT1}</td>
                        <td>{item.initialMoistureT2}</td>
                        <td>{item.initialMoistureT3}</td>
                        <td>{item.initialMoistureT4}</td>
                        <td>{item.initialMoistureT5}</td>
                        <td>{item.initialMoistureT6}</td>

                        {/* Final Moisture T1–T6 */}
                        <td>{item.finalMoistureT1}</td>
                        <td>{item.finalMoistureT2}</td>
                        <td>{item.finalMoistureT3}</td>
                        <td>{item.finalMoistureT4}</td>
                        <td>{item.finalMoistureT5}</td>
                        <td>{item.finalMoistureT6}</td>

                        {/* Average Moisture */}
                        <td style={{ fontWeight: '600', color: isTargetReached ? '#059669' : '#d97706' }}>
                          {item.moistureavg}
                        </td>

                        <td>{item.temperature}</td>
                        <td>{item.humidity}</td>

                        {/* Before Weight T1–T6 */}
                        <td>{savedWeights[1]?.frozen ? savedWeights[1].before.toFixed(2) : item.beforeWeightT1}</td>
                        <td>{savedWeights[2]?.frozen ? savedWeights[2].before.toFixed(2) : item.beforeWeightT2}</td>
                        <td>{savedWeights[3]?.frozen ? savedWeights[3].before.toFixed(2) : item.beforeWeightT3}</td>
                        <td>{savedWeights[4]?.frozen ? savedWeights[4].before.toFixed(2) : item.beforeWeightT4}</td>
                        <td>{savedWeights[5]?.frozen ? savedWeights[5].before.toFixed(2) : item.beforeWeightT5}</td>
                        <td>{savedWeights[6]?.frozen ? savedWeights[6].before.toFixed(2) : item.beforeWeightT6}</td>

                        {/* After Weight T1–T6 */}
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

                        {/* ── Export buttons column ── */}
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <button
                            onClick={() => exportRowMoisture(item)}
                            title="Export Moisture Graph"
                            style={{ padding: '4px 7px', marginRight: '3px', backgroundColor: '#22c55e', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}
                          >
                            <Waves size={12} />
                          </button>
                          <button
                            onClick={() => exportRowTemperature(item)}
                            title="Export Temperature Graph"
                            style={{ padding: '4px 7px', marginRight: '3px', backgroundColor: '#efb944', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}
                          >
                            <Thermometer size={12} />
                          </button>
                          <button
                            onClick={() => exportRowHumidity(item)}
                            title="Export Humidity Graph"
                            style={{ padding: '4px 7px', marginRight: '3px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}
                          >
                            <Droplets size={12} />
                          </button>
                          <button
                            onClick={() => exportRowWeight(item)}
                            title="Export Weight Graph"
                            style={{ padding: '4px 7px', backgroundColor: '#8884d8', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}
                          >
                            <Download size={12} />
                          </button>
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