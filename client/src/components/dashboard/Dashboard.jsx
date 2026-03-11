import { useState, useEffect } from 'react';
import { Activity, BarChart2, Bell, CircleUser, Clock, Settings, AlertTriangle, LogOut, Thermometer, Droplets, Waves, Weight, CheckCircle, StopCircle, ChevronDown, ChevronUp, User, HelpCircle } from 'lucide-react';
import './Dashboard.css';
import { useNavigate, useLocation } from 'react-router-dom';
import authService from '../../api/authService';
import dryerService from '../../api/dryerService';
import { startMoistureMonitoringService, stopMoistureMonitoringService } from '../../services/dryingHistoryService';
import logo from "../../assets/images/logo2.png";
import { useSocket } from '../../contexts/SocketContext.js';
import { useDrying } from '../../contexts/DryingContext.js';
import { useWeight } from '../../contexts/WeightContext.js';
import { useToast } from '../../contexts/ToastContext.js';
import { useNotifications } from '../../contexts/NotificationContext';
import { setTemperature, setMoisture, setTray } from '../../api/systemService';

export default function RiceDryingDashboard({ view }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [hasDryingStarted, setHasDryingStarted] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const { socket, sensorData, chartData, isConnected } = useSocket();

  const {
    isProcessing,
    dryingSeconds,
    selectedTemp,   setSelectedTemp,
    selectedMoisture, setSelectedMoisture,
    currentTray,    setCurrentTray,
    startDrying,
    stopDrying,
    formatDryingTime,
    setSocket: setSocketInDrying,
  } = useDrying();

  const { savedWeights, savedAfterWeights, saveBeforeWeight, saveAfterWeight, resetBeforeWeight, resetAfterWeight } = useWeight();
  const { showToast } = useToast();
  const { unreadCount, isMonitoring, setIsMonitoring } = useNotifications();
  const [tabNotifications, setTabNotifications] = useState({
    dashboard: false,
    analytics: false,
    history: false,
    notification: false
  });

  // Pass socket to DryingProvider for drying time sync
  useEffect(() => {
    if (socket && setSocketInDrying) {
      setSocketInDrying(socket);
    }
  }, [socket, setSocketInDrying]);

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
        const loadingTimeout = setTimeout(() => { if (isMounted) setLoading(true); }, 300);
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
    setTabNotifications(prev => ({ ...prev, [tab]: false }));
  };

  const handleLogoutClick = () => setShowLogoutConfirm(true);
  const handleLogoutCancel = () => setShowLogoutConfirm(false);
  const handleLogoutConfirm = () => { authService.logout(); navigate('/login'); };

  const handleApply = async () => {
    // Check if a tray is selected for weighing
    if (!currentTray) {
      showToast('error', 'Please select a tray for weighing before starting drying.');
      return;
    }
    
    // Check if before weight is saved for the selected tray
    if (!savedWeights[currentTray]?.frozen) {
      showToast('error', `Please save the before weight for Tray ${currentTray} before starting drying.`);
      return;
    }
    
    if (!selectedTemp && !selectedMoisture) { showToast('error', 'Please select a target temperature and moisture before starting.'); return; }
    if (!selectedTemp) { showToast('error', 'Please select a target temperature (40–45°C) before starting.'); return; }
    if (!selectedMoisture) { showToast('error', 'Please select a target moisture (13% or 14%) before starting.'); return; }

    try {
      setLoading(true);
      setHasDryingStarted(true); // Mark that drying has started
      
      // Get the current moisture of the selected tray
      const selectedTrayMoisture = sensorData[`moisture${currentTray}`] || 0;
      console.log(`Starting drying for Tray ${currentTray} with current moisture: ${selectedTrayMoisture.toFixed(1)}%`);
      
      const response = await dryerService.startDrying(selectedTemp, selectedMoisture, currentTray, selectedTrayMoisture);
      if (response.success) {
        showToast('success', `Drying started — Tray ${currentTray} · Target: ${selectedTemp}°C · Current: ${selectedTrayMoisture.toFixed(1)}% → Target: ${selectedMoisture}%`);
        setIsMonitoring(true);
        setTabNotifications(prev => ({
          ...prev,
          analytics: true,
          history: true,
        }));
        startMoistureMonitoringService((currentMoisture) => {
          console.log(`Current moisture for Tray ${currentTray}: ${currentMoisture.toFixed(2)}%`);
        }, currentTray); // Pass selected tray to monitoring service
        console.log('✓ Moisture monitoring activated for selected tray');
      }
    } catch (error) {
      console.error('Error starting drying:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    try {
      setLoading(true);
      setIsMonitoring(false);
      stopMoistureMonitoringService();
      await stopDrying();
      showToast('info', 'Drying process has been stopped.');
    } catch (error) {
      console.error('Error stopping drying:', error);
      showToast('error', 'Failed to stop drying. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveWeight = () => {
    const currentWeight = sensorData.weight1 ?? sensorData.weightbefore1 ?? 0;
    if (savedWeights[currentTray]?.frozen) { showToast('error', `Tray ${currentTray} weight is already saved and locked.`); return; }
    if (currentWeight <= 0) { showToast('error', `No weight data available for Tray ${currentTray}.`); return; }
    saveBeforeWeight(currentTray, currentWeight);
    showToast('success', `Tray ${currentTray} before weight saved: ${currentWeight.toFixed(2)} kg`);
    setTabNotifications(prev => ({ ...prev, history: true }));
  };

  const handleSaveAfterWeight = () => {
    const currentWeight = sensorData.weight1 ?? sensorData.weightbefore1 ?? 0;
    if (!savedWeights[currentTray]?.frozen) { showToast('error', `Please save the before weight for Tray ${currentTray} first.`); return; }
    if (savedAfterWeights[currentTray]?.frozen) { showToast('error', `Tray ${currentTray} after weight is already saved and locked.`); return; }
    if (currentWeight <= 0) { showToast('error', `No weight data available for Tray ${currentTray}.`); return; }
    saveAfterWeight(currentTray, currentWeight);
    showToast('success', `Tray ${currentTray} after weight saved: ${currentWeight.toFixed(2)} kg`);
    setTabNotifications(prev => ({ ...prev, history: true }));
  };

  const beforeFrozen    = !!savedWeights[currentTray]?.frozen;
  const afterFrozen     = !!savedAfterWeights[currentTray]?.frozen;
  const isDryingFinished = !isProcessing && beforeFrozen;
  const isDryingStopped = !isProcessing; // Separate check for when drying is stopped
  
  // Check if any tray has reached 14% moisture
  const anyTrayReached14 = [1, 2, 3, 4, 5, 6].some(trayNum => {
    const trayMoisture = sensorData[`moisture${trayNum}`] || 0;
    return trayMoisture <= 14 && trayMoisture > 0;
  });
  
  const canSaveBefore   = !beforeFrozen && !isProcessing && currentTray;
  const canResetBefore  = beforeFrozen && !isProcessing && currentTray;
  const canSaveAfter    = (isDryingStopped && beforeFrozen && hasDryingStarted || anyTrayReached14) && !afterFrozen && currentTray;
  const canResetAfter   = isDryingFinished && afterFrozen && currentTray;
  

  useEffect(() => {
    if (!sensorData || !isProcessing) return;
    const temp = sensorData.temperature || 0;
    const moisture = sensorData.moistureavg || 0;
    if ((temp >= 40 && temp <= 45) || (moisture >= 13 && moisture <= 14)) {
      setTabNotifications(prev => ({ ...prev, analytics: true }));
    }

    // Check individual tray moisture thresholds for notifications
    [1, 2, 3, 4, 5, 6].forEach(trayNum => {
      const trayMoisture = sensorData[`moisture${trayNum}`] || 0;
      if (trayMoisture <= 14 && trayMoisture > 0) {
        // Trigger notification for individual tray reaching 14% threshold
        setTabNotifications(prev => ({ ...prev, dashboard: true }));
        
        // Show toast notification for tray ready for removal
        showToast('success', `Tray ${trayNum} is ready for removal! Moisture: ${trayMoisture.toFixed(1)}%`);
        
        // Also trigger notification service for mobile/web
        if (socket && socket.connected) {
          socket.emit('tray:threshold', {
            trayNumber: trayNum,
            moisture: trayMoisture,
            timestamp: new Date().toISOString(),
            message: `Tray ${trayNum} reached 14% moisture threshold - ready for removal`
          });
        }
      }
    });
  }, [sensorData, isProcessing, socket, showToast]);

  return (
    <div className="dashboard-container">

      {error && (<div className="error-banner"><AlertTriangle size={20} /><span>{error}</span></div>)}
      {loading && (<div className="loading-overlay"><div className="loading-spinner"></div><p>Loading dashboard...</p></div>)}

      {showLogoutConfirm && (
        <div className="modal-overlay" onClick={handleLogoutCancel}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><LogOut size={24} /><h3>Confirm Logout</h3></div>
            <div className="modal-body"><p>Are you sure you want to log out?</p></div>
            <div className="modal-footer">
              <button className="modal-button cancel" onClick={handleLogoutCancel}>Cancel</button>
              <button className="modal-button confirm" onClick={handleLogoutConfirm}>Log Out</button>
            </div>
          </div>
        </div>
      )}

      <header className="topbar">
        <div className="topbar-logo-section"><img src={logo} alt="Logo" className="topbar-logo" /></div>
        <nav className="topbar-nav">
          <button className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => handleNavigation('/dashboard', 'dashboard')}>
            <BarChart2 size={16} /><span>Dashboard</span>
            {tabNotifications.dashboard && <span className="tab-notification-dot" title="Dashboard has new updates"></span>}
          </button>
          <button className={`nav-item ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => handleNavigation('/analytics', 'analytics')}>
            <Activity size={16} /><span>Analytics</span>
            {tabNotifications.analytics && <span className="tab-notification-dot" title="Analytics has new data"></span>}
          </button>
          <button className={`nav-item ${activeTab === 'history' ? 'active' : ''}`} onClick={() => handleNavigation('/history', 'history')}>
            <Clock size={16} /><span>History</span>
            {tabNotifications.history && <span className="tab-notification-dot" title="History has new records"></span>}
          </button>
          <button className={`nav-item ${activeTab === 'notification' ? 'active' : ''}`} onClick={() => handleNavigation('/notification', 'notification')}>
            <Bell size={16} /><span>Notification</span>
            {unreadCount > 0 && (
              <span className="notif-badge" title={`${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
        </nav>
        <div className="topbar-right">
          <div className="profile-dropdown-wrapper">
            <button className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setProfileDropdownOpen(prev => !prev)}>
              <CircleUser size={16} /><span>Profile</span>
              {profileDropdownOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {profileDropdownOpen && (
              <div className="profile-submenu">
                <button className="submenu-item" onClick={() => handleNavigation('/profile', 'profile')}><User size={14} /><span>Edit Profile</span></button>
                <button className="submenu-item" onClick={() => handleNavigation('/profile', 'profile')}><Bell size={14} /><span>Edit Notification</span></button>
                <button className="submenu-item" onClick={() => handleNavigation('/profile', 'profile')}><HelpCircle size={14} /><span>Help Center</span></button>
                <button className="submenu-item" onClick={() => handleNavigation('/profile', 'profile')}><Settings size={14} /><span>Settings</span></button>
              </div>
            )}
          </div>
          <button className="nav-item logout" onClick={handleLogoutClick}><LogOut size={16} /><span>Log Out</span></button>
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
                  <div className="status-icon" style={{ backgroundColor: '#fef3c7', color: '#f59e0b' }}><Clock size={22} /></div>
                  <div className="status-label">Drying Time</div>
                  <div className="status-value" style={{ fontSize: '18px', fontFamily: 'monospace' }}>{formatDryingTime(dryingSeconds)}</div>
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
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <div className="sensor-value-sm">{(sensorData.temperature || 0).toFixed(1)}°C</div>
                      <div className="progress-bar"><div className="progress-fill orange" style={{ width: `${Math.min(((sensorData.temperature || 0) / 45) * 100, 100)}%` }}></div></div>
                    </div>
                    <div className="sensor-range">Range: 40-45°C</div>
                  </div>

                  <div className="sensor-card">
                    <div className="sensor-icon cyan"><Droplets size={24} /></div>
                    <div className="sensor-label">Humidity</div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <div className="sensor-value-sm">{(sensorData.humidity || 0).toFixed(1)}%</div>
                      <div className="progress-bar"><div className="progress-fill cyan" style={{ width: `${sensorData.humidity || 0}%` }}></div></div>
                    </div>
                    <div className="sensor-range">Target: &lt;100%</div>
                  </div>

                  <div className="sensor-card">
                    <div className="sensor-icon cyan"><Waves size={24} /></div>
                    <div className="sensor-label">Moisture Content</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '8px', flex: 1 }}>
                      {[1, 2, 3, 4, 5, 6].map(i => {
                        const trayMoisture = sensorData[`moisture${i}`] || 0;
                        const isAtThreshold = trayMoisture <= 14 && trayMoisture > 0;
                        const isSelected = currentTray === i && savedWeights[i]?.frozen;
                        return (
                          <div key={`moisture-${i}`} style={{ 
                            textAlign: 'center', 
                            display: 'flex', 
                            flexDirection: 'column',
                            backgroundColor: isSelected ? '#f0fdf4' : isAtThreshold ? '#dcfce7' : 'transparent',
                            borderRadius: '6px',
                            padding: '4px',
                            border: isSelected ? '3px solid #10b981' : (isAtThreshold ? '2px solid #16a34a' : '1px solid #d1d5db'),
                            boxShadow: isSelected ? '0 0 0 2px rgba(16, 185, 129, 0.3)' : 'none',
                            transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                            transition: 'all 0.2s ease'
                          }}>
                            <div className="sensor-sublabel" style={{ 
                              color: isSelected ? '#059669' : (isAtThreshold ? '#16a34a' : '#9ca3af'), 
                              fontWeight: isSelected ? '700' : (isAtThreshold ? '700' : '400') 
                            }}>
                              TRAY {i} {isSelected && '👁'} {isAtThreshold && '✓'}
                            </div>
                            <div className="sensor-value-sm" style={{ 
                              color: isSelected ? '#059669' : (isAtThreshold ? '#16a34a' : undefined),
                              fontSize: '18px',
                              fontWeight: '400'
                            }}>
                              {trayMoisture.toFixed(1)}%
                            </div>
                            <div className="progress-bar">
                              <div 
                                className="progress-fill" 
                                style={{ 
                                  width: `${Math.min((trayMoisture / 14) * 100, 100)}%`,
                                  backgroundColor: isSelected ? '#10b981' : (isAtThreshold ? '#16a34a' : '#06b6d4')
                                }} 
                              />
                            </div>
                            {isAtThreshold && (
                              <div style={{ fontSize: '10px', color: '#16a34a', fontWeight: '600', marginTop: '2px' }}>
                                Ready
                              </div>
                            )}
                            {isSelected && !isAtThreshold && (
                              <div style={{ fontSize: '10px', color: '#059669', fontWeight: '600', marginTop: '2px' }}>
                                Selected
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className="sensor-avg-row" style={{ marginTop: '10px' }}>
                      <span className="sensor-avg-label">
                        Average Moisture
                      </span>
                      <div className="sensor-avg-value">
                        {(sensorData.moistureavg || 0).toFixed(2)}%
                      </div>
                      <div className="progress-bar">
                        <div 
                          className="progress-fill cyan" 
                          style={{ 
                            width: `${Math.min(((sensorData.moistureavg || 0) / 14) * 100, 100)}%` 
                          }} 
                        />
                      </div>
                    </div>
                    <div className="sensor-range">Target: 13-14%</div>
                  </div>

                  <div className="sensor-card">
                    <div className="sensor-icon green"><Weight size={24} /></div>
                    <div className="sensor-label">Weight</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '8px', flex: 1, alignContent: 'start' }}>
                      {[1, 2, 3, 4, 5, 6].map(i => {
                        const isFrozen        = savedWeights[i]?.frozen;
                        const isSelected      = currentTray === i;
                        const afterFrozenTray = savedAfterWeights[i]?.frozen;
                        const rawLive         = isSelected ? (sensorData.weight1 ?? sensorData.weightbefore1 ?? null) : null;
                        const beforeVal       = isFrozen ? savedWeights[i].before : (rawLive ?? 0);
                        const hasBeforeVal    = isFrozen || (isSelected && rawLive !== null && rawLive > 0);
                        const rawAfter        = isSelected ? (sensorData.weightafter1 ?? null) : null;
                        const afterVal        = afterFrozenTray ? savedAfterWeights[i].after : (rawAfter ?? 0);
                        const hasAfterVal     = afterFrozenTray || (isSelected && rawAfter !== null && rawAfter > 0);
                        const maxWeight       = 2;
                        const beforePct       = hasBeforeVal ? Math.min((beforeVal / maxWeight) * 100, 100) : 0;
                        const afterPct        = hasAfterVal  ? Math.min((afterVal  / maxWeight) * 100, 100) : 0;
                        return (
                          <div key={`weight-tray-${i}`} style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', borderRadius: '6px', padding: '4px 2px', border: isSelected ? '2px solid #10b981' : isFrozen ? '2px solid #6ee7b7' : '2px solid transparent', backgroundColor: isSelected ? '#f0fdf4' : isFrozen ? '#f0fdf4' : 'transparent', transition: 'border-color 0.2s, background-color 0.2s' }}>
                            <div className="sensor-sublabel" style={{ color: isSelected ? '#059669' : isFrozen ? '#10b981' : '#9ca3af', fontWeight: isSelected || isFrozen ? '700' : '400' }}>
                              TRAY {i}{isFrozen ? ' (Saved)' : ''}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '3px' }}>
                              <div className="weight-ba-label" style={{ fontSize: '10px', minWidth: '12px', flexShrink: 0 }}>B</div>
                              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1px' }}>
                                <div className="sensor-value-sm" style={{ fontSize: '18px', lineHeight: 1, color: isFrozen ? '#059669' : undefined, textAlign: 'left' }}>
                                  {hasBeforeVal ? `${beforeVal.toFixed(1)}kg` : <span style={{ color: '#d1d5db' }}>—</span>}
                                </div>
                                <div className="progress-bar" style={{ marginBottom: 0, height: '5px', minHeight: '5px' }}><div className="progress-fill green" style={{ width: `${beforePct}%` }} /></div>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                              <div className="weight-ba-label after" style={{ fontSize: '10px', minWidth: '12px', flexShrink: 0 }}>A</div>
                              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1px' }}>
                                <div className="sensor-value-sm" style={{ fontSize: '18px', lineHeight: 1, color: afterFrozenTray ? '#059669' : undefined, textAlign: 'left' }}>
                                  {hasAfterVal ? `${afterVal.toFixed(1)}kg` : <span style={{ color: '#d1d5db' }}>—</span>}
                                </div>
                                <div className="progress-bar" style={{ marginBottom: 0, height: '5px', minHeight: '5px' }}><div className="progress-fill" style={{ width: `${afterPct}%`, backgroundColor: '#3b82f6' }} /></div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="sensor-range" style={{ marginTop: '8px' }}>
                      <span style={{ color: '#10b981', fontWeight: 700 }}>B</span> = Before &nbsp;·&nbsp;
                      <span style={{ color: '#3b82f6', fontWeight: 700 }}>A</span> = After &nbsp;·&nbsp; Saved = Saved
                    </div>
                  </div>

                </div>
              </div>

              <div className="system-controls">
                <div className="controls-header"><h2>System Controls</h2></div>

                {/* Temperature Selector */}
                <div className="control-group">
                  <label className="control-group-label"><Thermometer size={14} style={{ color: '#f97316' }} /> Target Temperature (°C)</label>
                  <div className="selector-buttons temp-grid">
                    {[40, 41, 42, 43, 44, 45].map(temp => (
                      <button
                        key={temp}
                        className={`selector-btn temp-btn ${selectedTemp === temp ? 'selected-temp' : ''}`}
                        onClick={async () => {
                          try { setSelectedTemp(temp); await setTemperature(temp); }
                          catch (err) { console.error('Temperature update failed:', err); }
                        }}
                        disabled={isProcessing}
                      >
                        {temp}°
                      </button>
                    ))}
                  </div>
                </div>

                {/* Moisture Selector */}
                <div className="control-group">
                  <label className="control-group-label"><Waves size={14} style={{ color: '#06b6d4' }} /> Target Moisture (%)</label>
                  <div className="selector-buttons">
                    {[13, 14].map(moisture => (
                      <button
                        key={moisture}
                        className={`selector-btn moisture-btn ${selectedMoisture === moisture ? 'selected-moisture' : ''}`}
                        onClick={async () => {
                          try { setSelectedMoisture(moisture); await setMoisture(moisture); }
                          catch (err) { console.error('Moisture update failed:', err); }
                        }}
                        disabled={isProcessing}
                      >
                        {moisture}%
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tray Selector + Save/Reset Weight Buttons */}
                <div className="control-group">
                  <label className="control-group-label"><Weight size={14} style={{ color: '#10b981' }} /> Tray for Weighing</label>
                  <div className="selector-buttons temp-grid">
                    {[1, 2, 3, 4, 5, 6].map(tray => (
                      <button
                        key={tray}
                        className={`selector-btn tray-btn ${currentTray === tray ? 'selected-tray' : ''} ${savedWeights[tray]?.frozen ? 'tray-btn-frozen' : ''}`}
                        onClick={async () => {
                          try { setCurrentTray(tray); await setTray(tray); }
                          catch (err) { console.error('Tray update failed:', err); }
                        }}
                        disabled={isProcessing}
                      >
                        T{tray}{savedWeights[tray]?.frozen && <span className="tray-frozen-dot" />}
                      </button>
                    ))}
                  </div>

                  {/* Save Before / Save After */}
                  <div className="weight-save-row" style={{ marginTop: '10px' }}>
                    <button
                      className={`selector-btn weight-save-btn before-btn ${beforeFrozen ? 'weight-save-frozen' : ''} ${!canSaveBefore ? 'weight-save-disabled' : ''}`}
                      onClick={handleSaveWeight}
                      disabled={!canSaveBefore}
                    >
                      {beforeFrozen
                        ? <>✓ Before<br /><span className="weight-save-val">{savedWeights[currentTray].before.toFixed(2)} kg</span></>
                        : <>Save<br />Before</>}
                    </button>
                    <button
                      className={`selector-btn weight-save-btn after-btn ${afterFrozen ? 'weight-save-frozen after-frozen' : ''} ${!canSaveAfter ? 'weight-save-disabled' : ''}`}
                      onClick={handleSaveAfterWeight}
                      disabled={!canSaveAfter}
                    >
                      {afterFrozen
                        ? <>✓ After<br /><span className="weight-save-val">{savedAfterWeights[currentTray].after.toFixed(2)} kg</span></>
                        : anyTrayReached14
                          ? <>Save<br />After</>
                          : <>Save<br />After</>}
                    </button>
                  </div>

                  {/* Reset Before / Reset After */}
                  <div className="weight-save-row" style={{ marginTop: '6px' }}>
                    <button
                      className={`selector-btn weight-reset-btn ${!canResetBefore ? 'weight-reset-disabled' : ''}`}
                      onClick={() => { resetBeforeWeight(currentTray); showToast('info', `Tray ${currentTray} before weight reset.`); }}
                      disabled={!canResetBefore}
                    >
                      Reset<br />Before
                    </button>
                    <button
                      className={`selector-btn weight-reset-btn ${!canResetAfter ? 'weight-reset-disabled' : ''}`}
                      onClick={() => { resetAfterWeight(currentTray); showToast('info', `Tray ${currentTray} after weight reset.`); }}
                      disabled={!canResetAfter}
                    >
                      Reset<br />After
                    </button>
                  </div>
                </div>

                {/* Start / Stop Buttons */}
                <div className="control-buttons">
                  <button className={`start-button ${isProcessing ? 'processing' : ''}`} onClick={handleApply} disabled={isProcessing}>
                    {isProcessing ? (<><span className="processing-dot"></span>Processing...</>) : 'Start'}
                  </button>
                  <button className="stop-button" onClick={handleStop} disabled={!isProcessing}>
                    <StopCircle size={18} /> Stop
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