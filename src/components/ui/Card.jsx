const Card = ({ children, className = "", onClick }) => (
  <div
    onClick={onClick}
    className={`bg-surface-container rounded-card shadow-card border border-surface-stroke ${className} ${onClick ? 'cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200' : ''}`}
  >
    {children}
  </div>
);

export default Card;

