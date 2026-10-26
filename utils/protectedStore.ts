import AsyncStorage from '@react-native-async-storage/async-storage';
import { hmacSha256, utf8, toHex } from './hmac';

// Coins, XP and what the player owns are saved with a signature (HMAC-SHA256), so a value edited on the
// phone, or copied in from somewhere else, no longer matches and is thrown away instead of trusted.
//
// What this does: stops anyone changing a saved number by hand (editing the storage file, a backup, or a
// copied value from another key). What it cannot do: stop someone who takes the key out of the app's code,
// or who puts back an older copy that was signed properly. Nothing stored only on the phone can fully do
// that; coins that really must not be faked need a server to hold them.

// The signing key ships inside the app, split up so it is not a single string sitting in the bundle.
const SECRET = ['tagda', 'fun', '·', 'coins', '·', 'seal', '·', 'v1', '·', 'k7Qp', 'x2Vm'].join('');
const SIGNED_FLAG = '@tagdafun_signed_v1';   // set once anything has been saved signed
const BACKUP = ':bak';

const sign = (key: string, payload: string) => toHex(hmacSha256(utf8(SECRET), utf8(`${key}\n${payload}`)));

interface Blob { d: string; m: string }

/** The payload if `raw` is a correctly signed blob for `key`, otherwise null. */
function unseal(key: string, raw: string | null): string | null {
  if (!raw) return null;
  try {
    const b = JSON.parse(raw) as Blob;
    if (typeof b?.d === 'string' && typeof b?.m === 'string' && b.m === sign(key, b.d)) return b.d;
  } catch {}
  return null;
}

export interface Loaded<T> {
  data: T | null;
  /** True when something was saved but is not correctly signed, so it was ignored. */
  tampered: boolean;
}

export async function loadProtected<T>(key: string): Promise<Loaded<T>> {
  const [main, backup, flag] = await Promise.all([
    AsyncStorage.getItem(key), AsyncStorage.getItem(key + BACKUP), AsyncStorage.getItem(SIGNED_FLAG),
  ]);

  // The backup copy covers a write cut short; the main copy is used whenever it is valid.
  for (const raw of [main, backup]) {
    const payload = unseal(key, raw);
    if (payload !== null) {
      try { return { data: JSON.parse(payload) as T, tampered: false }; } catch {}
    }
  }

  if (main === null && backup === null) return { data: null, tampered: false };   // nothing saved yet

  // Saved by an earlier version that did not sign anything: trust it once, and it is signed on the next save.
  if (flag === null && main !== null) {
    try {
      const old = JSON.parse(main);
      if (old && typeof old === 'object' && !('m' in old && 'd' in old)) return { data: old as T, tampered: false };
    } catch {}
  }

  console.warn(`[Integrity] Ignored saved data for ${key}: it does not match its signature.`);
  return { data: null, tampered: true };
}

export async function saveProtected(key: string, value: unknown): Promise<void> {
  const d = JSON.stringify(value);
  const raw = JSON.stringify({ d, m: sign(key, d) } as Blob);
  await AsyncStorage.setItem(key + BACKUP, raw);
  await AsyncStorage.setItem(key, raw);
  await AsyncStorage.setItem(SIGNED_FLAG, '1');
}
