export interface Country {
  code: string;
  name: string;
  dial: string;
}

export function getFlagEmoji(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return '🌐';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  try {
    return String.fromCodePoint(...codePoints);
  } catch (e) {
    return '🌐';
  }
}

export const countries: Country[] = [
  // West Africa
  { code: 'CI', name: "Côte d'Ivoire", dial: '225' },
  { code: 'SN', name: "Sénégal", dial: '221' },
  { code: 'BJ', name: "Bénin", dial: '229' },
  { code: 'TG', name: "Togo", dial: '228' },
  { code: 'BF', name: "Burkina Faso", dial: '226' },
  { code: 'ML', name: "Mali", dial: '223' },
  { code: 'NE', name: "Niger", dial: '227' },
  { code: 'GN', name: "Guinée", dial: '224' },
  { code: 'MR', name: "Mauritanie", dial: '222' },
  { code: 'GH', name: "Ghana", dial: '233' },
  { code: 'NG', name: "Nigéria", dial: '234' },
  { code: 'LR', name: "Libéria", dial: '231' },
  { code: 'SL', name: "Sierra Leone", dial: '232' },
  { code: 'GM', name: "Gambie", dial: '220' },
  { code: 'GW', name: "Guinée-Bissau", dial: '245' },
  { code: 'CV', name: "Cap-Vert", dial: '238' },

  // Central Africa
  { code: 'CM', name: "Cameroun", dial: '237' },
  { code: 'CG', name: "Congo-Brazzaville", dial: '242' },
  { code: 'CD', name: "RD Congo (Kinshasa)", dial: '243' },
  { code: 'GA', name: "Gabon", dial: '241' },
  { code: 'TD', name: "Tchad", dial: '235' },
  { code: 'CF', name: "Centrafrique", dial: '236' },
  { code: 'GQ', name: "Guinée Équatoriale", dial: '240' },
  { code: 'AO', name: "Angola", dial: '244' },
  { code: 'ST', name: "Sao Tomé-et-Principe", dial: '239' },

  // North Africa & Middle East
  { code: 'MA', name: "Maroc", dial: '212' },
  { code: 'DZ', name: "Algérie", dial: '213' },
  { code: 'TN', name: "Tunisie", dial: '216' },
  { code: 'EG', name: "Égypte", dial: '20' },
  { code: 'LY', name: "Libye", dial: '218' },
  { code: 'SD', name: "Soudan", dial: '249' },
  { code: 'AE', name: "Émirats Arabes Unis", dial: '971' },
  { code: 'SA', name: "Arabie Saoudite", dial: '966' },
  { code: 'QA', name: "Qatar", dial: '974' },
  { code: 'KW', name: "Koweït", dial: '965' },
  { code: 'OM', name: "Oman", dial: '968' },
  { code: 'BH', name: "Bahreïn", dial: '973' },
  { code: 'YE', name: "Yémen", dial: '967' },
  { code: 'JO', name: "Jordanie", dial: '962' },
  { code: 'LB', name: "Liban", dial: '961' },
  { code: 'SY', name: "Syrie", dial: '963' },
  { code: 'IQ', name: "Irak", dial: '964' },
  { code: 'IL', name: "Israël", dial: '972' },
  { code: 'PS', name: "Palestine", dial: '970' },
  { code: 'TR', name: "Turquie", dial: '90' },
  { code: 'IR', name: "Iran", dial: '98' },

  // East Africa & Southern Africa
  { code: 'KE', name: "Kenya", dial: '254' },
  { code: 'TZ', name: "Tanzanie", dial: '255' },
  { code: 'UG', name: "Ouganda", dial: '256' },
  { code: 'RW', name: "Rwanda", dial: '250' },
  { code: 'BI', name: "Burundi", dial: '257' },
  { code: 'ET', name: "Éthiopie", dial: '251' },
  { code: 'SO', name: "Somalie", dial: '252' },
  { code: 'DJ', name: "Djibouti", dial: '253' },
  { code: 'MG', name: "Madagascar", dial: '261' },
  { code: 'MU', name: "Maurice", dial: '230' },
  { code: 'SC', name: "Seychelles", dial: '248' },
  { code: 'KM', name: "Comores", dial: '269' },
  { code: 'ZA', name: "Afrique du Sud", dial: '27' },
  { code: 'MZ', name: "Mozambique", dial: '258' },
  { code: 'ZW', name: "Zimbabwe", dial: '263' },
  { code: 'ZM', name: "Zambie", dial: '260' },
  { code: 'MW', name: "Malawi", dial: '265' },
  { code: 'NA', name: "Namibie", dial: '264' },
  { code: 'BW', name: "Botswana", dial: '267' },
  { code: 'LS', name: "Lesotho", dial: '266' },
  { code: 'SZ', name: "Eswatini", dial: '268' },

  // Europe
  { code: 'FR', name: "France", dial: '33' },
  { code: 'BE', name: "Belgique", dial: '32' },
  { code: 'CH', name: "Suisse", dial: '41' },
  { code: 'DE', name: "Allemagne", dial: '49' },
  { code: 'GB', name: "Royaume-Uni", dial: '44' },
  { code: 'IT', name: "Italie", dial: '39' },
  { code: 'ES', name: "Espagne", dial: '34' },
  { code: 'PT', name: "Portugal", dial: '351' },
  { code: 'NL', name: "Pays-Bas", dial: '31' },
  { code: 'AT', name: "Autriche", dial: '43' },
  { code: 'IE', name: "Irlande", dial: '353' },
  { code: 'LU', name: "Luxembourg", dial: '352' },
  { code: 'SE', name: "Suède", dial: '46' },
  { code: 'NO', name: "Norvège", dial: '47' },
  { code: 'DK', name: "Danemark", dial: '45' },
  { code: 'FI', name: "Finlande", dial: '358' },
  { code: 'PL', name: "Pologne", dial: '48' },
  { code: 'GR', name: "Grèce", dial: '30' },
  { code: 'RO', name: "Roumanie", dial: '40' },
  { code: 'HU', name: "Hongrie", dial: '36' },
  { code: 'CZ', name: "Tchéquie", dial: '420' },
  { code: 'UA', name: "Ukraine", dial: '380' },
  { code: 'RU', name: "Russie", dial: '7' },

  // Americas
  { code: 'US', name: "États-Unis", dial: '1' },
  { code: 'CA', name: "Canada", dial: '1' },
  { code: 'MX', name: "Mexique", dial: '52' },
  { code: 'BR', name: "Brésil", dial: '55' },
  { code: 'AR', name: "Argentine", dial: '54' },
  { code: 'CO', name: "Colombie", dial: '57' },
  { code: 'PE', name: "Pérou", dial: '51' },
  { code: 'VE', name: "Venezuela", dial: '58' },
  { code: 'CL', name: "Chili", dial: '56' },
  { code: 'EC', name: "Équateur", dial: '593' },
  { code: 'BO', name: "Bolivie", dial: '591' },
  { code: 'PY', name: "Paraguay", dial: '595' },
  { code: 'UY', name: "Uruguay", dial: '598' },
  { code: 'HT', name: "Haïti", dial: '509' },
  { code: 'GP', name: "Guadeloupe", dial: '590' },
  { code: 'MQ', name: "Martinique", dial: '596' },
  { code: 'GF', name: "Guyane Française", dial: '594' },
  { code: 'RE', name: "La Réunion", dial: '262' },
  { code: 'YT', name: "Mayotte", dial: '262' },

  // Asia & Oceania
  { code: 'CN', name: "Chine", dial: '86' },
  { code: 'IN', name: "Inde", dial: '91' },
  { code: 'JP', name: "Japon", dial: '81' },
  { code: 'KR', name: "Corée du Sud", dial: '82' },
  { code: 'ID', name: "Indonésie", dial: '62' },
  { code: 'MY', name: "Malaisie", dial: '60' },
  { code: 'SG', name: "Singapour", dial: '65' },
  { code: 'TH', name: "Thaïlande", dial: '66' },
  { code: 'VN', name: "Viêt Nam", dial: '84' },
  { code: 'PH', name: "Philippines", dial: '63' },
  { code: 'PK', name: "Pakistan", dial: '92' },
  { code: 'BD', name: "Bangladesh", dial: '880' },
  { code: 'AU', name: "Australie", dial: '61' },
  { code: 'NZ', name: "Nouvelle-Zélande", dial: '64' }
];

