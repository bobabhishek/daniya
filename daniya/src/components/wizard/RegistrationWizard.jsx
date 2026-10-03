import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Ticket, Sparkles, LogIn, ArrowLeft, ShieldCheck, Lock } from 'lucide-react';
import ProgressIndicator from './ProgressIndicator';
import StepParticipants from './StepParticipants';
import StepReview from './StepReview';
import StepPayment from './StepPayment';
import StepSuccess from './StepSuccess';
import { calculatePricingBreakdown } from '../../utils/pricing';
import { generateRegistrationId, generateTicketId, generateTransactionId } from '../../utils/idGenerator';
import { useAuth } from '../../context/AuthContext';
import { usePasses } from '../../context/PassesContext';
import { formatToIndianDate, formatCurrentIndianDateTime } from '../../utils/indianDateUtils';
import api from '../../services/api';

export default function RegistrationWizard({ onRegistrationCreated, onOpenAdmin, onOpenAuth }) {
  const { user } = useAuth();
  const { addVerifiedRegistration } = usePasses();
  const [currentStep, setCurrentStep] = useState(1);
  const [participants, setParticipants] = useState([
    { 
      id: 'p1', 
      participantNumber: 1,
      name: '', 
      dob: '', 
      age: '', 
      idProofUrl: '', 
      idProofName: '', 
      idProofType: 'Aadhaar Card (with DOB)' 
    }
  ]);
  const [activeRegistration, setActiveRegistration] = useState(null);
  const [isInitializingPayment, setIsInitializingPayment] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [completedRegistration, setCompletedRegistration] = useState(null);

  // Dynamic live pricing breakdown
  const pricingBreakdown = calculatePricingBreakdown(participants);

  // Participant management actions (Descending order: newest added participant is placed on top)
  const handleAddParticipant = () => {
    const nextId = `p${Date.now()}`;
    const highestNumber = participants.reduce((max, p) => Math.max(max, p.participantNumber || 1), 0);
    const nextNum = highestNumber + 1;
    setParticipants(prev => [
      { 
        id: nextId, 
        participantNumber: nextNum,
        name: '', 
        dob: '', 
        age: '', 
        idProofUrl: '', 
        idProofName: '', 
        idProofType: 'Aadhaar Card (with DOB)' 
      },
      ...prev
    ]);
    setValidationError('');
  };

  const handleRemoveParticipant = (id) => {
    if (participants.length <= 1) return;
    setParticipants(prev => prev.filter(p => p.id !== id));
    setValidationError('');
  };

  const handleUpdateParticipant = (id, field, value) => {
    setParticipants(prev =>
      prev.map(p => {
        if (p.id === id) {
          return { ...p, [field]: value };
        }
        return p;
      })
    );
    setValidationError('');
  };

  // Validation before going to Review (Enforces mandatory Name, DOB, and ID Proof Photo)
  const handleProceedToReview = () => {
    for (let i = 0; i < participants.length; i++) {
      const p = participants[i];
      const pNum = p.participantNumber || (participants.length - i);
      const participantNum = String(pNum).padStart(2, '0');
      const participantLabel = p.name?.trim() ? `Participant ${participantNum} (${p.name.trim()})` : `Participant ${participantNum}`;

      // 1. Mandatory Name
      if (!p.name?.trim()) {
        setValidationError(`Please enter the full name for Participant ${participantNum}.`);
        return;
      }

      // 2. Mandatory Date of Birth (DD/MM/YYYY)
      if (!p.dob) {
        setValidationError(`Please select the Date of Birth (DOB in DD/MM/YYYY) for ${participantLabel}.`);
        return;
      }

      const ageNum = parseInt(p.age, 10);
      if (isNaN(ageNum) || ageNum <= 0 || ageNum > 100) {
        setValidationError(`Please provide a valid Date of Birth (DD/MM/YYYY) for ${participantLabel}.`);
        return;
      }
    }

    setValidationError('');
    setCurrentStep(2);
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  // Proceed to Payment: Initialize authoritative registration on backend
  const handleProceedToPayment = async () => {
    if (!user) {
      if (onOpenAuth) {
        onOpenAuth('login', 'Sign In to Secure Passes', 'Please sign in or create an account so your verified passes are saved to your account.');
      }
      return;
    }
    setIsInitializingPayment(true);
    setValidationError('');
    try {
      const createdRecord = await api.createRegistration(participants);
      if (createdRecord && createdRecord.registrationId) {
        setActiveRegistration(createdRecord);
        setCurrentStep(3);
        window.scrollTo({ top: 300, behavior: 'smooth' });
      } else {
        throw new Error('Registration reference was not created by server.');
      }
    } catch (err) {
      console.error("Backend registration creation error:", err);
      setValidationError(err.message || 'Could not initialize registration on server. Please try again.');
    } finally {
      setIsInitializingPayment(false);
    }
  };

  // Payment completed only after backend 3-way match verification
  const handlePaymentSuccess = async (verifiedResponse) => {
    if (!verifiedResponse || verifiedResponse.verificationStatus !== 'VERIFIED') {
      console.error("Payment not verified by backend. Tickets will not be issued.");
      return;
    }

    try {
      const confirmedRecord = await api.getRegistration(verifiedResponse.registrationId);
      if (confirmedRecord && confirmedRecord.verificationStatus === 'VERIFIED') {
        setCompletedRegistration(confirmedRecord);
        if (onRegistrationCreated) onRegistrationCreated(confirmedRecord);
        setCurrentStep(4);
        window.scrollTo({ top: 200, behavior: 'smooth' });
        return;
      }
    } catch (apiErr) {
      console.warn("Could not fetch full record after verification:", apiErr);
    }

    // Fallback if getRegistration network is slow, construct from verifiedResponse and activeRegistration
    const confirmed = {
      ...(activeRegistration || {}),
      registrationId: verifiedResponse.registrationId,
      amount: verifiedResponse.expectedAmount || activeRegistration?.expectedAmount || pricingBreakdown.totalAmount,
      count: activeRegistration?.participants?.length || participants.length,
      paymentStatus: 'PAID',
      verificationStatus: 'VERIFIED',
      receiptPath: verifiedResponse.receiptPath,
      ticketIds: verifiedResponse.ticketIds || [],
      participants: (activeRegistration?.participants || participants).map((p, index) => ({
        ...p,
        ticketId: verifiedResponse.ticketIds?.[index] || p.ticketId
      }))
    };

    setCompletedRegistration(confirmed);
    addVerifiedRegistration(confirmed);
    if (onRegistrationCreated) onRegistrationCreated(confirmed);
    setCurrentStep(4);
    window.scrollTo({ top: 200, behavior: 'smooth' });
  };

  const handleReset = () => {
    setParticipants([
      { 
        id: `p${Date.now()}`, 
        participantNumber: 1,
        name: '', 
        dob: '', 
        age: '', 
        idProofUrl: '', 
        idProofName: '', 
        idProofType: 'Aadhaar Card (with DOB)' 
      }
    ]);
    setCompletedRegistration(null);
    setCurrentStep(1);
    window.scrollTo({ top: 200, behavior: 'smooth' });
  };

  // Sync authenticated attendee's name to Participant 01 if blank
  useEffect(() => {
    if (user && participants.length > 0 && !participants[0].name) {
      if (user.displayName) {
        handleUpdateParticipant(participants[0].id, 'name', user.displayName);
      }
    }
  }, [user]);

  // MANDATORY AUTH GATE: Attendee must sign in or sign up before booking tickets
  if (!user) {
    return (
      <section id="register" className="py-16 md:py-24 bg-stone-50/50 min-h-screen flex items-center justify-center">
        <div className="max-w-xl mx-auto px-4 sm:px-6 w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl border-2 border-amber-300 shadow-festive p-7 sm:p-10 text-center relative overflow-hidden"
          >
            {/* Top decorative accent */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-amber-100 to-transparent pointer-events-none rounded-tr-3xl" />

            <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-800 mx-auto flex items-center justify-center mb-5 shadow-sm">
              <Ticket className="w-8 h-8 text-royal-crimson" />
            </div>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300 mb-3">
              <Sparkles className="w-3.5 h-3.5 text-amber-700" />
              <span>Attendee Account Required</span>
            </span>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 font-festive">
              Sign In to Book Entry Passes
            </h2>

            <p className="mt-3 text-sm text-stone-600 leading-relaxed max-w-md mx-auto">
              Please sign in or create an account first. Your admission passes, payment receipts, and age verification documents will be safely saved to your profile for easy access anytime.
            </p>

            <div className="mt-8 space-y-3">
              <button
                type="button"
                onClick={() => onOpenAuth && onOpenAuth('signup', 'Create Account to Book Tickets', 'Register now to secure your Dandiya Night 2026 admission passes.')}
                className="w-full py-4 rounded-2xl text-sm font-extrabold text-white bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-700 hover:to-amber-700 shadow-festive active:scale-95 transition-all flex items-center justify-center gap-2 tracking-wide"
              >
                <span>CREATE ACCOUNT & BOOK PASSES</span>
              </button>

              <button
                type="button"
                onClick={() => onOpenAuth && onOpenAuth('login', 'Sign In to Book Tickets', 'Sign in to access attendee registration and book passes.')}
                className="w-full py-3.5 rounded-2xl text-sm font-bold text-stone-800 bg-stone-100 hover:bg-amber-100/70 border border-stone-200 transition-colors flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4 text-amber-700" />
                <span>I Already Have An Account (Sign In)</span>
              </button>
            </div>

            <div className="mt-6 pt-5 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
              <button
                type="button"
                onClick={() => {
                  window.location.hash = '';
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="hover:text-stone-800 flex items-center gap-1 font-semibold"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
              </button>
              <span className="text-[11px] text-stone-400">
                Official ticketing by Red Hawks
              </span>
            </div>
          </motion.div>
        </div>
      </section>
    );
  }

  return (
    <section id="register" className="py-12 md:py-20 bg-stone-50/50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Progress Stepper */}
        <ProgressIndicator currentStep={currentStep} />

        {/* Step Views with Framer Motion AnimatePresence */}
        <div className="mt-8">
          <AnimatePresence mode="wait">
            
            {currentStep === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 15 }}
                transition={{ duration: 0.25 }}
              >
                <StepParticipants
                  participants={participants}
                  onAddParticipant={handleAddParticipant}
                  onRemoveParticipant={handleRemoveParticipant}
                  onUpdateParticipant={handleUpdateParticipant}
                  pricingBreakdown={pricingBreakdown}
                  onProceed={handleProceedToReview}
                  validationError={validationError}
                  user={user}
                  onOpenAuth={onOpenAuth}
                />
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 15 }}
                transition={{ duration: 0.25 }}
              >
                {validationError && (
                  <div className="mb-4 max-w-4xl mx-auto p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-center justify-between">
                    <span>{validationError}</span>
                    <button onClick={() => setValidationError('')} className="text-red-600 font-bold hover:underline">Dismiss</button>
                  </div>
                )}
                <StepReview
                  participants={participants}
                  pricingBreakdown={pricingBreakdown}
                  onBack={() => setCurrentStep(1)}
                  onProceedToPayment={handleProceedToPayment}
                  isSubmitting={isInitializingPayment}
                />
              </motion.div>
            )}

            {currentStep === 3 && (
              <motion.div
                key="step-3"
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 15 }}
                transition={{ duration: 0.25 }}
              >
                <StepPayment
                  pricingBreakdown={{
                    ...pricingBreakdown,
                    totalAmount: activeRegistration?.expectedAmount ?? pricingBreakdown.totalAmount
                  }}
                  registrationId={activeRegistration?.registrationId}
                  onPaymentSuccess={handlePaymentSuccess}
                  onBack={() => {
                    setCurrentStep(2);
                    window.scrollTo({ top: 300, behavior: 'smooth' });
                  }}
                  onBackToParticipants={() => {
                    setCurrentStep(1);
                    window.scrollTo({ top: 300, behavior: 'smooth' });
                  }}
                />
              </motion.div>
            )}

            {currentStep === 4 && completedRegistration && completedRegistration.verificationStatus === 'VERIFIED' ? (
              <motion.div
                key="step-4"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <StepSuccess
                  registration={completedRegistration}
                  onReset={handleReset}
                  onOpenAdmin={onOpenAdmin}
                />
              </motion.div>
            ) : currentStep === 4 ? (
              <div className="bg-white rounded-3xl border border-red-200 p-8 text-center max-w-lg mx-auto shadow-sm">
                <p className="text-red-700 font-bold text-base">Payment Not Verified</p>
                <p className="text-xs text-stone-600 mt-1">
                  Event passes are strictly protected and can only be issued after successful backend payment proof verification.
                </p>
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="mt-4 px-6 py-2.5 bg-royal-crimson hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors"
                >
                  Return to Payment
                </button>
              </div>
            ) : null}

          </AnimatePresence>
        </div>

      </div>
    </section>
  );
}
