import React, { useState, useEffect } from 'react';
import { Activity, BarChart2, Bell, CircleUser, Clock, AlertTriangle, LogOut, Thermometer, Droplets, Waves, Weight, CheckCircle, ChevronDown, ChevronUp, User, HelpCircle, Settings } from 'lucide-react';
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
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

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
          const notificationsData = Array.isArray(response.data) ? response.data : [];
          setAlerts(notificationsData);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to fetch notifications');
          console.error('Error fetching notifications:', err);
          setAlerts([]);
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
        setAlerts(prevAlerts => prevAlerts.map(a => 
          a._id === selectedAlert._id ? { ...a, isRead: true } : a
        ));
        setSelectedAlert(null);
      } catch (err) {
        setError('Failed to acknowledge notification');
        console.error('Error acknowledging notification:', err);
      }
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await axios.patch('/notifications/read-all');
      setAlerts(prevAlerts => prevAlerts.map(a => ({ ...a, isRead: true })));
    } catch (err) {
      setError('Failed to mark all as read');
      console.error('Error marking all as read:', err);
    }
  };

  const mapNotificationType = (type) => {
    if (type === 'CRITICAL') return 'critical';
    if (type === 'WARNING') return 'warning';
    if (type === 'STABLE') return 'info';
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

  // Ensure alerts is always an array
  const alertsArray = Array.isArray(alerts) ? alerts : [];

  // Calculate counts
  const criticalCount = alertsArray.filter(a => a.type === 'CRITICAL').length;
  const warningCount = alertsArray.filter(a => a.type === 'WARNING').length;
  const stableCount = alertsArray.filter(a => a.type === 'STABLE').length;
  const unreadCount = alertsArray.filter(a => !a.isRead).length;

  // Filter alerts
  const filteredAlerts = filter === "all" 
    ? alertsArray 
    : alertsArray.filter(a => mapNotificationType(a.type) === filter);

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
          <p>{criticalCount} Active</p>
        </div>
      </div>

      <div className="summary-card warning">
        <Waves />
        <div>
          <h3>Warning</h3>
          <p>{warningCount} Active</p>
        </div>
      </div>

      <div className="summary-card info">
        <CheckCircle />
        <div>
          <h3>Stable</h3>
          <p>{stableCount} Active</p>
        </div>
      </div>
    </div>

    {/* Filters */}
    <div className="alert-filters">
      <button onClick={() => setFilter("all")} className={filter === "all" ? "active" : ""}>
        All
      </button>
      <button onClick={() => setFilter("critical")} className={filter === "critical" ? "active" : ""}>
        Critical
      </button>
      <button onClick={() => setFilter("warning")} className={filter === "warning" ? "active" : ""}>
        Warning
      </button>
      <button onClick={() => setFilter("info")} className={filter === "info" ? "active" : ""}>
        Stable
      </button>
    </div>

    {/* Mark All as Read Button */}
    {unreadCount > 0 && (
      <div className="alert-filters">
        <button onClick={handleMarkAllAsRead} className="mark-all-read">
          Mark All as Read
        </button>
      </div>
    )}

    {/* Alert List */}
    <div className="alert-list" style={{ maxHeight: '420px', overflowY: 'auto', paddingRight: '6px' }}>
      {filteredAlerts.length > 0 ? (
        filteredAlerts.map(alert => (
          <div
            key={alert._id || alert.id}
            className={`alert-card ${mapNotificationType(alert.type)} ${!alert.isRead ? 'unread' : ''}`}
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
                <Droplets size={14}/> M1: {alert.sensorData?.moisture1 || 'N/A'}% M2: {alert.sensorData?.moisture2 || 'N/A'}%
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
            <div><Droplets /> M1: {selectedAlert.sensorData?.moisture1 || 'N/A'}%</div>
            <div><Droplets /> M2: {selectedAlert.sensorData?.moisture2 || 'N/A'}%</div>
            <div><Waves /> {selectedAlert.sensorData?.humidity || 'N/A'}%</div>
            <div><Weight /> W1: {selectedAlert.sensorData?.weight1 || 'N/A'}kg</div>
            <div><Weight /> W2: {selectedAlert.sensorData?.weight2 || 'N/A'}kg</div>
          </div>

          <div className="modal-actions">
            <button 
              className='acknowledge' 
              onClick={handleAcknowledge}
              disabled={selectedAlert.isRead}
            >
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