// history

import { useState, useEffect, useRef } from 'react';
import { Activity, BarChart2, Bell, CircleUser, Clock, AlertTriangle, LogOut, ChevronDown, ChevronUp, User, HelpCircle, Settings, Download, Trash2 } from 'lucide-react';
import './Dashboard.css';
import './History.css';
import * as XLSX from 'xlsx';
import { useNavigate, useLocation } from 'react-router-dom';
import authService from '../../api/authService';
import dryerService from '../../api/dryerService';
import logo from "../../assets/images/logo2.png";
import useNotificationService from './Usenotificationservice.js';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecords, setSelectedRecords] = useState([]);
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

          const formattedData = sensorData.map((item, index) => {
            return {
              id: item._id || item.id || index + 1,

              // Date & Time - with proper error handling
              date: (() => {
                try {
                  // Try multiple possible date fields
                  const dateFields = [item.timestamp, item.startTime, item.createdAt, item.date];
                  for (const field of dateFields) {
                    if (field) {
                      const date = new Date(field);
                      if (!isNaN(date.getTime())) {
                        return date.toLocaleDateString('en-PH', {
                          month: '2-digit',
                          day: '2-digit',
                          year: 'numeric',
                        });
                      }
                    }
                  }
                  return 'N/A';
                } catch (error) {
                  console.warn('Invalid date field:', item.timestamp, error);
                  return 'N/A';
                }
              })(),
              
              startTime: (() => {
                try {
                  // Try multiple possible start time fields
                  const timeFields = [item.startTime, item.timestamp, item.createdAt];
                  for (const field of timeFields) {
                    if (field) {
                      const date = new Date(field);
                      if (!isNaN(date.getTime())) {
                        return date.toLocaleTimeString('en-PH', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true,
                      });
                      }
                    }
                  }
                  return 'N/A';
                } catch (error) {
                  console.warn('Invalid start time field:', item.startTime, error);
                  return 'N/A';
                }
              })(),
              
              endTime: (() => {
                try {
                  // Try multiple possible end time fields
                  const timeFields = [item.endTime, item.endTimestamp, item.completedAt];
                  for (const field of timeFields) {
                    if (field) {
                      const date = new Date(field);
                      if (!isNaN(date.getTime())) {
                        return date.toLocaleTimeString('en-PH', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                          hour12: true,
                        });
                      }
                    }
                  }
                  return 'N/A';
                } catch (error) {
                  console.warn('Invalid end time field:', item.endTime, error);
                  return 'N/A';
                }
              })(),

              // Initial Moisture per tray (T1–T6)
              initialMoistureT1: safeToString(item.moisture1),
              initialMoistureT2: safeToString(item.moisture2),
              initialMoistureT3: safeToString(item.moisture3),
              initialMoistureT4: safeToString(item.moisture4),
              initialMoistureT5: safeToString(item.moisture5),
              initialMoistureT6: safeToString(item.moisture6),

              // Final Moisture per tray (T1–T6)
              finalMoistureT1: safeToString(item.finalMoisture1 ?? item.moisture1End),
              finalMoistureT2: safeToString(item.finalMoisture2 ?? item.moisture2End),
              finalMoistureT3: safeToString(item.finalMoisture3 ?? item.moisture3End),
              finalMoistureT4: safeToString(item.finalMoisture4 ?? item.moisture4End),
              finalMoistureT5: safeToString(item.finalMoisture5 ?? item.moisture5End),
              finalMoistureT6: safeToString(item.finalMoisture6 ?? item.moisture6End),

              // Moisture average
              moistureavg: safeToString(item.moistureavg),

              // Temperature & Humidity
              temperature: item.temperature !== undefined ? `${item.temperature}` : 'N/A',
              humidity: item.humidity !== undefined ? item.humidity.toString() : 'N/A',

              // Before Weight — per tray from backend
              beforeWeightT1: safeToString(item.weight1_t1 ?? item.weight1),
              beforeWeightT2: safeToString(item.weight1_t2 ?? item.weight1),
              beforeWeightT3: safeToString(item.weight1_t3 ?? item.weight1),
              beforeWeightT4: safeToString(item.weight1_t4 ?? item.weight1),
              beforeWeightT5: safeToString(item.weight1_t5 ?? item.weight1),
              beforeWeightT6: safeToString(item.weight1_t6 ?? item.weight1),

              // After Weight — per tray from backend
              afterWeightT1: safeToString(item.weight2_t1 ?? item.weight2),
              afterWeightT2: safeToString(item.weight2_t2 ?? item.weight2),
              afterWeightT3: safeToString(item.weight2_t3 ?? item.weight2),
              afterWeightT4: safeToString(item.weight2_t4 ?? item.weight2),
              afterWeightT5: safeToString(item.weight2_t5 ?? item.weight2),
              afterWeightT6: safeToString(item.weight2_t6 ?? item.weight2),

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

  // Monitor moisture content and auto-stop when reaching 14%
  useEffect(() => {
    if (!isMonitoringMoisture || targetMoistureReached) {
      return; // Don't monitor if not active or already reached target
    }

    const monitorMoisture = async () => {
      try {
        const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';
        const token = localStorage.getItem('token');
        
        // Fetch latest sensor data
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
        const sensorData = Array.isArray(result.data) ? result.data[0] : result.data;

        if (sensorData && sensorData.moistureavg !== undefined) {
          const avgMoisture = parseFloat(sensorData.moistureavg);
          setCurrentMoisture(avgMoisture);

          // Check if moisture reached target (14%)
          // Trigger: Consider it "reached" when <= 14
          if (avgMoisture <= 14 && !targetMoistureReached) {
            console.log(`✓ Target moisture reached! Average: ${avgMoisture}%`);
            setTargetMoistureReached(true);
            setIsMonitoringMoisture(false);

            // Record end time for auto-stop scenario
            const now = new Date();
            const endTimeISO = now.toISOString();
            const endTimeFormatted = now.toLocaleTimeString('en-PH', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: true,
            });

            // Store end time in localStorage for database sync
            localStorage.setItem('autoStopEndTime', endTimeISO);
            localStorage.setItem('autoStopEndTimeFormatted', endTimeFormatted);
            localStorage.setItem('autoStopStatus', 'Target Reached');

            console.log('Auto-stop: Recorded end time:', {
              endTimeISO,
              endTimeFormatted,
              moisture: avgMoisture,
              status: 'Target Reached'
            });

            // Auto-stop drying when target reached
            try {
              const stopResponse = await dryerService.stopDrying();
              if (stopResponse.success) {
                console.log('Drying automatically stopped at target moisture');
                // Reload history to show new record with end time
                setTimeout(() => {
                  window.location.reload();
                }, 1000);
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

    // Monitor every 10 seconds during active drying
    const monitoringInterval = setInterval(monitorMoisture, 10000);
    monitorMoisture(); // Initial check

    return () => clearInterval(monitoringInterval);
  }, [isMonitoringMoisture, targetMoistureReached]);

  const handleNavigation = (path, tab) => {
    setActiveTab(tab);
    navigate(path);
  };

  const handleLogoutClick = () => setShowLogoutConfirm(true);
  const handleLogoutConfirm = async () => {
    try {
      // Stop drying process if running
      await dryerService.stopDrying().catch(() => {});
      
      // Clear sensor-related data from localStorage
      localStorage.removeItem('sensorData');
      localStorage.removeItem('savedWeights');
      localStorage.removeItem('savedAfterWeights');
      localStorage.removeItem('dryingStatus');
      localStorage.removeItem('dryingStartTime');
      localStorage.removeItem('targetMoisture');
      localStorage.removeItem('targetTemperature');
      
      // Call auth logout
      await authService.logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Still navigate to login even if there's an error
      navigate('/login');
    }
  };
  const handleLogoutCancel = () => setShowLogoutConfirm(false);

  // Function to start monitoring moisture (can be called from Dashboard when drying starts)
  const startMoistureMonitoring = () => {
    setIsMonitoringMoisture(true);
    setTargetMoistureReached(false);
    setCurrentMoisture(null);
    console.log('Started monitoring moisture for auto-stop at 14%');
  };

  // Function to stop monitoring moisture manually
  const stopMoistureMonitoring = () => {
    setIsMonitoringMoisture(false);
    console.log('Stopped monitoring moisture');
  };

  const handleDownloadExcel = () => {
  if (selectedRecords.length === 0) {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #f59e0b;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 9999;
      font-weight: 500;
    `;
    notification.textContent = '⚠️ Please select records to export';
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
    return;
  }

  const selectedData = historyData.filter(item => selectedRecords.includes(item.id));
  const worksheet = XLSX.utils.json_to_sheet(selectedData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'History');
  XLSX.writeFile(workbook, `MALA_history_${new Date().toISOString().split('T')[0]}.xlsx`);
};

const handleExportGraph = () => {
  const selectedData = historyData.filter(item => selectedRecords.includes(item.id));

  if (selectedData.length === 0) {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #f59e0b;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 9999;
      font-weight: 500;
    `;
    notification.textContent = '⚠️ Please select records to export graph';
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
    return;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 800;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#000000';
  ctx.font = 'bold 24px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Rice Dryer Multi-Sensor Data', canvas.width / 2, 40);

  const chartLeft = 100;
  const chartTop = 100;
  const chartWidth = 1000;
  const chartHeight = 600;
  const chartBottom = chartTop + chartHeight;

  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(chartLeft, chartBottom);
  ctx.lineTo(chartLeft + chartWidth, chartBottom);
  ctx.moveTo(chartLeft, chartTop);
  ctx.lineTo(chartLeft, chartBottom);
  ctx.stroke();

  const sensors = [
    { key: 'moistureavg', label: 'Moisture %', color: '#10b981', unit: '%' },
    { key: 'temperature', label: 'Temperature', color: '#ef4444', unit: '°C' },
    { key: 'humidity', label: 'Humidity', color: '#3b82f6', unit: '%' },
    { key: 'beforeWeightT1', label: 'Weight T1', color: '#f59e0b', unit: 'kg' }
  ];

  const timePoints = [];
  selectedData.forEach((item, index) => {
    const startTime = new Date(item.date + ' ' + item.startTime);
    const endTime = new Date(item.date + ' ' + item.endTime);
    if (!isNaN(startTime.getTime()) && !isNaN(endTime.getTime())) {
      timePoints.push({ start: startTime, end: endTime, index });
    }
  });

  const sensorRanges = {};
  sensors.forEach(sensor => {
    const values = selectedData
      .map(item => parseFloat(item[sensor.key]))
      .filter(v => !isNaN(v));
    if (values.length > 0) {
      sensorRanges[sensor.key] = {
        min: Math.min(...values),
        max: Math.max(...values),
        range: Math.max(...values) - Math.min(...values) || 1
      };
    }
  });

  sensors.forEach((sensor, sensorIndex) => {
    if (!sensorRanges[sensor.key]) return;
    ctx.strokeStyle = sensor.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    let hasData = false;

    selectedData.forEach((item, index) => {
      const value = parseFloat(item[sensor.key]);
      if (isNaN(value)) return;
      const timePoint = timePoints[index];
      if (!timePoint) return;
      const totalDuration =
        (timePoints[timePoints.length - 1]?.end.getTime() - timePoints[0]?.start.getTime()) || 1;
      const elapsed = timePoint.start.getTime() - timePoints[0]?.start.getTime();
      const x = chartLeft + (elapsed / totalDuration) * chartWidth;
      const range = sensorRanges[sensor.key];
      const y = chartBottom - ((value - range.min) / range.range) * chartHeight;

      if (!hasData) {
        ctx.moveTo(x, y);
        hasData = true;
      } else {
        ctx.lineTo(x, y);
      }

      ctx.fillStyle = sensor.color;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, 2 * Math.PI);
      ctx.fill();
    });
    ctx.stroke();

    ctx.fillStyle = sensor.color;
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(sensor.label, chartLeft + chartWidth + 20, chartTop + 30 + sensorIndex * 25);
  });

  ctx.fillStyle = '#000000';
  ctx.font = '10px Arial';
  ctx.textAlign = 'center';
  timePoints.forEach((timePoint, index) => {
    if (index % Math.ceil(timePoints.length / 5) === 0 || index === timePoints.length - 1) {
      const x = chartLeft +
        ((timePoint.start.getTime() - timePoints[0]?.start.getTime()) /
          ((timePoints[timePoints.length - 1]?.end.getTime() - timePoints[0]?.start.getTime()) || 1)) *
        chartWidth;
      const timeStr = timePoint.start.toLocaleTimeString('en-PH', {
        hour: '2-digit', minute: '2-digit', hour12: true
      });
      ctx.fillText(timeStr, x, chartBottom + 20);
    }
  });

  sensors.forEach((sensor, index) => {
    if (!sensorRanges[sensor.key]) return;
    const range = sensorRanges[sensor.key];
    ctx.fillStyle = sensor.color;
    ctx.font = '10px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(range.min.toFixed(1) + sensor.unit, chartLeft - 10, chartBottom - index * chartHeight / sensors.length);
    ctx.fillText(range.max.toFixed(1) + sensor.unit, chartLeft - 10, chartTop + index * chartHeight / sensors.length);
  });

  ctx.fillStyle = '#000000';
  ctx.font = '14px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Time', chartLeft + chartWidth / 2, chartBottom + 50);
  ctx.save();
  ctx.translate(50, chartTop + chartHeight / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('Sensor Values', 0, 0);
  ctx.restore();

  const legendY = 70;
  sensors.forEach((sensor, index) => {
    const legendX = 200 + index * 150;
    ctx.fillStyle = sensor.color;
    ctx.fillRect(legendX, legendY, 15, 3);
    ctx.fillStyle = '#000000';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(sensor.label, legendX + 20, legendY + 5);
  });

  canvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MALA_multi_sensor_graph_${new Date().toISOString().split('T')[0]}_${selectedRecords.length}_records.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
};

const handleDelete = () => {
  if (selectedRecords.length === 0) {
    // User-friendly notification instead of alert
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ef4444;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 9999;
      font-weight: 500;
    `;
    notification.textContent = '⚠️ Please select records to delete';
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
    return;
  }
  
  // Show confirmation dialog with more details
  setShowDeleteConfirm(true);
};

const handleDeleteConfirm = async () => {
  try {
    const token = localStorage.getItem('token');
    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';
    
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
    
    const formattedData = sensorData.map((item, index) => ({
      id: item._id || item.id || index + 1,
      date: (() => {
        try {
          const dateFields = [item.timestamp, item.startTime, item.createdAt, item.date];
          for (const field of dateFields) {
            if (field) {
              const date = new Date(field);
              if (!isNaN(date.getTime())) {
                return date.toLocaleDateString('en-PH', {
                  month: '2-digit',
                  day: '2-digit',
                  year: 'numeric',
                });
              }
            }
          }
          return 'N/A';
        } catch (error) {
          return 'N/A';
        }
      })(),
      startTime: (() => {
        try {
          const timeFields = [item.startTime, item.timestamp, item.createdAt];
          for (const field of timeFields) {
            if (field) {
              const date = new Date(field);
              if (!isNaN(date.getTime())) {
                return date.toLocaleTimeString('en-PH', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: true,
                });
              }
            }
          }
          return 'N/A';
        } catch (error) {
          return 'N/A';
        }
      })(),
      endTime: (() => {
        try {
          if (item.endTime) {
            const date = new Date(item.endTime);
            if (!isNaN(date.getTime())) {
              return date.toLocaleTimeString('en-PH', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true,
              });
            }
          }
          return 'N/A';
        } catch (error) {
          return 'N/A';
        }
      })(),
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
      finalMoistureT5: safeToString(item.finalMoisture5 ?? item.mousture5End),
      finalMoistureT6: safeToString(item.finalMoisture6 ?? item.moisture6End),
      moistureavg: safeToString(item.moistureavg),
      temperature: item.temperature !== undefined ? `${item.temperature}` : 'N/A',
      humidity: item.humidity !== undefined ? item.humidity.toString() : 'N/A',
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
    }));
    
    setHistoryData(formattedData);
    setSelectedRecords([]);
    setShowDeleteConfirm(false);
    
    // Show success notification
    const successNotification = document.createElement('div');
    successNotification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #10b981;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 9999;
      font-weight: 500;
    `;
    successNotification.textContent = ` Successfully deleted ${selectedRecords.length} record(s) from database`;
    document.body.appendChild(successNotification);
    
    setTimeout(() => {
      successNotification.remove();
    }, 3000);
    
  } catch (error) {
    console.error('Delete error:', error);
    
    // Show error notification with more specific messaging
    const errorNotification = document.createElement('div');
    errorNotification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ef4444;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 9999;
      font-weight: 500;
      max-width: 400px;
    `;
    errorNotification.textContent = ` ${error.message}`;
    document.body.appendChild(errorNotification);
    
    setTimeout(() => {
      errorNotification.remove();
    }, 5000);
    
    // Reset button state
    const deleteButton = document.querySelector('.modal-button.confirm.delete');
    if (deleteButton) {
      deleteButton.textContent = 'Delete';
      deleteButton.disabled = false;
    }
  }
};

const handleDeleteCancel = () => {
  setShowDeleteConfirm(false);
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

const filteredData = historyData.filter(item => {
  const searchLower = searchTerm.toLowerCase();
  return (
    item.date.toLowerCase().includes(searchLower) ||
    item.startTime.toLowerCase().includes(searchLower) ||
    item.endTime.toLowerCase().includes(searchLower) ||
    item.status.toLowerCase().includes(searchLower) ||
    item.moistureavg.toLowerCase().includes(searchLower)
  );
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
              {selectedRecords.length > 0 && (
                <div style={{ marginTop: '12px', padding: '8px', backgroundColor: '#fef3c7', borderRadius: '4px', fontSize: '12px', color: '#92400e' }}>
                  ⚠️ Records to be deleted: {selectedRecords.slice(0, 3).join(', ')}
                  {selectedRecords.length > 3 && ` and ${selectedRecords.length - 3} more...`}
                </div>
              )}
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
              <button className="download-btn delete-btn" onClick={handleDelete}>Delete</button>
            </div>
          </div>

          {/* Moisture Monitoring Status Bar */}
          {isMonitoringMoisture && (
            <div style={{
              backgroundColor: '#FEF3C7',
              border: '1px solid #FCD34D',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
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
                  padding: '6px 12px',
                  backgroundColor: '#EF4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: '600'
                }}
              >
                Stop Monitoring
              </button>
            </div>
          )}

          {targetMoistureReached && (
            <div style={{
              backgroundColor: '#D1FAE5',
              border: '1px solid #6EE7B7',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '16px',
              color: '#065F46',
              fontWeight: '600'
            }}>
              ✓ Target moisture (14%) reached! Drying session has been completed and saved.
            </div>
          )}
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
                    <td colSpan="35" style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>
                      {searchTerm ? 'No records found matching your search.' : 'No history data available.'}
                    </td>
                  </tr>
                ) : (
                  filteredData.map((item) => {
                    // Determine completion status based on final moisture
                    const finalMoistureAvg = parseFloat(item.moistureavg);
                    const isTargetReached = finalMoistureAvg <= 14;
                    const isSelected = selectedRecords.includes(item.id);
                    
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
                        <td>{item.date}</td>
                        <td>{item.startTime}</td>
                        <td>{item.endTime}</td>
                        
                        {/* Completion Status */}
                        <td>
                          <span 
                            style={{
                              padding: '4px 8px',
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