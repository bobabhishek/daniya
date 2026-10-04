import React from 'react';
import { Check, Users, FileCheck, CreditCard, Sparkles } from 'lucide-react';
import { DandiyaSticksIcon, DiyaIcon } from '../common/IndianFestiveMotifs';

const STEPS = [
  { id: 1, title: 'PARTICIPANTS', subtitle: 'Add attendees', icon: Users },
  { id: 2, title: 'REVIEW', subtitle: 'Verify details', icon: FileCheck },
  { id: 3, title: 'PAYMENT', subtitle: 'QR & Proof Verification', icon: CreditCard },
  { id: 4, title: 'SUCCESS', subtitle: 'Verified entry passes', icon: Sparkles },
];

export default function ProgressIndicator({ currentStep }) {
  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6">
      <div className="relative flex items-center justify-between">
        
        {/* Background Connecting Line */}
        <div className="absolute left-8 right-8 top-5 h-0.5 bg-amber-200/70 -z-0" />
        
        {/* Active Animated Connecting Line */}
        <div 
          className="absolute left-8 top-5 h-0.5 bg-gradient-to-r from-red-600 via-rose-600 to-amber-500 transition-all duration-500 -z-0"
          style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100 * 0.85}%` }}
        />

        {STEPS.map((step) => {
          const isCompleted = currentStep > step.id;
          const isActive = currentStep === step.id;
          const Icon = step.icon;

          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center">
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 shadow-sm ${
                  isCompleted 
                    ? 'bg-emerald-600 text-white shadow-emerald-200' 
                    : isActive 
                    ? 'bg-gradient-to-br from-red-700 via-rose-600 to-amber-600 text-white ring-4 ring-amber-400/90 shadow-lg scale-110' 
                    : 'bg-white text-stone-400 border-2 border-amber-200/70 shadow-2xs'
                }`}
              >
                {isCompleted ? (
                  <Check className="w-5 h-5 stroke-[2.5]" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </div>

              <div className="mt-2 text-center">
                <span className={`block text-[11px] font-extrabold tracking-wider ${
                  isActive ? 'text-royal-crimson font-festive text-xs' : isCompleted ? 'text-stone-800' : 'text-stone-400'
                }`}>
                  0{step.id} {step.title}
                </span>
                <span className="hidden sm:block text-[10px] text-stone-500 font-medium">
                  {step.subtitle}
                </span>
              </div>
            </div>
          );
        })}

      </div>
    </div>
  );
}
