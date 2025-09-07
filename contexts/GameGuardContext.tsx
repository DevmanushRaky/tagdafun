import React, { createContext, useContext, useState, useCallback } from 'react';

interface GameGuardContextValue {
  isMastermindActive: boolean;
  setMastermindActive: (active: boolean) => void;
  requestMastermindExit?: () => void;
  setRequestMastermindExit: (handler: (() => void) | undefined) => void;
  pendingNavigation?: () => void;
  setPendingNavigation: (cb: (() => void) | undefined) => void;
}

const GameGuardContext = createContext<GameGuardContextValue | undefined>(undefined);

export const GameGuardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMastermindActive, setIsMastermindActive] = useState(false);
  const [requestMastermindExit, setRequestMastermindExit] = useState<(() => void) | undefined>(undefined);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | undefined>(undefined);

  const setMastermindActive = useCallback((active: boolean) => {
    setIsMastermindActive(active);
  }, []);

  return (
    <GameGuardContext.Provider
      value={{
        isMastermindActive,
        setMastermindActive,
        requestMastermindExit,
        setRequestMastermindExit,
        pendingNavigation,
        setPendingNavigation,
      }}
    >
      {children}
    </GameGuardContext.Provider>
  );
};

export const useGameGuard = (): GameGuardContextValue => {
  const ctx = useContext(GameGuardContext);
  if (!ctx) {
    throw new Error('useGameGuard must be used within a GameGuardProvider');
  }
  return ctx;
};


