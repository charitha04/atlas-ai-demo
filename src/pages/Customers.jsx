import { useState } from 'react';
import { Download, UploadCloud, Search, ArrowLeft, Car, Megaphone, Phone, Mail, History, Navigation, Brain, Flame, X, PhoneCall } from 'lucide-react';
import Card from '../components/ui/Card';
import ScoreBadge from '../components/ui/ScoreBadge';
import RetentionScoreCard from '../components/ui/RetentionScoreCard';
import SingleCustomerMap from '../components/maps/SingleCustomerMap';
import GoodwillWidget from '../components/ui/GoodwillWidget';
import { maskName, maskVin } from '../lib/utils';

// Generate a consistent phone number from customer ID
const generatePhoneFromId = (customerId) => {
  const areaCodes = ['214', '469', '972', '817', '682'];
  // Use customer ID number to seed the generation
  const idNum = parseInt(customerId?.replace(/\D/g, '') || '1000', 10);
  const areaCode = areaCodes[idNum % 5];
  const middle = String(100 + (idNum * 7) % 900).padStart(3, '0');
  const last = String(1000 + (idNum * 13) % 9000).padStart(4, '0');
  return `(${areaCode}) ${middle}-${last}`;
};

const Customers = ({ customers, filter, onFilterChange }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  const filteredCustomers = customers.filter(c => {
    const matchesFilter = filter === 'All' || c.status === filter;
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         c.vehicle.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Helper function to get dynamic column header based on filter
  const getDynamicColumnHeader = () => {
    switch (filter) {
      case 'Service Due':
        return 'Miles Until Service';
      case 'Active Defector':
        return 'Dealership';
      case 'Open Recall':
        return 'Urgency';
      case 'Service declined':
        return 'Date Sold';
      default:
        return 'Additional Info';
    }
  };

  // Helper function to get dynamic column value for a customer
  const getDynamicColumnValue = (customer) => {
    switch (filter) {
      case 'Service Due':
        return customer.milesUntilService !== null 
          ? `${customer.milesUntilService.toLocaleString()} mi`
          : '-';
      case 'Active Defector':
        return customer.defectorDealership || '-';
      case 'Open Recall':
        return customer.recallUrgency || '-';
      case 'Service declined':
        return customer.dateSold || '-';
      default:
        // For "All" filter, show the relevant field based on customer status
        if (customer.milesUntilService !== null) return `${customer.milesUntilService.toLocaleString()} mi`;
        if (customer.defectorDealership) return customer.defectorDealership;
        if (customer.recallUrgency) return customer.recallUrgency;
        if (customer.dateSold) return customer.dateSold;
        return '-';
    }
  };

  // Helper function to render dynamic column cell with appropriate styling
  const renderDynamicColumnCell = (customer) => {
    const value = getDynamicColumnValue(customer);
    
    // Special styling for recall urgency
    if (filter === 'Open Recall' && customer.recallUrgency) {
      const isUrgent = customer.recallUrgency === 'Urgent';
      return (
        <td className="px-6 py-3">
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
            isUrgent ? 'bg-danger-100 text-danger-700' : 'bg-surface-stroke text-copy-muted'
          }`}>
            {value}
          </span>
        </td>
      );
    }
    
    return (
      <td className="px-6 py-3 text-copy-muted">
        {value}
      </td>
    );
  };

  const handleExport = () => {
    if (filteredCustomers.length === 0) {
      alert('No customers to export.');
      return;
    }

    // Define CSV headers
    const headers = [
      'ID',
      'Name',
      'Owner',
      'Vehicle',
      'VIN',
      'Status',
      getDynamicColumnHeader(),
      'Segment',
      'Last Service Date',
      'Next Service Due',
      'Distance (mi)',
      'Mileage',
      'Revenue',
      'Retention Score',
      'Active Campaigns'
    ];

    // Convert customer data to CSV rows
    const rows = filteredCustomers.map(customer => {
      return [
        customer.id,
        customer.name,
        customer.owner,
        customer.vehicle,
        customer.vin,
        customer.status,
        getDynamicColumnValue(customer),
        customer.segment,
        customer.lastServiceDate,
        customer.nextServiceDue,
        customer.distance,
        customer.mileage,
        customer.revenue,
        customer.retentionScore,
        customer.activeCampaigns
      ];
    });

    // Escape CSV values (handle commas, quotes, newlines)
    const escapeCsvValue = (value) => {
      if (value === null || value === undefined) return '';
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    };

    // Build CSV content
    const csvContent = [
      headers.map(escapeCsvValue).join(','),
      ...rows.map(row => row.map(escapeCsvValue).join(','))
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `customers-export-${timestamp}.csv`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePushCDP = () => {
    alert(`Pushing ${filteredCustomers.length} records to Dealer CDP...`);
  };

  if (selectedCustomer) {
    return (
      <div className="space-y-4 sm:space-y-6 animate-in slide-in-from-right duration-300 max-w-5xl mx-auto">
        <button
          onClick={() => setSelectedCustomer(null)}
          className="flex items-center text-copy-muted hover:text-copy-default transition-colors text-sm sm:text-base"
        >
          <ArrowLeft size={18} className="mr-2" /> Back to List
        </button>

        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl sm:text-3xl font-semibold text-copy-default break-words">{maskName(selectedCustomer.name)}</h2>
            <div className="flex flex-wrap items-center gap-2 text-copy-muted mt-1 text-sm">
              <span className="px-2 py-0.5 bg-surface-stroke rounded text-xs sm:text-sm font-medium text-copy-default">{selectedCustomer.id}</span>
              <span>•</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold
                ${selectedCustomer.status === 'Service Due' ? 'bg-success-100 text-success-700' : ''}
                ${selectedCustomer.status === 'Active Defector' ? 'bg-danger-100 text-danger-700' : ''}
                ${selectedCustomer.status === 'Open Recall' ? 'bg-warning-100 text-warning-700' : ''}
                ${selectedCustomer.status === 'Loyal' ? 'bg-primary-100 text-primary-700' : ''}
                ${selectedCustomer.status === 'Service declined' ? 'bg-orange-100 text-orange-700' : ''}
              `}>{selectedCustomer.status}</span>
              {selectedCustomer.isHotLead && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">
                  🔥 Hot Lead
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
             <button className="flex items-center justify-center px-3 sm:px-4 py-2 bg-primary hover:bg-primary-secondary text-white rounded-button shadow-card transition-colors text-sm font-semibold uppercase tracking-wider">
               <Megaphone size={16} className="mr-2"/> Add to Campaign
             </button>
             <button 
               onClick={() => setIsContactModalOpen(true)}
               className="flex items-center justify-center px-3 sm:px-4 py-2 bg-surface-container border border-primary text-primary rounded-button shadow-card hover:bg-primary-50 transition-colors text-sm font-semibold uppercase tracking-wider"
             >
               <Phone size={16} className="mr-2"/> Contact
             </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            <Card className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              <h3 className="font-semibold text-base sm:text-lg flex items-center gap-2">
                <Car size={18} className="sm:w-5 sm:h-5 text-primary"/> Vehicle Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-4 sm:gap-x-8">
                <div>
                   <p className="text-sm text-copy-muted">Vehicle</p>
                   <p className="font-medium text-copy-default">{selectedCustomer.vehicle}</p>
                </div>
                <div>
                   <p className="text-sm text-copy-muted">VIN</p>
                   <p className="font-medium text-copy-default">{maskVin(selectedCustomer.vin)}</p>
                </div>
                <div>
                   <p className="text-sm text-copy-muted">Current Mileage</p>
                   <p className="font-medium text-copy-default text-xl">{selectedCustomer.mileage.toLocaleString()} <span className="text-sm font-normal text-copy-muted">mi</span></p>
                </div>
                <div>
                   <p className="text-sm text-copy-muted">Next Service Due</p>
                   <p className="font-medium text-success">{selectedCustomer.nextServiceDue}</p>
                </div>
              </div>

              <div className="pt-4 sm:pt-6 border-t border-surface-stroke">
                 <h3 className="font-semibold text-base sm:text-lg text-copy-default flex items-center gap-2 mb-3 sm:mb-4">
                  <History size={18} className="sm:w-5 sm:h-5 text-primary"/> Service History
                 </h3>
                 <div className="overflow-x-auto -mx-4 sm:mx-0">
                   <div className="inline-block min-w-full align-middle px-4 sm:px-0">
                     <div className="overflow-hidden rounded-button border border-surface-stroke">
                       <table className="w-full text-xs sm:text-sm text-left">
                         <thead className="bg-surface-page text-copy-muted font-medium">
                           <tr>
                             <th className="px-3 sm:px-4 py-2">Date</th>
                             <th className="px-3 sm:px-4 py-2">Service</th>
                             <th className="px-3 sm:px-4 py-2">Mileage</th>
                           </tr>
                         </thead>
                         <tbody className="divide-y divide-surface-stroke">
                           {selectedCustomer.serviceHistory.map(s => (
                             <tr key={s.id} className="bg-surface-container">
                               <td className="px-3 sm:px-4 py-2 text-copy-muted">{s.date}</td>
                               <td className="px-3 sm:px-4 py-2 font-medium text-copy-default">{s.type}</td>
                               <td className="px-3 sm:px-4 py-2 text-copy-muted">{s.mileage.toLocaleString()}</td>
                             </tr>
                           ))}
                         </tbody>
                       </table>
                     </div>
                   </div>
                 </div>
              </div>
            </Card>

            <Card className="overflow-hidden">
              <div className="p-3 border-b border-surface-stroke flex items-center justify-between bg-surface-page">
                <h3 className="font-semibold text-sm text-copy-default flex items-center gap-2">
                   <Navigation size={16} className="text-primary"/> Map
                </h3>
              </div>
              <div className="p-1">
                 <SingleCustomerMap customer={selectedCustomer} />
              </div>
            </Card>
          </div>

          <div className="space-y-4 sm:space-y-6">
             <RetentionScoreCard customer={selectedCustomer} />

             <GoodwillWidget goodwill={selectedCustomer.goodwill} />

             <Card className="p-4 sm:p-6">
                <h3 className="font-semibold text-base sm:text-lg text-copy-default flex items-center gap-2 mb-3 sm:mb-4">
                 <Megaphone size={18} className="sm:w-5 sm:h-5 text-orange-500"/> Active Campaigns
               </h3>
               {selectedCustomer.activeCampaigns > 0 ? (
                 <div className="space-y-3">
                   {Array.from({length: selectedCustomer.activeCampaigns}).map((_, i) => (
                      <div key={i} className="flex items-center gap-3 p-2 bg-orange-50 rounded-button border border-orange-100">
                        <div className="w-8 h-8 rounded-full bg-orange-200 flex items-center justify-center text-orange-700">
                          <Mail size={14} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-copy-default">Seasonal Service {i+1}</p>
                          <p className="text-xs text-copy-muted">Sent 2 days ago</p>
                        </div>
                      </div>
                   ))}
                 </div>
               ) : (
                 <div className="text-center py-6 text-copy-muted bg-surface-page rounded-button border border-dashed border-surface-stroke">
                   No active campaigns
                 </div>
               )}
             </Card>
          </div>
        </div>

        {/* Contact Modal */}
        {isContactModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setIsContactModalOpen(false)}
            />
            
            {/* Modal */}
            <div className="relative bg-surface-container rounded-lg shadow-xl w-full max-w-md mx-4 animate-in zoom-in-95 duration-200">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-surface-stroke">
                <h3 className="text-lg font-semibold text-copy-default">Contact Customer</h3>
                <button 
                  onClick={() => setIsContactModalOpen(false)}
                  className="p-1 rounded-full hover:bg-surface-stroke transition-colors"
                >
                  <X size={20} className="text-copy-muted" />
                </button>
              </div>
              
              {/* Content */}
              <div className="p-4">
                <div className="flex items-center justify-between p-4 bg-surface-page rounded-lg border border-surface-stroke">
                  <p className="text-lg font-semibold text-copy-default">
                    {selectedCustomer.phone || generatePhoneFromId(selectedCustomer.id)}
                  </p>
                  <a
                    href={`tel:${(selectedCustomer.phone || generatePhoneFromId(selectedCustomer.id)).replace(/[^\d]/g, '')}`}
                    className="flex items-center justify-center w-12 h-12 bg-success hover:bg-success-600 text-white rounded-full shadow-card transition-colors"
                  >
                    <PhoneCall size={22} />
                  </a>
                </div>
                
                <p className="mt-4 text-sm text-copy-muted text-center">
                  Click the call button to initiate a call to {maskName(selectedCustomer.name)}
                </p>
              </div>
              
              {/* Footer */}
              <div className="flex justify-end p-4 border-t border-surface-stroke">
                <button 
                  onClick={() => setIsContactModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-copy-muted hover:text-copy-default transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-500">
       <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold text-copy-default">Customer Management</h2>
          <p className="text-sm sm:text-base text-copy-muted">Segment, filter, and sync customer lists.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
           <button onClick={handleExport} className="flex items-center justify-center px-3 sm:px-4 py-2 bg-surface-container border border-primary text-primary rounded-button text-xs sm:text-sm font-semibold uppercase tracking-wider hover:bg-primary-50 shadow-card">
             <Download size={16} className="mr-2"/> <span>Export CSV</span>
           </button>
           <button onClick={handlePushCDP} className="flex items-center justify-center px-3 sm:px-4 py-2 bg-primary hover:bg-primary-secondary text-white rounded-button text-xs sm:text-sm font-semibold uppercase tracking-wider shadow-card">
             <UploadCloud size={16} className="mr-2"/> <span>Push to CDP</span>
           </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-[400px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-copy-muted" size={16} />
        <input
          type="text"
          placeholder="Search customers or VIN..."
          className="w-full pl-9 pr-4 py-2.5 rounded-input border border-surface-stroke text-sm text-copy-default placeholder:text-copy-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-surface-container"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Status Tabs */}
      <div className="flex gap-2 border-b border-surface-stroke overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
        {['All', 'Service Due', 'Active Defector', 'Open Recall', 'Ownership Change'].map(f => (
          <button
            key={f}
            onClick={() => onFilterChange(f)}
            className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
              filter === f
                ? 'border-primary text-primary'
                : 'border-transparent text-copy-muted hover:text-copy-default hover:border-surface-stroke'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <Card className="overflow-hidden">

        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-page text-copy-muted font-medium border-b border-surface-stroke">
              <tr>
                <th className="px-4 lg:px-6 py-3">Customer Name</th>
                <th className="px-4 lg:px-6 py-3">Vehicle</th>
                <th className="px-4 lg:px-6 py-3">Status</th>
                <th className="px-4 lg:px-6 py-3">{getDynamicColumnHeader()}</th>
                <th className="px-4 lg:px-6 py-3 text-center">Active Cmp</th>
                <th className="px-4 lg:px-6 py-3">
                  <div className="flex items-center gap-2">
                    <Brain size={16} className="text-copy-muted" />
                    <span>Retention Score<sup className="text-[10px] ml-0.5">TM</sup></span>
                  </div>
                </th>
                <th className="px-4 lg:px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-stroke">
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => setSelectedCustomer(c)}
                    className="hover:bg-primary-50/50 transition-colors group cursor-pointer"
                  >
                    <td className="px-4 lg:px-6 py-3 font-medium text-copy-default">
                      <div className="flex items-center gap-2">
                        <span>{maskName(c.name)}</span>
                        {c.isHotLead && (
                          <Flame size={16} className="text-red-500 flex-shrink-0" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 lg:px-6 py-3 text-copy-muted flex items-center gap-2">
                      <Car size={14} className="text-copy-muted"/> {c.vehicle}
                    </td>
                    <td className="px-4 lg:px-6 py-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                        ${c.status === 'Service Due' ? 'bg-success-100 text-success-700' : ''}
                        ${c.status === 'Active Defector' ? 'bg-danger-100 text-danger-700' : ''}
                        ${c.status === 'Open Recall' ? 'bg-warning-100 text-warning-700' : ''}
                        ${c.status === 'Loyal' ? 'bg-primary-100 text-primary-700' : ''}
                        ${c.status === 'Service declined' ? 'bg-orange-100 text-orange-700' : ''}
                      `}>
                        {c.status}
                      </span>
                    </td>
                    {renderDynamicColumnCell(c)}
                    <td className="px-4 lg:px-6 py-3 text-center">
                       {c.activeCampaigns > 0 ? (
                         <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-surface-stroke text-xs font-semibold text-copy-muted">
                           {c.activeCampaigns}
                         </span>
                       ) : (
                         <span className="text-copy-subtle">-</span>
                       )}
                    </td>
                    <td className="px-4 lg:px-6 py-3">
                      <ScoreBadge score={c.retentionScore} showValueAdjusted={true} ltvTier={c.ltvTier} />
                    </td>
                    <td className="px-4 lg:px-6 py-3 text-right">
                      <button className="text-primary font-medium text-xs hover:underline opacity-0 group-hover:opacity-100 transition-opacity">
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-copy-muted">
                    No customers found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="lg:hidden divide-y divide-surface-stroke">
          {filteredCustomers.length > 0 ? (
            filteredCustomers.map((c) => (
              <div
                key={c.id}
                onClick={() => setSelectedCustomer(c)}
                className="p-4 hover:bg-primary-50/50 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-copy-default truncate flex items-center gap-2">
                      <span className="truncate">{maskName(c.name)}</span>
                      {c.isHotLead && (
                        <Flame size={16} className="text-danger flex-shrink-0" />
                      )}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 text-sm text-copy-muted">
                      <Car size={14} className="text-copy-muted flex-shrink-0"/>
                      <span className="truncate">{c.vehicle}</span>
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ml-2
                    ${c.status === 'Service Due' ? 'bg-success-100 text-success-700' : ''}
                    ${c.status === 'Active Defector' ? 'bg-danger-100 text-danger-700' : ''}
                    ${c.status === 'Open Recall' ? 'bg-warning-100 text-warning-700' : ''}
                    ${c.status === 'Loyal' ? 'bg-primary-100 text-primary-700' : ''}
                    ${c.status === 'Service declined' ? 'bg-orange-100 text-orange-700' : ''}
                  `}>
                    {c.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-copy-muted mb-1">{getDynamicColumnHeader()}</p>
                    <p className="text-copy-default font-medium">{getDynamicColumnValue(c)}</p>
                  </div>
                  <div>
                    <div className="text-xs text-copy-muted mb-1">
                      <div className="flex items-center gap-1">
                        <Brain size={12} className="text-copy-muted" />
                        <span>Retention Score<sup className="text-[8px] ml-0.5">TM</sup></span>
                      </div>
                    </div>
                    <ScoreBadge score={c.retentionScore} showValueAdjusted={true} ltvTier={c.ltvTier} />
                  </div>
                  {c.activeCampaigns > 0 && (
                    <div>
                      <p className="text-xs text-copy-muted mb-1">Active Campaigns</p>
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-surface-stroke text-xs font-semibold text-copy-muted">
                        {c.activeCampaigns}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="px-6 py-12 text-center text-copy-muted">
              No customers found matching your filters.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default Customers;

