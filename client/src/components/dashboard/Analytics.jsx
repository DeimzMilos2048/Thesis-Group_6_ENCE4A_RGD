import { useState, useEffect } from 'react';
import { Activity, AlertTriangle, BarChart2, Bell, CircleUser, Clock, LogOut, Thermometer, Droplets, Waves, Weight, ChevronDown, ChevronUp, User, HelpCircle, Settings } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import './Dashboard.css';
import './Analytics.css';
import { useNavigate, useLocation } from 'react-router-dom';
import authService from '../../api/authService';
import logo from "../../assets/images/logo2.png";
import { useSocket } from '../../contexts/SocketContext.js';

export default function Analytics({ view }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('analytics'); 
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  const [latestValues, setLatestValues] = useState({
    moisture1: null, moisture2: null,
    humidity: null,
    temperature: null,
    weight1: null, weight2: null,
  });

  const { 
  socket, 
  sensorData, 
  chartData: chartDataFromSocket, 
  latestValues: latestValuesFromSocket, 
  isConnected 
} = useSocket();

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

  const fmt = (val, unit) => val === null ? 'N/A' : `${Number(val).toFixed(1)}${unit}`;

  const DualLineGraph = ({ data, color1, color2, unit, minValue, maxValue }) => (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
        <XAxis dataKey="time" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} unit={unit} domain={[minValue, maxValue]} />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="sensor1" name="Sensor 1" stroke={color1} strokeWidth={2.5} dot={{ r: 3 }} isAnimationActive={false} />
        <Line type="monotone" dataKey="sensor2" name="Sensor 2" stroke={color2} strokeWidth={2.5} dot={{ r: 3 }} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );

  const SingleLineGraph = ({ data, color, unit, minValue, maxValue }) => (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
        <XAxis dataKey="time" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} unit={unit} domain={[minValue, maxValue]} />
        <Tooltip />
        <Line type="monotone" dataKey="value" name="Sensor 1" stroke={color} strokeWidth={2.5} dot={{ r: 3 }} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );

  const combineDualData = (arr1 = [], arr2 = []) => {

  if (!Array.isArray(arr1)) arr1 = [];
  if (!Array.isArray(arr2)) arr2 = [];

  return arr1.map((item, index) => ({
    time: item?.time ?? '',
    sensor1: item?.value ?? null,
    sensor2: arr2[index]?.value ?? null
  }));

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
          <p>Loading analytics...</p>
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
          {/* Profile with dropdown */}
          <div className="nav-item-dropdown">
            <button
              className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => {
                handleNavigation('/profile', 'profile');
                setProfileDropdownOpen(prev => !prev);
              }}
            >
              <CircleUser size={16} />
              <span>Profile</span>
              {profileDropdownOpen ? <ChevronUp size={14} style={{ marginLeft: 'auto' }} /> : <ChevronDown size={14} style={{ marginLeft: 'auto' }} />}
            </button>

            {profileDropdownOpen && (
              <div className="nav-submenu">
                <button className="nav-subitem" onClick={() => handleNavigation('/profile', 'profile')}>
                  <User size={14} />
                  <span>Edit Profile</span>
                </button>
                <button className="nav-subitem" onClick={() => handleNavigation('/profile', 'profile')}>
                  <Bell size={14} />
                  <span>Edit Notification</span>
                </button>
                <button className="nav-subitem" onClick={() => handleNavigation('/profile', 'profile')}>
                  <HelpCircle size={14} />
                  <span>Help Center</span>
                </button>
                <button className="nav-subitem" onClick={() => handleNavigation('/profile', 'profile')}>
                  <Settings size={14} />
                  <span>Settings</span>
                </button>
              </div>
            )}
          </div>

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

        <button 
          className="nav-item logout"
          onClick={handleLogoutClick}
        >
          <LogOut size={16} />
          <span>Log Out</span>
        </button>
      </div>

      {/* Main Content for Analytics */}
      <div className="main-content">
        <div className="unified-dashboard">
          <div className="dashboard-header">
            <h1>Analytics</h1>
            <p>View your rice drying performance metrics</p>
          </div>

          <div className="analytics-content">

            {/* ── Moisture (2 sensors) ───────────────────────────────── */}
            <div className="analytics-cards">
              <h3 className="analytics-card-title">
                <div className="analytics-card-title-left">
                  <Droplets size={24} /> Moisture Content
                </div>
                <div className="sensor-badges">
                  <span className="sensor-badge" style={{ color: '#22c55e', backgroundColor: 'white' }}>
                    S1: {fmt(latestValuesFromSocket.moisture1, '%')}
                  </span>
                  <span className="sensor-badge" style={{ color: '#16a34a', backgroundColor: 'white' }}>
                    S2: {fmt(latestValuesFromSocket.moisture2, '%')}
                  </span>
                </div>
              </h3>
              <div className="analytics-card-status">
                <DualLineGraph
                  data={combineDualData(
                    chartDataFromSocket.moisture1,
                    chartDataFromSocket.moisture2
                  )}
                  color1="#22c55e"
                  color2="#16a34a"
                  unit="%"
                  minValue={0}
                  maxValue={100}
                />  
              </div>
            </div>

            {/* ── Humidity (1 sensor) ────────────────────────────────── */}
            <div className="analytics-cards">
              <h3 className="analytics-card-title">
                <div className="analytics-card-title-left">
                  <Waves size={24} /> Humidity
                </div>
                <div className="sensor-badges">
                  <span className="sensor-badge" style={{ color: '#3b82f6', backgroundColor: 'white' }}>
                    {fmt(latestValuesFromSocket.humidity, '%')}
                  </span>
                </div>
              </h3>
              <div className="analytics-card-status">
                <SingleLineGraph
                  data={Array.isArray(chartDataFromSocket.humidity)
                  ? chartDataFromSocket.humidity
                  : []}
                  color="#3b82f6"
                  unit="%"
                  minValue={0}
                  maxValue={100}
                />
              </div>
            </div>

            {/* ── Temperature (1 sensor) ─────────────────────────────── */}
            <div className="analytics-cards">
              <h3 className="analytics-card-title">
                <div className="analytics-card-title-left">
                  <Thermometer size={24} /> Temperature
                </div>
                <div className="sensor-badges">
                  <span className="sensor-badge" style={{ color: '#efb944ff', backgroundColor: 'white' }}>
                    {fmt(latestValuesFromSocket.temperature, '°C')}
                  </span>
                </div>
              </h3>
              <div className="analytics-card-status">
                <SingleLineGraph
                  data={Array.isArray(chartDataFromSocket.temperature)
                    ? chartDataFromSocket.temperature
                    : []}
                  color="#efb944ff"
                  unit="°C"
                  minValue={0}
                  maxValue={100}
                />
              </div>
            </div>

            {/* ── Weight (2 sensors) ─────────────────────────────────── */}
            <div className="analytics-cards">
              <h3 className="analytics-card-title">
                <div className="analytics-card-title-left">
                  <Weight size={24} /> Weight
                </div>
                <div className="sensor-badges">
                  <span className="sensor-badge" style={{ color: '#9E9E9E', backgroundColor: 'white' }}>
                    S1: {fmt(latestValuesFromSocket.weight1, 'kg')}
                  </span>
                  <span className="sensor-badge" style={{ color: '#9E9E9EAD', backgroundColor: 'white' }}>
                    S2: {fmt(latestValuesFromSocket.weight2, 'kg')}
                  </span>
                </div>
              </h3>
              <div className="analytics-card-status">
                <DualLineGraph
                  data={combineDualData(
                    chartDataFromSocket.weight1,
                    chartDataFromSocket.weight2
                  )}
                  color1="#9E9E9E"
                  color2="#9E9E9EAD"
                  unit="kg"
                  minValue={0}
                  maxValue={50}
                />
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}