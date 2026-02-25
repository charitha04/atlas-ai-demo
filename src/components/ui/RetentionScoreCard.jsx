import { useState } from 'react';
import { TrendingUp, ChevronDown, ChevronUp, AlertTriangle, AlertCircle, XCircle, Mail, CalendarX, Eye, CheckCircle, Info, MapPin, Gauge, DollarSign, Clock } from 'lucide-react';
import Card from './Card';
import ScoreBadge from './ScoreBadge';

// Icon mapping for behavioral signals
const signalIcons = {
  'alert-triangle': AlertTriangle,
  'alert-circle': AlertCircle,
  'x-circle': XCircle,
  'mail': Mail,
  'mail-check': CheckCircle,
  'calendar-x': CalendarX,
  'eye': Eye,
};

// Signal type colors
const signalTypeColors = {
  danger: 'text-danger bg-danger-100',
  warning: 'text-warning-700 bg-warning-100',
  info: 'text-primary bg-primary-100',
  success: 'text-success-700 bg-success-100',
  neutral: 'text-copy-muted bg-surface-stroke',
};

const RetentionScoreCard = ({ customer }) => {
  const [isExplanationOpen, setIsExplanationOpen] = useState(false);
  const [isImpactOpen, setIsImpactOpen] = useState(false);

  // Destructure retention score data with fallbacks
  const {
    retentionScore = 0,
    distanceRaw = 0,
    distance = '0 mi',
    mileage = 0,
    // New enhanced fields
    lifetimeValue = null,
    ltvTier = 'Medium',
    behaviorBaseScore = null,
    ltvUplift = 0,
    scoreExplanations = [],
    factorImpacts = null,
    behavioralSignals = [],
  } = customer;

  // Determine if we have enhanced data
  const hasEnhancedData = lifetimeValue !== null && behaviorBaseScore !== null;

  // Calculate derived values if not provided
  const displayBehaviorScore = behaviorBaseScore ?? retentionScore;
  const displayLtvUplift = ltvUplift ?? 0;
  const displayLtv = lifetimeValue ?? Math.round(mileage * 0.02 + 500);
  const displayLtvTier = ltvTier ?? (displayLtv >= 3000 ? 'High' : displayLtv >= 1500 ? 'Medium' : 'Low');

  // Generate default explanations if not provided
  const displayExplanations = scoreExplanations.length > 0 ? scoreExplanations : [
    distanceRaw > 20 ? `Customer lives ${distanceRaw.toFixed(1)} miles away — farther than average` : `Customer lives nearby (${distanceRaw.toFixed(1)} mi)`,
    mileage < 30000 ? 'Low mileage usage compared to similar vehicles' : 'Higher-than-average mileage',
  ];

  // Generate default factor impacts if not provided
  const displayFactorImpacts = factorImpacts ?? {
    distance: { impact: Math.round((50 - distanceRaw) * 0.5), label: 'Distance to competitor' },
    serviceGap: { impact: -Math.round(Math.random() * 10), label: 'Service inactivity' },
    usage: { impact: Math.round((mileage / 100000) * 10 - 5), label: 'Usage pattern' },
    ltv: { impact: displayLtvUplift, label: 'Lifetime value' },
  };

  // Generate insight message based on score and LTV
  const getInsightMessage = () => {
    const isHighRisk = retentionScore < 50;
    const isHighValue = displayLtvTier === 'High';

    if (isHighRisk && isHighValue) {
      return 'High risk of defection, but high service value. Recommend priority win-back.';
    } else if (isHighRisk && displayLtvTier === 'Medium') {
      return 'Moderate risk with medium value. Consider targeted win-back offers.';
    } else if (isHighRisk) {
      return 'Lower retention probability. Monitor for engagement opportunities.';
    } else if (isHighValue) {
      return 'High likelihood to return. High value customer — prioritize relationship.';
    } else if (retentionScore > 70) {
      return 'High likelihood to return due to proximity and service needs.';
    }
    return 'Moderate retention probability. Maintain regular engagement.';
  };

  // LTV tier badge colors
  const ltvTierColors = {
    High: 'bg-success-100 text-success-700',
    Medium: 'bg-warning-100 text-warning-700',
    Low: 'bg-surface-stroke text-copy-muted',
  };

  return (
    <Card className="p-4 sm:p-6">
      <h3 className="font-semibold text-base sm:text-lg text-copy-default flex items-center gap-2 mb-3 sm:mb-4">
        <TrendingUp size={18} className="sm:w-5 sm:h-5 text-purple-500" /> Retention Score
      </h3>

      {/* Score Display */}
      <div className="space-y-1 mb-4">
        <div className="flex justify-between items-end">
          <span className="text-4xl font-semibold text-copy-default">{retentionScore}</span>
          <span className="text-sm text-copy-muted mb-1">/ 100</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <ScoreBadge score={retentionScore} />
          </div>
          <span className="text-xs text-purple-600 font-medium bg-purple-50 px-2 py-0.5 rounded">
            Value-adjusted
          </span>
        </div>
      </div>

      {/* Score Breakdown */}
      {hasEnhancedData && (
        <div className="mb-4 p-3 bg-surface-page rounded-button border border-surface-stroke">
          <div className="flex items-center justify-between text-sm">
            <span className="text-copy-muted">Base behavior score:</span>
            <span className="font-medium text-copy-default">{displayBehaviorScore}</span>
          </div>
          <div className="flex items-center justify-between text-sm mt-1">
            <span className="text-copy-muted">LTV uplift:</span>
            <span className={`font-medium ${displayLtvUplift > 0 ? 'text-success' : 'text-copy-default'}`}>
              {displayLtvUplift > 0 ? '+' : ''}{displayLtvUplift}
            </span>
          </div>
        </div>
      )}

      {/* Factors Section */}
      <div className="text-sm space-y-2 text-copy-muted mb-4">
        <p className="text-xs font-semibold text-copy-default uppercase tracking-wide mb-2">Factors</p>
        
        <div className="flex justify-between items-center border-b border-surface-stroke pb-2">
          <span className="flex items-center gap-2">
            <MapPin size={14} className="text-copy-muted" />
            Distance Factor
          </span>
          <span className="font-medium text-copy-default">{distance}</span>
        </div>
        
        <div className="flex justify-between items-center border-b border-surface-stroke pb-2 pt-1">
          <span className="flex items-center gap-2">
            <Gauge size={14} className="text-copy-muted" />
            Usage Factor
          </span>
          <span className="font-medium text-copy-default">{(mileage / 1000).toFixed(0)}k miles</span>
        </div>
        
        <div className="flex justify-between items-center pt-1">
          <span className="flex items-center gap-2">
            <DollarSign size={14} className="text-copy-muted" />
            Lifetime Value Factor
          </span>
          <div className="flex items-center gap-2">
            <span className="font-medium text-copy-default">${displayLtv.toLocaleString()}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded ${ltvTierColors[displayLtvTier]}`}>
              {displayLtvTier}
            </span>
          </div>
        </div>
        <p className="text-xs text-copy-muted pl-5 mt-1">
          Projected service revenue over next 24 months
        </p>
      </div>

      {/* Collapsible "Why this score?" Section */}
      <div className="border-t border-surface-stroke pt-3 mb-3">
        <button
          onClick={() => setIsExplanationOpen(!isExplanationOpen)}
          className="flex items-center justify-between w-full text-left"
        >
          <span className="text-sm font-semibold text-copy-default flex items-center gap-2">
            <Info size={14} className="text-purple-500" />
            Why this score?
          </span>
          {isExplanationOpen ? (
            <ChevronUp size={16} className="text-copy-muted" />
          ) : (
            <ChevronDown size={16} className="text-copy-muted" />
          )}
        </button>
        
        {isExplanationOpen && (
          <ul className="mt-3 space-y-2 text-sm text-copy-muted animate-in fade-in duration-200">
            {displayExplanations.map((explanation, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-copy-muted mt-1">•</span>
                <span>{explanation}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Collapsible Factor Impact Section */}
      <div className="border-t border-surface-stroke pt-3 mb-3">
        <button
          onClick={() => setIsImpactOpen(!isImpactOpen)}
          className="flex items-center justify-between w-full text-left"
        >
          <span className="text-sm font-semibold text-copy-default">Factor Impact</span>
          {isImpactOpen ? (
            <ChevronUp size={16} className="text-copy-muted" />
          ) : (
            <ChevronDown size={16} className="text-copy-muted" />
          )}
        </button>
        
        {isImpactOpen && (
          <div className="mt-3 space-y-2 text-sm animate-in fade-in duration-200">
            {Object.entries(displayFactorImpacts).map(([key, factor]) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-copy-muted">{factor.label}</span>
                <span className={`font-mono font-medium ${
                  factor.impact > 0 ? 'text-success' : factor.impact < 0 ? 'text-danger' : 'text-copy-muted'
                }`}>
                  {factor.impact > 0 ? '+' : ''}{factor.impact}
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between pt-2 border-t border-surface-stroke font-medium">
              <span className="text-copy-default">Net:</span>
              <span className="text-copy-default">{retentionScore}</span>
            </div>
          </div>
        )}
      </div>

      {/* Behavioral Signals Section */}
      {behavioralSignals && behavioralSignals.length > 0 && (
        <div className="border-t border-surface-stroke pt-3 mb-3">
          <p className="text-xs font-semibold text-copy-default uppercase tracking-wide mb-2 flex items-center gap-2">
            <Clock size={12} className="text-copy-muted" />
            Recent Customer Signals
          </p>
          <div className="space-y-2">
            {behavioralSignals.map((signal, index) => {
              const IconComponent = signalIcons[signal.icon] || Info;
              const colorClasses = signalTypeColors[signal.type] || signalTypeColors.neutral;
              
              return (
                <div
                  key={index}
                  className="flex items-center gap-2 text-sm"
                >
                  <span className={`p-1 rounded ${colorClasses}`}>
                    <IconComponent size={12} />
                  </span>
                  <span className="text-copy-muted">{signal.text}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Insight Message */}
      <div className={`mt-4 p-3 text-xs rounded-button border ${
        retentionScore > 70 
          ? 'bg-success-50 text-success-700 border-success-100'
          : retentionScore < 40
          ? 'bg-danger-50 text-danger-700 border-danger-100'
          : 'bg-purple-50 text-purple-700 border-purple-100'
      }`}>
        <span className="font-medium">Insight:</span> {getInsightMessage()}
      </div>
    </Card>
  );
};

export default RetentionScoreCard;
