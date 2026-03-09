import React, { useState, useEffect } from 'react';
import {
  Activity, BarChart2, Bell, CircleUser, Clock, AlertTriangle, LogOut,
  Thermometer, Droplets, Waves, Weight, CheckCircle, ChevronDown, ChevronUp,
  User, HelpCircle, Settings, X,
} from 'lucide-react';
import './Dashboard.css';
import './Notification.css';
import useNotificationService from './Usenotificationservice.js';
import { useNavigate, useLocation } from 'react-router-dom';
import authService from '../../api/authService';
import logo from "../../assets/images/logo2.png";

export default function Notification({ view }) {

  const [loading,            setLoading]            = useState(false);
  const [error,              setError]              = useState(null);
  const [activeTab,          setActiveTab]          = useState('notification');
  const [showLogoutConfirm,  setShowLogoutConfirm]  = useState(false);
  const [selectedAlert,      setSelectedAlert]      = useState(null);
  const [filter,             setFilter]             = useState("all");
  const [profileDropdownOpen,setProfileDropdownOpen]= useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const {
    alerts,
    unreadCount,
    loading: notifLoading,
    error: notifError,
    acknowledgeOne,
    acknowledgeAll,
    markAllAsUnread,
  } = useNotificationService(null, 15000);

  useEffect(() => {
    const path = location.pathname;
    if      (path.includes('/analytics'))    setActiveTab('analytics');
    else if (path.includes('/history'))      setActiveTab('history');
    else if (path.includes('/notification')) setActiveTab('notification');
    else if (path.includes('/profile'))      setActiveTab('profile');
    else                                     setActiveTab('dashboard');
  }, [location]);

  useEffect(() => {
    let isMounted = true;
    const fetchDashboardData = async () => {
      try {
        const t = setTimeout(() => { if (isMounted) setLoading(true); }, 300);
        await authService.getDashboardData();
        clearTimeout(t);
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

  const handleNavigation    = (path, tab) => { setActiveTab(tab); navigate(path); };
  const handleLogoutClick   = ()          => setShowLogoutConfirm(true);
  const handleLogoutCancel  = ()          => setShowLogoutConfirm(false);
  const handleLogoutConfirm = ()          => { authService.logout(); navigate('/login'); };

  const handleAcknowledge = async () => {
    if (selectedAlert?._id) { await acknowledgeOne(selectedAlert._id); setSelectedAlert(null); }
  };

  const mapNotificationType = (type) => {
    if (type === 'CRITICAL') return 'critical';
    if (type === 'WARNING')  return 'warning';
    return 'info';
  };

  const formatTime = (createdAt) => {
    if (!createdAt) return 'Just now';
    const diffMs   = Date.now() - new Date(createdAt).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1)  return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    const h = Math.floor(diffMins / 60);
    if (h < 24)        return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  const getAlertStatus = (alert) => alert.isRead ? 'Acknowledged' : 'New';

  const alertsArray    = Array.isArray(alerts) ? alerts : [];
  const criticalCount  = alertsArray.filter(a => a.type === 'CRITICAL').length;
  const warningCount   = alertsArray.filter(a => a.type === 'WARNING').length;
  const stableCount    = alertsArray.filter(a => a.type === 'STABLE').length;
  const filteredAlerts = filter === "all"
    ? alertsArray
    : alertsArray.filter(a => mapNotificationType(a.type) === filter);

  return (
    <div className="dashboard-container">

      {(error || notifError) && (
        <div className="error-banner"><AlertTriangle size={20}/><span>{error || notifError}</span></div>
      )}
      {(loading || notifLoading) && (
        <div className="loading-overlay"><div className="loading-spinner"/><p>Loading Notification...</p></div>
      )}

      {/* Logout modal */}
      {showLogoutConfirm && (
        <div className="modal-overlay" onClick={handleLogoutCancel}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><LogOut size={24}/><h3>Confirm Logout</h3></div>
            <div className="modal-body"><p>Are you sure, you want to log out?</p></div>
            <div className="modal-footer">
              <button className="modal-button cancel"  onClick={handleLogoutCancel}>Cancel</button>
              <button className="modal-button confirm" onClick={handleLogoutConfirm}>Log Out</button>
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
          <button className={`nav-item ${activeTab==='dashboard'    ?'active':''}`} onClick={()=>handleNavigation('/dashboard','dashboard')}>
            <BarChart2 size={16}/><span>Dashboard</span>
          </button>
          <button className={`nav-item ${activeTab==='analytics'    ?'active':''}`} onClick={()=>handleNavigation('/analytics','analytics')}>
            <Activity size={16}/><span>Analytics</span>
          </button>
          <button className={`nav-item ${activeTab==='history'      ?'active':''}`} onClick={()=>handleNavigation('/history','history')}>
            <Clock size={16}/><span>History</span>
          </button>
          <button className={`nav-item ${activeTab==='notification' ?'active':''}`} onClick={()=>handleNavigation('/notification','notification')}>
            <Bell size={16}/><span>Notification</span>
            {unreadCount > 0 && (
              <span className="notif-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
            )}
          </button>
        </nav>
        <div className="topbar-right">
          <div className="profile-dropdown-wrapper">
            <button className={`nav-item ${activeTab==='profile'?'active':''}`} onClick={()=>setProfileDropdownOpen(p=>!p)}>
              <CircleUser size={16}/><span>Profile</span>
              {profileDropdownOpen ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
            </button>
            {profileDropdownOpen && (
              <div className="profile-submenu">
                <button className="submenu-item" onClick={()=>handleNavigation('/profile','profile')}><User size={14}/><span>Edit Profile</span></button>
                <button className="submenu-item" onClick={()=>handleNavigation('/profile','profile')}><Bell size={14}/><span>Edit Notification</span></button>
                <button className="submenu-item" onClick={()=>handleNavigation('/profile','profile')}><HelpCircle size={14}/><span>Help Center</span></button>
                <button className="submenu-item" onClick={()=>handleNavigation('/profile','profile')}><Settings size={14}/><span>Settings</span></button>
              </div>
            )}
          </div>
          <button className="nav-item logout" onClick={handleLogoutClick}><LogOut size={16}/><span>Log Out</span></button>
        </div>
      </header>

      {/* Main content */}
      <div className="main-content">
        <div className="unified-dashboard">
          <div className="dashboard-header">
            <h1>System Alerts</h1>
            <p>View Session and System Notifications.</p>
          </div>

          {/* Summary Cards */}
          <div className="alert-summary">
            <div className="summary-card critical"><AlertTriangle/><div><h3>Critical</h3><p>{criticalCount} Active</p></div></div>
            <div className="summary-card warning"> <Waves/>        <div><h3>Warning</h3> <p>{warningCount}  Active</p></div></div>
            <div className="summary-card info">    <CheckCircle/>  <div><h3>Stable</h3>  <p>{stableCount}  Active</p></div></div>
          </div>

          {/* Filters */}
          <div className="alert-filters">
            <button onClick={()=>setFilter("all")}      className={filter==="all"      ?"active":""}>All</button>
            <button onClick={()=>setFilter("critical")} className={filter==="critical" ?"active":""}>Critical</button>
            <button onClick={()=>setFilter("warning")}  className={filter==="warning"  ?"active":""}>Warning</button>
            <button onClick={()=>setFilter("info")}     className={filter==="info"     ?"active":""}>Stable</button>
          </div>

          {alerts.length > 0 && (
            <div className="alert-filters" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {unreadCount > 0 && (
                <button onClick={acknowledgeAll} className="mark-all-read" title="Mark all as read">
                  Mark All as Read ({unreadCount})
                </button>
              )}
              {alerts.some(a => a.isRead) && (
                <button onClick={markAllAsUnread} className="mark-all-unread" style={{
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  padding: '10px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'background-color 0.2s',
                  hover: { backgroundColor: '#2563eb' },
                }} title="Mark all as unread">
                  Mark All as Unread
                </button>
              )}
            </div>
          )}

          {/* Alert List */}
          <div className="alert-list" style={{ maxHeight:'420px', overflowY:'auto', paddingRight:'6px' }}>
            {filteredAlerts.length > 0 ? (
              filteredAlerts.map(alert => (
                <div
                  key={alert._id || alert.id}
                  className={`alert-card ${mapNotificationType(alert.type)} ${!alert.isRead?'unread':''}`}
                  onClick={()=>setSelectedAlert(alert)}
                >
                  <div className="alert-left">
                    {mapNotificationType(alert.type)==="critical" && <AlertTriangle/>}
                    {mapNotificationType(alert.type)==="warning"  && <Waves/>}
                    {mapNotificationType(alert.type)==="info"     && <CheckCircle/>}
                  </div>
                  <div className="alert-center">
                    <h4>{alert.title}</h4>
                    <p>{alert.message}</p>
                    <small>
                      <Thermometer size={14}/> {alert.sensorData?.temperature||'N/A'}°C |&nbsp;
                      <Droplets size={14}/> M1: {alert.sensorData?.moisture1||'N/A'}% M2: {alert.sensorData?.moisture2||'N/A'}%
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

          {/* Alert Detail Modal */}
          {selectedAlert && (
            <div className="modal-overlay" onClick={()=>setSelectedAlert(null)}>
              <div className="alert-modal" onClick={e=>e.stopPropagation()}>
                <h2>{selectedAlert.title}</h2>
                <p>{selectedAlert.message}</p>
                <div className="sensor-grid">
                  <div><Thermometer/> {selectedAlert.sensorData?.temperature||'N/A'}°C</div>
                  <div><Droplets/> M1: {selectedAlert.sensorData?.moisture1||'N/A'}%</div>
                  <div><Droplets/> M2: {selectedAlert.sensorData?.moisture2||'N/A'}%</div>
                  <div><Waves/> {selectedAlert.sensorData?.humidity||'N/A'}%</div>
                  <div><Weight/> W1: {selectedAlert.sensorData?.weight1||'N/A'}kg</div>
                  <div><Weight/> W2: {selectedAlert.sensorData?.weight2||'N/A'}kg</div>
                </div>
                <div className="modal-actions">
                  <button className="acknowledge" onClick={handleAcknowledge} disabled={selectedAlert.isRead}>
                    {selectedAlert.isRead ? 'Already Acknowledged' : 'Acknowledge'}
                  </button>
                  <button onClick={()=>setSelectedAlert(null)}>Close</button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}