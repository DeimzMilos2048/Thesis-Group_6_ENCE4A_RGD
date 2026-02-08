import React, { useState, useContext } from 'react';
import "./LoginPage.css";
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import AuthStore from '../../utils/authStore';

function LoginPage() {
    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();
    const { login, loading } = AuthStore();

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        if (!email || !password) {
            setError("Please fill in all fields");
            toast.error("Please fill in all fields");
            return;
        }

        try {
            setError("");
            const result = await login(email, password);
            
            // Get the user data from localStorage
            const userData = JSON.parse(localStorage.getItem('user'));
            console.log('User data after login:', userData); 

            if (!userData) {
                const error = "Login failed. No user data received.";
                setError(error);
                toast.error(error);
                return;
            }

            toast.success("Login successful!");

            // Navigate using the redirectTo path from server response
            const redirectPath = userData.redirectTo || '/dashboard';
            console.log('Navigating to:', redirectPath);
            navigate(redirectPath);
        } catch (err) {
            console.error('Login error:', err);
            const errorMessage = err?.response?.data?.message || 
                               (err.code === 'ERR_NETWORK' ? 
                                'Network error. Trying alternate server...' : 
                                'Login failed. Please try again.');
            setError(errorMessage);
            toast.error(errorMessage);
        }
    };

    return (
        <div>
            <div className="login-hero">
                <div className="login-container">
                    <div className="form-header">
                        <h1 className="form-title">LOG IN</h1>
                    </div>

                    <form onSubmit={handleLogin}>
                        
                        <div className="form-group">
                            <label htmlFor="email" className="form-label">Email Address</label>
                            <input 
                                type="email" 
                                autoComplete="off"
                                className="form-input" 
                                placeholder="Enter Email"
                                value={email}
                                onChange={(e)=> setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="password" className="form-label">Password</label>
                            <div className="password-container">
                                <input 
                                    type={showPassword ? "text" : "password"} 
                                    autoComplete="off"
                                    className="form-input" 
                                    placeholder="Enter Password"
                                    value={password}
                                    onChange={(e)=> setPassword(e.target.value)}
                                    required
                                />
                                <button 
                                    type="button" 
                                    className="password-toggle" 
                                    onClick={togglePasswordVisibility}
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                >
                                    {showPassword ? <VisibilityIcon /> : <VisibilityOffIcon />}
                                </button>
                            </div>
                        </div>

                        <div className ="forgot-password">              
                                Forgot Password?
                        </div>

                        <button type="submit" className="submit-btn">
                            <span className="btn-text">
                                Log In
                            </span>
                        </button>
                    </form>

                    <div className="login-link">
                        Don't have an account?
                        <br></br><Link to="/signup">Sign Up</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default LoginPage;