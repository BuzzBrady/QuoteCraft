// src/pages/ProfileSettingsPage.tsx
import React, { useState, useEffect, FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext'; // Verify path
import { db } from '../config/firebaseConfig';    // Verify path
import { doc, getDoc, setDoc, updateDoc, Timestamp, serverTimestamp } from 'firebase/firestore'; // Added updateDoc
import { UserProfile } from '../types'; // Assuming UserProfile includes the new fields

// Basic styles (consider moving to a ProfileSettingsPage.module.css)
const pageStyles: React.CSSProperties = {
    maxWidth: '700px',
    margin: '0 auto',
    padding: '20px',
};
const formGroupStyles: React.CSSProperties = {
    marginBottom: '20px',
};
const labelStyles: React.CSSProperties = {
    display: 'block',
    marginBottom: '5px',
    fontWeight: 'bold',
};
const inputStyles: React.CSSProperties = {
    width: '100%',
    padding: '10px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    boxSizing: 'border-box',
};
const textareaStyles: React.CSSProperties = {
    ...inputStyles,
    minHeight: '100px',
    resize: 'vertical',
};
const buttonStyles: React.CSSProperties = {
    padding: '10px 20px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1rem',
};
const successMessageStyles: React.CSSProperties = {
    color: 'green',
    backgroundColor: '#e6ffed',
    border: '1px solid green',
    padding: '10px',
    borderRadius: '4px',
    marginTop: '20px',
};
const errorMessageStyles: React.CSSProperties = {
    color: 'red',
    backgroundColor: '#ffe6e6',
    border: '1px solid red',
    padding: '10px',
    borderRadius: '4px',
    marginTop: '20px',
};


function ProfileSettingsPage() {
    const { currentUser } = useAuth();
    const [profileData, setProfileData] = useState<Partial<UserProfile>>({}); // Use Partial for flexibility

    // Form state - initialize with empty strings or defaults
    const [businessName, setBusinessName] = useState('');
    const [companyAddress, setCompanyAddress] = useState('');
    const [companyPhone, setCompanyPhone] = useState('');
    const [companyEmail, setCompanyEmail] = useState('');
    const [abnOrTaxId, setAbnOrTaxId] = useState('');
    const [logoUrl, setLogoUrl] = useState('');
    const [defaultQuoteTerms, setDefaultQuoteTerms] = useState('');
    const [quotePrefix, setQuotePrefix] = useState('');
    const [nextQuoteSequence, setNextQuoteSequence] = useState<number>(1); // For display
    const [quoteNumberPadding, setQuoteNumberPadding] = useState<string>('0'); // Store as string for input

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Fetch existing profile data
    useEffect(() => {
        if (!currentUser?.uid) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        const userProfileRef = doc(db, 'users', currentUser.uid);
        getDoc(userProfileRef)
            .then((docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data() as UserProfile;
                    setProfileData(data);
                    // Populate form fields
                    setBusinessName(data.businessName || '');
                    setCompanyAddress(data.companyAddress || '');
                    setCompanyPhone(data.companyPhone || '');
                    setCompanyEmail(data.companyEmail || currentUser.email || ''); // Fallback to auth email
                    setAbnOrTaxId(data.abnOrTaxId || '');
                    setLogoUrl(data.logoUrl || '');
                    setDefaultQuoteTerms(data.defaultQuoteTerms || '');
                    setQuotePrefix(data.quotePrefix || 'QT-');
                    setNextQuoteSequence(data.nextQuoteSequence || 1);
                    setQuoteNumberPadding((data.quoteNumberPadding || 0).toString());
                } else {
                    // No profile yet, set defaults for new users
                    console.log("No such profile document! Setting defaults.");
                    setQuotePrefix('QT-');
                    setNextQuoteSequence(1);
                    setCompanyEmail(currentUser.email || '');
                }
            })
            .catch((err) => {
                console.error("Error fetching profile:", err);
                setError("Failed to load profile data.");
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, [currentUser]);

    const handleSaveSettings = async (event: FormEvent) => {
        event.preventDefault();
        if (!currentUser?.uid) {
            setError("You must be logged in to save settings.");
            return;
        }

        setIsSaving(true);
        setError(null);
        setSuccessMessage(null);

        const userProfileRef = doc(db, 'users', currentUser.uid);
        const paddingValue = parseInt(quoteNumberPadding, 10);

        const settingsToSave: Partial<UserProfile> = {
            businessName: businessName.trim(),
            companyAddress: companyAddress.trim(),
            companyPhone: companyPhone.trim(),
            companyEmail: companyEmail.trim(),
            abnOrTaxId: abnOrTaxId.trim(),
            logoUrl: logoUrl.trim(),
            defaultQuoteTerms: defaultQuoteTerms.trim(),
            quotePrefix: quotePrefix.trim(),
            // nextQuoteSequence is typically only set once initially or managed by quote creation logic
            // For this form, we might only set it if it's the very first time or allow users to "reset" it
            // Be cautious with updating nextQuoteSequence directly here without validation
            nextQuoteSequence: profileData.nextQuoteSequence || nextQuoteSequence, // Preserve existing unless explicitly changed
            quoteNumberPadding: isNaN(paddingValue) ? 0 : paddingValue,
            updatedAt: serverTimestamp() as Timestamp,
        };

        // If this is a new profile, also set createdAt
        if (!profileData.createdAt) {
            settingsToSave.createdAt = serverTimestamp() as Timestamp;
        }


        try {
            // Use setDoc with merge:true to create if not exists, or update if exists
            await setDoc(userProfileRef, settingsToSave, { merge: true });
            setSuccessMessage("Settings saved successfully!");
            // Optionally re-fetch or update profileData state if needed immediately
            setProfileData(prev => ({...prev, ...settingsToSave, updatedAt: Timestamp.now()})); // Optimistic update
        } catch (err: any) {
            console.error("Error saving settings:", err);
            setError(`Failed to save settings: ${err.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return <div style={pageStyles}><p>Loading profile...</p></div>;
    }

    return (
        <div style={pageStyles}>
            <h2>Profile & Settings</h2>
            <form onSubmit={handleSaveSettings}>
                <h3>Company Information</h3>
                <div style={formGroupStyles}>
                    <label htmlFor="businessName" style={labelStyles}>Business Name:</label>
                    <input type="text" id="businessName" style={inputStyles} value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
                </div>
                <div style={formGroupStyles}>
                    <label htmlFor="companyEmail" style={labelStyles}>Company Email:</label>
                    <input type="email" id="companyEmail" style={inputStyles} value={companyEmail} onChange={(e) => setCompanyEmail(e.target.value)} />
                </div>
                <div style={formGroupStyles}>
                    <label htmlFor="companyPhone" style={labelStyles}>Company Phone:</label>
                    <input type="tel" id="companyPhone" style={inputStyles} value={companyPhone} onChange={(e) => setCompanyPhone(e.target.value)} />
                </div>
                <div style={formGroupStyles}>
                    <label htmlFor="companyAddress" style={labelStyles}>Company Address:</label>
                    <textarea id="companyAddress" style={textareaStyles} value={companyAddress} onChange={(e) => setCompanyAddress(e.target.value)} placeholder="Street, City, State, Postcode, Country" />
                </div>
                <div style={formGroupStyles}>
                    <label htmlFor="abnOrTaxId" style={labelStyles}>ABN / Tax ID:</label>
                    <input type="text" id="abnOrTaxId" style={inputStyles} value={abnOrTaxId} onChange={(e) => setAbnOrTaxId(e.target.value)} />
                </div>
                <div style={formGroupStyles}>
                    <label htmlFor="logoUrl" style={labelStyles}>Logo URL (Direct link to image):</label>
                    <input type="url" id="logoUrl" style={inputStyles} value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://example.com/logo.png" />
                </div>

                <h3>Quote Settings</h3>
                <div style={formGroupStyles}>
                    <label htmlFor="defaultQuoteTerms" style={labelStyles}>Default Quote Terms & Conditions:</label>
                    <textarea id="defaultQuoteTerms" style={textareaStyles} value={defaultQuoteTerms} onChange={(e) => setDefaultQuoteTerms(e.target.value)} />
                </div>
                <div style={formGroupStyles}>
                    <label htmlFor="quotePrefix" style={labelStyles}>Quote Number Prefix:</label>
                    <input type="text" id="quotePrefix" style={inputStyles} value={quotePrefix} onChange={(e) => setQuotePrefix(e.target.value)} placeholder="e.g., QT- or INV-" />
                </div>
                <div style={formGroupStyles}>
                    <label htmlFor="nextQuoteSequence" style={labelStyles}>Next Quote Number Will Be: (Updates after saving a quote)</label>
                    <input type="number" id="nextQuoteSequenceDisplay" style={{...inputStyles, backgroundColor: '#f0f0f0'}} value={nextQuoteSequence} readOnly />
                    <small>This number increments automatically when you save a new quote. To reset or set a new starting sequence, contact support (or advanced settings in future).</small>
                </div>
                <div style={formGroupStyles}>
                    <label htmlFor="quoteNumberPadding" style={labelStyles}>Quote Number Padding (Digits, e.g., 5 for 00001):</label>
                    <input type="number" id="quoteNumberPadding" style={inputStyles} value={quoteNumberPadding} onChange={(e) => setQuoteNumberPadding(e.target.value)} placeholder="e.g., 5" min="0" max="10"/>
                </div>


                {/* TODO: Add Display Name update (Firebase Auth updateProfile) */}
                {/* TODO: Add Password Change section */}

                <button type="submit" style={buttonStyles} disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save Settings'}
                </button>
            </form>

            {successMessage && <p style={successMessageStyles}>{successMessage}</p>}
            {error && <p style={errorMessageStyles}>{error}</p>}
        </div>
    );
}

export default ProfileSettingsPage;