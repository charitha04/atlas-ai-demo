import { Car } from 'lucide-react';

const SingleCustomerMap = ({ customer }) => {
  const dealerPos = { x: 50, y: 50 };
  const compAPos = { x: 20, y: 30 };
  const compBPos = { x: 85, y: 80 };

  const getDist = (p1, p2) => Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
  
  const distToDealer = getDist(customer.coordinates, dealerPos);
  const distToCompA = getDist(customer.coordinates, compAPos);
  const distToCompB = getDist(customer.coordinates, compBPos);

  const nearestComp = distToCompA < distToCompB ? { name: 'Competitor A', pos: compAPos, dist: distToCompA } : { name: 'Competitor B', pos: compBPos, dist: distToCompB };

  const isAtRisk = nearestComp.dist < distToDealer;
  const riskLabel = isAtRisk 
    ? `Risk: Potential Defector to ${nearestComp.name}` 
    : "Likely to Return";
    
  const badgeColor = isAtRisk ? "bg-danger" : "bg-success";

  return (
    <div className="relative w-full h-64 bg-surface-page overflow-hidden rounded-card border border-surface-stroke">
       <div className="absolute top-4 left-4 z-10 bg-surface-container/90 backdrop-blur px-3 py-2 rounded-button border border-surface-stroke shadow-card">
         <h4 className="text-xs font-semibold text-copy-muted uppercase mb-1">Analysis</h4>
         <div className="flex flex-col gap-1 text-xs">
            <div className="flex items-center justify-between gap-4">
               <span className="text-primary font-medium">My Dealership</span>
               <span className="font-semibold text-copy-default">{customer.distance}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
               <span className="text-danger-700 font-medium">{nearestComp.name}</span>
               <span className="font-semibold text-copy-default">{(customer.distanceRaw * (nearestComp.dist / distToDealer)).toFixed(1)} mi</span>
            </div>
         </div>
       </div>
       {/* Background & Grid */}
       <div className="absolute inset-0 opacity-10" 
           style={{ backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
      </div>

       <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-primary/10 rounded-full border border-primary/30 flex items-center justify-center">
          <div className="w-3 h-3 bg-primary rounded-full shadow-sm"></div>
       </div>

       <div 
          className="absolute w-8 h-8 -ml-4 -mt-4 bg-slate-800 rounded-full border-2 border-white shadow-lg flex items-center justify-center z-20 transition-all duration-1000"
          style={{ left: `${customer.coordinates.x}%`, top: `${customer.coordinates.y}%` }}
       >
         <Car size={16} className="text-white" />
         <div className={`absolute -bottom-8 ${badgeColor} text-white text-[10px] px-2 py-0.5 rounded whitespace-nowrap font-medium shadow-sm`}>
           {riskLabel}
         </div>
       </div>
    </div>
  );
};

export default SingleCustomerMap;
