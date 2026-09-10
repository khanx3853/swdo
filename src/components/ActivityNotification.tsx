import React, { useState, useEffect, useMemo } from 'react';
import { Heart, Users, Sparkles, TrendingUp } from 'lucide-react';
import { Donation, Beneficiary } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface ActivityNotificationProps {
  donations: Donation[];
  beneficiaries: Beneficiary[];
}

type ActivityItem = 
  | { type: 'donation'; data: Donation; timestamp: number; uniqueId?: string }
  | { type: 'beneficiary'; data: Beneficiary; timestamp: number; uniqueId?: string };

export const ActivityNotification: React.FC<ActivityNotificationProps> = ({ donations, beneficiaries }) => {
  const [currentIndex, setCurrentIndex] = useState(() => {
    const saved = localStorage.getItem('swdo_notification_index');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [isVisible, setIsVisible] = useState(false);

  const activities = useMemo(() => {
    const donationItems: ActivityItem[] = donations
      .filter((d) => d.Status === 'Approved')
      .sort((a, b) => new Date(b.Date).getTime() - new Date(a.Date).getTime())
      .map(d => ({ type: 'donation', data: d, timestamp: new Date(d.Date).getTime() }));

    const beneficiaryItems: ActivityItem[] = beneficiaries
      .filter((b) => b.Status === 'Allotted')
      .sort((a, b) => new Date(b.Date).getTime() - new Date(a.Date).getTime())
      .map(b => ({ type: 'beneficiary', data: b, timestamp: new Date(b.Date).getTime() }));

    // Specific Pattern: 3 Donators -> 1 Disbursement -> 1 Donator -> 2 Disbursements
    const sequenced: ActivityItem[] = [];
    let dIdx = 0;
    let bIdx = 0;

    const maxItems = Math.max(donationItems.length, beneficiaryItems.length) * 10;
    
    if (donationItems.length > 0 || beneficiaryItems.length > 0) {
      while (sequenced.length < maxItems && sequenced.length < 500) {
        // 1. Up to 3 Donators
        for (let j = 0; j < 3; j++) {
          if (donationItems.length > 0) {
            sequenced.push({ ...donationItems[dIdx % donationItems.length], uniqueId: `d-${dIdx}-${sequenced.length}` });
            dIdx++;
          }
        }
        // 2. Up to 1 Disbursement
        if (beneficiaryItems.length > 0) {
          sequenced.push({ ...beneficiaryItems[bIdx % beneficiaryItems.length], uniqueId: `b-${bIdx}-${sequenced.length}` });
          bIdx++;
        }
        // 3. Up to 1 Donator
        if (donationItems.length > 0) {
          sequenced.push({ ...donationItems[dIdx % donationItems.length], uniqueId: `d-${dIdx}-${sequenced.length}` });
          dIdx++;
        }
        // 4. Up to 2 Disbursements
        for (let j = 0; j < 2; j++) {
          if (beneficiaryItems.length > 0) {
            sequenced.push({ ...beneficiaryItems[bIdx % beneficiaryItems.length], uniqueId: `b-${bIdx}-${sequenced.length}` });
            bIdx++;
          }
        }
      }
    }

    return sequenced;
  }, [donations, beneficiaries]);

  useEffect(() => {
    localStorage.setItem('swdo_notification_index', currentIndex.toString());
  }, [currentIndex]);

  useEffect(() => {
    if (activities.length === 0) return;

    // Safety check for persisted index
    if (currentIndex >= activities.length) {
      setCurrentIndex(0);
      return;
    }

    let timer: NodeJS.Timeout;

    if (isVisible) {
      // Show for 3 seconds
      timer = setTimeout(() => {
        setIsVisible(false);
      }, 3000);
    } else {
      // Break for 2 seconds
      timer = setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % activities.length);
        setIsVisible(true);
      }, 2000);
    }

    return () => clearTimeout(timer);
  }, [isVisible, activities.length, currentIndex]);

  if (activities.length === 0) return null;

  const current = activities[currentIndex];

  const renderContent = () => {
    if (current.type === 'donation') {
      const d = current.data as Donation;
      return (
        <>
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0 border border-emerald-500/20">
              <Heart className="w-6 h-6 fill-current" />
            </div>
            <motion.div 
              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 bg-emerald-500/20 rounded-2xl -z-10"
            />
          </div>
          <div className="flex-1 overflow-hidden">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[9px] uppercase tracking-widest text-emerald-500 font-black bg-emerald-500/10 px-1.5 py-0.5 rounded-md">Donation</span>
              <span className="text-[10px] text-slate-500 font-medium">Approved</span>
            </div>
            <p className="text-sm font-black dark:text-slate-100 text-slate-800 leading-tight truncate">
              {d['Donor Name']}
            </p>
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-3 h-3 text-emerald-500" />
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Donated <span className="text-emerald-500 font-bold">Rs. {d.Amount.toLocaleString()}</span>
              </p>
            </div>
          </div>
        </>
      );
    } else if (current.type === 'beneficiary') {
      const b = current.data as Beneficiary;
      return (
        <>
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-500 flex items-center justify-center shrink-0 border border-blue-500/20">
              <Users className="w-6 h-6" />
            </div>
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              className="absolute -inset-1 border border-dashed border-blue-500/30 rounded-2xl -z-10"
            />
          </div>
          <div className="flex-1 overflow-hidden">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[9px] uppercase tracking-widest text-blue-500 font-black bg-blue-500/10 px-1.5 py-0.5 rounded-md">Relief Aid</span>
              <span className="text-[10px] text-slate-500 font-medium">Disbursed</span>
            </div>
            <p className="text-sm font-black dark:text-slate-100 text-slate-800 leading-tight truncate">
              {b['Beneficiary Name']}
            </p>
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-blue-400" />
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Received <span className="text-blue-500 font-bold">Rs. {b.Amount.toLocaleString()}</span>
              </p>
            </div>
          </div>
        </>
      );
    }
  };

  return (
    <div className="fixed top-24 right-4 z-[60] pointer-events-none">
      <AnimatePresence mode="wait">
        {isVisible && (
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 50, y: 10, rotate: 2 }}
            animate={{ 
              opacity: 1, 
              x: 0, 
              y: 0, 
              rotate: 0,
              transition: {
                type: "spring",
                stiffness: 300,
                damping: 20
              }
            }}
            exit={{ 
              opacity: 0, 
              scale: 0.8, 
              x: -20,
              transition: { duration: 0.2 }
            }}
            className="dark:bg-slate-900/95 bg-white/95 border dark:border-white/10 border-slate-200 backdrop-blur-xl px-4 py-4 rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.2)] flex items-center gap-4 min-w-[280px] max-w-[320px] ring-1 ring-black/5"
          >
            {renderContent()}
            
            {/* Animated Progress Bar */}
            <motion.div 
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 3, ease: "linear" }}
              className={`absolute bottom-0 left-4 right-4 h-0.5 rounded-full ${current.type === 'donation' ? 'bg-emerald-500/30' : 'bg-blue-500/30'}`}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
