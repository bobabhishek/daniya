import React, { useState } from 'react';
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
  ExternalLink,
  Copy,
  Check
} from 'lucide-react';
import { EVENT_CONFIG } from '../../config/eventConfig';

export default function StepPayment({ pricingBreakdown, onPaymentSuccess, onBack, onBackToParticipants }) {
  const [paymentState, setPaymentState] = useState('idle'); // 'idle' | 'processing' | 'verifying' | 'success' | 'failed'
  const [statusMessage, setStatusMessage] = useState('');
  const [utrNumber, setUtrNumber] = useState('');
  const [copiedPayee, setCopiedPayee] = useState(false);

  const payeeName = EVENT_CONFIG.PAYMENT.PAYEE_NAME; // "ARPITH MANOHAR"
  const qrImage = EVENT_CONFIG.PAYMENT.UPI_QR_IMAGE; // "/assets/admin_qr_arpith.jpg"

  const handleCopyPayee = () => {
    navigator.clipboard.writeText(payeeName);
    setCopiedPayee(true);
    setTimeout(() => setCopiedPayee(false), 2000);
  };

  const startPaymentVerification = (forceSuccess = true) => {
    setPaymentState('processing');
    setStatusMessage(`Verifying UPI transfer to ${payeeName}...`);

    // Phase 1: Scanning / connecting
    setTimeout(() => {
      setPaymentState('verifying');
      setStatusMessage('Confirming QR transaction with organizer account...');

      // Phase 2: Verifying
      setTimeout(() => {
        if (forceSuccess) {
          setPaymentState('success');
          setStatusMessage(`Payment of ₹${pricingBreakdown.totalAmount} to ${payeeName} verified successfully!`);
          
          // Phase 3: Transition to tickets after brief celebration
          setTimeout(() => {
            onPaymentSuccess({
              method: `Official UPI QR (${payeeName})`,
              paidAt: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
            });
          }, 1200);
        } else {
          setPaymentState('failed');
          setStatusMessage('Unable to confirm UPI transfer. Please check your transaction reference and try again.');
        }
      }, 1600);
    }, 1400);
  };

  const handleRetry = () => {
    setPaymentState('idle');
    setStatusMessage('');
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
        
        {/* Order Summary Ribbon with Quick Back Link */}
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
              ₹{pricingBreakdown.totalAmount}
            </p>
          </div>
        </div>

        {/* Payment Simulation In-Flight State */}
        {paymentState !== 'idle' ? (
          <div className="p-10 sm:p-14 text-center">
            
            {paymentState === 'processing' && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
                <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 mx-auto flex items-center justify-center animate-spin">
                  <Loader2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-stone-900">Connecting to UPI Network...</h3>
                <p className="text-sm text-stone-500">{statusMessage}</p>
                <div className="w-48 h-1.5 bg-stone-100 rounded-full mx-auto overflow-hidden">
                  <div className="w-full h-full bg-amber-500 rounded-full animate-pulse" />
                </div>
              </motion.div>
            )}

            {paymentState === 'verifying' && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
                <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 mx-auto flex items-center justify-center animate-pulse">
                  <Lock className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-stone-900">Verifying Admin QR Payment...</h3>
                <p className="text-sm text-stone-500">{statusMessage}</p>
              </motion.div>
            )}

            {paymentState === 'success' && (
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
                <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-lg shadow-emerald-200">
                  <CheckCircle2 className="w-12 h-12" />
                </div>
                <h3 className="text-2xl font-extrabold text-emerald-800 font-festive">
                  QR Payment Verified!
                </h3>
                <p className="text-sm text-stone-600 font-medium">{statusMessage}</p>
                <p className="text-xs text-stone-400">Generating your personalized admission tickets...</p>
              </motion.div>
            )}

            {paymentState === 'failed' && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
                <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 mx-auto flex items-center justify-center">
                  <AlertCircle className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-extrabold text-red-800">Payment Verification Failed</h3>
                <p className="text-sm text-stone-600">{statusMessage}</p>
                <div className="pt-4 flex justify-center gap-3">
                  <button
                    onClick={handleRetry}
                    className="px-6 py-2.5 rounded-full text-sm font-bold text-white bg-red-600 hover:bg-red-700 flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Try Again</span>
                  </button>
                  <button
                    onClick={() => startPaymentVerification(true)}
                    className="px-6 py-2.5 rounded-full text-sm font-bold text-stone-700 bg-stone-100 hover:bg-stone-200"
                  >
                    Simulate Confirmed Payment
                  </button>
                </div>
              </motion.div>
            )}

          </div>
        ) : (
          /* OFFICIAL ADMIN QR CODE ONLY PAYMENT VIEW */
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

              {/* The Official QR Code Image */}
              <div className="relative p-3 bg-white rounded-3xl border-4 border-[#D4AF37] shadow-xl group">
                <img
                  src={qrImage}
                  alt={`Official UPI QR Code for ${payeeName}`}
                  className="w-64 h-64 sm:w-72 sm:h-72 object-contain rounded-2xl mx-auto"
                />
                
                {/* Floating Amount Tag */}
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-royal-crimson text-white rounded-full font-black text-sm shadow-md border-2 border-amber-300 whitespace-nowrap">
                  PAY EXACT AMOUNT: ₹{pricingBreakdown.totalAmount}
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

            {/* Quick 3-Step Instructions */}
            <div className="my-6 p-4 rounded-2xl bg-amber-50/60 border border-amber-200 text-xs text-amber-950 space-y-2">
              <h5 className="font-extrabold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-amber-700" />
                <span>How to Complete Payment:</span>
              </h5>
              <ol className="list-decimal list-inside space-y-1 text-stone-700 pl-1 leading-relaxed">
                <li>Open <strong>Google Pay</strong>, <strong>PhonePe</strong>, <strong>Paytm</strong>, or any UPI app on your phone.</li>
                <li>Scan the official QR code of <strong>{payeeName}</strong> above.</li>
                <li>Enter the exact amount <strong>₹{pricingBreakdown.totalAmount}</strong> and complete payment.</li>
                <li>Click the button below to confirm and generate your entry passes.</li>
              </ol>
            </div>

            {/* Optional UTR / Reference ID Input */}
            <div className="mb-6">
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>UPI Reference / UTR Number</span>
                <span className="text-[10px] text-stone-400 font-normal">Optional for instant pass generation</span>
              </label>
              <input
                type="text"
                placeholder="e.g. 428172938491 (from Google Pay / PhonePe receipt)"
                value={utrNumber}
                onChange={(e) => setUtrNumber(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-mono"
              />
            </div>

            {/* Primary Action Button: Confirm QR Payment */}
            <button
              type="button"
              onClick={() => startPaymentVerification(true)}
              className="w-full py-4 rounded-2xl text-base font-extrabold text-white bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-700 hover:to-amber-700 shadow-festive hover:shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2.5 tracking-wide"
            >
              <CheckCircle2 className="w-5 h-5 text-amber-200" />
              <span>I HAVE PAID VIA QR (₹{pricingBreakdown.totalAmount})</span>
            </button>

            {/* Footer Navigation: Back to Review & Back to Edit Details */}
            <div className="mt-5 pt-4 border-t border-stone-100 flex flex-wrap items-center justify-between gap-3 text-xs text-stone-500">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onBack}
                  className="hover:text-stone-900 flex items-center gap-1 font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 px-3 py-1.5 rounded-xl transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Review
                </button>

                {onBackToParticipants && (
                  <button
                    type="button"
                    onClick={onBackToParticipants}
                    className="hover:text-royal-crimson flex items-center gap-1 font-semibold text-stone-600 hover:underline px-2 py-1.5 transition-colors"
                  >
                    <span>← Edit Details (Participants)</span>
                  </button>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-amber-800/70 font-medium">Demo Simulator:</span>
                <button
                  type="button"
                  onClick={() => startPaymentVerification(false)}
                  className="px-2 py-0.5 rounded bg-stone-100 hover:bg-red-50 hover:text-red-700 text-stone-600 text-[10px] font-bold transition-colors"
                  title="Simulate an unverified transaction"
                >
                  Test Fail Flow
                </button>
              </div>
            </div>

          </div>
        )}

      </div>

    </div>
  );
}
