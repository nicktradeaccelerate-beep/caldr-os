'use client';

import { useState } from 'react';

export interface MapPin {
  id: string;
  label: string;
  lat: number;
  lng: number;
  type: 'active' | 'recent' | 'job';
  value?: string;
  sentiment?: number;
}

interface CallMapProps {
  activePins?: MapPin[];
  onPinClick?: (pin: MapPin) => void;
  /** Name of the area derived from caller's number — shown as subtitle when no live data */
  callerArea?: string | null;
  /** Whether BFB CRM data is loading */
  crmLoading?: boolean;
}

// UK area code → approximate lat/lng lookup
const AREA_COORDS: Record<string, { lat: number; lng: number; name: string }> = {
  '0207': { lat: 51.505, lng: -0.09,  name: 'Central London' },
  '0208': { lat: 51.49,  lng: -0.2,   name: 'Greater London' },
  '0203': { lat: 51.52,  lng: -0.07,  name: 'East London' },
  '0161': { lat: 53.48,  lng: -2.24,  name: 'Manchester' },
  '0121': { lat: 52.48,  lng: -1.89,  name: 'Birmingham' },
  '0113': { lat: 53.80,  lng: -1.55,  name: 'Leeds' },
  '0141': { lat: 55.86,  lng: -4.25,  name: 'Glasgow' },
  '0117': { lat: 51.45,  lng: -2.60,  name: 'Bristol' },
  '0114': { lat: 53.38,  lng: -1.47,  name: 'Sheffield' },
  '0151': { lat: 53.41,  lng: -2.99,  name: 'Liverpool' },
  '0191': { lat: 54.97,  lng: -1.61,  name: 'Newcastle' },
  '0116': { lat: 52.63,  lng: -1.13,  name: 'Leicester' },
  '0115': { lat: 52.95,  lng: -1.15,  name: 'Nottingham' },
  '0131': { lat: 55.95,  lng: -3.19,  name: 'Edinburgh' },
  '0118': { lat: 51.46,  lng: -0.97,  name: 'Reading' },
  '01273': { lat: 50.82, lng: -0.14,  name: 'Brighton' },
  '01865': { lat: 51.75, lng: -1.26,  name: 'Oxford' },
  '01223': { lat: 52.20, lng:  0.12,  name: 'Cambridge' },
  '01392': { lat: 50.72, lng: -3.53,  name: 'Exeter' },
  '01603': { lat: 52.63, lng:  1.29,  name: 'Norwich' },
};

export function getAreaCoords(number: string): { lat: number; lng: number; name: string } | null {
  const n = number.replace(/\s+/g, '').replace(/^\+44/, '0');
  for (const [prefix, coords] of Object.entries(AREA_COORDS)) {
    if (n.startsWith(prefix)) return coords;
  }
  return null;
}

// Demo pins — in production fed from live calls + BFB jobs
const DEMO_PINS: MapPin[] = [
  { id: '1', label: 'Active call',    lat: 51.505, lng: -0.09,   type: 'active',  sentiment: 82 },
  { id: '2', label: 'Recent — David', lat: 53.48,  lng: -2.24,   type: 'recent',  sentiment: 71 },
  { id: '3', label: 'Recent — Sarah', lat: 52.48,  lng: -1.89,   type: 'recent',  sentiment: 58 },
  { id: '4', label: 'BFB job — boiler', lat: 51.52, lng: -0.12,  type: 'job',     value: '£3,200' },
  { id: '5', label: 'BFB job — survey', lat: 51.49, lng: -0.07,  type: 'job',     value: '£850' },
  { id: '6', label: 'BFB job — rewire', lat: 51.51, lng: -0.14,  type: 'job',     value: '£5,400' },
];

// Simple equirectangular projection for the UK
// lat: 49.5–58.8, lng: -8–1.8
const MAP_LAT_MIN = 49.5, MAP_LAT_MAX = 58.8;
const MAP_LNG_MIN = -8.0, MAP_LNG_MAX = 1.8;

function project(lat: number, lng: number, w: number, h: number): { x: number; y: number } {
  const x = ((lng - MAP_LNG_MIN) / (MAP_LNG_MAX - MAP_LNG_MIN)) * w;
  const y = ((MAP_LAT_MAX - lat) / (MAP_LAT_MAX - MAP_LAT_MIN)) * h;
  return { x, y };
}

const PIN_COLORS: Record<MapPin['type'], string> = {
  active: '#4ADE80',
  recent: 'var(--accent-mid)',
  job:    '#F59E0B',
};

