import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { COUNTRY_CODES } from '../utils/countries';

interface CountrySelectProps {
  value: string;
  onChange: (code: string) => void;
  className?: string;
  style?: React.CSSProperties;
  label?: string;
}

export const CountrySelect: React.FC<CountrySelectProps> = ({ value, onChange, className, style, label }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selectedCountry = COUNTRY_CODES.find(c => c.code === value) || COUNTRY_CODES.find(c => c.code === '+92');

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredCountries = COUNTRY_CODES.filter(
    c => c.name.toLowerCase().includes(search.toLowerCase()) || c.code.includes(search)
  );

  return (
    <div ref={wrapperRef} className={`relative ${className || ''}`} style={style}>
      <div 
        className="flex items-center justify-between w-full h-full px-2 cursor-pointer relative"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) setSearch('');
        }}
      >
        <div className="flex items-center gap-1.5 overflow-hidden w-full pl-1">
          <span className="text-sm -mt-0.5" aria-hidden="true">{selectedCountry?.emoji}</span>
          <span className="text-xs font-mono font-bold text-emerald-500">{selectedCountry?.code}</span>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-slate-900 border border-purple-500/30 rounded-xl shadow-xl shadow-black/50 z-[100] overflow-hidden">
          <div className="p-2 border-b border-purple-500/20 relative bg-slate-900">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-4 top-4" />
            <input 
              type="text"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search country or code..."
              className="w-full bg-slate-950/50 border border-purple-500/30 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
          <div className="max-h-56 overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-purple-500/30 scrollbar-track-transparent">
            {filteredCountries.map(c => (
              <div 
                key={`${c.iso}-${c.code}`}
                className={`flex items-center gap-2 px-3 py-2 text-xs cursor-pointer rounded-lg hover:bg-emerald-500/20 transition-colors ${value === c.code ? 'bg-emerald-500/10 text-emerald-400' : 'text-slate-200'}`}
                onClick={() => {
                  onChange(c.code);
                  setIsOpen(false);
                  setSearch('');
                }}
              >
                <span className="text-base leading-none">{c.emoji}</span>
                <span className="font-mono w-11 text-emerald-500/80">{c.code}</span>
                <span className="truncate flex-1">{c.name}</span>
              </div>
            ))}
            {filteredCountries.length === 0 && (
              <div className="text-center p-3 text-xs text-slate-500">No countries found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
