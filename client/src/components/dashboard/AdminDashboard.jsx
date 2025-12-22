import React, { useState, useEffect } from 'react';

import { Search, Download, Plus, Edit2, Trash2, Settings, LogOut, Users, AlertTriangle } from 'lucide-react';
import './AdminDashboard.css';
import { useNavigate } from 'react-router-dom';
import authService from '../../api/authService';
import logo from "../../assets/images/logo2.png";
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function UserManagement({ view }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    admins: 0,
    regularUsers: 0
  });

  useEffect(() => {
    const checkAuth = async () => {
      const user = JSON.parse(localStorage.getItem('user'));
      const token = localStorage.getItem('token');

      if (!user || !token || user.role !== 'Admin') {
        navigate('/login');
        return;
      }

      const fetchAdminData = async () => {
        try {
          const data = await authService.getAdminDashboardData();
          if (!data || !data.users) {
            throw new Error('Invalid data received');
          }
          setUsers(data.users);
          setStats({
            totalUsers: data.totalUsers,
            admins: data.admins,
            regularUsers: data.regularUsers
          });
          setError(null);
        } catch (err) {
          console.error('Dashboard error:', err);
          setError(err.message || 'Failed to load dashboard data');
          if (err.response?.status === 401 || err.message.includes('Not authorized')) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            navigate('/login');
          }
        } finally {
          setLoading(false);
        }
      };

      fetchAdminData();
    };

    checkAuth();
  }, [navigate]);

  // Handle user deletion
  const handleDeleteUser = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        setLoading(true);
        await authService.deleteUser(userId);
        setUsers(users.filter(user => user._id !== userId));
        toast.success('User deleted successfully');
      } catch (err) {
        setError(err.message || 'Failed to delete user');
        toast.error(err.message || 'Failed to delete user');
      } finally {
        setLoading(false);
      }
    }
  };

  // Handle user edit
  const handleEditUser = async (user) => {
    setEditingUser(user);
    setShowEditModal(true);
  };

  // Handle save edited user
  const handleSaveEdit = async (editedUser) => {
    try {
      setLoading(true);
      const updatedUser = await authService.updateUser(editedUser._id, editedUser);
      setUsers(users.map(user => user._id === updatedUser._id ? updatedUser : user));
      setShowEditModal(false);
      setEditingUser(null);
      toast.success('User updated successfully');
    } catch (err) {
      setError(err.message || 'Failed to update user');
      toast.error(err.message || 'Failed to update user');
    } finally {
      setLoading(false);
    }
  };

  // Handle add new user
  const handleAddUser = async (newUser) => {
    try {
      setLoading(true);
      const addedUser = await authService.registerUser(newUser);
      setUsers([...users, addedUser]);
      setShowAddModal(false);
      toast.success('User added successfully');
      
      // Update stats
      setStats(prev => ({
        ...prev,
        totalUsers: prev.totalUsers + 1,
        admins: addedUser.role === 'Admin' ? prev.admins + 1 : prev.admins,
        regularUsers: addedUser.role === 'User' ? prev.regularUsers + 1 : prev.regularUsers
      }));
    } catch (err) {
      setError(err.message || 'Failed to add user');
      toast.error(err.message || 'Failed to add user');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.fullname.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role.toLowerCase() === roleFilter.toLowerCase();
    return matchesSearch && matchesRole;
  });

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
          <p>Loading admin dashboard...</p>
        </div>
      )}
      {/* Sidebar */}
      <div className="sidebar">
        {/* Logo */}
          <div class="logo-section">
          <div class="logo-box">
          <img src={logo} alt="" class="sidebar-logo" />
          </div>
        </div>

        {/* Navigation */}
        <nav className="nav-section">
          <button 
            className={`nav-item ${view !== 'settings' ? 'active' : ''}`}
            onClick={() => navigate('/admindashboard')}
          >
            <Users size={16} />
            <span>Users</span>
          </button>
          <button 
            className={`nav-item ${view === 'settings' ? 'active' : ''}`}
            onClick={() => navigate('/admindashboard/settings')}
          >
            <Settings size={16} />
            <span>Settings</span>
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
        {view === 'settings' ? (
          <>
            {/* Header */}
            <div className="header">
              <h1>SETTINGS</h1>
              <p>Admin settings placeholder. Configure platform preferences.</p>
            </div>
            {/* Content Area */}
            <div className="content-area">
              <div className="stats-container">
                <div className="stat-card">
                  <h3>Settings</h3>
                  <p className="stat-number">PlaceHolder</p>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Header */}
            <div className="header">
              <h1>USER MANAGEMENT</h1>
              <p>Manage all users in one place. Control access, assign roles, and monitor activity across your platform.</p>
            </div>

            {/* Stats Cards */}
            <div className="stats-container">
              <div className="stat-card">
                <h3>Total Users</h3>
                <p className="stat-number">{stats.totalUsers}</p>
              </div>
              <div className="stat-card">
                <h3>Admin</h3>
                <p className="stat-number">{stats.admins}</p>
              </div>
              <div className="stat-card">
                <h3>Regular Users</h3>
                <p className="stat-number">{stats.regularUsers}</p>
              </div>
            </div>

            {/* Content Area */}
            <div className="content-area">
              <div className="toolbar">
                <div className="toolbar-left">
                  <div className="search-box">
                    <Search size={18} />
                    <input
                      type="text"
                      placeholder="Search"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="role-filter">
                    <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                      <option value="all">Role</option>
                      <option value="admin">Admin</option>
                      <option value="user">User</option>
                    </select>
                  </div>
                </div>
                <div className="toolbar-right">
                  <button className="btn-secondary">
                    <Download size={18} />
                    Export
                  </button>
                  <button 
                    className="btn-primary"
                    onClick={() => setShowAddModal(true)}
                  >
                    <Plus size={18} />
                    Add User
                  </button>
                </div>
              </div>

              <div className="user-table-card">
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Username</th>
                        <th>Full Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((user, index) => (
                        <tr key={user._id || index}>
                          <td className="username">{user.username}</td>
                          <td>{user.fullname}</td>
                          <td>{user.email}</td>
                          <td>
                            <span className={`role-badge ${user.role.toLowerCase()}`}>
                              {user.role}
                            </span>
                          </td>
                          <td>
                            <div className="actions">
                              <button 
                                className="icon-btn"
                                onClick={() => handleEditUser(user)}
                                title="Edit user"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button 
                                className="icon-btn delete"
                                onClick={() => handleDeleteUser(user._id)}
                                title="Delete user"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Edit User Modal */}
      {showEditModal && editingUser && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Edit User</h2>
              <button className="close-btn" onClick={() => setShowEditModal(false)}>×</button>
            </div>
            <div className="modal-content">
              <form onSubmit={(e) => {
                e.preventDefault();
                handleSaveEdit(editingUser);
              }}>
                <div className="form-group">
                  <label>Username:</label>
                  <input
                    type="text"
                    value={editingUser.username}
                    onChange={(e) => setEditingUser({...editingUser, username: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Full Name:</label>
                  <input
                    type="text"
                    value={editingUser.fullname}
                    onChange={(e) => setEditingUser({...editingUser, fullname: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Email:</label>
                  <input
                    type="email"
                    value={editingUser.email}
                    onChange={(e) => setEditingUser({...editingUser, email: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Role:</label>
                  <select
                    value={editingUser.role}
                    onChange={(e) => setEditingUser({...editingUser, role: e.target.value})}
                  >
                    <option value="User">User</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn-secondary" onClick={() => setShowEditModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Add New User</h2>
              <button className="close-btn" onClick={() => setShowAddModal(false)}>×</button>
            </div>
            <div className="modal-content">
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const newUser = {
                  username: formData.get('username'),
                  fullname: formData.get('fullname'),
                  email: formData.get('email'),
                  password: formData.get('password'),
                  role: formData.get('role')
                };
                handleAddUser(newUser);
              }}>
                <div className="form-group">
                  <label>Username:</label>
                  <input
                    type="text"
                    name="username"
                    required
                    placeholder="Enter username"
                  />
                </div>
                <div className="form-group">
                  <label>Full Name:</label>
                  <input
                    type="text"
                    name="fullname"
                    required
                    placeholder="Enter full name"
                  />
                </div>
                <div className="form-group">
                  <label>Email:</label>
                  <input
                    type="email"
                    name="email"
                    required
                    placeholder="Enter email"
                  />
                </div>
                <div className="form-group">
                  <label>Password:</label>
                  <input
                    type="password"
                    name="password"
                    required
                    placeholder="Enter password"
                    minLength="6"
                  />
                </div>
                <div className="form-group">
                  <label>Role:</label>
                  <select name="role" required>
                    <option value="User">User</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Add User
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}