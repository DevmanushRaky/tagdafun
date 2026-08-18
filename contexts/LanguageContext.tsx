import React, { createContext, useContext, ReactNode } from 'react';
import { LanguageContextType } from '../types';

const strings: Record<string, string> = {
  'app.name': 'Tagda Fun',
  'number.title': 'Number Generator',
  'number.subtitle': 'Generate a random number in your range',
  'number.setRange': 'Set Range',
  'number.minimum': 'Min',
  'number.maximum': 'Max',
  'number.generate': 'Generate Number',
  'number.generating': 'Generating...',
  'number.reset': 'Reset',
  'number.result.title': 'Your lucky number!',
  'number.result.badge': 'Range: {min} - {max}',
  'coin.title': 'Coin Toss',
  'coin.subtitle': 'Choose Heads or Tails, then flip!',
  'coin.choose': 'You call it:',
  'coin.heads': 'Heads',
  'coin.tails': 'Tails',
  'coin.flip': 'Flip Coin',
  'coin.flipping': 'Flipping...',
  'coin.result.title': 'Coin Result',
  'coin.result.badge': 'You chose: {choice}',
  'coin.result.win': 'You won! 🎉',
  'coin.result.lose': 'You lost! 😅',
  'td.title': 'Truth & Dare',
  'td.subtitle': 'Add players and spin!',
  'td.players': 'Players',
  'td.addPlayer': 'Add Player',
  'td.placeholder': 'Player name',
  'td.start': 'Start Game',
  'td.spinning': 'Spinning...',
  'td.result.title': 'Your Turn!',
  'td.result.badge': '{name} got {type}',
  'td.truth': 'Truth',
  'td.dare': 'Dare',
  'td.validation.maxLength': 'Max 25 characters',
  'names.title': 'Name Picker',
  'names.subtitle': 'Randomly pick from your list',
  'names.enterNames': 'Enter Names',
  'names.addName': 'Add Name',
  'names.removeName': 'Remove',
  'names.pickName': 'Pick a Name',
  'names.picking': 'Picking...',
  'names.clearAll': 'Clear All',
  'names.result.title': 'The chosen one!',
  'names.result.badge': 'From {count} names',
  'names.placeholder': 'Enter name here...',
  'names.validation.alphabets': 'Only alphabets allowed',
  'names.validation.minimum': 'Please add at least 2 names',
  'names.validation.empty': 'Please enter at least one name',
  'names.validation.maxLength': 'Max 25 characters',
  'button.add': 'Add',
  'button.remove': 'Remove',
  'button.clear': 'Clear',
  'button.close': 'Close',
  'privacy.title': 'Privacy Policy',
  'validation.error': 'Error',
  'validation.warning': 'Warning',
  'validation.info': 'Info',
  'validation.invalidInput': 'Invalid Input',
  'validation.invalidMin': 'Invalid Minimum',
  'validation.invalidMax': 'Invalid Maximum',
  'validation.invalidRange': 'Invalid Range',
  'validation.minValue': 'Minimum value must be at least 1.',
  'validation.maxValue': 'Maximum value cannot exceed 100.',
  'validation.rangeError': 'Minimum must be less than maximum.',
  'validation.enterValidNumbers': 'Please enter valid numbers.',
  'validation.noNames': 'Please enter at least one name.',
  'validation.onlyOneName': 'Please enter at least two names.',
  'success.resetComplete': 'Reset Complete',
  'success.namesCleared': 'Names Cleared',
  'success.resetMessage': 'Range reset to default (1-100).',
  'success.clearMessage': 'All names cleared.',
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
};

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const t = (key: string): string => strings[key] ?? key;

  return (
    <LanguageContext.Provider value={{ language: 'en', setLanguage: () => {}, t }}>
      {children}
    </LanguageContext.Provider>
  );
};
