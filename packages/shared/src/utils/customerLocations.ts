import type { Customer, CustomerSavedLocation } from '../types';

export const LOCATION_PRESETS = ['البيت', 'العمل'] as const;
export type LocationPreset = (typeof LOCATION_PRESETS)[number];

export interface SavedLocationAddressInput {
  province: string;
  area: string;
  mahalla?: string;
  zuqaq?: string;
  dar?: string;
  landmark: string;
}

export interface CreateSavedLocationInput extends SavedLocationAddressInput {
  label: string;
  lat: number;
  lng: number;
  /** Reverse-geocoded map label */
  mapAddress?: string;
  isDefault?: boolean;
}

export function parseCustomerAddress(address: string): SavedLocationAddressInput {
  const mMatch = address.match(/محلة ([\s\S]+?)( -|$|\()/);
  const zMatch = address.match(/زقاق ([\s\S]+?)( -|$|\()/);
  const dMatch = address.match(/دار ([\s\S]+?)( -|$|\()/);
  const lMatch = address.match(/\(أقرب نقطة: (.*)\)/);
  const areaPart = address.split(' - ')[0] || '';

  return {
    province: 'بغداد',
    area: areaPart.replace(/\(أقرب نقطة: .*\)/, '').trim(),
    mahalla: mMatch ? mMatch[1].trim() : '',
    zuqaq: zMatch ? zMatch[1].trim() : '',
    dar: dMatch ? dMatch[1].trim() : '',
    landmark: lMatch ? lMatch[1].trim() : '',
  };
}

export function formatSavedLocationAddress(
  loc: Pick<CustomerSavedLocation, 'area' | 'mahalla' | 'zuqaq' | 'dar' | 'landmark'>,
): string {
  const optionalAddressParts = [
    loc.mahalla ? `محلة ${loc.mahalla}` : '',
    loc.zuqaq ? `زقاق ${loc.zuqaq}` : '',
    loc.dar ? `دار ${loc.dar}` : '',
  ].filter(Boolean).join(' - ');

  const base = `${loc.area || ''}${optionalAddressParts ? ` - ${optionalAddressParts}` : ''}`.trim();
  if (!loc.landmark?.trim()) return base;
  return base ? `${base} (أقرب نقطة: ${loc.landmark})` : `(أقرب نقطة: ${loc.landmark})`;
}

export function formatSavedLocationSummary(loc: CustomerSavedLocation): string {
  const parts = [loc.province, formatSavedLocationAddress(loc)].filter(Boolean);
  return parts.join(' — ');
}

export function isSavedLocationAddressComplete(
  loc: Pick<CustomerSavedLocation, 'province' | 'area' | 'landmark'>,
): boolean {
  return Boolean(loc.province?.trim() && loc.area?.trim() && loc.landmark?.trim());
}

export function createSavedLocation(input: CreateSavedLocationInput): CustomerSavedLocation {
  return {
    id: `loc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    label: input.label.trim(),
    lat: input.lat,
    lng: input.lng,
    province: input.province,
    area: input.area,
    mahalla: input.mahalla || '',
    zuqaq: input.zuqaq || '',
    dar: input.dar || '',
    landmark: input.landmark || '',
    address: input.mapAddress || '',
    isDefault: input.isDefault ?? false,
  };
}

function backfillLocationFromCustomer(
  loc: CustomerSavedLocation,
  customer: Pick<Customer, 'province' | 'address'>,
): CustomerSavedLocation {
  if (loc.province && loc.area && loc.landmark) return loc;

  const parsed = parseCustomerAddress(customer.address || '');
  return {
    ...loc,
    province: loc.province || customer.province || 'بغداد',
    area: loc.area || parsed.area || '',
    mahalla: loc.mahalla ?? parsed.mahalla ?? '',
    zuqaq: loc.zuqaq ?? parsed.zuqaq ?? '',
    dar: loc.dar ?? parsed.dar ?? '',
    landmark: loc.landmark || parsed.landmark || '',
  };
}

export function normalizeCustomerSavedLocations(
  customer: Pick<Customer, 'lat' | 'lng' | 'savedLocations' | 'defaultLocationId' | 'province' | 'address'>,
): CustomerSavedLocation[] {
  if (customer.savedLocations?.length) {
    const defaultId = customer.defaultLocationId ?? customer.savedLocations.find((loc) => loc.isDefault)?.id ?? customer.savedLocations[0]?.id;
    return customer.savedLocations.map((loc, index) =>
      backfillLocationFromCustomer(
        {
          ...loc,
          isDefault: loc.id === defaultId || (!defaultId && index === 0),
        },
        customer,
      ),
    );
  }

  if (customer.lat != null && customer.lng != null) {
    const parsed = parseCustomerAddress(customer.address || '');
    return [
      createSavedLocation({
        label: 'البيت',
        lat: customer.lat,
        lng: customer.lng,
        province: customer.province || 'بغداد',
        area: parsed.area,
        mahalla: parsed.mahalla,
        zuqaq: parsed.zuqaq,
        dar: parsed.dar,
        landmark: parsed.landmark,
        isDefault: true,
      }),
    ];
  }

  return [];
}

export function getDefaultSavedLocation(locations: CustomerSavedLocation[]): CustomerSavedLocation | undefined {
  return locations.find((loc) => loc.isDefault) ?? locations[0];
}

export function setDefaultSavedLocation(locations: CustomerSavedLocation[], locationId: string): CustomerSavedLocation[] {
  return locations.map((loc) => ({ ...loc, isDefault: loc.id === locationId }));
}

export function locationsEqual(a: CustomerSavedLocation[], b: CustomerSavedLocation[]): boolean {
  if (a.length !== b.length) return false;

  const normalize = (loc: CustomerSavedLocation) => ({
    id: loc.id,
    label: loc.label,
    lat: loc.lat,
    lng: loc.lng,
    province: loc.province || '',
    area: loc.area || '',
    mahalla: loc.mahalla || '',
    zuqaq: loc.zuqaq || '',
    dar: loc.dar || '',
    landmark: loc.landmark || '',
    address: loc.address || '',
    isDefault: !!loc.isDefault,
  });

  const sortedA = [...a].map(normalize).sort((x, y) => x.id.localeCompare(y.id));
  const sortedB = [...b].map(normalize).sort((x, y) => x.id.localeCompare(y.id));

  return sortedA.every((loc, index) => {
    const other = sortedB[index];
    return (
      loc.id === other.id &&
      loc.label === other.label &&
      loc.lat === other.lat &&
      loc.lng === other.lng &&
      loc.province === other.province &&
      loc.area === other.area &&
      loc.mahalla === other.mahalla &&
      loc.zuqaq === other.zuqaq &&
      loc.dar === other.dar &&
      loc.landmark === other.landmark &&
      loc.address === other.address &&
      loc.isDefault === other.isDefault
    );
  });
}
