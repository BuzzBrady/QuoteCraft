// src/components/LoginPage.tsx
import React, { useState, FormEvent } from 'react';
import { auth } from '../config/firebaseConfig.ts';
import { signInWithEmailAndPassword, AuthError } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
// import styles from './LoginPage.module.css'; // Assuming no CSS module as per current file structure

function LoginPage() {
    const [email, setEmail] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleLogin = async (event: FormEvent) => {
        event.preventDefault();
        setLoading(true);
        setError(null);

        try {
            console.log(`Attempting login for: ${email}`);
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            console.log('Login successful:', userCredential.user);
            navigate('/dashboard');
        } catch (err) {
            const authError = err as AuthError;
            console.error('Login failed:', authError.code, authError.message);
            let errorMessage = 'Login failed. Please check your credentials.';
            if (authError.code === 'auth/invalid-credential' || authError.code === 'auth/wrong-password' || authError.code === 'auth/user-not-found') {
                errorMessage = 'Invalid email or password.';
            } else if (authError.code === 'auth/invalid-email') {
                errorMessage = 'Please enter a valid email address.';
            } else if (authError.code === 'auth/too-many-requests') {
                errorMessage = 'Too many login attempts. Please try again later.';
            }
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        // Added utility classes for layout. Assumes 'login-container' might provide some base styles or is a marker.
        // Specific background color, shadow, and border-radius from original inline styles would ideally
        // be part of a 'login-container' class defined in a global or page-specific CSS file.
        <div 
            className="login-container d-flex flex-column align-items-center p-lg mx-auto" 
            style={{ maxWidth: '400px', marginTop: 'var(--space-xxxl)' }} // Retaining max-width and top margin as critical layout
        >
            <h2 className="text-center mb-lg">Login to QuoteCraft</h2>
            <form onSubmit={handleLogin} className="d-flex flex-column w-100">
                <div className="mb-md">
                    <label htmlFor="email">Email:</label>
                    <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder="Enter your email"
                        // Global input styles will apply
                    />
                </div>
                <div className="mb-md">
                    <label htmlFor="password">Password:</label>
                    <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        placeholder="Enter your password"
                        // Global input styles will apply
                    />
                </div>

                {error && (
                    // Using text-danger for color. Specific background/border for errors would need dedicated CSS.
                    <p className="text-danger p-sm mb-md text-center rounded">
                        {error}
                    </p>
                )}

                <button type="submit" disabled={loading} className="btn btn-primary w-100 mt-sm">
                    {loading ? 'Logging in...' : 'Login'}
                </button>

                {/* Optional: Link to Signup Page */}
                {/* <p className="text-center mt-md">
                    Don't have an account? <Link to="/signup">Sign Up</Link>
                </p> */}
            </form>
        </div>
    );
}

// Removed inline styles object

export default LoginPage;
