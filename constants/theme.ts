export const COLORS = {
  // Primary brand
  primary: '#FF6B00',
  primaryLight: '#FF8C42',
  primaryDark: '#E55A00',
  primaryGlow: 'rgba(255, 107, 0, 0.25)',

  // Secondary
  secondary: '#002244',
  secondaryLight: '#1A3A5A',

  // Fun accent colors
  accent1: '#FF4757',   // Red
  accent2: '#2ED573',   // Green
  accent3: '#1E90FF',   // Blue
  accent4: '#ECCC68',   // Yellow
  accent5: '#A55EEA',   // Purple
  accent6: '#FF6B81',   // Pink

  // Backgrounds
  background: '#FFF8F3',
  backgroundCard: '#FFFFFF',
  backgroundGradientStart: '#FFF3E8',
  backgroundGradientEnd: '#FFE0C4',

  // Surface
  surface: '#FFFFFF',
  surfaceDark: '#F0F0F0',

  // Text
  text: '#1A1A1A',
  textSecondary: '#6C757D',
  textLight: '#ADB5BD',
  textOnPrimary: '#FFFFFF',

  // Status
  success: '#2ED573',
  warning: '#ECCC68',
  error: '#FF4757',

  // Gamification
  xpColor: '#FFD700',
  xpGlow: 'rgba(255, 215, 0, 0.35)',
  levelColor: '#A55EEA',
  badgeGold: '#FFD700',
  badgeSilver: '#C0C0C0',
  badgeBronze: '#CD7F32',

  // Utility
  border: '#FFE0C4',
  shadow: 'rgba(255, 107, 0, 0.12)',
  shadowDark: 'rgba(0,0,0,0.15)',
  overlay: 'rgba(0, 0, 0, 0.55)',
};

export const GRADIENTS = {
  primary: ['#FF8C42', '#FF6B00'] as const,
  primaryReverse: ['#FF6B00', '#FF4500'] as const,
  warm: ['#FFF3E8', '#FFE0C4'] as const,
  success: ['#2ED573', '#17B85A'] as const,
  purple: ['#A55EEA', '#7B2FBE'] as const,
  gold: ['#FFD700', '#FFA500'] as const,
  blue: ['#1E90FF', '#0066CC'] as const,
  card: ['#FFFFFF', '#FFF8F3'] as const,
};

export const TYPOGRAPHY = {
  h1: { fontSize: 32, fontWeight: 'bold' as const, letterSpacing: 0.5 },
  h2: { fontSize: 24, fontWeight: 'bold' as const, letterSpacing: 0.3 },
  h3: { fontSize: 20, fontWeight: '700' as const },
  h4: { fontSize: 18, fontWeight: '700' as const },
  body: { fontSize: 16, fontWeight: '400' as const },
  bodyBold: { fontSize: 16, fontWeight: '600' as const },
  caption: { fontSize: 14, fontWeight: '400' as const },
  captionBold: { fontSize: 14, fontWeight: '600' as const },
  small: { fontSize: 12, fontWeight: '400' as const },
  smallBold: { fontSize: 12, fontWeight: '700' as const },
  button: { fontSize: 17, fontWeight: 'bold' as const, letterSpacing: 0.5 },
};

export const SHADOWS = {
  small: {
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  medium: {
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  large: {
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
};

export const BORDER_RADIUS = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  full: 999,
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};
