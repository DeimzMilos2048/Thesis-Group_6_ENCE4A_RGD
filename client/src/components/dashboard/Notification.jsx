import React, { useState, useEffect } from 'react';
import { Activity, BarChart2, Bell, CircleUser,Clock, AlertTriangle, LogOut, Thermometer, Droplets, Waves, Weight, CheckCircle, Server } from 'lucide-react';
import './Dashboard.css';
import './Notification.css';
import { useNavigate, useLocation } from 'react-router-dom';
import authService from '../../api/authService';
import axios from '../../utils/axios';
import logo from "../../assets/images/logo2.png";

export default function Notification({ view }) {

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('analytics');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [filter, setFilter] = useState("all");
  const [alerts, setAlerts] = useState([]);
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
    const fetchNotifications = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/notifications');
        if (isMounted) {
          setAlerts(response.data);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to fetch notifications');
          console.error('Error fetching notifications:', err);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchNotifications();

    return () => {
      isMounted = false;
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

  const handleAcknowledge = async () => {
    if (selectedAlert && selectedAlert._id) {
      try {
        await axios.patch(`/notifications/${selectedAlert._id}/read`);
        setAlerts(alerts.map(a => 
          a._id === selectedAlert._id ? { ...a, isRead: true } : a
        ));
        setSelectedAlert(null);
      } catch (err) {
        setError('Failed to acknowledge notification');
        console.error('Error acknowledging notification:', err);
      }
    }
  };

  const mapNotificationType = (type) => {
    if (type === 'CRITICAL') return 'critical';
    if (type === 'WARNING') return 'warning';
    return 'info';
  };

  const formatTime = (createdAt) => {
    if (!createdAt) return 'Just now';
    const date = new Date(createdAt);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const getAlertStatus = (alert) => {
    return alert.isRead ? 'Acknowledged' : 'New';
  };

  const filteredAlerts = Array.isArray(alerts) 
    ? (filter === "all" ? alerts : alerts.filter(a => mapNotificationType(a.type) === filter))
    : [];

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
          <p> Active</p>
        </div>
      </div>

      <div className="summary-card warning">
        <Waves />
        <div>
          <h3>Warning</h3>
          <p> Active</p>
        </div>
      </div>

      <div className="summary-card info">
        <CheckCircle />
        <div>
          <h3>Info</h3>
          <p> Active</p>
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
      {filteredAlerts.length > 0 ? (
        filteredAlerts.map(alert => (
          <div
            key={alert._id || alert.id}
            className={`alert-card ${mapNotificationType(alert.type)}`}
            onClick={() => setSelectedAlert(alert)}
          >
            <div className="alert-left">
              {mapNotificationType(alert.type) === "critical" && <AlertTriangle />}
              {mapNotificationType(alert.type) === "warning" && <Waves />}
              {mapNotificationType(alert.type) === "info" && <CheckCircle />}
            </div>

            <div className="alert-center">
              <h4>{alert.title}</h4>
              <p>{alert.message}</p>
              <small>
                <Thermometer size={14}/> {alert.sensorData?.temperature || 'N/A'}°C | 
                <Droplets size={14}/> {alert.sensorData?.moistureContent || 'N/A'}%
              </small>
            </div>

            <div className="alert-right">
              <span className="status">{getAlertStatus(alert)}</span>
              <span className="time">{formatTime(alert.createdAt)}</span>
            </div>
          </div>
        ))
      ) : (
        <p className="no-alerts">No alerts available</p>
      )}
    </div>

    {/* Alert Modal */}
    {selectedAlert && (
      <div className="modal-overlay" onClick={() => setSelectedAlert(null)}>
        <div className="alert-modal" onClick={e => e.stopPropagation()}>
          <h2>{selectedAlert.title}</h2>
          <p>{selectedAlert.message}</p>

          <div className="sensor-grid">
            <div><Thermometer /> {selectedAlert.sensorData?.temperature || 'N/A'}°C</div>
            <div><Droplets /> {selectedAlert.sensorData?.moistureContent || 'N/A'}%</div>
            <div><Waves /> {selectedAlert.sensorData?.humidity || 'N/A'}%</div>
            <div><Weight /> {selectedAlert.sensorData?.weight || 'N/A'}kg</div>
          </div>

          <div className="modal-actions">
            <button className='acknowledge' onClick={handleAcknowledge}>
              {selectedAlert.isRead ? 'Already Acknowledged' : 'Acknowledge'}
            </button>
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