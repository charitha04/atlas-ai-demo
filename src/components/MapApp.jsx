import React, { useState, useEffect, useRef } from 'react';
 
// --- Inline Icons ---
 
const IconX = ({ size = 24, className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M18 6 6 18"/><path d="m6 6 18 18"/></svg>
);
 
const IconCheck = ({ size = 24, className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="20 6 9 17 4 12"/></svg>
);
 
const IconCalendar = ({ size = 24, className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
);
 
const IconWrench = ({ size = 24, className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
);
 
const IconClock = ({ size = 24, className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
);
 
const IconNavigation = ({ size = 24, className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
);
 
const IconMessage = ({ size = 24, className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
);
 
const IconSend = ({ size = 24, className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
);
 
const IconLoader = ({ size = 24, className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`${className} animate-spin`}><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
);
 
const IconSearch = ({ size = 24, className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
);
 
// --- Constants & Data Helpers ---
 
const CENTER = [32.7357, -97.1081]; // Arlington/Dallas Area
 
const NAMES = ["John Smith", "Emma Johnson", "Michael Williams", "Sarah Brown", "David Jones", "Jennifer Garcia", "James Miller", "Lisa Davis", "Robert Rodriguez", "Maria Martinez"];
const MAKES = [
  { make: "Toyota", models: [{ name: "Camry", trims: ["LE", "SE", "XSE"] }, { name: "RAV4", trims: ["LE", "XLE", "Limited"] }, { name: "Tacoma", trims: ["SR5", "TRD Off-Road", "Limited"] }] },
  { make: "Honda", models: [{ name: "Civic", trims: ["Sport", "EX", "Touring"] }, { name: "CR-V", trims: ["LX", "EX-L", "Touring"] }, { name: "Accord", trims: ["LX", "Sport", "Touring"] }] },
  { make: "Ford", models: [{ name: "F-150", trims: ["XL", "XLT", "Lariat"] }, { name: "Explorer", trims: ["XLT", "Limited", "ST"] }, { name: "Mustang", trims: ["EcoBoost", "GT", "Mach 1"] }] }
];
 
const SERVICES = [
  "Oil Change & Filter", "Tire Rotation", "Brake Pad Replacement", "Cabin Air Filter", "Engine Tune-up", "Battery Replacement", "Wheel Alignment", "Transmission Fluid Flush"
];

// Parts mapping for each service type
const SERVICE_PARTS = {
  "Oil Change & Filter": [
    { name: "Engine Oil (5qt)", cost: 29.99 },
    { name: "Oil Filter", cost: 12.99 }
  ],
  "Tire Rotation": [
    { name: "Labor", cost: 25.00 }
  ],
  "Brake Pad Replacement": [
    { name: "Brake Pads (Front)", cost: 89.99 },
    { name: "Brake Pads (Rear)", cost: 79.99 },
    { name: "Labor", cost: 120.00 }
  ],
  "Cabin Air Filter": [
    { name: "Cabin Air Filter", cost: 24.99 },
    { name: "Labor", cost: 15.00 }
  ],
  "Engine Tune-up": [
    { name: "Spark Plugs (4x)", cost: 45.99 },
    { name: "Air Filter", cost: 19.99 },
    { name: "Labor", cost: 150.00 }
  ],
  "Battery Replacement": [
    { name: "Car Battery", cost: 149.99 },
    { name: "Labor", cost: 30.00 }
  ],
  "Wheel Alignment": [
    { name: "Labor", cost: 89.99 }
  ],
  "Transmission Fluid Flush": [
    { name: "Transmission Fluid (4qt)", cost: 39.99 },
    { name: "Transmission Filter", cost: 34.99 },
    { name: "Labor", cost: 95.00 }
  ]
};
 
const SERVICE_PROVIDERS = [
  "Toyota Dealership", "Toyota Dealership", "Toyota Dealership", // Weighted higher
  "Jiffy Lube",
  "Kwik Kar",
  "Firestone Complete Auto Care",
  "Valvoline Instant Oil Change",
  "Midas",
  "Pep Boys",
  "Christian Brothers Automotive",
  "Brake Check",
  "Service King",
  "NTB"
];
 
// Fallback zones in case API fails (e.g. CORS issues)
// Expanded to include 10 competitors + 1 Dealership
const FALLBACK_ZONES = [
  // 1. Dealership
  {
    id: 'fallback-dealer',
    type: 'dealership',
    name: 'Toyota Dealership',
    polygon: [
      [CENTER[0] + 0.002, CENTER[1] - 0.002],
      [CENTER[0] + 0.002, CENTER[1] + 0.002],
      [CENTER[0] - 0.002, CENTER[1] + 0.002],
      [CENTER[0] - 0.002, CENTER[1] - 0.002],
    ]
  },
  // 2. Jiffy Lube (North West)
  {
    id: 'fallback-jiffy',
    type: 'competitor',
    name: 'Jiffy Lube',
    polygon: [
      [CENTER[0] + 0.006, CENTER[1] - 0.007],
      [CENTER[0] + 0.007, CENTER[1] - 0.007],
      [CENTER[0] + 0.007, CENTER[1] - 0.006],
      [CENTER[0] + 0.006, CENTER[1] - 0.006],
    ]
  },
  // 3. Kwik Kar (South East)
  {
    id: 'fallback-kwik',
    type: 'competitor',
    name: 'Kwik Kar',
    polygon: [
      [CENTER[0] - 0.006, CENTER[1] + 0.006],
      [CENTER[0] - 0.007, CENTER[1] + 0.006],
      [CENTER[0] - 0.007, CENTER[1] + 0.007],
      [CENTER[0] - 0.006, CENTER[1] + 0.007],
    ]
  },
  // 4. Firestone (North East)
  {
    id: 'fallback-firestone',
    type: 'competitor',
    name: 'Firestone',
    polygon: [
      [CENTER[0] + 0.008, CENTER[1] + 0.005],
      [CENTER[0] + 0.009, CENTER[1] + 0.005],
      [CENTER[0] + 0.009, CENTER[1] + 0.006],
      [CENTER[0] + 0.008, CENTER[1] + 0.006],
    ]
  },
  // 5. Valvoline (South West)
  {
    id: 'fallback-valvoline',
    type: 'competitor',
    name: 'Valvoline',
    polygon: [
      [CENTER[0] - 0.008, CENTER[1] - 0.005],
      [CENTER[0] - 0.009, CENTER[1] - 0.005],
      [CENTER[0] - 0.009, CENTER[1] - 0.006],
      [CENTER[0] - 0.008, CENTER[1] - 0.006],
    ]
  },
  // 6. Midas (West)
  {
    id: 'fallback-midas',
    type: 'competitor',
    name: 'Midas',
    polygon: [
      [CENTER[0] + 0.001, CENTER[1] - 0.010],
      [CENTER[0] + 0.002, CENTER[1] - 0.010],
      [CENTER[0] + 0.002, CENTER[1] - 0.009],
      [CENTER[0] + 0.001, CENTER[1] - 0.009],
    ]
  },
  // 7. Pep Boys (East)
  {
    id: 'fallback-pepboys',
    type: 'competitor',
    name: 'Pep Boys',
    polygon: [
      [CENTER[0] - 0.001, CENTER[1] + 0.010],
      [CENTER[0] - 0.002, CENTER[1] + 0.010],
      [CENTER[0] - 0.002, CENTER[1] + 0.009],
      [CENTER[0] - 0.001, CENTER[1] + 0.009],
    ]
  },
  // 8. Christian Brothers (Far North)
  {
    id: 'fallback-christian',
    type: 'competitor',
    name: 'Christian Brothers',
    polygon: [
      [CENTER[0] + 0.012, CENTER[1] - 0.002],
      [CENTER[0] + 0.013, CENTER[1] - 0.002],
      [CENTER[0] + 0.013, CENTER[1] - 0.001],
      [CENTER[0] + 0.012, CENTER[1] - 0.001],
    ]
  },
  // 9. Brake Check (Far South)
  {
    id: 'fallback-brakecheck',
    type: 'competitor',
    name: 'Brake Check',
    polygon: [
      [CENTER[0] - 0.012, CENTER[1] + 0.002],
      [CENTER[0] - 0.013, CENTER[1] + 0.002],
      [CENTER[0] - 0.013, CENTER[1] + 0.001],
      [CENTER[0] - 0.012, CENTER[1] + 0.001],
    ]
  },
  // 10. Service King (South West 2)
  {
    id: 'fallback-serviceking',
    type: 'competitor',
    name: 'Service King',
    polygon: [
      [CENTER[0] - 0.005, CENTER[1] - 0.009],
      [CENTER[0] - 0.006, CENTER[1] - 0.009],
      [CENTER[0] - 0.006, CENTER[1] - 0.008],
      [CENTER[0] - 0.005, CENTER[1] - 0.008],
    ]
  },
  // 11. NTB (North East 2)
  {
    id: 'fallback-ntb',
    type: 'competitor',
    name: 'NTB',
    polygon: [
      [CENTER[0] + 0.005, CENTER[1] + 0.009],
      [CENTER[0] + 0.006, CENTER[1] + 0.009],
      [CENTER[0] + 0.006, CENTER[1] + 0.008],
      [CENTER[0] + 0.005, CENTER[1] + 0.008],
    ]
  }
];
 
// Helper: Check if a point [lat, lng] is inside a polygon (array of [lat, lng])
// Ray-casting algorithm
const isPointInPolygon = (point, vs) => {
  const x = point[0], y = point[1];
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i][0], yi = vs[i][1];
    const xj = vs[j][0], yj = vs[j][1];
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
};
 
// Generate a random coordinate near a center point, ensuring it doesn't overlap zones
const getRandomCoord = (center, zones, radius = 0.04) => {
  let safeLocation = null;
  let attempts = 0;
 
  // Collect all polygon coordinates from all zones into a flat array of arrays
  // zones is now: [{ type: 'dealership', polygon: [[lat,lng],...] }, ...]
  const allPolygons = zones.map(z => z.polygon);
 
  while (!safeLocation && attempts < 200) {
    const y0 = center[0];
    const x0 = center[1];
    const u = Math.random();
    const v = Math.random();
    const w = radius * Math.sqrt(u);
    const t = 2 * Math.PI * v;
    const x = w * Math.cos(t);
    const y = w * Math.sin(t);
    
    const candidate = [y0 + y, x0 + x];
    
    // Check if candidate is inside ANY zone
    const inZone = allPolygons.some(poly => isPointInPolygon(candidate, poly));
    
    const distFromCenter = Math.sqrt(Math.pow(y, 2) + Math.pow(x, 2));
 
    // Ensure not inside a zone AND keep a reasonable distance from absolute center
    // to avoid the "bullseye" effect if no zones exist at center
    if (!inZone && distFromCenter > 0.002) {
      safeLocation = candidate;
    }
    attempts++;
  }
  return safeLocation || [center[0] + 0.015, center[1] + 0.015];
};
 
const generateVehicles = (count, center, zones) => {
  return Array.from({ length: count }).map((_, i) => {
    const makeObj = MAKES[Math.floor(Math.random() * MAKES.length)];
    const modelObj = makeObj.models[Math.floor(Math.random() * makeObj.models.length)];
    const trim = modelObj.trims[Math.floor(Math.random() * modelObj.trims.length)];
    const mileage = Math.floor(Math.random() * 80000) + 5000;
    
    const historyCount = Math.floor(Math.random() * 4) + 1;
    const history = Array.from({ length: historyCount }).map((_, j) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (j * 4) - 1);
      const service = SERVICES[Math.floor(Math.random() * SERVICES.length)];
      const parts = SERVICE_PARTS[service] || [];
      const totalCost = parts.reduce((sum, part) => sum + part.cost, 0);
      return {
        date: date.toISOString().split('T')[0],
        service: service,
        provider: SERVICE_PROVIDERS[Math.floor(Math.random() * SERVICE_PROVIDERS.length)],
        mileage: Math.max(1000, mileage - ((j + 1) * 5000)),
        parts: parts,
        totalCost: totalCost
      };
    });
 
    return {
      id: i,
      owner: NAMES[Math.floor(Math.random() * NAMES.length)],
      year: 2018 + Math.floor(Math.random() * 7),
      make: makeObj.make,
      model: modelObj.name,
      trim: trim,
      mileage: mileage.toLocaleString(),
      nextService: SERVICES[Math.floor(Math.random() * SERVICES.length)],
      lastVisit: history[0].date,
      history: history,
      location: getRandomCoord(center, zones)
    };
  });
};

 
// Load local geofence GeoJSON from /public/geofences/TX.geojson
const loadLocalGeoJSONZones = async () => {
  try {
    const response = await fetch("/geofences/TX.geojson");
    const geojson = await response.json();

    const zones = [];

    geojson.features.forEach((feature, idx) => {
      if (!feature.geometry) return;

      let polygon = [];

      // GeoJSON is [lng, lat] — convert to Leaflet [lat, lng]
      if (feature.geometry.type === "Polygon") {
        polygon = feature.geometry.coordinates[0].map(([lng, lat]) => [lat, lng]);
      }

      if (feature.geometry.type === "MultiPolygon") {
        polygon = feature.geometry.coordinates[0][0].map(([lng, lat]) => [lat, lng]);
      }

      zones.push({
        id: feature.id || `local-${idx}`,
        type: feature.properties?.type || "competitor",
        name: feature.properties?.name || "Geofence Zone",
        polygon
      });
    });

    return zones;
  } catch (err) {
    console.error("GeoJSON Load Failed:", err);
    return [];
  }
};




// --- Main Component ---

export default function MapApp() {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const zoneLayersRef = useRef([]); // To keep track of added zone layers

  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [_selectedDealership, setSelectedDealership] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [_zones, setZones] = useState([]);
  const [isMapReady, setIsMapReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Text Modal State
  const [isTextModalOpen, setIsTextModalOpen] = useState(false);
  const [campaignText, setCampaignText] = useState("");
  
  // Service History Detail State
  const [expandedHistoryIndex, setExpandedHistoryIndex] = useState(null);
  
  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
 
  // Initialize Map Logic
  useEffect(() => {
    if (!mapContainerRef.current) return;
 
    const loadLeaflet = () => {
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }
 
      if (window.L && window.L.map) {
        setIsMapReady(true);
      } else {
        const scriptId = 'leaflet-js';
        if (!document.getElementById(scriptId)) {
          const script = document.createElement('script');
          script.id = scriptId;
          script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
          script.async = true;
          script.onload = () => setIsMapReady(true);
          document.body.appendChild(script);
        } else {
          const checkL = setInterval(() => {
            if (window.L && window.L.map) {
              clearInterval(checkL);
              setIsMapReady(true);
            }
          }, 100);
        }
      }
    };
 
    loadLeaflet();
  }, []);
 
  // Fetch Data & Initialize Map
  useEffect(() => {
    if (!isMapReady || mapInstanceRef.current || !mapContainerRef.current) return;
 
    const L = window.L;
    if (!L || typeof L.map !== 'function') return;
 
    // 1. Create Map
    const map = L.map(mapContainerRef.current, {
      zoomControl: false // Remove default zoom control
    }).setView(CENTER, 13);
    mapInstanceRef.current = map;

    // Add zoom control to bottom-right
    L.control.zoom({
      position: 'bottomright'
    }).addTo(map);
 
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(map);
 
    // 2. Fetch Zones (Local GeoJSON first → Overpass → Hardcoded fallback)
    const initData = async () => {
      setIsLoading(true);

      // Load your geofences only
      const activeZones = await loadLocalGeoJSONZones();
      setZones(activeZones);

      activeZones.forEach(zone => {
    const color =
      zone.type === "dealership" ? "#22c55e" : "#1A9375";

    const poly = L.polygon(zone.polygon, {
      color,
      fillColor: color,
      fillOpacity: 0.15,
      weight: 2
    }).addTo(map);

    // Tooltip still works
    poly.bindTooltip(zone.name, {
      permanent: false,
      direction: "center",
      className: `bg-transparent border-0 font-semibold text-xs ${
        zone.type === "dealership" ? "text-green-700" : "text-primary-700"
      }`
    });

    // Enable clicking on the dealership
    poly.on("click", () => {
      setSelectedDealership({
        name: zone.name,
        address: zone.address || zone.properties?.address || "Address not provided",
        type: zone.type,
        id: zone.id,
        inventory: [
          {
            id: 1,
            year: 2022,
            make: "Toyota",
            model: "Camry",
            trim: "XSE",
            img: "https://placehold.co/300x180"
          },
          {
            id: 2,
            year: 2021,
            make: "Toyota",
            model: "RAV4",
            trim: "SE Hybrid",
            img: "https://placehold.co/300x180"
          },
          {
            id: 3,
            year: 2020,
            make: "Toyota",
            model: "Tacoma",
            trim: "TRD Off-Road",
            img: "https://placehold.co/300x180"
          }
        ]
      });

      // close vehicle panel if open
      setSelectedVehicle(null);
    });

  zoneLayersRef.current.push(poly);
});

    // Now generate vehicles
    const newVehicles = generateVehicles(10, CENTER, activeZones);
    setVehicles(newVehicles);

    setIsLoading(false);
  };

  initData();

  setTimeout(() => { map.invalidateSize(); }, 100);

  }, [isMapReady]);

  // Render Vehicle Markers
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L || vehicles.length === 0) return;
    
    const L = window.L;
    const map = mapInstanceRef.current;
 
    // Clear existing markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
 
    const createIcon = (selected) => L.divIcon({
      className: 'custom-div-icon',
      html: `<div style="
        background-color: ${selected ? '#ef4444' : '#ffffff'};
        border: 2px solid ${selected ? '#ffffff' : '#ef4444'};
        border-radius: 50%;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
        transition: all 0.2s;
      ">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${selected ? '#ffffff' : '#ef4444'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
          <circle cx="7" cy="17" r="2" />
          <circle cx="17" cy="17" r="2" />
        </svg>
      </div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });
 
    vehicles.forEach(vehicle => {
      const isSelected = selectedVehicle?.id === vehicle.id;
      const marker = L.marker(vehicle.location, {
        icon: createIcon(isSelected)
      }).addTo(map);
 
      // Tooltip for Hover Preview
      const isLoyal = vehicle.history[0]?.provider === 'Toyota Dealership';
      marker.bindTooltip(`
        <div class="text-center min-w-[140px] font-sans">
          <div class="font-semibold text-slate-900 text-sm">${vehicle.owner}</div>
          <div class="text-xs text-slate-600">${vehicle.year} ${vehicle.make} ${vehicle.model}</div>
          ${isLoyal
            ? '<div class="text-[10px] text-green-600 font-semibold mt-1 uppercase">Toyota Dealership Service</div>'
            : '<div class="text-[10px] text-red-500 font-semibold mt-1 uppercase">External Service</div>'}
        </div>
      `, {
        direction: 'top',
        offset: [0, -20],
        opacity: 0.95,
        className: 'shadow-xl border-0 rounded-lg'
      });
 
      marker.on('click', () => {
        setSelectedVehicle(vehicle);
        setIsTextModalOpen(false);
        setCampaignText("");
        setExpandedHistoryIndex(null);
        map.flyTo([vehicle.location[0], vehicle.location[1]], 16, { duration: 1.5 });
      });
 
      markersRef.current.push(marker);
    });
 
  }, [vehicles, selectedVehicle]);
 
  const handleSendText = () => {
    setIsTextModalOpen(false);
    alert(`Campaign sent to ${selectedVehicle.owner}!`);
  };

  // Search functionality
  const searchVehicles = (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const lowerQuery = query.toLowerCase();
    const results = vehicles.filter(vehicle => {
      const searchableText = [
        vehicle.owner,
        vehicle.make,
        vehicle.model,
        vehicle.trim,
        vehicle.year.toString(),
        `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
        `${vehicle.make} ${vehicle.model}`,
        vehicle.mileage
      ].join(' ').toLowerCase();

      return searchableText.includes(lowerQuery);
    });

    setSearchResults(results);
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    searchVehicles(value);
  };

  const handleSelectVehicle = (vehicle) => {
    setSelectedVehicle(vehicle);
    setSearchQuery("");
    setSearchResults([]);
    setIsSearchFocused(false);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([vehicle.location[0], vehicle.location[1]], 16, { duration: 1.5 });
    }
  };
 
  return (
    <div className="flex h-screen w-full overflow-hidden bg-gray-100 font-sans relative">
      <div className="flex-1 relative z-0">
        <div ref={mapContainerRef} className="h-full w-full" />
        
        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 z-[1000] bg-white bg-opacity-70 flex items-center justify-center">
            <div className="bg-white p-4 rounded-lg shadow-lg flex items-center space-x-3">
              <IconLoader className="text-primary" />
              <span className="font-medium text-gray-700">Fetching geofences...</span>
            </div>
          </div>
        )}
 
        {/* Search Bar */}
        <div className="absolute top-4 left-4 z-[400] w-80">
          <div className="relative">
            <div className="relative">
              <IconSearch 
                size={20} 
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" 
              />
              <input
                type="text"
                placeholder="Search vehicles by owner, make, model..."
                value={searchQuery}
                onChange={handleSearchChange}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg shadow-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm bg-white"
              />
            </div>
            
            {/* Search Results Dropdown */}
            {isSearchFocused && searchResults.length > 0 && (
              <div className="absolute top-full mt-1 w-full bg-white rounded-lg shadow-xl border border-gray-200 max-h-80 overflow-y-auto z-[500]">
                {searchResults.map((vehicle) => (
                  <button
                    key={vehicle.id}
                    onClick={() => handleSelectVehicle(vehicle)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
                  >
                    <div className="font-semibold text-gray-900 text-sm">{vehicle.owner}</div>
                    <div className="text-xs text-gray-600 mt-0.5">
                      {vehicle.year} {vehicle.make} {vehicle.model} {vehicle.trim}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">{vehicle.mileage} mi</div>
                  </button>
                ))}
              </div>
            )}
            
            {/* No Results Message */}
            {isSearchFocused && searchQuery.trim() && searchResults.length === 0 && (
              <div className="absolute top-full mt-1 w-full bg-white rounded-lg shadow-xl border border-gray-200 p-4 z-[500]">
                <div className="text-sm text-gray-500 text-center">No vehicles found</div>
              </div>
            )}
          </div>
        </div>
 
        {/* Legend */}
        <div className="absolute bottom-4 right-[48px] z-[400] bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <h3 className="font-semibold text-gray-800 mb-2">Real-Time Locations</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center">
              <span className="w-4 h-4 bg-green-100 border border-green-500 mr-2 rounded"></span>
              <span>Dealerships</span>
            </div>
            <div className="flex items-center">
              <span className="w-4 h-4 bg-primary-100 border border-primary mr-2 rounded"></span>
              <span>Competitors</span>
            </div>
            <div className="flex items-center">
              <span className="w-4 h-4 bg-white border border-red-500 mr-2 rounded-full flex items-center justify-center">
                  <span className="w-1 h-1 bg-red-500 rounded-full"></span>
              </span>
              <span>Customer</span>
            </div>
          </div>
        </div>
      </div>
 
      {selectedVehicle && (
        <div className="w-96 bg-white shadow-2xl z-[1000] flex flex-col h-full border-l border-gray-200 absolute right-0 top-0 bottom-0 md:relative md:w-96 transition-transform duration-300 ease-in-out">
          <div className="p-6 bg-primary text-white flex justify-between items-start">
            <div>
              <h2 className="text-xl font-semibold">{selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model}</h2>
              <div className="flex items-center mt-2 space-x-2">
                <span className="inline-block px-2 py-0.5 bg-primary-600 text-xs rounded text-white">{selectedVehicle.trim}</span>
                {selectedVehicle.history[0]?.provider === 'Toyota Dealership' && (
                  <span className="px-2 py-0.5 bg-green-500 text-white text-xs rounded font-medium flex items-center">
                    <IconCheck size={12} className="mr-1" /> Toyota Dealership
                  </span>
                )}
                {selectedVehicle.history[0]?.provider !== 'Toyota Dealership' && (
                  <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded font-medium flex items-center">
                     External Service
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => {
                setSelectedVehicle(null);
                setExpandedHistoryIndex(null);
              }}
              className="p-1 hover:bg-primary-600 rounded transition-colors"
            >
              <IconX size={20} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {/* Removed Vehicle Image Block */}
            
            <div className="grid grid-cols-2 gap-4 p-6 border-b border-gray-100">
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold">Owner</p>
                <p className="text-gray-800 font-medium">{selectedVehicle.owner}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold">Mileage</p>
                <p className="text-gray-800 font-medium">{selectedVehicle.mileage} mi</p>
              </div>
            </div>
            <div className="p-6 border-b border-gray-100 bg-gray-50">
              <div className="flex items-start mb-4">
                <IconCalendar className="text-primary mt-1 mr-3 flex-shrink-0" size={18} />
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold">Last Visit</p>
                  <p className="text-sm font-medium text-gray-900">{selectedVehicle.lastVisit}</p>
                  <p className="text-xs text-gray-500">{selectedVehicle.history[0]?.provider}</p>
                </div>
              </div>
              <div className="flex items-start">
                <IconWrench className="text-orange-600 mt-1 mr-3 flex-shrink-0" size={18} />
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold">Next Recommended Service</p>
                  <p className="text-sm font-medium text-gray-900">{selectedVehicle.nextService}</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center">
                <IconClock size={18} className="mr-2" />
                Service History
              </h3>
              <div className="relative border-l-2 border-gray-200 ml-2 space-y-6">
                {selectedVehicle.history.map((record, idx) => (
                  <div key={idx} className="ml-6 relative">
                    <span className="absolute -left-[31px] top-0 h-4 w-4 rounded-full bg-white border-2 border-primary"></span>
                    <div 
                      className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => setExpandedHistoryIndex(expandedHistoryIndex === idx ? null : idx)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-800">{record.service}</p>
                          <p className="text-xs text-primary font-medium mt-0.5">{record.provider}</p>
                          <div className="flex justify-between mt-1">
                            <span className="text-xs text-gray-500">{record.date}</span>
                            <span className="text-xs text-gray-500 font-mono">{record.mileage.toLocaleString()} mi</span>
                          </div>
                        </div>
                        <div className="ml-2 text-right">
                          <p className="text-xs font-semibold text-gray-600">${record.totalCost?.toFixed(2) || '0.00'}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">Click for details</p>
                        </div>
                      </div>
                      {expandedHistoryIndex === idx && record.parts && record.parts.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <p className="text-xs font-semibold text-gray-700 uppercase mb-2">Parts Used</p>
                          <div className="space-y-2">
                            {record.parts.map((part, partIdx) => (
                              <div key={partIdx} className="flex justify-between items-center text-sm">
                                <span className="text-gray-700">{part.name}</span>
                                <span className="text-gray-600 font-medium">${part.cost.toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                          <div className="mt-3 pt-3 border-t border-gray-300 flex justify-between items-center">
                            <span className="text-sm font-semibold text-gray-800">Total Cost</span>
                            <span className="text-lg font-semibold text-primary">${record.totalCost?.toFixed(2) || '0.00'}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <button
              onClick={() => setIsTextModalOpen(true)}
              className="w-full bg-primary hover:bg-primary-600 text-white font-medium py-2 px-4 rounded-lg flex items-center justify-center transition-colors shadow-sm"
            >
              <IconMessage size={18} className="mr-2" />
              Text Customer
            </button>
          </div>
        </div>
      )}
 
      {/* Text Modal Overlay */}
      {isTextModalOpen && selectedVehicle && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Modal Header */}
                <div className="bg-primary text-white p-4 flex justify-between items-center">
                    <h3 className="font-semibold text-lg">New Campaign</h3>
                    <button onClick={() => setIsTextModalOpen(false)} className="text-white/70 hover:text-white transition-colors"><IconX /></button>
                </div>
                
                {/* Modal Body */}
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">To</label>
                        <div className="font-medium text-gray-900">{selectedVehicle.owner} <span className="text-gray-400 font-normal">({selectedVehicle.year} {selectedVehicle.model})</span></div>
                    </div>
 
                    <div>
                        <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">Campaign Template</label>
                        <select
                            className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                            onChange={(e) => setCampaignText(e.target.value)}
                        >
                            <option value="">Select a template...</option>
                            <option value={`Hi ${selectedVehicle.owner.split(' ')[0]}, it looks like your ${selectedVehicle.model} is due for service. Click here to schedule: deal.er/appt`}>Service Reminder</option>
                            <option value={`Hello ${selectedVehicle.owner.split(' ')[0]}, we are looking for ${selectedVehicle.year} ${selectedVehicle.model}s like yours! Would you be interested in an appraisal?`}>Trade-In Offer</option>
                            <option value={`Hi ${selectedVehicle.owner.split(' ')[0]}, get 15% off your next oil change at our dealership this month!`}>Seasonal Special</option>
                        </select>
                    </div>
 
                    <div>
                        <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">Message Preview</label>
                        <textarea
                            className="w-full border border-gray-300 rounded-lg p-3 text-sm h-32 resize-none focus:ring-2 focus:ring-primary focus:outline-none"
                            placeholder="Type your message here..."
                            value={campaignText}
                            onChange={(e) => setCampaignText(e.target.value)}
                        ></textarea>
                    </div>
                </div>
 
                {/* Modal Footer */}
                <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end space-x-3">
                    <button
                        onClick={() => setIsTextModalOpen(false)}
                        className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-200 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSendText}
                        className="px-4 py-2 bg-primary text-white font-medium hover:bg-primary-600 rounded-lg shadow-sm flex items-center transition-colors"
                    >
                        <IconSend size={16} className="mr-2" />
                        Send Campaign
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
