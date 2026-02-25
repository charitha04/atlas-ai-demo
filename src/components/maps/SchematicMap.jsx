import React, { useState, useEffect } from 'react';
import { X, User, Car, Gauge, History, Map, Moon, Satellite } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { maskName } from '../../lib/utils';

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom marker icons
const createCustomIcon = (color) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); transition: none !important; animation: none !important;"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
};

// Convert percentage coordinates to real lat/lng
// Uses account center if provided, otherwise defaults to Grapevine, TX
const convertToLatLng = (xPercent, yPercent, accountCenter = null) => {
  // Use account center or default to Grapevine, TX (32.9346° N, 97.0781° W)
  const baseLat = accountCenter ? accountCenter[0] : 32.9346;
  const baseLng = accountCenter ? accountCenter[1] : -97.0781;
  const latRange = 0.3; // ~20 miles
  const lngRange = 0.3; // ~20 miles
  
  // Convert percentage to offset (0-100% maps to -range/2 to +range/2)
  const latOffset = (yPercent / 100 - 0.5) * latRange;
  const lngOffset = (xPercent / 100 - 0.5) * lngRange;
  
  return {
    lat: baseLat + latOffset,
    lng: baseLng + lngOffset,
  };
};

// Calculate centroid of a polygon
const calculateCentroid = (coordinates) => {
  if (!coordinates || !coordinates[0] || !coordinates[0].length) return null;
  
  const ring = coordinates[0]; // First ring of polygon
  let sumLat = 0;
  let sumLng = 0;
  let count = 0;
  
  for (const coord of ring) {
    if (coord && coord.length >= 2) {
      sumLng += coord[0]; // longitude
      sumLat += coord[1]; // latitude
      count++;
    }
  }
  
  if (count === 0) return null;
  return [sumLat / count, sumLng / count];
};

