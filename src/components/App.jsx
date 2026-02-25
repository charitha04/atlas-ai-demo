import { useState } from 'react';
import { LayoutDashboard, Users, Megaphone, Bell, Car, Menu, X } from 'lucide-react';
import Dashboard from '../pages/Dashboard';
import Customers from '../pages/Customers';
import Campaigns from '../pages/Campaigns';
import { INITIAL_CUSTOMERS, INITIAL_CAMPAIGNS } from '../data/mockData';

const NavItem = ({ id, label, icon, activeTab, onTabChange, onNavigate }) => {
  const IconComponent = icon;
  return (
    <button
      onClick={() => {
        onTabChange(id);
        onNavigate?.();
      }}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
        activeTab === id 
        ? 'bg-primary text-white shadow-md shadow-primary-200' 
        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
      }`}
    >
      <IconComponent size={20} />
      <span className="font-medium">{label}</span>
    </button>
  );
};

const App = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [customers] = useState(INITIAL_CUSTOMERS);
  const [activeCampaigns, setActiveCampaigns] = useState(INITIAL_CAMPAIGNS);
  const [customerFilter, setCustomerFilter] = useState('All');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleAddCampaign = (newCampaign) => {
    setActiveCampaigns([newCampaign, ...activeCampaigns]);
  };

  const handleDashboardClick = (filter) => {
    setCustomerFilter(filter);
    setActiveTab('customers');
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 bg-white border-r border-slate-200 flex flex-col p-4 flex-shrink-0
        transform transition-transform duration-300 ease-in-out
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2 px-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Car className="text-white" size={20} />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-800">Smart Marketing</span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden p-2 hover:bg-slate-100 rounded-lg"
            aria-label="Close menu"
          >
            <X size={20} className="text-slate-600" />
          </button>
        </div>

        <nav className="space-y-2 flex-1">
          <NavItem 
            id="dashboard" 
            label="Dashboard" 
            icon={LayoutDashboard}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onNavigate={() => setMobileMenuOpen(false)}
          />
          <NavItem 
            id="customers" 
            label="Customers" 
            icon={Users}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onNavigate={() => setMobileMenuOpen(false)}
          />
          <NavItem 
            id="campaigns" 
            label="Campaigns" 
            icon={Megaphone}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onNavigate={() => setMobileMenuOpen(false)}
          />
        </nav>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto min-w-0">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-30 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden p-2 hover:bg-slate-100 rounded-lg"
            aria-label="Open menu"
          >
            <Menu size={20} className="text-slate-600" />
          </button>
          <div className="flex items-center gap-4 ml-auto">
             <div className="relative">
               <Bell size={20} className="text-slate-500 hover:text-slate-700 cursor-pointer" />
               <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
             </div>
             
             <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
                <div className="text-right hidden sm:block">
                   <div className="text-sm font-semibold text-slate-800">Sarah Wilson</div>
                   <div className="text-xs text-slate-500 hidden md:block">Marketing Director</div>
                </div>
                <div className="w-10 h-10 rounded-full bg-slate-200 border border-slate-300 overflow-hidden shadow-sm">
                   <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah" alt="User" />
                </div>
             </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-4 sm:p-6 lg:p-8">
          {activeTab === 'dashboard' && <Dashboard customers={customers} onNavigate={handleDashboardClick} />}
          {activeTab === 'customers' && <Customers customers={customers} filter={customerFilter} onFilterChange={setCustomerFilter} />}
          {activeTab === 'campaigns' && <Campaigns 
            customers={customers} 
            activeCampaigns={activeCampaigns} 
            onAddCampaign={handleAddCampaign} 
          />}
        </div>
      </main>
    </div>
  );
};

export default App;

