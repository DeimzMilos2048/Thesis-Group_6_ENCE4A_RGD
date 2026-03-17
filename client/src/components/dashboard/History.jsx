// history

import { useState, useEffect, useRef } from 'react';
import { Activity, BarChart2, Bell, CircleUser, Clock, AlertTriangle, LogOut, ChevronDown, ChevronUp, User, HelpCircle, Settings, Download, Trash2, Bookmark } from 'lucide-react';
import './Dashboard.css';
import './History.css';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import { useNavigate, useLocation } from 'react-router-dom';
import authService from '../../api/authService';
import dryerService from '../../api/dryerService';
import logo from "../../assets/images/logo2.png";
import useNotificationService from './Usenotificationservice.js';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export default function History({ view }) {

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('history');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecords, setSelectedRecords] = useState([]);
  const [savedRecords, setSavedRecords] = useState([]);
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const chartRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Add notification service for badge
  const { unreadCount } = useNotificationService(null, 15000);

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
    // Load saved records from localStorage
    const saved = JSON.parse(localStorage.getItem('savedHistoryRecords') || '[]');
    setSavedRecords(saved.map(record => record.id));
  }, []);

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

        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers.get('content-type'));

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
          console.log('History API Response:', result);

          let sensorData = [];
          if (result.success && result.data) {
            sensorData = result.data;
          } else if (Array.isArray(result)) {
            sensorData = result;
          } else if (result.data) {
            sensorData = result.data;
          } else {
            console.warn('Unexpected response structure:', result);
            sensorData = [];
          }

          if (!Array.isArray(sensorData)) {
            console.error('History API: Expected array but got:', typeof sensorData, sensorData);
            setError('Invalid data format received from server');
            setLoading(false);
            return;
          }

          const safeToString = (value, fallback = 'N/A') =>
            value !== undefined && value !== null ? value.toString() : fallback;

          // Helper function to format numbers with 2 decimal places
          const formatNumber = (value) => {
            const num = parseFloat(value);
            return isNaN(num) ? 'N/A' : num.toFixed(2);
          };

          const formattedData = sensorData.map((item, index) => {
            return {
              id: item._id || item.id || index + 1,

              // Date & Time - use backend formatted values directly
              date: item.date || 'N/A',
              startTime: item.startTime || 'N/A',
              endTime: item.endTime || '—',

              // Initial Moisture per tray (T1–T6)
              initialMoistureT1: formatNumber(item.moisture1),
              initialMoistureT2: formatNumber(item.moisture2),
              initialMoistureT3: formatNumber(item.moisture3),
              initialMoistureT4: formatNumber(item.moisture4),
              initialMoistureT5: formatNumber(item.moisture5),
              initialMoistureT6: formatNumber(item.moisture6),

              // Final Moisture per tray (T1–T6) - use direct moisture fields from drying session
              finalMoistureT1: formatNumber(item.moisture1),
              finalMoistureT2: formatNumber(item.moisture2),
              finalMoistureT3: formatNumber(item.moisture3),
              finalMoistureT4: formatNumber(item.moisture4),
              finalMoistureT5: formatNumber(item.moisture5),
              finalMoistureT6: formatNumber(item.moisture6),

              // Moisture average
              moistureavg: formatNumber(item.moistureavg),

              // Temperature & Humidity
              temperature: formatNumber(item.temperature),
              humidity: formatNumber(item.humidity),

              // Before Weight — per tray from backend
              beforeWeightT1: formatNumber(item.weight1_t1 ?? item.weight1),
              beforeWeightT2: formatNumber(item.weight1_t2 ?? item.weight1),
              beforeWeightT3: formatNumber(item.weight1_t3 ?? item.weight1),
              beforeWeightT4: formatNumber(item.weight1_t4 ?? item.weight1),
              beforeWeightT5: formatNumber(item.weight1_t5 ?? item.weight1),
              beforeWeightT6: formatNumber(item.weight1_t6 ?? item.weight1),

              // After Weight — per tray from backend
              afterWeightT1: formatNumber(item.weight2_t1 ?? item.weight2),
              afterWeightT2: formatNumber(item.weight2_t2 ?? item.weight2),
              afterWeightT3: formatNumber(item.weight2_t3 ?? item.weight2),
              afterWeightT4: formatNumber(item.weight2_t4 ?? item.weight2),
              afterWeightT5: formatNumber(item.weight2_t5 ?? item.weight2),
              afterWeightT6: formatNumber(item.weight2_t6 ?? item.weight2),

              // Status
              status: item.status || 'Idle',
            };
          });

          console.log('Formatted History Data:', formattedData);
          setHistoryData(formattedData);
          setError(null);
          setLoading(false);
        }
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

  const handleNavigation = (path, tab) => {
    setActiveTab(tab);
    navigate(path);
  };

  const handleLogoutClick = () => setShowLogoutConfirm(true);

  const handleLogoutConfirm = async () => {
    try {
      // Clear local data immediately (fast operations)
      localStorage.removeItem('sensorData');
      localStorage.removeItem('savedWeights');
      localStorage.removeItem('savedAfterWeights');
      localStorage.removeItem('dryingStatus');
      localStorage.removeItem('dryingStartTime');
      localStorage.removeItem('targetMoisture');
      localStorage.removeItem('targetTemperature');
      
      // Navigate to login immediately (fast operation)
      navigate('/login');
      
      // Call auth logout in background (don't wait for it)
      authService.logout().catch((error) => {
        console.warn('Background auth logout failed:', error);
      });
      
      console.log('Logout initiated - local data cleared, navigating to login');
    } catch (error) {
      console.error('Logout error:', error);
      // Always navigate to login even if there's an error
      navigate('/login');
    }
  };

  const handleLogoutCancel = () => setShowLogoutConfirm(false);

  // Toast notification function
  const showToast = (message, type = 'info') => {
    const colors = {
      success: '#10b981',
      error: '#ef4444',
      warning: '#f59e0b',
      info: '#3b82f6'
    };
    
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) scale(0.8);
      background: ${colors[type] || colors.info};
      color: white;
      padding: 16px 24px;
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.25);
      z-index: 9999;
      font-weight: 500;
      min-width: 300px;
      max-width: 500px;
      text-align: center;
      transition: all 0.3s ease-in-out;
      backdrop-filter: blur(10px);
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
      toast.style.transform = 'translate(-50%, -50%) scale(1)';
    }, 100);
    
    // Remove after delay
    setTimeout(() => {
      toast.style.transform = 'translate(-50%, -50%) scale(0.8)';
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  };

  const handleDownloadExcel = () => {
    if (selectedRecords.length === 0) {
      showToast('Please select records to export', 'warning');
      return;
    }

    const selectedData = historyData.filter(item => selectedRecords.includes(item.id));
    
    // Process data with PHT time conversion and enhanced formatting
    const processedData = selectedData.map(item => {
      // Convert times to PHT 12-hour format
      const convertToPHT = (timeStr) => {
        if (!timeStr || timeStr === 'N/A' || timeStr === '—') return timeStr;
        try {
          const date = new Date(item.date + ' ' + timeStr);
          return date.toLocaleTimeString('en-PH', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
            timeZone: 'Asia/Manila'
          });
        } catch (error) {
          return timeStr;
        }
      };
      
      return {
        'ID': item.id,
        'Date': item.date,
        'Start Time (PHT)': convertToPHT(item.startTime),
        'End Time (PHT)': convertToPHT(item.endTime),
        'Duration': item.duration || '—',
        'Status': item.status,
        'Completion Status': parseFloat(item.moistureavg) <= 14 ? 'Target Reached' : 'Manual Stop',
        'Temperature (°C)': item.temperature,
        'Humidity (%)': item.humidity,
        'Initial Moisture T1 (%)': item.initialMoistureT1,
        'Initial Moisture T2 (%)': item.initialMoistureT2,
        'Initial Moisture T3 (%)': item.initialMoistureT3,
        'Initial Moisture T4 (%)': item.initialMoistureT4,
        'Initial Moisture T5 (%)': item.initialMoistureT5,
        'Initial Moisture T6 (%)': item.initialMoistureT6,
        'Final Moisture T1 (%)': item.finalMoistureT1,
        'Final Moisture T2 (%)': item.finalMoistureT2,
        'Final Moisture T3 (%)': item.finalMoistureT3,
        'Final Moisture T4 (%)': item.finalMoistureT4,
        'Final Moisture T5 (%)': item.finalMoistureT5,
        'Final Moisture T6 (%)': item.finalMoistureT6,
        'Final Moisture AVG (%)': item.moistureavg,
        'Before Weight T1 (kg)': item.beforeWeightT1,
        'Before Weight T2 (kg)': item.beforeWeightT2,
        'Before Weight T3 (kg)': item.beforeWeightT3,
        'Before Weight T4 (kg)': item.beforeWeightT4,
        'Before Weight T5 (kg)': item.beforeWeightT5,
        'Before Weight T6 (kg)': item.beforeWeightT6,
        'After Weight T1 (kg)': item.afterWeightT1,
        'After Weight T2 (kg)': item.afterWeightT2,
        'After Weight T3 (kg)': item.afterWeightT3,
        'After Weight T4 (kg)': item.afterWeightT4,
        'After Weight T5 (kg)': item.afterWeightT5,
        'After Weight T6 (kg)': item.afterWeightT6
      };
    });

    // Create workbook with multiple sheets
    const workbook = XLSX.utils.book_new();
    
    // Add main data sheet
    const worksheet = XLSX.utils.json_to_sheet(processedData);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'History Data');

    // Add comparison sheet if 2 or more records selected
    if (selectedData.length >= 2) {
      // Calculate comparison data
      const comparisonData = [];

      // Moisture T1-T6 comparison
      for (let i = 1; i <= 6; i++) {
        const moisture1 = parseFloat(selectedData[0][`initialMoistureT${i}`]) || 0;
        const moisture2 = parseFloat(selectedData[1][`initialMoistureT${i}`]) || 0;
        const diff = moisture2 - moisture1;
        const changePercent = moisture1 !== 0 ? ((diff / moisture1) * 100) : 0;
        
        comparisonData.push({
          'Metric': `Moisture T${i} (%)`,
          'Record 1': moisture1.toFixed(2),
          'Record 2': moisture2.toFixed(2),
          'Difference': diff.toFixed(2),
          'Change %': changePercent.toFixed(2)
        });
      }

      // Temperature comparison
      const temp1 = parseFloat(selectedData[0].temperature) || 0;
      const temp2 = parseFloat(selectedData[1].temperature) || 0;
      const tempDiff = temp2 - temp1;
      const tempChangePercent = temp1 !== 0 ? ((tempDiff / temp1) * 100) : 0;
      
      comparisonData.push({
        'Metric': 'Temperature (°C)',
        'Record 1': temp1.toFixed(2),
        'Record 2': temp2.toFixed(2),
        'Difference': tempDiff.toFixed(2),
        'Change %': tempChangePercent.toFixed(2)
      });

      // Humidity comparison
      const humidity1 = parseFloat(selectedData[0].humidity) || 0;
      const humidity2 = parseFloat(selectedData[1].humidity) || 0;
      const humidityDiff = humidity2 - humidity1;
      const humidityChangePercent = humidity1 !== 0 ? ((humidityDiff / humidity1) * 100) : 0;
      
      comparisonData.push({
        'Metric': 'Humidity (%)',
        'Record 1': humidity1.toFixed(2),
        'Record 2': humidity2.toFixed(2),
        'Difference': humidityDiff.toFixed(2),
        'Change %': humidityChangePercent.toFixed(2)
      });

      // Weight comparison
      const weightBefore1 = parseFloat(selectedData[0].beforeWeightT1) || 0;
      const weightBefore2 = parseFloat(selectedData[1].beforeWeightT1) || 0;
      const weightAfter1 = parseFloat(selectedData[0].afterWeightT1) || 0;
      const weightAfter2 = parseFloat(selectedData[1].afterWeightT1) || 0;
      const weightLoss1 = weightBefore1 - weightAfter1;
      const weightLoss2 = weightBefore2 - weightAfter2;
      const weightLossDiff = weightLoss2 - weightLoss1;
      const weightLossChangePercent = weightLoss1 !== 0 ? ((weightLossDiff / weightLoss1) * 100) : 0;
      
      comparisonData.push({
        'Metric': 'Weight Loss (kg)',
        'Record 1': weightLoss1.toFixed(2),
        'Record 2': weightLoss2.toFixed(2),
        'Difference': weightLossDiff.toFixed(2),
        'Change %': weightLossChangePercent.toFixed(2)
      });

      // Add comparison sheet to workbook
      const comparisonWorksheet = XLSX.utils.json_to_sheet(comparisonData);
      XLSX.utils.book_append_sheet(workbook, comparisonWorksheet, 'Comparison Data');

      // Add statistical summary sheet
      const statsData = [];

      // Calculate statistics for all selected records
      const calculateStats = (values) => {
        const nums = values.filter(v => !isNaN(v) && v !== null);
        if (nums.length === 0) return { min: 0, max: 0, avg: 0, median: 0 };
        
        nums.sort((a, b) => a - b);
        const min = nums[0];
        const max = nums[nums.length - 1];
        const avg = nums.reduce((sum, val) => sum + val, 0) / nums.length;
        const median = nums.length % 2 === 0 
          ? (nums[nums.length / 2 - 1] + nums[nums.length / 2]) / 2 
          : nums[Math.floor(nums.length / 2)];
        
        return { min: min.toFixed(2), max: max.toFixed(2), avg: avg.toFixed(2), median: median.toFixed(2) };
      };

      // Moisture statistics
      for (let i = 1; i <= 6; i++) {
        const moistureValues = selectedData.map(item => parseFloat(item[`initialMoistureT${i}`]) || 0);
        const stats = calculateStats(moistureValues);
        
        statsData.push({
          'Parameter': `Moisture T${i}`,
          'Average': stats.avg,
          'Minimum': stats.min,
          'Maximum': stats.max,
          'Median': stats.median
        });
      }

      // Temperature statistics
      const tempValues = selectedData.map(item => parseFloat(item.temperature) || 0);
      const tempStats = calculateStats(tempValues);
      statsData.push({
        'Parameter': 'Temperature',
        'Average': tempStats.avg,
        'Minimum': tempStats.min,
        'Maximum': tempStats.max,
        'Median': tempStats.median
      });

      // Humidity statistics
      const humidityValues = selectedData.map(item => parseFloat(item.humidity) || 0);
      const humidityStats = calculateStats(humidityValues);
      statsData.push({
        'Parameter': 'Humidity',
        'Average': humidityStats.avg,
        'Minimum': humidityStats.min,
        'Maximum': humidityStats.max,
        'Median': humidityStats.median
      });

      // Weight loss statistics
      const weightLossValues = selectedData.map(item => {
        const before = parseFloat(item.beforeWeightT1) || 0;
        const after = parseFloat(item.afterWeightT1) || 0;
        return before - after;
      });
      const weightLossStats = calculateStats(weightLossValues);
      statsData.push({
        'Parameter': 'Weight Loss',
        'Average': weightLossStats.avg,
        'Minimum': weightLossStats.min,
        'Maximum': weightLossStats.max,
        'Median': weightLossStats.median
      });

      // Add statistics sheet to workbook
      const statsWorksheet = XLSX.utils.json_to_sheet(statsData);
      XLSX.utils.book_append_sheet(workbook, statsWorksheet, 'Statistical Summary');
    }
    
    XLSX.writeFile(workbook, `MALA_history_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleExportGraph = () => {
    if (selectedRecords.length === 0) {
      showToast('Please select records to export graph', 'warning');
      return;
    }

    // Create PDF
    const pdf = new jsPDF();
    
    // Add title
    pdf.setFontSize(16);
    pdf.text('MALA Multi-Sensor Analysis Report', pdf.internal.pageSize.width / 2, 20, { align: 'center' });
    
    // Add date range
    const selectedData = historyData.filter(item => selectedRecords.includes(item.id));
    if (selectedData.length > 0) {
      const startDate = selectedData[0].date;
      const endDate = selectedData[selectedData.length - 1].date;
      pdf.setFontSize(10);
      pdf.text(`Period: ${startDate} - ${endDate}`, pdf.internal.pageSize.width / 2, 30, { align: 'center' });
    }

    // Create Temperature Graph (Single Line)
    const createTemperatureGraph = (y, item) => {
      const graphWidth = 160;
      const graphHeight = 70;
      const graphX = 25;
      const graphY = y;
      
      // Draw axes
      pdf.setLineWidth(0.5);
      pdf.line(graphX, graphY + graphHeight, graphX + graphWidth, graphY + graphHeight);
      pdf.line(graphX, graphY, graphX, graphY + graphHeight);
      
      // Get temperature value and create time series data
      const temp = parseFloat(item.temperature) || 0;
      const startTime = item.startTime || 'N/A';
      const endTime = item.endTime || 'N/A';
      
      // Create time points for x-axis
      const timePoints = [];
      if (startTime !== 'N/A' && endTime !== 'N/A') {
        timePoints.push('Start');
        timePoints.push('During');
        timePoints.push('End');
      }
      
      // Draw horizontal line at temperature value
      const normalizedTemp = Math.min(temp / 60, 1); // Max 60°C
      const tempY = graphY + graphHeight - (normalizedTemp * graphHeight);
      
      pdf.setDrawColor(239, 185, 68); // #efb944ff
      pdf.setLineWidth(2);
      pdf.line(graphX, tempY, graphX + graphWidth, tempY);
      
      // Add x-axis labels (time)
      pdf.setFontSize(6);
      pdf.setTextColor(0, 0, 0);
      if (timePoints.length > 0) {
        pdf.text('Start', graphX, graphY + graphHeight + 8);
        pdf.text('During', graphX + graphWidth/2 - 12, graphY + graphHeight + 8);
        pdf.text('End', graphX + graphWidth - 8, graphY + graphHeight + 8);
      }
      
      // Add y-axis labels (temperature)
      pdf.setFontSize(6);
      pdf.text('60°C', graphX - 15, graphY);
      pdf.text('30°C', graphX - 15, graphY + graphHeight/2);
      pdf.text('0°C', graphX - 15, graphY + graphHeight);
      
      // Add axis titles
      pdf.setFontSize(8);
      pdf.text('Time', graphX + graphWidth/2, graphY + graphHeight + 15, { align: 'center' });
      pdf.text('Temperature (°C)', graphX - 20, graphY + graphHeight/2, { align: 'center', angle: 90 });
      
      // Add current value label
      pdf.setFontSize(7);
      pdf.text(`${temp.toFixed(1)}°C`, graphX + graphWidth + 5, tempY + 2);
    };

    // Create Humidity Graph (Single Line)
    const createHumidityGraph = (y, item) => {
      const graphWidth = 160;
      const graphHeight = 70;
      const graphX = 25;
      const graphY = y;
      
      // Draw axes
      pdf.setLineWidth(0.5);
      pdf.line(graphX, graphY + graphHeight, graphX + graphWidth, graphY + graphHeight);
      pdf.line(graphX, graphY, graphX, graphY + graphHeight);
      
      // Get humidity value
      const humidity = parseFloat(item.humidity) || 0;
      
      // Create time points for x-axis
      const timePoints = [];
      if (item.startTime !== 'N/A' && item.endTime !== 'N/A') {
        timePoints.push('Start');
        timePoints.push('During');
        timePoints.push('End');
      }
      
      // Draw horizontal line at humidity value
      const normalizedHumidity = humidity / 100; // Max 100%
      const humidityY = graphY + graphHeight - (normalizedHumidity * graphHeight);
      
      pdf.setDrawColor(59, 130, 246); // #3b82f6
      pdf.setLineWidth(2);
      pdf.line(graphX, humidityY, graphX + graphWidth, humidityY);
      
      // Add x-axis labels (time)
      pdf.setFontSize(6);
      pdf.setTextColor(0, 0, 0);
      if (timePoints.length > 0) {
        pdf.text('Start', graphX, graphY + graphHeight + 8);
        pdf.text('During', graphX + graphWidth/2 - 12, graphY + graphHeight + 8);
        pdf.text('End', graphX + graphWidth - 8, graphY + graphHeight + 8);
      }
      
      // Add y-axis labels (humidity)
      pdf.setFontSize(6);
      pdf.text('100%', graphX - 12, graphY);
      pdf.text('50%', graphX - 12, graphY + graphHeight/2);
      pdf.text('0%', graphX - 12, graphY + graphHeight);
      
      // Add axis titles
      pdf.setFontSize(8);
      pdf.text('Time', graphX + graphWidth/2, graphY + graphHeight + 15, { align: 'center' });
      pdf.text('Humidity (%)', graphX - 20, graphY + graphHeight/2, { align: 'center', angle: 90 });
      
      // Add current value label
      pdf.setFontSize(7);
      pdf.text(`${humidity.toFixed(1)}%`, graphX + graphWidth + 5, humidityY + 2);
    };

    // Create Moisture Graph (Multi-Line for 6 sensors)
    const createMoistureGraph = (y, item) => {
      const graphWidth = 160;
      const graphHeight = 70;
      const graphX = 25;
      const graphY = y;
      
      // Draw axes
      pdf.setLineWidth(0.5);
      pdf.line(graphX, graphY + graphHeight, graphX + graphWidth, graphY + graphHeight);
      pdf.line(graphX, graphY, graphX, graphY + graphHeight);
      
      // Moisture sensor colors (from Analytics.jsx)
      const colors = ['#22c55e', '#16a34a', '#15803d', '#166534', '#14532d', '#052e16'];
      
      // Get moisture values for all 6 trays
      const moistureValues = [
        parseFloat(item.initialMoistureT1) || 0,
        parseFloat(item.initialMoistureT2) || 0,
        parseFloat(item.initialMoistureT3) || 0,
        parseFloat(item.initialMoistureT4) || 0,
        parseFloat(item.initialMoistureT5) || 0,
        parseFloat(item.initialMoistureT6) || 0
      ];
      
      // Create time points for x-axis
      const timePoints = [];
      if (item.startTime !== 'N/A' && item.endTime !== 'N/A') {
        timePoints.push('Start');
        timePoints.push('During');
        timePoints.push('End');
      }
      
      // Draw lines for each moisture sensor
      moistureValues.forEach((moisture, index) => {
        if (moisture > 0) {
          const normalizedMoisture = Math.min(moisture / 30, 1); // Max 30%
          const moistureY = graphY + graphHeight - (normalizedMoisture * graphHeight);
          
          pdf.setDrawColor(colors[index]);
          pdf.setLineWidth(1.5);
          pdf.line(graphX, moistureY, graphX + graphWidth, moistureY);
          
          // Add sensor label on the right side
          pdf.setFontSize(5);
          pdf.text(`T${index + 1}`, graphX + graphWidth + 3, moistureY + 2);
        }
      });
      
      // Add x-axis labels (time)
      pdf.setFontSize(6);
      pdf.setTextColor(0, 0, 0);
      if (timePoints.length > 0) {
        pdf.text('Start', graphX, graphY + graphHeight + 8);
        pdf.text('During', graphX + graphWidth/2 - 12, graphY + graphHeight + 8);
        pdf.text('End', graphX + graphWidth - 8, graphY + graphHeight + 8);
      }
      
      // Add y-axis labels (moisture)
      pdf.setFontSize(6);
      pdf.text('30%', graphX - 10, graphY);
      pdf.text('15%', graphX - 10, graphY + graphHeight/2);
      pdf.text('0%', graphX - 10, graphY + graphHeight);
      
      // Add axis titles
      pdf.setFontSize(8);
      pdf.text('Time', graphX + graphWidth/2, graphY + graphHeight + 15, { align: 'center' });
      pdf.text('Moisture (%)', graphX - 20, graphY + graphHeight/2, { align: 'center', angle: 90 });
      
      // Add legend
      pdf.setFontSize(5);
      moistureValues.forEach((moisture, index) => {
        if (moisture > 0) {
          pdf.setDrawColor(colors[index]);
          pdf.setFillColor(colors[index]);
          pdf.rect(graphX + graphWidth + 15, graphY + index * 6, 3, 2, 'F');
          pdf.setTextColor(0, 0, 0);
          pdf.text(`T${index + 1}: ${moisture.toFixed(1)}%`, graphX + graphWidth + 20, graphY + index * 6 + 2);
        }
      });
    };

    // Create Weight Graph (Grouped Bar Chart)
    const createWeightGraph = (y, item) => {
      const graphWidth = 160;
      const graphHeight = 70;
      const graphX = 25;
      const graphY = y;
      
      // Draw axes
      pdf.setLineWidth(0.5);
      pdf.line(graphX, graphY + graphHeight, graphX + graphWidth, graphY + graphHeight);
      pdf.line(graphX, graphY, graphX, graphY + graphHeight);
      
      // Get weight values
      const beforeWeight = parseFloat(item.beforeWeightT1) || 0;
      const afterWeight = parseFloat(item.afterWeightT1) || 0;
      const maxWeight = Math.max(beforeWeight, afterWeight, 100);
      
      // Create time points for x-axis
      const timePoints = [];
      if (item.startTime !== 'N/A' && item.endTime !== 'N/A') {
        timePoints.push('Start');
        timePoints.push('During');
        timePoints.push('End');
      }
      
      // Bar dimensions - adjusted for better spacing
      const barWidth = 20;
      const barSpacing = 30;
      const startX = graphX + 40;
      
      // Draw before weight bar
      const beforeHeight = (beforeWeight / maxWeight) * graphHeight;
      const beforeY = graphY + graphHeight - beforeHeight;
      pdf.setFillColor(59, 130, 246); // #3b82f6
      pdf.rect(startX, beforeY, barWidth, beforeHeight, 'F');
      
      // Draw after weight bar
      const afterHeight = (afterWeight / maxWeight) * graphHeight;
      const afterY = graphY + graphHeight - afterHeight;
      pdf.setFillColor(239, 68, 68); // #ef4444
      pdf.rect(startX + barSpacing, afterY, barWidth, afterHeight, 'F');
      
      // Add value labels on top of bars
      pdf.setFontSize(6);
      pdf.setTextColor(0, 0, 0);
      pdf.text(`${beforeWeight.toFixed(1)}kg`, startX + barWidth/2 - 10, beforeY - 2);
      pdf.text(`${afterWeight.toFixed(1)}kg`, startX + barSpacing + barWidth/2 - 10, afterY - 2);
      
      // Add x-axis labels (time)
      pdf.setFontSize(6);
      if (timePoints.length > 0) {
        pdf.text('Start', graphX, graphY + graphHeight + 8);
        pdf.text('During', graphX + graphWidth/2 - 12, graphY + graphHeight + 8);
        pdf.text('End', graphX + graphWidth - 8, graphY + graphHeight + 8);
      }
      
      // Add y-axis labels (weight)
      pdf.setFontSize(6);
      pdf.text(`${maxWeight.toFixed(0)}kg`, graphX - 18, graphY);
      pdf.text(`${(maxWeight/2).toFixed(0)}kg`, graphX - 18, graphY + graphHeight/2);
      pdf.text('0kg', graphX - 12, graphY + graphHeight);
      
      // Add axis titles
      pdf.setFontSize(8);
      pdf.text('Time', graphX + graphWidth/2, graphY + graphHeight + 15, { align: 'center' });
      pdf.text('Weight (kg)', graphX - 20, graphY + graphHeight/2, { align: 'center', angle: 90 });
      
      // Add legend
      pdf.setFillColor(59, 130, 246);
      pdf.rect(startX + 70, graphY, 4, 4, 'F');
      pdf.text('Before', startX + 76, graphY + 3);
      
      pdf.setFillColor(239, 68, 68);
      pdf.rect(startX + 70, graphY + 8, 4, 4, 'F');
      pdf.text('After', startX + 76, graphY + 11);
    };

    // Add graphs for each selected record
    selectedData.forEach((item, index) => {
      // Add new page for each record
      if (index > 0) {
        pdf.addPage();
      }
      
      let currentY = 20;
      
      // Record header
      pdf.setFontSize(14);
      pdf.text(`Record ${index + 1}: ${item.date} - ${item.status}`, pdf.internal.pageSize.width / 2, currentY, { align: 'center' });
      currentY += 20;
      
      // Temperature Graph - Page 1
      pdf.setFontSize(12);
      pdf.text('Temperature Analysis', pdf.internal.pageSize.width / 2, currentY, { align: 'center' });
      currentY += 10;
      createTemperatureGraph(currentY, item);
      
      // Add new page for Humidity
      pdf.addPage();
      currentY = 20;
      
      // Record header on new page
      pdf.setFontSize(12);
      pdf.text(`Record ${index + 1}: ${item.date} - ${item.status}`, pdf.internal.pageSize.width / 2, currentY, { align: 'center' });
      currentY += 20;
      
      // Humidity Graph - Page 2
      pdf.setFontSize(12);
      pdf.text('Humidity Analysis', pdf.internal.pageSize.width / 2, currentY, { align: 'center' });
      currentY += 10;
      createHumidityGraph(currentY, item);
      
      // Add new page for Moisture
      pdf.addPage();
      currentY = 20;
      
      // Record header on new page
      pdf.setFontSize(12);
      pdf.text(`Record ${index + 1}: ${item.date} - ${item.status}`, pdf.internal.pageSize.width / 2, currentY, { align: 'center' });
      currentY += 20;
      
      // Moisture Graph - Page 3
      pdf.setFontSize(12);
      pdf.text('Moisture Content Analysis', pdf.internal.pageSize.width / 2, currentY, { align: 'center' });
      currentY += 10;
      createMoistureGraph(currentY, item);
      
      // Add new page for Weight
      pdf.addPage();
      currentY = 20;
      
      // Record header on new page
      pdf.setFontSize(12);
      pdf.text(`Record ${index + 1}: ${item.date} - ${item.status}`, pdf.internal.pageSize.width / 2, currentY, { align: 'center' });
      currentY += 20;
      
      // Weight Graph - Page 4
      pdf.setFontSize(12);
      pdf.text('Weight Analysis', pdf.internal.pageSize.width / 2, currentY, { align: 'center' });
      currentY += 10;
      createWeightGraph(currentY, item);
      currentY += 80;
      
    });

    // Add comparison pages if 2 or more records selected
    if (selectedData.length >= 2) {
      // Add comparison page
      pdf.addPage();
      let currentY = 20;
      
      pdf.setFontSize(16);
      pdf.text('Comparison Analysis', pdf.internal.pageSize.width / 2, currentY, { align: 'center' });
      currentY += 20;
      
      pdf.setFontSize(12);
      pdf.text('Record 1 vs Record 2', pdf.internal.pageSize.width / 2, currentY, { align: 'center' });
      currentY += 20;
      
      // Moisture comparison table
      pdf.setFontSize(10);
      pdf.text('Moisture Content Comparison:', 15, currentY);
      currentY += 10;
      
      // Table headers
      pdf.setFontSize(8);
      pdf.text('Tray', 15, currentY);
      pdf.text('Record 1 (%)', 40, currentY);
      pdf.text('Record 2 (%)', 80, currentY);
      pdf.text('Difference', 120, currentY);
      currentY += 8;
      
      // Moisture data rows
      for (let i = 1; i <= 6; i++) {
        const moisture1 = parseFloat(selectedData[0][`initialMoistureT${i}`]) || 0;
        const moisture2 = parseFloat(selectedData[1][`initialMoistureT${i}`]) || 0;
        const diff = moisture2 - moisture1;
        
        pdf.text(`T${i}`, 15, currentY);
        pdf.text(moisture1.toFixed(2), 40, currentY);
        pdf.text(moisture2.toFixed(2), 80, currentY);
        pdf.text(diff.toFixed(2), 120, currentY);
        currentY += 8;
      }
      
      currentY += 15;
      
      // Temperature and Humidity comparison
      pdf.setFontSize(10);
      pdf.text('Environmental Conditions:', 15, currentY);
      currentY += 10;
      
      // Temperature comparison
      const temp1 = parseFloat(selectedData[0].temperature) || 0;
      const temp2 = parseFloat(selectedData[1].temperature) || 0;
      const tempDiff = temp2 - temp1;
      
      pdf.setFontSize(8);
      pdf.text('Temperature:', 15, currentY);
      pdf.text(`${temp1.toFixed(1)}°C`, 40, currentY);
      pdf.text(`${temp2.toFixed(1)}°C`, 80, currentY);
      pdf.text(`${tempDiff.toFixed(1)}°C`, 120, currentY);
      currentY += 10;
      
      // Humidity comparison
      const humidity1 = parseFloat(selectedData[0].humidity) || 0;
      const humidity2 = parseFloat(selectedData[1].humidity) || 0;
      const humidityDiff = humidity2 - humidity1;
      
      pdf.text('Humidity:', 15, currentY);
      pdf.text(`${humidity1.toFixed(1)}%`, 40, currentY);
      pdf.text(`${humidity2.toFixed(1)}%`, 80, currentY);
      pdf.text(`${humidityDiff.toFixed(1)}%`, 120, currentY);
      currentY += 15;
      
      // Weight comparison
      pdf.setFontSize(10);
      pdf.text('Weight Loss Comparison:', 15, currentY);
      currentY += 10;
      
      const weightBefore1 = parseFloat(selectedData[0].beforeWeightT1) || 0;
      const weightBefore2 = parseFloat(selectedData[1].beforeWeightT1) || 0;
      const weightAfter1 = parseFloat(selectedData[0].afterWeightT1) || 0;
      const weightAfter2 = parseFloat(selectedData[1].afterWeightT1) || 0;
      const weightLoss1 = weightBefore1 - weightAfter1;
      const weightLoss2 = weightBefore2 - weightAfter2;
      const weightLossDiff = weightLoss2 - weightLoss1;
      
      pdf.setFontSize(8);
      pdf.text('Weight Loss:', 15, currentY);
      pdf.text(`${weightLoss1.toFixed(2)}kg`, 40, currentY);
      pdf.text(`${weightLoss2.toFixed(2)}kg`, 80, currentY);
      pdf.text(`${weightLossDiff.toFixed(2)}kg`, 120, currentY);
      
      // Add statistical summary page
      if (selectedData.length > 2) {
        pdf.addPage();
        currentY = 20;
        
        pdf.setFontSize(16);
        pdf.text('Statistical Summary', pdf.internal.pageSize.width / 2, currentY, { align: 'center' });
        currentY += 20;
        
        pdf.setFontSize(10);
        pdf.text(`Analysis of ${selectedData.length} Records`, pdf.internal.pageSize.width / 2, currentY, { align: 'center' });
        currentY += 30;
        
        // Calculate statistics
        const calculateStats = (values) => {
          const nums = values.filter(v => !isNaN(v) && v !== null);
          if (nums.length === 0) return { min: 0, max: 0, avg: 0, median: 0 };
          
          nums.sort((a, b) => a - b);
          const min = nums[0];
          const max = nums[nums.length - 1];
          const avg = nums.reduce((sum, val) => sum + val, 0) / nums.length;
          const median = nums.length % 2 === 0 
            ? (nums[nums.length / 2 - 1] + nums[nums.length / 2]) / 2 
            : nums[Math.floor(nums.length / 2)];
          
          return { min: min.toFixed(2), max: max.toFixed(2), avg: avg.toFixed(2), median: median.toFixed(2) };
        };
        
        // Moisture statistics
        pdf.setFontSize(10);
        pdf.text('Moisture Content Statistics:', 15, currentY);
        currentY += 10;
        
        pdf.setFontSize(8);
        pdf.text('Tray', 15, currentY);
        pdf.text('Avg (%)', 40, currentY);
        pdf.text('Min (%)', 70, currentY);
        pdf.text('Max (%)', 100, currentY);
        pdf.text('Median (%)', 130, currentY);
        currentY += 8;
        
        for (let i = 1; i <= 6; i++) {
          const moistureValues = selectedData.map(item => parseFloat(item[`initialMoistureT${i}`]) || 0);
          const stats = calculateStats(moistureValues);
          
          pdf.text(`T${i}`, 15, currentY);
          pdf.text(stats.avg, 40, currentY);
          pdf.text(stats.min, 70, currentY);
          pdf.text(stats.max, 100, currentY);
          pdf.text(stats.median, 130, currentY);
          currentY += 8;
        }
        
        currentY += 15;
        
        // Temperature and Humidity statistics
        pdf.setFontSize(10);
        pdf.text('Environmental Statistics:', 15, currentY);
        currentY += 10;
        
        const tempValues = selectedData.map(item => parseFloat(item.temperature) || 0);
        const tempStats = calculateStats(tempValues);
        
        const humidityValues = selectedData.map(item => parseFloat(item.humidity) || 0);
        const humidityStats = calculateStats(humidityValues);
        
        pdf.setFontSize(8);
        pdf.text('Temperature', 15, currentY);
        pdf.text(`${tempStats.avg}°C`, 40, currentY);
        pdf.text(`${tempStats.min}°C`, 70, currentY);
        pdf.text(`${tempStats.max}°C`, 100, currentY);
        pdf.text(`${tempStats.median}°C`, 130, currentY);
        currentY += 10;
        
        pdf.text('Humidity', 15, currentY);
        pdf.text(`${humidityStats.avg}%`, 40, currentY);
        pdf.text(`${humidityStats.min}%`, 70, currentY);
        pdf.text(`${humidityStats.max}%`, 100, currentY);
        pdf.text(`${humidityStats.median}%`, 130, currentY);
      }
    }

    // Save PDF
    pdf.save(`MALA_drying_analysis_${new Date().toISOString().split('T')[0]}_${selectedRecords.length}_records.pdf`);
  };

  const handleDelete = () => {
    if (selectedRecords.length === 0) {
      showToast('Please select records to delete', 'warning');
      return;
    }

    // Show confirmation dialog with more details
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required. Please login again.');
      }
      
      // Show loading state
      const deleteButton = document.querySelector('.modal-button.confirm.delete');
      if (deleteButton) {
        deleteButton.textContent = 'Deleting...';
        deleteButton.disabled = true;
      }
      
      // Delete selected records from MongoDB
      const deletePromises = selectedRecords.map(recordId => 
        fetch(`${API_URL}/api/sensor/history/${recordId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000 // 10 second timeout
        }).then(response => {
          if (!response.ok) {
            if (response.status === 404) {
              throw new Error(`Record ${recordId} not found. It may have been already deleted.`);
            } else if (response.status === 500) {
              throw new Error(`Server error when deleting record ${recordId}. Please try again.`);
            } else {
              throw new Error(`Failed to delete record ${recordId}: ${response.status}`);
            }
          }
          return response.json();
        }).catch(error => {
          // Handle network errors specifically
          if (error.name === 'TypeError' || error.message.includes('Failed to fetch')) {
            throw new Error(`Network error when deleting record ${recordId}. Please check your connection and try again.`);
          }
          throw error;
        })
      );
      
      const results = await Promise.all(deletePromises);
      console.log('Delete results:', results);
      
      // Check if all deletions were successful
      const failedDeletes = results.filter(result => !result.success);
      
      if (failedDeletes.length > 0) {
        throw new Error(`${failedDeletes.length} records failed to delete`);
      }
      
      // Refresh history data from MongoDB
      const response = await fetch(`${API_URL}/api/sensor/history`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }).catch(error => {
        if (error.name === 'TypeError' || error.message.includes('Failed to fetch')) {
          throw new Error('Network error when refreshing data. Please check your connection.');
        }
        throw error;
      });
      
      if (!response.ok) {
        throw new Error('Failed to refresh data after deletion');
      }
      
      const result = await response.json();
      let sensorData = [];
      if (result.success && result.data) {
        sensorData = result.data;
      } else if (Array.isArray(result)) {
        sensorData = result;
      }
      
      // Reformat data (same logic as initial fetch)
      const safeToString = (value, fallback = 'N/A') =>
        value !== undefined && value !== null ? value.toString() : fallback;

      // Helper function to format numbers with 2 decimal places
      const formatNumber = (value) => {
        const num = parseFloat(value);
        return isNaN(num) ? 'N/A' : num.toFixed(2);
      };
      
      const formattedData = sensorData.map((item, index) => ({
        id: item._id || item.id || index + 1,
        date: item.date || 'N/A',
        startTime: item.startTime || 'N/A',
        endTime: item.endTime || '—',
        initialMoistureT1: formatNumber(item.moisture1),
        initialMoistureT2: formatNumber(item.moisture2),
        initialMoistureT3: formatNumber(item.moisture3),
        initialMoistureT4: formatNumber(item.moisture4),
        initialMoistureT5: formatNumber(item.moisture5),
        initialMoistureT6: formatNumber(item.moisture6),
        // Final Moisture per tray (T1–T6) - use direct moisture fields from drying session
        finalMoistureT1: formatNumber(item.moisture1),
        finalMoistureT2: formatNumber(item.moisture2),
        finalMoistureT3: formatNumber(item.moisture3),
        finalMoistureT4: formatNumber(item.moisture4),
        finalMoistureT5: formatNumber(item.moisture5),
        finalMoistureT6: formatNumber(item.moisture6),
        moistureavg: formatNumber(item.moistureavg),
        temperature: formatNumber(item.temperature),
        humidity: formatNumber(item.humidity),
        beforeWeightT1: formatNumber(item.weight1_t1 ?? item.weight1),
        beforeWeightT2: formatNumber(item.weight1_t2 ?? item.weight1),
        beforeWeightT3: formatNumber(item.weight1_t3 ?? item.weight1),
        beforeWeightT4: formatNumber(item.weight1_t4 ?? item.weight1),
        beforeWeightT5: formatNumber(item.weight1_t5 ?? item.weight1),
        beforeWeightT6: formatNumber(item.weight1_t6 ?? item.weight1),
        afterWeightT1: formatNumber(item.weight2_t1 ?? item.weight2),
        afterWeightT2: formatNumber(item.weight2_t2 ?? item.weight2),
        afterWeightT3: formatNumber(item.weight2_t3 ?? item.weight2),
        afterWeightT4: formatNumber(item.weight2_t4 ?? item.weight2),
        afterWeightT5: formatNumber(item.weight2_t5 ?? item.weight2),
        afterWeightT6: formatNumber(item.weight2_t6 ?? item.weight2),
        status: item.status || 'Idle',
      }));
      
      setHistoryData(formattedData);
      setSelectedRecords([]);
      setShowDeleteConfirm(false);
      
      // Show success notification
      showToast(`Successfully deleted ${selectedRecords.length} record(s) from database`, 'success');
      
    } catch (error) {
      console.error('Delete error:', error);
      
      // Show error notification with more specific messaging
      showToast(error.message, 'error');
      
      // Reset button state
      const deleteButton = document.querySelector('.modal-button.confirm.delete');
      if (deleteButton) {
        deleteButton.textContent = 'Delete';
        deleteButton.disabled = false;
      }
    }
  };

  const handleDeleteCancel = () => setShowDeleteConfirm(false);

  const handleSave = () => {
    if (selectedRecords.length === 0) {
      showToast('Please select records to save', 'warning');
      return;
    }

    const selectedData = historyData.filter(item => selectedRecords.includes(item.id));
  
    // Save to localStorage
    const existingSaved = JSON.parse(localStorage.getItem('savedHistoryRecords') || '[]');
    const newSavedRecords = selectedData.filter(item => !existingSaved.some(saved => saved.id === item.id));
    const updatedSaved = [...existingSaved, ...newSavedRecords];
  
    localStorage.setItem('savedHistoryRecords', JSON.stringify(updatedSaved));
    setSavedRecords(updatedSaved.map(record => record.id));
  
    // Show success notification
    showToast(`Successfully saved ${selectedRecords.length} record(s)`, 'success');
  };

  const handleRecordSelect = (recordId) => {
    setSelectedRecords(prev => 
      prev.includes(recordId) 
        ? prev.filter(id => id !== recordId)
        : [...prev, recordId]
    );
  };

  const handleSelectAll = () => {
    if (selectedRecords.length === filteredData.length) {
      setSelectedRecords([]);
    } else {
      setSelectedRecords(filteredData.map(item => item.id));
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleToggleSavedOnly = () => {
    setShowSavedOnly(prev => !prev);
    setSelectedRecords([]);
  };

  const filteredData = historyData.filter(item => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = (
      item.date.toLowerCase().includes(searchLower) ||
      item.startTime.toLowerCase().includes(searchLower) ||
      item.endTime.toLowerCase().includes(searchLower) ||
      item.status.toLowerCase().includes(searchLower) ||
      item.moistureavg.toLowerCase().includes(searchLower)
    );
    
    const matchesSavedFilter = !showSavedOnly || savedRecords.includes(item.id);
    
    return matchesSearch && matchesSavedFilter;
  });

  return (
    <div className="dashboard-container">
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

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={handleDeleteCancel}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <Trash2 size={24} />
              <h3>Confirm Delete</h3>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete <strong>{selectedRecords.length}</strong> selected record(s)?</p>
              <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '8px' }}>This action will permanently remove the records from the MongoDB database and cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button className="modal-button cancel" onClick={handleDeleteCancel}>Cancel</button>
              <button className="modal-button confirm delete" onClick={handleDeleteConfirm}>Delete</button>
            </div>
          </div>
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
            <div className="history-header-actions">
              <input
                type="text"
                className="history-search-bar"
                placeholder="Search records..."
                value={searchTerm}
                onChange={handleSearch}
              />
              <button className="download-btn export-excel-btn" onClick={handleDownloadExcel}>Export Excel</button>
              <button className="download-btn export-graph-btn" onClick={handleExportGraph}>Export Graph</button>
              <button className="download-btn save-btn" onClick={handleSave}>Save</button>
              <button className={`download-btn saved-filter-btn ${showSavedOnly ? 'active' : ''}`} onClick={handleToggleSavedOnly}>
                <Bookmark size={14} style={{ marginRight: '4px' }} />
                {showSavedOnly ? 'Show All' : 'Saved Only'}
              </button>
              <button className="download-btn delete-btn" onClick={handleDelete}>Delete</button>
            </div>
          </div>
          <div className="table-wrapper">
            <table className="history-table">
              <thead>
                <tr>
                  <th rowSpan="2">
                    <input 
                      type="checkbox" 
                      checked={selectedRecords.length === filteredData.length && filteredData.length > 0}
                      onChange={handleSelectAll}
                      title="Select all records"
                    />
                  </th>
                  {/* ── Fixed columns ── */}
                  <th rowSpan="2">Date</th>
                  <th rowSpan="2">Starting Time</th>
                  <th rowSpan="2">End Time</th>
                  <th rowSpan="2" title="Auto-stopped when moisture reached 14%">Completion Status</th>

                  {/* ── Moisture groups ── */}
                  <th colSpan="6">Initial Moisture</th>
                  <th colSpan="7">Final Moisture</th>

                  {/* ── Env columns ── */}
                  <th rowSpan="2">Temperature</th>
                  <th rowSpan="2">Humidity</th>

                  {/* ── Weight groups ── */}
                  <th colSpan="6">Before Weight</th>
                  <th colSpan="6">After Weight</th>

                  <th rowSpan="2">Status</th>
                  <th rowSpan="2">Duration</th>
                </tr>
                <tr>
                  {/* Initial Moisture sub-headers */}
                  <th>T1</th><th>T2</th><th>T3</th><th>T4</th><th>T5</th><th>T6</th>
                  {/* Final Moisture sub-headers + AVG */}
                  <th>T1</th><th>T2</th><th>T3</th><th>T4</th><th>T5</th><th>T6</th><th>AVG</th>
                  {/* Before Weight sub-headers */}
                  <th>T1</th><th>T2</th><th>T3</th><th>T4</th><th>T5</th><th>T6</th>
                  {/* After Weight sub-headers */}
                  <th>T1</th><th>T2</th><th>T3</th><th>T4</th><th>T5</th><th>T6</th>
                </tr>
              </thead>

              <tbody>
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan="36" style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>
                      {searchTerm ? 'No records found matching your search.' : 'No history data available.'}
                    </td>
                  </tr>
                ) : (
                  filteredData.map((item) => {
                    // Determine completion status based on final moisture
                    const finalMoistureAvg = parseFloat(item.moistureavg);
                    const isTargetReached = finalMoistureAvg <= 14;
                    const isSelected = selectedRecords.includes(item.id);
                    const isSaved = savedRecords.includes(item.id);
                    
                    // Calculate duration
                    let duration = '—';
                    if (item.startTime !== 'N/A' && item.endTime !== '—') {
                      try {
                        const startDateTime = new Date(item.date + ' ' + item.startTime);
                        const endDateTime = new Date(item.date + ' ' + item.endTime);
                        if (!isNaN(startDateTime.getTime()) && !isNaN(endDateTime.getTime())) {
                          const diffMs = endDateTime.getTime() - startDateTime.getTime();
                          const hours = Math.floor(diffMs / (1000 * 60 * 60));
                          const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                          duration = `${hours}h ${minutes}m`;
                        }
                      } catch (error) {
                        console.warn('Duration calculation error:', error);
                      }
                    }
                    
                    return (
                      <tr key={item.id} className={isSelected ? 'selected-row' : ''}>
                        <td>
                          <input 
                            type="checkbox" 
                            checked={isSelected}
                            onChange={() => handleRecordSelect(item.id)}
                          />
                        </td>
                        {/* Fixed */}
                        <td>
                          {isSaved && <Bookmark size={14} color="#2563eb" style={{ marginRight: '4px' }} />}
                          {item.date}
                        </td>
                        <td>{item.startTime}</td>
                        <td>{item.endTime}</td>
                        <td>
                          <span 
                            style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: '600',
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
                        <td>{item.beforeWeightT1}</td>
                        <td>{item.beforeWeightT2}</td>
                        <td>{item.beforeWeightT3}</td>
                        <td>{item.beforeWeightT4}</td>
                        <td>{item.beforeWeightT5}</td>
                        <td>{item.beforeWeightT6}</td>

                        {/* After Weight */}
                        <td>{item.afterWeightT1}</td>
                        <td>{item.afterWeightT2}</td>
                        <td>{item.afterWeightT3}</td>
                        <td>{item.afterWeightT4}</td>
                        <td>{item.afterWeightT5}</td>
                        <td>{item.afterWeightT6}</td>

                        {/* Status */}
                        <td>
                          <span className={`status ${item.status.toLowerCase()}`}>
                            {item.status}
                          </span>
                        </td>
                        
                        {/* Duration */}
                        <td>
                          <span style={{ fontWeight: '500', color: '#374151' }}>
                            {duration}
                          </span>
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
};