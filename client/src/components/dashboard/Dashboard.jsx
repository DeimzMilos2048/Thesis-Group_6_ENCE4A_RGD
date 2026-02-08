import React, { useState, useEffect } from 'react';
import { Activity,BarChart2, Bell, CircleUser,Clock, Settings,AlertTriangle, LogOut, Thermometer, Droplets, Waves, Weight, CheckCircle, Server } from 'lucide-react';
import './Dashboard.css';
import { useNavigate, useLocation } from 'react-router-dom';
import authService from '../../api/authService';
import logo from "../../assets/images/logo2.png";
import io from 'socket.io-client';

export default function RiceDryingDashboard({ view }) {
  const [targetTemp, setTargetTemp] = useState("");
  const [targetMoisture, setTargetMoisture] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [sensorData, setSensorData] = useState({
    temperature: 0,
    humidity: 0,
    moisture: 0,
    weight: 0,
    status: 'Idle'
  });
  const navigate = useNavigate();
  const location = useLocation();

  // Update active tab based on current route
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
    }
      else {
      setActiveTab('dashboard');
    }
  }, [location]);

  // Socket.io setup for real-time sensor data
  useEffect(() => {
    const socket = io('http://localhost:5000', {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });

    socket.on('connect', () => {
      console.log('Connected to sensor server');
    });

    // Listen for real-time sensor data updates
    socket.on('sensor_readings_table', (data) => {
      console.log('Sensor data received:', data);
      setSensorData({
        temperature: data.temperature || 0,
        humidity: data.humidity || 0,
        moisture: data.moisture || 0,
        weight: data.weight || 0,
        status: data.status || 'Idle'
      });
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
      setError('Real-time connection error');
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchDashboardData = async () => {
      try {
        const loadingTimeout = setTimeout(() => {
          if (isMounted) setLoading(true);
        }, 300);

        await authService.getDashboardData();
        clearTimeout(loadingTimeout);
        
        if (isMounted) {
          setError(null);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message);
          if (err.message.includes('Not authorized')) {
            navigate('/login');
          }
        }
      }
    };

    fetchDashboardData();
    
    return () => {
      isMounted = false;
    };
  }, [navigate]);

  const handleNavigation = (path, tab) => {
    setActiveTab(tab);
    navigate(path);
  };

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const handleLogoutConfirm = () => {
    authService.logout();
    navigate('/login');
  };

  const handleLogoutCancel = () => {
    setShowLogoutConfirm(false);
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
          <p>Loading dashboard...</p>
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
              <button className="modal-button cancel" onClick={handleLogoutCancel}>
                Cancel
              </button>
              <button className="modal-button confirm" onClick={handleLogoutConfirm}>
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Sidebar */}
      <div className="sidebar">
        <div className="logo-section">
          <div className="logo-box">
            <img src={logo} alt="" className="sidebar-logo" />
          </div>
        </div>

        <nav className="nav-section">
          <button 
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => handleNavigation('/dashboard', 'dashboard')}
          >
            <BarChart2 size={16} />
            <span>Dashboard</span>
          </button>
          <button 
            className={`nav-item ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => handleNavigation('/analytics', 'analytics')}
          >
            <Activity size={16} />
            <span>Analytics</span>
          </button>
          <button 
            className={`nav-item ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => handleNavigation('/history', 'history')}
          >
            <Clock size={16} />
            <span>History</span>
          </button>
         
          <button 
            className={`nav-item ${activeTab === 'notification' ? 'active' : ''}`}
            onClick={() => handleNavigation('/notification', 'notification')}
          >
            <Bell size={16} />
            <span>Notification</span>
          </button>

          <button 
            className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => handleNavigation('/profile', 'profile')}
          >
            <CircleUser size={16} />
            <span>Profile</span>
          </button>
          
        </nav>

        <button 
          className="nav-item logout"
          onClick={handleLogoutClick}
        >
          <LogOut size={16} />
          <span>Log Out</span>
        </button>
      </div>

      {/* Main Content - Single Unified Section */}
      <div className="main-content">
        <div className="unified-dashboard">
          {/* Header */}
          <div className="dashboard-header">
            <h1>Rice Grain Drying System Dashboard</h1>
            <p>Real-time monitoring and control interface</p>
          </div>

          {/* All Content in One Container */}
          <div className="dashboard-content">
            {/* Status Cards Row */}
            <div className="status-cards">
              <div className="status-card">
                <div className="status-content">
                  <div className="status-icon">
                    <CheckCircle size={22} />
                  </div>
                  <div className="status-label">System Status</div>
                  <div className="status-value">{sensorData.status}</div>
                </div>
              </div>              
            </div>

            {/* Sensor Readings and Controls Grid */}
            <div className="grid-container">
              {/* Sensor Readings */}
              <div className="sensor-readings">
                <h2>Sensor Readings</h2>
                
                <div className="sensors-grid">
                  <div className="sensor-card">
                    <div className="sensor-icon orange">
                      <Thermometer size={24} />
                    </div>
                    <div className="sensor-label">Temperature</div>
                    <div className="sensor-value">{sensorData.temperature.toFixed(1)}°C</div>
                    <div className="progress-bar">
                      <div className="progress-fill orange" style={{ width: `${Math.min((sensorData.temperature / 60) * 100, 100)}%` }}></div>
                    </div>
                    <div className="sensor-range">Range: 50-60°C</div>
                  </div>

                  <div className="sensor-card">
                    <div className="sensor-icon cyan">
                      <Droplets size={24} />
                    </div>
                    <div className="sensor-label">Humidity</div>
                    <div className="sensor-value">{sensorData.humidity.toFixed(1)}%</div>
                    <div className="progress-bar">
                      <div className="progress-fill cyan" style={{ width: `${sensorData.humidity}%` }}></div>
                    </div>
                    <div className="sensor-range">Target: &lt;65%</div>
                  </div>

                  <div className="sensor-card">
                    <div className="sensor-icon cyan">
                      <Waves size={24} />
                    </div>
                    <div className="sensor-label">Moisture Content</div>
                    <div className="sensor-value">{sensorData.moisture.toFixed(1)}%</div>
                    <div className="progress-bar">
                      <div className="progress-fill cyan" style={{ width: `${Math.min((sensorData.moisture / 14) * 100, 100)}%` }}></div>
                    </div>
                    <div className="sensor-range">Target: 10-14%</div>
                  </div>

                  <div className="sensor-card">
                    <div className="sensor-icon green">
                      <Weight size={24} />
                    </div>
                    <div className="sensor-label">Current Weight</div>
                    <div className="sensor-value">{sensorData.weight.toFixed(1)}kg</div>
                    <div className="progress-bar">
                      <div className="progress-fill green" style={{ width: `${Math.min((sensorData.weight / 25) * 100, 100)}%` }}></div>
                    </div>
                    <div className="sensor-range">Initial: 25kg</div>
                  </div>
                </div>
              </div>

              {/* System Controls */}
              <div className="system-controls">
                <div className="controls-header">
                  <Settings size={20} />
                  <h2>System Controls</h2>
                </div>

                <div className="control-group">
                  <label>Target Temperature</label>
                  <input
                    type="number"
                    min="50"
                    max="60"
                    value={targetTemp}
                    onChange={(e) => setTargetTemp(e.target.value)}
                    className="control-input"
                    placeholder="Enter temperature"
                  />
                </div>

                <div className="control-group">
                  <label>Target Moisture Content</label>
                  <input
                    type="number"
                    min="10"
                    max="14"
                    value={targetMoisture}
                    onChange={(e) => setTargetMoisture(e.target.value)}
                    className="control-input"
                    placeholder="Enter moisture"
                  />
                </div>

                <button className="apply-button">
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}