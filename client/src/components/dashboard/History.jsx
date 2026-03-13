// history

import { useState, useEffect } from 'react';
import { Activity, BarChart2, Bell, CircleUser, Clock, AlertTriangle, LogOut, ChevronDown, ChevronUp, User, HelpCircle, Settings } from 'lucide-react';
import './Dashboard.css';
import './History.css';
import * as XLSX from 'xlsx';
import { useNavigate, useLocation } from 'react-router-dom';
import authService from '../../api/authService';
import dryerService from '../../api/dryerService';
import logo from "../../assets/images/logo2.png";
import useNotificationService from './Usenotificationservice.js';
import { useSocket } from '../../contexts/SocketContext.js';
import { useWeight } from '../../contexts/WeightContext.js';

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
  const navigate = useNavigate();
  const location = useLocation();

  // Add notification service for badge
  const { unreadCount } = useNotificationService(null, 15000);

  // Add context hooks for saved weights and socket
  const { socket, sensorData } = useSocket();
  const { savedWeights } = useWeight();

  // Calculate average moisture only from selected trays (same as Dashboard)
  const selectedTrays = Object.keys(savedWeights).filter(trayNum => savedWeights[trayNum]?.frozen);
  const selectedTraysCount = selectedTrays.length;

  // Calculate average moisture from selected trays only
  let totalMoisture = 0;
  selectedTrays.forEach(trayNum => {
    totalMoisture += sensorData[`moisture${trayNum}`] || 0;
  });
  const averageMoistureFromSelected = selectedTraysCount > 0 ? totalMoisture / selectedTraysCount : 0;

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

          const safeToString = (value, fallback = 'N/A') => {
            if (value !== undefined && value !== null) {
              const num = parseFloat(value);
              return isNaN(num) ? value.toString() : num.toFixed(2);
            }
            return fallback;
          };

          const safeToNumberString = (value, fallback = 'N/A') => {
            if (value !== undefined && value !== null) {
              const num = parseFloat(value);
              return isNaN(num) ? fallback : num.toFixed(2);
            }
            return fallback;
          };

          const formattedData = sensorData.map((item, index) => {
            return {
              id: item._id || item.id || index + 1,

              // Date & Time
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
                    //second: '2-digit',
                    hour12: true,
                  })
                : (item.timestamp
                  ? new Date(item.timestamp).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      //second: '2-digit',
                      hour12: true,
                    })
                  : 'N/A'),
              endTime: item.endTime
                ? new Date(item.endTime).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    //second: '2-digit',
                    hour12: true,
                  })
                : 'N/A',

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
              temperature: item.temperature !== undefined ? `${parseFloat(item.temperature).toFixed(2)}°` : 'N/A',
              humidity: item.humidity !== undefined ? parseFloat(item.humidity).toFixed(2) : 'N/A',

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

  // Send notifications for average moisture calculations (same as Dashboard)
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
      // Stop drying process if running
      await dryerService.stopDrying().catch(() => {});
      
      // Clear sensor-related data from localStorage (but preserve weight data)
      localStorage.removeItem('sensorData');
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
    const worksheet = XLSX.utils.json_to_sheet(historyData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "History");
    XLSX.writeFile(workbook, "MALA_data_history.xlsx");
  };

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
            <div className="history-header-controls">
              {selectedTraysCount > 0 && (
                <div style={{
                  backgroundColor: '#f0fdf4',
                  border: '2px solid #10b981',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  marginRight: '12px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '12px', color: '#059669', fontWeight: '600', marginBottom: '4px' }}>
                    Current Average (from {selectedTraysCount} tray{selectedTraysCount > 1 ? 's' : ''})
                  </div>
                  <div style={{ fontSize: '18px', color: '#059669', fontWeight: '700' }}>
                    {averageMoistureFromSelected.toFixed(2)}%
                  </div>
                </div>
              )}
              <button className="download-btn" onClick={handleDownloadExcel}>Export Excel</button>
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
                  <th colSpan="6">After Weight</th>{/* ← RENAMED */}

                  <th rowSpan="2">Status</th>
                </tr>
                <tr>
                  {/* Initial Moisture sub-headers */}
                  <th>T1</th><th>T2</th><th>T3</th><th>T4</th><th>T5</th><th>T6</th>
                  {/* Final Moisture sub-headers + AVG */}
                  <th>T1</th><th>T2</th><th>T3</th><th>T4</th><th>T5</th><th>T6</th><th>AVG</th>
                  {/* Before Weight sub-headers */}
                  <th>T1</th><th>T2</th><th>T3</th><th>T4</th><th>T5</th><th>T6</th>
                  {/* After Weight sub-headers */}{/* ← RENAMED */}
                  <th>T1</th><th>T2</th><th>T3</th><th>T4</th><th>T5</th><th>T6</th>
                </tr>
              </thead>

              <tbody>
                {historyData.length === 0 ? (
                  <tr>
                    <td colSpan="34" style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>
                      No history data available.
                    </td>
                  </tr>
                ) : (
                  historyData.map((item) => {
                    // Determine completion status based on final moisture
                    const finalMoistureAvg = parseFloat(item.moistureavg);
                    const isTargetReached = finalMoistureAvg <= 14;
                    
                    return (
                      <tr key={item.id}>
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

                        {/* After Weight */}{/* ← RENAMED */}
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