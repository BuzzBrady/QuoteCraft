// src/components/QuoteBuilder.tsx
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useQuoteBuilderStore } from '../stores/useQuoteBuilderStore';
import { useUserProfile } from '../hooks/useUserProfile';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react'; // Import the hook

import Step1_QuoteClientDetails from './Step1_QuoteClientDetails';
import Step2_LineItemBuilder from './Step2_LineItemBuilder';
import Step3_ReviewFinalize from './Step3_ReviewFinalize';
import StickyQuoteProgressBar from './StickyQuoteProgressBar';
import styles from './QuoteBuilder.module.css';

// FIX: We no longer need export here, default export is at the bottom
const QuoteBuilder: React.FC = () => {
    const { quoteId } = useParams<{ quoteId: string }>();
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    
    const [currentStep, setCurrentStep] = useState(1);
    const [isAnimating, setIsAnimating] = useState(false);

    const stepRefs = [useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null)];
    const stepsContainerRef = useRef<HTMLDivElement>(null);

    const { quote, status, error, loadQuote, createNewQuote, saveQuote, reset } = useQuoteBuilderStore();
    const { profile, loading: profileLoading } = useUserProfile();
    
    const isLoading = status === 'loading' || profileLoading;

    // FIX: A dedicated hook for the initial "fade in" animation
    useGSAP(() => {
        if (!isLoading && stepRefs[0].current) {
            // Animate the first step in when data is ready
            gsap.to(stepRefs[0].current, { autoAlpha: 1, duration: 0.5, delay: 0.1 });
        }
    }, { dependencies: [isLoading], scope: stepsContainerRef });


    useEffect(() => {
        if (isLoading) return;
        if (!currentUser || !profile) {
            reset();
            return;
        };

        if (quoteId) {
            loadQuote(quoteId, currentUser.uid);
        } else {
            createNewQuote(profile);
        }
        return () => {
            reset();
        };
    }, [quoteId, currentUser, profile, isLoading, loadQuote, createNewQuote, reset]);
  
    const handleSave = async () => {
        if (!currentUser || !profile) {
            alert("You must be logged in and have a profile to save.");
            return;
        }
        const savedQuoteId = await saveQuote(currentUser.uid, profile);
        
        if (!quoteId && savedQuoteId) {
             navigate(`/quotes/edit/${savedQuoteId}`, { replace: true });
        }
    };

    // FIX: A much smoother and more robust GSAP timeline for transitions
    const handleStepChange = (newStep: number) => {
        if (isAnimating || newStep === currentStep || newStep < 1 || newStep > 3) return;

        setIsAnimating(true);
        const outgoingStep = stepRefs[currentStep - 1].current;
        const incomingStep = stepRefs[newStep - 1].current;
        const direction = newStep > currentStep ? 1 : -1; // 1 for forward, -1 for backward

        const tl = gsap.timeline({
            onComplete: () => {
                // Update React state only AFTER the animation is complete
                setCurrentStep(newStep);
                setIsAnimating(false);
            }
        });

        // Set the incoming step to its starting position (off-screen)
        gsap.set(incomingStep, { autoAlpha: 0, x: 30 * direction });

        // Animate the outgoing step
        tl.to(outgoingStep, {
            autoAlpha: 0,
            x: -30 * direction,
            duration: 0.3,
            ease: 'power2.in'
        });

        // Animate the incoming step
        tl.to(incomingStep, {
            autoAlpha: 1,
            x: 0,
            duration: 0.4,
            ease: 'power2.out'
        }, "-=0.1"); // Overlap animations slightly for a smoother feel
    };

    if (isLoading) return <div>Loading Builder...</div>;
    if (status === 'error') return <div className='error-message'>Error: {error}</div>;

    return (
        <div className={styles.quoteBuilderContainer}>
            <h2 className="mb-lg">
                {quoteId ? `Edit Quote (#${quote.quoteNumber || '...'})` : 'Create New Quote'}
            </h2>
            
            <div ref={stepsContainerRef} className={styles.stepsContainer}>
                {/* FIX: All steps are in the DOM, GSAP and CSS handle visibility */}
                <Step1_QuoteClientDetails ref={stepRefs[0]} />
                <Step2_LineItemBuilder ref={stepRefs[1]} />
                <Step3_ReviewFinalize ref={stepRefs[2]} />
            </div>

            <StickyQuoteProgressBar
                currentStep={currentStep}
                totalSteps={3}
                onNext={() => handleStepChange(currentStep + 1)}
                onPrevious={() => handleStepChange(currentStep - 1)}
                onSave={handleSave}
                isSaveDisabled={status === 'saving' || isAnimating}
            />
        </div>
    );
};

export default QuoteBuilder;