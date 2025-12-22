import React, { useState } from 'react';
import { Activity, BarChart2, Clock, Settings, AlertTriangle, LogOut, PieChart, TrendingUp } from 'lucide-react';
import './Analytics.css';
import { useNavigate } from 'react-router-dom';
import authService from '../../api/authService';
import logo from "../../assets/images/logo2.png";

export default function Analytics() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleNavigate = (path) => {
    // Don't show loading for navigation
    setLoading(false);
    
    // Use replace instead of push to prevent loading flash
    navigate(path, { replace: true });
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
          <p>Loading analytics data...</p>
        </div>
      )}
      {/* Sidebar */}
      <div className="sidebar">
        {/* Logo */}
        <div className="logo-section">
          <div className="logo-box">
            <img src={logo} alt="" className="sidebar-logo" />
          </div>
        </div>

        {/* Navigation */}
        <nav className="nav-section">
          <button 
            className="nav-item"
            onClick={() => handleNavigate('/dashboard')}
          >
            <BarChart2 size={16} />
            <span>Dashboard</span>
          </button>
          <button 
            className="nav-item active"
          >
            <Activity size={16} />
            <span>Analytics</span>
          </button>
          <button 
            className="nav-item"
            onClick={() => handleNavigate('/dashboard/history')}
          >
            <Clock size={16} />
            <span>History</span>
          </button>
          <button 
            className="nav-item"
            onClick={() => handleNavigate('/dashboard/settings')}
          >
            <Settings size={16} />
            <span>Settings</span>
          </button>
          <button className="nav-item">
            <AlertTriangle size={16} />
            <span>Alerts</span>
          </button>
        </nav>

        {/* Log Out */}
        <button 
          className="nav-item logout"
          onClick={() => {
            authService.logout();
            navigate('/login');
          }}
        >
          <LogOut size={16} />
          <span>Log Out</span>
        </button>
      </div>

      {/* Main Content */}
      <div className="main-content">
        <div className="analytics-header">
          <h1>Analytics Dashboard</h1>
          <p>View your rice drying performance metrics</p>
        </div>

        {/* Analytics Cards */}
        <div className="analytics-grid">
          <div className="analytics-card">
            <div className="card-header">
              <h3>Drying Efficiency</h3>
              <TrendingUp size={20} />
            </div>
            <div className="card-content">
              <h2>85%</h2>
              <p>Average drying efficiency this month</p>
            </div>
          </div>

          <div className="analytics-card">
            <div className="card-header">
              <h3>Moisture Distribution</h3>
              <PieChart size={20} />
            </div>
            <div className="card-content">
              <h2>14%</h2>
              <p>Average final moisture content</p>
            </div>
          </div>

          <div className="analytics-card">
            <div className="card-header">
              <h3>Energy Usage</h3>
              <BarChart2 size={20} />
            </div>
            <div className="card-content">
              <h2>2.4 kWh</h2>
              <p>Per kg of rice dried</p>
            </div>
          </div>

          <div className="analytics-card">
            <div className="card-header">
              <h3>Processing Time</h3>
              <Clock size={20} />
            </div>
            <div className="card-content">
              <h2>4.5 hrs</h2>
              <p>Average drying cycle duration</p>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="charts-section">
          <div className="chart-container">
            <h3>Monthly Performance Trends</h3>
            <div className="chart-placeholder">
              {/* Add actual chart library implementation here */}
              <div className="placeholder-text">Performance Chart</div>
            </div>
          </div>
          
          <div className="chart-container">
            <h3>Energy Consumption Analysis</h3>
            <div className="chart-placeholder">
              {/* Add actual chart library implementation here */}
              <div className="placeholder-text">Energy Chart</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}