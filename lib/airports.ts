// Common airport lookup: city/country names → IATA code
// Covers major routes from Singapore + top global hubs

export const AIRPORTS: Record<string, { iata: string; city: string; country: string }> = {
  // Singapore
  singapore: { iata: 'SIN', city: 'Singapore', country: 'SG' },
  changi:    { iata: 'SIN', city: 'Singapore', country: 'SG' },
  sin:       { iata: 'SIN', city: 'Singapore', country: 'SG' },

  // Japan
  tokyo:    { iata: 'NRT', city: 'Tokyo', country: 'JP' },
  narita:   { iata: 'NRT', city: 'Tokyo Narita', country: 'JP' },
  haneda:   { iata: 'HND', city: 'Tokyo Haneda', country: 'JP' },
  osaka:    { iata: 'KIX', city: 'Osaka', country: 'JP' },
  kyoto:    { iata: 'KIX', city: 'Osaka/Kyoto', country: 'JP' },
  sapporo:  { iata: 'CTS', city: 'Sapporo', country: 'JP' },
  fukuoka:  { iata: 'FUK', city: 'Fukuoka', country: 'JP' },
  nrt:      { iata: 'NRT', city: 'Tokyo', country: 'JP' },
  hnd:      { iata: 'HND', city: 'Tokyo Haneda', country: 'JP' },
  kix:      { iata: 'KIX', city: 'Osaka', country: 'JP' },

  // Korea
  seoul:    { iata: 'ICN', city: 'Seoul', country: 'KR' },
  incheon:  { iata: 'ICN', city: 'Seoul Incheon', country: 'KR' },
  busan:    { iata: 'PUS', city: 'Busan', country: 'KR' },
  icn:      { iata: 'ICN', city: 'Seoul', country: 'KR' },

  // Southeast Asia
  bangkok:    { iata: 'BKK', city: 'Bangkok', country: 'TH' },
  suvarnabhumi: { iata: 'BKK', city: 'Bangkok', country: 'TH' },
  'don mueang': { iata: 'DMK', city: 'Bangkok DMK', country: 'TH' },
  'kuala lumpur': { iata: 'KUL', city: 'Kuala Lumpur', country: 'MY' },
  kl:         { iata: 'KUL', city: 'Kuala Lumpur', country: 'MY' },
  klia:       { iata: 'KUL', city: 'Kuala Lumpur', country: 'MY' },
  jakarta:    { iata: 'CGK', city: 'Jakarta', country: 'ID' },
  bali:       { iata: 'DPS', city: 'Bali', country: 'ID' },
  denpasar:   { iata: 'DPS', city: 'Bali', country: 'ID' },
  manila:     { iata: 'MNL', city: 'Manila', country: 'PH' },
  'ho chi minh': { iata: 'SGN', city: 'Ho Chi Minh City', country: 'VN' },
  saigon:     { iata: 'SGN', city: 'Ho Chi Minh City', country: 'VN' },
  hanoi:      { iata: 'HAN', city: 'Hanoi', country: 'VN' },
  phuket:     { iata: 'HKT', city: 'Phuket', country: 'TH' },
  chiang_mai: { iata: 'CNX', city: 'Chiang Mai', country: 'TH' },
  yangon:     { iata: 'RGN', city: 'Yangon', country: 'MM' },
  phnom_penh: { iata: 'PNH', city: 'Phnom Penh', country: 'KH' },

  // China
  beijing:    { iata: 'PEK', city: 'Beijing', country: 'CN' },
  shanghai:   { iata: 'PVG', city: 'Shanghai', country: 'CN' },
  guangzhou:  { iata: 'CAN', city: 'Guangzhou', country: 'CN' },
  shenzhen:   { iata: 'SZX', city: 'Shenzhen', country: 'CN' },
  chengdu:    { iata: 'CTU', city: 'Chengdu', country: 'CN' },
  kunming:    { iata: 'KMG', city: 'Kunming', country: 'CN' },

  // Hong Kong / Macau / Taiwan
  'hong kong': { iata: 'HKG', city: 'Hong Kong', country: 'HK' },
  hongkong:   { iata: 'HKG', city: 'Hong Kong', country: 'HK' },
  hkg:        { iata: 'HKG', city: 'Hong Kong', country: 'HK' },
  taipei:     { iata: 'TPE', city: 'Taipei', country: 'TW' },
  macau:      { iata: 'MFM', city: 'Macau', country: 'MO' },

  // India
  mumbai:     { iata: 'BOM', city: 'Mumbai', country: 'IN' },
  delhi:      { iata: 'DEL', city: 'Delhi', country: 'IN' },
  bangalore:  { iata: 'BLR', city: 'Bangalore', country: 'IN' },
  chennai:    { iata: 'MAA', city: 'Chennai', country: 'IN' },
  kolkata:    { iata: 'CCU', city: 'Kolkata', country: 'IN' },
  hyderabad:  { iata: 'HYD', city: 'Hyderabad', country: 'IN' },

  // Middle East
  dubai:      { iata: 'DXB', city: 'Dubai', country: 'AE' },
  'abu dhabi': { iata: 'AUH', city: 'Abu Dhabi', country: 'AE' },
  doha:       { iata: 'DOH', city: 'Doha', country: 'QA' },
  riyadh:     { iata: 'RUH', city: 'Riyadh', country: 'SA' },

  // Australia / NZ
  sydney:     { iata: 'SYD', city: 'Sydney', country: 'AU' },
  melbourne:  { iata: 'MEL', city: 'Melbourne', country: 'AU' },
  brisbane:   { iata: 'BNE', city: 'Brisbane', country: 'AU' },
  perth:      { iata: 'PER', city: 'Perth', country: 'AU' },
  auckland:   { iata: 'AKL', city: 'Auckland', country: 'NZ' },

  // Europe
  london:     { iata: 'LHR', city: 'London', country: 'GB' },
  heathrow:   { iata: 'LHR', city: 'London Heathrow', country: 'GB' },
  gatwick:    { iata: 'LGW', city: 'London Gatwick', country: 'GB' },
  paris:      { iata: 'CDG', city: 'Paris', country: 'FR' },
  frankfurt:  { iata: 'FRA', city: 'Frankfurt', country: 'DE' },
  amsterdam:  { iata: 'AMS', city: 'Amsterdam', country: 'NL' },
  zurich:     { iata: 'ZRH', city: 'Zurich', country: 'CH' },
  rome:       { iata: 'FCO', city: 'Rome', country: 'IT' },
  barcelona:  { iata: 'BCN', city: 'Barcelona', country: 'ES' },
  madrid:     { iata: 'MAD', city: 'Madrid', country: 'ES' },
  istanbul:   { iata: 'IST', city: 'Istanbul', country: 'TR' },

  // USA
  'new york':    { iata: 'JFK', city: 'New York', country: 'US' },
  'los angeles': { iata: 'LAX', city: 'Los Angeles', country: 'US' },
  'san francisco':{ iata: 'SFO', city: 'San Francisco', country: 'US' },
  chicago:       { iata: 'ORD', city: 'Chicago', country: 'US' },
  'las vegas':   { iata: 'LAS', city: 'Las Vegas', country: 'US' },
  seattle:       { iata: 'SEA', city: 'Seattle', country: 'US' },
  honolulu:      { iata: 'HNL', city: 'Honolulu', country: 'US' },

  // Canada
  toronto:    { iata: 'YYZ', city: 'Toronto', country: 'CA' },
  vancouver:  { iata: 'YVR', city: 'Vancouver', country: 'CA' },
}

export function lookupIATA(input: string): { iata: string; city: string; country: string } | null {
  const key = input.trim().toLowerCase().replace(/\s+/g, ' ')
  // Direct match
  if (AIRPORTS[key]) return AIRPORTS[key]
  // 3-letter IATA code (uppercase)
  const upper = input.trim().toUpperCase()
  const byIATA = Object.values(AIRPORTS).find(a => a.iata === upper)
  if (byIATA) return byIATA
  // Partial match — key starts with input
  const partial = Object.entries(AIRPORTS).find(([k]) => k.startsWith(key))
  if (partial) return partial[1]
  return null
}

export function routeToIATA(from: string, to: string): { route: string; fromCity: string; toCity: string } | null {
  const f = lookupIATA(from)
  const t = lookupIATA(to)
  if (!f || !t) return null
  return { route: `${f.iata}-${t.iata}`, fromCity: f.city, toCity: t.city }
}
