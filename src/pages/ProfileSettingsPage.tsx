// src/pages/ProfileSettingsPage.tsx
import { useState, useEffect, FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../config/firebaseConfig';
import { doc, getDoc, setDoc, Timestamp, serverTimestamp } from 'firebase/firestore';
import { UserProfile } from '../types';
import styles from './ProfileSettingsPage.module.css';

function ProfileSettingsPage() {
    const { currentUser } = useAuth();
    const [profileData, setProfileData] = useState<Partial<UserProfile>>({});

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
                    setDefaultQuoteTerms(data.defaultTerms || '');
                    setQuotePrefix(data.quotePrefix || 'QT-');
                    setNextQuoteSequence(data.nextQuoteSequence || 1);
                    setQuoteNumberPadding((data.quoteNumberPadding || 0).toString());
                    setAcceptanceInstructions(data.acceptanceInstructions || '');
                    setSalesContactPerson(data.salesContactPerson || '');
                    setCompanyWebsite(data.companyWebsite || '');
                    setTaxRate((data.taxRate ? data.taxRate * 100 : 0).toString());

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
            defaultTerms: defaultQuoteTerms.trim(),
            quotePrefix: quotePrefix.trim(),
            nextQuoteSequence: profileData.nextQuoteSequence || nextQuoteSequence,
            quoteNumberPadding: isNaN(paddingValue) ? 0 : paddingValue,
            acceptanceInstructions: acceptanceInstructions.trim(),
            salesContactPerson: salesContactPerson.trim(),
            companyWebsite: companyWebsite.trim(),
            taxRate: isNaN(parsedTaxRate) ? 0 : parsedTaxRate / 100,
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
            const displayTaxRate = (settingsToSave.taxRate ? settingsToSave.taxRate * 100 : 0).toString();
            setProfileData(prev => ({
                ...prev, 
                ...settingsToSave, 
                taxRate: settingsToSave.taxRate,
                updatedAt: Timestamp.now()
            }));
            setTaxRate(displayTaxRate);
        } catch (err: any) {
            console.error("Error saving settings:", err);
            setError(`Failed to save settings: ${err.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return <div className={styles.page}><p className="text-muted text-center p-xl">Loading profile...</p></div>;
    }

    return (
        <div className={styles.pageContainer}> {/* Renamed for clarity, if styles.page was just for container */}
            <h2 className="text-center mb-lg">Profile & Settings</h2> {/* Use global h2 and utilities */}
            <form onSubmit={handleSaveSettings}>
                <fieldset className={`${styles.fieldset} mb-lg`}>
                    <legend className={styles.legend}>Company Information</legend>
                    <div className="form-group mb-md">
                        <label htmlFor="businessName">Business Name:</label>
                        <input type="text" id="businessName" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
                    </div>
                    <div className="form-group mb-md">
                        <label htmlFor="companyEmail">Company Email:</label>
                        <input type="email" id="companyEmail" value={companyEmail} onChange={(e) => setCompanyEmail(e.target.value)} />
                    </div>
                    <div className="form-group mb-md">
                        <label htmlFor="companyPhone">Company Phone:</label>
                        <input type="tel" id="companyPhone" value={companyPhone} onChange={(e) => setCompanyPhone(e.target.value)} />
                    </div>
                    <div className="form-group mb-md">
                        <label htmlFor="companyAddress">Company Address:</label>
                        <textarea id="companyAddress" value={companyAddress} onChange={(e) => setCompanyAddress(e.target.value)} placeholder="Street, City, State, Postcode, Country" rows={3}/>
                    </div>
                    <div className="form-group mb-md">
                        <label htmlFor="companyWebsite">Company Website:</label>
                        <input type="url" id="companyWebsite" value={companyWebsite} onChange={(e) => setCompanyWebsite(e.target.value)} placeholder="https://example.com" />
                    </div>
                    <div className="form-group mb-md">
                        <label htmlFor="abnOrTaxId">ABN / Tax ID:</label>
                        <input type="text" id="abnOrTaxId" value={abnOrTaxId} onChange={(e) => setAbnOrTaxId(e.target.value)} />
                    </div>
                    <div className="form-group mb-md">
                        <label htmlFor="logoUrl">Logo URL (Direct link to image):</label>
                        <input type="url" id="logoUrl" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://example.com/logo.png" />
                    </div>
                     <div className="form-group mb-md">
                        <label htmlFor="salesContactPerson">Sales Contact Person (Optional):</label>
                        <input type="text" id="salesContactPerson" value={salesContactPerson} onChange={(e) => setSalesContactPerson(e.target.value)} />
                    </div>
                </fieldset>

                <fieldset className={`${styles.fieldset} mb-lg`}>
                    <legend className={styles.legend}>Quote Settings</legend>
                    <div className="form-group mb-md">
                        <label htmlFor="defaultQuoteTerms">Default Quote Terms & Conditions:</label>
                        <textarea id="defaultQuoteTerms" value={defaultQuoteTerms} onChange={(e) => setDefaultQuoteTerms(e.target.value)} rows={4}/>
                    </div>
                     <div className="form-group mb-md">
                        <label htmlFor="acceptanceInstructions">Quote Acceptance Instructions:</label>
                        <textarea id="acceptanceInstructions" value={acceptanceInstructions} onChange={(e) => setAcceptanceInstructions(e.target.value)} placeholder="e.g., To accept this quote, please sign and return..." rows={3}/>
                    </div>
                    <div className="form-group mb-md">
                        <label htmlFor="quotePrefix">Quote Number Prefix:</label>
                        <input type="text" id="quotePrefix" value={quotePrefix} onChange={(e) => setQuotePrefix(e.target.value)} placeholder="e.g., QT- or INV-" />
                    </div>
                    <div className="form-group mb-md">
                        <label htmlFor="nextQuoteSequenceDisplay">Next Quote Number Will Be: <small className="text-muted">(Updates after saving a quote)</small></label>
                        <input type="number" id="nextQuoteSequenceDisplay" className={styles.readOnlyInput} value={nextQuoteSequence} readOnly />
                    </div>
                    <div className="form-group mb-md">
                        <label htmlFor="quoteNumberPadding">Quote Number Padding (Digits):</label>
                        <input type="number" id="quoteNumberPadding" value={quoteNumberPadding} onChange={(e) => setQuoteNumberPadding(e.target.value)} placeholder="e.g., 5 for QT-00001" min="0" max="10"/>
                    </div>
                    <div className="form-group mb-md">
                        <label htmlFor="taxRate">Tax Rate (%):</label>
                        <input type="number" id="taxRate" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} placeholder="e.g., 10 for 10%" step="0.01" />
                         <small className={styles.fieldDescription}>Enter as a percentage (e.g., 10 for 10%). This will be used to calculate tax on quotes.</small>
                    </div>
                </fieldset>

                <fieldset className={`${styles.fieldset} mb-lg`}>
                    <legend className={styles.legend}>PDF & Display Settings</legend>
                    <div className="form-group mb-md">
                        <label className={`${styles.checkboxLabel} d-flex align-items-center`}> {/* Added flex utilities */}
                            <input
                                type="checkbox"
                                checked={showUnitPricesInPdf}
                                onChange={(e) => setShowUnitPricesInPdf(e.target.checked)}
                                className="mr-sm" /* Added margin utility */
                            />
                            Show unit prices in PDF line items by default
                        </label>
                    </div>
                    <div className="form-group mb-md">
                        <label className={`${styles.checkboxLabel} d-flex align-items-center`}> {/* Added flex utilities */}
                            <input
                                type="checkbox"
                                checked={showFullItemizedTableInPdf}
                                onChange={(e) => setShowFullItemizedTableInPdf(e.target.checked)}
                                className="mr-sm" /* Added margin utility */
                            />
                            Include full itemized table in 'Full Detail' PDF by default
                        </label>
                        <small className={styles.fieldDescription}>If unchecked, 'Full Detail' PDF will show a summary by area with a notice.</small>
                    </div>
                </fieldset>

                <button type="submit" className="btn btn-accent w-100 mt-lg" disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save Settings'}
                </button>
            </form>

            {successMessage && <p className="text-success text-center mt-md p-md rounded" style={{border: '1px solid var(--color-success)'}}>{successMessage}</p>}
            {error && <p className="text-danger text-center mt-md p-md rounded" style={{border: '1px solid var(--color-error)'}}>{error}</p>}
        </div>
    );
}

export default ProfileSettingsPage;
