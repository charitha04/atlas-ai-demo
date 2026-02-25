const ScoreBadge = ({ score, showValueAdjusted = false, ltvTier = null, compact = false }) => {
  let color = "bg-danger";
  if (score > 40) color = "bg-warning";
  if (score > 70) color = "bg-success";

  // LTV tier badge colors for compact display
  const ltvColors = {
    High: 'text-success-700',
    Medium: 'text-warning-700',
    Low: 'text-copy-muted',
  };

  return (
    <div className="flex items-center gap-2" title="Higher score = Higher likelihood to return (Value-adjusted)">
      <div className="flex-1 w-20 h-2 bg-surface-stroke rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all duration-500`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-semibold text-copy-default">{score}</span>
      {showValueAdjusted && ltvTier && !compact && (
        <span className={`text-[10px] ${ltvColors[ltvTier] || 'text-copy-muted'}`} title={`${ltvTier} value customer`}>
          $
        </span>
      )}
    </div>
  );
};

export default ScoreBadge;

