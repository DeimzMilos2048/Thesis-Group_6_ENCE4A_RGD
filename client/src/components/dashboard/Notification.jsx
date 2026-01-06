import React, { useState, useEffect } from 'react';
import { Activity, BarChart2, Bell, CircleUser,Clock, AlertTriangle, LogOut, Thermometer, Droplets, Waves, Weight, CheckCircle, Server } from 'lucide-react';
import './Dashboard.css';
import './Notification.css';
import { useNavigate, useLocation } from 'react-router-dom';
import authService from '../../api/authService';
import logo from "../../assets/images/logo2.png";

export default function Notification({ view }) {

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('analytics');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
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

  const [selectedAlert, setSelectedAlert] = useState(null);
  const [filter, setFilter] = useState("all");

  const alerts = [
    {
      id: 1,
      type: "critical",
      title: "High Temperature Detected",
      message: "Dryer temperature exceeded safe limit.",
      temp: "63°C",
      moisture: "18%",
      humidity: "82%",
      weight: "24kg",
      time: "10 min ago",
      status: "New"
    },
    {
      id: 2,
      type: "warning",
      title: "Slow Moisture Reduction",
      message: "Moisture is not decreasing as expected.",
      temp: "52°C",
      moisture: "16%",
      humidity: "78%",
      weight: "25kg",
      time: "15 min ago",
      status: "Acknowledged"
    },
     {
      id: 3,
      type: "info",
      title: "Moisture Detected Stable",
      message: "Moisture is equal as expected.",
      temp: "52°C",
      moisture: "14%",
      humidity: "90%",
      weight: "25kg",
      time: "30 min ago",
      status: "Acknowledged"
    },
    
  ];

  const filteredAlerts =
  filter === "all" ? alerts : alerts.filter(a => a.type === filter);

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
          <p>Loading Notification...</p>
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

      {/* Main Content for Notification*/}
      <div className="main-content">
        <div className="unified-dashboard">

          {/* Header */}
          <div className="dashboard-header">
            <h1>System Alerts</h1>
            <p>View Session and System Notifications.</p>
          </div>


    {/* Summary Cards */}
    <div className="alert-summary">
      <div className="summary-card critical">
        <AlertTriangle />
        <div>
          <h3>Critical</h3>
          <p>1 Active</p>
        </div>
      </div>

      <div className="summary-card warning">
        <Waves />
        <div>
          <h3>Warning</h3>
          <p>1 Active</p>
        </div>
      </div>

      <div className="summary-card info">
        <CheckCircle />
        <div>
          <h3>Info</h3>
          <p>1 Active</p>
        </div>
      </div>
    </div>

    {/* Filters */}
    <div className="alert-filters">
      <button onClick={() => setFilter("all")}>All</button>
      <button onClick={() => setFilter("critical")}>Critical</button>
      <button onClick={() => setFilter("warning")}>Warning</button>
    </div>

    {/* Alert List */}
    <div className="alert-list">
      {filteredAlerts.map(alert => (
        <div
          key={alert.id}
          className={`alert-card ${alert.type}`}
          onClick={() => setSelectedAlert(alert)}
        >
          <div className="alert-left">
            {alert.type === "critical" && <AlertTriangle />}
            {alert.type === "warning" && <Waves />}
            {alert.type === "info" && <CheckCircle />}
          </div>

          <div className="alert-center">
            <h4>{alert.title}</h4>
            <p>{alert.message}</p>
            <small>
              <Thermometer size={14}/> {alert.temp} | 
              <Droplets size={14}/> {alert.moisture}
            </small>
          </div>

          <div className="alert-right">
            <span className="status">{alert.status}</span>
            <span className="time">{alert.time}</span>
          </div>
        </div>
      ))}
    </div>

    {/* Alert Modal */}
    {selectedAlert && (
      <div className="modal-overlay" onClick={() => setSelectedAlert(null)}>
        <div className="alert-modal" onClick={e => e.stopPropagation()}>
          <h2>{selectedAlert.title}</h2>
          <p>{selectedAlert.message}</p>

          <div className="sensor-grid">
            <div><Thermometer /> {selectedAlert.temp}</div>
            <div><Droplets /> {selectedAlert.moisture}</div>
            <div><Waves /> {selectedAlert.humidity}</div>
            <div><Weight /> {selectedAlert.weight}</div>
          </div>

          <div className="modal-actions">
            <button className='acknowledge'>Acknowledge</button>
            <button onClick={() => setSelectedAlert(null)}>Close</button>
          </div>
        </div>
        </div>
    )}

        </div>
      </div>
    </div>
  );
}