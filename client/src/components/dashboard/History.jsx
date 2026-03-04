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
  const [activeTab, setActiveTab] = useState('history');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [historyData, setHistoryData] = useState([]);
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
    const fetchHistoryData = async () => {
      try {
        const loadingTimeout = setTimeout(() => {
          if (isMounted) setLoading(true);
        }, 300);

        // Get auth token
        const token = localStorage.getItem('token');
        if (!token) {
          setError('Authentication required. Please login to access history.');
          setLoading(false);
          return;
        }

        // Validate token
        try {
          const tokenPayload = JSON.parse(atob(token.split('.')[1]));
          if (!tokenPayload || tokenPayload.exp < Date.now() / 1000) {
            setError('Invalid or expired token. Please login again.');
            setLoading(false);
            return;
          }
        } catch (err) {
          setError('Invalid token format. Please login again.');
          setLoading(false);
          return;
        }

        // Fetch sensor history data from backend API with auth
        const response = await fetch('http://localhost:5001/api/sensor/history', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        // Debug: Check response type and status
        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers.get('content-type'));
        
        if (!response.ok) {
          // If response is HTML (error page), provide better error message
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('text/html')) {
            throw new Error('Server is not running or API endpoint not found. Please start the backend server.');
          }
          
          // Handle specific HTTP errors
          if (response.status === 404) {
            throw new Error('API endpoint not found. Please ensure the backend server is running on port 5001 and the /api/sensor/history route exists.');
          } else if (response.status === 401) {
            throw new Error('Authentication failed. Please login again.');
          } else if (response.status === 500) {
            throw new Error('Server error. Please check the backend server logs.');
          } else {
            throw new Error(`HTTP ${response.status}: Failed to fetch history data`);
          }
        }
        
        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const text = await response.text();
          console.error('Non-JSON response:', text.substring(0, 200));
          throw new Error('Server returned non-JSON response. Backend server may not be running correctly.');
        }
        
        const result = await response.json();
        
        if (isMounted) {
          console.log('History API Response:', result);
          
          // Handle different response structures
          let sensorData = [];
          if (result.success && result.data) {
            sensorData = result.data;
          } else if (Array.isArray(result)) {
            sensorData = result;
          } else if (result.data) {
            sensorData = result.data;
          } else {
            console.warn('Unexpected response structure:', result);
            sensorData = [];
          }
          
          // Validate data is an array
          if (!Array.isArray(sensorData)) {
            console.error('History API: Expected array but got:', typeof sensorData, sensorData);
            setError('Invalid data format received from server');
            setLoading(false);
            return;
          }
          
          // Transform database data to match table format
          const formattedData = sensorData.map((item, index) => {
            const beforeWeightValue =
              item.weightBefore ??
              item.initialWeight ??
              item.weight1 ??
              item.weight;

            const safeToString = (value, fallback = 'N/A') =>
              value !== undefined && value !== null ? value.toString() : fallback;

            return {
              id: item._id || item.id || index + 1,
              date: item.timestamp
                ? new Date(item.timestamp).toLocaleDateString('en-US', {
                    month: '2-digit',
                    day: '2-digit',
                    year: 'numeric',
                  })
                : 'N/A',
              // Starting time of the session
              startTime:
                item.startTime ||
                (item.timestamp
                  ? new Date(item.timestamp).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true,
                    })
                  : 'N/A'),
              // End time of the session (if provided by backend)
              endTime: item.endTime
                ? new Date(item.endTime).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                  })
                : 'N/A',
              // Initial moisture per tray (1–6)
              initialMoistureT1: safeToString(item.moisture1),
              initialMoistureT2: safeToString(item.moisture2),
              initialMoistureT3: safeToString(item.moisture3),
              initialMoistureT4: safeToString(item.moisture4),
              initialMoistureT5: safeToString(item.moisture5),
              initialMoistureT6: safeToString(item.moisture6),
              // Final moisture per tray (1–6) – uses dedicated fields if backend provides them
              finalMoistureT1: safeToString(
                item.finalMoisture1 ?? item.moisture1End
              ),
              finalMoistureT2: safeToString(
                item.finalMoisture2 ?? item.moisture2End
              ),
              finalMoistureT3: safeToString(
                item.finalMoisture3 ?? item.moisture3End
              ),
              finalMoistureT4: safeToString(
                item.finalMoisture4 ?? item.moisture4End
              ),
              finalMoistureT5: safeToString(
                item.finalMoisture5 ?? item.moisture5End
              ),
              finalMoistureT6: safeToString(
                item.finalMoisture6 ?? item.moisture6End
              ),
              // Average moisture across trays (from sensorDataModel.js moistureavg)
              moistureavg: safeToString(item.moistureavg),
              temperature:
                item.temperature !== undefined ? `${item.temperature}°` : '0°',
              humidity:
                item.humidity !== undefined ? item.humidity.toString() : '0',
              // Before drying weight
              beforeWeight:
                beforeWeightValue !== undefined && beforeWeightValue !== null
                  ? beforeWeightValue.toString()
                  : '0',
              // Final weight after drying
              finalWeight:
                item.weightFinal ??
                item.finalWeight ??
                item.weight2 ??
                'N/A',
              status: item.status || 'Idle',
            };
          });
          
          console.log('Formatted History Data:', formattedData);
          setHistoryData(formattedData);
          setError(null);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          console.error('History fetch error:', err);
          setError(`Failed to load history: ${err.message}`);
          setLoading(false);
        }
      }
    };

    // Initial fetch
    fetchHistoryData();
    
    // Set up polling interval: 1 hour and 30 minutes = 90 minutes = 5,400,000 milliseconds
    const pollingInterval = setInterval(fetchHistoryData, 90 * 60 * 1000); // 90 minutes
    
    return () => {
      isMounted = false;
      clearInterval(pollingInterval); // Clean up interval on unmount
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

  const handleDownloadExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(historyData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "History");
    XLSX.writeFile(workbook, "MALA_data_history.xlsx");
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

      {/* Main Content for History*/}
      <div className="main-content">
        <div className="unified-dashboard">
          {/* Header */}
          <div className="dashboard-header history-header">
            <div className="history-header-text">
              <h1>History</h1>
              <p>Review past drying sessions and activity.</p>
            </div>
            <button className="download-btn" onClick={handleDownloadExcel}>
              Export Excel
            </button>
          </div>

           <div className="table-wrapper">
        <table className="history-table">
          <thead>
            <tr>
              <th rowSpan="2">Date</th>
              <th rowSpan="2">Starting Time</th>
              <th rowSpan="2">End Time</th>
              <th colSpan="6">Initial Moisture</th>
              <th colSpan="7">Final Moisture</th>
              <th rowSpan="2">Temperature</th>
              <th rowSpan="2">Humidity</th>
              <th rowSpan="2">Before Weight</th>
              <th rowSpan="2">Final Weight</th>
              <th rowSpan="2">Status</th>
            </tr>
            <tr>
              <th>T1</th>
              <th>T2</th>
              <th>T3</th>
              <th>T4</th>
              <th>T5</th>
              <th>T6</th>
              <th>T1</th>
              <th>T2</th>
              <th>T3</th>
              <th>T4</th>
              <th>T5</th>
              <th>T6</th>
              <th>AVG</th>
            </tr>
          </thead>

          <tbody>
            {historyData.map((item) => (
              <tr key={item.id}>
                <td>{item.date}</td>
                <td>{item.startTime}</td>
                <td>{item.endTime}</td>
                <td>{item.initialMoistureT1}</td>
                <td>{item.initialMoistureT2}</td>
                <td>{item.initialMoistureT3}</td>
                <td>{item.initialMoistureT4}</td>
                <td>{item.initialMoistureT5}</td>
                <td>{item.initialMoistureT6}</td>
                <td>{item.finalMoistureT1}</td>
                <td>{item.finalMoistureT2}</td>
                <td>{item.finalMoistureT3}</td>
                <td>{item.finalMoistureT4}</td>
                <td>{item.finalMoistureT5}</td>
                <td>{item.finalMoistureT6}</td>
                <td>{item.moistureavg}</td>
                <td>{item.temperature}</td>
                <td>{item.humidity}</td>
                <td>{item.beforeWeight}</td>
                <td>{item.finalWeight}</td>
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