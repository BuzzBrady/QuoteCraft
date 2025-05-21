// src/components/LoginPage.tsx
import React, { useState, FormEvent } from 'react';
import { auth } from '../config/firebaseConfig.ts'; // Import the auth instance
import { signInWithEmailAndPassword, AuthError } from 'firebase/auth'; // Import the sign-in function
import { useNavigate } from 'react-router-dom'; // Import useNavigate for redirection

function LoginPage() {
    // State for form inputs
    const [email, setEmail] = useState<string>('');
    const [password, setPassword] = useState<string>('');

    // State for loading and error messages
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // Hook to enable navigation
    const navigate = useNavigate();

    // Function to handle form submission
    const handleLogin = async (event: FormEvent) => {
        event.preventDefault(); // Prevent default page reload
        setLoading(true);
        setError(null);

        try {
            console.log(`Attempting login for: ${email}`);
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            // Login successful!
            console.log('Login successful:', userCredential.user);

            // Navigate to the dashboard route after successful login
            navigate('/dashboard'); // <-- Redirects to the dashboard

        } catch (err) {
            const authError = err as AuthError; // Type assertion for specific error codes
            console.error('Login failed:', authError.code, authError.message);

            // Set user-friendly error messages
            let errorMessage = 'Login failed. Please check your credentials.';
            if (authError.code === 'auth/invalid-credential' || authError.code === 'auth/wrong-password' || authError.code === 'auth/user-not-found') {
                errorMessage = 'Invalid email or password.';
            } else if (authError.code === 'auth/invalid-email') {
                errorMessage = 'Please enter a valid email address.';
            } else if (authError.code === 'auth/too-many-requests') {
                errorMessage = 'Too many login attempts. Please try again later.';
            }
            // Consider adding more specific Firebase Auth error codes if needed
            // e.g., 'auth/user-disabled'

            setError(errorMessage);

        } finally {
            setLoading(false); // Re-enable button
        }
    };

    return (
        // Add a className for styling via CSS file
        <div className="login-container" style={styles.container}>
            <h2 style={styles.title}>Login to QuoteCraft</h2>
            <form onSubmit={handleLogin} style={styles.form}>
                <div style={styles.inputGroup}>
                    <label htmlFor="email" style={styles.label}>Email:</label>
                    <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        style={styles.input}
                        placeholder="Enter your email"
                    />
                </div>
                <div style={styles.inputGroup}>
                    <label htmlFor="password" style={styles.label}>Password:</label>
                    <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        style={styles.input}
                        placeholder="Enter your password"
                    />
                </div>

                {/* Display Error Message if login fails */}
                {error && (
                    <p style={styles.errorText}>{error}</p>
                )}

                <button type="submit" disabled={loading} style={styles.button}>
                    {loading ? 'Logging in...' : 'Login'}
                </button>

                {/* Optional: Link to Signup Page */}
                {/* <p style={styles.linkText}>
                    Don't have an account? <Link to="/signup">Sign Up</Link>
                </p> */}
            </form>
        </div>
    );
}

// Basic inline styles (consider moving to your main CSS file)
const styles: { [key: string]: React.CSSProperties } = {
    container: {
        maxWidth: '400px',
        margin: '40px auto',
        padding: '30px',
        borderRadius: '8px',
        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
        backgroundColor: 'var(--card-bg, #2f2f2f)', // Use CSS variable
    },
    title: {
        textAlign: 'center',
        marginBottom: '25px',
        color: 'rgba(255, 255, 255, 0.95)',
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
    },
    inputGroup: {
        marginBottom: '15px',
    },
    label: {
        display: 'block',
        marginBottom: '5px',
        fontWeight: '500',
        fontSize: '0.9em',
        color: 'rgba(255, 255, 255, 0.7)',
    },
    input: {
        // Inherits base styles from index.css, ensures full width
        width: '100%',
        boxSizing: 'border-box',
    },
    button: {
        // Inherits base styles from index.css
        width: '100%',
        padding: '10px 15px',
        fontSize: '1.1em',
        marginTop: '10px',
    },
    errorText: {
        color: '#ff6b6b', // Reddish color for errors
        backgroundColor: 'rgba(255, 107, 107, 0.1)', // Slight background
        border: '1px solid rgba(255, 107, 107, 0.3)',
        borderRadius: '4px',
        padding: '8px',
        textAlign: 'center',
        fontSize: '0.9em',
        marginBottom: '10px',
    },
    linkText: { // Style for optional signup link
        textAlign: 'center',
        marginTop: '15px',
        fontSize: '0.9em',
    }
};

export default LoginPage;