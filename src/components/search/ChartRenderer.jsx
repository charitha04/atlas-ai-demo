import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

const PALETTE = ['#1A9375', '#2ecc71', '#27ae60', '#145a32', '#52be80', '#a8e6cf', '#0d7a5f', '#34d399'];

const formatValue = (val) => {
  if (typeof val !== 'number') return val;
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return Number.isInteger(val) ? val.toLocaleString() : `${(val / 1_000).toFixed(1)}k`;
  return typeof val === 'number' && !Number.isInteger(val) ? val.toFixed(2) : val;
};

const tickFormatter = (val) => {
  if (typeof val === 'string' && val.length > 18) return val.slice(0, 16) + '…';
  return val;
};

const ChartRenderer = ({ chartConfig, rows }) => {
  if (!chartConfig || !rows || rows.length < 3) return null;

  const { type, x_col, y_col, title } = chartConfig;

  // Sanitise data — drop rows with null x or y, limit to top 20 for readability
  const data = rows
    .filter(r => r[x_col] != null && r[y_col] != null)
    .slice(0, 20)
    .map(r => ({ ...r, [y_col]: Number(r[y_col]) || 0 }));

  if (data.length < 2) return null;

  const commonProps = {
    data,
    margin: { top: 10, right: 20, left: 10, bottom: 5 },
  };

  const renderTooltipContent = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white border border-surface-stroke rounded-lg p-3 shadow-card text-sm">
        <p className="font-semibold text-copy-default mb-1">{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }}>
            {p.name}: <span className="font-medium">{formatValue(p.value)}</span>
          </p>
        ))}
      </div>
    );
  };

  const renderChart = () => {
    if (type === 'line') {
      return (
        <LineChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey={x_col} tickFormatter={tickFormatter} tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={formatValue} tick={{ fontSize: 12 }} width={70} />
          <Tooltip content={renderTooltipContent} />
          <Line type="monotone" dataKey={y_col} stroke={PALETTE[0]} strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
        </LineChart>
      );
    }

    if (type === 'pie') {
      return (
        <PieChart>
          <Pie
            data={data}
            dataKey={y_col}
            nameKey={x_col}
            cx="50%"
            cy="50%"
            outerRadius={130}
            innerRadius={50}
            label={({ name, percent }) => `${tickFormatter(name)} (${(percent * 100).toFixed(0)}%)`}
            labelLine={true}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(val) => formatValue(val)} />
        </PieChart>
      );
    }

    if (type === 'bar_horizontal') {
      const sorted = [...data].sort((a, b) => b[y_col] - a[y_col]);
      return (
        <BarChart {...commonProps} data={sorted} layout="vertical" margin={{ top: 10, right: 20, left: 140, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
          <XAxis type="number" tickFormatter={formatValue} tick={{ fontSize: 12 }} />
          <YAxis type="category" dataKey={x_col} tick={{ fontSize: 11 }} width={130} tickFormatter={tickFormatter} />
          <Tooltip content={renderTooltipContent} />
          <Bar dataKey={y_col} fill={PALETTE[0]} radius={[0, 4, 4, 0]} />
        </BarChart>
      );
    }

    // default: vertical bar
    return (
      <BarChart {...commonProps}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey={x_col} tickFormatter={tickFormatter} tick={{ fontSize: 12 }} />
        <YAxis tickFormatter={formatValue} tick={{ fontSize: 12 }} width={70} />
        <Tooltip content={renderTooltipContent} />
        <Bar dataKey={y_col} fill={PALETTE[0]} radius={[4, 4, 0, 0]} />
      </BarChart>
    );
  };

  return (
    <div className="mt-4 p-4 bg-surface-page rounded-lg border border-surface-stroke">
      {title && (
        <p className="text-sm font-semibold text-copy-default mb-3">{title}</p>
      )}
      <ResponsiveContainer width="100%" height={320}>
        {renderChart()}
      </ResponsiveContainer>
    </div>
  );
};

export default ChartRenderer;
