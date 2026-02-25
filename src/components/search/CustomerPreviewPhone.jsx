import OfferCard from './OfferCard';
import connectLogo from '../../assets/connect.png';

const CustomerPreviewPhone = ({ channel, channels, offer }) => {
  if (!channel || !channels) return null;

  const channelData = channels[channel];

  // SMS Preview - iOS iMessage style
  if (channel === 'sms') {
    return (
      <div className="bg-slate-900 rounded-[2.5rem] p-2 w-[280px] mx-auto">
        {/* iPhone Frame */}
        <div className="bg-white rounded-[2rem] overflow-hidden h-[560px] flex flex-col">
          {/* Dynamic Island / Notch area */}
          <div className="bg-[#f2f2f7] pt-3 pb-2">
            <div className="w-[90px] h-[25px] bg-black rounded-full mx-auto"></div>
          </div>
          
          {/* iMessage Header */}
          <div className="bg-[#f2f2f7] px-4 py-2 border-b border-slate-200">
            <div className="flex items-center justify-center gap-2">
              <div className="w-8 h-8 rounded-full bg-slate-400 flex items-center justify-center">
                <span className="text-white text-xs font-medium">CM</span>
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-900">City Motors</p>
                <p className="text-[10px] text-slate-500">Text Message</p>
              </div>
            </div>
          </div>
          
          {/* Messages Area */}
          <div className="flex-1 bg-white overflow-y-auto">
            <div className="p-3 space-y-2">
              {/* Timestamp */}
              <p className="text-[10px] text-slate-400 text-center mb-3">Today 9:41 AM</p>
              
              {/* Incoming SMS bubble (gray - from business) */}
              <div className="flex justify-start">
                <div className="max-w-[85%]">
                  <div className="bg-[#e5e5ea] rounded-2xl rounded-bl-md px-3 py-2">
                    {channelData.headline && (
                      <p className="text-[15px] font-semibold text-black leading-tight mb-1">
                        {channelData.headline}
                      </p>
                    )}
                    <p className="text-[15px] text-black leading-snug whitespace-pre-wrap">
                      {channelData.body}
                    </p>
                  </div>
                  {offer && (
                    <div className="mt-2 max-w-full">
                      <OfferCard offer={offer} compact />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* iMessage Input Bar */}
          <div className="bg-[#f2f2f7] px-3 py-2 border-t border-slate-200">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-slate-300 flex items-center justify-center">
                <span className="text-slate-500 text-xs">+</span>
              </div>
              <div className="flex-1 bg-white rounded-full px-3 py-1.5 border border-slate-300">
                <p className="text-[13px] text-slate-400">Text Message</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Email Preview - iOS Mail app style
  if (channel === 'email') {
    return (
      <div className="bg-slate-900 rounded-[2.5rem] p-2 w-[280px] mx-auto">
        <div className="bg-white rounded-[2rem] overflow-hidden h-[560px] flex flex-col">
          {/* Dynamic Island / Notch area */}
          <div className="bg-[#f2f2f7] pt-3 pb-2">
            <div className="w-[90px] h-[25px] bg-black rounded-full mx-auto"></div>
          </div>
          
          {/* Mail Header */}
          <div className="bg-[#f2f2f7] px-3 py-2 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-blue-500 text-sm">&lt; Inbox</span>
              <span className="text-blue-500 text-sm">Archive</span>
            </div>
          </div>
          
          {/* Email Content - Scrollable */}
          <div className="flex-1 bg-white overflow-y-auto">
            <div className="p-3">
              {/* Email Header */}
              <div className="border-b border-slate-200 pb-3 mb-3">
                <div className="flex items-start gap-2 mb-2">
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-bold">CM</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900">City Motors</p>
                    <p className="text-[11px] text-slate-500 truncate">to: me</p>
                  </div>
                  <span className="text-[11px] text-slate-400 flex-shrink-0">9:41 AM</span>
                </div>
                <p className="text-[15px] font-semibold text-slate-900 leading-tight">{channelData.subject}</p>
              </div>
              
              {/* Email Body */}
              <div className="text-[14px] text-slate-700 whitespace-pre-wrap leading-relaxed">
                {channelData.body}
              </div>
              
              {offer && (
                <div className="mt-4">
                  <OfferCard offer={offer} compact />
                </div>
              )}
            </div>
          </div>
          
          {/* Mail Action Bar */}
          <div className="bg-[#f2f2f7] px-4 py-3 border-t border-slate-200">
            <div className="flex items-center justify-around">
              <span className="text-blue-500 text-[11px]">Reply</span>
              <span className="text-blue-500 text-[11px]">Forward</span>
              <span className="text-blue-500 text-[11px]">Archive</span>
              <span className="text-red-500 text-[11px]">Delete</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Push Notification Preview - iOS Lock Screen style
  if (channel === 'push') {
    return (
      <div className="bg-slate-900 rounded-[2.5rem] p-2 w-[280px] mx-auto">
        <div className="bg-slate-900 rounded-[2rem] overflow-hidden h-[560px] flex flex-col">
          {/* Dynamic Island */}
          <div className="pt-3 pb-2">
            <div className="w-[90px] h-[25px] bg-black rounded-full mx-auto"></div>
          </div>
          
          {/* Lock Screen */}
          <div className="flex-1 relative overflow-hidden">
            {/* iOS Wallpaper gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-slate-800 via-slate-700 to-slate-900"></div>
            
            {/* Time Display */}
            <div className="relative pt-8 text-center">
              <p className="text-[11px] text-white/80 font-medium tracking-wide">Friday, January 30</p>
              <p className="text-[72px] font-light text-white leading-none mt-1">9:41</p>
            </div>
            
            {/* Push Notification - iOS style */}
            <div className="relative mt-12 px-3">
              <div className="bg-white/90 backdrop-blur-xl rounded-2xl overflow-hidden shadow-lg">
                {/* Notification Header */}
                <div className="flex items-center gap-2 px-3 pt-3 pb-1">
                  <img 
                    src={connectLogo} 
                    alt="Connect" 
                    className="w-8 h-8 rounded-lg object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-semibold text-slate-900">Connect</span>
                      <span className="text-[11px] text-slate-400">now</span>
                    </div>
                  </div>
                </div>
                
                {/* Notification Content */}
                <div className="px-3 pb-3">
                  <p className="text-[15px] font-semibold text-slate-900 leading-tight">
                    {channelData.title}
                  </p>
                  <p className="text-[13px] text-slate-600 mt-0.5 line-clamp-3">
                    {channelData.text}
                  </p>
                </div>
              </div>
              
              {/* Older notification indicator */}
              <div className="mt-2 flex justify-center">
                <div className="w-10 h-1 bg-white/30 rounded-full"></div>
              </div>
            </div>
            
            {/* Bottom indicators */}
            <div className="absolute bottom-4 left-0 right-0">
              <div className="flex justify-center items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                  <span className="text-white text-xs">🔦</span>
                </div>
                <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                  <span className="text-white text-xs">📷</span>
                </div>
              </div>
              {/* Home indicator */}
              <div className="flex justify-center mt-4">
                <div className="w-32 h-1 bg-white rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Call Preview - iOS Incoming Call style
  if (channel === 'call') {
    return (
      <div className="bg-slate-900 rounded-[2.5rem] p-2 w-[280px] mx-auto">
        <div className="bg-slate-900 rounded-[2rem] overflow-hidden h-[560px] flex flex-col">
          {/* Dynamic Island */}
          <div className="pt-3 pb-2">
            <div className="w-[90px] h-[25px] bg-black rounded-full mx-auto"></div>
          </div>
          
          {/* Incoming Call Screen */}
          <div className="flex-1 bg-gradient-to-b from-slate-700 to-slate-900 flex flex-col items-center justify-between py-8 overflow-y-auto">
            <div className="flex flex-col items-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-slate-600 flex items-center justify-center">
                <span className="text-3xl">👤</span>
              </div>
              <div className="text-center">
                <p className="text-xl font-semibold text-white mb-1">
                  {channelData.callerIdName}
                </p>
                <p className="text-sm text-slate-400">mobile</p>
              </div>
            </div>
            
            {/* Voicemail Script Card */}
            <div className="px-3 w-full">
              <div className="bg-red-500/20 border border-red-500/40 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                  <p className="text-[10px] font-semibold text-red-300 uppercase tracking-wide">VOICEMAIL SCRIPT</p>
                </div>
                <p className="text-[13px] text-white/90 leading-relaxed">
                  {channelData.voicemailScript}
                </p>
              </div>
            </div>
            
            {/* Call Action Buttons */}
            <div className="flex items-center gap-8">
              <div className="flex flex-col items-center gap-1">
                <div className="w-14 h-14 rounded-full bg-red-500 flex items-center justify-center">
                  <span className="text-white text-xl">✕</span>
                </div>
                <span className="text-[10px] text-white">Decline</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="w-14 h-14 rounded-full bg-green-500 flex items-center justify-center">
                  <span className="text-white text-xl">📞</span>
                </div>
                <span className="text-[10px] text-white">Accept</span>
              </div>
            </div>
          </div>
          
          {/* Home indicator */}
          <div className="bg-slate-900 py-2">
            <div className="flex justify-center">
              <div className="w-32 h-1 bg-white/50 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default CustomerPreviewPhone;
