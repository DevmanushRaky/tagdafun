import React from 'react';
import Svg, {
  Circle, ClipPath, Defs, G, Line, LinearGradient, Path, Rect, Stop, Text as SvgText,
} from 'react-native-svg';
import { CoinFace } from './CoinToss';
import { useShop } from '../contexts/ShopContext';
import { coinPalette } from '../constants/shop';
import { WATER_COLORS } from '../utils/waterSort';

// Game artwork for the home cards, drawn in a 64×64 box.

const MemoryIcon: React.FC<{ size: number }> = ({ size }) => (
  <Svg width={size} height={size} viewBox="0 0 64 64">
    <Defs>
      <LinearGradient id="mcBack" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#2A5A8A" />
        <Stop offset="1" stopColor="#002244" />
      </LinearGradient>
    </Defs>

    {/* Face-down card */}
    <G transform="rotate(-12 24 32)">
      <Rect x="9" y="12" width="28" height="40" rx="5" fill="url(#mcBack)" stroke="#FFFFFF" strokeWidth="1.8" />
      <Rect x="12.5" y="15.5" width="21" height="33" rx="3" fill="none" stroke="#FFFFFF" strokeOpacity="0.35" strokeWidth="1" />
      <SvgText x="23" y="38" fill="#FFFFFF" fillOpacity="0.85" fontSize="16" fontWeight="900" textAnchor="middle">?</SvgText>
    </G>

    {/* Face-up card */}
    <G transform="rotate(10 40 32)">
      <Rect x="27" y="12" width="28" height="40" rx="5" fill="#FFFFFF" stroke="#DADADA" strokeWidth="1" />
      <Path
        d="M41 41 C 33 35.5, 32.5 28.5, 36.6 27.3 C 38.8 26.7, 40.4 28, 41 29.6 C 41.6 28, 43.2 26.7, 45.4 27.3 C 49.5 28.5, 49 35.5, 41 41 Z"
        fill="#FF4757"
      />
    </G>
  </Svg>
);

// Bottle outline: straight neck into a rounded body.
const bottlePath = (x: number) =>
  `M ${x + 5} 8 H ${x + 13} V 17 Q ${x + 18} 18 ${x + 18} 24 V 52 Q ${x + 18} 57 ${x + 13} 57 H ${x + 5} Q ${x} 57 ${x} 52 V 24 Q ${x} 18 ${x + 5} 17 Z`;

const LAYER_H = 8;
const LAYER_BOTTOM = 57;

const Bottle: React.FC<{ id: string; x: number; layers: string[]; glass?: string; stroke?: string }> = ({
  id, x, layers, glass = 'rgba(255,255,255,0.18)', stroke = '#FFFFFF',
}) => (
  <>
    <Defs>
      <ClipPath id={id}>
        <Path d={bottlePath(x)} />
      </ClipPath>
    </Defs>
    <Path d={bottlePath(x)} fill={glass} />
    <G clipPath={`url(#${id})`}>
      {layers.map((color, i) => (
        <Rect key={i} x={x} y={LAYER_BOTTOM - (i + 1) * LAYER_H} width="18" height={LAYER_H} fill={color} />
      ))}
    </G>
    <Path d={bottlePath(x)} fill="none" stroke={stroke} strokeWidth="1.8" />
    <Line x1={x + 4} y1="25" x2={x + 4} y2="48" stroke="#FFFFFF" strokeOpacity="0.55" strokeWidth="1.6" strokeLinecap="round" />
  </>
);

const hex = (name: string) => WATER_COLORS.find(c => c.name === name)?.hex ?? '#FFFFFF';

const WaterIcon: React.FC<{ size: number }> = ({ size }) => (
  <Svg width={size} height={size} viewBox="0 0 64 64">
    <Bottle id="wtA" x={11} layers={[hex('Red'), hex('Blue'), hex('Yellow'), hex('Blue')]} />
    <Bottle id="wtB" x={35} layers={[hex('Yellow'), hex('Red'), hex('Red')]} />
  </Svg>
);

/** Shop preview of a Water Sorting bottle theme: two bottles in the theme's glass and outline. */
export const WaterThemeIcon: React.FC<{ size: number; glass: string; stroke: string; idKey: string }> = ({ size, glass, stroke, idKey }) => (
  <Svg width={size} height={size} viewBox="0 0 64 64">
    <Bottle id={`th${idKey}A`} x={11} layers={[hex('Red'), hex('Blue'), hex('Yellow')]} glass={glass} stroke={stroke} />
    <Bottle id={`th${idKey}B`} x={35} layers={[hex('Green'), hex('Purple'), hex('Purple'), hex('Purple')]} glass={glass} stroke={stroke} />
  </Svg>
);

const KiteIcon: React.FC<{ size: number }> = ({ size }) => (
  <Svg width={size} height={size} viewBox="0 0 64 64">
    <Path d="M 34 44 Q 22 54 10 60" stroke="#FFFFFF" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    <Path d="M 34 44 L 29 53 L 39 53 Z" fill="#FF5E00" />
    <Path d="M 34 6 L 18 24 L 34 46 Z" fill="#FF5E00" />
    <Path d="M 34 6 L 50 24 L 34 46 Z" fill="#FFFFFF" />
    <Path d="M 34 6 L 34 46" stroke="#5D4037" strokeWidth="1.6" />
    <Path d="M 18 24 Q 34 16 50 24" stroke="#5D4037" strokeWidth="1.6" fill="none" />
  </Svg>
);

const BubbleIcon: React.FC<{ size: number }> = ({ size }) => {
  const b = (cx: number, cy: number, color: string) => (
    <>
      <Circle cx={cx} cy={cy} r="9" fill={color} />
      <Circle cx={cx - 3} cy={cy - 3} r="2.6" fill="#FFFFFF" fillOpacity="0.6" />
    </>
  );
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      {b(14, 14, '#FF4757')}{b(32, 14, '#FFC312')}{b(50, 14, '#2ED573')}
      {b(23, 29, '#1E90FF')}{b(41, 29, '#FF4757')}
      <Path d="M 32 56 L 32 42" stroke="#FFFFFF" strokeWidth="2" strokeDasharray="2 3" strokeLinecap="round" />
      {b(32, 52, '#FFC312')}
    </Svg>
  );
};

// The coin icon shows the coin skin the player picked in the Shop.
const CoinIcon: React.FC<{ size: number }> = ({ size }) => (
  <CoinFace side="heads" size={size} skin={coinPalette(useShop().shop.coinSkin)} />
);

export const GameIcon: React.FC<{ id: string; size: number }> = ({ id, size }) => {
  if (id === 'coin') return <CoinIcon size={size} />;
  if (id === 'memory') return <MemoryIcon size={size} />;
  if (id === 'water') return <WaterIcon size={size} />;
  if (id === 'kite') return <KiteIcon size={size} />;
  if (id === 'bubble') return <BubbleIcon size={size} />;
  return null;
};
