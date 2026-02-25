import { MapPin, DollarSign, AlertCircle, Wrench, AlertTriangle, Users } from 'lucide-react';

const iconMap = {
  defectors: MapPin,
  highvalue: DollarSign,
  atrisk: AlertCircle,
  service: Wrench,
  recall: AlertTriangle,
  general: Users
};

const AudienceSnapshot = ({ audience }) => {
  if (!audience) return null;

  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-semibold text-copy-muted uppercase tracking-wide mb-2">
          AUDIENCE SNAPSHOT
        </p>
        <div className="mb-3">
          <div className="text-4xl font-bold text-copy-default mb-1">
            {audience.totalCustomers.toLocaleString()}
          </div>
          <p className="text-sm font-medium text-copy-muted uppercase">CUSTOMERS</p>
        </div>
      </div>

      {audience.segments && audience.segments.length > 0 && (
        <div className="space-y-3">
          {audience.segments.map((segment, index) => {
            const Icon = iconMap[segment.icon] || Users;
            return (
              <div key={index} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-button bg-surface-stroke flex items-center justify-center flex-shrink-0">
                  <Icon size={16} className="text-copy-muted" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-copy-default">{segment.name}</p>
                  <p className="text-xs text-copy-muted mt-0.5">{segment.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {audience.metrics && audience.metrics.length > 0 && (
        <div className="pt-3 border-t border-surface-stroke">
          <div className="grid grid-cols-2 gap-3">
            {audience.metrics.map((metric, index) => (
              <div key={index}>
                <p className="text-xs text-copy-muted mb-1">{metric.label}</p>
                <p className="text-sm font-semibold text-copy-default">{metric.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AudienceSnapshot;
