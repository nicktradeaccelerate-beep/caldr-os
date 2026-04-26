/**
 * UK area code → coordinates lookup.
 * Entries are sorted longest-first so getLocationFromNumber() matches
 * the most specific prefix (e.g. '01273' before '012').
 */

export interface AreaCoords {
  lat: number;
  lng: number;
  name: string;
  region?: string;
}

const AREA_MAP: Record<string, AreaCoords> = {
  // ── London ──────────────────────────────────────────────
  '02078': { lat: 51.513, lng: -0.088, name: 'Central London', region: 'London' },
  '02079': { lat: 51.513, lng: -0.088, name: 'Central London', region: 'London' },
  '02071': { lat: 51.513, lng: -0.088, name: 'Central London', region: 'London' },
  '02072': { lat: 51.513, lng: -0.088, name: 'Central London', region: 'London' },
  '02073': { lat: 51.513, lng: -0.088, name: 'Central London', region: 'London' },
  '02074': { lat: 51.513, lng: -0.088, name: 'Central London', region: 'London' },
  '02075': { lat: 51.513, lng: -0.088, name: 'Central London', region: 'London' },
  '02076': { lat: 51.513, lng: -0.088, name: 'Central London', region: 'London' },
  '02077': { lat: 51.505, lng: -0.09,  name: 'Central London', region: 'London' },
  '0207':  { lat: 51.505, lng: -0.09,  name: 'Central London', region: 'London' },
  '0208':  { lat: 51.49,  lng: -0.20,  name: 'Greater London', region: 'London' },
  '0203':  { lat: 51.52,  lng: -0.07,  name: 'East London',    region: 'London' },
  '020':   { lat: 51.505, lng: -0.09,  name: 'London',         region: 'London' },

  // ── South East — Sussex / Surrey / Kent ──────────────────
  '01273': { lat: 50.823, lng: -0.137, name: 'Brighton',       region: 'East Sussex' },
  '01903': { lat: 50.817, lng: -0.370, name: 'Worthing',       region: 'West Sussex' },
  '01243': { lat: 50.836, lng: -0.783, name: 'Chichester',     region: 'West Sussex' },
  '01444': { lat: 51.003, lng: -0.097, name: 'Haywards Heath', region: 'West Sussex' },
  '01403': { lat: 51.066, lng: -0.322, name: 'Horsham',        region: 'West Sussex' },
  '01323': { lat: 50.769, lng:  0.284, name: 'Eastbourne',     region: 'East Sussex' },
  '01424': { lat: 50.854, lng:  0.576, name: 'Hastings',       region: 'East Sussex' },
  '01892': { lat: 51.133, lng:  0.263, name: 'Tunbridge Wells', region: 'Kent' },
  '01732': { lat: 51.271, lng:  0.271, name: 'Sevenoaks',      region: 'Kent' },
  '01622': { lat: 51.272, lng:  0.522, name: 'Maidstone',      region: 'Kent' },
  '01233': { lat: 51.154, lng:  0.876, name: 'Ashford',        region: 'Kent' },
  '01227': { lat: 51.280, lng:  1.083, name: 'Canterbury',     region: 'Kent' },
  '01304': { lat: 51.126, lng:  1.313, name: 'Dover',          region: 'Kent' },
  '01737': { lat: 51.237, lng: -0.172, name: 'Redhill',        region: 'Surrey' },
  '01293': { lat: 51.119, lng: -0.182, name: 'Crawley',        region: 'West Sussex' },
  '01483': { lat: 51.235, lng: -0.570, name: 'Guildford',      region: 'Surrey' },
  '01276': { lat: 51.323, lng: -0.749, name: 'Camberley',      region: 'Surrey' },

  // ── South / South West ───────────────────────────────────
  '023':   { lat: 50.897, lng: -1.404, name: 'Southampton',    region: 'Hampshire' },
  '01202': { lat: 50.721, lng: -1.879, name: 'Bournemouth',    region: 'Dorset' },
  '01305': { lat: 50.613, lng: -2.457, name: 'Dorchester',     region: 'Dorset' },
  '01752': { lat: 50.371, lng: -4.142, name: 'Plymouth',       region: 'Devon' },
  '01392': { lat: 50.718, lng: -3.534, name: 'Exeter',         region: 'Devon' },
  '01803': { lat: 50.462, lng: -3.525, name: 'Torquay',        region: 'Devon' },
  '0117':  { lat: 51.454, lng: -2.588, name: 'Bristol',        region: 'Bristol' },
  '01793': { lat: 51.558, lng: -1.783, name: 'Swindon',        region: 'Wiltshire' },
  '01225': { lat: 51.381, lng: -2.360, name: 'Bath',           region: 'Somerset' },
  '01823': { lat: 51.015, lng: -3.101, name: 'Taunton',        region: 'Somerset' },
  '01872': { lat: 50.263, lng: -5.051, name: 'Truro',          region: 'Cornwall' },

  // ── East / South East ───────────────────────────────────
  '01865': { lat: 51.752, lng: -1.258, name: 'Oxford',         region: 'Oxfordshire' },
  '01235': { lat: 51.677, lng: -1.283, name: 'Abingdon',       region: 'Oxfordshire' },
  '01256': { lat: 51.267, lng: -1.086, name: 'Basingstoke',    region: 'Hampshire' },
  '01189': { lat: 51.455, lng: -0.970, name: 'Reading',        region: 'Berkshire' },
  '0118':  { lat: 51.455, lng: -0.970, name: 'Reading',        region: 'Berkshire' },
  '01753': { lat: 51.508, lng: -0.596, name: 'Slough',         region: 'Berkshire' },
  '01628': { lat: 51.523, lng: -0.718, name: 'Maidenhead',     region: 'Berkshire' },
  '01344': { lat: 51.408, lng: -0.753, name: 'Bracknell',      region: 'Berkshire' },
  '01252': { lat: 51.214, lng: -0.774, name: 'Farnham',        region: 'Surrey' },
  '01420': { lat: 51.130, lng: -1.042, name: 'Alton',          region: 'Hampshire' },
  '01264': { lat: 51.212, lng: -1.492, name: 'Andover',        region: 'Hampshire' },
  '01962': { lat: 51.063, lng: -1.308, name: 'Winchester',     region: 'Hampshire' },
  '01329': { lat: 50.847, lng: -1.183, name: 'Fareham',        region: 'Hampshire' },
  '01705': { lat: 50.799, lng: -1.091, name: 'Portsmouth',     region: 'Hampshire' },

  // ── East Anglia ──────────────────────────────────────────
  '01223': { lat: 52.205, lng:  0.119, name: 'Cambridge',      region: 'Cambridgeshire' },
  '01603': { lat: 52.631, lng:  1.297, name: 'Norwich',        region: 'Norfolk' },
  '01473': { lat: 52.056, lng:  1.155, name: 'Ipswich',        region: 'Suffolk' },
  '01284': { lat: 52.245, lng:  0.714, name: 'Bury St Edmunds', region: 'Suffolk' },
  '01245': { lat: 51.735, lng:  0.470, name: 'Chelmsford',     region: 'Essex' },
  '01702': { lat: 51.541, lng:  0.713, name: 'Southend',       region: 'Essex' },

  // ── Midlands ────────────────────────────────────────────
  '0121':  { lat: 52.480, lng: -1.895, name: 'Birmingham',     region: 'West Midlands' },
  '0116':  { lat: 52.637, lng: -1.133, name: 'Leicester',      region: 'Leicestershire' },
  '0115':  { lat: 52.954, lng: -1.150, name: 'Nottingham',     region: 'Nottinghamshire' },
  '01332': { lat: 52.922, lng: -1.477, name: 'Derby',          region: 'Derbyshire' },
  '01604': { lat: 52.240, lng: -0.900, name: 'Northampton',    region: 'Northamptonshire' },
  '01788': { lat: 52.371, lng: -1.265, name: 'Rugby',          region: 'Warwickshire' },
  '01203': { lat: 52.407, lng: -1.509, name: 'Coventry',       region: 'West Midlands' },
  '024':   { lat: 52.407, lng: -1.509, name: 'Coventry',       region: 'West Midlands' },
  '01905': { lat: 52.192, lng: -2.222, name: 'Worcester',      region: 'Worcestershire' },
  '01743': { lat: 52.708, lng: -2.752, name: 'Shrewsbury',     region: 'Shropshire' },
  '01782': { lat: 53.002, lng: -2.180, name: 'Stoke-on-Trent', region: 'Staffordshire' },

  // ── North West ──────────────────────────────────────────
  '0161':  { lat: 53.480, lng: -2.242, name: 'Manchester',     region: 'Greater Manchester' },
  '0151':  { lat: 53.408, lng: -2.991, name: 'Liverpool',      region: 'Merseyside' },
  '01772': { lat: 53.758, lng: -2.703, name: 'Preston',        region: 'Lancashire' },
  '01254': { lat: 53.749, lng: -2.481, name: 'Blackburn',      region: 'Lancashire' },
  '01253': { lat: 53.817, lng: -3.035, name: 'Blackpool',      region: 'Lancashire' },
  '01524': { lat: 54.047, lng: -2.801, name: 'Lancaster',      region: 'Lancashire' },
  '01228': { lat: 54.896, lng: -2.932, name: 'Carlisle',       region: 'Cumbria' },
  '01539': { lat: 54.321, lng: -2.745, name: 'Kendal',         region: 'Cumbria' },

  // ── Yorkshire ───────────────────────────────────────────
  '0113':  { lat: 53.800, lng: -1.550, name: 'Leeds',          region: 'West Yorkshire' },
  '0114':  { lat: 53.381, lng: -1.470, name: 'Sheffield',      region: 'South Yorkshire' },
  '01274': { lat: 53.795, lng: -1.753, name: 'Bradford',       region: 'West Yorkshire' },
  '01924': { lat: 53.683, lng: -1.499, name: 'Wakefield',      region: 'West Yorkshire' },
  '01484': { lat: 53.648, lng: -1.785, name: 'Huddersfield',   region: 'West Yorkshire' },
  '01422': { lat: 53.724, lng: -1.864, name: 'Halifax',        region: 'West Yorkshire' },
  '01482': { lat: 53.745, lng: -0.336, name: 'Hull',           region: 'East Yorkshire' },
  '01904': { lat: 53.958, lng: -1.082, name: 'York',           region: 'North Yorkshire' },
  '01642': { lat: 54.574, lng: -1.235, name: 'Middlesbrough',  region: 'Teesside' },
  '01325': { lat: 54.523, lng: -1.557, name: 'Darlington',     region: 'County Durham' },

  // ── North East ──────────────────────────────────────────
  '0191':  { lat: 54.978, lng: -1.618, name: 'Newcastle',      region: 'Tyne and Wear' },
  '01632': { lat: 54.978, lng: -1.618, name: 'Newcastle',      region: 'Tyne and Wear' },
  '0131':  { lat: 55.953, lng: -3.189, name: 'Edinburgh',      region: 'Scotland' },
  '0141':  { lat: 55.861, lng: -4.250, name: 'Glasgow',        region: 'Scotland' },
  '01224': { lat: 57.149, lng: -2.094, name: 'Aberdeen',       region: 'Scotland' },
  '01382': { lat: 56.462, lng: -2.971, name: 'Dundee',         region: 'Scotland' },
  '01463': { lat: 57.477, lng: -4.224, name: 'Inverness',      region: 'Scotland' },
  '029':   { lat: 51.481, lng: -3.180, name: 'Cardiff',        region: 'Wales' },
  '02920': { lat: 51.481, lng: -3.180, name: 'Cardiff',        region: 'Wales' },

  // ── Mobile fallback ─────────────────────────────────────
  '07':    { lat: 51.505, lng: -0.09,  name: 'Mobile UK',      region: 'UK' },
};

// Pre-sorted by prefix length descending — longest match wins
const SORTED_ENTRIES = Object.entries(AREA_MAP).sort(
  ([a], [b]) => b.length - a.length
);

/**
 * Resolves an E.164 or local-format UK number to area coordinates.
 * Tries the longest matching prefix first.
 *
 * @example
 *   getLocationFromNumber('+44 207 946 0123')
 *   // → { lat: 51.505, lng: -0.09, name: 'Central London', region: 'London' }
 */
export function getLocationFromNumber(e164: string): AreaCoords | null {
  // Normalise to local format (0...)
  const local = e164
    .replace(/\s+/g, '')
    .replace(/^\+44/, '0')
    .replace(/^0044/, '0');

  for (const [prefix, coords] of SORTED_ENTRIES) {
    if (local.startsWith(prefix)) return coords;
  }
  return null;
}

export { AREA_MAP };
