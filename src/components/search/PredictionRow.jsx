const PredictionRow = ({ prediction }) => {
  if (!prediction) return null;

  return (
    <div className="pt-3 border-t border-surface-stroke">
      <p className="text-sm text-copy-muted mb-1">
        <span className="font-semibold text-copy-default">{prediction.label}:</span>{' '}
        <span className="text-primary font-semibold">{prediction.value}</span>
      </p>
      {prediction.note && (
        <p className="text-xs text-copy-muted mt-1">{prediction.note}</p>
      )}
    </div>
  );
};

export default PredictionRow;
