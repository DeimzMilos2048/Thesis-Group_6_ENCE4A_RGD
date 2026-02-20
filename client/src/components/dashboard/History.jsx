import { useState, useEffect } from 'react';
import { Activity, BarChart2, Bell, CircleUser, Clock, AlertTriangle, LogOut, ChevronDown, ChevronUp, User, HelpCircle, Settings } from 'lucide-react';
import './Dashboard.css';
import './History.css';
import * as XLSX from 'xlsx';
import { useNavigate, useLocation } from 'react-router-dom';
import authService from '../../api/authService';
import logo from "../../assets/images/logo2.png";

export default function History({ view }) {

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('analytics');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
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

  const historyData = [
    {
      id: 1,
      date: "01-05-2026",
      time: "10:00 AM",
      moisture: "14",
      temperature: "50°",
      humidity: "60",
      weight: "25",
      status: "Complete",
    },
    {
      id: 2,
      date: "01-06-2026",
      time: "12:00 AM",
      moisture: "13",
      temperature: "51°",
      humidity: "63",
      weight: "25",
      status: "Complete",
    },
    {
      id: 3,
      date: "01-06-2026",
      time: "1:00 PM",
      moisture: "9",
      temperature: "50°",
      humidity: "68",
      weight: "23",
      status: "Warning",
    },
    {
      id: 4,
      date: "01-06-2026",
      time: "4:00 PM",
      moisture: "3",
      temperature: "65°",
      humidity: "78",
      weight: "1",
      status: "Error",
    },
    {
      id: 5,
      date: "01-13-2026",
      time: "4:00 PM",
      moisture: "3",
      temperature: "65°",
      humidity: "78",
      weight: "1",
      status: "Error",
    },
  ];
    const handleDownloadExcel = () => {
      const worksheet = XLSX.utils.json_to_sheet(historyData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "History");
      XLSX.writeFile(workbook, "rice_grain_dryer_data_history.xlsx");
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
          <p>Loading History...</p>
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

      {/* Main Content for History*/}
      <div className="main-content">
        <div className="unified-dashboard">
          {/* Header */}
          <div className="dashboard-header">
            <h1>History</h1>
            <p>Review past drying sessions and activity.</p>
          </div>

          <div className="history-container">
              <button className="download-btn" onClick={handleDownloadExcel}>
                Export Excel
              </button>
          </div>

           <div className="table-wrapper">
        <table className="history-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Time</th>
              <th>Moisture Content</th>
              <th>Temperature</th>
              <th>Humidity</th>
              <th>Weight</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {historyData.map((item) => (
              <tr key={item.id}>
                <td>{item.date}</td>
                <td>{item.time}</td>
                <td>{item.moisture}</td>
                <td>{item.temperature}</td>
                <td>{item.humidity}</td>
                <td>{item.weight}</td>
                <td>
                  <span className={`status ${item.status.toLowerCase()}`}>
                    {item.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

        </div>
      </div>
    </div>
  );
}