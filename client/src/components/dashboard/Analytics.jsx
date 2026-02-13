import { useState, useEffect } from 'react';
import { Activity, AlertTriangle, BarChart2, Bell, CircleUser, Clock, LogOut, Thermometer, Droplets, Waves, Weight } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import './Dashboard.css';
import './Analytics.css';
import { useNavigate, useLocation } from 'react-router-dom';
import authService from '../../api/authService';
import logo from "../../assets/images/logo2.png";

export default function Analytics({ view }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('analytics'); 
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  const [chartData] = useState({
    moisture: [],
    humidity: [],
    temperature: [],
    weight: []
  });

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

  const LiveLineGraph = ({ data, color, unit }) => (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
        <XAxis dataKey="time" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} unit={unit} />
        <Tooltip />
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );

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
          <button 
            className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => handleNavigation('/profile', 'profile')}
          >
            <CircleUser size={16} />
            <span>Profile</span>
          </button>

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

      {/* Main Content for Analytics*/}
      <div className="main-content">
        <div className="unified-dashboard">
          {/* Header */}
          <div className="dashboard-header">
            <h1>Analytics</h1>
            <p>View your rice drying performance metrics</p>
          </div>

          {/* Analytics Content */}
          <div className="analytics-content">
            <div className="analytics-cards">
              <h3 className="analytics-card-title">
                <Droplets size={24} /> Moisture Content
              </h3>
              <div className="analytics-card-status">
                <LiveLineGraph data={chartData.moisture} color="#22c55e" unit="%" />
              </div>
            </div>

            <div className="analytics-cards">
              <h3 className="analytics-card-title">
                <Waves size={24} /> Humidity
              </h3>
              <div className="analytics-card-status">
                <LiveLineGraph data={chartData.humidity} color="#3b82f6" unit="%" />
              </div>
            </div>

            <div className="analytics-cards">
              <h3 className="analytics-card-title">
                <Thermometer size={24} /> Temperature
              </h3>
              <div className="analytics-card-status">
                <LiveLineGraph data={chartData.temperature} color="#ef4444" unit="°C" />
              </div>
            </div>

            <div className="analytics-cards">
              <h3 className="analytics-card-title">
                <Weight size={24} /> Weight
              </h3>
              <div className="analytics-card-status">
                <LiveLineGraph data={chartData.weight} color="#a855f7" unit="kg" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}