import { useState, useMemo, useRef, useEffect } from 'react';
import { Plus, ArrowLeft, ArrowRight, Mail, MessageSquare, Phone, Smartphone, TrendingUp, Bot } from 'lucide-react';
import Card from '../components/ui/Card';
import ChannelTabs from '../components/search/ChannelTabs';
import CustomerPreviewPhone from '../components/search/CustomerPreviewPhone';
import OfferCard from '../components/search/OfferCard';

// Generate campaign recommendation data based on audience
const generateCampaignRecommendation = (audienceType, customers) => {
  const audienceConfigs = {
    'Service Due': {
      campaignType: 'Service Campaign',
      title: 'Service due reminder campaign',
      description: 'Reach customers who are due for scheduled maintenance with timely reminders.',
      icon: 'service',
      offer: {
        title: '$15 Off Service',
        subtitle: 'Any Scheduled Maintenance',
        expirationDays: 14,
        tier: 'Service Tier 1',
        hasQRCode: true
      },
      channels: {
        sms: {
          headline: 'Service Reminder',
          body: 'Your vehicle is due for service! Book now and save $15 on your next scheduled maintenance. Valid for 14 days. Reply STOP to opt out.'
        },
        email: {
          subject: 'Your vehicle is due for service',
          body: 'Hi there,\n\nYour vehicle is approaching its scheduled service interval. Regular maintenance helps keep your vehicle running smoothly and safely.\n\nBook your service appointment today and save $15 on any scheduled maintenance. This offer is valid for the next 14 days.\n\nSchedule online or call us at (555) 123-4567.\n\nBest regards,\nCity Motors Service Team'
        },
        push: {
          title: 'Service Reminder',
          text: 'Your vehicle is due for service. Book now and save $15!'
        },
        call: {
          callerIdName: 'City Motors Service',
          voicemailScript: 'Hi, this is City Motors. Your vehicle is due for service. Book now and save $15 on your next scheduled maintenance. Valid for 14 days.'
        }
      },
      prediction: {
        label: 'Performance Prediction',
        value: '42% booking rate',
        note: 'Similar campaigns achieved 42% booking rate'
      }
    },
    'Active Defector': {
      campaignType: 'Win-Back Campaign',
      title: 'Win back active defectors',
      description: 'Targeting customers who visited a competitor in the last 60 days with a personalized offer.',
      icon: 'defectors',
      offer: {
        title: '$25 Off Service',
        subtitle: 'Oil Change & Tire Rotation',
        expirationDays: 7,
        tier: 'Win-Back Tier 1',
        hasQRCode: true
      },
      channels: {
        sms: {
          headline: "We've missed you!",
          body: "It's been a while! Come back for your regular maintenance and take $25 off your next Oil Change & Rotation. Valid this week only. Reply STOP to opt out."
        },
        email: {
          subject: "We've missed you at City Motors",
          body: "Hi there,\n\nIt's been a while since we've seen you! We noticed you might be visiting other service centers, and we'd love to welcome you back.\n\nAs a valued customer, we're offering you $25 off your next Oil Change & Tire Rotation service. This offer is valid for the next 7 days.\n\nSchedule your appointment today and let us take care of your vehicle.\n\nBest regards,\nCity Motors Team"
        },
        push: {
          title: 'Special Offer: $25 Off Service',
          text: 'Come back for your regular maintenance. Valid this week only!'
        },
        call: {
          callerIdName: "We've missed you at City Motors",
          voicemailScript: "It's been a while! Come back for your regular maintenance and take $25 off your next Oil Change & Rotation. Valid this week only."
        }
      },
      prediction: {
        label: 'Performance Prediction',
        value: '18% of defectors',
        note: 'Similar campaigns recovered 18% of defectors'
      }
    },
    'Open Recall': {
      campaignType: 'Recall Campaign',
      title: 'Urgent safety recall notification',
      description: 'Notify customers about critical safety recalls requiring immediate action.',
      icon: 'recall',
      offer: {
        title: 'Free Recall Service',
        subtitle: 'Safety Inspection Included',
        expirationDays: 30,
        tier: 'Recall Priority',
        hasQRCode: false
      },
      channels: {
        sms: {
          headline: 'Urgent: Safety Recall',
          body: 'Your vehicle has an open safety recall. Please schedule service immediately. This service is free and includes a complimentary safety inspection. Reply STOP to opt out.'
        },
        email: {
          subject: 'URGENT: Safety Recall for Your Vehicle',
          body: 'Dear Customer,\n\nYour vehicle has an open safety recall that requires immediate attention. This is a critical safety issue that should be addressed as soon as possible.\n\nWe are offering free recall service, which includes a complimentary safety inspection. Please schedule your appointment within the next 30 days.\n\nThis service is completely free and takes approximately 1-2 hours.\n\nPlease call us at (555) 123-4567 or schedule online.\n\nSafety is our top priority.\n\nCity Motors Service Team'
        },
        push: {
          title: 'URGENT: Safety Recall',
          text: 'Your vehicle has an open safety recall. Schedule free service now.'
        },
        call: {
          callerIdName: 'City Motors - Urgent Recall',
          voicemailScript: 'This is City Motors calling about an urgent safety recall for your vehicle. Please schedule service immediately. This service is free and includes a complimentary safety inspection. Please call us back at (555) 123-4567.'
        }
      },
      prediction: {
        label: 'Performance Prediction',
        value: '78% completion rate',
        note: 'Similar recall campaigns achieved 78% completion rate'
      }
    },
    'Loyal Customers': {
      campaignType: 'Loyalty Campaign',
      title: 'Reward your loyal customers',
      description: 'Show appreciation to your most loyal customers with exclusive offers and benefits.',
      icon: 'loyalty',
      offer: {
        title: 'VIP Loyalty Reward',
        subtitle: '20% Off Any Service',
        expirationDays: 30,
        tier: 'Loyalty Tier',
        hasQRCode: true
      },
      channels: {
        sms: {
          headline: 'Thank you for your loyalty!',
          body: "As a valued customer, you've earned 20% off your next service. Use this exclusive offer within 30 days. We appreciate your continued trust! Reply STOP to opt out."
        },
        email: {
          subject: 'A Special Thank You from City Motors',
          body: "Dear Valued Customer,\n\nWe want to take a moment to thank you for your continued loyalty to City Motors. Customers like you are the heart of our business.\n\nAs a token of our appreciation, we're offering you an exclusive 20% discount on your next service visit. This offer is valid for the next 30 days.\n\nThank you for choosing us for your automotive needs.\n\nWarm regards,\nCity Motors Team"
        },
        push: {
          title: 'VIP Loyalty Reward',
          text: "You've earned 20% off your next service. Thank you for your loyalty!"
        },
        call: {
          callerIdName: 'City Motors - Thank You',
          voicemailScript: "Hi, this is City Motors. We're calling to thank you for being a loyal customer. You've earned 20% off your next service visit. Please call us to schedule your appointment."
        }
      },
      prediction: {
        label: 'Performance Prediction',
        value: '65% engagement rate',
        note: 'Similar loyalty campaigns achieved 65% engagement'
      }
    },
    'Low Retention Risk': {
      campaignType: 'Retention Campaign',
      title: 'Re-engage at-risk customers',
      description: 'Proactively reach out to customers showing signs of disengagement before they leave.',
      icon: 'atrisk',
      offer: {
        title: '$30 Off Service',
        subtitle: 'Any Service Over $100',
        expirationDays: 14,
        tier: 'Retention Tier',
        hasQRCode: true
      },
      channels: {
        sms: {
          headline: "We'd love to see you again!",
          body: "It's been too long! Here's $30 off your next service over $100. We want to earn back your trust. Valid for 14 days. Reply STOP to opt out."
        },
        email: {
          subject: "We'd love to see you again",
          body: "Hi there,\n\nWe noticed it's been a while since your last visit, and we wanted to reach out personally.\n\nWe'd love the opportunity to serve you again. To make it easier, we're offering you $30 off any service over $100. This offer is valid for the next 14 days.\n\nWe value your business and hope to see you soon.\n\nBest regards,\nCity Motors Team"
        },
        push: {
          title: "We'd love to see you again!",
          text: "Here's $30 off your next service. We want to earn back your trust."
        },
        call: {
          callerIdName: 'City Motors - Special Offer',
          voicemailScript: "Hi, this is City Motors. We noticed it's been a while and wanted to offer you $30 off your next service over $100. We'd love to see you again. Please call us back to schedule."
        }
      },
      prediction: {
        label: 'Performance Prediction',
        value: '28% return rate',
        note: 'Similar retention campaigns achieved 28% return rate'
      }
    }
  };

  const config = audienceConfigs[audienceType] || audienceConfigs['Service Due'];
  const filteredCustomers = customers.filter(c => {
    if (audienceType === 'Low Retention Risk') return c.retentionScore < 50;
    if (audienceType === 'Loyal Customers') return c.status === 'Loyal';
    return c.status === audienceType;
  });

  return {
    customers: filteredCustomers,
    recommendation: {
      badge: 'AI Recommended',
      campaignType: config.campaignType,
      title: config.title,
      description: `${config.description} Targeting ${filteredCustomers.length} customers.`,
      audience: {
        totalCustomers: filteredCustomers.length,
        segments: [{ name: audienceType, description: config.description, icon: config.icon }],
        metrics: [
          { label: 'Est. Revenue', value: `$${(filteredCustomers.length * 150).toLocaleString()}` }
        ]
      },
      insights: [
        {
          label: 'AI Insight',
          text: 'Personalized messaging increases engagement by 2.1x compared to generic campaigns.'
        }
      ],
      prediction: config.prediction
    },
    offer: config.offer,
    channels: config.channels
  };
};

