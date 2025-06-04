// src/components/QuoteBuilder.tsx
import { useState, useEffect, useCallback, useMemo, useRef, RefObject } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    collection, query, getDocs, doc, addDoc, setDoc,
    Timestamp,
    serverTimestamp, writeBatch, getDoc,
    orderBy, runTransaction
} from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

import { useAuth } from '../contexts/AuthContext'; //
import { db, app } from '../config/firebaseConfig'; //
import {
    UserProfile, UserRateTemplate, Quote, QuoteLine, CombinedTask, CombinedMaterial, Task, CustomTask,
    Material, CustomMaterial, MaterialOption, KitTemplate, Area, KitLineItemTemplate,
    Client
} from '../types'; //

import { formatCurrency, findMatchingRate, groupLinesBySection } from '../utils/utils'; //
import { wizardStepInFromRight, wizardStepInFromLeft, wizardTransition, wizardContentIn } from '../utils/animations';
import TaskSelector from './TaskSelector'; //
import MaterialSelector from './MaterialSelector'; //
import MaterialOptionSelector from './MaterialOptionSelector'; //
import KitSelector from './KitSelector'; //
import QuoteLineItemDisplay from './QuoteLineItemDisplay'; //
import AreaSelector from './AreaSelector'; //
import TaskFormModal from './TaskFormModal'; //
import MaterialFormModal from './MaterialFormModal'; //
import Step1_QuoteClientDetails from './Step1_QuoteClientDetails';
import Step2_LineItemBuilder from './Step2_LineItemBuilder'; // Corrected potential typo from "LineltemBuilder"
import Step3_ReviewFinalize from './Step3_ReviewFinalize';

import styles from './QuoteBuilder.module.css'; //
import StickyQuoteProgressBar from './StickyQuoteProgressBar'; // Adjust path if necessary
import { getAI, getGenerativeModel, GoogleAIBackend } from "firebase/ai";

interface QuoteBuilderProps {
    existingQuoteId?: string;
    onSaveSuccess?: (quoteId: string) => void;
}

