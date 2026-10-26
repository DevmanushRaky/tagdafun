import React from 'react';
import Svg, { Circle, Line, Path, Polygon } from 'react-native-svg';
import { MarkSetId, markSet } from '../constants/shop';
import { SherToken, BakriToken } from './SherBakriIcons';

// Tic-Tac-Toe symbols, drawn in a 100×100 box. `X` is the first player's mark and `O` the second's.
// `id` keeps gradient ids unique when several tokens share a screen.

const STAR = '50,12 61,38 89,40 67,58 74,86 50,70 26,86 33,58 11,40 39,38';
const HEART = 'M50 84 C20 62 12 44 12 32 C12 20 22 12 32 12 C40 12 47 17 50 24 C53 17 60 12 68 12 C78 12 88 20 88 32 C88 44 80 62 50 84 Z';
const MOON = 'M66 14 A38 38 0 1 0 86 68 A30 30 0 0 1 66 14 Z';

const rays = Array.from({ length: 8 }, (_, k) => {
  const a = (k / 8) * Math.PI * 2;
  return { x1: 50 + Math.cos(a) * 30, y1: 50 + Math.sin(a) * 30, x2: 50 + Math.cos(a) * 42, y2: 50 + Math.sin(a) * 42 };
});

export const TicTacMark: React.FC<{ setId: MarkSetId; mark: 'X' | 'O'; size: number; id?: string }> = ({ setId, mark, size, id = 'm' }) => {
  const c = markSet(setId);
  const colour = mark === 'X' ? c.x : c.o;

  if (setId === 'sherbakri') {
    return mark === 'X' ? <SherToken size={size} id={`tt${id}`} /> : <BakriToken size={size} id={`tt${id}`} />;
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {setId === 'sunmoon' && (mark === 'X' ? (
        <>
          {rays.map((r, k) => <Line key={k} {...r} stroke={colour} strokeWidth="8" strokeLinecap="round" />)}
          <Circle cx="50" cy="50" r="21" fill={colour} />
          <Circle cx="43" cy="43" r="7" fill="#FFFFFF" fillOpacity="0.35" />
        </>
      ) : (
        <>
          <Path d={MOON} fill={colour} />
          <Circle cx="38" cy="58" r="3.5" fill="#FFFFFF" fillOpacity="0.4" />
          <Circle cx="48" cy="72" r="2.5" fill="#FFFFFF" fillOpacity="0.4" />
        </>
      ))}

      {setId === 'starheart' && (mark === 'X' ? (
        <>
          <Polygon points={STAR} fill={colour} stroke="#B07C00" strokeWidth="4" strokeLinejoin="round" />
          <Polygon points="50,24 56,40 72,41 60,51" fill="#FFFFFF" fillOpacity="0.4" />
        </>
      ) : (
        <>
          <Path d={HEART} fill={colour} stroke="#9E1530" strokeWidth="4" strokeLinejoin="round" />
          <Path d="M26 28 Q31 20 38 22" stroke="#FFFFFF" strokeOpacity="0.55" strokeWidth="5" strokeLinecap="round" fill="none" />
        </>
      ))}

      {(setId === 'classic' || setId === 'neon' || setId === 'royal') && (mark === 'X' ? (
        <>
          {setId === 'neon' && (
            <>
              <Line x1="22" y1="22" x2="78" y2="78" stroke={colour} strokeOpacity="0.28" strokeWidth="24" strokeLinecap="round" />
              <Line x1="78" y1="22" x2="22" y2="78" stroke={colour} strokeOpacity="0.28" strokeWidth="24" strokeLinecap="round" />
            </>
          )}
          <Line x1="22" y1="22" x2="78" y2="78" stroke={colour} strokeWidth="13" strokeLinecap="round" />
          <Line x1="78" y1="22" x2="22" y2="78" stroke={colour} strokeWidth="13" strokeLinecap="round" />
          {setId === 'neon' && (
            <>
              <Line x1="22" y1="22" x2="78" y2="78" stroke="#FFFFFF" strokeOpacity="0.7" strokeWidth="3.5" strokeLinecap="round" />
              <Line x1="78" y1="22" x2="22" y2="78" stroke="#FFFFFF" strokeOpacity="0.7" strokeWidth="3.5" strokeLinecap="round" />
            </>
          )}
          {setId === 'royal' && (
            <>
              <Line x1="22" y1="22" x2="78" y2="78" stroke="#FFF1B8" strokeWidth="3.5" strokeLinecap="round" />
              <Line x1="78" y1="22" x2="22" y2="78" stroke="#FFF1B8" strokeWidth="3.5" strokeLinecap="round" />
            </>
          )}
        </>
      ) : (
        <>
          {setId === 'neon' && <Circle cx="50" cy="50" r="29" stroke={colour} strokeOpacity="0.28" strokeWidth="24" fill="none" />}
          <Circle cx="50" cy="50" r="29" stroke={colour} strokeWidth="13" fill="none" />
          {setId === 'neon' && <Circle cx="50" cy="50" r="29" stroke="#FFFFFF" strokeOpacity="0.7" strokeWidth="3.5" fill="none" />}
          {setId === 'royal' && <Circle cx="50" cy="50" r="29" stroke="#E6D2FF" strokeWidth="3.5" fill="none" />}
        </>
      ))}
    </Svg>
  );
};
