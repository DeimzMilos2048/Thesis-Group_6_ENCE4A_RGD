import { useState, useEffect } from 'react';
import { Activity, BarChart2, Bell, CircleUser, Clock, Settings, AlertTriangle, LogOut, Thermometer, Droplets, Waves, Weight, CheckCircle, StopCircle, ChevronDown, ChevronUp, User, HelpCircle } from 'lucide-react';
import './Dashboard.css';
import { useNavigate, useLocation } from 'react-router-dom';
import authService from '../../api/authService';
import logo from "../../assets/images/logo2.png";
import { useSocket } from '../../contexts/SocketContext.js';
import { useDrying } from '../../contexts/DryingContext.js';

export default function RiceDryingDashboard({ view }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();

  const { socket, sensorData, chartData, isConnected } = useSocket();

  // ── All drying state comes from context — persists across tab navigation ──
  const {
    isProcessing,
    dryingSeconds,
    selectedTemp,   setSelectedTemp,
    selectedMoisture, setSelectedMoisture,
    currentTray,    setCurrentTray,
    startDrying,
    stopDrying,
    formatDryingTime,
  } = useDrying();

  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/analytics')) setActiveTab('analytics');
    else if (path.includes('/history')) setActiveTab('history');
    else if (path.includes('/notification')) setActiveTab('notification');
    else if (path.includes('/profile')) setActiveTab('profile');
    else setActiveTab('dashboard');
  }, [location]);

  useEffect(() => {
    let isMounted = true;
    const fetchDashboardData = async () => {
      try {
        const loadingTimeout = setTimeout(() => {
          if (isMounted) setLoading(true);
        }, 300);
        await authService.getDashboardData();
        clearTimeout(loadingTimeout);
        if (isMounted) { setError(null); setLoading(false); }
      } catch (err) {
        if (isMounted) {
          setError(err.message);
          if (err.message.includes('Not authorized')) navigate('/login');
        }
      }
    };
    fetchDashboardData();
    return () => { isMounted = false; };
  }, [navigate]);

  const handleNavigation = (path, tab) => {
    setActiveTab(tab);
    navigate(path);
  };

  const handleLogoutClick = () => setShowLogoutConfirm(true);
  const handleLogoutCancel = () => setShowLogoutConfirm(false);
  const handleLogoutConfirm = () => {
    authService.logout();
    navigate('/login');
  };

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 10000);
  };

  const handleApply = () => {
    if (!selectedTemp && !selectedMoisture) {
      showToast('error', 'Please select a target temperature and moisture before starting.');
      return;
    }
    if (!selectedTemp) {
      showToast('error', 'Please select a target temperature (40–45°C) before starting.');
      return;
    }
    if (!selectedMoisture) {
      showToast('error', 'Please select a target moisture (13% or 14%) before starting.');
      return;
    }
    console.log("Applied — Temp:", selectedTemp, "Moisture:", selectedMoisture);
    startDrying(selectedTemp, selectedMoisture);
    showToast('success', `Drying started — Target: ${selectedTemp}°C · Moisture: ${selectedMoisture}%`);
  };

  const handleStop = () => {
    console.log("Stop command triggered");
    stopDrying();
    showToast('info', 'Drying process has been stopped.');
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

      {showLogoutConfirm && (
        <div className="modal-overlay" onClick={handleLogoutCancel}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <LogOut size={24} />
              <h3>Confirm Logout</h3>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to log out?</p>
            </div>
            <div className="modal-footer">
              <button className="modal-button cancel" onClick={handleLogoutCancel}>Cancel</button>
              <button className="modal-button confirm" onClick={handleLogoutConfirm}>Log Out</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`toast-notification toast-${toast.type}`}>
          <span className="toast-icon">
            {toast.type === 'success' && <CheckCircle size={18} />}
            {toast.type === 'error' && <AlertTriangle size={18} />}
            {toast.type === 'info' && <StopCircle size={18} />}
          </span>
          <span className="toast-message">{toast.message}</span>
          <button className="toast-close" onClick={() => setToast(null)}>×</button>
        </div>
      )}

      <header className="topbar">
        <div className="topbar-logo-section">
          <img src={logo} alt="Logo" className="topbar-logo" />
        </div>

        <nav className="topbar-nav">
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
        </nav>

        <div className="topbar-right">
          <div className="profile-dropdown-wrapper">
            <button
              className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => setProfileDropdownOpen(prev => !prev)}
            >
              <CircleUser size={16} />
              <span>Profile</span>
              {profileDropdownOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {profileDropdownOpen && (
              <div className="profile-submenu">
                <button className="submenu-item" onClick={() => handleNavigation('/profile', 'profile')}>
                  <User size={14} /><span>Edit Profile</span>
                </button>
                <button className="submenu-item" onClick={() => handleNavigation('/profile', 'profile')}>
                  <Bell size={14} /><span>Edit Notification</span>
                </button>
                <button className="submenu-item" onClick={() => handleNavigation('/profile', 'profile')}>
                  <HelpCircle size={14} /><span>Help Center</span>
                </button>
                <button className="submenu-item" onClick={() => handleNavigation('/profile', 'profile')}>
                  <Settings size={14} /><span>Settings</span>
                </button>
              </div>
            )}
          </div>

          <button className="nav-item logout" onClick={handleLogoutClick}>
            <LogOut size={16} />
            <span>Log Out</span>
          </button>
        </div>
      </header>

      <div className="main-content">
        <div className="unified-dashboard">
          <div className="dashboard-header">
            <h1>Dashboard</h1>
            <p>Real-time monitoring and control interface</p>
          </div>
          <div className="dashboard-content">

            <div className="status-cards">
              <div className="status-card">
                <div className="status-content">
                  <div className="status-icon"><CheckCircle size={22} /></div>
                  <div className="status-label">System Status</div>
                  <div className="status-value">{sensorData.status}</div>
                </div>
              </div>

              <div className="status-card">
                <div className="status-content">
                  <div className="status-icon" style={{ backgroundColor: '#fef3c7', color: '#f59e0b' }}>
                    <Clock size={22} />
                  </div>
                  <div className="status-label">Drying Time</div>
                  <div className="status-value" style={{ fontSize: '18px', fontFamily: 'monospace' }}>
                    {formatDryingTime(dryingSeconds)}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid-container">
              <div className="sensor-readings">
                <h2>Sensor Readings</h2>
                <div className="sensors-grid">

                  <div className="sensor-card">
                    <div className="sensor-icon orange"><Thermometer size={24} /></div>
                    <div className="sensor-label">Temperature</div>
                    <div className="sensor-value-sm">{(sensorData.temperature || 0).toFixed(1)}°C</div>
                    <div className="progress-bar">
                      <div className="progress-fill orange" style={{ width: `${Math.min(((sensorData.temperature || 0) / 45) * 100, 100)}%` }}></div>
                    </div>
                    <div className="sensor-range">Range: 40-45°C</div>
                  </div>

                  <div className="sensor-card">
                    <div className="sensor-icon cyan"><Droplets size={24} /></div>
                    <div className="sensor-label">Humidity</div>
                    <div className="sensor-value-sm">{(sensorData.humidity || 0).toFixed(1)}%</div>
                    <div className="progress-bar">
                      <div className="progress-fill cyan" style={{ width: `${sensorData.humidity || 0}%` }}></div>
                    </div>
                    <div className="sensor-range">Target: &lt;100%</div>
                  </div>

                  <div className="sensor-card">
                    <div className="sensor-icon cyan"><Waves size={24} /></div>
                    <div className="sensor-label">Moisture Content</div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '8px' }}>
                      {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={`moisture-${i}`} style={{ textAlign: 'center' }}>
                          <div className="sensor-sublabel">TRAY {i}</div>
                          <div className="sensor-value-sm">{(sensorData[`moisture${i}`] || 0).toFixed(1)}%</div>
                          <div className="progress-bar">
                            <div
                              className="progress-fill cyan"
                              style={{ width: `${Math.min(((sensorData[`moisture${i}`] || 0) / 14) * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="sensor-avg-row" style={{ marginTop: '10px' }}>
                      <span className="sensor-avg-label">Average Moisture</span>
                      <div className="progress-bar">
                        <div
                          className="progress-fill cyan"
                          style={{ width: `${Math.min(((sensorData.moistureavg || 0) / 14) * 100, 100)}%` }}
                        />
                      </div>
                      <div className="sensor-avg-value">{(sensorData.moistureavg || 0).toFixed(2)}%</div>
                    </div>

                    <div className="sensor-range">Target: 13-14%</div>
                  </div>

                  <div className="sensor-card">
                    <div className="sensor-icon green"><Weight size={24} /></div>
                    <div className="sensor-label">Weight</div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '8px' }}>
                      {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={`weight-tray-${i}`} style={{ textAlign: 'center' }}>
                          <div className="sensor-sublabel">TRAY {i}</div>
                          <div className="weight-before-after">
                            <div className="weight-ba-item">
                              <div className="weight-ba-label">B</div>
                              <div className="sensor-value-sm" style={{ fontSize: '15px' }}>{(sensorData[`weightbefore${i}`] || 0).toFixed(1)}kg</div>
                            </div>
                            <div className="weight-ba-divider" />
                            <div className="weight-ba-item">
                              <div className="weight-ba-label after">A</div>
                              <div className="sensor-value-sm" style={{ fontSize: '15px' }}>{(sensorData[`weightafter${i}`] || 0).toFixed(1)}kg</div>
                            </div>
                          </div>
                          <div className="progress-bar">
                            <div
                              className="progress-fill green"
                              style={{ width: `${Math.min(((sensorData[`weightafter${i}`] || 0) / 2) * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="sensor-range" style={{ marginTop: '8px' }}>B = Before &nbsp;·&nbsp; A = After &nbsp;·&nbsp; Initial: 1.5kg</div>
                  </div>

                </div>
              </div>

              <div className="system-controls">
                <div className="controls-header">
                  <h2>System Controls</h2>
                </div>

                {/* Temperature Selector */}
                <div className="control-group">
                  <label className="control-group-label">
                    <Thermometer size={14} style={{ color: '#f97316' }} />
                    Target Temperature (°C)
                  </label>
                  <div className="selector-buttons temp-grid">
                    {[40, 41, 42, 43, 44, 45].map(temp => (
                      <button
                        key={temp}
                        className={`selector-btn temp-btn ${selectedTemp === temp ? 'selected-temp' : ''}`}
                        onClick={() => setSelectedTemp(temp)}
                      >
                        {temp}°
                      </button>
                    ))}
                  </div>
                </div>

                {/* Moisture Selector */}
                <div className="control-group">
                  <label className="control-group-label">
                    <Waves size={14} style={{ color: '#06b6d4' }} />
                    Target Moisture (%)
                  </label>
                  <div className="selector-buttons">
                    {[13, 14].map(moisture => (
                      <button
                        key={moisture}
                        className={`selector-btn moisture-btn ${selectedMoisture === moisture ? 'selected-moisture' : ''}`}
                        onClick={() => setSelectedMoisture(moisture)}
                      >
                        {moisture}%
                      </button>
                    ))}
                  </div>
                </div>

                {/* Next Tray for Weighing */}
                <div className="control-group">
                  <label className="control-group-label">
                    <Weight size={14} style={{ color: '#10b981' }} />
                    Tray for Weighing
                  </label>
                  <div className="tray-weighing-row">
                    <div className="tray-indicator">
                      <span className="tray-indicator-label">Current Tray</span>
                      <span className="tray-indicator-value">TRAY {currentTray}</span>
                    </div>
                    <button
                      className="next-tray-btn"
                      onClick={() => setCurrentTray(prev => prev >= 6 ? 1 : prev + 1)}
                    >
                      Next Tray
                    </button>
                  </div>
                  <div className="tray-dots">
                    {[1,2,3,4,5,6].map(i => (
                      <span
                        key={i}
                        className={`tray-dot ${i === currentTray ? 'tray-dot-active' : i < currentTray ? 'tray-dot-done' : ''}`}
                      />
                    ))}
                  </div>
                </div>

                <div className="control-buttons">
                  <button
                    className={`start-button ${isProcessing ? 'processing' : ''}`}
                    onClick={handleApply}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (<><span className="processing-dot"></span>Processing...</>) : 'Start'}
                  </button>
                  <button className="stop-button" onClick={handleStop} disabled={!isProcessing}>
                    <StopCircle size={18} />
                    Stop
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

    </div>
  );
}