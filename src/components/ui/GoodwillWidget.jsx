import { useState } from 'react';
import { Gift, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { cn } from '../../lib/utils';

const GoodwillWidget = ({ goodwill }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Default to UNKNOWN if not provided
  const status = goodwill?.status || 'UNKNOWN';
  const score = goodwill?.score ?? null;
  const reasons = goodwill?.reasons || [];
  const lastCalculatedAt = goodwill?.lastCalculatedAt;

  // Status configuration
  const statusConfig = {
    HIGH: {
      label: 'High',
      badgeColor: 'bg-success-100 text-success-700',
      meterColor: 'bg-success',
      meaning: 'Eligible for discretionary perks',
      guidance: 'Goodwill discount is appropriate if it closes the booking.',
      iconColor: 'text-success'
    },
    MEDIUM: {
      label: 'Medium',
      badgeColor: 'bg-warning-100 text-warning-700',
      meterColor: 'bg-warning',
      meaning: 'Eligible with advisor discretion',
      guidance: 'Use goodwill only if needed; consider smaller perk first.',
      iconColor: 'text-warning'
    },
    LOW: {
      label: 'Low',
      badgeColor: 'bg-danger-100 text-danger-700',
      meterColor: 'bg-danger',
      meaning: 'Not eligible for goodwill perks',
      guidance: 'Avoid goodwill discounts; use standard reminders/offers.',
      iconColor: 'text-danger'
    },
    UNKNOWN: {
      label: 'Unknown',
      badgeColor: 'bg-surface-stroke text-copy-muted',
      meterColor: 'bg-surface-stroke',
      meaning: 'Insufficient history to determine',
      guidance: 'Needs at least one paid service visit to assess goodwill.',
      iconColor: 'text-copy-muted'
    }
  };

  const config = statusConfig[status] || statusConfig.UNKNOWN;

  // Calculate meter fill percentage based on status
  const getMeterFill = () => {
    if (status === 'UNKNOWN') return 0;
    if (score !== null && score !== undefined) return Math.min(100, Math.max(0, score));
    // Default fill based on status
    if (status === 'HIGH') return 100;
    if (status === 'MEDIUM') return 50;
    if (status === 'LOW') return 25;
    return 0;
  };

  const meterFill = getMeterFill();

  // Format last calculated timestamp
  const formatLastUpdated = () => {
    if (!lastCalculatedAt) return null;
    
    try {
      const date = new Date(lastCalculatedAt);
      const now = new Date();
      const diffMs = now - date;
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return '1 day ago';
      return `${diffDays} days ago`;
    } catch {
      return null;
    }
  };

  const lastUpdated = formatLastUpdated();

  return (
    <div className="bg-surface-container rounded-card shadow-card border border-surface-stroke">
      <div
        className="p-4 sm:p-6 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsExpanded(!isExpanded);
          }
        }}
        aria-expanded={isExpanded}
        aria-label={`Goodwill status: ${config.label}. ${config.meaning}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h3 className="font-semibold text-base sm:text-lg text-copy-default flex items-center gap-2">
            <Gift size={18} className={cn("sm:w-5 sm:h-5", config.iconColor)} />
            Goodwill
          </h3>
          <button
            className="text-copy-muted hover:text-copy-default transition-colors"
            aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
          >
            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>

        {/* Status Badge */}
        <div className="mb-3">
          <span className={cn(
            "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold",
            config.badgeColor
          )}>
            {config.label}
          </span>
        </div>

        {/* Meter Visualization - 3-segment meter */}
        <div className="mb-3">
          <div className="flex items-center gap-1 mb-2">
            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden relative">
              {/* Segment labels */}
              <div className="absolute inset-0 flex">
                <div className="flex-1 border-r border-slate-200"></div>
                <div className="flex-1 border-r border-slate-200"></div>
                <div className="flex-1"></div>
              </div>
              {/* Fill */}
              {status !== 'UNKNOWN' && (
                <div 
                  className={cn("h-full transition-all duration-500", config.meterColor)}
                  style={{ width: `${meterFill}%` }}
                />
              )}
            </div>
          </div>
          <div className="flex justify-between text-[10px] text-copy-muted mb-1">
            <span>Low</span>
            <span>Medium</span>
            <span>High</span>
          </div>
        </div>

        {/* One-line meaning */}
        <div className="text-sm text-copy-muted mb-2">
          {config.meaning}
        </div>

        {/* Last updated */}
        {lastUpdated && (
          <div className="text-xs text-copy-muted">
            Updated: {lastUpdated}
          </div>
        )}
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 sm:px-6 pb-4 sm:pb-6 border-t border-slate-100 pt-4 space-y-4">
          {/* Why this status */}
          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-2">Why this status</h4>
            {status === 'UNKNOWN' ? (
              <p className="text-sm text-slate-600">
                Needs at least one paid service visit to assess goodwill.
              </p>
            ) : reasons.length > 0 ? (
              <ul className="space-y-1.5">
                {reasons.map((reason, index) => (
                  <li key={index} className="text-sm text-slate-600 flex items-start gap-2">
                    <span className="text-slate-400 mt-0.5">•</span>
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-600">No additional details available.</p>
            )}
          </div>

          {/* Guidance */}
          <div className="p-3 rounded-lg border" style={{
            backgroundColor: status === 'HIGH' ? '#ecfdf5' : status === 'MEDIUM' ? '#fffbeb' : status === 'LOW' ? '#fef2f2' : '#f8fafc',
            borderColor: status === 'HIGH' ? '#d1fae5' : status === 'MEDIUM' ? '#fde68a' : status === 'LOW' ? '#fecaca' : '#e2e8f0'
          }}>
            <p className="text-xs font-medium" style={{
              color: status === 'HIGH' ? '#065f46' : status === 'MEDIUM' ? '#92400e' : status === 'LOW' ? '#991b1b' : '#475569'
            }}>
              {config.guidance}
            </p>
          </div>

          {/* How Goodwill works (optional info) */}
          <div className="flex items-start gap-2 text-xs text-copy-muted">
            <Info size={14} className="mt-0.5 flex-shrink-0" />
            <p>
              Goodwill is earned through paid service history and is discretionary by dealer policy.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoodwillWidget;
