export function roundLotSurface(value) {
  if (value === null || value === undefined || value === '') return null;
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return null;
  return Math.round(numericValue);
}

export function formatLotSurface(value) {
  const roundedValue = roundLotSurface(value);
  return roundedValue === null ? null : `${roundedValue} m²`;
}