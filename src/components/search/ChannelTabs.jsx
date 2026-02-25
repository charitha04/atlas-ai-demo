import { MessageSquare, Mail, Bell, Phone } from 'lucide-react';

const channelConfig = {
  sms: { label: 'SMS', icon: MessageSquare },
  email: { label: 'Email', icon: Mail },
  push: { label: 'Push', icon: Bell },
  call: { label: 'Call', icon: Phone }
};

const ChannelTabs = ({ selectedChannel, onChannelChange }) => {
  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
        DELIVERY CHANNEL
      </p>
      <div className="flex gap-2 flex-wrap">
        {Object.entries(channelConfig).map(([key, config]) => {
          const Icon = config.icon;
          const isActive = selectedChannel === key;
          return (
            <button
              key={key}
              onClick={() => onChannelChange(key)}
              className={`px-4 py-2.5 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
                isActive
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Icon size={16} />
              {config.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ChannelTabs;