export default function CallMap({ activePins, onPinClick, callerArea, crmLoading }: CallMapProps) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'recent' | 'job'>('all');

  const pins = (activePins ?? DEMO_PINS).filter(p => filter === 'all' || p.type === filter);

  const W = 340, H = 280;

  return (
    <div style={{ padding: 16, background: 'var(--card)', borderRadius: 16, border: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 2 }}>Call Map</div>
          <div style={{ fontSize: 11, color: 'var(--ink-2)' }}>
            {callerArea
              ? `Caller area: ${callerArea}${crmLoading ? ' · Loading BFB jobs…' : ''}`
              : 'UK coverage · Active calls · Nearby jobs'}
          </div>
        </div>
        {/* Filter chips */}
        <div style={{ display: 'flex', gap: 4 }}>
          {(['all','active','recent','job'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '3px 8px',
                background: filter === f ? 'var(--accent)' : 'var(--white)',
                color: filter === f ? 'white' : 'var(--ink-2)',
                border: `1px solid ${filter === f ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 20, fontSize: 10, fontWeight: 600, cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Map area */}
      <div style={{
        position: 'relative',
        width: '100%', paddingBottom: `${(H / W) * 100}%`,
        background: '#EEF2ED',
        borderRadius: 12, overflow: 'hidden',
        border: '1px solid var(--border)',
      }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Simple UK outline — approximate coastline paths */}
          <path
            d="M170 10 L180 20 L185 35 L195 50 L200 70 L195 90 L200 105 L210 115 L215 130 L210 145 L205 160 L195 170 L185 180 L170 185 L155 180 L145 170 L135 160 L125 150 L115 140 L105 130 L100 115 L95 100 L90 85 L85 70 L80 55 L85 40 L95 25 L110 15 L130 8 Z
             M100 190 L110 195 L120 205 L125 220 L120 235 L110 245 L100 250 L88 245 L80 235 L78 220 L83 205 L92 196 Z"
            fill="#E0EDDE" stroke="#C5D9C2" strokeWidth="1.5"
          />

          {/* Grid lines */}
          {[0.25, 0.5, 0.75].map(t => (
            <g key={t}>
              <line x1={0} y1={H * t} x2={W} y2={H * t} stroke="rgba(27,67,50,0.06)" strokeWidth="1"/>
              <line x1={W * t} y1={0} x2={W * t} y2={H} stroke="rgba(27,67,50,0.06)" strokeWidth="1"/>
            </g>
          ))}

          {/* Pins */}
          {pins.map(pin => {
            const { x, y } = project(pin.lat, pin.lng, W, H);
            const isHovered = hovered === pin.id;
            const color = PIN_COLORS[pin.type];

            return (
              <g
                key={pin.id}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHovered(pin.id)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => onPinClick?.(pin)}
              >
                {/* Pulse ring — only for active */}
                {pin.type === 'active' && (
                  <circle cx={x} cy={y} r={12} fill="rgba(74,222,128,0.2)" style={{ animation: 'mapPulse 2s infinite' }}/>
                )}
                <circle cx={x} cy={y} r={isHovered ? 7 : 5} fill={color}
                  style={{ transition: 'r 0.15s', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.2))' }}
                />
                {/* Tooltip */}
                {isHovered && (
                  <g>
                    <rect x={x + 8} y={y - 18} width={100} height={36} rx={6} fill="var(--ink)" opacity={0.92}/>
                    <text x={x + 13} y={y - 4} fontSize={10} fill="white" fontFamily="DM Sans, sans-serif" fontWeight="600">
                      {pin.label}
                    </text>
                    {pin.sentiment !== undefined && (
                      <text x={x + 13} y={y + 9} fontSize={9} fill="rgba(255,255,255,0.7)" fontFamily="DM Sans, sans-serif">
                        Sentiment {pin.sentiment}%
                      </text>
                    )}
                    {pin.value && (
                      <text x={x + 13} y={y + 9} fontSize={9} fill="rgba(255,255,255,0.7)" fontFamily="DM Sans, sans-serif">
                        {pin.value}
                      </text>
                    )}
                  </g>
                )}
              </g>
            );
          })}
        </svg>

        <style>{`
          @keyframes mapPulse {
            0%, 100% { opacity: 0.4; transform: scale(1); }
            50% { opacity: 0.1; transform: scale(1.5); }
          }
        `}</style>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
        {([
          { type: 'active', label: 'Active call' },
          { type: 'recent', label: 'Recent call' },
          { type: 'job',    label: 'Nearby job' },
        ] as const).map(({ type, label }) => (
          <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: PIN_COLORS[type], flexShrink: 0 }}/>
            <span style={{ fontSize: 11, color: 'var(--ink-2)' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
