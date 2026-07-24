import type { Currency } from '@/types';

/**
 * Currencies offered in the picker. `decimals` follows ISO 4217 minor units —
 * getting this wrong is the difference between ¥1,200 and ¥1,200.00.
 */
export const CURRENCIES: Currency[] = [
  { code: 'USD', name: 'US Dollar', symbol: '$', decimals: 2, locale: 'en-US', position: 'prefix' },
  { code: 'EUR', name: 'Euro', symbol: '€', decimals: 2, locale: 'de-DE', position: 'suffix' },
  { code: 'GBP', name: 'British Pound', symbol: '£', decimals: 2, locale: 'en-GB', position: 'prefix' },
  { code: 'PKR', name: 'Pakistani Rupee', symbol: '₨', decimals: 2, locale: 'en-PK', position: 'prefix' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', decimals: 2, locale: 'en-IN', position: 'prefix' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', decimals: 2, locale: 'en-AE', position: 'prefix' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼', decimals: 2, locale: 'en-SA', position: 'prefix' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$', decimals: 2, locale: 'en-CA', position: 'prefix' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', decimals: 2, locale: 'en-AU', position: 'prefix' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', decimals: 0, locale: 'ja-JP', position: 'prefix' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', decimals: 2, locale: 'zh-CN', position: 'prefix' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', decimals: 2, locale: 'de-CH', position: 'prefix' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', decimals: 2, locale: 'en-SG', position: 'prefix' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', decimals: 2, locale: 'en-HK', position: 'prefix' },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', decimals: 2, locale: 'en-NZ', position: 'prefix' },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr', decimals: 2, locale: 'sv-SE', position: 'suffix' },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr', decimals: 2, locale: 'nb-NO', position: 'suffix' },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr', decimals: 2, locale: 'da-DK', position: 'suffix' },
  { code: 'PLN', name: 'Polish Złoty', symbol: 'zł', decimals: 2, locale: 'pl-PL', position: 'suffix' },
  { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč', decimals: 2, locale: 'cs-CZ', position: 'suffix' },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺', decimals: 2, locale: 'tr-TR', position: 'prefix' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R', decimals: 2, locale: 'en-ZA', position: 'prefix' },
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦', decimals: 2, locale: 'en-NG', position: 'prefix' },
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh', decimals: 2, locale: 'en-KE', position: 'prefix' },
  { code: 'EGP', name: 'Egyptian Pound', symbol: 'E£', decimals: 2, locale: 'en-EG', position: 'prefix' },
  { code: 'BDT', name: 'Bangladeshi Taka', symbol: '৳', decimals: 2, locale: 'bn-BD', position: 'prefix' },
  { code: 'LKR', name: 'Sri Lankan Rupee', symbol: 'Rs', decimals: 2, locale: 'si-LK', position: 'prefix' },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', decimals: 2, locale: 'ms-MY', position: 'prefix' },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', decimals: 0, locale: 'id-ID', position: 'prefix' },
  { code: 'THB', name: 'Thai Baht', symbol: '฿', decimals: 2, locale: 'th-TH', position: 'prefix' },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱', decimals: 2, locale: 'en-PH', position: 'prefix' },
  { code: 'VND', name: 'Vietnamese Đồng', symbol: '₫', decimals: 0, locale: 'vi-VN', position: 'suffix' },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩', decimals: 0, locale: 'ko-KR', position: 'prefix' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', decimals: 2, locale: 'pt-BR', position: 'prefix' },
  { code: 'MXN', name: 'Mexican Peso', symbol: 'MX$', decimals: 2, locale: 'es-MX', position: 'prefix' },
  { code: 'ARS', name: 'Argentine Peso', symbol: 'AR$', decimals: 2, locale: 'es-AR', position: 'prefix' },
  { code: 'CLP', name: 'Chilean Peso', symbol: 'CLP$', decimals: 0, locale: 'es-CL', position: 'prefix' },
  { code: 'COP', name: 'Colombian Peso', symbol: 'COL$', decimals: 2, locale: 'es-CO', position: 'prefix' },
  { code: 'QAR', name: 'Qatari Riyal', symbol: 'QR', decimals: 2, locale: 'en-QA', position: 'prefix' },
  { code: 'KWD', name: 'Kuwaiti Dinar', symbol: 'KD', decimals: 3, locale: 'en-KW', position: 'prefix' },
  { code: 'BHD', name: 'Bahraini Dinar', symbol: 'BD', decimals: 3, locale: 'en-BH', position: 'prefix' },
  { code: 'OMR', name: 'Omani Rial', symbol: 'OMR', decimals: 3, locale: 'en-OM', position: 'prefix' },
  { code: 'ILS', name: 'Israeli Shekel', symbol: '₪', decimals: 2, locale: 'he-IL', position: 'prefix' },
  { code: 'RUB', name: 'Russian Ruble', symbol: '₽', decimals: 2, locale: 'ru-RU', position: 'suffix' },
  { code: 'UAH', name: 'Ukrainian Hryvnia', symbol: '₴', decimals: 2, locale: 'uk-UA', position: 'suffix' },
];

const CURRENCY_MAP = new Map(CURRENCIES.map((c) => [c.code, c]));

export const DEFAULT_CURRENCY = CURRENCIES[0];

export function getCurrency(code: string): Currency {
  return CURRENCY_MAP.get(code) ?? DEFAULT_CURRENCY;
}
