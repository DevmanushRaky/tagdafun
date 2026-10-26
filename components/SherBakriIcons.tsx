import React from 'react';
import { View } from 'react-native';
import { PIECE_SETS, SherColors, BakriColors } from '../constants/shop';
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

// Sher aur Bakri pieces, drawn in a 100×100 box as round tokens.
// `id` keeps gradient ids unique when many tokens share a screen.

// Twelve tufts around the face make the mane.
const MANE = Array.from({ length: 12 }, (_, k) => {
  const a = (k / 12) * Math.PI * 2;
  return { x: 50 + Math.cos(a) * 31, y: 52 + Math.sin(a) * 31 };
});

export const SherToken: React.FC<{ size: number; id?: string; colors?: SherColors }> = ({ size, id = 's', colors = PIECE_SETS[0].sher }) => (
  <Svg width={size} height={size} viewBox="0 0 100 100">
    <Defs>
      <RadialGradient id={`sb${id}`} cx="40%" cy="35%" r="70%">
        <Stop offset="0" stopColor={colors.bg[0]} />
        <Stop offset="1" stopColor={colors.bg[1]} />
      </RadialGradient>
      <RadialGradient id={`sm${id}`} cx="50%" cy="40%" r="60%">
        <Stop offset="0" stopColor={colors.mane[0]} />
        <Stop offset="1" stopColor={colors.mane[1]} />
      </RadialGradient>
      <LinearGradient id={`sf${id}`} x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor={colors.face[0]} />
        <Stop offset="1" stopColor={colors.face[1]} />
      </LinearGradient>
    </Defs>

    {/* Token */}
    <Circle cx="50" cy="50" r="48" fill={colors.ring} />
    <Circle cx="50" cy="50" r="45" fill={`url(#sb${id})`} />

    {/* Mane */}
    {MANE.map((p, k) => (
      <Circle key={k} cx={p.x} cy={p.y} r="12" fill={`url(#sm${id})`} stroke="#5A2A05" strokeWidth="1.8" />
    ))}
    <Circle cx="50" cy="52" r="31" fill={`url(#sm${id})`} />

    {/* Ears */}
    <Circle cx="29" cy="30" r="8" fill={`url(#sf${id})`} stroke="#5A2A05" strokeWidth="1.8" />
    <Circle cx="71" cy="30" r="8" fill={`url(#sf${id})`} stroke="#5A2A05" strokeWidth="1.8" />
    <Circle cx="29" cy="31" r="3.6" fill="#C9605A" />
    <Circle cx="71" cy="31" r="3.6" fill="#C9605A" />

    {/* Face */}
    <Ellipse cx="50" cy="54" rx="23" ry="25" fill={`url(#sf${id})`} stroke="#7A4A12" strokeWidth="2" />

    {/* Brows and eyes */}
    <Path d="M32 42 L44 46" stroke="#5A2A05" strokeWidth="3" strokeLinecap="round" />
    <Path d="M68 42 L56 46" stroke="#5A2A05" strokeWidth="3" strokeLinecap="round" />
    <Path d="M34 49 Q39.5 44 45 49 Q39.5 53 34 49 Z" fill="#FFF6D6" stroke="#3B1D08" strokeWidth="1.5" />
    <Path d="M55 49 Q60.5 44 66 49 Q60.5 53 55 49 Z" fill="#FFF6D6" stroke="#3B1D08" strokeWidth="1.5" />
    <Circle cx="39.5" cy="48.8" r="2.7" fill="#B8620C" />
    <Circle cx="60.5" cy="48.8" r="2.7" fill="#B8620C" />
    <Circle cx="39.5" cy="48.8" r="1.3" fill="#111" />
    <Circle cx="60.5" cy="48.8" r="1.3" fill="#111" />

    {/* Muzzle */}
    <Ellipse cx="44" cy="63" rx="8.5" ry="7" fill="#FFF3D9" />
    <Ellipse cx="56" cy="63" rx="8.5" ry="7" fill="#FFF3D9" />
    <Path d="M43.5 55.5 L56.5 55.5 L50 63 Z" fill="#8A3B2C" stroke="#4A1D12" strokeWidth="1.2" strokeLinejoin="round" />
    <Path d="M50 63 L50 67 M50 67 Q45 72 40.5 68.5 M50 67 Q55 72 59.5 68.5" stroke="#4A1D12" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    <Circle cx="43" cy="63" r="0.9" fill="#A47A55" />
    <Circle cx="39.5" cy="61.5" r="0.9" fill="#A47A55" />
    <Circle cx="57" cy="63" r="0.9" fill="#A47A55" />
    <Circle cx="60.5" cy="61.5" r="0.9" fill="#A47A55" />

    {/* Gloss */}
    <Ellipse cx="36" cy="20" rx="12" ry="4.5" fill="#FFFFFF" fillOpacity="0.28" />
  </Svg>
);

