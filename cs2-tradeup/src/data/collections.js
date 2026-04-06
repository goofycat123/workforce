export const WEAR = {
  FN: { code: 'FN', label: 'Factory New',   min: 0.00, max: 0.07, color: '#4ade80', bg: '#052e16' },
  MW: { code: 'MW', label: 'Minimal Wear',  min: 0.07, max: 0.15, color: '#60a5fa', bg: '#172554' },
  FT: { code: 'FT', label: 'Field-Tested',  min: 0.15, max: 0.38, color: '#facc15', bg: '#1c1a06' },
  WW: { code: 'WW', label: 'Well-Worn',     min: 0.38, max: 0.45, color: '#fb923c', bg: '#1c0a01' },
  BS: { code: 'BS', label: 'Battle-Scarred',min: 0.45, max: 1.00, color: '#f87171', bg: '#2d0707' },
}

export const RARITY = {
  milspec:    { label: 'Mil-Spec',   short: 'MS',  color: '#4b69ff' },
  restricted: { label: 'Restricted', short: 'R',   color: '#8847ff' },
  classified: { label: 'Classified', short: 'C',   color: '#d32ce6' },
  covert:     { label: 'Covert',     short: 'CV',  color: '#eb4b4b' },
}

export const TIER_ORDER = ['milspec', 'restricted', 'classified', 'covert']

