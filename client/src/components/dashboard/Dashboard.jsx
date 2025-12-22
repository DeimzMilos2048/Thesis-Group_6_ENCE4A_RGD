import React, { useState, useEffect } from 'react';
import { Activity, BarChart2, Clock, Settings, AlertTriangle, LogOut, Thermometer, Droplets, Waves, Weight, CheckCircle, Server } from 'lucide-react';
import './Dashboard.css';
import { useNavigate } from 'react-router-dom';
import authService from '../../api/authService';
import logo from "../../assets/images/logo2.png";

export default function RiceDryingDashboard({ view }) {
  const [targetTemp, setTargetTemp] = useState("");
  const [targetMoisture, setTargetMoisture] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    const fetchDashboardData = async () => {
      try {
        // Only show loading if data fetch takes longer than 300ms
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
      {/* Sidebar */}
      <div className="sidebar">
        {/* Logo */}
  <div class="logo-section">
    <div class="logo-box">
      <img src={logo} alt="" class="sidebar-logo" />
    </div>
    </div>

        {/* Navigation */}
        <nav className="nav-section">
          <button 
            className={`nav-item ${!view ? 'active' : ''}`}
            onClick={() => navigate('/dashboard')}
          >
            <BarChart2 size={16} />
            <span>Dashboard</span>
          </button>
          <button 
            className="nav-item"
            onClick={() => navigate('/analytics')}
          >
            <Activity size={16} />
            <span>Analytics</span>
          </button>
          <button 
            className={`nav-item ${view === 'history' ? 'active' : ''}`}
            onClick={() => navigate('/dashboard/history')}
          >
            <Clock size={16} />
            <span>History</span>
          </button>
          <button 
            className={`nav-item ${view === 'settings' ? 'active' : ''}`}
            onClick={() => navigate('/dashboard/settings')}
          >
            <Settings size={16} />
            <span>Settings</span>
          </button>
          <button className="nav-item">
            <AlertTriangle size={16} />
            <span>Alerts</span>
          </button>
        </nav>

        {/* Log Out */}
        <button 
          className="nav-item logout"
          onClick={() => {
            authService.logout();
            navigate('/login');
          }}
        >
          <LogOut size={16} />
          <span>Log Out</span>
        </button>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {view === 'history' ? (
          <>
            {/* Header */}
            <div className="header">
              <h1>History</h1>
              <p>Review past drying sessions and activity.</p>
            </div>
            {/* Content Area */}
            <div className="content-area">
              <div className="status-cards">
                <div className="status-card">
                  <div className="status-content">
                    <div className="status-label">History placeholder</div>
                    <div className="status-value">No history yet</div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : view === 'settings' ? (
          <>
            {/* Header */}
            <div className="header">
              <h1>Settings</h1>
              <p>Configure thresholds and preferences.</p>
            </div>
            {/* Content Area */}
            <div className="content-area">
              <div className="status-cards">
                <div className="status-card">
                  <div className="status-content">
                    <div className="status-label">Settings placeholder</div>
                    <div className="status-value">PlaceHolder</div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Header */}
            <div className="header">
              <h1>Rice Grain Drying System Dashboard</h1>
              <p>Real-time monitoring and control interface</p>
            </div>

            {/* Content Area */}
            <div className="content-area">
              {/* Status Cards */}
              <div className="status-cards">
                <div className="status-card">
                  <div className="status-content">
                    <div className="status-icon">
                      <CheckCircle size={22} />
                    </div>
                    <div className="status-label">System Status</div>
                    <div className="status-value">Drying</div>
                  </div>
                </div>

                <div className="status-card">
                  <div className="status-content">
                    <div className="status-icon">
                      <Server size={22} />
                    </div>
                    <div className="status-label">Gateway Status</div>
                    <div className="status-value">Online</div>
                  </div>
                </div>

                <div className="status-card">
                  <div className="status-content">
                    <div className="status-icon">
                      <Activity size={22} />
                    </div>
                    <div className="status-label">Active Sensors</div>
                    <div className="status-value">3/3</div>
                  </div>
                </div>

                <div className="status-card">
                  <div className="status-content">
                    <div className="status-icon">
                      <Settings size={22} />
                    </div>
                    <div className="status-label">Actuators Online</div>
                    <div className="status-value">3/3</div>
                  </div>
                </div>
              </div>

              <div className="grid-container">
                {/* Sensor Readings */}
                <div className="sensor-readings">
                  <h2>Sensor Readings</h2>
                  
                  <div className="sensors-grid">
                    {/* Temperature */}
                    <div className="sensor-card">
                      <div className="sensor-icon orange">
                        <Thermometer size={24} />
                      </div>
                      <div className="sensor-label">Temperature</div>
                      <div className="sensor-value">55.6°C</div>
                      <div className="progress-bar">
                        <div className="progress-fill orange" style={{ width: '55%' }}></div>
                      </div>
                      <div className="sensor-range">Range: 40-60°C</div>
                    </div>

                    {/* Humidity */}
                    <div className="sensor-card">
                      <div className="sensor-icon cyan">
                        <Droplets size={24} />
                      </div>
                      <div className="sensor-label">Humidity</div>
                      <div className="sensor-value">39%</div>
                      <div className="progress-bar">
                        <div className="progress-fill cyan" style={{ width: '39%' }}></div>
                      </div>
                      <div className="sensor-range">Target: &lt;65%</div>
                    </div>

                    {/* Moisture Content */}
                    <div className="sensor-card">
                      <div className="sensor-icon cyan">
                        <Waves size={24} />
                      </div>
                      <div className="sensor-label">Moisture Content</div>
                      <div className="sensor-value">16.4%</div>
                      <div className="progress-bar">
                        <div className="progress-fill cyan" style={{ width: '82%' }}></div>
                      </div>
                      <div className="sensor-range">Target: 10-14%</div>
                    </div>

                    {/* Current Weight */}
                    <div className="sensor-card">
                      <div className="sensor-icon green">
                        <Weight size={24} />
                      </div>
                      <div className="sensor-label">Current Weight</div>
                      <div className="sensor-value">16.4kg</div>
                      <div className="progress-bar">
                        <div className="progress-fill green" style={{ width: '66%' }}></div>
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

                  {/* Target Temperature */}
                  <div className="control-group">
                    <label>Target Temperature</label>
                    <input
                      type="number"
                      min="40"
                      max="60"
                      value={targetTemp}
                      onChange={(e) => setTargetTemp(e.target.value)}
                      className="control-input"
                      placeholder="Enter temperature"
                    />
                  </div>

                  {/* Target Moisture Content */}
                  <div className="control-group">
                    <label>Target Moisture Content</label>
                    <input
                      type="number"
                      min="10"
                      max="14"
                      value={targetMoisture}
                      onChange={(e) => setTargetMoisture(e.target.value)}
                      className="control-input"
                      placeholder="Enter moisture %"
                    />
                  </div>

                  {/* Apply Settings Button */}
                  <button className="apply-button">
                    <span>✓</span>
                    Apply Settings
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}