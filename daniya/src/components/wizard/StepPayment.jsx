import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, 
  Lock, 
  QrCode, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ArrowLeft, 
  RefreshCw, 
  Sparkles,
  Smartphone,
  Copy,
  Check,
  Upload,
  Image as ImageIcon,
  X,
  FileCheck,
  Eye,
  AlertTriangle
} from 'lucide-react';
import { EVENT_CONFIG } from '../../config/eventConfig';
import api from '../../services/api';
import { ToranGarland, DandiyaSticksIcon, DiyaIcon } from '../common/IndianFestiveMotifs';

export default function StepPayment({ 
  pricingBreakdown, 
  registrationId,
  onPaymentSuccess, 
  onBack, 
  onBackToParticipants 
}) {
  const [copiedPayee, setCopiedPayee] = useState(false);
  const [showProofSection, setShowProofSection] = useState(false);
  
  // Proof upload & form states
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [screenshotPreview, setScreenshotPreview] = useState(null);
  const [enteredAmount, setEnteredAmount] = useState('');
  const [formError, setFormError] = useState('');
  
  // Verification states
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyElapsed, setVerifyElapsed] = useState(0);
  const [verificationError, setVerificationError] = useState(null); // { message, mismatchReason, expected, entered, detected }
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Timer while verifying payment to provide user reassurance
  React.useEffect(() => {
    let timer = null;
    if (isVerifying) {
      setVerifyElapsed(0);
      timer = setInterval(() => {
        setVerifyElapsed(prev => prev + 1);
      }, 1000);
    } else {
      setVerifyElapsed(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isVerifying]);

  const fileInputRef = useRef(null);
  const proofSectionRef = useRef(null);

  const payeeName = EVENT_CONFIG.PAYMENT.PAYEE_NAME; // "ARPITH MANOHAR"
  const qrImage = EVENT_CONFIG.PAYMENT.UPI_QR_IMAGE; // "/assets/admin_qr_arpith.jpg"
  const expectedAmount = pricingBreakdown.totalAmount;

  const handleCopyPayee = () => {
    navigator.clipboard.writeText(payeeName);
    setCopiedPayee(true);
    setTimeout(() => setCopiedPayee(false), 2000);
  };

  const handlePaymentDoneClick = () => {
    setShowProofSection(true);
    setTimeout(() => {
      proofSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFormError('Please select a valid image file (PNG, JPG, JPEG, or WebP).');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setFormError('File size exceeds 15 MB. Please upload a compressed screenshot.');
      return;
    }

    setFormError('');
    setScreenshotFile(file);
    const previewUrl = URL.createObjectURL(file);
    setScreenshotPreview(previewUrl);
    setVerificationError(null);
  };

  const handleRemoveScreenshot = () => {
    if (screenshotPreview) {
      URL.revokeObjectURL(screenshotPreview);
    }
    setScreenshotFile(null);
    setScreenshotPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleVerifyPayment = async () => {
    setFormError('');
    setVerificationError(null);

    // 1. Mandatory Screenshot Validation
    if (!screenshotFile) {
      setFormError('Please upload your UPI payment screenshot to proceed.');
      return;
    }

    // 2. Mandatory Amount Validation
    const cleanAmount = String(enteredAmount).replace(/[^0-9]/g, '');
    const numAmount = parseInt(cleanAmount, 10);
    if (!numAmount || isNaN(numAmount) || numAmount <= 0) {
      setFormError('Please enter the exact amount you paid in rupees.');
      return;
    }

    if (!registrationId) {
      setFormError('Registration reference missing. Please try clicking back to review and retry.');
      return;
    }

    setIsVerifying(true);

    try {
      const response = await api.verifyPaymentProof(registrationId, numAmount, screenshotFile);

      setIsVerifying(false);

      if (response && response.success && response.verificationStatus === 'VERIFIED') {
        // SUCCESS: Three-way match verified on backend
        onPaymentSuccess(response);
      } else {
        // MISMATCH OR OCR FAILURE
        setVerificationError({
          message: response.message || 'Payment amount could not be verified.',
          mismatchReason: response.mismatchReason || 'Uploaded screenshot details do not match the expected registration amount.',
          expected: response.expectedAmount ?? expectedAmount,
          entered: response.enteredAmount ?? numAmount,
          detected: response.ocrAmount ?? 'Could not be detected'
        });
      }
    } catch (err) {
      setIsVerifying(false);
      const errMsg = err.message || 'Network error occurred during payment verification.';
      setVerificationError({
        message: 'Payment Verification Failed',
        mismatchReason: errMsg,
        expected: expectedAmount,
        entered: numAmount,
        detected: 'Error reading receipt'
      });
    }
  };

  const handleTryAgain = () => {
    setVerificationError(null);
    handleRemoveScreenshot();
    setEnteredAmount('');
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      
      {/* Header */}
      <div className="text-center max-w-xl mx-auto mb-8">
        <div className="inline-flex items-center justify-center p-2 rounded-2xl bg-amber-100/70 border border-amber-300/80 mb-2 shadow-2xs">
          <DandiyaSticksIcon className="w-5 h-5 text-amber-700" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 font-festive">
          SCAN QR TO PAY
        </h2>
        <p className="mt-1 text-stone-600 text-sm">
          Please scan the organizer's official UPI QR code below using any UPI app to complete your booking.
        </p>
      </div>

      <div className="relative bg-white rounded-3xl border border-amber-300 shadow-festive overflow-hidden">
        <div className="filigree-corner-tl" />
        <div className="filigree-corner-tr" />
        <div className="filigree-corner-bl" />
        <div className="filigree-corner-br" />
        
        {/* Order Summary Ribbon */}
        <div className="bg-gradient-to-r from-amber-50 via-red-50/50 to-amber-50 p-6 border-b border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs uppercase font-extrabold text-stone-500">Order Summary</span>
            <p className="text-sm font-bold text-stone-900">
              {pricingBreakdown.totalParticipants} {pricingBreakdown.totalParticipants === 1 ? 'Event Pass' : 'Event Passes'} (Standard Entry @ ₹299)
            </p>
            {onBackToParticipants && (
              <button
                type="button"
                onClick={onBackToParticipants}
                className="text-xs text-royal-crimson hover:underline font-semibold mt-0.5 flex items-center gap-1"
              >
                <span>Edit attendee details</span>
              </button>
            )}
          </div>
          <div className="text-right">
            <span className="text-xs uppercase font-extrabold text-stone-500">Payable Amount</span>
            <p className="text-2xl font-extrabold text-royal-crimson">
              ₹{expectedAmount}
            </p>
          </div>
        </div>

        <ToranGarland className="opacity-80 -mt-0.5 shadow-2xs" />

        {/* Primary Payment Step Body */}
        <div className="p-6 sm:p-8">
          
          {/* Payment Method Notice */}
          <div className="flex items-center justify-between pb-4 mb-6 border-b border-stone-100">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-black uppercase tracking-wider text-stone-800">
                Exclusive Payment Mode: UPI QR Code
              </span>
            </div>
            <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full">
              0% Convenience Fee
            </span>
          </div>

          {/* =========================================================================
              1. HIGHLIGHTED PAYMENT GUIDELINES & VERIFICATION RULES (UP / TOP)
              ========================================================================= */}
          <div className="mb-8 p-5 sm:p-7 rounded-3xl bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-amber-500/15 border-2 border-amber-400 shadow-md relative overflow-hidden">
            {/* Corner Decorative Accent */}
            <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-bl from-amber-300/30 to-transparent rounded-bl-full pointer-events-none" />

            <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-amber-200/90">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-xs">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
                      MANDATORY INSTRUCTIONS
                    </span>
                    <span className="text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                      OFFICIAL PROCESS
                    </span>
                  </div>
                  <h4 className="font-festive font-black text-lg sm:text-xl text-stone-900 tracking-wide mt-1">
                    HOW TO COMPLETE PAYMENT &amp; SECURE PASSES
                  </h4>
                </div>
              </div>
            </div>

            {/* HIGH-VISIBILITY VERIFICATION ALERT CALLOUT */}
            <div className="mb-5 p-4 rounded-2xl bg-gradient-to-r from-red-50 via-amber-50 to-orange-50 border-2 border-royal-crimson/40 shadow-xs flex items-start gap-3">
              <div className="p-2 rounded-xl bg-royal-crimson text-white shrink-0 mt-0.5 shadow-xs">
                <AlertTriangle className="w-4 h-4 text-amber-200" />
              </div>
              <div className="text-xs space-y-1">
                <p className="font-black text-royal-crimson text-xs sm:text-sm uppercase tracking-wide">
                  CRITICAL: PAYMENT SCREENSHOT UPLOAD REQUIRED FOR VERIFICATION
                </p>
                <p className="text-stone-700 font-medium leading-relaxed">
                  After completing the transfer, you <strong className="text-stone-950 underline decoration-royal-crimson font-black">MUST upload your payment screenshot</strong> below. The receipt must clearly show the <strong className="text-stone-950 font-bold">Transaction ID / UTR</strong> and the exact paid amount. Entry passes are issued <strong className="text-stone-950 font-bold">only after receipt verification</strong>.
                </p>
              </div>
            </div>

            {/* 4 HIGHLIGHTED STEPS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4 text-xs sm:text-sm">
              {/* Step 1 */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-white/90 border border-amber-200 shadow-2xs hover:border-amber-300 transition-all">
                <div className="flex items-start gap-3">
                  <span className="w-7 h-7 rounded-xl bg-amber-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0 shadow-xs">
                    1
                  </span>
                  <div>
                    <p className="font-extrabold text-stone-900 text-xs sm:text-sm">Open Any UPI App</p>
                    <p className="text-stone-600 text-xs mt-0.5 leading-relaxed">
                      Launch Google Pay, PhonePe, Paytm, BHIM, Cred, or your mobile banking app.
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-white/90 border border-amber-200 shadow-2xs hover:border-amber-300 transition-all">
                <div className="flex items-start gap-3">
                  <span className="w-7 h-7 rounded-xl bg-amber-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0 shadow-xs">
                    2
                  </span>
                  <div>
                    <p className="font-extrabold text-stone-900 text-xs sm:text-sm">
                      Scan QR &amp; Pay <span className="text-royal-crimson font-black">₹{expectedAmount}</span>
                    </p>
                    <p className="text-stone-600 text-xs mt-0.5 leading-relaxed">
                      Scan the official QR below. Verify payee is <strong className="text-stone-900">{payeeName}</strong>. Pay exact payable amount of ₹{expectedAmount}.
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-white/90 border border-amber-200 shadow-2xs hover:border-amber-300 transition-all">
                <div className="flex items-start gap-3">
                  <span className="w-7 h-7 rounded-xl bg-amber-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0 shadow-xs">
                    3
                  </span>
                  <div>
                    <p className="font-extrabold text-stone-900 text-xs sm:text-sm">Take Screenshot of Receipt</p>
                    <p className="text-stone-600 text-xs mt-0.5 leading-relaxed">
                      Save a screenshot of the successful payment showing the <strong className="text-stone-900">UTR / Transaction ID</strong> and amount.
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 4 */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-white/90 border-2 border-royal-crimson/40 bg-gradient-to-br from-white to-red-50/50 shadow-2xs hover:border-royal-crimson transition-all">
                <div className="flex items-start gap-3">
                  <span className="w-7 h-7 rounded-xl bg-royal-crimson text-white font-extrabold text-xs flex items-center justify-center shrink-0 shadow-xs">
                    4
                  </span>
                  <div>
                    <p className="font-extrabold text-royal-crimson text-xs sm:text-sm">Upload Screenshot Below</p>
                    <p className="text-stone-600 text-xs mt-0.5 leading-relaxed">
                      Click <strong className="text-royal-crimson">"PAYMENT DONE"</strong> below to upload your screenshot for automated pass verification.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Verified Payee Details & Copy Action */}
            <div className="mt-4 pt-3.5 border-t border-amber-200/80 flex flex-wrap items-center justify-between gap-2 bg-white/80 p-3 rounded-2xl border border-amber-200/60 shadow-2xs">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-stone-500 font-medium">Official Payee:</span>
                <strong className="text-stone-900 font-bold">{payeeName}</strong>
                <span className="text-[11px] text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md font-semibold">
                  (Red Hawks Organizer)
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyPayee}
                className="px-3 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-2xs"
                title="Copy Payee Name"
              >
                {copiedPayee ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-amber-700" />
                    <span>Copy Payee Name</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* =========================================================================
              2. OFFICIAL UPI QR CODE DISPLAY (DOWN / BELOW GUIDELINES)
              ========================================================================= */}
          <div className="max-w-md mx-auto mb-8">
            <div className="w-full bg-stone-50/90 rounded-3xl border-2 border-amber-300 p-6 flex flex-col items-center text-center shadow-inner relative">
              
              {/* Payee Info Header */}
              <div className="mb-3">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-[11px] font-extrabold mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                  <span>OFFICIAL ORGANIZER ACCOUNT</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-stone-900 tracking-wide font-festive">
                  {payeeName}
                </h3>
                <p className="text-[11px] text-stone-500 font-semibold">
                  {EVENT_CONFIG.EVENT_ORGANIZER} (Red Hawks)
                </p>
              </div>

              {/* Official QR Code Image with Rich Gold Border */}
              <div className="relative p-2.5 bg-white rounded-2xl border-4 border-[#D4AF37] shadow-lg mb-3">
                <img
                  src={qrImage}
                  alt={`Official UPI QR Code for ${payeeName}`}
                  className="w-56 h-56 sm:w-64 sm:h-64 object-contain rounded-xl mx-auto"
                />
                
                {/* Floating Amount Tag */}
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-royal-crimson text-white rounded-full font-black text-xs sm:text-sm shadow-md border-2 border-amber-300 whitespace-nowrap">
                  PAY EXACT AMOUNT: ₹{expectedAmount}
                </div>
              </div>

              {/* Supported Apps */}
              <div className="mt-4 pt-3 border-t border-stone-200/80 w-full">
                <p className="text-[10px] uppercase font-bold text-stone-400 tracking-wider mb-2">
                  Works with Any UPI App
                </p>
                <div className="flex flex-wrap items-center justify-center gap-1.5 text-xs font-bold text-stone-700">
                  {EVENT_CONFIG.PAYMENT.ACCEPTED_APPS.map((app) => (
                    <span 
                      key={app} 
                      className="px-2.5 py-0.5 rounded-full bg-white border border-stone-200 text-stone-700 shadow-2xs text-[10px]"
                    >
                      {app}
                    </span>
                  ))}
                </div>
              </div>

            </div>
          </div>

          {/* First Stage CTA: "PAYMENT DONE" (If proof section not open) */}
          {!showProofSection && (
            <div className="max-w-md mx-auto space-y-2 mb-4">
              <button
                type="button"
                onClick={handlePaymentDoneClick}
                className="w-full py-4 px-6 rounded-2xl text-base font-extrabold text-white bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-700 hover:to-amber-700 shadow-festive hover:shadow-xl active:scale-[0.99] transition-all flex items-center justify-center gap-2.5 tracking-wide ring-2 ring-amber-300/60"
              >
                <CheckCircle2 className="w-5 h-5 text-amber-200" />
                <span>PAYMENT DONE — UPLOAD RECEIPT</span>
              </button>
              <p className="text-center text-xs text-stone-500">
                Click after transferring ₹{expectedAmount} to upload your payment receipt for verification.
              </p>
            </div>
          )}

          {/* =========================================================================
              3. PAYMENT VERIFICATION PROOF SECTION
              ========================================================================= */}
          {showProofSection && (
            <div 
              ref={proofSectionRef}
              className="mt-8 pt-8 border-t-2 border-dashed border-amber-300 animate-in fade-in slide-in-from-top-4 duration-300"
            >
              <div className="bg-gradient-to-b from-amber-50/70 to-white rounded-3xl border-2 border-amber-300 p-6 sm:p-8 shadow-sm">
                
                <div className="text-center mb-6">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-black uppercase tracking-wider mb-2">
                    <FileCheck className="w-4 h-4 text-royal-crimson" />
                    <span>Step 2 of Payment: Verification</span>
                  </div>
                  <h3 className="text-2xl font-black text-stone-900 font-festive">
                    PAYMENT VERIFICATION
                  </h3>
                  <p className="text-xs sm:text-sm text-stone-600 mt-1 max-w-md mx-auto">
                    Upload your UPI payment screenshot and enter the exact amount paid to confirm your booking and issue your passes.
                  </p>
                </div>

                {/* Upload Screenshot Dropzone / Input */}
                <div className="space-y-4">
                  <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider">
                    Upload Payment Screenshot <span className="text-red-500">*</span>
                  </label>

                  {!screenshotPreview ? (
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-amber-300 hover:border-amber-500 bg-white rounded-2xl p-8 text-center cursor-pointer transition-colors group"
                    >
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        className="hidden"
                      />
                      <div className="w-14 h-14 rounded-2xl bg-amber-50 group-hover:bg-amber-100 text-amber-700 mx-auto flex items-center justify-center mb-3 transition-colors">
                        <Upload className="w-7 h-7" />
                      </div>
                      <p className="font-extrabold text-sm text-stone-800">
                        Click to Upload Screenshot
                      </p>
                      <p className="text-xs text-stone-500 mt-1">
                        Upload receipt from Google Pay, PhonePe, Paytm, or your banking app (PNG, JPG, WebP)
                      </p>
                    </div>
                  ) : (
                    /* Screenshot Preview Card */
                    <div className="bg-white rounded-2xl border-2 border-amber-200 p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-amber-200 bg-stone-100 shrink-0">
                          <img
                            src={screenshotPreview}
                            alt="Payment Receipt Preview"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0 flex-grow">
                          <p className="font-bold text-xs text-stone-900 truncate max-w-[200px] sm:max-w-xs">
                            {screenshotFile?.name}
                          </p>
                          <p className="text-[11px] text-stone-500">
                            {screenshotFile ? (screenshotFile.size / 1024).toFixed(1) : 0} KB &bull; Image Ready
                          </p>
                          <button
                            type="button"
                            onClick={() => setShowPreviewModal(true)}
                            className="text-[11px] text-amber-700 hover:text-amber-900 font-bold hover:underline flex items-center gap-1 mt-0.5"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Preview Image</span>
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-3 py-1.5 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs font-semibold"
                        >
                          Change
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveScreenshot}
                          className="p-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs"
                          title="Remove Screenshot"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileSelect}
                          accept="image/png,image/jpeg,image/jpg,image/webp"
                          className="hidden"
                        />
                      </div>
                    </div>
                  )}

                  {/* Manual Amount Paid Input */}
                  <div className="pt-2">
                    <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                      <span>Amount Paid <span className="text-red-500">*</span></span>
                      <span className="text-[11px] text-stone-500 font-medium">Expected: ₹{expectedAmount}</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-500 font-bold text-base">
                        ₹
                      </div>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder={`${expectedAmount}`}
                        value={enteredAmount}
                        onChange={(e) => setEnteredAmount(e.target.value.replace(/[^0-9]/g, ''))}
                        className="w-full pl-8 pr-4 py-3 bg-white border-2 border-stone-200 rounded-xl text-stone-900 text-base font-bold placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-mono"
                      />
                    </div>
                    <p className="text-[11px] text-stone-500 mt-1">
                      Enter the exact amount paid as visible on your payment receipt screenshot.
                    </p>
                  </div>

                  {/* Form validation warning */}
                  {formError && (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                      <span>{formError}</span>
                    </div>
                  )}

                  {/* Verify Payment Action Button */}
                  <div className="pt-4">
                    <button
                      type="button"
                      disabled={isVerifying}
                      onClick={handleVerifyPayment}
                      className="w-full py-4 rounded-2xl text-base font-extrabold text-white bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-700 hover:to-amber-700 shadow-festive hover:shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2.5 tracking-wide disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isVerifying ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>VERIFYING PAYMENT...</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-5 h-5 text-amber-200" />
                          <span>VERIFY PAYMENT (₹{enteredAmount || expectedAmount})</span>
                        </>
                      )}
                    </button>
                  </div>

                </div>

              </div>
            </div>
          )}

          {/* Footer Back Link */}
          <div className="mt-6 pt-4 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
            <button
              type="button"
              onClick={onBack}
              className="hover:text-stone-900 flex items-center gap-1 font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 px-3 py-1.5 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Review
            </button>
            <span className="text-[11px] text-stone-400">
              Official verification by Red Hawks
            </span>
          </div>

        </div>

      </div>

      {/* =========================================================================
          VERIFYING PAYMENT IN-FLIGHT OVERLAY MODAL (REDESIGNED STEP-CHECKLIST)
          ========================================================================= */}
      <AnimatePresence>
        {isVerifying && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -10 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 text-center shadow-2xl border-2 border-amber-300 relative overflow-hidden"
            >
              {/* Top Accent Gradient Bar */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-600 via-amber-500 to-yellow-400" />

              <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 mx-auto flex items-center justify-center mb-4 border border-amber-200 shadow-2xs">
                <Loader2 className="w-7 h-7 animate-spin text-amber-700" />
              </div>

              <h3 className="text-xl sm:text-2xl font-black text-stone-900 font-festive tracking-wide">
                VERIFYING PAYMENT
              </h3>
              
              <p className="text-xs sm:text-sm text-stone-600 mt-1.5 leading-relaxed">
                We're securely checking your payment receipt with backend 3-way matching.
              </p>

              {/* Real-time Checklist of Verification Steps */}
              <div className="mt-5 p-4 rounded-2xl bg-stone-50 border border-stone-200 text-left space-y-2.5 text-xs">
                <div className="flex items-center gap-2.5 text-emerald-800 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Receipt uploaded &amp; authenticated</span>
                </div>

                <div className="flex items-center gap-2.5 text-stone-700 font-medium">
                  {verifyElapsed >= 1 ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <Loader2 className="w-4 h-4 text-amber-600 animate-spin shrink-0" />
                  )}
                  <span>Verifying receipt details...</span>
                </div>

                <div className="flex items-center gap-2.5 text-stone-700 font-medium">
                  {verifyElapsed >= 2 ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <span className="w-4 h-4 rounded-full border-2 border-stone-300 shrink-0" />
                  )}
                  <span>Matching exact booking amount (₹{expectedAmount})</span>
                </div>
              </div>

              {/* Extended Reassurance Notice if OCR takes >4 seconds */}
              {verifyElapsed >= 4 && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-2.5 rounded-xl bg-amber-50/90 border border-amber-200 text-[11px] text-amber-900 font-medium"
                >
                  ⏳ Still verifying your receipt... This can take a few moments.
                </motion.div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* =========================================================================
          VERIFICATION FAILURE MODAL (THREE-WAY MISMATCH / OCR FAILURE)
          ========================================================================= */}
      <AnimatePresence>
        {verificationError && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 text-center shadow-2xl border-2 border-red-300"
            >
              <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 mx-auto flex items-center justify-center mb-4 border border-red-200">
                <AlertCircle className="w-8 h-8" />
              </div>

              <span className="text-[10px] uppercase font-black tracking-widest text-red-700 bg-red-50 px-3 py-1 rounded-full border border-red-200">
                Verification Failed
              </span>

              <h3 className="text-2xl font-black text-stone-900 font-festive mt-2">
                Payment Verification Failed
              </h3>

              <p className="text-sm text-stone-600 mt-1">
                Payment amount could not be verified.
              </p>

              {/* Three-Way Comparison Details Box */}
              <div className="my-5 p-4 rounded-2xl bg-stone-50 border border-stone-200 text-left space-y-2.5">
                <div className="flex justify-between items-center text-xs font-semibold">
                  <span className="text-stone-500 uppercase tracking-wide">Expected Amount:</span>
                  <span className="font-extrabold text-stone-900 text-sm font-mono">₹{verificationError.expected}</span>
                </div>
                <div className="flex justify-between items-center text-xs font-semibold">
                  <span className="text-stone-500 uppercase tracking-wide">Amount Entered:</span>
                  <span className={`font-extrabold text-sm font-mono ${verificationError.entered === verificationError.expected ? 'text-emerald-700' : 'text-red-600'}`}>
                    ₹{verificationError.entered}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs font-semibold">
                  <span className="text-stone-500 uppercase tracking-wide">Amount Detected:</span>
                  <span className={`font-extrabold text-sm font-mono ${verificationError.detected === verificationError.expected ? 'text-emerald-700' : 'text-red-600'}`}>
                    {typeof verificationError.detected === 'number' ? `₹${verificationError.detected}` : verificationError.detected}
                  </span>
                </div>

                <div className="pt-2 border-t border-stone-200 text-xs text-red-700 font-medium">
                  {verificationError.mismatchReason}
                </div>
              </div>

              <p className="text-xs text-stone-500 mb-6">
                Please upload the correct payment receipt showing the exact amount paid.
              </p>

              <button
                type="button"
                onClick={handleTryAgain}
                className="w-full py-3.5 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 shadow-md transition-all flex items-center justify-center gap-2 text-sm"
              >
                <RefreshCw className="w-4 h-4" />
                <span>TRY AGAIN</span>
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* =========================================================================
          SCREENSHOT PREVIEW MODAL
          ========================================================================= */}
      <AnimatePresence>
        {showPreviewModal && screenshotPreview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="relative max-w-xl w-full bg-white rounded-2xl overflow-hidden shadow-2xl p-4">
              <div className="flex justify-between items-center mb-3 pb-2 border-b border-stone-100">
                <h4 className="font-bold text-sm text-stone-800">Payment Screenshot Preview</h4>
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(false)}
                  className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="max-h-[70vh] overflow-auto rounded-xl bg-stone-900 flex items-center justify-center p-2">
                <img
                  src={screenshotPreview}
                  alt="Receipt Full Preview"
                  className="max-w-full max-h-[65vh] object-contain rounded-lg"
                />
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
