import { useState, useEffect, useRef } from 'react';
import { Search, Download, Plus, Edit2, Trash2, LogOut, Users, AlertTriangle, Wifi, WifiOff } from 'lucide-react';
import './AdminDashboard.css';
import { useNavigate } from 'react-router-dom';
import authService from '../../api/authService';
import logo from "../../assets/images/logo2.png";
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { io } from 'socket.io-client';

export default function UserManagement({ view }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);  // array of online user IDs
  const socketRef = useRef(null);
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [stats, setStats] = useState({ totalUsers: 0, admins: 0, regularUsers: 0 });

  // Socket connection for real-time online status
  useEffect(() => {
    const SOCKET_URL = process.env.NODE_ENV === 'development'
      ? 'http://192.168.86.181:5001'
      : 'https://mala-backend-q03k.onrender.com';

    const socket = io(SOCKET_URL, {
      transports: ['polling', 'websocket'],
      reconnection: true,
    });

    socketRef.current = socket;

    // Admin identifies as online too
    const user = JSON.parse(localStorage.getItem('user'));
    if (user?._id) {
      socket.emit('user_online', user._id);
    }

    // Receive the full list of online user IDs
    socket.on('online_users', (userIds) => {
      setOnlineUsers(userIds);
    });

    return () => socket.disconnect();
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      const user = JSON.parse(localStorage.getItem('user'));
      const token = localStorage.getItem('token');
      if (!user || !token || user.role !== 'Admin') { navigate('/login'); return; }
      try {
        const data = await authService.getAdminDashboardData();
        if (!data || !data.users) throw new Error('Invalid data received');
        setUsers(data.users);
        setStats({ totalUsers: data.totalUsers, admins: data.admins, regularUsers: data.regularUsers });
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
    checkAuth();
  }, [navigate]);

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
      } finally { setLoading(false); }
    }
  };

  const handleEditUser = (user) => { setEditingUser(user); setShowEditModal(true); };

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
    } finally { setLoading(false); }
  };

  const handleAddUser = async (newUser) => {
    try {
      setLoading(true);
      const addedUser = await authService.registerUser(newUser);
      setUsers([...users, addedUser]);
      setShowAddModal(false);
      toast.success('User added successfully');
      setStats(prev => ({
        ...prev,
        totalUsers: prev.totalUsers + 1,
        admins: addedUser.role === 'Admin' ? prev.admins + 1 : prev.admins,
        regularUsers: addedUser.role === 'User' ? prev.regularUsers + 1 : prev.regularUsers
      }));
    } catch (err) {
      setError(err.message || 'Failed to add user');
      toast.error(err.message || 'Failed to add user');
    } finally { setLoading(false); }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.fullname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role.toLowerCase() === roleFilter.toLowerCase();
    return matchesSearch && matchesRole;
  });

  // Helper: is this user currently online?
  const isOnline = (userId) => onlineUsers.includes(String(userId));

  return (
    <div className="admin-container">

      {error && <div className="error-banner"><AlertTriangle size={20} /><span>{error}</span></div>}
      {loading && <div className="loading-overlay"><div className="loading-spinner"></div><p>Loading admin dashboard...</p></div>}

      {showLogoutConfirm && (
        <div className="modal-overlay" onClick={() => setShowLogoutConfirm(false)}>
          <div className="admin-modal-confirm" onClick={e => e.stopPropagation()}>
            <div className="confirm-header"><LogOut size={24} /><h3>Confirm Logout</h3></div>
            <div className="confirm-body"><p>Are you sure you want to log out?</p></div>
            <div className="confirm-footer">
              <button className="btn-cancel" onClick={() => setShowLogoutConfirm(false)}>Cancel</button>
              <button className="btn-confirm" onClick={() => { authService.logout(); navigate('/login'); }}>Log Out</button>
            </div>
          </div>
        </div>
      )}

      <header className="admin-topbar">
        <div className="admin-topbar-logo">
          <img src={logo} alt="Logo" className="admin-logo-img" />
        </div>
        <nav className="admin-topbar-nav">
          <button className="admin-nav-item active" onClick={() => navigate('/admindashboard')}>
            <Users size={16} /><span>User Management</span>
          </button>
        </nav>
        <div className="admin-topbar-right">
          <button className="admin-nav-item admin-logout" onClick={() => setShowLogoutConfirm(true)}>
            <LogOut size={16} /><span>Log Out</span>
          </button>
        </div>
      </header>

      <div className="admin-main">
        <div className="admin-header">
          <h1>USER MANAGEMENT</h1>
          <p>Manage all users in one place. Control access, assign roles, and monitor activity across your platform.</p>
        </div>

        <div className="stats-container">
          <div className="stat-card"><h3>Total Users</h3><p className="stat-number">{stats.totalUsers}</p></div>
          <div className="stat-card"><h3>Admin</h3><p className="stat-number">{stats.admins}</p></div>
          <div className="stat-card"><h3>Regular Users</h3><p className="stat-number">{stats.regularUsers}</p></div>
        </div>

        <div className="content-area">
          <div className="toolbar">
            <div className="toolbar-left">
              <div className="search-box">
                <Search size={18} />
                <input type="text" placeholder="Search" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
              <div className="role-filter">
                <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
                  <option value="all">Role</option>
                  <option value="admin">Admin</option>
                  <option value="user">User</option>
                </select>
              </div>
            </div>
            <div className="toolbar-right">
              <button className="btn-secondary"><Download size={18} />Export</button>
              <button className="btn-primary" onClick={() => setShowAddModal(true)}><Plus size={18} />Add User</button>
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
                    <th>Status</th>
                    <th>Role</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user, index) => {
                    const online = isOnline(user._id);
                    const isAdmin = user.role === 'Admin';
                    return (
                      <tr key={user._id || index}>
                        <td className="username">
                          <div className="username-cell">
                            <span className={`online-dot ${online ? 'dot-online' : 'dot-offline'}`} />
                            {user.username}
                          </div>
                        </td>
                        <td>{user.fullname}</td>
                        <td>{user.email}</td>
                        <td>
                          {isAdmin ? (
                            // Admin always shows as Online
                            <span className="status-badge status-online">
                              <Wifi size={12} /> Online
                            </span>
                          ) : online ? (
                            <span className="status-badge status-online">
                              <Wifi size={12} /> Online
                            </span>
                          ) : (
                            <span className="status-badge status-offline">
                              <WifiOff size={12} /> Offline
                            </span>
                          )}
                        </td>
                        <td><span className={`role-badge ${user.role.toLowerCase()}`}>{user.role}</span></td>
                        <td>
                          <div className="actions">
                            <button className="icon-btn" onClick={() => handleEditUser(user)} title="Edit user"><Edit2 size={16} /></button>
                            <button className="icon-btn delete" onClick={() => handleDeleteUser(user._id)} title="Delete user"><Trash2 size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Edit User Modal */}
      {showEditModal && editingUser && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="form-modal" onClick={e => e.stopPropagation()}>
            <div className="form-modal-header">
              <h2>Edit User</h2>
              <button className="form-close-btn" onClick={() => setShowEditModal(false)}>×</button>
            </div>
            <div className="form-modal-body">
              <form onSubmit={e => { e.preventDefault(); handleSaveEdit(editingUser); }}>
                <div className="form-group"><label>Username</label><input type="text" value={editingUser.username} onChange={e => setEditingUser({...editingUser, username: e.target.value})} required placeholder="Enter username" /></div>
                <div className="form-group"><label>Full Name</label><input type="text" value={editingUser.fullname} onChange={e => setEditingUser({...editingUser, fullname: e.target.value})} required placeholder="Enter full name" /></div>
                <div className="form-group"><label>Email</label><input type="email" value={editingUser.email} onChange={e => setEditingUser({...editingUser, email: e.target.value})} required placeholder="Enter email" /></div>
                <div className="form-group"><label>Role</label>
                  <select value={editingUser.role} onChange={e => setEditingUser({...editingUser, role: e.target.value})}>
                    <option value="User">User</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>
                <div className="form-modal-footer">
                  <button type="button" className="btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
                  <button type="submit" className="btn-primary">Save Changes</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="form-modal" onClick={e => e.stopPropagation()}>
            <div className="form-modal-header">
              <h2>Add New User</h2>
              <button className="form-close-btn" onClick={() => setShowAddModal(false)}>×</button>
            </div>
            <div className="form-modal-body">
              <form onSubmit={e => {
                e.preventDefault();
                const f = new FormData(e.target);
                handleAddUser({ username: f.get('username'), fullname: f.get('fullname'), email: f.get('email'), password: f.get('password'), role: f.get('role') });
              }}>
                <div className="form-group"><label>Username</label><input type="text" name="username" required placeholder="Enter username" /></div>
                <div className="form-group"><label>Full Name</label><input type="text" name="fullname" required placeholder="Enter full name" /></div>
                <div className="form-group"><label>Email</label><input type="email" name="email" required placeholder="Enter email" /></div>
                <div className="form-group"><label>Password</label><input type="password" name="password" required placeholder="Enter password" minLength="6" /></div>
                <div className="form-group"><label>Role</label>
                  <select name="role" required><option value="User">User</option><option value="Admin">Admin</option></select>
                </div>
                <div className="form-modal-footer">
                  <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                  <button type="submit" className="btn-primary">Add User</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}