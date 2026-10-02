import React from 'react';
import { Calendar, Clock, MapPin, Navigation, Music2, Sparkles, Shirt, Award, Gamepad2 } from 'lucide-react';
import { EVENT_CONFIG } from '../../config/eventConfig';

export default function EventDetails({ onRegisterClick }) {
  const detailCards = [
    {
      title: "DATE",
      value: EVENT_CONFIG.DATE,
      subtitle: EVENT_CONFIG.DAY,
      icon: Calendar,
      accent: "from-red-500 to-rose-600",
      bgLight: "bg-red-50/50"
    },
    {
      title: "TIME",
      value: EVENT_CONFIG.TIME,
      subtitle: "Gates Open 4:30 PM",
      icon: Clock,
      accent: "from-amber-500 to-orange-600",
      bgLight: "bg-amber-50/50"
    },
    {
      title: "VENUE",
      value: EVENT_CONFIG.VENUE,
      subtitle: "To Be Announced",
      icon: MapPin,
      accent: "from-yellow-600 to-amber-700",
      bgLight: "bg-yellow-50/50"
    },
    {
      title: "LOCATION",
      value: EVENT_CONFIG.LOCATION,
      subtitle: "To Be Announced",
      icon: Navigation,
      accent: "from-emerald-600 to-teal-700",
      bgLight: "bg-emerald-50/50"
    }
  ];

  const highlights = [
    {
      icon: Music2,
      title: "Live DJs & Non-Stop Garba Beats",
      description: "Sensational live DJs spinning electrifying festival mixes, traditional Gujarati folk songs, and non-stop Garba and Dandiya dance beats."
    },
    {
      icon: Shirt,
      title: "Traditional Attire Celebration",
      description: "Wear your finest Chaniya Cholis, Kediyus, and traditional Kurta sets with mirrors and vibrant embroidery."
    },
    {
      icon: Award,
      title: "Grand Costume & Raas Awards",
      description: "Exciting prizes for Best Garba Steps, Best Traditional Couple, and Best Dressed Group of the night."
    },
    {
      icon: Gamepad2,
      title: "Garba & Dandiya Games with Exciting Prizes",
      description: "Exciting interactive games, festive competitions, and thrilling prizes celebrating the energy and joy of Garba and Dandiya."
    }
  ];

  return (
    <section id="event-details" className="py-16 md:py-24 bg-[#FFFDF9] border-b border-amber-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-amber-700 px-3 py-1 rounded-full bg-amber-100/60 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Grand Experience</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-stone-900 font-festive tracking-tight">
            EVENT DETAILS
          </h2>
          <p className="mt-3 text-stone-600 text-base md:text-lg">
            {EVENT_CONFIG.EVENT_DESCRIPTION}
          </p>
        </div>

        {/* 4 Detail Cards */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {detailCards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <div 
                key={idx}
                className="group relative bg-white p-6 rounded-2xl border border-amber-200 shadow-sm hover:shadow-festive hover:-translate-y-1 transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.accent} flex items-center justify-center text-white shadow-sm group-hover:scale-110 transition-transform`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-extrabold text-stone-400 tracking-widest">
                    {card.title}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-stone-900 group-hover:text-royal-crimson transition-colors">
                  {card.value}
                </h3>
                <p className="mt-1 text-xs text-stone-500 font-medium">
                  {card.subtitle}
                </p>
                <div className="mt-4 pt-3 border-t border-amber-100 flex items-center gap-1.5 text-[11px] font-semibold text-amber-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span>Official Venue Detail</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Event Highlights Grid */}
        <div className="mt-16 bg-gradient-to-br from-amber-50/70 via-orange-50/40 to-red-50/40 p-8 sm:p-10 rounded-3xl border border-amber-200/80">
          <div className="text-center max-w-xl mx-auto mb-8">
            <h3 className="text-xl sm:text-2xl font-bold text-stone-900 font-festive">
              What to Expect at {EVENT_CONFIG.EVENT_NAME}
            </h3>
            <p className="text-xs sm:text-sm text-stone-600 mt-1">
              Specially curated entertainment designed for families, youth, and Dandiya enthusiasts.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {highlights.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div key={idx} className="bg-white/90 backdrop-blur-sm p-5 rounded-2xl border border-amber-200/60 shadow-sm flex flex-col">
                  <div className="w-10 h-10 rounded-xl bg-amber-100/70 text-amber-800 flex items-center justify-center mb-3">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-stone-900 text-sm mb-1">{item.title}</h4>
                  <p className="text-xs text-stone-600 leading-relaxed flex-grow">{item.description}</p>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </section>
  );
}
