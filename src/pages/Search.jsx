import { useState, useEffect, useRef } from 'react';
import { Calendar, Sparkles, AlertTriangle, AlertCircle, DollarSign, Car, Download, Megaphone, TrendingUp, ArrowLeft, RefreshCw } from 'lucide-react';
import Card from '../components/ui/Card';
import ScoreBadge from '../components/ui/ScoreBadge';
import ikonMark from '../assets/Ikon_Mark.png';
import { searchAIRecommendation, regenerateRecommendation } from '../services/aiSearchService.js';
import RecommendationCard from '../components/search/RecommendationCard';
import CampaignEditor from '../components/search/CampaignEditor';
import { GridBackground } from '../components/ui/GridBackground';
import { maskName, maskVin } from '../lib/utils';
import ChartRenderer from '../components/search/ChartRenderer';

// Backend URL for the Stephen Wade Group real DMS chatbot
const CHATBOT_API_URL = 'https://atlas-ai-demo.onrender.com';

// Conversation starters for mock-data accounts (Prestige Toyota, Luxury Honda, Elite Ford)
const conversationStarters = [
  "Show me active defectors in the last 30 days",
  "Show me customers likely to return",
  "Show me high-value customers needing service",
  "Show me customers affected by safety recalls"
];

// Conversation starters for Stephen Wade Group (real DMS data)
const stephenWadeConversationStarters = [
  "List all make, model, year of vehicles in inventory on Jan 4 2026",
  "Which service advisor handled the most ROs?",
  "How many cars are currently in inventory?",
  "What are the top 5 service types performed?"
];

// Dynamic text rotation messages
const rotatingTexts = [
  "Spot defection risks today",
  "Chase yesterday's lost customers",
  "Let's make money today",
  "Need more appointments today?"
];

