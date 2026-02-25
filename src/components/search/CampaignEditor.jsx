import { useState, useEffect, useRef } from 'react';
import { X, Bot } from 'lucide-react';
import ChannelTabs from './ChannelTabs';
import CustomerPreviewPhone from './CustomerPreviewPhone';
import OfferCard from './OfferCard';

const CampaignEditor = ({ 
  offer, 
  channels, 
  onClose, 
  onSave,
  initialChannel = 'sms'
}) => {
  const [selectedChannel, setSelectedChannel] = useState(initialChannel);
  const [editedChannels, setEditedChannels] = useState(() => channels || {});
  const [editedOffer, setEditedOffer] = useState(() => offer);
  const [isDirty, setIsDirty] = useState(false);
  const prevChannelsRef = useRef(channels);
  const prevOfferRef = useRef(offer);

  useEffect(() => {
    if (channels && channels !== prevChannelsRef.current) {
      prevChannelsRef.current = channels;
      // Use setTimeout to avoid synchronous setState in effect
      setTimeout(() => {
        setEditedChannels(channels);
      }, 0);
    }
    if (offer && offer !== prevOfferRef.current) {
      prevOfferRef.current = offer;
      // Use setTimeout to avoid synchronous setState in effect
      setTimeout(() => {
        setEditedOffer(offer);
      }, 0);
    }
  }, [channels, offer]);

  const updateChannelField = (channel, field, value) => {
    setEditedChannels(prev => ({
      ...prev,
      [channel]: {
        ...prev[channel],
        [field]: value
      }
    }));
    setIsDirty(true);
  };

  const getCharacterCount = (text) => {
    return text ? text.length : 0;
  };

  const getChannelFields = () => {
    const channelData = editedChannels[selectedChannel] || {};
    
    switch (selectedChannel) {
      case 'sms':
        return {
          headline: {
            label: 'HEADLINE',
            value: channelData.headline || '',
            maxLength: 50,
            onChange: (value) => updateChannelField('sms', 'headline', value)
          },
          body: {
            label: 'MESSAGE BODY',
            value: channelData.body || '',
            maxLength: 160,
            onChange: (value) => updateChannelField('sms', 'body', value),
            multiline: true
          }
        };
      case 'email':
        return {
          subject: {
            label: 'SUBJECT LINE',
            value: channelData.subject || '',
            maxLength: 100,
            onChange: (value) => updateChannelField('email', 'subject', value)
          },
          body: {
            label: 'EMAIL BODY',
            value: channelData.body || '',
            maxLength: 1000,
            onChange: (value) => updateChannelField('email', 'body', value),
            multiline: true
          }
        };
      case 'push':
        return {
          title: {
            label: 'NOTIFICATION TITLE',
            value: channelData.title || '',
            maxLength: 50,
            onChange: (value) => updateChannelField('push', 'title', value)
          },
          text: {
            label: 'NOTIFICATION TEXT',
            value: channelData.text || '',
            maxLength: 150,
            onChange: (value) => updateChannelField('push', 'text', value),
            multiline: true
          }
        };
      case 'call':
        return {
          callerIdName: {
            label: 'CALLER ID NAME',
            value: channelData.callerIdName || '',
            maxLength: 30,
            onChange: (value) => updateChannelField('call', 'callerIdName', value)
          },
          voicemailScript: {
            label: 'VOICEMAIL SCRIPT',
            value: channelData.voicemailScript || '',
            maxLength: 200,
            onChange: (value) => updateChannelField('call', 'voicemailScript', value),
            multiline: true
          }
        };
      default:
        return {};
    }
  };

  const handleSave = () => {
    if (onSave) {
      onSave({
        channels: editedChannels,
        offer: editedOffer
      }, selectedChannel);
    }
    setIsDirty(false);
  };

  const handleClose = () => {
    if (isDirty) {
      const confirmed = window.confirm('You have unsaved changes. Are you sure you want to close?');
      if (!confirmed) return;
    }
    onClose();
  };

  const fields = getChannelFields();
  const fieldEntries = Object.entries(fields);

  return (
    <div className="fixed inset-0 z-50 bg-copy-default/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface-container rounded-card shadow-card w-full max-w-7xl max-h-[90vh] flex flex-col overflow-hidden border border-surface-stroke">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-surface-stroke">
          <div>
            <h2 className="text-xl font-semibold text-copy-default">Edit Campaign</h2>
            <p className="text-sm text-copy-muted mt-1">Customize the win-back message</p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-button hover:bg-surface-page transition-colors"
          >
            <X size={20} className="text-copy-muted" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-4 sm:p-6">
            {/* Left Panel: Editor */}
            <div className="space-y-6">
              <ChannelTabs
                selectedChannel={selectedChannel}
                onChannelChange={setSelectedChannel}
              />

              {/* Editable Fields */}
              <div className="space-y-4">
                {fieldEntries.map(([key, field]) => (
                  <div key={key}>
                    <label className="block text-xs font-semibold text-copy-muted uppercase tracking-wide mb-2">
                      {field.label}
                    </label>
                    {field.multiline ? (
                      <textarea
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                        className="w-full px-4 py-3 border border-surface-stroke rounded-input focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none bg-surface-container text-copy-default"
                        rows={field.key === 'body' && selectedChannel === 'email' ? 8 : 4}
                        maxLength={field.maxLength}
                      />
                    ) : (
                      <input
                        type="text"
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                        className="w-full px-4 py-3 border border-surface-stroke rounded-input focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-surface-container text-copy-default"
                        maxLength={field.maxLength}
                      />
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs text-copy-muted flex items-center gap-1">
                        <Bot size={12} />
                        AI optimized for conversions
                      </p>
                      <p className="text-xs text-copy-muted">
                        {getCharacterCount(field.value)} / {field.maxLength} chars
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Offer Card */}
              <div>
                <p className="text-xs font-semibold text-copy-muted uppercase tracking-wide mb-3">
                  ATTACHED OFFER
                </p>
                <OfferCard 
                  offer={editedOffer} 
                  showEditButton={true}
                  onEdit={() => {
                    // Offer editing could open a modal or inline editor
                    alert('Offer editing coming soon');
                  }}
                />
              </div>
            </div>

            {/* Right Panel: Preview */}
            <div className="lg:sticky lg:top-6 flex flex-col items-center lg:items-start">
              <div className="space-y-4 w-full">
                <div>
                  <p className="text-xs font-semibold text-copy-muted uppercase tracking-wide mb-3">
                    CUSTOMER PREVIEW
                  </p>
                  <p className="text-xs text-copy-muted mb-4">iPhone 15 Pro • Light Mode</p>
                </div>
                <div className="flex justify-center lg:justify-start">
                  <CustomerPreviewPhone
                    channel={selectedChannel}
                    channels={editedChannels}
                    offer={editedOffer}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 sm:p-6 border-t border-surface-stroke bg-surface-page">
          <div className="text-sm text-copy-muted">
            {isDirty && <span className="text-warning">• Unsaved changes</span>}
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={handleClose}
              className="flex-1 sm:flex-none px-4 py-2 bg-surface-container border border-primary text-primary hover:bg-primary-50 rounded-button transition-colors text-sm font-semibold uppercase tracking-wider"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-1 sm:flex-none px-4 py-2 bg-primary hover:bg-primary-secondary text-white rounded-button transition-colors text-sm font-semibold uppercase tracking-wider"
            >
              Launch Campaign
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampaignEditor;
