import { useState, useEffect } from 'react';
import { Activity, BarChart2, Bell, CircleUser, Clock, AlertTriangle, LogOut, User, Mail, Save, X, HelpCircle, Settings } from 'lucide-react';
import './Dashboard.css';
import './Profile.css';
import { useNavigate, useLocation } from 'react-router-dom';
import authService from '../../api/authService';
import logo from "../../assets/images/logo2.png";
import { toast } from 'react-toastify';

export default function Profile({ view }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('profile');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [activeSection, setActiveSection] = useState('profile');
  const navigate = useNavigate();
  const location = useLocation();

  const [editingUser, setEditingUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  const defaultNotifications = {
    webNotifications: true,
    mobileNotifications: true,
    systemAlerts: true,
    moistureAlerts: true,
    humidityAlerts: true,
    temperatureAlerts: true,
    weightAlerts: true
  };

  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem('notificationSettings');
      return saved ? JSON.parse(saved) : defaultNotifications;
    } catch (error) {
      console.error('Error loading notification settings:', error);
      return defaultNotifications;
    }
  });

  const defaultSettings = {
    autoRefresh: true
  };

  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('userSettings');
      return saved ? JSON.parse(saved) : defaultSettings;
    } catch (error) {
      console.error('Error loading settings:', error);
      return defaultSettings;
    }
  });

  useEffect(() => {
  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await authService.getProfile();
      console.log("PROFILE DATA:", res);
      setEditingUser(res);
    } catch (err) {
      setError(err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  fetchProfile();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('notificationSettings', JSON.stringify(notifications));
    } catch (error) {
      console.error('Error saving notification settings:', error);
    }
  }, [notifications]);

  useEffect(() => {
    try {
      localStorage.setItem('userSettings', JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }, [settings]);

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


  const handleNotificationToggle = (field) => {
    setNotifications(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSettingChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveEditProfile = async () => {
  try {
    setLoading(true);
    const updatedUser = await authService.updateProfile(editingUser);
    setEditingUser(updatedUser);
    setIsEditing(false);
    toast.success("Profile updated successfully");
  } catch (err) {
    toast.error(err.message || "Failed to update profile");
  } finally {
    setLoading(false);
  }
};

  // const handleAvatarChange = (e) => {
  //   const file = e.target.files[0];
  //   if (file) {
  //     const reader = new FileReader();
  //     reader.onloadend = () => {
  //       // setProfileData(prev => ({ ...prev, avatar: reader.result }));
  //     };
  //     reader.readAsDataURL(file);
  //   }
  // };

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
          <p>Loading Profile...</p>
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

      {/* Main Content for Profile */}
      <div className="main-content">
        <div className="unified-dashboard">
          {/* Header */}
          <div className="dashboard-header">
            <h1>Profile</h1>
            <p>Manage your profile and account settings.</p>
          </div>

          {/* Profile Content */}
          <div className="profile-container">
            {/* Sidebar Navigation */}
            <div className="profile-sidebar">
              <button
                className={`profile-nav-item ${activeSection === 'profile' ? 'active' : ''}`}
                onClick={() => setActiveSection('profile')}
              >
                <User size={20} />
                <span>Edit Profile</span>
              </button>
              <button
                className={`profile-nav-item ${activeSection === 'notifications' ? 'active' : ''}`}
                onClick={() => setActiveSection('notifications')}
              >
                <Bell size={20} />
                <span>Edit Notification</span>
              </button>
              <button
                className={`profile-nav-item ${activeSection === 'help' ? 'active' : ''}`}
                onClick={() => setActiveSection('help')}
              >
                <HelpCircle size={20} />
                <span>Help Center</span>
              </button>
              <button
                className={`profile-nav-item ${activeSection === 'settings' ? 'active' : ''}`}
                onClick={() => setActiveSection('settings')}
              >
                <Settings size={20} />
                <span>Settings</span>
              </button>
            </div>

            {/* Main Profile Content */}
            <div className="profile-main">
              {/* Edit Profile Section */}
              {activeSection === 'profile' &&  editingUser && (
                <div className="profile-section">
                  <div className="section-header">
                <h2>Edit Profile</h2>

                {!isEditing ? (
                <button className="edit-btn" onClick={() => setIsEditing(true)}>
                  Edit
                </button>
                ) : (
                <div className="edit-actions">
                  <button
                    className="cancel-btn"
                    onClick={() => setIsEditing(false)}
                >
                  <X size={16} />
                  Cancel
                </button> 

                  <button
                    className="save-btn"
                    onClick={handleSaveEditProfile}
                  >
                  <Save size={16} />
                    Save
                  </button>
                  </div>
                )}
                  </div>

                  <div className="profile-avatar-section">
                    <div className="avatar-container">
                      <div className="avatar-circle">
                        {/* {profileData.avatar ? (
                          <img src={profileData.avatar} alt="Profile" />
                        ) : (
                          <User size={48} />
                        )} */}
                      </div>
                    </div>
                  </div>

                  <div className="profile-form">
                     <div className="form-group">
                      <label>User Name</label>
                      <div className="input-wrapper">
                        <User size={18} />
                        <input
                         type="text"
                         value={editingUser?.username || ""}
                         onChange={(e) =>
                         setEditingUser({ ...editingUser, username: e.target.value })
                         }
                         disabled={!isEditing}
                         />
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Full Name</label>
                      <div className="input-wrapper">
                        <User size={18} />
                        <input
                          type="text"
                          value={editingUser?.fullname || ""}
                          onChange={(e) => setEditingUser({...editingUser, fullname: e.target.value})}
                          disabled={!isEditing}
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Email Address</label>
                      <div className="input-wrapper">
                        <Mail size={18} />
                        <input
                          type="email"
                          value={editingUser?.email || ""}
                          onChange={(e) => setEditingUser({...editingUser, email: e.target.value})}
                          disabled={!isEditing}
                        />
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* Edit Notification Section */}
              {activeSection === 'notifications' && (
                <div className="profile-section">
                  <div className="section-header">
                    <h2>Notification Preferences</h2>
                  </div>

                  {/* Edit Notifications */}
                  <div className="notification-settings">
                    <div className="notification-group">
                      <h3>General Notifications</h3>
                      
                      <div className="notification-item">
                        <div className="notification-info">
                          <strong>Web Alert Notification</strong>
                          <span>Receive notifications via web</span>
                        </div>
                        <label className="toggle-switch">
                          <input
                            type="checkbox" 
                            checked={notifications.webNotifications}
                            onChange={() => handleNotificationToggle('webNotifications')}
                          />
                          <span className="toggle-slider"></span>
                        </label>
                      </div>

                      <div className="notification-item">
                        <div className="notification-info">
                          <strong>Mobile Alert Notification</strong>
                          <span>Receive notifications via mobile</span>
                        </div>
                        <label className="toggle-switch">
                          <input
                            type="checkbox"
                            checked={notifications.mobileNotifications}
                            onChange={() => handleNotificationToggle('mobileNotifications')}
                          />
                          <span className="toggle-slider"></span>
                        </label>
                      </div>
                    </div>

                    {/* System Alerts */}
                    <div className="notification-group">
                      <h3>System Alerts</h3>
                      
                      <div className="notification-item">
                        <div className="notification-info">
                          <strong>System Alerts</strong>
                          <span>Critical system notifications</span>
                        </div>
                        <label className="toggle-switch">
                          <input
                            type="checkbox"
                            checked={notifications.systemAlerts}
                            onChange={() => handleNotificationToggle('systemAlerts')}
                          />
                          <span className="toggle-slider"></span>
                        </label>
                      </div>

                      <div className="notification-item">
                        <div className="notification-info">
                          <strong>Moisture Content Alerts</strong>
                          <span>Alerts when moisture reaches target</span>
                        </div>
                        <label className="toggle-switch">
                          <input
                            type="checkbox"
                            checked={notifications.moistureAlerts}
                            onChange={() => handleNotificationToggle('moistureAlerts')}
                          />
                          <span className="toggle-slider"></span>
                        </label>
                      </div>

                      <div className="notification-item">
                        <div className="notification-info">
                          <strong>Humidity Alerts</strong>
                          <span>Alerts for humidity changes</span>
                        </div>
                        <label className="toggle-switch">
                          <input
                            type="checkbox"
                            checked={notifications.humidityAlerts}
                            onChange={() => handleNotificationToggle('humidityAlerts')}
                          />
                          <span className="toggle-slider"></span>
                        </label>
                      </div>

                      <div className="notification-item">
                        <div className="notification-info">
                          <strong>Temperature Alerts</strong>
                          <span>Alerts for temperature changes</span>
                        </div>
                        <label className="toggle-switch">
                          <input
                            type="checkbox"
                            checked={notifications.temperatureAlerts}
                            onChange={() => handleNotificationToggle('temperatureAlerts')}
                          />
                          <span className="toggle-slider"></span>
                        </label>
                      </div>

                      <div className="notification-item">
                        <div className="notification-info">
                          <strong>Weight Alerts</strong>
                          <span>Alerts for weight changes</span>
                        </div>
                        <label className="toggle-switch">
                          <input
                            type="checkbox"
                            checked={notifications.weightAlerts}
                            onChange={() => handleNotificationToggle('weightAlerts')}
                          />
                          <span className="toggle-slider"></span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Help Center Section */}
              {activeSection === 'help' && (
                <div className="profile-section">
                  <div className="section-header">
                    <h2>Help Center</h2>
                  </div>

                  <div className="help-content">
                    <div className="help-card">
                      <h3>Frequently Asked Questions</h3>
                      
                      <div className="faq-item">
                        <strong>How do I set target temperature?</strong>
                        <p>Navigate to the Dashboard and use the System Controls panel to set your desired target temperature between 50°C - 60°C.</p>
                      </div>

                      <div className="faq-item">
                        <strong>What is the optimal moisture content?</strong>
                        <p>The optimal moisture content for rice drying is between 10-14%. The system will alert you when this range is reached.</p>
                      </div>

                      <div className="faq-item">
                        <strong>How do I view historical data?</strong>
                        <p>Click on the History tab in the sidebar to view past drying sessions and sensor readings.</p>
                      </div>

                      <div className="faq-item">
                        <strong>Can I export historical data?</strong>
                        <p>Yes, go to the History page and use the export button to download your data in CSV/XLSX format.</p>
                      </div>

                      
                    </div>
                  </div>
                </div>
              )}

              {/* Settings Section */}
              {activeSection === 'settings' && (
                <div className="profile-section">
                  <div className="section-header">
                    <h2>System Settings</h2>
                  </div>

                  <div className="settings-content">
                    <div className="settings-group">
                      <h3>Dashboard</h3>
                      
                      <div className="setting-item-toggle">
                        <div className="setting-info">
                          <strong>Auto Refresh</strong>
                          <span>Automatically refresh sensor data every 5 seconds</span>
                        </div>
                        <label className="toggle-switch">
                          <input
                            type="checkbox"
                            checked={settings.autoRefresh}
                            onChange={() => handleSettingChange('autoRefresh', !settings.autoRefresh)}
                          />
                          <span className="toggle-slider"></span>
                        </label>
                      </div>
                    </div>

                    <div className="settings-group danger-zone">
                      <h3>Danger Zone</h3>
                      <button className="danger-btn">Reset All Settings</button>
                      <button className="danger-btn">Delete Account</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}