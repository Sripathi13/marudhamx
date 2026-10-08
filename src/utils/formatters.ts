import i18n from '../i18n';

export const getLocaleTag = (): string => {
  const lang = i18n.language || 'ta';
  if (lang === 'ta') return 'ta-IN';
  if (lang === 'hi') return 'hi-IN';
  return 'en-IN';
};

export const formatNumber = (num: number, maximumFractionDigits = 0): string => {
  return new Intl.NumberFormat(getLocaleTag(), {
    maximumFractionDigits,
  }).format(num);
};

export const formatCurrency = (amount: number): string => {
  const formatted = new Intl.NumberFormat(getLocaleTag(), {
    maximumFractionDigits: 0,
  }).format(amount);
  return `₹${formatted}`;
};

export const formatDistance = (km: number, unitSystem: 'km' | 'mi' = 'km'): string => {
  if (unitSystem === 'mi') {
    const miles = km * 0.621371;
    return `${formatNumber(miles, 1)} ${i18n.t('units.mi')}`;
  }
  return `${formatNumber(km, 1)} ${i18n.t('units.km')}`;
};

export const formatSpeed = (kmh: number): string => {
  return `${formatNumber(kmh)} ${i18n.t('units.kmh')}`;
};

export const formatMeters = (meters: number): string => {
  if (meters >= 1000) {
    return `${formatNumber(meters / 1000, 1)} ${i18n.t('units.km')}`;
  }
  return `${formatNumber(meters)} ${i18n.t('units.m')}`;
};

export const formatDuration = (totalMinutes: number): string => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) {
    return `${formatNumber(minutes)} ${i18n.t('units.min')}`;
  }
  if (minutes === 0) {
    return `${formatNumber(hours)} ${i18n.t('units.hr')}`;
  }
  return `${formatNumber(hours)} ${i18n.t('units.hr')} ${formatNumber(minutes)} ${i18n.t('units.min')}`;
};

export const formatDateTime = (isoString: string): string => {
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat(getLocaleTag(), {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return isoString;
  }
};