function QuoteBuilder({ existingQuoteId, onSaveSuccess }: QuoteBuilderProps) {
    const itemSelectorRef = useRef<HTMLDivElement>(null);
    const { currentUser } = useAuth(); //
    const userId = currentUser?.uid;
    const navigate = useNavigate();

    // --- State ---
    const [userProfile, setUserProfile] = useState<Partial<UserProfile>>({});
    const [userRates, setUserRates] = useState<UserRateTemplate[]>([]);
    const [isLoadingRates, setIsLoadingRates] = useState(false);
    const [errorRates, setErrorRates] = useState<string | null>(null);

    const [quoteData, setQuoteData] = useState<Partial<Quote>>({}); // For loaded existing quote or new quote shell
    const [jobTitle, setJobTitle] = useState('');
    const [clientName, setClientName] = useState('');
    const [clientAddress, setClientAddress] = useState('');
    const [clientEmail, setClientEmail] = useState('');
    const [clientPhone, setClientPhone] = useState('');
    const [terms, setTerms] = useState('');
    // State for new top-level quote fields
    const [projectDescription, setProjectDescription] = useState('');
    const [additionalDetails, setAdditionalDetails] = useState('');
    const [generalNotes, setGeneralNotes] = useState('');
    const [validUntilDate, setValidUntilDate] = useState<Date | null>(null);


    const [clients, setClients] = useState<Client[]>([]);
    const [isLoadingClients, setIsLoadingClients] = useState(false);
    const [selectedClientId, setSelectedClientId] = useState<string>('');

    const [quoteLines, setQuoteLines] = useState<QuoteLine[]>([]);
    const [activeSection, setActiveSection] = useState<string>('');
    const [isLoadingQuote, setIsLoadingQuote] = useState(false);
    const [errorQuote, setErrorQuote] = useState<string | null>(null);

    const [selectedTask, setSelectedTask] = useState<CombinedTask | null>(null);
    const [selectedMaterial, setSelectedMaterial] = useState<CombinedMaterial | null>(null);
    const [selectedOption, setSelectedOption] = useState<MaterialOption | null>(null);
    const [selectedQuantity, setSelectedQuantity] = useState<number>(1);
    const [selectedDescription, setSelectedDescription] = useState<string>(''); // For line item description
    const [overrideRateInput, setOverrideRateInput] = useState<string>('');

    const [globalAreas, setGlobalAreas] = useState<Area[]>([]);
    const [isLoadingAreas, setIsLoadingAreas] = useState(false);
    const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

    const [allTasks, setAllTasks] = useState<CombinedTask[]>([]);
    const [allMaterials, setAllMaterials] = useState<CombinedMaterial[]>([]);
    const [isLoadingGlobals, setIsLoadingGlobals] = useState(false);

    const [isTaskFormModalOpen, setIsTaskFormModalOpen] = useState(false);
    const [taskFormInitialData, setTaskFormInitialData] = useState<CustomTask | null>(null);
    const createTaskPromiseRef = useRef<{ resolve: (value: CombinedTask | null) => void; reject: (reason?: any) => void; } | null>(null);

    const [isMaterialFormModalOpen, setIsMaterialFormModalOpen] = useState(false);
    const [materialFormInitialData, setMaterialFormInitialData] = useState<CustomMaterial | null>(null);
    const createMaterialPromiseRef = useRef<{ resolve: (value: CombinedMaterial | null) => void; reject: (reason?: any) => void; } | null>(null);

    // Generate with AI buttons
    const [isAIGenerating, setIsAIGenerating] = useState(false);

    // Add these new state variables after your existing useState declarations
    const [isAnimating, setIsAnimating] = useState(false);
    const [animationDirection, setAnimationDirection] = useState<'forward' | 'backward'>('forward');
// Add these refs after your existing useRef declarations
    const step1Ref = useRef<HTMLDivElement>(null);
    const step2Ref = useRef<HTMLDivElement>(null);
    const step3Ref = useRef<HTMLDivElement>(null);

    const getCurrentStepRef = (step: number) => {
        switch (step) {
            case 1: return step1Ref;
            case 2: return step2Ref;
            case 3: return step3Ref;
            default: return null;
        }
    };

    const handleGenerateWithAI = async (fieldType: 'projectDescription' | 'additionalDetails' | 'generalNotes') => {
        if (!jobTitle && quoteLines.length === 0) {
            alert("Please add a job title and some line items before generating text with AI.");
            return;
        }
        setIsAIGenerating(true);
    
        // Build your prompt (keep your existing logic)
        let contextForAI = `You are an assistant helping a user write sections of a service quote. Be professional, clear, and concise.`;
        contextForAI += `\nThe quote is for a job titled: "${jobTitle}".`;
        if (clientName) { 
            contextForAI += `\nThe client is: ${clientName}.`; 
        }
        if (quoteLines.length > 0) {
            contextForAI += "\nThe primary items in this quote include:\n";
            const itemSummary = quoteLines.map(line => {
                let summary = `- ${line.displayName}`;
                if (line.quantity && line.unit) summary += ` (Quantity: ${line.quantity} ${line.unit})`;
                if (line.section) summary += ` in the "${line.section}" area`;
                return summary;
            }).join("\n");
            contextForAI += itemSummary;
        }
    
        let specificInstruction = "";
        switch (fieldType) {
            case 'projectDescription':
        specificInstruction = `\n\nWrite a professional project description or scope of work. Do not include headers, labels, or introductory phrases. Start directly with the description content. Keep it 2-4 sentences and focus on what will be delivered to the client.`;
        break;
    case 'additionalDetails':
        specificInstruction = `\n\nList important additional details, inclusions, or exclusions. Do not include headers, labels, or introductory phrases like "Here are the details" or "Important notes". Start directly with the actual details. Use bullet points if appropriate, but do not include any preamble or conclusion.`;
        break;
    case 'generalNotes':
        specificInstruction = `\n\nWrite brief, friendly general notes for the client. Do not include headers, labels, or introductory phrases like "Here are some notes" or "Regarding this quote". Start directly with the actual notes content. Keep it professional but warm.`;
        break;
        }
        const fullPrompt = contextForAI + specificInstruction;
    
        try {
            console.log("🔍 Debug: Initializing Firebase AI Logic...");
            console.log("🔍 Debug: App object:", app);
            
            // Initialize Firebase AI Logic
            const ai = getAI(app, { backend: new GoogleAIBackend() });
            console.log("🔍 Debug: AI initialized:", ai);
            
            // Try different model names if one doesn't work
            const modelNames = ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash", "gemini-pro"];
            let model;
            let lastError;
            
            for (const modelName of modelNames) {
                try {
                    console.log(`🔍 Debug: Trying model: ${modelName}`);
                    model = getGenerativeModel(ai, { model: modelName });
                    
                    // Test the model with a simple prompt first
                    const result = await model.generateContent(fullPrompt);
                    const response = result.response;
                    const text = response.text();
                    
                    console.log("✅ Success with model:", modelName);
                    console.log("🔍 Debug: Generated text:", text.substring(0, 100) + "...");
    
                    if (text) {
                        if (fieldType === 'projectDescription') setProjectDescription(text);
                        else if (fieldType === 'additionalDetails') setAdditionalDetails(text);
                        else if (fieldType === 'generalNotes') setGeneralNotes(text);
                        return; // Success!
                    } else {
                        throw new Error("Empty response from AI");
                    }
                } catch (modelError: any) {
                    console.log(`❌ Model ${modelName} failed:`, modelError.message);
                    lastError = modelError;
                    continue;
                }
            }
            
            // If we get here, all models failed
            throw lastError || new Error("All models failed");
    
        } catch (error: any) {
            console.error("🚨 Error calling Firebase AI Logic:", error);
            console.error("🚨 Error details:", {
                name: error.name,
                message: error.message,
                code: error.code,
                stack: error.stack
            });
            alert(`Failed to generate text with AI. Error: ${error.message || "Unknown error"}`);
        } finally {
            setIsAIGenerating(false);
        }
    };

    /* Define State for Current Step */
    const [currentStep, setCurrentStep] = useState(1);
    const totalSteps = 3; // We'll define 3 steps for now   

    const handleNextStep = () => {
        if (isAnimating) return; // Prevent multiple animations
        
        // Basic validation for Step 1
        if (currentStep === 1) {
            if (!jobTitle.trim()) {
                alert("Job Title is required."); 
                return;
            }
            if (!selectedClientId) {
                alert("Please select a client."); 
                return;
            }
        }
    
        if (currentStep < totalSteps) {
            setIsAnimating(true);
            setAnimationDirection('forward');
            
            const currentStepRef = getCurrentStepRef(currentStep);
            const nextStepRef = getCurrentStepRef(currentStep + 1);
            
            if (currentStepRef && nextStepRef) {
                wizardTransition(
                    currentStepRef.current,
                    nextStepRef.current,
                    'forward',
                    () => {
                        setCurrentStep(prev => prev + 1);
                        setIsAnimating(false);
                        
                        // Animate in the content of the new step
                        setTimeout(() => {
                            const contentElements = nextStepRef.current?.querySelectorAll('.wizard-content > *');
                            if (contentElements) {
                                wizardContentIn(contentElements, 0.05, 0.4);
                            }
                        }, 50);
                    }
                );
            } else {
                // Fallback if refs aren't available
                setCurrentStep(prev => prev + 1);
                setIsAnimating(false);
            }
        }
    };
    
    const handlePreviousStep = () => {
        if (isAnimating) return; // Prevent multiple animations
        
        if (currentStep > 1) {
            setIsAnimating(true);
            setAnimationDirection('backward');
            
            const currentStepRef = getCurrentStepRef(currentStep);
            const prevStepRef = getCurrentStepRef(currentStep - 1);
            
            if (currentStepRef && prevStepRef) {
                wizardTransition(
                    currentStepRef.current,
                    prevStepRef.current,
                    'backward',
                    () => {
                        setCurrentStep(prev => prev - 1);
                        setIsAnimating(false);
                        
                        // Animate in the content of the previous step
                        setTimeout(() => {
                            const contentElements = prevStepRef.current?.querySelectorAll('.wizard-content > *');
                            if (contentElements) {
                                wizardContentIn(contentElements, 0.05, 0.4);
                            }
                        }, 50);
                    }
                );
            } else {
                // Fallback if refs aren't available
                setCurrentStep(prev => prev - 1);
                setIsAnimating(false);
            }
        }
    };



    const clearSelections = useCallback(() => {
        setSelectedTask(null); setSelectedMaterial(null); setSelectedOption(null);
        setSelectedQuantity(1); setOverrideRateInput(''); setSelectedDescription('');
    }, []);

    const currentItemDetails = useMemo(() => {
        const taskId = selectedTask?.id ?? null;
        const materialId = selectedMaterial?.id ?? null;
        const optionId = selectedMaterial?.optionsAvailable ? (selectedOption?.id ?? null) : null;
        const rateData = findMatchingRate(userRates, taskId, materialId, optionId);
        let effectiveRate = rateData?.referenceRate ?? selectedMaterial?.defaultRate ?? 0;
        let effectiveUnit = rateData?.unit ?? selectedMaterial?.defaultUnit ?? selectedTask?.defaultUnit ?? 'item';
        let effectiveInputType: QuoteLine['inputType'] = rateData?.inputType ?? (selectedMaterial ? 'quantity' : (selectedTask?.defaultUnit?.toLowerCase() === 'hour' ? 'quantity' : 'price'));
        const isHourly = ['hour', 'hr', 'hours'].includes(effectiveUnit.toLowerCase());
        effectiveRate = typeof effectiveRate === 'number' ? effectiveRate : 0;
        return { rateData, unit: effectiveUnit, rate: effectiveRate, inputType: effectiveInputType, isHourly };
    }, [selectedTask, selectedMaterial, selectedOption, userRates]);

    const validationIssues = useMemo(() => {
        const issues: string[] = [];
        if (!jobTitle.trim()) issues.push("Job Title is required.");
        if (!existingQuoteId && quoteLines.length === 0) issues.push("Add at least one line item for a new quote.");
        return issues;
    }, [jobTitle, quoteLines, existingQuoteId]);

    const isSaveDisabled = isLoadingQuote || validationIssues.length > 0 || !userId;
    // Save disabled message will use global text-warning or text-muted if applied directly to the span/p tag

    useEffect(() => { setOverrideRateInput(currentItemDetails.rate.toString()); }, [currentItemDetails.rate]);

    // Add this useEffect with your other useEffect hooks (around line 985 area)
// Make sure it's AFTER the isLoadingOverall declaration but WITH the other useEffects


    // --- Data Fetching useEffects ---

    useEffect(() => {
        if (!userId) {
            setUserProfile({});
            setTerms(''); // Clear terms if user logs out
            return;
        }
        const profileRef = doc(db, `users/${userId}`);
        getDoc(profileRef).then(docSnap => {
            if (docSnap.exists()) {
                const profile = docSnap.data() as UserProfile;
                setUserProfile(profile);
                if (!existingQuoteId && terms.trim() === '' && profile.defaultQuoteTerms) {
                    setTerms(profile.defaultQuoteTerms);
                }
            } else {
                console.warn("User profile not found.");
                setUserProfile({});
                if (!existingQuoteId) setTerms('');
            }
        }).catch(err => {
            console.error("Error fetching user profile:", err);
            setUserProfile({});
            if (!existingQuoteId) setTerms('');
        });
    }, [userId, existingQuoteId]); // `terms` removed to avoid loop, it's set based on profile/client

    useEffect(() => {
        if (!userId) { setClients([]); return; }
        setIsLoadingClients(true);
        const clientsRef = collection(db, `users/${userId}/clients`);
        const qClients = query(clientsRef, orderBy('clientName', 'asc'));
        getDocs(qClients)
            .then(snapshot => setClients(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Client))))
            .catch(err => { console.error("Error fetching clients:", err); setErrorQuote("Failed to load clients."); })
            .finally(() => setIsLoadingClients(false));
    }, [userId]);

    useEffect(() => {
        if (selectedClientId) {
            const client = clients.find(c => c.id === selectedClientId);
            if (client) {
                setClientName(client.clientName || '');
                setClientAddress(client.clientAddress || ''); // Or structured address if you have it
                setClientEmail(client.clientEmail || '');
                setClientPhone(client.clientPhone || '');
                // Do NOT set terms here anymore, terms are handled in the final step
                // if (terms.trim() === '' && client.defaultClientTerms) {
                //     setTerms(client.defaultClientTerms);
                // }
            }
        } else if (!existingQuoteId) { // Only reset if no client selected AND it's a new quote
            // Clear client details if selection is removed for a new quote
            setClientName('');
            setClientAddress('');
            setClientEmail('');
            setClientPhone('');
            // setTerms(userProfile.defaultQuoteTerms || ''); // Terms are now separate
        }
        // Ensure existingQuoteId dependency is correct if it influences this logic.
    }, [selectedClientId, clients, existingQuoteId]); // Removed userProfile.defaultQuoteTerms as terms are separate


    useEffect(() => {
        if (!userId) { setUserRates([]); return; }
        setIsLoadingRates(true);
        setErrorRates(null);
        const ratesCollectionRef = collection(db, `users/${userId}/rateTemplates`);
        const q = query(ratesCollectionRef, orderBy('displayName_lowercase', 'asc'));
        getDocs(q)
            .then(snap => setUserRates(snap.docs.map(d => ({ id: d.id, ...d.data() } as UserRateTemplate))))
            .catch(err => { console.error("Error fetching rates:", err); setErrorRates("Failed to load rates."); })
            .finally(() => setIsLoadingRates(false));
    }, [userId]);

    useEffect(() => {
        setIsLoadingAreas(true);
        const areasRef = collection(db, 'areas');
        const qAreas = query(areasRef, orderBy('order', 'asc'), orderBy('name_lowercase', 'asc'));
        getDocs(qAreas)
            .then(snap => {
                const fetchedAreas = snap.docs.map(d => ({ id: d.id, ...d.data() } as Area));
                setGlobalAreas(fetchedAreas);
            })
            .catch(err => {
                console.error("Error fetching areas:", err);
                setGlobalAreas([]);
            })
            .finally(() => setIsLoadingAreas(false));
    }, []);

    useEffect(() => {
        if (!existingQuoteId && !activeSection && globalAreas.length > 0 && !isLoadingAreas) {
            setActiveSection(globalAreas[0].name);
        } else if (!existingQuoteId && !activeSection && globalAreas.length === 0 && !isLoadingAreas) {
            setActiveSection('Main Area');
        }
    }, [existingQuoteId, globalAreas, isLoadingAreas, activeSection]);


    useEffect(() => {
        if (!userId) {
            setJobTitle(''); setClientName(''); setClientAddress(''); setClientEmail(''); setClientPhone('');
            setTerms(''); setSelectedClientId(''); setQuoteLines([]); setQuoteData({});
            setProjectDescription(''); setAdditionalDetails(''); setGeneralNotes(''); setValidUntilDate(null);
            setActiveSection(globalAreas.length > 0 ? globalAreas[0].name : 'Main Area');
            clearSelections(); setCollapsedSections({}); setIsLoadingQuote(false);
            return;
        }

        if (!existingQuoteId) {
            // Initialize for a new quote only if key fields are not already set (to avoid wiping user input on re-renders)
            if (jobTitle === '' && clientName === '' && quoteLines.length === 0 && projectDescription === '') {
                setIsLoadingQuote(true);
                setJobTitle(''); setClientName(''); setClientAddress(''); setClientEmail(''); setClientPhone('');
                setTerms(userProfile.defaultQuoteTerms || '');
                setProjectDescription(''); setAdditionalDetails(''); setGeneralNotes(''); setValidUntilDate(null);
                setSelectedClientId(''); setQuoteLines([]);
                setQuoteData({ status: 'Draft', userId: userId, terms: userProfile.defaultQuoteTerms || '' });
                if (!activeSection && globalAreas.length > 0) {
                    setActiveSection(globalAreas[0].name);
                } else if (!activeSection) {
                    setActiveSection('Main Area');
                }
                clearSelections(); setCollapsedSections({});
                setIsLoadingQuote(false);
            }
            return;
        }

        const fetchQuote = async () => {
            setIsLoadingQuote(true); setErrorQuote(null);
            const quoteRef = doc(db, 'users', userId, 'quotes', existingQuoteId);
            const linesRef = collection(db, 'users', userId, 'quotes', existingQuoteId, 'quoteLines');
            try {
                const quoteSnap = await getDoc(quoteRef);
                if (quoteSnap.exists()) {
                    const data = quoteSnap.data() as Quote;
                    setQuoteData(data); setJobTitle(data.jobTitle || '');
                    setClientName(data.clientName || ''); setClientAddress(data.clientAddress || '');
                    setClientEmail(data.clientEmail || ''); setClientPhone(data.clientPhone || '');
                    setTerms(data.terms || userProfile.defaultQuoteTerms || '');
                    setProjectDescription(data.projectDescription || '');
                    setAdditionalDetails(data.additionalDetails || '');
                    setGeneralNotes(data.generalNotes || '');
                    setValidUntilDate(data.validUntil ? data.validUntil.toDate() : null);

                    const loadedClient = clients.find(c => c.clientEmail === data.clientEmail || (c.clientName === data.clientName && c.clientAddress === data.clientAddress));
                    setSelectedClientId(loadedClient?.id || '');

                    const linesQuery = query(linesRef, orderBy('order'));
                    const linesSnap = await getDocs(linesQuery);
                    const fetchedLines = linesSnap.docs.map(d => ({ id: d.id, ...d.data() } as QuoteLine));
                    setQuoteLines(fetchedLines);

                    if (fetchedLines.length > 0 && fetchedLines[0].section) {
                        setActiveSection(fetchedLines[0].section);
                    } else if (globalAreas.length > 0) {
                        setActiveSection(globalAreas[0].name);
                    } else {
                        setActiveSection('Main Area');
                    }
                    setCollapsedSections({});
                    clearSelections();
                } else {
                    setErrorQuote(`Quote not found: ${existingQuoteId}`);
                    setJobTitle(''); setClientName(''); setClientAddress(''); setClientEmail(''); setClientPhone('');
                    setTerms(userProfile.defaultQuoteTerms || ''); setSelectedClientId(''); setQuoteLines([]); setQuoteData({});
                    setProjectDescription(''); setAdditionalDetails(''); setGeneralNotes(''); setValidUntilDate(null);
                    setActiveSection(globalAreas.length > 0 ? globalAreas[0].name : 'Main Area'); clearSelections();
                }
            } catch (err: any) {
                console.error("Error fetching quote:", err);
                setErrorQuote(`Failed to fetch quote: ${err.message}`);
            } finally {
                setIsLoadingQuote(false);
            }
        };
        fetchQuote();
    }, [existingQuoteId, userId, userProfile.defaultQuoteTerms, globalAreas, clients, clearSelections]);

    
    
    useEffect(() => {
        if (!userId) {
            setAllTasks([]);
            setAllMaterials([]);
            return;
        }
        setIsLoadingGlobals(true);
        const fetchAllReferencedData = async () => {
            try {
                const [tasksSnap, customTasksSnap, materialsSnap, customMaterialsSnap] = await Promise.all([
                    getDocs(query(collection(db, 'tasks'), orderBy('name_lowercase', 'asc'))),
                    getDocs(query(collection(db, `users/${userId}/customTasks`), orderBy('name_lowercase', 'asc'))),
                    getDocs(query(collection(db, 'materials'), orderBy('name_lowercase', 'asc'))),
                    getDocs(query(collection(db, `users/${userId}/customMaterials`), orderBy('name_lowercase', 'asc')))
                ]);
                const globalTasks = tasksSnap.docs.map(d => {
                    const data = d.data();
                    return { id: d.id, ...data, name: data.name || '', name_lowercase: (data.name_lowercase || data.name?.toLowerCase() || '') } as CombinedTask;
                });
                const userCustomTasks = customTasksSnap.docs.map(d => {
                    const data = d.data();
                    return { id: d.id, ...data, isCustom: true, name: data.name || '', name_lowercase: (data.name_lowercase || data.name?.toLowerCase() || '') } as CombinedTask;
                });
                setAllTasks([...globalTasks, ...userCustomTasks].sort((a, b) => a.name_lowercase.localeCompare(b.name_lowercase)));
                const globalMaterialsData = materialsSnap.docs.map(d => {
                    const data = d.data();
                    return { id: d.id, ...data, name: data.name || '', name_lowercase: (data.name_lowercase || data.name?.toLowerCase() || '') } as CombinedMaterial;
                });
                const userCustomMaterialsData = customMaterialsSnap.docs.map(d => {
                    const data = d.data();
                    return { id: d.id, ...data, isCustom: true, name: data.name || '', name_lowercase: (data.name_lowercase || data.name?.toLowerCase() || '') } as CombinedMaterial;
                });
                setAllMaterials([...globalMaterialsData, ...userCustomMaterialsData].sort((a, b) => a.name_lowercase.localeCompare(b.name_lowercase)));
            } catch (err) {
                console.error("Error fetching all tasks/materials for QuoteBuilder", err);
                setErrorQuote("Failed to load necessary task/material data.");
            } finally {
                setIsLoadingGlobals(false);
            }
        };
        fetchAllReferencedData();
    }, [userId]);


    const handleOpenNewTaskModal = (initialName?: string) => {
        return new Promise<CombinedTask | null>((resolve, reject) => {
            if (!userId) { alert("Login required."); reject(new Error("User not logged in")); return; }
            if (initialName) {
                const initialTaskData: CustomTask = {
                    id: `temp-new-${Date.now()}`,
                    name: initialName, name_lowercase: initialName.toLowerCase(),
                    defaultUnit: 'item', description: '', userId: userId,
                    createdAt: Timestamp.now(), updatedAt: Timestamp.now()
                };
                setTaskFormInitialData(initialTaskData);
            } else { setTaskFormInitialData(null); }
            setIsTaskFormModalOpen(true);
            createTaskPromiseRef.current = { resolve, reject };
        });
    };
    const handleOpenNewMaterialModal = (initialName?: string) => {
        return new Promise<CombinedMaterial | null>((resolve, reject) => {
            if (!userId) { alert("Login required."); reject(new Error("User not logged in")); return; }
            if (initialName) {
                const initialMaterialData: CustomMaterial = {
                    id: `temp-new-${Date.now()}`, name: initialName, name_lowercase: initialName.toLowerCase(),
                    defaultUnit: 'item', description: '', optionsAvailable: false, userId: userId,
                    createdAt: Timestamp.now(), updatedAt: Timestamp.now()
                };
                setMaterialFormInitialData(initialMaterialData);
            } else { setMaterialFormInitialData(null); }
            setIsMaterialFormModalOpen(true);
            createMaterialPromiseRef.current = { resolve, reject };
        });
    };
    const handleSaveTaskFromModal = async (taskDataFromModal: { name: string; defaultUnit: string; description: string }) => {
        if (!userId) {
            alert("Login required."); if (createTaskPromiseRef.current) createTaskPromiseRef.current.reject(new Error("User not logged in"));
            setIsTaskFormModalOpen(false); createTaskPromiseRef.current = null; return;
        }
        const newTaskData = {
            userId, name: taskDataFromModal.name.trim(), name_lowercase: taskDataFromModal.name.trim().toLowerCase(),
            defaultUnit: taskDataFromModal.defaultUnit.trim() || 'item', description: taskDataFromModal.description.trim(),
            createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
        };
        try {
            const docRef = await addDoc(collection(db, `users/${userId}/customTasks`), newTaskData);
            const createdTask: CombinedTask = {
                id: docRef.id, ...newTaskData, isCustom: true, name: newTaskData.name, name_lowercase: newTaskData.name_lowercase,
                createdAt: Timestamp.now(), updatedAt: Timestamp.now(),
            } as CombinedTask;
            setAllTasks(prev => [...prev, createdTask].sort((a, b) => a.name_lowercase.localeCompare(b.name_lowercase)));
            if (createTaskPromiseRef.current) createTaskPromiseRef.current.resolve(createdTask);
            setSelectedTask(createdTask); setIsTaskFormModalOpen(false);
        } catch (error) {
            console.error("Error saving custom task:", error); alert(`Failed to save task.`);
            if (createTaskPromiseRef.current) createTaskPromiseRef.current.reject(error);
        } finally { if (createTaskPromiseRef.current) createTaskPromiseRef.current = null; }
    };
    const handleMaterialSavedFromModal = async (savedMaterial: CustomMaterial | null) => {
        setIsMaterialFormModalOpen(false);
        if (savedMaterial && userId) {
            const newCombinedMaterial: CombinedMaterial = {
                ...savedMaterial, isCustom: true, name: savedMaterial.name || '',
                name_lowercase: (savedMaterial.name_lowercase || savedMaterial.name?.toLowerCase() || '')
            };
            setAllMaterials(prev => [...prev, newCombinedMaterial].sort((a, b) => a.name_lowercase.localeCompare(b.name_lowercase)));
            if (createMaterialPromiseRef.current) createMaterialPromiseRef.current.resolve(newCombinedMaterial);
            setSelectedMaterial(newCombinedMaterial);
        } else { if (createMaterialPromiseRef.current) createMaterialPromiseRef.current.resolve(null); }
        createMaterialPromiseRef.current = null;
    };

    const handleTaskSelectForItemForm = (task: CombinedTask | null) => {
        setSelectedTask(task); if (task) { setSelectedMaterial(null); setSelectedOption(null); } setOverrideRateInput('');
    };
    const handleMaterialSelectForItemForm = (material: CombinedMaterial | null) => {
        setSelectedMaterial(material); setSelectedOption(null); setOverrideRateInput('');
    };
    const handleOptionSelectForItemForm = (option: MaterialOption | null) => {
        setSelectedOption(option); setOverrideRateInput('');
    };

    const handleAddLineItem = useCallback(() => {
        const taskId = selectedTask?.id ?? null;
        const materialId = selectedMaterial?.id ?? null;
        const optionId = selectedMaterial?.optionsAvailable ? (selectedOption?.id ?? null) : null;
        const optionObject = selectedMaterial?.optionsAvailable ? selectedOption : null;
        if (!taskId && !materialId) { alert("Please select a task or material."); return; }
        if (selectedMaterial?.optionsAvailable && !optionId) { alert(`Please select an option for ${selectedMaterial.name}.`); return; }
        if (!activeSection?.trim()) { alert("Please select or enter an active Section/Area first."); return; }
        const { unit, rate: calculatedRate, inputType } = currentItemDetails;
        const overrideRateValue = parseFloat(overrideRateInput);
        const finalRate = overrideRateInput.trim() !== '' && !isNaN(overrideRateValue) ? overrideRateValue : calculatedRate;
        if (isNaN(finalRate)) { alert("Invalid rate."); return; }
        let baseDisplayName = 'New Item';
        if (selectedTask && selectedMaterial && optionObject) baseDisplayName = `${selectedTask.name} - ${selectedMaterial.name} (${optionObject.name})`;
        else if (selectedTask && selectedMaterial) baseDisplayName = `${selectedTask.name} - ${selectedMaterial.name}`;
        else if (selectedMaterial && optionObject) baseDisplayName = `${selectedMaterial.name} (${optionObject.name})`;
        else if (selectedTask) baseDisplayName = selectedTask.name;
        else if (selectedMaterial) baseDisplayName = selectedMaterial.name;
        let lineTotal = inputType === 'price' ? finalRate : (selectedQuantity * finalRate);
        const newQuoteLine: Omit<QuoteLine, 'id'> = {
            section: activeSection.trim(),
            taskId,
            materialId,
            materialOptionId: optionId,
            materialOptionName: optionObject?.name ?? null,
            displayName: baseDisplayName,
            description: selectedDescription.trim() || null,
            quantity: currentItemDetails.inputType === 'quantity' ? selectedQuantity : null, // Use currentItemDetails.inputType here
            price: currentItemDetails.inputType === 'price' ? finalRate : null, // And here
            unit: unit || null, // Ensure unit is explicitly null if it's falsy (e.g., empty string, though 'item' is default)
            referenceRate: currentItemDetails.inputType === 'quantity' ? finalRate : null, // And here
            inputType: inputType || 'price', // Ensure inputType has a default if somehow null/undefined
            lineTotal,
            order: quoteLines.reduce((max, line) => Math.max(max, line.order ?? -1), -1) + 1,
        };
        setQuoteLines(prev => [...prev, { ...newQuoteLine, id: uuidv4() } as QuoteLine]);
        setCollapsedSections(prev => ({ ...prev, [activeSection.trim()]: false }));
        clearSelections();
    }, [activeSection, currentItemDetails, overrideRateInput, quoteLines, selectedDescription, selectedMaterial, selectedOption, selectedQuantity, selectedTask, clearSelections]);

    const handleKitSelected = useCallback((kit: KitTemplate) => {
        if (!activeSection?.trim()) { alert("Please select or enter an active Section/Area first."); return; }
        const linesToAdd: QuoteLine[] = [];
        const startingOrder = quoteLines.reduce((max, line) => Math.max(max, line.order ?? -1), -1) + 1;
        kit.lineItems.forEach((kitItem, index) => {
            const rateData = findMatchingRate(userRates, kitItem.taskId, kitItem.materialId, kitItem.materialOptionId);
            const materialFromState = kitItem.materialId ? allMaterials.find(m => m.id === kitItem.materialId) : undefined;
            const taskFromState = kitItem.taskId ? allTasks.find(t => t.id === kitItem.taskId) : undefined;
            const materialOptionNameFromKit = kitItem.materialOptionName || null;
            let lineRate = rateData?.referenceRate ?? materialFromState?.defaultRate ?? 0;
            let lineUnit = rateData?.unit ?? materialFromState?.defaultUnit ?? taskFromState?.defaultUnit ?? kitItem.unit ?? 'item';
            let lineInputType = rateData?.inputType ?? kitItem.inputType ?? 'quantity';
            let quantity = kitItem.baseQuantity || 1;
            let lineTotal = lineInputType === 'price' ? lineRate : (quantity * lineRate);
            const newLine: Omit<QuoteLine, 'id'> = {
                section: activeSection.trim(), taskId: kitItem.taskId, materialId: kitItem.materialId,
                materialOptionId: kitItem.materialOptionId, materialOptionName: materialOptionNameFromKit,
                displayName: kitItem.displayName,
                // Ensure description from kit is also handled (null if empty/undefined)
                description: (kitItem.description && kitItem.description.trim() !== "") ? kitItem.description.trim() : null,
                quantity: lineInputType === 'quantity' ? quantity : null,
                price: lineInputType === 'price' ? lineRate : null, unit: lineUnit,
                referenceRate: lineInputType === 'quantity' ? lineRate : null, inputType: lineInputType,
                lineTotal, order: startingOrder + index, kitTemplateId: kit.id,
            };
            linesToAdd.push({ ...newLine, id: uuidv4() } as QuoteLine);
        });
        setQuoteLines(prev => [...prev, ...linesToAdd]);
        setCollapsedSections(prev => ({ ...prev, [activeSection.trim()]: false }));
        clearSelections();
    }, [userRates, quoteLines, activeSection, clearSelections, allTasks, allMaterials]);

    const handleDeleteLineItem = useCallback((idToDelete: string) => { setQuoteLines(prev => prev.filter(line => line.id !== idToDelete)); }, []);

    const handleEditLineItem = useCallback(async (idToEdit: string) => {
        const lineToEdit = quoteLines.find(line => line.id === idToEdit);
        if (!lineToEdit) return;
        let taskToSet: CombinedTask | null = null;
        if (lineToEdit.taskId) { const found = allTasks.find(t => t.id === lineToEdit.taskId); if (found) taskToSet = { ...found, isCustom: 'userId' in found && !!found.userId };}
        setSelectedTask(taskToSet);
        let materialToSet: CombinedMaterial | null = null;
        if (lineToEdit.materialId) { const found = allMaterials.find(m => m.id === lineToEdit.materialId); if (found) materialToSet = { ...found, isCustom: 'userId' in found && !!found.userId };}
        setSelectedMaterial(materialToSet);
        let optionToSet: MaterialOption | null = null;
        if (materialToSet?.optionsAvailable && lineToEdit.materialOptionId && lineToEdit.materialOptionName) {
            optionToSet = { id: lineToEdit.materialOptionId, name: lineToEdit.materialOptionName } as MaterialOption; // Assuming structure for simplicity
        }
        setSelectedOption(optionToSet);
        setActiveSection(lineToEdit.section);
        setSelectedQuantity(lineToEdit.quantity ?? 1);
        const rateForEdit = lineToEdit.inputType === 'price' ? lineToEdit.price : lineToEdit.referenceRate;
        setOverrideRateInput(rateForEdit?.toString() ?? '');
        setSelectedDescription(lineToEdit.description || ''); // Populate line item description for editing
        setQuoteLines(prev => prev.filter(line => line.id !== idToEdit));
        alert(`"${lineToEdit.displayName}" loaded for editing. Modify above and click "Add Line Item" to re-add it to the quote.`);
        itemSelectorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, [quoteLines, allTasks, allMaterials]);

    const handleSetActiveSection = useCallback((name: string) => {
        setActiveSection(name);
    }, []);

    const handleNavigateToKitCreator = () => {
        navigate('/kit-creator');
    };

    const handleSaveQuote = async () => {
        if (!userId) {
            alert("User not logged in.");
            console.error('[SAVE QUOTE] Aborted: User not logged in.');
            return;
        }
        if (!jobTitle.trim()) {
            alert("Job Title is required.");
            console.error('[SAVE QUOTE] Aborted: Job Title is required.');
            return;
        }
        if (quoteLines.length === 0 && !existingQuoteId) {
            alert("At least one line item is required for a new quote.");
            console.error('[SAVE QUOTE] Aborted: New quote has no line items.');
            return;
        }
    
        console.log('[SAVE QUOTE] Initiated. ExistingQuoteId:', existingQuoteId);
        setIsLoadingQuote(true);
        setErrorQuote(null);
    
        const calculatedTotal = quoteLines.reduce((sum, line) => sum + (line.lineTotal || 0), 0);
        let quoteIdToUse = existingQuoteId;
        let finalQuoteNumber = quoteData?.quoteNumber; // Use existing quote number for updates initially
    
        console.log('[SAVE QUOTE] Line items in state before save attempt:', JSON.parse(JSON.stringify(quoteLines)));
        console.log('[SAVE QUOTE] User Profile for terms/defaults:', JSON.parse(JSON.stringify(userProfile)));
    
        try {
            const mainQuotePayload: any = {
                userId: userId, // Always ensure userId is part of the payload
                jobTitle: jobTitle.trim(),
                clientName: clientName.trim() || null,
                clientAddress: clientAddress.trim() || null,
                clientEmail: clientEmail.trim() || null,
                clientPhone: clientPhone.trim() || null,
                terms: terms.trim() || userProfile.defaultQuoteTerms?.trim() || null,
                status: quoteData?.status || 'Draft',
                totalAmount: calculatedTotal,
                updatedAt: serverTimestamp(),
                projectDescription: projectDescription.trim() || null,
                additionalDetails: additionalDetails.trim() || null,
                generalNotes: generalNotes.trim() || null,
                validUntil: validUntilDate ? Timestamp.fromDate(validUntilDate) : null,
            };
    
            const userQuotesCollectionRef = collection(db, 'users', userId, 'quotes');
            let quoteDocRef;
    
            if (!existingQuoteId) {
                console.log('[SAVE QUOTE] Creating new quote.');
                mainQuotePayload.createdAt = serverTimestamp();
    
                finalQuoteNumber = await runTransaction(db, async (transaction) => {
                    const profileRef = doc(db, `users/${userId}`);
                    const profileSnap = await transaction.get(profileRef);
                    if (!profileSnap.exists()) {
                        console.warn("[SAVE QUOTE TRANSACTION] User profile not found for quote numbering. Using fallback.");
                        // Consider how to handle this - maybe throw error to prevent quote creation without profile
                        return `TEMP-${Date.now().toString().slice(-6)}`;
                    }
                    const profile = profileSnap.data() as UserProfile;
                    const prefix = profile.quotePrefix || 'QT-';
                    const nextNum = profile.nextQuoteSequence || 1;
                    const padding = profile.quoteNumberPadding || 4; // Default padding
                    const newNumStr = nextNum.toString().padStart(padding, '0');
                    transaction.update(profileRef, { nextQuoteSequence: nextNum + 1 });
                    console.log(`[SAVE QUOTE TRANSACTION] Generated quote number: ${prefix}${newNumStr}`);
                    return `${prefix}${newNumStr}`;
                });
    
                if (!finalQuoteNumber) {
                    throw new Error("Failed to generate quote number from transaction.");
                }
                mainQuotePayload.quoteNumber = finalQuoteNumber;
    
                console.log('[SAVE QUOTE] Main payload for new quote:', JSON.parse(JSON.stringify(mainQuotePayload)));
                quoteDocRef = await addDoc(userQuotesCollectionRef, mainQuotePayload);
                quoteIdToUse = quoteDocRef.id;
                console.log('[SAVE QUOTE] New quote document created with ID:', quoteIdToUse);
            } else {
                console.log(`[SAVE QUOTE] Updating existing quote: ${existingQuoteId}`);
                if (!quoteIdToUse) { // Should be existingQuoteId
                    throw new Error("Quote ID missing for update (existingQuoteId was set).");
                }
                quoteDocRef = doc(userQuotesCollectionRef, quoteIdToUse);
                // Ensure quoteNumber is preserved or correctly handled for existing quotes
                mainQuotePayload.quoteNumber = finalQuoteNumber || 'N/A'; // Use existing or fallback
    
                console.log('[SAVE QUOTE] Main payload for updating quote:', JSON.parse(JSON.stringify(mainQuotePayload)));
                await setDoc(quoteDocRef, mainQuotePayload, { merge: true }); // Use setDoc with merge for updates
                console.log('[SAVE QUOTE] Existing quote document updated for ID:', quoteIdToUse);
            }
    
            if (!quoteIdToUse) {
                throw new Error("Critical: quoteIdToUse is undefined before processing line items.");
            }
    
            console.log(`[SAVE QUOTE] Preparing to process ${quoteLines.length} line items for quote ID: ${quoteIdToUse}`);
    
            const batch = writeBatch(db);
            const linesSubColRef = collection(db, 'users', userId, 'quotes', quoteIdToUse, 'quoteLines');
    
            if (existingQuoteId) {
                console.log('[SAVE QUOTE] Deleting existing line items...');
                const oldLinesSnap = await getDocs(query(linesSubColRef));
                if (oldLinesSnap.empty) {
                    console.log('[SAVE QUOTE] No existing lines found to delete.');
                } else {
                    oldLinesSnap.forEach(lineDoc => batch.delete(lineDoc.ref));
                    console.log(`[SAVE QUOTE] ${oldLinesSnap.size} existing line items added to delete batch.`);
                }
            }
    
            if (quoteLines.length > 0) {
                quoteLines.forEach((line, index) => {
                    const { id, ...dataToSave } = line; // Exclude client-side 'id'
    
                    // Start with the base object without kitTemplateId
                    // Ensure this type correctly reflects all fields from QuoteLine except 'id',
                    // and that kitTemplateId is string | undefined.
                    const sanitizedDataToSave: Omit<QuoteLine, 'id'> = {
                        section: dataToSave.section || "Default Section",
                        taskId: dataToSave.taskId || null,
                        materialId: dataToSave.materialId || null,
                        materialOptionId: dataToSave.materialOptionId || null,
                        materialOptionName: dataToSave.materialOptionName || null,
                        displayName: dataToSave.displayName || "Unnamed Item",
                        description: dataToSave.description || null,
                        quantity: dataToSave.quantity === undefined || dataToSave.quantity === null ? null : Number(dataToSave.quantity),
                        price: dataToSave.price === undefined || dataToSave.price === null ? null : Number(dataToSave.price),
                        unit: dataToSave.unit || null,
                        referenceRate: dataToSave.referenceRate === undefined || dataToSave.referenceRate === null ? null : Number(dataToSave.referenceRate),
                        inputType: dataToSave.inputType || 'price',
                        lineTotal: dataToSave.lineTotal === undefined || dataToSave.lineTotal === null ? 0 : Number(dataToSave.lineTotal),
                        order: dataToSave.order !== undefined ? Number(dataToSave.order) : index,
                        // kitTemplateId is initially omitted, will be added if valid
                    };
    
                    // Conditionally add kitTemplateId if it's a valid string
                    if (dataToSave.kitTemplateId && typeof dataToSave.kitTemplateId === 'string' && dataToSave.kitTemplateId.trim() !== "") {
                        sanitizedDataToSave.kitTemplateId = dataToSave.kitTemplateId.trim();
                    }
                    // If the condition above is false, sanitizedDataToSave.kitTemplateId remains undefined (as it was never added),
                    // which aligns with the Omit<QuoteLine, 'id'> type if kitTemplateId is optional.
    
                    // Declare newLineDocRef here, before it's used
                    const newLineDocRef = doc(linesSubColRef); // This is correct for generating a new doc ref
    
                    console.log(`[SAVE QUOTE] Line item ${index} - kitTemplateId on dataToSave (original):`, dataToSave.kitTemplateId, 'SANITIZED (final object being saved):', JSON.parse(JSON.stringify(sanitizedDataToSave)));
                    batch.set(newLineDocRef, sanitizedDataToSave);
                });

                console.log('[SAVE QUOTE] All line items added to batch.');
            } else {
                console.log('[SAVE QUOTE] No line items to add to this quote.');
            }
    
            console.log('[SAVE QUOTE] Committing batch operations...');
            await batch.commit();
            console.log('[SAVE QUOTE] Batch commit successful!');
    
            alert(`Quote ${existingQuoteId ? 'updated' : 'saved'}! Number: ${finalQuoteNumber}`);
            if (onSaveSuccess) {
                onSaveSuccess(quoteIdToUse);
            } else if (!existingQuoteId) {
                 navigate(`/existing-quotes`); // Navigate to existing quotes page after new save
            }
    
    
            // Resetting form for new quote or re-fetching for existing
            if (!existingQuoteId) {
                console.log('[SAVE QUOTE] Resetting form for new quote entry.');
                setJobTitle('');
                setSelectedClientId(''); // Also reset selected client ID
                setClientName(''); setClientAddress(''); setClientEmail(''); setClientPhone('');
                setTerms(userProfile.defaultQuoteTerms || '');
                setProjectDescription(''); setAdditionalDetails(''); setGeneralNotes(''); setValidUntilDate(null);
                setQuoteLines([]);
                setQuoteData({}); // Clear any old quote data
                setActiveSection(globalAreas.length > 0 ? globalAreas[0].name : 'Main Area');
                clearSelections();
            } else {
                // Optionally re-fetch data for the edited quote to ensure UI consistency,
                // though the batch write should mean Firestore data is now current.
                // Forcing a re-fetch can be good if there are complex states.
                console.log('[SAVE QUOTE] Re-fetching data for updated quote:', quoteIdToUse);
                const updatedSnap = await getDoc(doc(db, 'users', userId, 'quotes', quoteIdToUse));
                if (updatedSnap.exists()) {
                    setQuoteData(updatedSnap.data() as Quote);
                }
                const updatedLines = await getDocs(query(collection(db, 'users', userId, 'quotes', quoteIdToUse, 'quoteLines'), orderBy('order')));
                setQuoteLines(updatedLines.docs.map(d => ({ id: d.id, ...d.data() } as QuoteLine)));
                console.log('[SAVE QUOTE] Fetched updated lines:', updatedLines.docs.map(d => d.data()));
    
            }
    
        } catch (error: any) {
            console.error("[SAVE QUOTE] CRITICAL ERROR in handleSaveQuote:", error);
            console.error("[SAVE QUOTE] Error Name:", error.name);
            console.error("[SAVE QUOTE] Error Message:", error.message);
            console.error("[SAVE QUOTE] Error Stack:", error.stack);
            let userMessage = `Failed to save quote: ${error.message || "Unknown error"}`;
            if (error.code) { // Firestore error codes
                userMessage += ` (Code: ${error.code})`;
            }
            setErrorQuote(userMessage);
            alert(userMessage);
        } finally {
            setIsLoadingQuote(false);
            console.log('[SAVE QUOTE] Process finished.');
        }
    };

    const groupedQuoteLines = useMemo(() => groupLinesBySection(quoteLines), [quoteLines]);
    const sortedSectionNames = useMemo(() => Object.keys(groupedQuoteLines).sort(), [groupedQuoteLines]);
    const toggleSectionCollapse = (name: string) => setCollapsedSections(prev => ({ ...prev, [name]: !prev[name] }));

    const isLoadingOverall = isLoadingGlobals || isLoadingRates || isLoadingAreas || isLoadingClients || isLoadingQuote;

    useEffect(() => {
        if (!isLoadingOverall && currentStep === 1 && step1Ref.current) {
            // Animate in the first step when component loads
            setTimeout(() => {
                wizardStepInFromRight(step1Ref.current, 0.6);
                
                // Animate in the content
                setTimeout(() => {
                    const contentElements = step1Ref.current?.querySelectorAll('.wizard-content > *');
                    if (contentElements) {
                        wizardContentIn(contentElements, 0.08, 0.5);
                    }
                }, 200);
            }, 100);
        }
    }, [isLoadingOverall, currentStep]);
    

    const getStepName = (step: number) => {
        if (step === 1) return "Client & Job Details";
        if (step === 2) return "Build Line Items";
        if (step === 3) return "Review & Finalize";
        return "Quote Builder";
    };

    return (
        <div className={styles.quoteBuilderContainer}>
            {/* --- Main Heading --- */}
            <h2 className="mb-lg">
                {existingQuoteId ? `Edit Quote (#${quoteData?.quoteNumber || '...'})` : 'Create New Quote'}
                {` - Step ${currentStep}: ${getStepName(currentStep)}`}
            </h2>
    
            {/* --- Loading / Error Messages --- */}
            {isLoadingOverall && !isTaskFormModalOpen && !isMaterialFormModalOpen && <div className="text-info">Loading essential data...</div>}
            {errorQuote && <p className="text-danger">Quote Error: {errorQuote}</p>}
            {errorRates && <p className="text-danger">Rates Error: {errorRates}</p>}
    
            {!isLoadingOverall && (
    <>
        {/* STEP 1: Render Step1_QuoteClientDetails Component */}
        {currentStep === 1 && (
            <div ref={step1Ref} className="wizard-step">
                <div className="wizard-content">
                    <Step1_QuoteClientDetails
                        jobTitle={jobTitle}
                        setJobTitle={setJobTitle}
                        selectedClientId={selectedClientId}
                        setSelectedClientId={setSelectedClientId}
                        clients={clients}
                        isLoadingClients={isLoadingClients}
                        validUntilDate={validUntilDate}
                        setValidUntilDate={setValidUntilDate}
                        clientNameDisplay={clientName}
                        clientAddressDisplay={clientAddress}
                        clientEmailDisplay={clientEmail}
                        clientPhoneDisplay={clientPhone}
                    />
                </div>
            </div>
        )}

        {/* STEP 2: Render Step2_LineItemBuilder Component */}
        {currentStep === 2 && (
            <div ref={step2Ref} className="wizard-step">
                <div className="wizard-content">
                    <Step2_LineItemBuilder
                        globalAreas={globalAreas}
                        activeSection={activeSection}
                        isLoadingAreas={isLoadingAreas}
                        handleSetActiveSection={handleSetActiveSection}
                        itemSelectorRef={itemSelectorRef}
                        userId={userId}
                        allTasks={allTasks}
                        allMaterials={allMaterials}
                        selectedTask={selectedTask}
                        selectedMaterial={selectedMaterial}
                        selectedOption={selectedOption}
                        selectedQuantity={selectedQuantity}
                        setSelectedQuantity={setSelectedQuantity}
                        overrideRateInput={overrideRateInput}
                        setOverrideRateInput={setOverrideRateInput}
                        selectedDescription={selectedDescription}
                        setSelectedDescription={setSelectedDescription}
                        currentItemDetails={currentItemDetails}
                        isLoadingGlobals={isLoadingGlobals}
                        isLoadingRates={isLoadingRates}
                        handleTaskSelectForItemForm={handleTaskSelectForItemForm}
                        handleMaterialSelectForItemForm={handleMaterialSelectForItemForm}
                        handleOptionSelectForItemForm={handleOptionSelectForItemForm}
                        handleOpenNewTaskModal={handleOpenNewTaskModal}
                        handleOpenNewMaterialModal={handleOpenNewMaterialModal}
                        handleKitSelected={handleKitSelected}
                        handleNavigateToKitCreator={handleNavigateToKitCreator}
                        handleAddLineItem={handleAddLineItem}
                        isLoadingQuote={isLoadingQuote}
                        quoteLines={quoteLines}
                        sortedSectionNames={sortedSectionNames}
                        groupedQuoteLines={groupedQuoteLines}
                        collapsedSections={collapsedSections}
                        toggleSectionCollapse={toggleSectionCollapse}
                        handleDeleteLineItem={handleDeleteLineItem}
                        handleEditLineItem={handleEditLineItem}
                    />
                </div>
            </div>
        )}

        {/* STEP 3: Render Step3_ReviewFinalize Component */}
        {currentStep === 3 && (
            <div ref={step3Ref} className="wizard-step">
                <div className="wizard-content">
                    <Step3_ReviewFinalize
                        jobTitle={jobTitle}
                        clientName={clientName}
                        clientAddress={clientAddress}
                        clientEmail={clientEmail}
                        clientPhone={clientPhone}
                        validUntilDate={validUntilDate}
                        quoteLines={quoteLines}
                        sortedSectionNames={sortedSectionNames}
                        groupedQuoteLines={groupedQuoteLines}
                        projectDescription={projectDescription}
                        setProjectDescription={setProjectDescription}
                        additionalDetails={additionalDetails}
                        setAdditionalDetails={setAdditionalDetails}
                        generalNotes={generalNotes}
                        setGeneralNotes={setGeneralNotes}
                        terms={terms}
                        setTerms={setTerms}
                        validationIssues={validationIssues}
                        isLoadingQuote={isLoadingQuote}
                        onGenerateWithAI={handleGenerateWithAI}
                        isAIGenerating={isAIGenerating}
                    />
                </div>
            </div>
        )}

        {/* Sticky Bottom Bar */}
        <StickyQuoteProgressBar
            currentStep={currentStep}
            totalSteps={totalSteps}
            activeSection={activeSection}
            quoteTotal={quoteLines.reduce((sum, line) => sum + (line.lineTotal || 0), 0)}
            onNext={handleNextStep}
            onPrevious={handlePreviousStep}
            onSave={handleSaveQuote}
            isSaveDisabled={isSaveDisabled || isAnimating}
            isLoading={isLoadingQuote}
            configuredItemPreview={
                (selectedTask || selectedMaterial) && currentStep === 2 ? {
                    taskName: selectedTask?.name,
                    materialName: selectedMaterial?.name,
                    optionName: selectedOption?.name,
                    quantity: currentItemDetails.inputType === 'quantity' ? selectedQuantity : null,
                    rate: parseFloat(overrideRateInput) || currentItemDetails.rate,
                    unit: currentItemDetails.unit
                } : null
            }
        />
    </>
)}
    
            {/* --- Modals --- */}
            {userId && (
                <>
                    <TaskFormModal
                        isOpen={isTaskFormModalOpen}
                        onClose={() => {
                            setIsTaskFormModalOpen(false);
                            if (createTaskPromiseRef.current) {
                                createTaskPromiseRef.current.resolve(null);
                                createTaskPromiseRef.current = null;
                            }
                        }}
                        onSave={handleSaveTaskFromModal}
                        initialData={taskFormInitialData}
                        mode="add"
                    />
    
                    <MaterialFormModal
                        isOpen={isMaterialFormModalOpen}
                        onClose={() => {
                            setIsMaterialFormModalOpen(false);
                            if (createMaterialPromiseRef.current) {
                                createMaterialPromiseRef.current.resolve(null);
                                createMaterialPromiseRef.current = null;
                            }
                        }}
                        onSaveCallback={handleMaterialSavedFromModal} // This should trigger a re-fetch or update allMaterials
                        userId={userId}
                        initialData={materialFormInitialData}
                        mode="add"
                    />
                </>
            )}
        </div>
    );
}

export default QuoteBuilder;