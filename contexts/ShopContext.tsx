import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useGameStats } from './GameStatsContext';
import { logGame } from '../utils/gameHistory';
import {
  POWER_UPS, COIN_SKINS, CARD_BACKS, BOTTLE_THEMES, SHER_BOARDS, PIECE_SETS, DAILY_GIFT_LADDER,
  PowerUpId, CoinSkinId, CardBackId, BottleThemeId, SherBoardId, PieceSetId,
} from '../constants/shop';

const SHOP_KEY = '@tagdafun_shop_v1';

interface ShopState {
  powerUps: Record<PowerUpId, number>;
  ownedSkins: CoinSkinId[];
  coinSkin: CoinSkinId;
  ownedBacks: CardBackId[];
  cardBack: CardBackId;
  ownedThemes: BottleThemeId[];
  waterTheme: BottleThemeId;
  ownedBoards: SherBoardId[];
  sherBoard: SherBoardId;
  ownedPieces: PieceSetId[];
  pieceSet: PieceSetId;
  giftLastDate: string;   // toDateString() of the last claim
  giftStreak: number;     // consecutive days claimed, 1-based
}

const defaultShop = (): ShopState => ({
  powerUps: { memoryHint: 0, waterHint: 0, waterBottle: 0 },
  ownedSkins: ['gold'],
  coinSkin: 'gold',
  ownedBacks: ['navy'],
  cardBack: 'navy',
  ownedThemes: ['classic'],
  waterTheme: 'classic',
  ownedBoards: ['wooden'],
  sherBoard: 'wooden',
  ownedPieces: ['classic'],
  pieceSet: 'classic',
  giftLastDate: '',
  giftStreak: 0,
});

export type BuyResult = 'ok' | 'poor' | 'owned';

interface ShopContextValue {
  shop: ShopState;
  buyPowerUp: (id: PowerUpId) => Promise<BuyResult>;
  /** Uses one owned power-up; false if there is none. */
  consumePowerUp: (id: PowerUpId) => boolean;
  buySkin: (id: CoinSkinId) => Promise<BuyResult>;
  selectSkin: (id: CoinSkinId) => void;
  buyBack: (id: CardBackId) => Promise<BuyResult>;
  selectBack: (id: CardBackId) => void;
  buyTheme: (id: BottleThemeId) => Promise<BuyResult>;
  selectTheme: (id: BottleThemeId) => void;
  buyBoard: (id: SherBoardId) => Promise<BuyResult>;
  selectBoard: (id: SherBoardId) => void;
  buyPieces: (id: PieceSetId) => Promise<BuyResult>;
  selectPieces: (id: PieceSetId) => void;
  /** Today's gift amount and which ladder step it is, or null when already claimed today. */
  giftToday: { amount: number; day: number } | null;
  claimGift: () => Promise<number>;
}

const ShopContext = createContext<ShopContextValue | undefined>(undefined);

export const useShop = () => {
  const ctx = useContext(ShopContext);
  if (!ctx) throw new Error('useShop must be used within ShopProvider');
  return ctx;
};

const today = () => new Date().toDateString();
const yesterday = () => new Date(Date.now() - 86400000).toDateString();

