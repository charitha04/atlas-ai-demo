import { useState, useRef, useEffect } from 'react';
import { LayoutDashboard, Users, Megaphone, Bell, Sparkles, ChevronsUpDown } from 'lucide-react';
import { Agentation } from 'agentation';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Campaigns from './pages/Campaigns';
import Search from './pages/Search';
import Toast from './components/ui/Toast';
import { ACCOUNT_DATA } from './data/mockData';
import toolboxLogo from './assets/Toolbox Logo.png';
import landoAvatar from './assets/lando.png';
import maxAvatar from './assets/max.png';
import lewisAvatar from './assets/lewis.png';
import toyotaLogo from './assets/toyota.png';
import hondaLogo from './assets/honda.png';
import fordLogo from './assets/ford.png';
import ikonLogo from './assets/ikon_logo.png';

const NavItem = ({ id, label, icon, activeTab, onTabChange }) => {
  const IconComponent = icon;
  const isActive = activeTab === id;
  
  // All states use the same structure/padding to prevent layout shift
  // Background colors:
  // - Default: transparent
  // - Hover: rgba(24,27,30,0.25)
  // - Active (pressed): rgba(24,27,30,0.55)
  // - Active: rgba(24,27,30,0.15)
  // - Active Hover: rgba(24,27,30,0.25)
  
  return (
    <div className="px-4 py-1">
      <button
        onClick={() => onTabChange(id)}
        className={`
          inline-flex items-center gap-3 px-4 py-2 rounded-lg text-white transition-all
          ${isActive 
            ? 'bg-[rgba(24,27,30,0.15)] hover:bg-[rgba(24,27,30,0.25)] active:bg-[rgba(24,27,30,0.55)]' 
            : 'bg-transparent hover:bg-[rgba(24,27,30,0.25)] active:bg-[rgba(24,27,30,0.55)]'
          }
        `}
      >
        <IconComponent size={16} strokeWidth={2} />
        <span className="text-sm font-semibold leading-[19px]">{label}</span>
      </button>
    </div>
  );
};

const ACCOUNTS = [
  { id: 'prestige-toyota', name: 'Prestige Toyota', group: 'Ikon NADA Group', directorName: 'Lando Norris', directorAvatar: landoAvatar, logo: toyotaLogo },
  { id: 'luxury-honda', name: 'Luxury Honda', group: 'Ikon NADA Group', directorName: 'Max Verstappen', directorAvatar: maxAvatar, logo: hondaLogo },
  { id: 'elite-ford', name: 'Elite Ford', group: 'Ikon NADA Group', directorName: 'Lewis Hamilton', directorAvatar: lewisAvatar, logo: fordLogo },
  { id: 'stephen-wade-group', name: 'Stephen Wade Nissan', group: 'Stephen Wade Group', directorName: 'Stephen Wade', directorAvatar: lewisAvatar, logo: ikonLogo },
];

