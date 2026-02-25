import { QrCode, ArrowRight } from 'lucide-react';

const OfferCard = ({ offer, onEdit, showEditButton = false, compact = false, className = '' }) => {
  if (!offer) return null;

  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + offer.expirationDays);

  // Compact mode for phone previews
  if (compact) {
    return (
      <div className={`bg-white rounded-lg border border-slate-200 p-2 shadow-sm ${className}`}>
        <div className="flex items-center gap-2">
          {offer.hasQRCode && (
            <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center flex-shrink-0">
              <QrCode size={12} className="text-slate-500" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold text-slate-900 truncate">{offer.title}</p>
            <p className="text-[10px] text-slate-500 truncate">{offer.subtitle}</p>
          </div>
          <ArrowRight size={12} className="text-slate-400 flex-shrink-0" />
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-surface-container rounded-button border border-surface-stroke p-4 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1">
          {offer.hasQRCode && (
            <div className="w-10 h-10 rounded bg-surface-stroke flex items-center justify-center flex-shrink-0">
              <QrCode size={20} className="text-copy-muted" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-copy-default mb-1">{offer.title}</h4>
            <p className="text-sm text-copy-muted mb-2">{offer.subtitle}</p>
            <div className="flex items-center gap-3 text-xs text-copy-muted">
              <span className="px-2 py-0.5 bg-surface-stroke rounded text-copy-default font-medium">
                {offer.tier}
              </span>
              <span>Exp: {offer.expirationDays} Days</span>
            </div>
          </div>
        </div>
        {showEditButton && onEdit && (
          <button
            onClick={onEdit}
            className="text-sm text-primary hover:text-primary-secondary font-medium flex-shrink-0"
          >
            Edit
          </button>
        )}
        {!showEditButton && (
          <ArrowRight size={16} className="text-copy-muted flex-shrink-0 mt-1" />
        )}
      </div>
    </div>
  );
};

export default OfferCard;
