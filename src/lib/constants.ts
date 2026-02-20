export const HELDERBERG_SUBURBS = [
  'Somerset West',
  'Strand',
  'Gordon\'s Bay',
  'Stellenbosch',
  'Franschhoek',
  'Paarl',
  'Sir Lowry\'s Pass',
  'Grabouw',
  'Elgin',
  'Kleinmond',
  'Betty\'s Bay',
  'Macassar',
  'Firgrove',
  'Lwandle',
  'Nomzamo',
] as const;

export const PRODUCT_CATEGORIES = [
  'Vegetables',
  'Fruits',
  'Herbs',
  'Dairy',
  'Eggs',
  'Meat',
  'Grains',
  'Honey',
  'Preserves',
  'Other',
] as const;

// Verified Helderberg suburb coordinates (WGS84)
// Sources: Google Maps / OpenStreetMap centroid data for each suburb
export const SUBURB_COORDS: Record<string, { lat: number; lng: number }> = {
  'Somerset West': { lat: -34.0826, lng: 18.8431 },
  'Strand': { lat: -34.1068, lng: 18.8282 },
  "Gordon's Bay": { lat: -34.1614, lng: 18.8686 },
  'Stellenbosch': { lat: -33.9321, lng: 18.8602 },
  'Franschhoek': { lat: -33.9133, lng: 19.1181 },
  'Paarl': { lat: -33.7245, lng: 18.9725 },
  "Sir Lowry's Pass": { lat: -34.1271, lng: 18.9229 },
  'Grabouw': { lat: -34.1531, lng: 19.0172 },
  'Elgin': { lat: -34.1600, lng: 19.0500 },
  'Kleinmond': { lat: -34.3383, lng: 19.0269 },
  "Betty's Bay": { lat: -34.3631, lng: 18.8989 },
  'Macassar': { lat: -34.0639, lng: 18.7531 },
  'Firgrove': { lat: -34.0650, lng: 18.8100 },
  'Lwandle': { lat: -34.0820, lng: 18.8030 },
  'Nomzamo': { lat: -34.1000, lng: 18.8200 },
};

export const DELIVERY_FEES = {
  CLOSE: { maxKm: 5, fee: 35 },
  MEDIUM: { maxKm: 15, fee: 50 },
  FAR: { label: 'Unavailable' },
} as const;