const SchematicMap = ({ customers, isExpanded = false, onClose, hideControls = false, geofenceData: propGeofenceData = null, mapCenter: propMapCenter = null }) => {
  const [_hoveredCustomer, setHoveredCustomer] = useState(null);
  const [geofenceData, setGeofenceData] = useState(propGeofenceData);
  const [mapType, setMapType] = useState('default'); // 'default', 'dark', 'satellite'
  
  // Dealership location (Grapevine, TX) - fallback
  const defaultLocation = [32.9346, -97.0781];
  
  // Use prop mapCenter if provided, otherwise use default
  const mapCenter = propMapCenter || defaultLocation;

  // Use prop geofence data if provided, otherwise load from file (backward compatibility)
  useEffect(() => {
    if (propGeofenceData) {
      setGeofenceData(propGeofenceData);
    } else {
      // Fallback: load from file for backward compatibility
      fetch('/geofences/TX.geojson')
        .then(response => response.json())
        .then(data => {
          setGeofenceData(data);
        })
        .catch(error => console.error('Error loading geofence data:', error));
    }
  }, [propGeofenceData]);
  
  // Convert customers to have lat/lng
  const customersWithCoords = React.useMemo(() => 
    customers.map(c => ({
      ...c,
      ...convertToLatLng(c.coordinates.x, c.coordinates.y, mapCenter),
    })), [customers, mapCenter]
  );

  const getMarkerColor = (status) => {
    if (status === 'Active Defector') return '#ef4444'; // red
    if (status === 'Service Due') return '#10b981'; // emerald
    if (status === 'Open Recall') return '#f59e0b'; // amber
    return '#64748b'; // slate
  };

  // Categorize shop types for different colors
  const getShopCategory = (feature) => {
    const shop = feature.properties?.shop || '';
    const type = feature.properties?.type || '';
    
    // My dealership - marked with type: 'dealership' or 'my_dealership'
    if (type === 'dealership' || type === 'my_dealership') {
      return 'my_dealership';
    }
    // Competitor dealerships - car dealers, car sales
    if (shop === 'car' || shop === 'car_dealer' || shop.includes('dealer')) {
      return 'competitor';
    }
    // Independent repair facilities - car_repair, tyres, parts, etc.
    if (shop === 'car_repair' || shop === 'tyres' || shop === 'car_parts' || shop.includes('repair')) {
      return 'independent';
    }
    // Default to independent for other automotive shops
    return 'independent';
  };

  // Color scheme for different categories
  const categoryColors = {
    my_dealership: { fill: '#10b981', border: '#059669' }, // Emerald green
    competitor: { fill: '#ef4444', border: '#dc2626' },     // Red
    independent: { fill: '#3b82f6', border: '#2563eb' }     // Blue
  };

  // Style function for geofence features
  const geofenceStyle = (feature) => {
    const category = getShopCategory(feature);
    const colors = categoryColors[category] || categoryColors.independent;
    
    return {
      fillColor: colors.fill,
      fillOpacity: 0.15,
      color: colors.border,
      weight: 2,
      opacity: 0.6,
      radius: 8
    };
  };

  // Point to layer function for geofence points
  const pointToLayer = (feature, latlng) => {
    const category = getShopCategory(feature);
    const colors = categoryColors[category] || categoryColors.independent;
    
    return L.circleMarker(latlng, {
      radius: 4,
      fillColor: colors.fill,
      color: colors.border,
      weight: 1,
      opacity: 0.8,
      fillOpacity: 0.4
    });
  };

  // Format address from properties
  const formatAddress = (properties) => {
    const parts = [];
    if (properties['addr:housenumber']) parts.push(properties['addr:housenumber']);
    if (properties['addr:street']) parts.push(properties['addr:street']);
    if (properties['addr:city']) parts.push(properties['addr:city']);
    if (properties['addr:state']) parts.push(properties['addr:state']);
    if (properties['addr:postcode']) parts.push(properties['addr:postcode']);
    return parts.length > 0 ? parts.join(', ') : 'Address not available';
  };

  // Map type configurations
  const mapTypes = {
    default: {
      name: 'Default',
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      icon: Map
    },
    dark: {
      name: 'Dark',
      url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      icon: Moon
    },
    satellite: {
      name: 'Satellite',
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: '&copy; <a href="https://www.esri.com/">Esri</a>',
      icon: Satellite
    }
  };

  // On each feature function for geofence popups with detailed information
  const onEachGeofenceFeature = (feature, layer) => {
    if (feature.properties && feature.properties.name) {
      const props = feature.properties;
      const name = props.name || 'Unknown';
      const shop = props.shop || 'Unknown';
      const address = formatAddress(props);
      
      const popupContent = `
        <div style="min-width: 200px; font-family: 'Barlow', 'Instrument Sans', sans-serif;">
          <div style="margin-bottom: 8px;">
            <strong style="font-size: 14px; color: #111115;">${name}</strong>
          </div>
          <div style="margin-bottom: 6px; font-size: 12px; color: #6f6f77;">
            <span style="text-transform: capitalize;">${shop.replace('_', ' ')}</span>
          </div>
          <div style="margin-top: 8px; font-size: 12px; color: #4e4e55; border-top: 1px solid #dcdcdc; padding-top: 6px;">
            <div style="font-weight: 500; color: #111115; margin-bottom: 4px;">Address:</div>
            <div>${address}</div>
          </div>
        </div>
      `;
      
      // Bind popup for hover (shows full details)
      layer.bindPopup(popupContent, {
        closeOnClick: false,
        autoClose: false,
        closeButton: true,
        className: 'geofence-popup'
      });
      
      // Add hover effect - show popup on hover
      const category = getShopCategory(feature);
      const colors = categoryColors[category] || categoryColors.independent;
      const hoverBorderColor = colors.border;
      const normalBorderColor = colors.fill;
      
      layer.on({
        mouseover: function(e) {
          const layer = e.target;
          layer.setStyle({
            radius: 6,
            fillOpacity: 0.6,
            weight: 2,
            color: hoverBorderColor
          });
          // Open popup on hover
          if (!layer.isPopupOpen()) {
            layer.openPopup();
          }
        },
        mouseout: function(e) {
          const layer = e.target;
          layer.setStyle({
            radius: 4,
            fillOpacity: 0.4,
            weight: 1,
            color: normalBorderColor
          });
          // Close popup when mouse leaves (with small delay to allow moving to popup)
          setTimeout(() => {
            if (layer.isPopupOpen()) {
              const popup = layer.getPopup();
              const popupElement = popup.getElement();
              if (popupElement && !popupElement.matches(':hover')) {
                layer.closePopup();
              }
            }
          }, 200);
        }
      });
      
      // Keep popup open when hovering over it
      layer.on('popupopen', function() {
        const popup = layer.getPopup();
        const popupElement = popup.getElement();
        if (popupElement) {
          popupElement.addEventListener('mouseenter', () => {
            // Keep popup open
          });
          popupElement.addEventListener('mouseleave', () => {
            layer.closePopup();
          });
        }
      });
    }
  };

  return (
    <div className={`relative w-full h-full ${!isExpanded ? 'rounded-card border border-surface-stroke overflow-hidden' : ''}`}>
      <MapContainer
        key={`map-${isExpanded ? 'expanded' : 'normal'}-${mapCenter[0]}-${mapCenter[1]}`}
        center={mapCenter}
        zoom={isExpanded ? 12 : 13}
        minZoom={9}
        maxZoom={18}
        style={{ height: '100%', width: '100%', zIndex: 0 }}
        zoomControl={true}
        scrollWheelZoom={true}
        doubleClickZoom={true}
        dragging={true}
        touchZoom={true}
        zoomAnimation={false}
        fadeAnimation={false}
        markerZoomAnimation={false}
      >
        <TileLayer
          attribution={mapTypes[mapType].attribution}
          url={mapTypes[mapType].url}
        />
        
        {/* Geofence Layer */}
        {geofenceData && (
          <GeoJSON
            data={geofenceData}
            style={geofenceStyle}
            pointToLayer={pointToLayer}
            onEachFeature={onEachGeofenceFeature}
          />
        )}
        
        {/* Customer Markers */}
        {customersWithCoords.map((c) => {
          const markerColor = getMarkerColor(c.status);
          
          return (
            <Marker
              key={c.id}
              position={[c.lat, c.lng]}
              icon={createCustomIcon(markerColor)}
              interactive={true}
              eventHandlers={{
                mouseover: () => setHoveredCustomer(c),
                mouseout: () => setHoveredCustomer(null),
              }}
            >
              <Popup>
                <div className="min-w-[200px]">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-copy-default text-sm">{maskName(c.name)}</h4>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                      c.status === 'Active Defector' ? 'bg-danger-100 text-danger-700' :
                      c.status === 'Service Due' ? 'bg-success-100 text-success-700' :
                      c.status === 'Open Recall' ? 'bg-warning-100 text-warning-700' :
                      c.status === 'Service declined' ? 'bg-primary-100 text-primary-700' :
                      'bg-surface-stroke/30 text-copy-muted'
                    }`}>
                      {c.status}
                    </span>
                  </div>
                  <div className="text-xs text-copy-muted space-y-1">
                    <p className="flex items-center gap-1">
                      <User size={10} /> {maskName(c.owner)}
                    </p>
                    <p className="flex items-center gap-1">
                      <Car size={10} /> {c.vehicle}
                    </p>
                    <p className="flex items-center gap-1">
                      <Gauge size={10} /> {c.mileage.toLocaleString()} mi
                    </p>
                    <p className="flex items-center gap-1">
                      <History size={10} /> Last: {c.lastServiceDate}
                    </p>
                    <p className="text-xs text-primary mt-2">Distance: {c.distance}</p>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
      
      {/* Close Button - Only show when expanded */}
      {isExpanded && (
        <button 
          onClick={(e) => { e.stopPropagation(); onClose(); }} 
          className="absolute top-6 right-6 z-[1001] p-2 bg-surface-container rounded-full shadow-card border border-surface-stroke hover:bg-surface-page transition-colors"
        >
          <X size={24} className="text-copy-default" />
        </button>
      )}
      
      {/* Map Type Selector - Show in both expanded and non-expanded views, but hide if hideControls is true */}
      {!hideControls && (
        <div className={`absolute ${isExpanded ? 'top-6 right-20' : 'top-4 right-4'} z-[1000] flex flex-col gap-2`}>
          {Object.entries(mapTypes).map(([key, config]) => {
            const Icon = config.icon;
            const isActive = mapType === key;
            return (
              <button
                key={key}
                onClick={(e) => {
                  e.stopPropagation();
                  setMapType(key);
                }}
                className={`p-2.5 bg-surface-container rounded-button shadow-card hover:bg-surface-page transition-colors border-2 ${
                  isActive 
                    ? 'border-primary bg-primary/10' 
                    : 'border-transparent'
                }`}
                title={config.name}
              >
                <Icon 
                  size={20} 
                  className={isActive ? 'text-primary' : 'text-copy-default'} 
                />
              </button>
            );
          })}
        </div>
      )}
      
      {/* Map Legend - Show in both expanded and non-expanded views, but hide if hideControls is true */}
      {!hideControls && (
        <div className="absolute bottom-4 left-4 z-[1000] bg-surface-container/95 backdrop-blur-sm p-3 rounded-card shadow-card border border-surface-stroke">
        <div className="text-xs font-semibold text-copy-default mb-2">Facilities</div>
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500 border border-white"></div>
            <span className="text-copy-muted">My Dealership</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500 border border-white"></div>
            <span className="text-copy-muted">Competitor Dealership</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500 border border-white"></div>
            <span className="text-copy-muted">Independent Repair</span>
          </div>
        </div>
        <div className="text-xs font-semibold text-copy-default mb-2 mt-3 pt-2 border-t border-surface-stroke">Customers</div>
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-white shadow-sm"></div>
            <span className="text-copy-muted">Service Due</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500 border-2 border-white shadow-sm"></div>
            <span className="text-copy-muted">Active Defector</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500 border-2 border-white shadow-sm"></div>
            <span className="text-copy-muted">Open Recall</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-slate-500 border-2 border-white shadow-sm"></div>
            <span className="text-copy-muted">Other</span>
          </div>
        </div>
        </div>
      )}
    </div>
  );
};

export default SchematicMap;
