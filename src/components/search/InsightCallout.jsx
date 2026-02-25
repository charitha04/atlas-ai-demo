import { Sparkles } from 'lucide-react';

const InsightCallout = ({ insights }) => {
  if (!insights || insights.length === 0) return null;

  return (
    <div className="space-y-1.5">
      {insights.map((insight, index) => (
        <div
          key={index}
          className="bg-primary-50 border border-primary-100 rounded-button p-3"
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <Sparkles size={18} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-copy-default mb-1">
                {insight.label}:
              </p>
              <p className="text-sm text-copy-muted leading-relaxed">
                {insight.text}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default InsightCallout;