export const BakriToken: React.FC<{ size: number; id?: string; colors?: BakriColors }> = ({ size, id = 'g', colors = PIECE_SETS[0].bakri }) => (
  <Svg width={size} height={size} viewBox="0 0 100 100">
    <Defs>
      <RadialGradient id={`gb${id}`} cx="40%" cy="35%" r="70%">
        <Stop offset="0" stopColor={colors.bg[0]} />
        <Stop offset="1" stopColor={colors.bg[1]} />
      </RadialGradient>
      <LinearGradient id={`gf${id}`} x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#FFFFFF" />
        <Stop offset="1" stopColor="#E7E1D3" />
      </LinearGradient>
      <LinearGradient id={`gh${id}`} x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#B8A58A" />
        <Stop offset="1" stopColor="#6E5B45" />
      </LinearGradient>
    </Defs>

    {/* Token */}
    <Circle cx="50" cy="50" r="48" fill={colors.ring} />
    <Circle cx="50" cy="50" r="45" fill={`url(#gb${id})`} />

    {/* Horns curling back */}
    <Path d="M40 30 Q30 12 18 22 Q28 20 34 34 Z" fill={`url(#gh${id})`} stroke="#4A3B2A" strokeWidth="1.6" strokeLinejoin="round" />
    <Path d="M60 30 Q70 12 82 22 Q72 20 66 34 Z" fill={`url(#gh${id})`} stroke="#4A3B2A" strokeWidth="1.6" strokeLinejoin="round" />

    {/* Floppy ears */}
    <Path d="M30 40 Q14 40 12 50 Q24 52 32 46 Z" fill="#F3EDE0" stroke="#5A5040" strokeWidth="1.6" />
    <Path d="M70 40 Q86 40 88 50 Q76 52 68 46 Z" fill="#F3EDE0" stroke="#5A5040" strokeWidth="1.6" />
    <Path d="M28 43 Q19 44 17 48 Q24 49 29 46 Z" fill="#F2B8B5" />
    <Path d="M72 43 Q81 44 83 48 Q76 49 71 46 Z" fill="#F2B8B5" />

    {/* Long head */}
    <Path d="M50 28 Q70 28 69 50 Q68 72 58 80 Q50 85 42 80 Q32 72 31 50 Q30 28 50 28 Z"
      fill={`url(#gf${id})`} stroke="#5A5040" strokeWidth="2" strokeLinejoin="round" />
    {/* Forehead tuft */}
    <Path d="M44 30 Q50 22 56 30 Q50 28 44 30 Z" fill="#E7E1D3" stroke="#5A5040" strokeWidth="1.2" />

    {/* Goat eyes: amber with a sideways pupil */}
    <Ellipse cx="40" cy="48" rx="5" ry="4.2" fill="#F6C453" stroke="#4A3B2A" strokeWidth="1.4" />
    <Ellipse cx="60" cy="48" rx="5" ry="4.2" fill="#F6C453" stroke="#4A3B2A" strokeWidth="1.4" />
    <Rect x="36.6" y="47" width="6.8" height="2.2" rx="1" fill="#1A1A1A" />
    <Rect x="56.6" y="47" width="6.8" height="2.2" rx="1" fill="#1A1A1A" />

    {/* Muzzle */}
    <Ellipse cx="50" cy="70" rx="11" ry="8" fill="#F5C6C0" stroke="#5A5040" strokeWidth="1.4" />
    <Ellipse cx="46" cy="69" rx="1.8" ry="1.3" fill="#7A4B45" />
    <Ellipse cx="54" cy="69" rx="1.8" ry="1.3" fill="#7A4B45" />
    <Path d="M46 74 Q50 77 54 74" stroke="#7A4B45" strokeWidth="1.4" fill="none" strokeLinecap="round" />

    {/* Little beard */}
    <Path d="M46 81 Q50 93 54 81 Q50 84 46 81 Z" fill="#E7E1D3" stroke="#5A5040" strokeWidth="1.2" />

    {/* Gloss */}
    <Ellipse cx="36" cy="22" rx="12" ry="5" fill="#FFFFFF" fillOpacity="0.3" />
  </Svg>
);

/** A sher and a bakri side by side, for the Home card and menus. */
export const SherBakriIcon: React.FC<{ size: number }> = ({ size }) => {
  const t = size * 0.66;
  return (
    <View style={{ width: size, height: size }}>
      <View style={{ position: 'absolute', left: 0, top: 0 }}><SherToken size={t} id="ic" /></View>
      <View style={{ position: 'absolute', right: 0, bottom: 0 }}><BakriToken size={t} id="ic" /></View>
    </View>
  );
};