// Float ranges sourced from community data — verify on csgofloat.com for precision
export const COLLECTIONS = [
  {
    id: 'dreams-nightmares',
    name: 'Dreams & Nightmares Case',
    icon: '🌙',
    tiers: {
      milspec: [
        { weapon: 'AK-47',     skin: 'Nightwish',           minFloat: 0.00, maxFloat: 0.80 },
        { weapon: 'Five-SeveN',skin: 'Nightshade',           minFloat: 0.00, maxFloat: 0.80 },
        { weapon: 'Glock-18',  skin: 'Umbral Rabbit',        minFloat: 0.00, maxFloat: 0.80 },
        { weapon: 'M4A1-S',   skin: 'Night Terror',          minFloat: 0.00, maxFloat: 0.80 },
        { weapon: 'MP9',       skin: 'Starlight Protector',  minFloat: 0.00, maxFloat: 0.80 },
        { weapon: 'Sawed-Off', skin: 'Serenity',             minFloat: 0.00, maxFloat: 0.80 },
      ],
      restricted: [
        { weapon: 'Desert Eagle', skin: 'Emerald Jörmungandr', minFloat: 0.00, maxFloat: 0.80 },
        { weapon: 'Dual Berettas',skin: 'Melondrama',           minFloat: 0.00, maxFloat: 0.80 },
        { weapon: 'MAC-10',       skin: 'Allure',               minFloat: 0.00, maxFloat: 0.80 },
        { weapon: 'P250',         skin: 'Visions',              minFloat: 0.00, maxFloat: 0.80 },
        { weapon: 'UMP-45',       skin: 'Wild Child',           minFloat: 0.00, maxFloat: 0.80 },
      ],
      classified: [
        { weapon: 'AWP',    skin: 'Dreams & Nightmares', minFloat: 0.00, maxFloat: 0.80 },
        { weapon: 'MP5-SD', skin: 'Liquidation',         minFloat: 0.00, maxFloat: 0.80 },
      ],
      covert: [
        { weapon: 'AK-47', skin: 'X-Ray',   minFloat: 0.00, maxFloat: 0.80 },
        { weapon: 'M4A4',  skin: 'Temukau', minFloat: 0.00, maxFloat: 0.80 },
      ],
    },
  },
  {
    id: 'recoil',
    name: 'Recoil Case',
    icon: '💥',
    tiers: {
      milspec: [
        { weapon: 'AK-47',   skin: 'Ice Coaled',      minFloat: 0.00, maxFloat: 0.80 },
        { weapon: 'Five-SeveN', skin: 'Midnight Heist',minFloat: 0.00, maxFloat: 0.50 },
        { weapon: 'Glock-18',skin: 'Neo-Noir',         minFloat: 0.00, maxFloat: 0.70 },
        { weapon: 'M249',    skin: 'Downtown',         minFloat: 0.00, maxFloat: 0.80 },
        { weapon: 'Nova',    skin: 'Plume',            minFloat: 0.00, maxFloat: 0.80 },
        { weapon: 'SCAR-20', skin: 'Fragments',        minFloat: 0.00, maxFloat: 0.80 },
        { weapon: 'SG 553',  skin: 'Heresy',           minFloat: 0.00, maxFloat: 0.80 },
      ],
      restricted: [
        { weapon: 'AWP',    skin: 'Chromatic Aberration', minFloat: 0.00, maxFloat: 0.80 },
        { weapon: 'M4A4',   skin: 'Poly Mag',             minFloat: 0.00, maxFloat: 0.80 },
        { weapon: 'MP9',    skin: 'Featherweight',        minFloat: 0.00, maxFloat: 0.80 },
        { weapon: 'P90',    skin: 'Bling',                minFloat: 0.00, maxFloat: 0.50 },
        { weapon: 'UMP-45', skin: 'Moonrise',             minFloat: 0.00, maxFloat: 0.80 },
        { weapon: 'USP-S',  skin: 'Ticket to Hell',       minFloat: 0.00, maxFloat: 0.50 },
      ],
      classified: [
        { weapon: 'Desert Eagle', skin: 'Blue Ply',       minFloat: 0.00, maxFloat: 0.80 },
        { weapon: 'FAMAS',        skin: 'Meow 36',        minFloat: 0.00, maxFloat: 0.80 },
        { weapon: 'M4A1-S',      skin: 'Restless Night',  minFloat: 0.00, maxFloat: 0.80 },
      ],
      covert: [
        { weapon: 'AK-47',   skin: 'Calm Waters',    minFloat: 0.00, maxFloat: 0.80 },
        { weapon: 'Glock-18',skin: 'Neo-Noir (Foil)', minFloat: 0.00, maxFloat: 0.80 },
      ],
    },
  },
  {
    id: 'revolution',
    name: 'Revolution Case',
    icon: '🌀',
    tiers: {
      milspec: [
        { weapon: 'AK-47',    skin: 'Head Shot',      minFloat: 0.00, maxFloat: 0.80 },
        { weapon: 'Glock-18', skin: 'Winterized',      minFloat: 0.00, maxFloat: 0.80 },
        { weapon: 'M4A4',     skin: 'Temukau',         minFloat: 0.00, maxFloat: 0.80 },
        { weapon: 'MP9',      skin: 'Starlight Protector', minFloat: 0.00, maxFloat: 0.80 },
        { weapon: 'PP-Bizon', skin: 'Space Cat',       minFloat: 0.00, maxFloat: 0.80 },
        { weapon: 'Sawed-Off',skin: 'Analog Input',    minFloat: 0.00, maxFloat: 0.80 },
        { weapon: 'UMP-45',   skin: 'Motorized',       minFloat: 0.00, maxFloat: 0.80 },
      ],
      restricted: [
        { weapon: 'AUG',          skin: 'Plague',          minFloat: 0.00, maxFloat: 0.80 },
        { weapon: 'Desert Eagle', skin: 'Printstream',     minFloat: 0.00, maxFloat: 0.80 },
        { weapon: 'Five-SeveN',   skin: 'Crimsonite',      minFloat: 0.00, maxFloat: 0.80 },
        { weapon: 'MAC-10',       skin: 'Monkeyflage',     minFloat: 0.00, maxFloat: 0.80 },
        { weapon: 'USP-S',        skin: 'Jawbreaker',      minFloat: 0.00, maxFloat: 0.80 },
      ],
      classified: [
        { weapon: 'AK-47', skin: 'Inheritance',      minFloat: 0.00, maxFloat: 0.80 },
        { weapon: 'M4A1-S',skin: 'Emphorosaur-S',    minFloat: 0.00, maxFloat: 0.80 },
        { weapon: 'AWP',   skin: 'Duality',          minFloat: 0.00, maxFloat: 0.80 },
      ],
      covert: [
        { weapon: 'AK-47',   skin: 'Leet Museo',     minFloat: 0.00, maxFloat: 0.80 },
        { weapon: 'Glock-18',skin: 'Umbral Rabbit',  minFloat: 0.00, maxFloat: 0.80 },
      ],
    },
  },
  {
    id: 'fracture',
    name: 'Fracture Case',
    icon: '⚡',
    tiers: {
      milspec: [
        { weapon: 'CZ75-Auto', skin: 'Distressed',      minFloat: 0.00, maxFloat: 0.80 },
        { weapon: 'Five-SeveN',skin: 'Violent Daimyo',  minFloat: 0.00, maxFloat: 0.80 },
        { weapon: 'Glock-18',  skin: 'Vogue',           minFloat: 0.00, maxFloat: 0.60 },
        { weapon: 'M249',      skin: 'Warsmith',        minFloat: 0.00, maxFloat: 0.80 },
        { weapon: 'MAG-7',     skin: 'Monster Call',    minFloat: 0.00, maxFloat: 0.80 },
        { weapon: 'PP-Bizon',  skin: 'Space Cat',       minFloat: 0.00, maxFloat: 0.80 },
        { weapon: 'Sawed-Off', skin: 'Analog Input',    minFloat: 0.00, maxFloat: 0.80 },
      ],
      restricted: [
        { weapon: 'AK-47',  skin: 'Legion of Anubis', minFloat: 0.00, maxFloat: 0.80 },
        { weapon: 'MAC-10', skin: 'Allure',            minFloat: 0.00, maxFloat: 0.80 },
        { weapon: 'MP5-SD', skin: 'Liquidation',       minFloat: 0.00, maxFloat: 0.80 },
        { weapon: 'SG 553', skin: 'Cyberforce',        minFloat: 0.00, maxFloat: 0.80 },
        { weapon: 'USP-S',  skin: 'Monster Mashup',    minFloat: 0.00, maxFloat: 0.50 },
      ],
      classified: [
        { weapon: 'AWP',    skin: 'Flux',       minFloat: 0.00, maxFloat: 0.80 },
        { weapon: 'Desert Eagle', skin: 'Printstream', minFloat: 0.00, maxFloat: 0.80 },
        { weapon: 'M4A1-S',skin: 'Printstream',minFloat: 0.00, maxFloat: 0.80 },
      ],
      covert: [
        { weapon: 'AK-47',  skin: 'Phantasmal Strike', minFloat: 0.00, maxFloat: 0.80 },
        { weapon: 'Glock-18',skin: 'Vogue',            minFloat: 0.00, maxFloat: 0.60 },
      ],
    },
  },
  {
    id: 'snakebite',
    name: 'Snakebite Case',
    icon: '🐍',
    tiers: {
      milspec: [
        { weapon: 'AK-47',    skin: 'Slate',          minFloat: 0.00, maxFloat: 0.80 },
        { weapon: 'Glock-18', skin: 'Clear Polymer',  minFloat: 0.06, maxFloat: 0.80 },
        { weapon: 'M4A4',     skin: 'in.highly.toxic',minFloat: 0.00, maxFloat: 0.80 },
        { weapon: 'MP9',      skin: 'Trigger Discipline', minFloat: 0.00, maxFloat: 0.50 },
        { weapon: 'Nova',     skin: 'Wood Fired',     minFloat: 0.00, maxFloat: 0.80 },
        { weapon: 'Tec-9',    skin: 'Decimator',      minFloat: 0.00, maxFloat: 0.80 },
        { weapon: 'XM1014',   skin: 'Entombed',       minFloat: 0.00, maxFloat: 0.80 },
      ],
      restricted: [
        { weapon: 'FAMAS',    skin: 'Crypsis',        minFloat: 0.00, maxFloat: 0.80 },
        { weapon: 'Five-SeveN',skin: 'Hybrid',        minFloat: 0.00, maxFloat: 0.80 },
        { weapon: 'M4A1-S',  skin: 'Night Terror',    minFloat: 0.00, maxFloat: 0.80 },
        { weapon: 'P250',     skin: 'Apep\'s Curse',  minFloat: 0.00, maxFloat: 0.80 },
        { weapon: 'UMP-45',   skin: 'Momentum',       minFloat: 0.00, maxFloat: 0.80 },
      ],
      classified: [
        { weapon: 'AWP',      skin: 'Mosaico',        minFloat: 0.00, maxFloat: 0.80 },
        { weapon: 'MAC-10',   skin: 'Monkeyflage',    minFloat: 0.00, maxFloat: 0.80 },
        { weapon: 'SSG 08',   skin: 'Parallax',       minFloat: 0.00, maxFloat: 0.80 },
      ],
      covert: [
        { weapon: 'AK-47',  skin: 'Case Hardened', minFloat: 0.00, maxFloat: 0.80 },
        { weapon: 'M4A4',   skin: 'Eye of Horus',  minFloat: 0.00, maxFloat: 0.80 },
      ],
    },
  },
  {
    id: 'prisma2',
    name: 'Prisma 2 Case',
    icon: '🔷',
    tiers: {
      milspec: [
        { weapon: 'AK-47',    skin: 'Phantom Disruptor', minFloat: 0.00, maxFloat: 0.80 },
        { weapon: 'Famas',    skin: 'Rapid Eye Movement',minFloat: 0.00, maxFloat: 0.80 },
        { weapon: 'Glock-18', skin: 'Bullet Queen',      minFloat: 0.00, maxFloat: 0.80 },
        { weapon: 'MAC-10',   skin: 'Disco Tech',        minFloat: 0.00, maxFloat: 0.80 },
        { weapon: 'Negev',    skin: 'Ultralight',        minFloat: 0.00, maxFloat: 0.80 },
        { weapon: 'Nova',     skin: 'Plume',             minFloat: 0.00, maxFloat: 0.80 },
        { weapon: 'XM1014',   skin: 'Oxide Blaze',       minFloat: 0.00, maxFloat: 0.80 },
      ],
      restricted: [
        { weapon: 'Desert Eagle', skin: 'Blue Ply',         minFloat: 0.00, maxFloat: 0.80 },
        { weapon: 'Five-SeveN',   skin: 'Buddy',            minFloat: 0.00, maxFloat: 0.80 },
        { weapon: 'MP5-SD',       skin: 'Necrodancer',      minFloat: 0.00, maxFloat: 0.80 },
        { weapon: 'P250',         skin: 'Visions',          minFloat: 0.00, maxFloat: 0.80 },
        { weapon: 'SG 553',       skin: 'Darkwing',         minFloat: 0.00, maxFloat: 0.80 },
      ],
      classified: [
        { weapon: 'AK-47',  skin: 'Nightwish',       minFloat: 0.00, maxFloat: 0.80 },
        { weapon: 'M4A1-S', skin: 'Player Two',      minFloat: 0.00, maxFloat: 0.80 },
        { weapon: 'USP-S',  skin: 'Cortex',          minFloat: 0.00, maxFloat: 0.80 },
      ],
      covert: [
        { weapon: 'AK-47', skin: 'Doppler',           minFloat: 0.00, maxFloat: 0.08 },
        { weapon: 'M4A4',  skin: 'Temukau',           minFloat: 0.00, maxFloat: 0.80 },
      ],
    },
  },
]
