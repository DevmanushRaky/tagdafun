import { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAudioPlayer, type AudioPlayer, type AudioSource } from 'expo-audio';

/** Plays a short effect from the top, so quick repeats still sound. */
export const playSound = (player: AudioPlayer) => {
  try {
    player.seekTo(0).catch(() => {});
    player.play();
  } catch {}
};

const FADE_STEPS = 10;
const FADE_STEP_MS = 60;

/**
 * Looping background track for a game screen.
 * Plays while `active` and the player hasn't switched it off; the on/off choice is saved under `storageKey`.
 * Changing `volume` while playing fades to the new level (used to duck the music under a win jingle).
 */
export function useBackgroundMusic(source: AudioSource, storageKey: string, { active, volume }: { active: boolean; volume: number }) {
  const player = useAudioPlayer(source);
  const [musicOn, setMusicOn] = useState(true);
  const playingRef = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(storageKey).then(v => { if (v === 'off') setMusicOn(false); }).catch(() => {});
  }, [storageKey]);

  useEffect(() => {
    player.loop = true;
  }, [player]);

  const shouldPlay = musicOn && active;
  useEffect(() => {
    if (!shouldPlay) {
      try { player.pause(); } catch {}
      playingRef.current = false;
      return;
    }
    if (!playingRef.current) {
      try { player.volume = 0; player.play(); } catch {}
      playingRef.current = true;
    }
    let v = player.volume ?? 0;
    const step = (volume - v) / FADE_STEPS;
    if (step === 0) return;
    const id = setInterval(() => {
      v += step;
      const reached = step > 0 ? v >= volume : v <= volume;
      if (reached) v = volume;
      try { player.volume = v; } catch {}
      if (reached) clearInterval(id);
    }, FADE_STEP_MS);
    return () => clearInterval(id);
  }, [shouldPlay, volume, player]);

  const toggleMusic = () => {
    setMusicOn(on => {
      AsyncStorage.setItem(storageKey, on ? 'off' : 'on').catch(() => {});
      return !on;
    });
  };

  return { musicOn, toggleMusic };
}
