import React, { useEffect, useRef, useState } from 'react';
import { Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ADS } from '../../services/ads';
import { showRewardedAd } from '../../services/rewardedAd';
import { useGameStats } from '../../contexts/GameStatsContext';
import { logGame } from '../../utils/gameHistory';
import { COLORS, BORDER_RADIUS } from '../../constants/theme';

type State = 'ready' | 'loading' | 'done' | 'none';

/**
 * "Watch a video for bonus coins" on a game's result card. The viewer chooses to watch, as rewarded ads
 * require. Renders nothing when no rewarded ad unit is configured; if no ad can be loaded it says so and
 * the game carries on. `resetKey` makes it ready again for the next result.
 */
const WatchVideoButton: React.FC<{ resetKey: unknown }> = ({ resetKey }) => {
  const { addBonusCoins } = useGameStats();
  const [state, setState] = useState<State>('ready');
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  useEffect(() => { setState('ready'); }, [resetKey]);

  if (!ADS.rewardedAdUnitId) return null;

  const watch = async () => {
    if (state !== 'ready') return;
    setState('loading');
    const res = await showRewardedAd();
    if (res === 'rewarded') {
      await addBonusCoins(ADS.rewardedCoinsAmount);
      logGame({ timestamp: Date.now(), gameType: 'ad', costCoins: 0, earnedCoins: ADS.rewardedCoinsAmount, netCoins: ADS.rewardedCoinsAmount }).catch(() => {});
    }
    if (!mounted.current) return;
    setState(res === 'rewarded' ? 'done' : res === 'unavailable' ? 'none' : 'ready');
  };

  const on = state === 'ready';
  return (
    <TouchableOpacity style={[styles.btn, !on && styles.btnOff]} onPress={watch} disabled={!on} activeOpacity={0.85}>
      <Ionicons name={state === 'done' ? 'checkmark-circle' : 'play-circle'} size={20} color={on ? '#E8590C' : COLORS.textSecondary} />
      <Text style={[styles.text, !on && styles.textOff]}>
        {state === 'done' ? `+${ADS.rewardedCoinsAmount} coins added`
          : state === 'loading' ? 'Loading video…'
          : state === 'none' ? 'No video available right now'
          : `Watch a video · +${ADS.rewardedCoinsAmount} coins`}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  btn: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: BORDER_RADIUS.full, borderWidth: 2, borderColor: '#E8590C', backgroundColor: '#FFF4E8', marginTop: 4 },
  btnOff: { borderColor: COLORS.surfaceDark, backgroundColor: COLORS.surfaceDark },
  text: { fontSize: 15, fontWeight: '800', color: '#E8590C' },
  textOff: { color: COLORS.textSecondary },
});

export default WatchVideoButton;
