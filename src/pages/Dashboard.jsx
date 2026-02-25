import { useState, useMemo } from 'react';
import { Download, Wrench, MapPin, AlertCircle, RefreshCw, Bell, Maximize2 } from 'lucide-react';
import Card from '../components/ui/Card';
import KPIWidget from '../components/ui/KPIWidget';
import SchematicMap from '../components/maps/SchematicMap';

const Dashboard = ({ customers, onNavigate, geofenceData, mapCenter, activityFeed = [] }) => {
  const [mapExpanded, setMapExpanded] = useState(false);

  // Memoize KPI calculations
  const kpis = useMemo(() => ({
    serviceDue: customers.filter(c => c.status === 'Service Due'),
    defectors: customers.filter(c => c.status === 'Active Defector'),
    recalls: customers.filter(c => c.status === 'Open Recall'),
    ownership: customers.filter(c => c.status === 'Service declined'),
  }), [customers]);

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold text-copy-default">Retention Dashboard</h2>
          <p className="text-sm sm:text-base text-copy-muted">Real-time overview of fleet health and opportunities.</p>
        </div>
        <div className="flex gap-2">
           <button className="flex items-center px-3 sm:px-4 py-2 bg-surface-container border border-primary text-primary rounded-button text-xs sm:text-sm font-semibold uppercase tracking-wider hover:bg-primary-50">
             <Download size={16} className="mr-2"/> <span className="hidden sm:inline">Export Report</span><span className="sm:hidden">Export</span>
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KPIWidget 
          title="Service Due" 
          value={kpis.serviceDue.length}
          icon={Wrench}
          color="bg-emerald-500"
          onClick={() => onNavigate('Service Due')}
        />
        <KPIWidget 
          title="Active Defectors" 
          value={kpis.defectors.length}
          icon={MapPin}
          color="bg-red-500"
          onClick={() => onNavigate('Active Defector')}
        />
        <KPIWidget 
          title="Open Recalls" 
          value={kpis.recalls.length}
          icon={AlertCircle}
          color="bg-amber-500"
          onClick={() => onNavigate('Open Recall')}
        />
        <KPIWidget 
          title="Service declined" 
          value={kpis.ownership.length}
          icon={RefreshCw}
          color="bg-primary"
          onClick={() => onNavigate('Service declined')}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 h-[400px] sm:h-[500px] lg:h-[600px]">
        <Card 
          className="lg:col-span-2 flex flex-col overflow-hidden h-full group hover:shadow-lg transition-all"
        >
           <div className="p-3 sm:p-4 border-b border-surface-stroke flex justify-between items-center bg-surface-container z-10">
             <h3 className="text-sm sm:text-base font-semibold text-copy-default flex items-center gap-2"><MapPin size={16} className="sm:w-[18px] sm:h-[18px] text-primary"/> <span className="hidden sm:inline">Map View</span><span className="sm:hidden">Map</span></h3>
             <div className="flex items-center gap-2 sm:gap-3">
               <span className="flex h-2 w-2 relative">
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
               </span>
               <button
                 onClick={() => setMapExpanded(true)}
                 className="p-1 hover:bg-surface-page rounded transition-colors"
                 aria-label="Expand map"
               >
                 <Maximize2 size={14} className="sm:w-4 sm:h-4 text-copy-muted group-hover:text-primary transition-colors" />
               </button>
             </div>
           </div>
           <div className="flex-1 relative min-h-0">
             <SchematicMap 
               customers={customers} 
               hideControls={mapExpanded}
               geofenceData={geofenceData}
               mapCenter={mapCenter}
             />
           </div>
        </Card>

        <Card className="flex flex-col h-full">
          <div className="p-3 sm:p-4 border-b border-surface-stroke bg-surface-page">
            <h3 className="text-sm sm:text-base font-semibold text-copy-default flex items-center gap-2"><Bell size={16} className="sm:w-[18px] sm:h-[18px] text-copy-muted"/> <span className="hidden sm:inline">Live Activity Feed</span><span className="sm:hidden">Activity</span></h3>
          </div>
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
            {activityFeed.map((activity) => (
              <div key={activity.id} className="flex gap-2 sm:gap-3 items-start p-2 sm:p-3 rounded-lg hover:bg-surface-page transition-colors border border-transparent hover:border-surface-stroke">
                <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${activity.urgent ? 'bg-danger animate-pulse' : 'bg-surface-stroke'}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-copy-default leading-snug break-words">{activity.message}</p>
                  <span className="text-xs text-copy-muted mt-1 block">{activity.time}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="p-3 sm:p-4 border-t border-surface-stroke">
            <button className="w-full py-2 text-xs sm:text-sm text-primary font-semibold uppercase tracking-wider hover:bg-primary-50 rounded-button transition-colors">View All Activity</button>
          </div>
        </Card>
      </div>

      {mapExpanded && (
        <div className="fixed inset-0 z-50 bg-copy-default/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 lg:p-8 animate-in fade-in duration-200">
          <div className="bg-surface-container w-full h-full rounded-card overflow-hidden shadow-card relative">
            <SchematicMap 
              customers={customers} 
              isExpanded={true} 
              onClose={() => setMapExpanded(false)}
              geofenceData={geofenceData}
              mapCenter={mapCenter}
            />
            <div className="absolute top-2 sm:top-4 lg:top-6 left-2 sm:left-4 lg:left-6 pointer-events-none">
               <h2 className="text-lg sm:text-2xl lg:text-3xl font-semibold text-copy-default bg-surface-container/90 backdrop-blur px-3 sm:px-4 py-1.5 sm:py-2 rounded-card shadow-card">Network Overview</h2>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;