export const countriesSorted = [...countries].sort((a, b) => a.name.localeCompare(b.name));

export function detectDefaultCountryCode(currency: string, profile?: any): string {
  // 1. Try to get country code directly from profile country_code if available (passed from client)
  if (profile?.country_code) {
    const codeUpper = profile.country_code.toUpperCase().trim();
    if (countries.some(c => c.code === codeUpper)) {
      return codeUpper;
    }
  }

  // 2. Try to match country name string from profile.country
  if (profile?.country) {
    const countryNameLower = profile.country.toLowerCase().trim();
    const matched = countries.find(c => {
      const cNameLower = c.name.toLowerCase().trim();
      return cNameLower === countryNameLower || 
             countryNameLower.includes(cNameLower) || 
             cNameLower.includes(countryNameLower);
    });
    if (matched) {
      return matched.code;
    }
  }

  // 3. Try highly accurate, client-side browser timezone matching (No Database / Network Queries)
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) {
      const tzLower = tz.toLowerCase();
      if (tzLower.includes('abidjan')) return 'CI';
      if (tzLower.includes('dakar')) return 'SN';
      if (tzLower.includes('bamako')) return 'ML';
      if (tzLower.includes('cotonou')) return 'BJ';
      if (tzLower.includes('lome') || tzLower.includes('lomé')) return 'TG';
      if (tzLower.includes('ouagadougou')) return 'BF';
      if (tzLower.includes('niamey')) return 'NE';
      if (tzLower.includes('conakry')) return 'GN';
      if (tzLower.includes('douala')) return 'CM';
      if (tzLower.includes('libreville')) return 'GA';
      if (tzLower.includes('brazzaville')) return 'CG';
      if (tzLower.includes('kinshasa')) return 'CD';
      if (tzLower.includes('paris') || tzLower.includes('europe/paris')) return 'FR';
      if (tzLower.includes('brussels') || tzLower.includes('bruxelles')) return 'BE';
      if (tzLower.includes('zurich') || tzLower.includes('geneva') || tzLower.includes('geneve')) return 'CH';
      if (tzLower.includes('casablanca')) return 'MA';
      if (tzLower.includes('algiers') || tzLower.includes('alger')) return 'DZ';
      if (tzLower.includes('tunis')) return 'TN';
      if (tzLower.includes('kigali')) return 'RW';
      if (tzLower.includes('libreville')) return 'GA';
      if (tzLower.includes('luanda')) return 'AO';
      if (tzLower.includes('ndjamena') || tzLower.includes('n\'djamena')) return 'TD';
      if (tzLower.includes('bangui')) return 'CF';
      if (tzLower.includes('malabo')) return 'GQ';
    }
  } catch (e) {
    // Ignore timezone-retrieval exceptions and fall back
  }

  // 4. Fallback to active currency matching
  const currencyUpper = (currency || 'XAF').toUpperCase().trim();
  
  switch (currencyUpper) {
    case 'XOF':
      return 'CI'; // Côte d'Ivoire
    case 'XAF':
      return 'CM'; // Cameroun
    case 'EUR':
      return 'FR'; // France
    case 'USD':
      return 'US'; // USA
    case 'CDF':
      return 'CD'; // RD Congo
    case 'GNF':
      return 'GN'; // Guinée
    case 'MAD':
      return 'MA'; // Maroc
    case 'DZD':
      return 'DZ'; // Algérie
    case 'TND':
      return 'TN'; // Tunisie
    case 'RWF':
      return 'RW'; // Rwanda
    case 'TZS':
      return 'TZ'; // Tanzanie
    case 'UGX':
      return 'UG'; // Ouganda
    case 'ZMW':
      return 'ZM'; // Zambie
    case 'CAD':
      return 'CA'; // Canada
    case 'GBP':
      return 'GB'; // Royaume-Uni
    default:
      return 'CI'; // Default fallback
  }
}