// Inline Campaign Editor Component
const CampaignEditorInline = ({ 
  offer, 
  channels, 
  onCancel, 
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
      setTimeout(() => {
        setEditedChannels(channels);
      }, 0);
    }
    if (offer && offer !== prevOfferRef.current) {
      prevOfferRef.current = offer;
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

  const handleCancel = () => {
    if (isDirty) {
      const confirmed = window.confirm('You have unsaved changes. Are you sure you want to go back?');
      if (!confirmed) return;
    }
    onCancel();
  };

  const fields = getChannelFields();
  const fieldEntries = Object.entries(fields);

  return (
    <Card className="overflow-hidden">
      {/* Content */}
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

      {/* Footer */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 sm:p-6 border-t border-surface-stroke bg-surface-page">
        <div className="text-sm text-copy-muted">
          {isDirty && <span className="text-warning">• Unsaved changes</span>}
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={handleCancel}
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
    </Card>
  );
};

const Campaigns = ({ customers, activeCampaigns, onAddCampaign, onLaunchCampaign }) => {
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'select-audience' | 'editor'
  const [statusFilter, setStatusFilter] = useState('All');
  
  // Creation Flow State
  const [selectedAudience, setSelectedAudience] = useState(null);
  const [campaignRecommendation, setCampaignRecommendation] = useState(null);
  const [editedContent, setEditedContent] = useState(null);

  // Audiences Logic
  const audiences = useMemo(() => {
    return {
      'Service Due': { count: customers.filter(c => c.status === 'Service Due').length, value: 45000 },
      'Active Defector': { count: customers.filter(c => c.status === 'Active Defector').length, value: 12500 },
      'Open Recall': { count: customers.filter(c => c.status === 'Open Recall').length, value: 0, note: "Safety/Liability" },
      'Loyal Customers': { count: customers.filter(c => c.status === 'Loyal').length, value: 65000 },
      'Low Retention Risk': { count: customers.filter(c => c.retentionScore < 50).length, value: 22000 },
    };
  }, [customers]);

  const getStatusColor = (status) => {
    switch(status) {
      case 'Active': return 'bg-emerald-100 text-emerald-700';
      case 'Running': return 'bg-primary-100 text-primary-700';
      case 'Completed': return 'bg-blue-100 text-blue-700';
      case 'Paused': return 'bg-amber-100 text-amber-700';
      case 'Draft': return 'bg-surface-stroke text-copy-muted';
      default: return 'bg-surface-stroke text-copy-muted';
    }
  };

  const filteredCampaigns = activeCampaigns.filter(c => 
    statusFilter === 'All' || c.status === statusFilter
  );

  const handleCreateNew = () => {
    setSelectedAudience(null);
    setCampaignRecommendation(null);
    setEditedContent(null);
    setViewMode('select-audience');
  };

  const handleSelectAudience = (audienceType) => {
    setSelectedAudience(audienceType);
    const recommendation = generateCampaignRecommendation(audienceType, customers);
    setCampaignRecommendation(recommendation);
    setViewMode('editor');
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedAudience(null);
    setCampaignRecommendation(null);
  };

  const handleBackToAudience = () => {
    setViewMode('select-audience');
    setCampaignRecommendation(null);
    setEditedContent(null);
  };

  const handleLaunchAsIs = () => {
    if (campaignRecommendation && onLaunchCampaign) {
      const campaignData = {
        name: campaignRecommendation.recommendation.title,
        campaignType: campaignRecommendation.recommendation.campaignType,
        audience: selectedAudience,
        channel: 'Email',
        customerCount: campaignRecommendation.customers?.length || 0,
        potentialRevenue: (campaignRecommendation.customers?.length || 0) * 150
      };
      onLaunchCampaign(campaignData);
    } else if (campaignRecommendation) {
      // Fallback if onLaunchCampaign not provided
      const newCampaign = {
        id: Date.now(),
        name: campaignRecommendation.recommendation.title,
        audience: selectedAudience,
        channel: 'Email',
        status: 'Running',
        sent: campaignRecommendation.customers?.length || 0,
        openRate: '0%',
        potentialRevenue: (campaignRecommendation.customers?.length || 0) * 150,
        date: 'Just now'
      };
      onAddCampaign(newCampaign);
      handleBackToList();
    }
  };

  const handleSaveEditor = (savedContent, selectedChannel) => {
    setEditedContent(savedContent);
    if (campaignRecommendation) {
      setCampaignRecommendation({
        ...campaignRecommendation,
        channels: savedContent.channels,
        offer: savedContent.offer
      });
    }
    
    // Launch the campaign
    if (onLaunchCampaign && campaignRecommendation) {
      const channelMap = {
        'sms': 'SMS',
        'email': 'Email',
        'push': 'Push Notification',
        'call': 'Call List'
      };
      
      const campaignData = {
        name: campaignRecommendation.recommendation.title,
        campaignType: campaignRecommendation.recommendation.campaignType,
        audience: selectedAudience,
        channel: channelMap[selectedChannel] || 'Email',
        customerCount: campaignRecommendation.customers?.length || 0,
        potentialRevenue: (campaignRecommendation.customers?.length || 0) * 150
      };
      onLaunchCampaign(campaignData);
    }
    
    // Navigate back to campaign list
    setViewMode('list');
    setSelectedAudience(null);
    setCampaignRecommendation(null);
    setEditedContent(null);
  };

  // --- Campaign List View ---
  if (viewMode === 'list') {
    return (
      <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold text-copy-default">Campaign Management</h2>
            <p className="text-sm sm:text-base text-copy-muted">Monitor active campaigns and launch new initiatives.</p>
          </div>
          <button
            onClick={handleCreateNew}
            className="flex items-center justify-center px-4 sm:px-5 py-2.5 bg-primary hover:bg-primary-secondary text-white rounded-button text-xs sm:text-sm font-semibold uppercase tracking-wider shadow-card transition-all"
          >
            <Plus size={18} className="mr-2" /> <span className="hidden sm:inline">Create New Campaign</span><span className="sm:hidden">New Campaign</span>
          </button>
        </div>

        {/* Status Tabs */}
        <div className="flex gap-2 border-b border-surface-stroke overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
           {['All', 'Active', 'Running', 'Paused', 'Draft', 'Completed'].map(tab => (
             <button
               key={tab}
               onClick={() => setStatusFilter(tab)}
               className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
                 statusFilter === tab
                   ? 'border-primary text-primary'
                   : 'border-transparent text-copy-muted hover:text-copy-default hover:border-surface-stroke'
               }`}
             >
               {tab}
             </button>
           ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredCampaigns.map(campaign => (
            <Card key={campaign.id} className="flex flex-col overflow-hidden hover:shadow-lg transition-shadow">
               <div className="p-4 sm:p-5 border-b border-surface-stroke flex justify-between items-start bg-surface-page">
                 <div className="flex-1 min-w-0">
                   <span className={`inline-flex items-center px-2 py-1 rounded-button text-xs font-semibold mb-2 ${getStatusColor(campaign.status)}`}>
                     {campaign.status}
                   </span>
                   <h3 className="font-semibold text-sm sm:text-base text-copy-default break-words">{campaign.name}</h3>
                   <p className="text-xs text-copy-muted mt-1">Launched {campaign.date}</p>
                 </div>
                 <div className="p-2 bg-surface-container border border-surface-stroke rounded-button text-copy-muted flex-shrink-0 ml-2">
                    {campaign.channel === 'Email' && <Mail size={16} className="sm:w-[18px] sm:h-[18px]"/>}
                    {campaign.channel === 'SMS' && <MessageSquare size={16} className="sm:w-[18px] sm:h-[18px]"/>}
                    {campaign.channel === 'Call List' && <Phone size={16} className="sm:w-[18px] sm:h-[18px]"/>}
                    {campaign.channel === 'Push Notification' && <Smartphone size={16} className="sm:w-[18px] sm:h-[18px]"/>}
                 </div>
               </div>
               <div className="p-4 sm:p-5 flex-1 space-y-3 sm:space-y-4">
                 <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <p className="text-xs text-copy-muted font-medium uppercase">Audience</p>
                      <p className="font-medium text-sm sm:text-base text-copy-default break-words">{campaign.audience}</p>
                    </div>
                    <div>
                      <p className="text-xs text-copy-muted font-medium uppercase">Sent</p>
                      <p className="font-medium text-sm sm:text-base text-copy-default">{campaign.sent}</p>
                    </div>
                 </div>
                 <div className="pt-3 sm:pt-4 border-t border-surface-stroke grid grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <p className="text-xs text-copy-muted font-medium uppercase">Open Rate</p>
                      <div className="flex items-center text-emerald-600 font-semibold text-sm sm:text-base">
                        <TrendingUp size={12} className="sm:w-3.5 sm:h-3.5 mr-1"/> {campaign.openRate}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-copy-muted font-medium uppercase">Potential Rev</p>
                      <p className="font-semibold text-sm sm:text-base text-copy-default">${campaign.potentialRevenue.toLocaleString()}</p>
                    </div>
                 </div>
               </div>
            </Card>
          ))}
          {filteredCampaigns.length === 0 && (
            <div className="col-span-full py-12 text-center text-copy-muted bg-surface-page rounded-card border border-dashed border-surface-stroke">
              No campaigns found with status "{statusFilter}".
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- Audience Selection View ---
  if (viewMode === 'select-audience') {
    return (
      <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto">
        <div className="flex items-center gap-2 sm:gap-4">
          <button onClick={handleBackToList} className="p-2 hover:bg-surface-page rounded-full text-copy-muted flex-shrink-0">
            <ArrowLeft size={20} className="sm:w-6 sm:h-6" />
          </button>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl sm:text-2xl font-semibold text-copy-default">New Campaign</h2>
            <p className="text-sm sm:text-base text-copy-muted">Select your target audience to get started.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mt-4 sm:mt-8">
          {Object.keys(audiences).map(key => (
            <button
              key={key}
              onClick={() => handleSelectAudience(key)}
              className="p-4 sm:p-5 bg-surface-container border-2 border-surface-stroke hover:border-primary hover:bg-primary-50 rounded-card transition-all text-left group"
            >
              <div className="flex justify-between items-start mb-2">
                <span className="font-semibold text-sm sm:text-base text-copy-default break-words">{key}</span>
                <ArrowRight size={14} className="sm:w-4 sm:h-4 text-copy-muted group-hover:text-primary flex-shrink-0 ml-2" />
              </div>
              <span className="text-xs sm:text-sm text-copy-muted">{audiences[key].count} Customers</span>
              {audiences[key].note && (
                <span className="block text-xs text-warning mt-1">{audiences[key].note}</span>
              )}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // --- Campaign Editor View (inline) ---
  if (viewMode === 'editor' && campaignRecommendation) {
    return (
      <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-500 max-w-6xl mx-auto">
        <div className="flex items-center gap-2 sm:gap-4">
          <button onClick={handleBackToAudience} className="p-2 hover:bg-surface-page rounded-full text-copy-muted flex-shrink-0">
            <ArrowLeft size={20} className="sm:w-6 sm:h-6" />
          </button>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl sm:text-2xl font-semibold text-copy-default">Create Campaign</h2>
            <p className="text-sm sm:text-base text-copy-muted">Customize your {campaignRecommendation.recommendation.campaignType.toLowerCase()} for {selectedAudience} customers.</p>
          </div>
        </div>

        <CampaignEditorInline
          recommendation={campaignRecommendation.recommendation}
          offer={editedContent?.offer || campaignRecommendation.offer}
          channels={editedContent?.channels || campaignRecommendation.channels}
          onCancel={handleBackToAudience}
          onSave={handleSaveEditor}
          initialChannel="sms"
        />
      </div>
    );
  }

  // Fallback
  return null;
};

export default Campaigns;

