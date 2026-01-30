import React, { useState } from 'react'
import "./SignUpPage.css"
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../utils/axios';

function SignUpPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [fullname, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('User');
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const togglePasswordVisibility = () => setShowPassword(prev => !prev);

  const handleSubmit = async (e) => {
    setLoading(true);
    setError('');
    e.preventDefault();

    if (!username || !fullname || !email || !password) {
      setError('Please fill in all required fields');
      toast.error('Please fill in all required fields');
      setLoading(false);
      return;
    }

    try {
      const response = await api.post("/api/auth/register", {
        username,
        fullname,
        email,
        password,
        role
      });
      
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        if (response.data.user) {
          localStorage.setItem('user', JSON.stringify(response.data.user));
        }
        toast.success("Registration successful!");
        navigate(role === 'Admin' ? '/admindashboard' : '/dashboard');
      }
    } catch (err) {
      console.error('Registration error:', err);
      const errorMessage = err?.response?.data?.message || 
                          (err.code === 'ERR_NETWORK' ? 
                            'Network error. Trying alternate server...' : 
                            'Registration failed. Please try again.');
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div>
      <div className="signup-hero">
        <div className="signup-container">
          <div className="form-header">
            <h1 className="form-title">SIGN UP</h1>
            
          </div>


          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="username" className="form-label">Username</label>
              <input
                type="text"
                autoComplete="off"
                className="form-input"
                placeholder="Enter a username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="fullName" className="form-label">Full Name</label>
              <input 
                type="text" 
                autoComplete="off"
                className="form-input" 
                placeholder="Enter Full name"
                value={fullname}
                onChange={(e)=> setName(e.target.value)}
              />
            
            </div>

            <div className="form-group">
              <label htmlFor="email" className="form-label">Email Address</label>
              <input 
                type="email" 
                autoComplete="off"
                className="form-input" 
                placeholder="Enter Email"
                onChange={(e)=> setEmail(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">Password</label>
              <div className="password-container">
                <input 
                  type={showPassword ? "text" : "password"} 
                  autoComplete="off"
                  className="form-input" 
                  placeholder="Create a strong password"
                  onChange={(e)=> setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={togglePasswordVisibility}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>                                                                                                                 
              </div>
            </div>

          {/* <div className="form-group">
            <label className="form-label">Select Role</label>
            <div className="role-container">
              <button
                type="button"
                className={`role-button ${role === "User" ? 'active' : ''}`}
                onClick={(e) => {
                  e.preventDefault();
                  setRole("User");
                }}
              >
                User
              </button>

              <button
                type="button"
                className={`role-button ${role === "Admin" ? 'active' : ''}`}
                onClick={(e) => {
                  e.preventDefault();
                  setRole("Admin");
                }}
              >
                Admin
              </button>
            </div>
          </div> */}

            <button
              type="submit"
              className="submit-btn"
            >
              <span className="btn-text">
                Create Account
              </span>
            </button>
            {error && <div className="error-message">{error}</div>}
            </form>

          <div className="signin-link">
            Already have an account? 
            <br /><Link to="/login">Log in</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SignUpPage;