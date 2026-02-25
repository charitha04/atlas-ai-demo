import Card from './Card';

// Map solid colors to their light variants
const lightColorMap = {
  'bg-emerald-500': 'bg-emerald-50',
  'bg-red-500': 'bg-red-50',
  'bg-amber-500': 'bg-amber-50',
  'bg-primary': 'bg-primary-50',
};

const KPIWidget = ({ title, value, icon: Icon, color, onClick }) => {
  const IconComponent = Icon;
  const lightBgColor = lightColorMap[color] || 'bg-surface-page';
  
  return (
  <Card className="p-4 sm:p-5 flex flex-col justify-between h-full" onClick={onClick}>
    <div className="flex justify-between items-start">
      <div className="flex-1 min-w-0">
        <p className="text-copy-muted text-xs sm:text-sm font-medium uppercase tracking-wide">{title}</p>
        <h3 className="text-2xl sm:text-3xl font-semibold text-copy-default mt-1 sm:mt-2">{value}</h3>
      </div>
      <div className={`p-2 sm:p-3 rounded-button ${lightBgColor} flex-shrink-0 ml-2`}>
        <IconComponent size={20} className="sm:w-6 sm:h-6 text-copy-default" />
      </div>
    </div>
  </Card>
  );
};

export default KPIWidget;

