// src/pages/ProfileSettingsPage.tsx
import React, { useState, useEffect, FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../config/firebaseConfig';
import { doc, getDoc, setDoc, Timestamp, serverTimestamp } from 'firebase/firestore';
import { UserProfile } from '../types';
import styles from './ProfileSettingsPage.module.css'; // Import the CSS module

function ProfileSettingsPage() {
    const { currentUser } = useAuth();
    const [profileData, setProfileData] = useState<Partial<UserProfile>>({});

    // Form state
    const [businessName, setBusinessName] = useState('');
    const [companyAddress, setCompanyAddress] = useState('');
    const [companyPhone, setCompanyPhone] = useState('');
    const [companyEmail, setCompanyEmail] = useState('');
    const [abnOrTaxId, setAbnOrTaxId] = useState('');
    const [logoUrl, setLogoUrl] = useState('');
    const [defaultQuoteTerms, setDefaultQuoteTerms] = useState('');
    const [quotePrefix, setQuotePrefix] = useState('');
    const [nextQuoteSequence, setNextQuoteSequence] = useState<number>(1);
    const [quoteNumberPadding, setQuoteNumberPadding] = useState<string>('0');
    const [acceptanceInstructions, setAcceptanceInstructions] = useState('');
    const [salesContactPerson, setSalesContactPerson] = useState('');
    const [companyWebsite, setCompanyWebsite] = useState('');
    const [taxRate, setTaxRate] = useState<string>('0');

    // New PDF settings states
    const [showUnitPricesInPdf, setShowUnitPricesInPdf] = useState(true);
    const [showFullItemizedTableInPdf, setShowFullItemizedTableInPdf] = useState(true);

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
                    setBusinessName(data.businessName || '');
                    setCompanyAddress(data.companyAddress || '');
                    setCompanyPhone(data.companyPhone || '');
                    setCompanyEmail(data.companyEmail || currentUser.email || '');
                    setAbnOrTaxId(data.abnOrTaxId || '');
                    setLogoUrl(data.logoUrl || '');
                    setDefaultQuoteTerms(data.defaultQuoteTerms || '');
                    setQuotePrefix(data.quotePrefix || 'QT-');
                    setNextQuoteSequence(data.nextQuoteSequence || 1);
                    setQuoteNumberPadding((data.quoteNumberPadding || 0).toString());
                    setAcceptanceInstructions(data.acceptanceInstructions || '');
                    setSalesContactPerson(data.salesContactPerson || '');
                    setCompanyWebsite(data.companyWebsite || '');
                    setTaxRate((data.taxRate ? data.taxRate * 100 : 0).toString()); // Convert decimal to percentage string

                    setShowUnitPricesInPdf(data.showUnitPricesInPdf === undefined ? true : data.showUnitPricesInPdf);
                    setShowFullItemizedTableInPdf(data.showFullItemizedTableInPdf === undefined ? true : data.showFullItemizedTableInPdf);
                } else {
                    console.log("No such profile document! Setting defaults.");
                    setQuotePrefix('QT-');
                    setNextQuoteSequence(1);
                    setCompanyEmail(currentUser.email || '');
                    setShowUnitPricesInPdf(true);
                    setShowFullItemizedTableInPdf(true);
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
        const parsedTaxRate = parseFloat(taxRate);


        const settingsToSave: Partial<UserProfile> = {
            businessName: businessName.trim(),
            companyAddress: companyAddress.trim(),
            companyPhone: companyPhone.trim(),
            companyEmail: companyEmail.trim(),
            abnOrTaxId: abnOrTaxId.trim(),
            logoUrl: logoUrl.trim(),
            defaultQuoteTerms: defaultQuoteTerms.trim(),
            quotePrefix: quotePrefix.trim(),
            nextQuoteSequence: profileData.nextQuoteSequence || nextQuoteSequence,
            quoteNumberPadding: isNaN(paddingValue) ? 0 : paddingValue,
            acceptanceInstructions: acceptanceInstructions.trim(),
            salesContactPerson: salesContactPerson.trim(),
            companyWebsite: companyWebsite.trim(),
            taxRate: isNaN(parsedTaxRate) ? 0 : parsedTaxRate / 100, // Save as decimal

            showUnitPricesInPdf: showUnitPricesInPdf,
            showFullItemizedTableInPdf: showFullItemizedTableInPdf,

            updatedAt: serverTimestamp() as Timestamp,
        };

        if (!profileData.createdAt) {
            settingsToSave.createdAt = serverTimestamp() as Timestamp;
        }

        try {
            await setDoc(userProfileRef, settingsToSave, { merge: true });
            setSuccessMessage("Settings saved successfully!");
            // Optimistically update local state to reflect saved data, including the potentially converted taxRate
            const displayTaxRate = (settingsToSave.taxRate ? settingsToSave.taxRate * 100 : 0).toString();
            setProfileData(prev => ({
                ...prev, 
                ...settingsToSave, 
                taxRate: settingsToSave.taxRate, // Store decimal in profileData
                updatedAt: Timestamp.now()
            }));
            setTaxRate(displayTaxRate); // Keep UI input as percentage string

        } catch (err: any) {
            console.error("Error saving settings:", err);
            setError(`Failed to save settings: ${err.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return <div className={styles.page}><p className={styles.loadingText}>Loading profile...</p></div>;
    }

    return (
        <div className={styles.page}>
            <h2>Profile & Settings</h2>
            <form onSubmit={handleSaveSettings}>
                <fieldset className={styles.fieldset}>
                    <legend className={styles.legend}>Company Information</legend>
                    <div className={styles.formGroup}>
                        <label htmlFor="businessName" className={styles.label}>Business Name:</label>
                        <input type="text" id="businessName" className={styles.input} value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="companyEmail" className={styles.label}>Company Email:</label>
                        <input type="email" id="companyEmail" className={styles.input} value={companyEmail} onChange={(e) => setCompanyEmail(e.target.value)} />
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="companyPhone" className={styles.label}>Company Phone:</label>
                        <input type="tel" id="companyPhone" className={styles.input} value={companyPhone} onChange={(e) => setCompanyPhone(e.target.value)} />
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="companyAddress" className={styles.label}>Company Address:</label>
                        <textarea id="companyAddress" className={styles.textarea} value={companyAddress} onChange={(e) => setCompanyAddress(e.target.value)} placeholder="Street, City, State, Postcode, Country" />
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="companyWebsite" className={styles.label}>Company Website:</label>
                        <input type="url" id="companyWebsite" className={styles.input} value={companyWebsite} onChange={(e) => setCompanyWebsite(e.target.value)} placeholder="https://example.com" />
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="abnOrTaxId" className={styles.label}>ABN / Tax ID:</label>
                        <input type="text" id="abnOrTaxId" className={styles.input} value={abnOrTaxId} onChange={(e) => setAbnOrTaxId(e.target.value)} />
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="logoUrl" className={styles.label}>Logo URL (Direct link to image):</label>
                        <input type="url" id="logoUrl" className={styles.input} value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://example.com/logo.png" />
                    </div>
                     <div className={styles.formGroup}>
                        <label htmlFor="salesContactPerson" className={styles.label}>Sales Contact Person (Optional):</label>
                        <input type="text" id="salesContactPerson" className={styles.input} value={salesContactPerson} onChange={(e) => setSalesContactPerson(e.target.value)} />
                    </div>
                </fieldset>

                <fieldset className={styles.fieldset}>
                    <legend className={styles.legend}>Quote Settings</legend>
                    <div className={styles.formGroup}>
                        <label htmlFor="defaultQuoteTerms" className={styles.label}>Default Quote Terms & Conditions:</label>
                        <textarea id="defaultQuoteTerms" className={styles.textarea} value={defaultQuoteTerms} onChange={(e) => setDefaultQuoteTerms(e.target.value)} />
                    </div>
                     <div className={styles.formGroup}>
                        <label htmlFor="acceptanceInstructions" className={styles.label}>Quote Acceptance Instructions:</label>
                        <textarea id="acceptanceInstructions" className={styles.textarea} value={acceptanceInstructions} onChange={(e) => setAcceptanceInstructions(e.target.value)} placeholder="e.g., To accept this quote, please sign and return..." />
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="quotePrefix" className={styles.label}>Quote Number Prefix:</label>
                        <input type="text" id="quotePrefix" className={styles.input} value={quotePrefix} onChange={(e) => setQuotePrefix(e.target.value)} placeholder="e.g., QT- or INV-" />
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="nextQuoteSequenceDisplay" className={styles.label}>Next Quote Number Will Be: (Updates after saving a quote)</label>
                        <input type="number" id="nextQuoteSequenceDisplay" className={`${styles.input} ${styles.readOnlyInput}`} value={nextQuoteSequence} readOnly />
                        <small className={styles.fieldDescription}>This number increments automatically when you save a new quote.</small>
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="quoteNumberPadding" className={styles.label}>Quote Number Padding (Digits, e.g., 5 for 00001):</label>
                        <input type="number" id="quoteNumberPadding" className={styles.input} value={quoteNumberPadding} onChange={(e) => setQuoteNumberPadding(e.target.value)} placeholder="e.g., 5" min="0" max="10"/>
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="taxRate" className={styles.label}>Tax Rate (%):</label>
                        <input type="number" id="taxRate" className={styles.input} value={taxRate} onChange={(e) => setTaxRate(e.target.value)} placeholder="e.g., 10 for 10%" step="0.01" />
                         <small className={styles.fieldDescription}>Enter as a percentage (e.g., 10 for 10%). This will be used to calculate tax on quotes.</small>
                    </div>
                </fieldset>

                <fieldset className={styles.fieldset}>
                    <legend className={styles.legend}>PDF & Display Settings</legend>
                    <div className={styles.formGroup}>
                        <label className={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                className={styles.checkboxInput}
                                checked={showUnitPricesInPdf}
                                onChange={(e) => setShowUnitPricesInPdf(e.target.checked)}
                            />
                            Show unit prices in PDF line items by default
                        </label>
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                className={styles.checkboxInput}
                                checked={showFullItemizedTableInPdf}
                                onChange={(e) => setShowFullItemizedTableInPdf(e.target.checked)}
                            />
                            Include full itemized table in 'Full Detail' PDF by default
                        </label>
                        <small className={styles.fieldDescription}>If unchecked, 'Full Detail' PDF will show a summary by area with a notice.</small>
                    </div>
                </fieldset>

                <button type="submit" className={styles.button} disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save Settings'}
                </button>
            </form>

            {successMessage && <p className={styles.successMessage}>{successMessage}</p>}
            {error && <p className={styles.errorMessage}>{error}</p>}
        </div>
    );
}

export default ProfileSettingsPage;