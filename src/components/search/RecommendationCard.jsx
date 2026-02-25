import { Bot, TrendingUp, X, ArrowRight, RefreshCw } from 'lucide-react';
import Card from '../ui/Card';
import AudienceSnapshot from './AudienceSnapshot';
import InsightCallout from './InsightCallout';
import PredictionRow from './PredictionRow';
import OfferCard from './OfferCard';

const RecommendationCard = ({ 
  recommendation, 
  offer,
  channels,
  onLaunch, 
  onPreviewEdit, 
  onDismiss,
  onRegenerate,
  isRegenerating = false
}) => {
  if (!recommendation) return null;

  const { badge, campaignType, title, description, audience, insights, prediction } = recommendation;

  return (
    <Card className="p-4 animate-in fade-in duration-500">
      {/* Header with badges and regenerate button */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-3 py-1 bg-success-100 text-success-700 rounded-full text-xs font-semibold uppercase">
            {campaignType}
          </span>
          <span className="px-3 py-1 bg-success-50 text-success rounded-full text-xs font-medium flex items-center gap-1.5">
            <Bot size={12} />
            {badge}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {onRegenerate && (
            <button
              onClick={onRegenerate}
              disabled={isRegenerating}
              className="p-2 rounded-button hover:bg-surface-page transition-colors disabled:opacity-50"
              title="Regenerate recommendation"
            >
              <RefreshCw
                size={16}
                className={`text-copy-muted ${isRegenerating ? 'animate-spin' : ''}`}
              />
            </button>
          )}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="p-2 rounded-button hover:bg-surface-page transition-colors"
              title="Dismiss recommendation"
            >
              <X size={16} className="text-copy-muted" />
            </button>
          )}
        </div>
      </div>

      {/* Title and Description */}
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-copy-default mb-1.5">{title}</h2>
        <p className="text-copy-muted leading-relaxed">{description}</p>
      </div>

      {/* Split View: Audience Snapshot and Creative Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Left: Audience Snapshot */}
        <div>
          <AudienceSnapshot audience={audience} />
        </div>

        {/* Right: Creative Preview */}
        <div>
          <p className="text-xs font-semibold text-copy-muted uppercase tracking-wide mb-3">
            CREATIVE PREVIEW
          </p>
          <div className="mb-3">
            <button className="px-3 py-1.5 bg-surface-stroke text-copy-default rounded-full text-xs font-medium flex items-center gap-2">
              <span>💬</span>
              SMS PREVIEW
            </button>
          </div>
          
          {/* SMS Preview Mockup */}
          <div className="bg-surface-page rounded-button p-3 border border-surface-stroke">
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-xs font-semibold text-primary">CM</span>
                </div>
                <div>
                  <p className="text-xs font-semibold text-copy-default">City Motors</p>
                  <p className="text-xs text-copy-muted">Just now</p>
                </div>
              </div>
              <div className="bg-surface-container rounded-button p-3 border border-surface-stroke">
                {channels?.sms?.headline && (
                  <p className="text-sm font-semibold text-copy-default mb-1">
                    {channels.sms.headline}
                  </p>
                )}
                <p className="text-sm text-copy-muted whitespace-pre-wrap">
                  {channels?.sms?.body || 'Message preview...'}
                </p>
              </div>
              {offer && (
                <OfferCard offer={offer} className="mt-2" />
              )}
            </div>
          </div>

          {/* Performance Prediction */}
          <PredictionRow prediction={prediction} />
        </div>
      </div>

      {/* AI Insight Callout */}
      {insights && insights.length > 0 && (
        <div className="mb-4">
          <InsightCallout insights={insights} />
        </div>
      )}

      {/* CTAs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-3 border-t border-surface-stroke">
        <button
          onClick={onDismiss}
          className="text-sm text-copy-muted hover:text-copy-default transition-colors text-left sm:text-center"
        >
          Dismiss Recommendation
        </button>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button
            onClick={onLaunch}
            className="px-4 py-2 bg-surface-container border border-primary text-primary rounded-button hover:bg-primary-50 transition-colors text-sm font-semibold uppercase tracking-wider"
          >
            Launch as-is
          </button>
          <button
            onClick={onPreviewEdit}
            className="px-4 py-2 bg-primary hover:bg-primary-secondary text-white rounded-button transition-colors text-sm font-semibold uppercase tracking-wider flex items-center justify-center gap-2 shadow-card"
          >
            Preview & Edit Campaign
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </Card>
  );
};

export default RecommendationCard;
