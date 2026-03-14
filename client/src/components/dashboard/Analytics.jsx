import { useState, useEffect } from 'react';
import { Activity, AlertTriangle, BarChart2, Bell, CircleUser, Clock, LogOut, Thermometer, Droplets, Waves, ChevronDown, ChevronUp, User, HelpCircle, Settings } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import './Dashboard.css';
import './Analytics.css';
import { useNavigate, useLocation } from 'react-router-dom';
import authService from '../../api/authService';
import dryerService from '../../api/dryerService';
import logo from "../../assets/images/logo2.png";
import { useSocket } from '../../contexts/SocketContext.js';
import { useWeight } from '../../contexts/WeightContext.js';
import { useDrying } from '../../contexts/DryingContext.js';
import WeightGroupedBarChart from './WeightGroupedBarChart.jsx';
import useNotificationService from './Usenotificationservice.js';

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
    weight1: null, 
  });

  const { 
  socket, 
  sensorData, 
  chartData: chartDataFromSocket, 
  latestValues: latestValuesFromSocket, 
  isConnected 
} = useSocket();

  const { savedWeights, savedAfterWeights } = useWeight();

  const { 
    isProcessing, 
    dryingSeconds, 
    selectedTemp, 
    selectedMoisture, 
    currentTray 
  } = useDrying();

  // Add notification service for badge
  const { unreadCount } = useNotificationService(null, 15000);

  // Function to save all current data to localStorage
  const saveAllData = () => {
    try {
      // Save weight data
      localStorage.setItem('savedWeights', JSON.stringify(savedWeights));
      localStorage.setItem('savedAfterWeights', JSON.stringify(savedAfterWeights));
      
      // Save drying data
      localStorage.setItem('isProcessing', JSON.stringify(isProcessing));
      localStorage.setItem('dryingSeconds', JSON.stringify(dryingSeconds));
      localStorage.setItem('selectedTemp', JSON.stringify(selectedTemp));
      localStorage.setItem('selectedMoisture', JSON.stringify(selectedMoisture));
      localStorage.setItem('currentTray', JSON.stringify(currentTray));
      
      // Save timestamp for last save
      localStorage.setItem('lastDataSave', JSON.stringify(new Date().toISOString()));
      
      console.log('All data saved successfully at:', new Date().toISOString());
    } catch (error) {
      console.error('Error saving data:', error);
    }
  };

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
    saveAllData();
    setActiveTab(tab);
    navigate(path);
  };

  const handleLogoutClick = () => {
    saveAllData();
    setShowLogoutConfirm(true);
  };

  const handleLogoutConfirm = async () => {
    try {
      // Save all data before logging out
      saveAllData();
      
      // Stop drying process if running
      await dryerService.stopDrying().catch(() => {});
      
      // Clear sensor-related data from localStorage
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

  const handleLogoutCancel = () => {
    setShowLogoutConfirm(false);
  };

  // Save data when page is about to unload (browser close, tab close, etc.)
  useEffect(() => {
    const handleBeforeUnload = () => {
      saveAllData();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      saveAllData(); // Also save when component unmounts
    };
  }, [savedWeights, savedAfterWeights, isProcessing, dryingSeconds, selectedTemp, selectedMoisture, currentTray]);

  const fmt = (val, unit) => val === null ? 'N/A' : `${Number(val).toFixed(1)}${unit}`;

  const DualLineGraph = ({ data, color1, color2, unit, minValue, maxValue }) => (
    <ResponsiveContainer width="100%" height="100%" minWidth={0} aspect={undefined}>
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
    <ResponsiveContainer width="100%" height="100%" minWidth={0} aspect={undefined}>
      <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
        <XAxis dataKey="time" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} unit={unit} domain={[minValue, maxValue]} />
        <Tooltip />
        <Line type="monotone" dataKey="value" name="Sensor 1" stroke={color} strokeWidth={2.5} dot={{ r: 3 }} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );

  const MultiLineGraph = ({ arrays, colors, names, unit, minValue, maxValue }) => {
    const data = (arrays[0] || []).map((item, index) => {
      const point = { time: item?.time ?? '' };
      arrays.forEach((arr, i) => {
        point[`sensor${i + 1}`] = arr[index]?.value ?? null;
      });
      return point;
    });

    return (
      <ResponsiveContainer width="100%" height="100%" minWidth={0} aspect={undefined}>
        <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="time" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} unit={unit} domain={[minValue, maxValue]} />
          <Tooltip />
          <Legend />
          {arrays.map((_, i) => (
            <Line
              key={i}
              type="monotone"
              dataKey={`sensor${i + 1}`}
              name={names[i]}
              stroke={colors[i]}
              strokeWidth={2.5}
              dot={{ r: 3 }}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  };

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
                
      {/* Topbar */}
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
            {unreadCount > 0 && (
              <span className="notif-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
            )}
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

      {/* Main Content for Analytics */}
      <div className="main-content">
        <div className="unified-dashboard">
          <div className="dashboard-header">
            <h1>Analytics</h1>
            <p>View your rice drying performance metrics</p>
          </div>

          <div className="analytics-content">

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
                  maxValue={60}
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

            {/* ── Moisture (6 sensors) ───────────────────────────────── */}
            <div className="analytics-cards">
              <h3 className="analytics-card-title">
                <div className="analytics-card-title-left">
                  <Droplets size={24} /> Moisture Content
                </div>
                <div className="sensor-badges">
                  {[1, 2, 3, 4, 5, 6].map(i => {
                    const isSelected = savedWeights[i]?.frozen;
                    if (!isSelected) return null;
                    const moistureValue = latestValuesFromSocket[`moisture${i}`];
                    return (
                      <span 
                        key={`moisture-badge-${i}`}
                        className="sensor-badge" 
                        style={{ 
                          color: ['#22c55e', '#16a34a', '#15803d', '#166534', '#14532d', '#052e16'][i-1], 
                          backgroundColor: 'white',
                          border: '2px solid #10b981',
                          boxShadow: '0 0 0 2px rgba(16, 185, 129, 0.3)'
                        }}
                      >
                        S{i}: {fmt(moistureValue, '%')}
                      </span>
                    );
                  })}
                  {Object.keys(savedWeights).filter(trayNum => savedWeights[trayNum]?.frozen).length === 0 && (
                    <span className="sensor-badge" style={{ color: '#9ca3af', backgroundColor: 'white' }}>
                      No trays selected
                    </span>
                  )}
                </div>
              </h3>
              <div className="analytics-card-status">
                {Object.keys(savedWeights).filter(trayNum => savedWeights[trayNum]?.frozen).length > 0 ? (
                  <MultiLineGraph
                    arrays={[1, 2, 3, 4, 5, 6].filter(i => savedWeights[i]?.frozen).map(i => 
                      Array.isArray(chartDataFromSocket[`moisture${i}`]) ? chartDataFromSocket[`moisture${i}`] : []
                    )}
                    colors={[1, 2, 3, 4, 5, 6].filter(i => savedWeights[i]?.frozen).map(i => 
                      ['#22c55e', '#16a34a', '#15803d', '#166534', '#14532d', '#052e16'][i-1]
                    )}
                    names={[1, 2, 3, 4, 5, 6].filter(i => savedWeights[i]?.frozen).map(i => `Sensor ${i}`)}
                    unit="%"
                    minValue={0}
                    maxValue={30}
                  />
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', flexDirection: 'column' }}>
                    <Droplets size={48} style={{ color: '#d1d5db', marginBottom: '16px' }} />
                    <p style={{ color: '#9ca3af', textAlign: 'center' }}>
                      No trays selected<br />
                      <span style={{ fontSize: '14px' }}>Select and save trays from Dashboard to view moisture data</span>
                    </p>
                  </div>
                )}
              </div>
            </div>

            <WeightGroupedBarChart savedWeights={savedWeights} savedAfterWeights={savedAfterWeights} />

          </div>
        </div>
      </div>
    </div>
  );
}