const Search = ({ customers = [], selectedAccount, onLaunchCampaign }) => {
  const isStephenWadeAccount = selectedAccount?.id === 'stephen-wade-group';

  // Stores the plain-text answer returned by the real DMS backend
  const [swAnswer, setSwAnswer] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [aiRecommendation, setAiRecommendation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Thinking...');
  const [error, setError] = useState(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [editedContent, setEditedContent] = useState(null);
  const [showRecommendationCard, setShowRecommendationCard] = useState(true);
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState(rotatingTexts[0]);
  const [isTyping, setIsTyping] = useState(false);
  const typewriterTimeoutRef = useRef(null);
  const rotationTimeoutRef = useRef(null);

  // Pre-warm the Render backend as soon as the page loads so the first question is fast
  useEffect(() => {
    if (isStephenWadeAccount) {
      fetch(`${CHATBOT_API_URL}/health`).catch(() => {});
    }
  }, [isStephenWadeAccount]);

  const _processQuery = (query, timePeriod, customersList) => {
    if (!query.trim() || !customersList || customersList.length === 0) {
      return null;
    }

    const lowerQuery = query.toLowerCase();
    let filtered = [...customersList];
    let queryType = 'general';
    let summaryText = '';
    let opportunityValue = 0;
    let primaryAction = 'Launch Campaign';
    let statusFilter = null;

    // Check for combined attributes
    const isHighValue = lowerQuery.includes('high value') || lowerQuery.includes('high-value');
    const isAtRisk = lowerQuery.includes('at-risk') || lowerQuery.includes('at risk');
    const isUrgent = lowerQuery.includes('urgent') || lowerQuery.includes('immediate');

    // Parse keywords - check for status first, then apply additional filters
    if (lowerQuery.includes('defector') || lowerQuery.includes('defect')) {
      filtered = filtered.filter(c => c.status === 'Active Defector');
      queryType = 'defectors';
      statusFilter = 'Active Defector';
      
      // Apply additional filters
      if (isHighValue) {
        filtered = filtered.filter(c => c.segment === 'High Value');
      }
      if (isAtRisk) {
        filtered = filtered.filter(c => c.segment === 'At Risk' || c.retentionScore < 50);
      }
      
      const totalRisk = filtered.reduce((sum, c) => sum + (c.revenue || 0) * 12, 0);
      opportunityValue = totalRisk;
      const valueQualifier = isHighValue ? 'high value ' : isAtRisk ? 'at-risk ' : '';
      summaryText = `These ${filtered.length} ${valueQualifier}customer${filtered.length !== 1 ? 's' : ''} visited competitors. Run this campaign to win them back.`;
      primaryAction = 'Launch Win-back Campaign';
    } else if (lowerQuery.includes('service declined') || (lowerQuery.includes('service') && lowerQuery.includes('declined'))) {
      filtered = filtered.filter(c => c.status === 'Service declined');
      queryType = 'service-declined';
      statusFilter = 'Service declined';
      
      // Apply additional filters
      if (isHighValue) {
        filtered = filtered.filter(c => c.segment === 'High Value');
      }
      
      const totalRevenue = filtered.reduce((sum, c) => sum + (c.revenue || 0) * 1.2, 0);
      opportunityValue = totalRevenue;
      const valueQualifier = isHighValue ? 'high value ' : '';
      summaryText = `Re-engagement Opportunity: ${filtered.length} ${valueQualifier}customer${filtered.length !== 1 ? 's' : ''} who declined service. Follow up to re-engage.`;
      primaryAction = 'Launch Re-engagement Campaign';
    } else if (lowerQuery.includes('service due') || (lowerQuery.includes('service') && !lowerQuery.includes('declined'))) {
      filtered = filtered.filter(c => c.status === 'Service Due');
      queryType = 'service';
      statusFilter = 'Service Due';
      
      // Apply additional filters
      if (isHighValue) {
        filtered = filtered.filter(c => c.segment === 'High Value');
      }
      if (isAtRisk) {
        filtered = filtered.filter(c => c.segment === 'At Risk' || c.retentionScore < 50);
      }
      
      const totalRevenue = filtered.reduce((sum, c) => sum + (c.revenue || 0) * 1.5, 0);
      opportunityValue = totalRevenue;
      const valueQualifier = isHighValue ? 'high value ' : isAtRisk ? 'at-risk ' : '';
      summaryText = `Service Opportunity: ${filtered.length} ${valueQualifier}customer${filtered.length !== 1 ? 's' : ''} due for service.`;
      primaryAction = 'Launch Service Campaign';
    } else if (lowerQuery.includes('recall') || lowerQuery.includes('recalls')) {
      filtered = filtered.filter(c => c.status === 'Open Recall');
      queryType = 'recalls';
      statusFilter = 'Open Recall';
      
      // Apply additional filters for urgency
      if (isUrgent || lowerQuery.includes('priority') || lowerQuery.includes('safety')) {
        // Keep all recall customers as they're all urgent
      }
      
      opportunityValue = 0; // Recalls don't generate revenue
      const urgencyQualifier = isUrgent ? 'urgent ' : 'high priority ';
      summaryText = `Safety Priority: ${filtered.length} ${urgencyQualifier}recall${filtered.length !== 1 ? 's' : ''} requiring immediate action.`;
      primaryAction = 'Launch Recall Campaign';
    } else if (lowerQuery.includes('toyota')) {
      filtered = filtered.filter(c => c.vehicle.toLowerCase().includes('toyota'));
      queryType = 'inventory';
      const totalRevenue = filtered.reduce((sum, c) => sum + (c.revenue || 0), 0);
      opportunityValue = totalRevenue;
      summaryText = `Inventory Analysis: ${filtered.length} Toyota vehicle${filtered.length !== 1 ? 's' : ''} found.`;
      primaryAction = 'View Details';
    } else if (lowerQuery.includes('tesla') || lowerQuery.includes('ev owner')) {
      filtered = filtered.filter(c => c.vehicle.toLowerCase().includes('tesla') || c.vehicle.toLowerCase().includes('ev'));
      queryType = 'inventory';
      const totalRevenue = filtered.reduce((sum, c) => sum + (c.revenue || 0), 0);
      opportunityValue = totalRevenue;
      summaryText = `EV Analysis: ${filtered.length} EV owner${filtered.length !== 1 ? 's' : ''} found.`;
      primaryAction = 'View Details';
    } else if (lowerQuery.includes('risk customer')) {
      filtered = filtered.filter(c => c.segment === 'At Risk' || c.retentionScore < 50);
      queryType = 'risk';
      const totalRisk = filtered.reduce((sum, c) => sum + (c.revenue || 0) * 12, 0);
      opportunityValue = totalRisk;
      summaryText = `Risk Alert: ${filtered.length} at-risk customer${filtered.length !== 1 ? 's' : ''} identified.`;
      primaryAction = 'Launch Retention Campaign';
    } else {
      // No specific match
      return null;
    }

    return {
      customers: filtered,
      queryType,
      summaryText,
      opportunityValue,
      primaryAction,
      statusFilter
    };
  };

  const handleSearch = async (e) => {
    if (e) {
      e.preventDefault();
    }
    if (!searchQuery.trim()) {
      setAiRecommendation(null);
      setSearchResults(null);
      setSwAnswer(null);
      setError(null);
      return;
    }

    setIsLoading(true);
    setLoadingMessage('Thinking...');
    setError(null);
    setAiRecommendation(null);
    setSearchResults(null);
    setSwAnswer(null);

    // Stephen Wade Group: call the real DMS backend instead of the mock service
    if (isStephenWadeAccount) {
      // After 8s with no response, show a friendlier "waking up" message
      const slowTimer = setTimeout(() => setLoadingMessage('Connecting to server, please wait...'), 8000);
      try {
        const response = await fetch(`${CHATBOT_API_URL}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: searchQuery,
          }),
        });
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.detail || `Server error ${response.status}`);
        }
        const data = await response.json();
        clearTimeout(slowTimer);
        setSwAnswer({
          answer: data.answer,
          sql: data.sql_used,
          isStrategy: data.is_strategy,
          rows: data.rows || [],
          columns: data.columns || [],
          chartConfig: data.chart_config || null,
        });
      } catch (err) {
        clearTimeout(slowTimer);
        setError(err.message || 'Could not reach the DMS backend. Make sure it is running.');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    try {
      const recommendation = await searchAIRecommendation(searchQuery, customers);
      if (recommendation) {
        setAiRecommendation(recommendation);
        setShowRecommendationCard(true); // Show card when new recommendation loads
      } else {
        setError('No recommendation found — try refining your query');
      }
    } catch (err) {
      setError(err.message || 'AI service failed — please try again');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (!searchQuery.trim()) return;
    
    setIsRegenerating(true);
    setError(null);

    try {
      const recommendation = await regenerateRecommendation(searchQuery, customers);
      if (recommendation) {
        setAiRecommendation(recommendation);
        setShowRecommendationCard(true); // Show card when regenerated
      } else {
        setError('No recommendation found — try refining your query');
      }
    } catch (err) {
      setError(err.message || 'AI service failed — please try again');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleLaunchAsIs = (channel = 'Email') => {
    if (onLaunchCampaign && aiRecommendation) {
      const campaignData = {
        name: aiRecommendation.recommendation.title || aiRecommendation.recommendation.campaignType,
        campaignType: aiRecommendation.recommendation.campaignType,
        audience: aiRecommendation.recommendation.audience?.segments?.[0]?.name || 'Custom Audience',
        channel: channel,
        customerCount: aiRecommendation.customers?.length || aiRecommendation.recommendation.audience?.totalCustomers || 0,
        potentialRevenue: (aiRecommendation.customers?.length || 0) * 150 // Estimated revenue
      };
      onLaunchCampaign(campaignData);
    }
  };

  const handlePreviewEdit = () => {
    setEditorOpen(true);
  };

  const handleSaveEditor = (savedContent, selectedChannel) => {
    setEditedContent(savedContent);
    // Update the recommendation with edited content
    if (aiRecommendation) {
      setAiRecommendation({
        ...aiRecommendation,
        channels: savedContent.channels,
        offer: savedContent.offer
      });
    }
    setEditorOpen(false);
    
    // Launch the campaign with the selected channel
    if (onLaunchCampaign && aiRecommendation) {
      const channelMap = {
        'sms': 'SMS',
        'email': 'Email',
        'push': 'Push Notification',
        'call': 'Call List'
      };
      
      const campaignData = {
        name: aiRecommendation.recommendation.title || aiRecommendation.recommendation.campaignType,
        campaignType: aiRecommendation.recommendation.campaignType,
        audience: aiRecommendation.recommendation.audience?.segments?.[0]?.name || 'Custom Audience',
        channel: channelMap[selectedChannel] || 'Email',
        customerCount: aiRecommendation.customers?.length || aiRecommendation.recommendation.audience?.totalCustomers || 0,
        potentialRevenue: (aiRecommendation.customers?.length || 0) * 150
      };
      onLaunchCampaign(campaignData);
    }
  };

  const handleDismiss = () => {
    // Just hide the recommendation card, keep the data and table visible
    setShowRecommendationCard(false);
  };

  const handleBackToSearch = () => {
    setAiRecommendation(null);
    setSearchResults(null);
    setSwAnswer(null);
    setSearchQuery('');
    setError(null);
    setShowRecommendationCard(true);
  };

  const handleExportCSVForAI = () => {
    if (!aiRecommendation || !aiRecommendation.customers || aiRecommendation.customers.length === 0) {
      alert('No customers to export.');
      return;
    }

    const headers = [
      'ID',
      'Name',
      'Vehicle',
      'VIN',
      'Status',
      'Segment',
      'Retention Score',
      'Revenue',
      'Mileage',
      'Distance (mi)',
      'Last Service Date',
      'Next Service Due'
    ];

    const escapeCsvValue = (value) => {
      if (value === null || value === undefined) return '';
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    };

    const rows = aiRecommendation.customers.map(customer => {
      return [
        customer.id,
        customer.name,
        customer.vehicle,
        customer.vin,
        customer.status,
        customer.segment,
        customer.retentionScore,
        customer.revenue,
        customer.mileage,
        customer.distance,
        customer.lastServiceDate,
        customer.nextServiceDue
      ];
    });

    const csvContent = [
      headers.map(escapeCsvValue).join(','),
      ...rows.map(row => row.map(escapeCsvValue).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `ai-recommendation-customers-${timestamp}.csv`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAISearch = async (e, query) => {
    if (e) {
      e.preventDefault();
    }
    const searchText = query || searchQuery;
    if (!searchText.trim()) {
      setAiRecommendation(null);
      setSearchResults(null);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    setAiRecommendation(null);
    setSearchResults(null);

    try {
      const recommendation = await searchAIRecommendation(searchText, customers);
      if (recommendation) {
        setAiRecommendation(recommendation);
        setShowRecommendationCard(true);
      } else {
        setError('No recommendation found — try refining your query');
      }
    } catch (err) {
      setError(err.message || 'AI service failed — please try again');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePromptClick = (prompt) => {
    // Only populate the input field, user clicks "Ask" to proceed
    setSearchQuery(prompt);
  };

  const handleExportCSV = () => {
    if (!searchResults || searchResults.customers.length === 0) {
      alert('No customers to export.');
      return;
    }

    const headers = [
      'ID',
      'Name',
      'Vehicle',
      'VIN',
      'Status',
      'Segment',
      'Retention Score',
      'Revenue',
      'Mileage',
      'Distance (mi)',
      'Last Service Date',
      'Next Service Due'
    ];

    const escapeCsvValue = (value) => {
      if (value === null || value === undefined) return '';
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    };

    const rows = searchResults.customers.map(customer => {
      return [
        customer.id,
        customer.name,
        customer.vehicle,
        customer.vin,
        customer.status,
        customer.segment,
        customer.retentionScore,
        customer.revenue,
        customer.mileage,
        customer.distance,
        customer.lastServiceDate,
        customer.nextServiceDue
      ];
    });

    const csvContent = [
      headers.map(escapeCsvValue).join(','),
      ...rows.map(row => row.map(escapeCsvValue).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `search-results-${timestamp}.csv`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleLaunchCampaign = () => {
    if (onLaunchCampaign && searchResults) {
      const campaignData = {
        name: `${searchResults.statusFilter || 'Custom'} Campaign`,
        campaignType: searchResults.queryType || 'General',
        audience: searchResults.statusFilter || 'Custom Audience',
        channel: 'Email',
        customerCount: searchResults.customers?.length || 0,
        potentialRevenue: searchResults.opportunityValue || 0
      };
      onLaunchCampaign(campaignData);
    }
  };


  // Typewriter effect and rotation logic
  const isInitialMount = useRef(true);
  
  useEffect(() => {
    if (searchResults || aiRecommendation || isLoading) {
      // Don't animate when showing results or loading
      return;
    }

    const getRotationInterval = () => {
      // Fixed interval of 7 seconds
      return 7000;
    };

    const currentText = rotatingTexts[currentTextIndex];
    
    // On initial mount, just set the text without animation
    if (isInitialMount.current) {
      setDisplayedText(currentText);
      setIsTyping(false);
      isInitialMount.current = false;
      
      // Schedule first rotation
      const waitTime = getRotationInterval();
      rotationTimeoutRef.current = setTimeout(() => {
        setCurrentTextIndex((prevIndex) => (prevIndex + 1) % rotatingTexts.length);
      }, waitTime);
      
      return () => {
        if (rotationTimeoutRef.current) {
          clearTimeout(rotationTimeoutRef.current);
        }
      };
    }

    // For subsequent rotations, animate with typewriter effect
    let charIndex = 0;
    setIsTyping(true);
    setDisplayedText('');

    // Typewriter effect
    const typeNextChar = () => {
      if (charIndex < currentText.length) {
        setDisplayedText(currentText.slice(0, charIndex + 1));
        charIndex++;
        typewriterTimeoutRef.current = setTimeout(typeNextChar, 80); // 80ms per character
      } else {
        setIsTyping(false);
        
        // After typing completes, wait 7 seconds then rotate
        const waitTime = getRotationInterval();
        rotationTimeoutRef.current = setTimeout(() => {
          setCurrentTextIndex((prevIndex) => (prevIndex + 1) % rotatingTexts.length);
        }, waitTime);
      }
    };

    typeNextChar();

    return () => {
      if (typewriterTimeoutRef.current) {
        clearTimeout(typewriterTimeoutRef.current);
      }
      if (rotationTimeoutRef.current) {
        clearTimeout(rotationTimeoutRef.current);
      }
    };
  }, [currentTextIndex, searchResults, aiRecommendation, isLoading]);

  // Stephen Wade Group: show answer + optional data table from real DMS backend
  if (swAnswer) {
    const hasTable = swAnswer.rows && swAnswer.rows.length > 0 && swAnswer.columns && swAnswer.columns.length > 0;
    return (
      <div className="min-h-screen bg-surface-page">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <button
              onClick={handleBackToSearch}
              className="flex items-center gap-2 text-copy-muted hover:text-copy-default transition-colors"
            >
              <ArrowLeft size={20} />
              <span className="font-medium">Back to Search</span>
            </button>
          </div>

          {/* Answer card */}
          <Card className="p-6 mb-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-copy-muted mb-3">
              Atlas AI
            </p>
            {swAnswer.isStrategy ? (
              <div
                className="prose prose-sm max-w-none text-copy-default leading-relaxed"
                dangerouslySetInnerHTML={{ __html: swAnswer.answer }}
              />
            ) : (
              <p className="text-copy-default leading-relaxed whitespace-pre-wrap">
                {swAnswer.answer}
              </p>
            )}
          </Card>

          {/* Chart — auto-rendered when data has analytical structure */}
          {!swAnswer.isStrategy && swAnswer.chartConfig && (
            <Card className="p-6 mb-6">
              <ChartRenderer chartConfig={swAnswer.chartConfig} rows={swAnswer.rows} />
            </Card>
          )}

          {/* Data table — only rendered when SQL returned rows */}
          {hasTable && (
            <Card className="overflow-hidden">
              <div className="px-6 py-3 border-b border-surface-stroke flex items-center justify-between">
                <p className="text-sm font-semibold text-copy-default">
                  Results
                  <span className="ml-2 text-xs font-normal text-copy-muted">
                    ({swAnswer.rows.length} row{swAnswer.rows.length !== 1 ? 's' : ''})
                  </span>
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-surface-page border-b border-surface-stroke">
                    <tr>
                      {swAnswer.columns.map((col) => (
                        <th
                          key={col}
                          className="px-4 py-3 text-left text-xs font-semibold text-copy-default uppercase tracking-wider whitespace-nowrap"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-surface-container divide-y divide-surface-stroke">
                    {swAnswer.rows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-surface-page transition-colors">
                        {swAnswer.columns.map((col) => (
                          <td
                            key={col}
                            className="px-4 py-3 text-copy-default whitespace-nowrap max-w-[240px] truncate"
                            title={row[col] != null ? String(row[col]) : ''}
                          >
                            {row[col] != null ? String(row[col]) : <span className="text-copy-muted">—</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      </div>
    );
  }

  // Loading State
  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface-page">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="relative">
              <Sparkles
                className="w-16 h-16 text-copy-muted animate-spin"
                style={{ filter: 'drop-shadow(0 0 8px rgba(111, 111, 119, 0.3))' }}
              />
            </div>
            <div className="text-center">
              <p className="text-copy-default font-medium text-lg">{isStephenWadeAccount ? 'Atlas AI' : 'Running Ikon IQ'}</p>
              <p className="text-copy-muted text-sm mt-1">{isStephenWadeAccount ? loadingMessage : 'Analyzing your query and generating recommendations...'}</p>
            </div>
            <div className="w-full space-y-4 mt-8">
              {/* Skeleton loader for recommendation card */}
              <Card className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-surface-stroke rounded w-1/4"></div>
                  <div className="h-8 bg-surface-stroke rounded w-3/4"></div>
                  <div className="h-4 bg-surface-stroke rounded w-full"></div>
                  <div className="h-4 bg-surface-stroke rounded w-5/6"></div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                    <div className="space-y-3">
                      <div className="h-4 bg-surface-stroke rounded w-1/3"></div>
                      <div className="h-12 bg-surface-stroke rounded"></div>
                    </div>
                    <div className="space-y-3">
                      <div className="h-4 bg-surface-stroke rounded w-1/3"></div>
                      <div className="h-32 bg-surface-stroke rounded"></div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error State
  if (error && !isLoading) {
    return (
      <div className="min-h-screen bg-surface-page">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Card className="p-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <AlertCircle className="w-12 h-12 text-danger" />
              <h3 className="text-lg font-semibold text-copy-default">{error}</h3>
              <button
                onClick={handleSearch}
                className="px-4 py-2 bg-primary hover:bg-primary-secondary text-white rounded-button transition-colors text-sm font-semibold uppercase tracking-wider"
              >
                Retry
              </button>
              <button
                onClick={handleBackToSearch}
                className="text-sm text-copy-muted hover:text-copy-default transition-colors"
              >
                Back to Search
              </button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // AI Recommendation View
  if (aiRecommendation) {
    return (
      <div className="min-h-screen bg-surface-page">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6 flex items-center justify-between">
            <button
              onClick={handleBackToSearch}
              className="flex items-center gap-2 text-copy-muted hover:text-copy-default transition-colors"
            >
              <ArrowLeft size={20} />
              <span className="font-medium">Back to Search</span>
            </button>
            {aiRecommendation.customers && aiRecommendation.customers.length > 0 && (
              <button
                onClick={handleExportCSVForAI}
                className="flex items-center gap-2 px-4 py-2 bg-surface-container border border-primary text-primary rounded-button hover:bg-primary-50 transition-colors text-sm font-semibold uppercase tracking-wider"
              >
                <Download size={16} />
                Export to CSV
              </button>
            )}
          </div>
          
          {showRecommendationCard && (
            <RecommendationCard
              recommendation={aiRecommendation.recommendation}
              offer={editedContent?.offer || aiRecommendation.offer}
              channels={editedContent?.channels || aiRecommendation.channels}
              onLaunch={handleLaunchAsIs}
              onPreviewEdit={handlePreviewEdit}
              onDismiss={handleDismiss}
              onRegenerate={handleRegenerate}
              isRegenerating={isRegenerating}
            />
          )}

          {/* Customer Table */}
          {aiRecommendation.customers && aiRecommendation.customers.length > 0 && (
            <div className="mt-6">
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-surface-page border-b border-surface-stroke">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-copy-default uppercase tracking-wider">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-copy-default uppercase tracking-wider">Vehicle</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-copy-default uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-copy-default uppercase tracking-wider">Retention Score</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-copy-default uppercase tracking-wider">Segment</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-copy-default uppercase tracking-wider">Revenue</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-copy-default uppercase tracking-wider">VIN</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-copy-default uppercase tracking-wider">Distance</th>
                      </tr>
                    </thead>
                    <tbody className="bg-surface-container divide-y divide-surface-stroke">
                      {aiRecommendation.customers.map((customer) => (
                        <tr key={customer.id} className="hover:bg-surface-page transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-copy-default">{maskName(customer.name)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-copy-muted">{customer.vehicle}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                customer.status === 'Service Due'
                                  ? 'bg-success-100 text-success-700'
                                  : customer.status === 'Active Defector'
                                  ? 'bg-danger-100 text-danger-700'
                                  : customer.status === 'Open Recall'
                                  ? 'bg-warning-100 text-warning-700'
                                  : customer.status === 'Service declined'
                                  ? 'bg-orange-100 text-orange-700'
                                  : customer.status === 'Loyal'
                                  ? 'bg-primary-100 text-primary-700'
                                  : 'bg-surface-stroke text-copy-muted'
                              }`}
                            >
                              {customer.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <ScoreBadge score={customer.retentionScore} />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-copy-muted">{customer.segment}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-copy-default">${customer.revenue.toLocaleString()}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-copy-muted font-mono">{maskVin(customer.vin)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-copy-muted">{customer.distance}</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}
        </div>

        {/* Campaign Editor Modal */}
        {editorOpen && aiRecommendation && (
          <CampaignEditor
            recommendation={aiRecommendation.recommendation}
            offer={editedContent?.offer || aiRecommendation.offer}
            channels={editedContent?.channels || aiRecommendation.channels}
            onClose={() => setEditorOpen(false)}
            onSave={handleSaveEditor}
            initialChannel="sms"
          />
        )}
      </div>
    );
  }

  // Legacy Results View (keeping for backward compatibility)
  if (searchResults && searchResults.customers.length > 0) {
    return (
      <div className="min-h-screen bg-surface-page">
        <div className="bg-surface-container border-b border-surface-stroke sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <button
                onClick={handleBackToSearch}
                className="flex items-center gap-2 text-copy-muted hover:text-copy-default transition-colors"
              >
                <ArrowLeft size={20} />
                <span className="font-medium">Back to Search</span>
              </button>
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-2 px-4 py-2 bg-surface-container border border-primary text-primary rounded-button hover:bg-primary-50 transition-colors text-sm font-semibold uppercase tracking-wider"
              >
                <Download size={16} />
                Export to CSV
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Summary Section */}
          <div className="mb-6">
            <Card className="p-6 bg-gradient-to-r from-primary-50 to-success-50 border-primary-200">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-copy-default mb-2">
                    {searchResults.summaryText}
                  </h2>
                  <p className="text-sm text-copy-muted">
                    Found {searchResults.customers.length} customer{searchResults.customers.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="ml-4 flex flex-col items-end gap-3">
                  {searchResults.opportunityValue > 0 && (
                    <div className="p-4 bg-surface-container rounded-button border border-success shadow-card">
                      <p className="text-xs text-success-700 font-medium mb-1">Opportunity Value</p>
                      <p className="text-2xl font-bold text-success">
                        ${searchResults.opportunityValue.toLocaleString()}
                      </p>
                    </div>
                  )}
                  <button
                    onClick={handleLaunchCampaign}
                    className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-secondary text-white rounded-button transition-colors text-sm font-semibold uppercase tracking-wider shadow-card"
                  >
                    <Megaphone size={16} />
                    Launch Campaign
                  </button>
                </div>
              </div>
            </Card>
          </div>

          {/* Results Table */}
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface-page border-b border-surface-stroke">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-copy-default uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-copy-default uppercase tracking-wider">Vehicle</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-copy-default uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-copy-default uppercase tracking-wider">Retention Score</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-copy-default uppercase tracking-wider">Segment</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-copy-default uppercase tracking-wider">Revenue</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-copy-default uppercase tracking-wider">VIN</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-copy-default uppercase tracking-wider">Distance</th>
                  </tr>
                </thead>
                <tbody className="bg-surface-container divide-y divide-surface-stroke">
                  {searchResults.customers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-surface-page transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-copy-default">{maskName(customer.name)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-copy-muted">{customer.vehicle}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            customer.status === 'Service Due'
                              ? 'bg-success-100 text-success-700'
                              : customer.status === 'Active Defector'
                              ? 'bg-danger-100 text-danger-700'
                              : customer.status === 'Open Recall'
                              ? 'bg-warning-100 text-warning-700'
                              : customer.status === 'Service declined'
                              ? 'bg-orange-100 text-orange-700'
                              : customer.status === 'Loyal'
                              ? 'bg-primary-100 text-primary-700'
                              : 'bg-surface-stroke text-copy-muted'
                          }`}
                        >
                          {customer.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <ScoreBadge score={customer.retentionScore} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-copy-muted">{customer.segment}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-copy-default">${customer.revenue.toLocaleString()}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-copy-muted font-mono">{maskVin(customer.vin)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-copy-muted">{customer.distance}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Search Interface View
  return (
    <GridBackground className="h-screen overflow-y-auto">
      <div className="flex flex-col items-center justify-center min-h-screen px-4 pb-8 pt-0 -mt-16">
        <div className="w-full max-w-4xl mx-auto">
          {/* Title */}
          <div className="flex flex-col items-center justify-center mb-8">
            <img
              src={ikonMark}
              alt="Ikon Mark"
              className="mb-6 h-24 w-auto"
            />
            <h1 className="text-3xl sm:text-4xl font-semibold text-copy-default text-center min-h-[3rem]">
              {displayedText}
              {isTyping && <span className="animate-pulse">|</span>}
            </h1>
          </div>

          {/* Search Input Area */}
          <div className="mb-8">
            <form onSubmit={handleSearch}>
              <div 
                className="w-full bg-white rounded-lg border border-zinc-900/10 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] relative"
                style={{ boxShadow: '0px 1px 2px 0px rgba(0,0,0,0.05), inset 0px -1px 0px 0px rgba(0,0,0,0.1)' }}
              >
                <div className="flex flex-col justify-between p-3 h-[118px]">
                  <textarea
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSearch(e);
                      }
                    }}
                    placeholder="Ask about a campaign, audience, defection, offering"
                    className="text-copy-default placeholder:text-copy-muted focus:outline-none text-base bg-transparent resize-none leading-[22px]"
                    rows={2}
                  />
                  <div className="flex justify-end items-center">
                    <button
                      type="submit"
                      className="flex items-center justify-center px-4 py-2 min-h-[36px] bg-primary hover:bg-primary-secondary text-white rounded-button transition-colors text-sm font-semibold uppercase tracking-wider"
                    >
                      Ask Atlas AI
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>

          {/* Conversation Starters */}
          <div className="flex flex-col gap-2 items-start w-full">
            <h2 className="text-base font-semibold text-copy-default">
              Conversation Starters
            </h2>
            <div className="grid grid-cols-2 gap-3 w-full">
              {(isStephenWadeAccount ? stephenWadeConversationStarters : conversationStarters).map((starter, index) => (
                <button
                  key={index}
                  onClick={() => handlePromptClick(starter)}
                  className="h-[70px] p-4 bg-white border border-surface-stroke rounded overflow-hidden text-left hover:border-primary hover:bg-primary-50 transition-colors cursor-pointer"
                >
                  <span className="text-sm text-copy-muted leading-[19px] line-clamp-2">
                    {starter}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </GridBackground>
  );
};

export default Search;
