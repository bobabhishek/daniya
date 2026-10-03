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
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-300 mb-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Official Admin QR Payment Only</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 font-festive">
          SCAN QR TO PAY
        </h2>
        <p className="mt-1 text-stone-600 text-sm">
          Please scan the organizer's official UPI QR code below using any UPI app to complete your booking.
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-amber-200 shadow-festive overflow-hidden">
        
        {/* Order Summary Ribbon */}
        <div className="bg-gradient-to-r from-amber-50 via-red-50/50 to-amber-50 p-6 border-b border-amber-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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

          {/* Centered Admin QR Box */}
          <div className="bg-stone-50/80 rounded-3xl border-2 border-amber-300 p-6 sm:p-8 flex flex-col items-center text-center shadow-inner">
            
            {/* Payee Info Header */}
            <div className="mb-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-extrabold mb-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                <span>OFFICIAL ORGANIZER ACCOUNT</span>
              </div>
              <h3 className="text-2xl font-black text-stone-900 tracking-wide font-festive">
                {payeeName}
              </h3>
              <p className="text-xs text-stone-500 font-semibold">
                {EVENT_CONFIG.EVENT_ORGANIZER} (Red Hawks)
              </p>
            </div>

            {/* Official QR Code Image */}
            <div className="relative p-3 bg-white rounded-3xl border-4 border-[#D4AF37] shadow-xl group">
              <img
                src={qrImage}
                alt={`Official UPI QR Code for ${payeeName}`}
                className="w-64 h-64 sm:w-72 sm:h-72 object-contain rounded-2xl mx-auto"
              />
              
              {/* Floating Amount Tag */}
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-royal-crimson text-white rounded-full font-black text-sm shadow-md border-2 border-amber-300 whitespace-nowrap">
                PAY EXACT AMOUNT: ₹{expectedAmount}
              </div>
            </div>

            {/* Verified Payee Details & Copy Action */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-2 text-xs">
              <span className="text-stone-500">Payee Name:</span>
              <span className="font-extrabold text-stone-900">{payeeName}</span>
              <button
                type="button"
                onClick={handleCopyPayee}
                className="px-2.5 py-1 rounded-lg bg-white border border-stone-200 hover:bg-stone-100 text-stone-700 font-semibold text-[11px] flex items-center gap-1 transition-colors"
                title="Copy Payee Name"
              >
                {copiedPayee ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span className="text-emerald-700">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 text-stone-400" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            {/* Supported UPI Apps Pills */}
            <div className="mt-4 pt-4 border-t border-stone-200 w-full max-w-md">
              <p className="text-[11px] uppercase font-bold text-stone-400 tracking-wider mb-2">
                Works with Any UPI App
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-bold text-stone-700">
                {EVENT_CONFIG.PAYMENT.ACCEPTED_APPS.map((app) => (
                  <span 
                    key={app} 
                    className="px-3 py-1 rounded-full bg-white border border-stone-200 text-stone-700 shadow-2xs text-[11px]"
                  >
                    {app}
                  </span>
                ))}
              </div>
            </div>

          </div>

          {/* Clean 4-Step Instructions */}
          <div className="my-6 p-4 rounded-2xl bg-amber-50/60 border border-amber-200 text-xs text-amber-950 space-y-2">
            <h5 className="font-extrabold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-amber-700" />
              <span>How to Complete Payment:</span>
            </h5>
            <ol className="list-decimal list-inside space-y-1 text-stone-700 pl-1 leading-relaxed">
              <li>Open <strong>Google Pay</strong>, <strong>PhonePe</strong>, <strong>Paytm</strong>, or any UPI app on your phone.</li>
              <li>Scan the official QR code of <strong>{payeeName}</strong> above.</li>
              <li>Enter the exact amount <strong>₹{expectedAmount}</strong> and complete payment.</li>
              <li>Click the button below to confirm payment and upload your payment screenshot.</li>
            </ol>
          </div>

          {/* First Stage CTA: "PAYMENT DONE" */}
          {!showProofSection ? (
            <div className="space-y-3">
              <button
                type="button"
                onClick={handlePaymentDoneClick}
                className="w-full py-4 rounded-2xl text-base font-extrabold text-white bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-700 hover:to-amber-700 shadow-festive hover:shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2.5 tracking-wide"
              >
                <CheckCircle2 className="w-5 h-5 text-amber-200" />
                <span>PAYMENT DONE</span>
              </button>
              <p className="text-center text-xs text-stone-500">
                Click after transferring ₹{expectedAmount} to upload your payment receipt for verification.
              </p>
            </div>
          ) : (
            /* =========================================================================
               PAYMENT VERIFICATION PROOF SECTION
               ========================================================================= */
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
