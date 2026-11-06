import React, { useState } from 'react';
import { X, Calendar, User, Phone, Mail, MessageSquare, CheckCircle, Clock } from 'lucide-react';
import { PropertyData } from '@/types/property';
import { PROJECT_CONFIG } from '@/config/project-config';

interface BookVisitModalProps {
  isOpen: boolean;
  onClose: () => void;
  property: PropertyData | null;
}

export const BookVisitModal: React.FC<BookVisitModalProps> = ({
  isOpen,
  onClose,
  property
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [visitDate, setVisitDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plotNumber: property ? (property.type === 'residential' ? `Plot ${property.plotNumber}` : property.plotNumber) : 'General Masterplan Visit',
          clientName: name,
          clientPhone: phone,
          clientEmail: email,
          visitDate: visitDate || new Date().toISOString(),
          notes
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setIsSuccess(true);
      } else {
        setErrorMessage(data.error || 'Failed to submit booking');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <span>Schedule VIP Site Visit</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {property ? `For ${property.type === 'residential' ? 'Plot ' + property.plotNumber : property.plotNumber}` : PROJECT_CONFIG.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSuccess ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40">
              <CheckCircle className="w-7 h-7" />
            </div>
            <h4 className="text-lg font-bold text-white">Visit Scheduled Successfully!</h4>
            <p className="text-xs text-slate-300 max-w-xs mx-auto">
              Our project sales consultant will contact you at <span className="text-emerald-400 font-semibold">{phone}</span> to confirm your cab pickup or site appointment.
            </p>
            <button
              onClick={onClose}
              className="mt-4 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-3 text-xs">
            {errorMessage && (
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                {errorMessage}
              </div>
            )}

            <div>
              <label className="text-slate-300 font-medium block mb-1">Full Name *</label>
              <div className="relative">
                <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Rajesh Sharma"
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-300 font-medium block mb-1">Phone Number *</label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-300 font-medium block mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="rajesh@example.com"
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-300 font-medium block mb-1">Preferred Visit Date & Time *</label>
              <div className="relative">
                <Clock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type="datetime-local"
                  required
                  value={visitDate}
                  onChange={e => setVisitDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 [color-scheme:dark]"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-300 font-medium block mb-1">Special Notes / Requirements</label>
              <div className="relative">
                <MessageSquare className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <textarea
                  rows={2}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Need cab pickup from airport / interested in East facing corner plot..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all"
            >
              {isSubmitting ? 'Confirming Visit...' : 'Confirm Site Visit Booking'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
