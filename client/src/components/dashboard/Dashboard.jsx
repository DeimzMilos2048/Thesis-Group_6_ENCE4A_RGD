import { useState, useEffect } from 'react';
import { Activity, BarChart2, Bell, CircleUser, Clock, Settings, AlertTriangle, LogOut, Thermometer, Droplets, Waves, Weight, CheckCircle, StopCircle, ChevronDown, ChevronUp, User, HelpCircle } from 'lucide-react';
import './Dashboard.css';
import { useNavigate, useLocation } from 'react-router-dom';
import authService from '../../api/authService';
import logo from "../../assets/images/logo2.png";
import { useSocket } from '../../contexts/SocketContext.js';

export default function RiceDryingDashboard({ view }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dryingSeconds, setDryingSeconds] = useState(0);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [sensorData, setSensorData] = useState({
    temperature: 0,
    humidity: 0,
    moisture1: 0,
    moisture2: 0,
    moisture3: 0,
    moisture4: 0,
    moisture5: 0,
    moisture6: 0,
    weight1: 0,
    weight2: 0,
    weight3: 0,
    weight4: 0,
    weight5: 0,
    weight6: 0,
    status: 'Idle'
  });

  const navigate = useNavigate();
  const location = useLocation();
  const { socket, sensorData: socketSensorData, chartData, isConnected } = useSocket();

  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/analytics')) setActiveTab('analytics');
    else if (path.includes('/history')) setActiveTab('history');
    else if (path.includes('/notification')) setActiveTab('notification');
    else if (path.includes('/profile')) setActiveTab('profile');
    else setActiveTab('dashboard');
  }, [location]);

  useEffect(() => {
    if (socketSensorData) setSensorData(socketSensorData);
  }, [socketSensorData]);

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

  useEffect(() => {
  let interval = null;
  if (isProcessing) {
    interval = setInterval(() => {
      setDryingSeconds(prev => prev + 1);
    }, 1000);
  } else {
    setDryingSeconds(0);
  }
  return () => clearInterval(interval);
}, [isProcessing]);

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

  const handleApply = () => {
    console.log("Applied");
    setIsProcessing(true);
    alert("Drying process started.");
  };

  const handleStop = () => {
    console.log("Stop command triggered");
    setIsProcessing(false);
    alert("Drying process stopped.");
  };

  const formatDryingTime = (seconds) => {
  const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
};


  return (
    <div className="dashboard-container">

      {/* Error Banner */}
      {error && (
        <div className="error-banner">
          <AlertTriangle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Loading Overlay */}
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
              <p>Are you sure you want to log out?</p>
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
              onClick={() => {
                setProfileDropdownOpen(prev => !prev);
              }}
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
                      <div className="progress-fill orange" style={{ width: `${Math.min(((sensorData.temperature || 0) / 60) * 100, 100)}%` }}></div>
                    </div>
                    <div className="sensor-range">Range: 40-50°C</div>
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
                    <div className="six-sensor-container">
                      <div className="six-sensor-column">
                        {[1, 2].map(i => (
                          <div className="six-sensor-item" key={`m-l-${i}`}>
                            <div className="sensor-sublabel">TRAY{i}</div>
                            <div className="sensor-value-sm">{(sensorData[`moisture${i}`] || 0).toFixed(1)}%</div>
                            <div className="progress-bar">
                              <div className="progress-fill cyan" style={{ width: `${Math.min(((sensorData[`moisture${i}`] || 0) / 14) * 100, 100)}%` }}></div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="six-sensor-divider"></div>
                      <div className="six-sensor-column">
                        {[3, 4].map(i => (
                          <div className="six-sensor-item" key={`m-m-${i}`}>
                            <div className="sensor-sublabel">TRAY{i}</div>
                            <div className="sensor-value-sm">{(sensorData[`moisture${i}`] || 0).toFixed(1)}%</div>
                            <div className="progress-bar">
                              <div className="progress-fill cyan" style={{ width: `${Math.min(((sensorData[`moisture${i}`] || 0) / 14) * 100, 100)}%` }}></div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="six-sensor-divider"></div>
                      <div className="six-sensor-column">
                        {[5, 6].map(i => (
                          <div className="six-sensor-item" key={`m-r-${i}`}>
                            <div className="sensor-sublabel">TRAY{i}</div>
                            <div className="sensor-value-sm">{(sensorData[`moisture${i}`] || 0).toFixed(1)}%</div>
                            <div className="progress-bar">
                              <div className="progress-fill cyan" style={{ width: `${Math.min(((sensorData[`moisture${i}`] || 0) / 14) * 100, 100)}%` }}></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="sensor-range">Target: 13-14%</div>
                  </div>

                  <div className="sensor-card">
                  <div className="sensor-icon green"><Weight size={24} /></div>
                  <div className="sensor-label">Weight</div>

                  {/* BEFORE */}
                  <div style={{ fontSize: '10px', fontWeight: '600', color: '#9ca3af', marginBottom: '4px', textAlign: 'center', letterSpacing: '0.5px' }}>BEFORE</div>
                  <div className="six-sensor-container">
                    <div className="six-sensor-column">
                      {[1].map(i => (
                        <div className="six-sensor-item" key={`wb-l-${i}`}>
                          <div className="sensor-sublabel">TRAY{i}</div>
                          <div className="sensor-value-sm">{(sensorData[`weight${i}`] || 0).toFixed(1)}kg</div>
                          <div className="progress-bar">
                            <div className="progress-fill green" style={{ width: `${Math.min(((sensorData[`weight${i}`] || 0) / 2) * 100, 100)}%` }}></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ height: '1px', backgroundColor: '#e5e7eb', margin: '6px 0' }}></div>

                  {/* AFTER */}
                  <div style={{ fontSize: '10px', fontWeight: '600', color: '#9ca3af', marginBottom: '4px', textAlign: 'center', letterSpacing: '0.5px' }}>AFTER</div>
                  <div className="six-sensor-container">
                    <div className="six-sensor-column">
                      {[1].map(i => (
                        <div className="six-sensor-item" key={`wa-l-${i}`}>
                          <div className="sensor-sublabel">TRAY{i}</div>
                          <div className="sensor-value-sm">{(sensorData[`weight${i}`] || 0).toFixed(1)}kg</div>
                          <div className="progress-bar">
                            <div className="progress-fill green" style={{ width: `${Math.min(((sensorData[`weight${i}`] || 0) / 2) * 100, 100)}%` }}></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="sensor-range">Initial: 2kg</div>
                </div>

                </div>
              </div>

              <div className="system-controls">
                <div className="controls-header">
                  <h2>System Controls</h2>
                </div>

                <div className="control-buttons">
                  <button
                    className={`start-button ${isProcessing ? 'processing' : ''}`}
                    onClick={handleApply}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (<><span className="processing-dot"></span>Processing...</>) : 'Start'}
                  </button>
                  <button className="stop-button" onClick={handleStop}>
                    <StopCircle size={20} /> 
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