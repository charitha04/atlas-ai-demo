/**
 * Mock AI Search Service
 * Simulates an AI-powered search that returns structured campaign recommendations
 */

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Generate mock AI recommendation based on query
 */
const generateRecommendation = (query, customers = []) => {
  const lowerQuery = query.toLowerCase();
  
  // Determine campaign type and audience
  let campaignType = 'Service Campaign';
  let title = '';
  let description = '';
  let totalCustomers = 0;
  let segments = [];
  let metrics = [];
  let insights = [];
  let prediction = {};
  let offer = {};
  let channels = {};

  // Check for query patterns
  const isDefector = lowerQuery.includes('defector') || lowerQuery.includes('defect') || lowerQuery.includes('win back');
  const isServiceDue = lowerQuery.includes('service due') || (lowerQuery.includes('service') && !lowerQuery.includes('declined'));
  const isRecall = lowerQuery.includes('recall');
  const isHighValue = lowerQuery.includes('high value') || lowerQuery.includes('high-value');
  const isAtRisk = lowerQuery.includes('at-risk') || lowerQuery.includes('at risk');

  // Filter customers based on query
  let filteredCustomers = [...customers];
  
  if (isDefector) {
    filteredCustomers = filteredCustomers.filter(c => c.status === 'Active Defector');
    campaignType = 'Win-Back Campaign';
    totalCustomers = filteredCustomers.length || Math.floor(Math.random() * 200) + 300;
    
    if (isHighValue) {
      filteredCustomers = filteredCustomers.filter(c => c.segment === 'High Value');
      totalCustomers = filteredCustomers.length || Math.floor(Math.random() * 100) + 150;
    }
    
    title = isHighValue 
      ? 'Re-engage high-value defectors'
      : 'Win back active defectors';
    
    description = `Targeting ${totalCustomers} customer${totalCustomers !== 1 ? 's' : ''} who visited a competitor in the last 60 days with a personalized offer.`;
    
    segments = [
      {
        name: 'Active Defectors',
        description: isHighValue 
          ? 'High-value customers detected at competitors'
          : 'Identified via location geofencing',
        icon: 'defectors'
      },
      ...(isHighValue ? [{
        name: 'At-Risk / High Value',
        description: 'Avg Annual Spend: $1,200+',
        icon: 'highvalue'
      }] : [])
    ];
    
    metrics = [
      { label: 'Avg Distance', value: '12.5 mi' },
      { label: 'Days Since Visit', value: '23 days' }
    ];
    
    insights = [
      {
        label: 'AI Insight',
        text: `85% of these defections occurred within 15 miles. Local offers convert 2.4x better.`
      }
    ];
    
    prediction = {
      label: 'Performance Prediction',
      value: '18% of defectors',
      note: 'Similar campaigns recovered 18% of defectors'
    };
    
    offer = {
      title: '$25 Off Service',
      subtitle: 'Oil Change & Tire Rotation',
      expirationDays: 7,
      tier: 'Win-Back Tier 1',
      hasQRCode: true
    };
    
    channels = {
      sms: {
        headline: 'We\'ve missed you!',
        body: 'It\'s been a while! Come back for your regular maintenance and take $25 off your next Oil Change & Rotation. Valid this week only. Reply STOP to opt out.'
      },
      email: {
        subject: 'We\'ve missed you at City Motors',
        body: 'Hi there,\n\nIt\'s been a while since we\'ve seen you! We noticed you might be visiting other service centers, and we\'d love to welcome you back.\n\nAs a valued customer, we\'re offering you $25 off your next Oil Change & Tire Rotation service. This offer is valid for the next 7 days.\n\nSchedule your appointment today and let us take care of your vehicle.\n\nBest regards,\nCity Motors Team'
      },
      push: {
        title: 'Special Offer: $25 Off Service',
        text: 'Come back for your regular maintenance. Valid this week only!'
      },
      call: {
        callerIdName: 'We\'ve missed you at City Motors',
        voicemailScript: 'It\'s been a while! Come back for your regular maintenance and take $25 off your next Oil Change & Rotation. Valid this week only.'
      }
    };
    
  } else if (isServiceDue) {
    filteredCustomers = filteredCustomers.filter(c => c.status === 'Service Due');
    campaignType = 'Service Campaign';
    totalCustomers = filteredCustomers.length || Math.floor(Math.random() * 150) + 200;
    
    if (isHighValue) {
      filteredCustomers = filteredCustomers.filter(c => c.segment === 'High Value');
      totalCustomers = filteredCustomers.length || Math.floor(Math.random() * 80) + 100;
    }
    
    title = isHighValue
      ? 'Service reminder for high-value customers'
      : 'Service due reminder campaign';
    
    description = `Reach ${totalCustomers} customer${totalCustomers !== 1 ? 's' : ''} who are due for scheduled maintenance with timely reminders.`;
    
    segments = [
      {
        name: 'Service Due',
        description: isHighValue
          ? 'High-value customers with upcoming service'
          : 'Customers approaching service interval',
        icon: 'service'
      },
      ...(isAtRisk ? [{
        name: 'At-Risk Customers',
        description: 'Retention score below 50',
        icon: 'atrisk'
      }] : [])
    ];
    
    metrics = [
      { label: 'Avg Days Overdue', value: '12 days' },
      { label: 'Est. Revenue', value: `$${(totalCustomers * 150).toLocaleString()}` }
    ];
    
    insights = [
      {
        label: 'AI Insight',
        text: `Customers contacted within 5 days of service due date are 3.2x more likely to book.`
      }
    ];
    
    prediction = {
      label: 'Performance Prediction',
      value: '42% booking rate',
      note: 'Similar campaigns achieved 42% booking rate'
    };
    
    offer = {
      title: '$15 Off Service',
      subtitle: 'Any Scheduled Maintenance',
      expirationDays: 14,
      tier: 'Service Tier 1',
      hasQRCode: true
    };
    
    channels = {
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
    };
    
  } else if (isRecall) {
    filteredCustomers = filteredCustomers.filter(c => c.status === 'Open Recall');
    campaignType = 'Recall Campaign';
    totalCustomers = filteredCustomers.length || Math.floor(Math.random() * 50) + 25;
    
    title = 'Urgent safety recall notification';
    description = `Notify ${totalCustomers} customer${totalCustomers !== 1 ? 's' : ''} about critical safety recalls requiring immediate action.`;
    
    segments = [
      {
        name: 'Open Recalls',
        description: 'Safety-critical recalls requiring immediate attention',
        icon: 'recall'
      }
    ];
    
    metrics = [
      { label: 'Urgency Level', value: 'High' },
      { label: 'Avg Days Open', value: '45 days' }
    ];
    
    insights = [
      {
        label: 'AI Insight',
        text: `Multi-channel outreach (SMS + Call) increases recall completion by 67% compared to email alone.`
      }
    ];
    
    prediction = {
      label: 'Performance Prediction',
      value: '78% completion rate',
      note: 'Similar recall campaigns achieved 78% completion rate'
    };
    
    offer = {
      title: 'Free Recall Service',
      subtitle: 'Safety Inspection Included',
      expirationDays: 30,
      tier: 'Recall Priority',
      hasQRCode: false
    };
    
    channels = {
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
    };
    
  } else {
    // Default/fallback recommendation
    campaignType = 'General Campaign';
    totalCustomers = Math.floor(Math.random() * 100) + 50;
    title = 'Customer engagement campaign';
    description = `Engage ${totalCustomers} customer${totalCustomers !== 1 ? 's' : ''} with a targeted marketing campaign.`;
    
    segments = [
      {
        name: 'Target Audience',
        description: 'Customers matching your search criteria',
        icon: 'general'
      }
    ];
    
    metrics = [
      { label: 'Reach', value: `${totalCustomers} customers` }
    ];
    
    insights = [
      {
        label: 'AI Insight',
        text: `Personalized messaging increases engagement by 2.1x.`
      }
    ];
    
    prediction = {
      label: 'Performance Prediction',
      value: '25% engagement rate',
      note: 'Similar campaigns achieved 25% engagement rate'
    };
    
    offer = {
      title: '$20 Off Service',
      subtitle: 'Any Service',
      expirationDays: 10,
      tier: 'General Tier',
      hasQRCode: true
    };
    
    channels = {
      sms: {
        headline: 'Special Offer',
        body: 'Take $20 off your next service. Valid for 10 days. Reply STOP to opt out.'
      },
      email: {
        subject: 'Special Offer: $20 Off Your Next Service',
        body: 'Hi there,\n\nWe have a special offer for you: $20 off your next service. This offer is valid for the next 10 days.\n\nSchedule your appointment today!\n\nBest regards,\nCity Motors'
      },
      push: {
        title: 'Special Offer',
        text: 'Take $20 off your next service. Valid for 10 days!'
      },
      call: {
        callerIdName: 'City Motors',
        voicemailScript: 'Hi, this is City Motors. We have a special offer: $20 off your next service. Valid for 10 days. Please call us back at (555) 123-4567.'
      }
    };
  }

  return {
    query,
    customers: filteredCustomers,
    recommendation: {
      badge: 'AI Recommended',
      campaignType,
      title,
      description,
      audience: {
        totalCustomers,
        segments,
        metrics
      },
      insights,
      prediction
    },
    offer,
    channels
  };
};

