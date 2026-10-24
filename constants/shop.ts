// ─── SHOP CATALOG ────────────────────────────────────────────────────────────
// Prices are in in-game coins. For scale: a coin flip pays 5–10, a Memory or Water
// level 80–150 by stars, the daily challenge 25. Unlocking every skin and card back
// costs 21,000 and every bottle theme another 7,200: about 235 levels at a 2–3★ average.

export type PowerUpId = 'memoryHint' | 'waterHint' | 'waterBottle';

export interface PowerUp {
  id: PowerUpId;
  title: string;
  description: string;
  game: 'memory' | 'water';
  icon: string;          // Ionicons name
  price: number;
}

export const POWER_UPS: PowerUp[] = [
  { id: 'memoryHint', title: 'Memory Hint', description: 'Show every card for 3 seconds', game: 'memory', icon: 'eye', price: 100 },
  { id: 'waterHint', title: 'Water Hint', description: 'Highlight the best next pour', game: 'water', icon: 'bulb', price: 80 },
  { id: 'waterBottle', title: 'Extra Bottle', description: 'One more empty bottle for a level', game: 'water', icon: 'add-circle', price: 150 },
];

/** Colours for one coin finish, used by the Coin Toss coin and its icon. */
export interface CoinPalette {
  rim: [string, string, string, string];
  field: [string, string, string];
  metal: [string, string];
  ink: string;         // legend, reeding, beads
  shadow: string;      // emboss shadow
  highlight: string;   // emboss highlight
}

export type CoinSkinId = 'gold' | 'silver' | 'rose' | 'emerald' | 'diamond';

export interface CoinSkin { id: CoinSkinId; title: string; price: number; palette: CoinPalette }

export const COIN_SKINS: CoinSkin[] = [
  {
    id: 'gold', title: 'Classic Gold', price: 0,
    palette: {
      rim: ['#FFF0A8', '#E9B530', '#A86E06', '#F2C94C'], field: ['#FFF4C2', '#F4C440', '#B57A0C'],
      metal: ['#FCD86A', '#D49A1C'], ink: '#8A5A00', shadow: '#7A4E00', highlight: '#FFF6CC',
    },
  },
  {
    id: 'silver', title: 'Silver', price: 1000,
    palette: {
      rim: ['#FFFFFF', '#C9D1D9', '#7D8794', '#DDE3E8'], field: ['#FFFFFF', '#CDD5DD', '#8A949F'],
      metal: ['#E9EEF2', '#AEB7C0'], ink: '#4A5560', shadow: '#3E4751', highlight: '#FFFFFF',
    },
  },
  {
    id: 'rose', title: 'Rose Gold', price: 2500,
    palette: {
      rim: ['#FFE3D6', '#E8A08A', '#A85A48', '#F2BBA8'], field: ['#FFEDE4', '#EDB3A0', '#B66A57'],
      metal: ['#F6C4B3', '#D08A75'], ink: '#7A3A2B', shadow: '#6A3022', highlight: '#FFF1EA',
    },
  },
  {
    id: 'emerald', title: 'Emerald', price: 4000,
    palette: {
      rim: ['#C8F7DC', '#2ECC71', '#117A43', '#58D68D'], field: ['#D9FBE7', '#41C77E', '#0F7A41'],
      metal: ['#7BE0A6', '#23A65E'], ink: '#0B5A2F', shadow: '#08451F', highlight: '#E6FFF0',
    },
  },
  {
    id: 'diamond', title: 'Diamond', price: 7500,
    palette: {
      rim: ['#FFFFFF', '#9FE3FF', '#3C8DCC', '#C9F1FF'], field: ['#F2FCFF', '#A8E6FF', '#4A9AD6'],
      metal: ['#D6F5FF', '#7CC6F0'], ink: '#1D5A8A', shadow: '#164A73', highlight: '#FFFFFF',
    },
  },
];

export type CardBackId = 'navy' | 'galaxy' | 'sunset' | 'ocean';

export interface CardBack { id: CardBackId; title: string; price: number; colors: [string, string] }

export const CARD_BACKS: CardBack[] = [
  { id: 'navy', title: 'Navy', price: 0, colors: ['#0B3F70', '#002244'] },
  { id: 'galaxy', title: 'Galaxy', price: 1500, colors: ['#7B3FBF', '#2C0A4A'] },
  { id: 'sunset', title: 'Sunset', price: 1500, colors: ['#FF8C42', '#D9384F'] },
  { id: 'ocean', title: 'Ocean', price: 3000, colors: ['#00B4D8', '#03578A'] },
];

/** Look of the Water Sorting board: background, glass and lid. */
export interface BottleTheme {
  panel: [string, string];   // board background gradient
  glass: string;             // translucent body behind the liquid
  stroke: string;            // bottle outline
  lip: string;               // rim at the mouth
  floor: string;             // soft shadow under each bottle
}

export type BottleThemeId = 'classic' | 'night' | 'sunset' | 'forest' | 'gold';

export interface BottleThemeItem { id: BottleThemeId; title: string; price: number; theme: BottleTheme }

export const BOTTLE_THEMES: BottleThemeItem[] = [
  {
    id: 'classic', title: 'Classic', price: 0,
    theme: { panel: ['#E9F5FF', '#D2E9FA'], glass: 'rgba(255,255,255,0.42)', stroke: 'rgba(95,115,135,0.6)', lip: 'rgba(110,130,150,0.6)', floor: 'rgba(40,80,120,0.16)' },
  },
  {
    id: 'night', title: 'Night', price: 1200,
    theme: { panel: ['#1B2A4A', '#0B1426'], glass: 'rgba(255,255,255,0.12)', stroke: 'rgba(170,200,240,0.75)', lip: 'rgba(170,200,240,0.6)', floor: 'rgba(0,0,0,0.35)' },
  },
  {
    id: 'sunset', title: 'Sunset', price: 1500,
    theme: { panel: ['#FFE6CC', '#FFC2A6'], glass: 'rgba(255,255,255,0.45)', stroke: 'rgba(176,98,64,0.7)', lip: 'rgba(176,98,64,0.6)', floor: 'rgba(150,70,40,0.16)' },
  },
  {
    id: 'forest', title: 'Forest', price: 1500,
    theme: { panel: ['#E3F6E6', '#BFE6C8'], glass: 'rgba(255,255,255,0.45)', stroke: 'rgba(60,120,75,0.7)', lip: 'rgba(60,120,75,0.6)', floor: 'rgba(30,90,45,0.16)' },
  },
  {
    id: 'gold', title: 'Royal Gold', price: 3000,
    theme: { panel: ['#FFF6DD', '#F3DDA0'], glass: 'rgba(255,255,255,0.5)', stroke: 'rgba(176,128,24,0.85)', lip: '#C9971F', floor: 'rgba(140,100,20,0.18)' },
  },
];

export const bottleTheme = (id: BottleThemeId): BottleTheme =>
  (BOTTLE_THEMES.find(t => t.id === id) ?? BOTTLE_THEMES[0]).theme;

export const coinPalette = (id: CoinSkinId): CoinPalette =>
  (COIN_SKINS.find(s => s.id === id) ?? COIN_SKINS[0]).palette;

export const cardBackColors = (id: CardBackId): [string, string] =>
  (CARD_BACKS.find(b => b.id === id) ?? CARD_BACKS[0]).colors;

// Daily gift: claim on consecutive days to climb the ladder; a missed day starts over.
export const DAILY_GIFT_LADDER = [10, 15, 20, 25, 30, 40, 60];
