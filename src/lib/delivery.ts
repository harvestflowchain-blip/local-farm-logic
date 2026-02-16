import { SUBURB_COORDS, DELIVERY_FEES } from './constants';

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

export function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export interface DeliveryResult {
  distanceKm: number;
  fee: number | null; // null = unavailable
  label: string;
}

export function calculateDeliveryFee(
  customerSuburb: string,
  farmerSuburb: string
): DeliveryResult {
  const from = SUBURB_COORDS[customerSuburb];
  const to = SUBURB_COORDS[farmerSuburb];

  if (!from || !to) {
    return { distanceKm: 0, fee: null, label: 'Unknown suburb' };
  }

  const distanceKm = haversineDistance(from.lat, from.lng, to.lat, to.lng);

  if (distanceKm <= DELIVERY_FEES.CLOSE.maxKm) {
    return { distanceKm, fee: DELIVERY_FEES.CLOSE.fee, label: `R${DELIVERY_FEES.CLOSE.fee}` };
  }
  if (distanceKm <= DELIVERY_FEES.MEDIUM.maxKm) {
    return { distanceKm, fee: DELIVERY_FEES.MEDIUM.fee, label: `R${DELIVERY_FEES.MEDIUM.fee}` };
  }
  return { distanceKm, fee: null, label: 'Unavailable' };
}
