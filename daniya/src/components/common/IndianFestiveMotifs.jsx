import React from 'react';

/**
 * Traditional Indian Marigold & Mango Leaves Toran (Bandhanwar)
 * Quintessential Indian festive decoration hung at entrances for auspicious celebrations.
 */
export function ToranGarland({ className = '' }) {
  return (
    <div 
      className={`w-full overflow-hidden select-none pointer-events-none flex items-center justify-center ${className}`}
      aria-hidden="true"
    >
      <svg 
        className="w-full h-4 sm:h-5 text-amber-500" 
        viewBox="0 0 1200 24" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="toranGoldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#b45309" />
            <stop offset="25%" stopColor="#f59e0b" />
            <stop offset="50%" stopColor="#fbbf24" />
            <stop offset="75%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>
          <linearGradient id="marigoldOrange" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ea580c" />
            <stop offset="60%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#fbbf24" />
          </linearGradient>
          <linearGradient id="marigoldYellow" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="60%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#fef08a" />
          </linearGradient>
          <linearGradient id="mangoLeaf" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#15803d" />
            <stop offset="100%" stopColor="#166534" />
          </linearGradient>
        </defs>

        {/* Auspicious golden garland thread */}
        <path d="M0,2 Q30,12 60,2 Q90,12 120,2 Q150,12 180,2 Q210,12 240,2 Q270,12 300,2 Q330,12 360,2 Q390,12 420,2 Q450,12 480,2 Q510,12 540,2 Q570,12 600,2 Q630,12 660,2 Q690,12 720,2 Q750,12 780,2 Q810,12 840,2 Q870,12 900,2 Q930,12 960,2 Q990,12 1020,2 Q1050,12 1080,2 Q1110,12 1140,2 Q1170,12 1200,2" stroke="url(#toranGoldGrad)" strokeWidth="1.5" fill="none" />

        {/* Repeating Festive Motifs: Mango Leaves & Marigolds */}
        {Array.from({ length: 20 }).map((_, i) => {
          const cx = i * 60 + 30;
          return (
            <g key={i}>
              {/* Mango Leaf hanging downwards */}
              <path 
                d={`M${cx},3 C${cx - 4},8 ${cx - 5},15 ${cx},22 C${cx + 5},15 ${cx + 4},8 ${cx},3 Z`} 
                fill="url(#mangoLeaf)" 
                opacity="0.9"
              />
              {/* Marigold flower blossom (Orange outer petals) */}
              <circle cx={cx} cy={7} r={4.5} fill="url(#marigoldOrange)" />
              {/* Inner yellow marigold core */}
              <circle cx={cx} cy={7} r={2.5} fill="url(#marigoldYellow)" />
              {/* Auspicious Golden ghungroo bell drop */}
              <circle cx={cx} cy={17} r={1.6} fill="#f59e0b" stroke="#78350f" strokeWidth="0.5" />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/**
 * Crossed Dandiya Sticks with vibrant bands and ghungroo bells
 */
export function DandiyaSticksIcon({ className = 'w-6 h-6', color = 'currentColor' }) {
  return (
    <svg 
      className={className} 
      viewBox="0 0 32 32" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Stick 1 (Left to Right) */}
      <rect x="4" y="24" width="28" height="3" rx="1.5" transform="rotate(-45 4 24)" fill="url(#dandiyaGrad1)" />
      {/* Stick 2 (Right to Left) */}
      <rect x="24" y="26" width="28" height="3" rx="1.5" transform="rotate(-135 24 26)" fill="url(#dandiyaGrad2)" />
      
      {/* Decorative grip rings on Stick 1 */}
      <circle cx="8" cy="22" r="1.5" fill="#f59e0b" />
      <circle cx="12" cy="18" r="1.5" fill="#dc2626" />
      <circle cx="16" cy="14" r="1.5" fill="#16a34a" />

      {/* Decorative grip rings on Stick 2 */}
      <circle cx="24" cy="22" r="1.5" fill="#f59e0b" />
      <circle cx="20" cy="18" r="1.5" fill="#dc2626" />
      <circle cx="16" cy="14" r="1.5" fill="#f59e0b" />

      {/* Crossing Sparkle / Bell */}
      <circle cx="16" cy="14" r="2.5" fill="#fef08a" stroke="#d97706" strokeWidth="0.8" />
      
      <defs>
        <linearGradient id="dandiyaGrad1" x1="0" y1="0" x2="30" y2="0" gradientUnits="userSpaceOnUse">
          <stop stopColor="#b91c1c" />
          <stop offset="0.5" stopColor="#d97706" />
          <stop offset="1" stopColor="#f59e0b" />
        </linearGradient>
        <linearGradient id="dandiyaGrad2" x1="0" y1="0" x2="30" y2="0" gradientUnits="userSpaceOnUse">
          <stop stopColor="#d97706" />
          <stop offset="0.5" stopColor="#b91c1c" />
          <stop offset="1" stopColor="#e11d48" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/**
 * Auspicious Diya (Indian Oil Lamp) with pulsating warm flame
 */
export function DiyaIcon({ className = 'w-6 h-6' }) {
  return (
    <svg 
      className={className} 
      viewBox="0 0 32 32" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="diyaBase" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#b45309" />
          <stop offset="50%" stopColor="#d97706" />
          <stop offset="100%" stopColor="#78350f" />
        </linearGradient>
        <linearGradient id="diyaFlame" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#ea580c" />
          <stop offset="60%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#fef08a" />
        </linearGradient>
        <filter id="diyaGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" />
        </filter>
      </defs>

      {/* Flame Glow */}
      <circle cx="16" cy="9" r="6" fill="#f59e0b" opacity="0.35" filter="url(#diyaGlow)" />

      {/* Flame */}
      <path 
        d="M16,4 C14,8 12.5,10 12.5,12.5 C12.5,14.5 14,16 16,16 C18,16 19.5,14.5 19.5,12.5 C19.5,10 18,8 16,4 Z" 
        fill="url(#diyaFlame)" 
        className="animate-pulse"
      />
      <circle cx="16" cy="13" r="1.5" fill="#ffffff" opacity="0.9" />

      {/* Clay Lamp Base (Mitti ka Diya) */}
      <path 
        d="M5,17 C5,24 10,27 16,27 C22,27 27,24 27,17 C27,15.5 25,15 23,16 C20,17 18,16 16,16 C14,16 12,17 9,16 C7,15 5,15.5 5,17 Z" 
        fill="url(#diyaBase)" 
      />
      {/* Decorative Diya rim engraving */}
      <path d="M7,18 Q16,21 25,18" stroke="#fbbf24" strokeWidth="1" fill="none" opacity="0.8" />
      {/* Diya Base Stand */}
      <path d="M12,27 L20,27 L18,29 L14,29 Z" fill="#78350f" />
    </svg>
  );
}

/**
 * Traditional Indian Festive Divider with center flower mandala
 */
export function FestiveDivider({ title, subtitle, className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center my-6 ${className}`}>
      <div className="flex items-center gap-3 w-full max-w-md">
        <div className="h-[1.5px] flex-1 bg-gradient-to-r from-transparent via-amber-300 to-amber-500" />
        <div className="flex items-center gap-1.5 text-amber-600">
          <DandiyaSticksIcon className="w-5 h-5 text-amber-600 drop-shadow-xs" />
        </div>
        <div className="h-[1.5px] flex-1 bg-gradient-to-l from-transparent via-amber-300 to-amber-500" />
      </div>
      {title && (
        <span className="font-festive font-bold text-xs uppercase tracking-widest text-amber-800 mt-1">
          {title}
        </span>
      )}
      {subtitle && (
        <span className="text-[11px] text-stone-500 font-display italic">
          {subtitle}
        </span>
      )}
    </div>
  );
}