export const ShopProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { spendCoins, addBonusCoins } = useGameStats();
  const [shop, setShop] = useState<ShopState>(defaultShop());

  useEffect(() => {
    AsyncStorage.getItem(SHOP_KEY).then(raw => {
      if (!raw) return;
      try {
        const saved = JSON.parse(raw);
        const def = defaultShop();
        setShop({ ...def, ...saved, powerUps: { ...def.powerUps, ...(saved.powerUps ?? {}) } });
      } catch {}
    });
  }, []);

  const save = useCallback((next: ShopState) => {
    setShop(next);
    AsyncStorage.setItem(SHOP_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const pay = async (price: number, item: string) => {
    if (!(await spendCoins(price))) return false;
    logGame({ timestamp: Date.now(), gameType: 'shop', item, costCoins: price, earnedCoins: 0, netCoins: -price }).catch(() => {});
    return true;
  };

  const buyPowerUp = async (id: PowerUpId): Promise<BuyResult> => {
    const p = POWER_UPS.find(x => x.id === id)!;
    if (!(await pay(p.price, p.title))) return 'poor';
    save({ ...shop, powerUps: { ...shop.powerUps, [id]: shop.powerUps[id] + 1 } });
    return 'ok';
  };

  const consumePowerUp = (id: PowerUpId) => {
    if (shop.powerUps[id] <= 0) return false;
    save({ ...shop, powerUps: { ...shop.powerUps, [id]: shop.powerUps[id] - 1 } });
    return true;
  };

  const buySkin = async (id: CoinSkinId): Promise<BuyResult> => {
    if (shop.ownedSkins.includes(id)) return 'owned';
    const s = COIN_SKINS.find(x => x.id === id)!;
    if (!(await pay(s.price, `${s.title} coin`))) return 'poor';
    save({ ...shop, ownedSkins: [...shop.ownedSkins, id], coinSkin: id });
    return 'ok';
  };

  const selectSkin = (id: CoinSkinId) => {
    if (shop.ownedSkins.includes(id)) save({ ...shop, coinSkin: id });
  };

  const buyBack = async (id: CardBackId): Promise<BuyResult> => {
    if (shop.ownedBacks.includes(id)) return 'owned';
    const b = CARD_BACKS.find(x => x.id === id)!;
    if (!(await pay(b.price, `${b.title} card back`))) return 'poor';
    save({ ...shop, ownedBacks: [...shop.ownedBacks, id], cardBack: id });
    return 'ok';
  };

  const selectBack = (id: CardBackId) => {
    if (shop.ownedBacks.includes(id)) save({ ...shop, cardBack: id });
  };

  const buyTheme = async (id: BottleThemeId): Promise<BuyResult> => {
    if (shop.ownedThemes.includes(id)) return 'owned';
    const t = BOTTLE_THEMES.find(x => x.id === id)!;
    if (!(await pay(t.price, `${t.title} bottles`))) return 'poor';
    save({ ...shop, ownedThemes: [...shop.ownedThemes, id], waterTheme: id });
    return 'ok';
  };

  const selectTheme = (id: BottleThemeId) => {
    if (shop.ownedThemes.includes(id)) save({ ...shop, waterTheme: id });
  };

  const buyBoard = async (id: SherBoardId): Promise<BuyResult> => {
    if (shop.ownedBoards.includes(id)) return 'owned';
    const b = SHER_BOARDS.find(x => x.id === id)!;
    if (!(await pay(b.price, `${b.title} Sher aur Bakri board`))) return 'poor';
    save({ ...shop, ownedBoards: [...shop.ownedBoards, id], sherBoard: id });
    return 'ok';
  };

  const selectBoard = (id: SherBoardId) => {
    if (shop.ownedBoards.includes(id)) save({ ...shop, sherBoard: id });
  };

  const buyPieces = async (id: PieceSetId): Promise<BuyResult> => {
    if (shop.ownedPieces.includes(id)) return 'owned';
    const p = PIECE_SETS.find(x => x.id === id)!;
    if (!(await pay(p.price, `${p.title} Sher aur Bakri pieces`))) return 'poor';
    save({ ...shop, ownedPieces: [...shop.ownedPieces, id], pieceSet: id });
    return 'ok';
  };

  const selectPieces = (id: PieceSetId) => {
    if (shop.ownedPieces.includes(id)) save({ ...shop, pieceSet: id });
  };

  const nextStreak = shop.giftLastDate === yesterday() ? shop.giftStreak + 1 : 1;
  const giftToday = shop.giftLastDate === today()
    ? null
    : { amount: DAILY_GIFT_LADDER[(nextStreak - 1) % DAILY_GIFT_LADDER.length], day: ((nextStreak - 1) % DAILY_GIFT_LADDER.length) + 1 };

  const claimGift = async () => {
    if (!giftToday) return 0;
    save({ ...shop, giftLastDate: today(), giftStreak: nextStreak });
    await addBonusCoins(giftToday.amount, 'gift');
    logGame({ timestamp: Date.now(), gameType: 'gift', costCoins: 0, earnedCoins: giftToday.amount, netCoins: giftToday.amount }).catch(() => {});
    return giftToday.amount;
  };

  return (
    <ShopContext.Provider value={{ shop, buyPowerUp, consumePowerUp, buySkin, selectSkin, buyBack, selectBack, buyTheme, selectTheme, buyBoard, selectBoard, buyPieces, selectPieces, giftToday, claimGift }}>
      {children}
    </ShopContext.Provider>
  );
};