const App = () => {
  const [activeTab, setActiveTab] = useState('search');
  const [selectedAccount, setSelectedAccount] = useState(ACCOUNTS[0]);
  const [customers, setCustomers] = useState(ACCOUNT_DATA[ACCOUNTS[0].id].customers);
  const [activeCampaigns, setActiveCampaigns] = useState(ACCOUNT_DATA[ACCOUNTS[0].id].campaigns);
  const [activityFeed, setActivityFeed] = useState(ACCOUNT_DATA[ACCOUNTS[0].id].activityFeed);
  const [customerFilter, setCustomerFilter] = useState('All');
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const accountDropdownRef = useRef(null);

  const handleAccountSelect = (account) => {
    setSelectedAccount(account);
    setIsAccountDropdownOpen(false);
    // Switch to account-specific data
    const accountData = ACCOUNT_DATA[account.id];
    setCustomers(accountData.customers);
    setActiveCampaigns(accountData.campaigns);
    setActivityFeed(accountData.activityFeed);
    setCustomerFilter('All'); // Reset filter when switching accounts
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (accountDropdownRef.current && !accountDropdownRef.current.contains(event.target)) {
        setIsAccountDropdownOpen(false);
      }
    };

    if (isAccountDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isAccountDropdownOpen]);
  const handleAddCampaign = (newCampaign) => {
    setActiveCampaigns([newCampaign, ...activeCampaigns]);
  };

  const handleLaunchCampaignFromSearch = (campaignData) => {
    // Create a new campaign from the AI recommendation
    const newCampaign = {
      id: Date.now(),
      name: campaignData.name || campaignData.campaignType || 'New Campaign',
      audience: campaignData.audience || 'Custom Audience',
      channel: campaignData.channel || 'Email',
      status: 'Running',
      sent: campaignData.customerCount || 0,
      openRate: '0%',
      potentialRevenue: campaignData.potentialRevenue || 0,
      date: 'Just now'
    };
    
    // Add the campaign to the list
    setActiveCampaigns([newCampaign, ...activeCampaigns]);
    
    // Navigate to campaigns page
    setActiveTab('campaigns');
    
    // Show toast notification
    setToast({
      message: `Campaign "${newCampaign.name}" has been set to running.`,
      type: 'success'
    });
  };

  const handleDashboardClick = (filter) => {
    setCustomerFilter(filter);
    setActiveTab('customers');
  };

  return (
    <>
      {import.meta.env.DEV && <Agentation />}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <div className="flex h-screen bg-surface-page font-sans text-copy-default">
      {/* Sidebar Navigation */}
      <div className="w-[248px] bg-primary border-r border-primary-secondary flex flex-col py-6 flex-shrink-0">
        {/* Logo */}
        <div className="px-4 mb-4">
          <img 
            src={toolboxLogo} 
            alt="Toolbox Logo" 
            className="h-10 w-auto"
          />
        </div>

        {/* Account Selector */}
        <div className="px-3 mb-4 relative" ref={accountDropdownRef}>
          <button 
            onClick={() => setIsAccountDropdownOpen(!isAccountDropdownOpen)}
            className="w-full flex items-center gap-2 pl-2 pr-3 py-2 h-16 rounded-md bg-[rgba(24,27,30,0.15)] text-white hover:bg-[rgba(24,27,30,0.20)] transition-all"
          >
            {/* Account Logo */}
            <div className="w-9 h-9 rounded-md border border-surface-stroke bg-[#fbfbfb] flex-shrink-0 flex items-center justify-center overflow-hidden">
              <img src={selectedAccount.logo} alt={selectedAccount.name} className="w-7 h-7 object-contain" />
            </div>
            <div className="flex flex-col items-start text-left min-w-0 flex-1">
              <span className="text-sm font-semibold leading-[19px] truncate w-full">{selectedAccount.name}</span>
              <span className="text-xs leading-4 text-white/75 truncate w-full">{selectedAccount.group}</span>
            </div>
            <ChevronsUpDown size={18} className="text-white/70 flex-shrink-0" />
          </button>
          
          {/* Account Dropdown */}
          {isAccountDropdownOpen && (
            <div className="absolute left-3 right-3 top-full mt-1 bg-white rounded-md shadow-lg border border-surface-stroke z-50 overflow-hidden">
              {ACCOUNTS.map((account) => (
                <button
                  key={account.id}
                  onClick={() => handleAccountSelect(account)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 transition-colors ${
                    selectedAccount.id === account.id
                      ? 'bg-primary/10 text-primary'
                      : 'text-copy-default hover:bg-surface-page'
                  }`}
                >
                  <div className="w-8 h-8 rounded-md border border-surface-stroke bg-[#fbfbfb] flex-shrink-0 flex items-center justify-center overflow-hidden">
                    <img src={account.logo} alt={account.name} className="w-6 h-6 object-contain" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-semibold">{account.name}</div>
                    <div className="text-xs text-copy-muted">{account.group}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1">
          <NavItem id="search" label="Ask Atlas AI" icon={Sparkles} activeTab={activeTab} onTabChange={setActiveTab} />
          <NavItem id="dashboard" label="Dashboard" icon={LayoutDashboard} activeTab={activeTab} onTabChange={setActiveTab} />
          <NavItem id="customers" label="Customers" icon={Users} activeTab={activeTab} onTabChange={setActiveTab} />
          <NavItem id="campaigns" label="Campaigns" icon={Megaphone} activeTab={activeTab} onTabChange={setActiveTab} />
        </nav>

        {/* Footer Copyright */}
        <div className="px-4 text-center">
          <p className="text-xs leading-4 text-white mb-1">
            ikon Technologies 2026
          </p>
          <p className="text-xs leading-4 text-white">
            All Copyrights Reserved
          </p>
        </div>
      </div>
      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <header className="h-16 bg-surface-container border-b border-surface-stroke sticky top-0 z-20 px-8 flex items-center justify-end">
          <div className="flex items-center gap-4">
             <div className="relative">
               <Bell size={20} className="text-copy-muted hover:text-copy-default cursor-pointer" />
               <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-danger rounded-full border-2 border-white"></span>
             </div>
             
             <div className="flex items-center gap-3 pl-4 border-l border-surface-stroke">
                <div className="text-right hidden md:block">
                   <div className="text-sm font-semibold text-copy-default">{selectedAccount.directorName}</div>
                   <div className="text-xs text-copy-muted">Marketing Director</div>
                </div>
                <div className="w-10 h-10 rounded-full bg-surface-stroke overflow-hidden shadow-card">
                   <img src={selectedAccount.directorAvatar} alt={selectedAccount.directorName} className="w-full h-full object-cover" />
                </div>
             </div>
          </div>
        </header>
        {/* Page Content */}
        <div className={activeTab === 'search' ? '' : 'p-8'}>
          {activeTab === 'search' && <Search customers={customers} selectedAccount={selectedAccount} onLaunchCampaign={handleLaunchCampaignFromSearch} />}
          {activeTab === 'dashboard' && <Dashboard customers={customers} onNavigate={handleDashboardClick} activityFeed={activityFeed} />}
          {activeTab === 'customers' && <Customers customers={customers} filter={customerFilter} onFilterChange={setCustomerFilter} />}
          {activeTab === 'campaigns' && <Campaigns 
            customers={customers} 
            activeCampaigns={activeCampaigns} 
            onAddCampaign={handleAddCampaign}
            onLaunchCampaign={handleLaunchCampaignFromSearch}
          />}
        </div>
      </main>
    </div>
    </>
  );
};
export default App;