import React, { useState } from 'react';
import { ShieldAlert, ChevronDown, CheckCircle2, AlertCircle } from 'lucide-react';
import { EVENT_CONFIG } from '../../config/eventConfig';

export default function Rules({ onProceedToRegister }) {
  // Allow expanding rules, default first 2 open
  const [expandedRules, setExpandedRules] = useState({ "01": true, "03": true });

  const toggleRule = (id) => {
    setExpandedRules(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  return (
    <section id="rules" className="py-16 md:py-24 bg-festive-50/30 border-b border-amber-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-royal-crimson px-3 py-1 rounded-full bg-red-100/60 mb-3">
            <ShieldAlert className="w-3.5 h-3.5 text-royal-crimson" />
            <span>Essential Guidelines</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-stone-900 font-festive tracking-tight">
            BEFORE YOU REGISTER
          </h2>
          <p className="mt-2 text-stone-600 text-sm sm:text-base">
            Please review the key booking rules and guidelines before starting your group or individual registration.
          </p>
        </div>

        {/* Rules List / Accordion */}
        <div className="mt-12 space-y-4">
          {EVENT_CONFIG.RULES.map((rule) => {
            const isExpanded = !!expandedRules[rule.id];
            return (
              <div
                key={rule.id}
                className="bg-white rounded-2xl border border-amber-200/80 shadow-sm overflow-hidden transition-all duration-200 hover:border-amber-300 hover:shadow-md"
              >
                <button
                  onClick={() => toggleRule(rule.id)}
                  className="w-full text-left p-5 sm:p-6 flex items-center justify-between gap-4 focus:outline-none"
                  aria-expanded={isExpanded}
                >
                  <div className="flex items-center gap-4">
                    {/* Golden Rule Badge */}
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-white font-festive font-extrabold text-sm flex items-center justify-center shrink-0 shadow-sm">
                      {rule.id}
                    </div>
                    <span className="font-bold text-stone-900 text-base sm:text-lg">
                      {rule.title}
                    </span>
                  </div>
                  
                  <div className={`p-2 rounded-full bg-amber-50 text-amber-700 transition-transform duration-200 ${isExpanded ? 'rotate-180 bg-red-50 text-royal-crimson' : ''}`}>
                    <ChevronDown className="w-5 h-5" />
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-6 pb-6 pt-1 text-sm text-stone-600 leading-relaxed border-t border-amber-50 pl-16 sm:pl-20 animate-in fade-in duration-200">
                    <p>{rule.detail}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Quick Registration Callout */}
        <div className="mt-12 p-6 sm:p-8 rounded-2xl bg-white border border-amber-200 shadow-festive flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-stone-900 text-base">Ready to join the Garba celebration?</h4>
              <p className="text-xs sm:text-sm text-stone-500">
                You can add multiple friends or family members in a single easy registration.
              </p>
            </div>
          </div>

          <button
            onClick={onProceedToRegister}
            className="w-full sm:w-auto px-6 py-3 rounded-full text-sm font-extrabold text-white bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-700 hover:to-amber-700 shadow-md hover:shadow-lg transition-all active:scale-95 shrink-0"
          >
            START REGISTRATION
          </button>
        </div>

      </div>
    </section>
  );
}
