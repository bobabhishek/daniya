import { ShieldCheck, Heart, Sparkles, MapPin, Calendar, Clock, Ticket } from 'lucide-react';
import { EVENT_CONFIG } from '../../config/eventConfig';
import { useAuth } from '../../context/AuthContext';

export default function Footer({ onNavigate, onOpenAdmin, onOpenMyTickets }) {
  const { user, isAdmin } = useAuth();

  return (
    <footer className="bg-stone-900 text-stone-300 border-t-2 border-amber-500/40 pt-14 pb-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-12 border-b border-stone-800">
          
          {/* Brand Col */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-1 bg-white rounded-xl border border-amber-300">
                <img 
                  src={EVENT_CONFIG.ASSETS.LOGO} 
                  alt={EVENT_CONFIG.EVENT_NAME}
                  className="h-10 w-auto object-contain"
                />
              </div>
              <div>
                <span className="font-festive font-extrabold text-xl text-white block">
                  {EVENT_CONFIG.EVENT_NAME}
                </span>
                <span className="text-xs text-amber-400 font-semibold tracking-wider uppercase">
                  {EVENT_CONFIG.EVENT_EDITION}
                </span>
              </div>
            </div>

            <p className="text-xs text-stone-400 max-w-md leading-relaxed">
              Official ticketing and registration platform for Karkala's most anticipated Navratri Garba and Dandiya night. Presented by {EVENT_CONFIG.EVENT_ORGANIZER}.
            </p>

            <div className="flex items-center gap-3 text-xs text-amber-300/80">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                {EVENT_CONFIG.DATE}
              </span>
              <span>&bull;</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                {EVENT_CONFIG.TIME}
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold uppercase tracking-widest text-amber-400">
              Navigation
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button onClick={() => onNavigate('home')} className="hover:text-white transition-colors">
                  Home
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('event-details')} className="hover:text-white transition-colors">
                  Event Details
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('rules')} className="hover:text-white transition-colors">
                  Rules &amp; Guidelines
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('register')} className="text-amber-400 font-bold hover:underline flex items-center gap-1">
                  <Ticket className="w-3.5 h-3.5" />
                  <span>Book Entry Passes</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Venue & Organizer Access */}
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold uppercase tracking-widest text-amber-400">
              Venue Location
            </h4>
            <p className="text-xs text-stone-400 leading-relaxed">
              {EVENT_CONFIG.VENUE}<br />
              {EVENT_CONFIG.LOCATION}
            </p>
            <a
              href={EVENT_CONFIG.MAP_LINK}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-300 hover:text-amber-200 transition-colors"
            >
              <MapPin className="w-3.5 h-3.5" />
              Open Location
            </a>

            <div className="pt-2">
              {user && !isAdmin && (
                <button
                  onClick={onOpenMyTickets}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-amber-300 text-xs font-semibold border border-stone-700 transition-colors"
                >
                  <Ticket className="w-3.5 h-3.5 text-amber-400" />
                  <span>My Passes &amp; Bookings</span>
                </button>
              )}
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-500 gap-4">
          <p>
            &copy; 2026 {EVENT_CONFIG.EVENT_NAME}. All rights reserved.
          </p>
          <p className="flex items-center gap-1">
            <span>Crafted with</span>
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
            <span>for Dandiya Lovers</span>
          </p>
        </div>

      </div>
    </footer>
  );
}
