import { LevelPlayInterstitialAd } from 'unity-levelplay-mediation';
import { ADS } from './ads';

// A full-screen ad shown on its own between games, never one the player has to ask for.
// It needs an interstitial ad unit; with none configured, or none loaded, nothing happens and the game goes on.
const EVERY_N_GAMES = 3;

let ad: LevelPlayInterstitialAd | null = null;
let ready = false;
let loading = false;
let gamesSinceAd = 0;

function dispose(which: LevelPlayInterstitialAd) {
  if (ad === which) { ad = null; ready = false; loading = false; }
  // Release the native ad object; a fresh one is made for every view.
  Promise.resolve().then(() => which.remove()).catch(() => {});
}

/** Starts loading the next interstitial so it is ready when a game ends. Safe to call any time. */
export function prepareInterstitial() {
  if (!ADS.interstitialAdUnitId || ad || loading) return;
  loading = true;
  const next = new LevelPlayInterstitialAd(ADS.interstitialAdUnitId);
  ad = next;
  next.setListener({
    onAdLoaded: () => { loading = false; ready = true; },
    onAdLoadFailed: () => dispose(next),
    onAdInfoChanged: () => {},
    onAdDisplayed: () => {},
    onAdDisplayFailed: () => dispose(next),
    onAdClicked: () => {},
    onAdClosed: () => { dispose(next); prepareInterstitial(); },
  });
  Promise.resolve().then(() => next.loadAd()).catch(() => dispose(next));
}

/**
 * Call once each time a game ends. Every third game it shows an interstitial if one is loaded;
 * if not, it tries again after the next game rather than making the player wait.
 */
export function interstitialAfterGame() {
  if (!ADS.interstitialAdUnitId) return;
  gamesSinceAd += 1;
  if (gamesSinceAd < EVERY_N_GAMES) return;
  const current = ad;
  if (!current || !ready) { prepareInterstitial(); return; }
  gamesSinceAd = 0;
  ready = false;
  Promise.resolve().then(() => current.showAd()).catch(() => dispose(current));
}
