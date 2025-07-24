'use client';

import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { countries, searchCountries, getCountryByCode } from '@/lib/countries';

interface CountrySelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function CountrySelect({
  value,
  onValueChange,
  placeholder = 'Search for a country...',
  disabled = false,
  className,
}: CountrySelectProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [filteredCountries, setFilteredCountries] = useState(countries.slice(0, 10));
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedCountry = value ? getCountryByCode(value) : undefined;

  useEffect(() => {
    if (query.length > 0) {
      const filtered = searchCountries(query).slice(0, 10);
      setFilteredCountries(filtered);
      setIsOpen(true);
    } else {
      setFilteredCountries(countries.slice(0, 10));
      setIsOpen(false);
    }
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (country: { code: string; name: string }) => {
    onValueChange(country.code);
    setQuery(country.name);
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setQuery(inputValue);
    
    // If user clears the input, clear the selection
    if (inputValue === '') {
      onValueChange('');
    }
  };

  const handleClear = () => {
    onValueChange('');
    setQuery('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const displayValue = selectedCountry ? selectedCountry.name : query;

  return (
    <div className={cn('relative', className)}>
      <div className="relative">
        <Input
          ref={inputRef}
          value={displayValue}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          className={selectedCountry ? 'pr-10' : ''}
        />
        
        {selectedCountry && (
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center rounded-full hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            onClick={handleClear}
            disabled={disabled}
            title="Clear selection"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      
      {isOpen && filteredCountries.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-auto"
        >
          {filteredCountries.map((country) => (
            <div
              key={country.code}
              className="px-3 py-2 cursor-pointer hover:bg-accent flex items-center gap-2"
              onClick={() => handleSelect(country)}
            >
              <span className="text-base">{country.flag}</span>
              <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                {country.code}
              </span>
              <span>{country.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}