/**
 * Mock AI search recommendation service
 * @param {string} query - User search query
 * @param {Array} customers - Optional customer list for filtering
 * @returns {Promise<Object>} AI recommendation object
 */
export const searchAIRecommendation = async (query, customers = []) => {
  // Simulate network delay
  await delay(1500 + Math.random() * 1000); // 1.5-2.5 seconds
  
  // Simulate occasional errors (5% chance)
  if (Math.random() < 0.05) {
    throw new Error('AI service temporarily unavailable. Please try again.');
  }
  
  // Handle empty queries
  if (!query || !query.trim()) {
    return null;
  }
  
  // Generate recommendation
  const recommendation = generateRecommendation(query, customers);
  
  // Simulate "no results" for very short or nonsensical queries
  if (query.trim().length < 3) {
    return null;
  }
  
  return recommendation;
};

/**
 * Regenerate recommendation for the same query
 * This allows for variation in AI responses
 */
export const regenerateRecommendation = async (query, customers = []) => {
  await delay(1200 + Math.random() * 800); // 1.2-2 seconds
  
  if (Math.random() < 0.05) {
    throw new Error('AI service temporarily unavailable. Please try again.');
  }
  
  if (!query || !query.trim() || query.trim().length < 3) {
    return null;
  }
  
  // Generate slightly varied recommendation
  return generateRecommendation(query, customers);
};
