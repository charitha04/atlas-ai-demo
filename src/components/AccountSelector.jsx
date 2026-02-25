import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Car, Check } from 'lucide-react';

const AccountSelector = ({ accounts, selectedAccountId, onAccountChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const selectedAccount = accounts.find(acc => acc.id === selectedAccountId) || accounts[0];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (accountId) => {
    onAccountChange(accountId);
    setIsOpen(false);
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors text-sm font-medium text-slate-700"
      >
        <Car size={18} className="text-primary flex-shrink-0" />
        <div className="flex-1 text-left min-w-0">
          <div className="font-medium text-slate-800 truncate">{selectedAccount.name}</div>
          <div className="text-xs text-slate-500 truncate">{selectedAccount.location}</div>
        </div>
        <ChevronDown 
          size={16} 
          className={`text-slate-500 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 mt-2 w-full bg-white rounded-lg shadow-lg border border-slate-200 z-50 overflow-hidden">
          <div className="py-1">
            {accounts.map((account) => {
              const isSelected = account.id === selectedAccountId;
              return (
                <button
                  key={account.id}
                  onClick={() => handleSelect(account.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50 transition-colors ${
                    isSelected ? 'bg-primary-50' : ''
                  }`}
                >
                  <div className="flex-1">
                    <div className="text-sm font-medium text-slate-800">{account.name}</div>
                    <div className="text-xs text-slate-500">{account.location}</div>
                  </div>
                  {isSelected && (
                    <Check size={16} className="text-primary flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountSelector;
