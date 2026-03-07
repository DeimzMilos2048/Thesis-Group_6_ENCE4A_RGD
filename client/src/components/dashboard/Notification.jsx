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

const toastStyles = {
  container: {
    position: 'fixed', top: '80px', right: '20px', zIndex: 9999,
    display: 'flex', flexDirection: 'column', gap: '10px',
    maxWidth: '360px', width: '100%', pointerEvents: 'none',
  },
  card: (type) => ({
    pointerEvents: 'all',
    borderRadius: '10px',
    overflow: 'hidden',
    boxShadow: '0 6px 24px rgba(0,0,0,0.14)',
    borderLeft: `4px solid ${type === 'critical' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#10b981'}`,
    background: type === 'critical'
      ? 'linear-gradient(135deg,#fff 0%,#fff5f5 100%)'
      : type === 'warning'
        ? 'linear-gradient(135deg,#fff 0%,#fffbeb 100%)'
        : 'linear-gradient(135deg,#fff 0%,#f0fdf4 100%)',
    animation: 'toastSlideIn 0.35s cubic-bezier(0.34,1.4,0.64,1) both',
  }),
  progressBar: (type) => ({
    height: '3px',
    background: type === 'critical' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#10b981',
    animation: 'toastShrink 5s linear forwards',
    transformOrigin: 'left',
  }),
  body: { display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px 14px' },
  iconWrap: (type) => ({
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0, marginTop: '1px',
    background: type === 'critical' ? '#fee2e2' : type === 'warning' ? '#fef3c7' : '#d1fae5',
    color:      type === 'critical' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#10b981',
  }),
  textWrap:  { flex: 1, display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 },
  title:     { fontSize: '13px', fontWeight: '700', color: '#111827', lineHeight: 1.3 },
  message:   { fontSize: '12px', color: '#4b5563', lineHeight: 1.4, wordBreak: 'break-word' },
  time:      { fontSize: '10px', color: '#9ca3af', marginTop: '2px' },
  dismiss:   {
    background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af',
    padding: '2px', display: 'flex', alignItems: 'center', borderRadius: '4px',
    flexShrink: 0, marginTop: '1px',
  },
};

/* inject keyframes once */
if (typeof document !== 'undefined' && !document.getElementById('toast-kf')) {
  const s = document.createElement('style');
  s.id = 'toast-kf';
  s.textContent = `
    @keyframes toastSlideIn { from { opacity:0; transform:translateX(110%); } to { opacity:1; transform:translateX(0); } }
    @keyframes toastShrink   { from { transform:scaleX(1); } to { transform:scaleX(0); } }
  `;
  document.head.appendChild(s);
}

const ToastIcon = ({ type }) => {
  if (type === 'critical') return <AlertTriangle size={16} />;
  if (type === 'warning')  return <AlertTriangle size={16} />;
  return <CheckCircle size={16} />;
};

const ToastContainer = ({ toasts, removeToast }) => {
  if (!toasts.length) return null;
  const fmt = (d) => d ? new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
  return (
    <div style={toastStyles.container}>
      {toasts.map(t => (
        <div key={t.id} style={toastStyles.card(t.type)} role="alert">
          <div style={{ height: '3px', background: 'rgba(0,0,0,0.06)', overflow: 'hidden' }}>
            <div style={toastStyles.progressBar(t.type)} />
          </div>
          <div style={toastStyles.body}>
            <span style={toastStyles.iconWrap(t.type)}><ToastIcon type={t.type} /></span>
            <div style={toastStyles.textWrap}>
              <span style={toastStyles.title}>{t.title}</span>
              <span style={toastStyles.message}>{t.message}</span>
              <span style={toastStyles.time}>{fmt(t.timestamp)}</span>
            </div>
            <button style={toastStyles.dismiss} onClick={() => removeToast(t.id)} aria-label="Dismiss">
              <X size={14} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
/* ─────────────────────────────────────────────────────────────────────────── */

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
    toasts, removeToast, alerts, unreadCount,
    loading: notifLoading, error: notifError,
    acknowledgeOne, acknowledgeAll,
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

      {/* ── Toasts ── */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />

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

          {unreadCount > 0 && (
            <div className="alert-filters">
              <button onClick={acknowledgeAll} className="mark-all-read">
                Mark All as Read ({unreadCount})
              </button>
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