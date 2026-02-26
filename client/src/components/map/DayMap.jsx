import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { dayColor, formatTime, typeIcon } from '../../utils/formatters';

// Fix leaflet default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

/**
 * Create a numbered, colored circle marker icon.
 */
function createIcon(color, label) {
  return L.divIcon({
    className: '',
    html: `<div style="
      background:${color};
      width:32px;height:32px;
      border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      color:white;font-weight:700;font-size:12px;
      border:2.5px solid white;
      box-shadow:0 2px 8px rgba(0,0,0,0.3);
    ">${label}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -20],
  });
}

/**
 * Auto-fit bounds component.
 */
function FitBounds({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length > 0) {
      const latLngs = bounds.map((b) => [b.lat, b.lng]);
      if (latLngs.length === 1) {
        map.setView(latLngs[0], 13);
      } else {
        map.fitBounds(latLngs, { padding: [40, 40], maxZoom: 15 });
      }
    }
  }, [map, bounds]);
  return null;
}

/**
 * Decode route geometry (GeoJSON) into LatLng array for Polyline.
 */
function routeToLatLngs(routeGeometry) {
  if (!routeGeometry?.coordinates) return [];
  return routeGeometry.coordinates.map(([lng, lat]) => [lat, lng]);
}

export default function DayMap({ days, allDays = false, dayIndex = 0 }) {
  const [mapReady, setMapReady] = useState(false);

  // Collect all markers from days
  const markers = useMemo(() => {
    const result = [];
    days.forEach((day, dIdx) => {
      const color = dayColor(allDays ? dIdx : dayIndex);
      day.activities?.forEach((activity, aIdx) => {
        if (activity.coordinates) {
          result.push({
            position: [activity.coordinates.lat, activity.coordinates.lng],
            icon: createIcon(color, aIdx + 1),
            name: activity.name,
            time: activity.timeStart,
            type: activity.type,
            description: activity.description,
            dayNum: day.day,
            budgetEstimate: activity.budgetEstimate,
            coordinates: activity.coordinates,
          });
        }
      });
    });
    return result;
  }, [days, allDays, dayIndex]);

  // Collect route polylines
  const polylines = useMemo(() => {
    return days
      .map((day, dIdx) => {
        if (!day.route?.geometry) return null;
        return {
          positions: routeToLatLngs(day.route.geometry),
          color: dayColor(allDays ? dIdx : dayIndex),
        };
      })
      .filter(Boolean);
  }, [days, allDays, dayIndex]);

  // Bounds for auto-fitting
  const bounds = markers.map((m) => ({
    lat: m.position[0],
    lng: m.position[1],
  }));

  // Default center if no markers
  const defaultCenter = bounds.length > 0
    ? [bounds[0].lat, bounds[0].lng]
    : [20, 0];

  if (markers.length === 0) {
    return (
      <div className="card p-8 text-center text-gray-500">
        <p>No geocoded locations to display on the map.</p>
        <p className="text-sm mt-2 text-gray-400">
          The AI-suggested places couldn't be pinpointed. Try regenerating the day.
        </p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden" style={{ height: '500px' }}>
      <MapContainer
        center={defaultCenter}
        zoom={13}
        className="h-full w-full"
        whenReady={() => setMapReady(true)}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FitBounds bounds={bounds} />

        {/* Route polylines */}
        {polylines.map((pl, i) => (
          <Polyline
            key={i}
            positions={pl.positions}
            pathOptions={{
              color: pl.color,
              weight: 4,
              opacity: 0.7,
              dashArray: '10 6',
            }}
          />
        ))}

        {/* Markers */}
        {markers.map((marker, i) => (
          <Marker key={i} position={marker.position} icon={marker.icon}>
            <Popup>
              <div className="min-w-[180px]">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{typeIcon(marker.type)}</span>
                  <strong className="text-gray-900">{marker.name}</strong>
                </div>
                {marker.time && (
                  <p className="text-xs text-gray-500">
                    🕐 {formatTime(marker.time)} · Day {marker.dayNum}
                  </p>
                )}
                {marker.description && (
                  <p className="text-xs text-gray-600 mt-1">{marker.description}</p>
                )}
                {marker.budgetEstimate && (
                  <p className="text-xs text-gray-500 mt-1">💰 {marker.budgetEstimate}</p>
                )}
                <a
                  href={marker.coordinates
                    ? `https://www.google.com/maps/search/?api=1&query=${marker.coordinates.lat},${marker.coordinates.lng}`
                    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(marker.name)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                >
                  📍 Open in Google Maps
                </a>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
