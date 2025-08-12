import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Language, LanguageContextType } from '../types';

const translations = {
  en: {
    // App titles
    'app.name': 'Tagda Fun',
    'app.tagline': 'Your Fun Random Generator',
    
    // Tab labels
    'tab.number': 'Tagda Fun',
    'tab.names': 'Tagda Fun',
    'tab.coin': 'Tagda Fun',
    'tab.truthdare': 'Tagda Fun',
    
    // Number generator
    'number.title': '🎲 Number Generator',
    'number.subtitle': 'Generate random numbers within your custom range',
    'number.setRange': 'Set Your Range',
    'number.minimum': 'Minimum',
    'number.maximum': 'Maximum',
    'number.generate': 'Generate Number',
    'number.generating': 'Generating...',
    'number.reset': 'Reset to Default (1-100)',
    'number.result.title': 'Your lucky number!',
    'number.result.badge': 'Range: {min} - {max}',
    
    // Coin toss
    'coin.title': '🪙 Coin Toss',
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

    // Truth/Dare
    'td.title': '🎭 Truth & Dare',
    'td.subtitle': 'Add players and spin to pick Truth or Dare',
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

    // Name picker
    'names.title': '👥 Name Picker',
    'names.subtitle': 'Randomly select from a list of names',
    'names.enterNames': 'Enter Names',
    'names.addName': 'Add Name',
    'names.removeName': 'Remove',
    'names.pickName': 'Pick a Name',
    'names.picking': 'Picking...',
    'names.clearAll': 'Clear All Names',
    'names.result.title': 'The chosen one!',
    'names.result.badge': 'From {count} names',
    'names.placeholder': 'Enter name here...',
    'names.validation.alphabets': 'Only alphabets allowed',
    'names.validation.minimum': 'Please add at least 2 names',
    'names.validation.empty': 'Please enter at least one name',
    'names.validation.maxLength': 'Max 25 characters',
    
    // Common
    'button.add': 'Add',
    'button.remove': 'Remove',
    'button.clear': 'Clear',
    'button.close': 'Close',
    
    // Language
    'language.en': 'English',
    'language.hi': 'हिंदी',
    'language.switch': 'Switch Language',

    // Privacy
    'privacy.title': 'Privacy Policy',
    'privacy.intro': 'This app does not collect or store any personal information.',
    'privacy.section.dont': "What we don't do:",
    'privacy.dont.collect': 'Collect personal data',
    'privacy.dont.store': 'Store user information',
    'privacy.dont.track': 'Track your activity',
    'privacy.dont.share': 'Share data with third parties',
    'privacy.section.do': 'What we do:',
    'privacy.do.local': 'Generate random numbers locally',
    'privacy.do.simple': 'Provide a fun, simple experience',
    'privacy.do.respect': 'Respect your privacy',
    'privacy.footer': 'Your privacy is important to us. Enjoy the app!',
    
    // Validation messages
    'validation.error': 'Error',
    'validation.warning': 'Warning',
    'validation.info': 'Information',
    'validation.invalidInput': 'Invalid Input',
    'validation.invalidMin': 'Invalid Minimum',
    'validation.invalidMax': 'Invalid Maximum',
    'validation.invalidRange': 'Invalid Range',
    'validation.minValue': 'The minimum value must be at least 1. Please enter a higher number.',
    'validation.maxValue': 'The maximum value cannot exceed 100. Please enter a lower number.',
    'validation.rangeError': 'The minimum value must be less than the maximum value. Please adjust your range.',
    'validation.enterValidNumbers': 'Please enter valid numbers for both minimum and maximum values.',
    'validation.noNames': 'Please enter at least one name to pick from.',
    'validation.onlyOneName': 'Please enter at least two names to make the selection meaningful.',
    
    // Success messages
    'success.resetComplete': 'Reset Complete',
    'success.namesCleared': 'Names Cleared',
    'success.resetMessage': 'Your range has been reset to the default values (1-100).',
    'success.clearMessage': 'All names have been cleared. You can enter new names now.',
  },
  hi: {
    // App titles
    'app.name': 'टगड़ा फन',
    'app.tagline': 'आपका मज़ेदार रैंडम जनरेटर',
    
    // Tab labels
    'tab.number': 'Tagda Fun',
    'tab.names': 'Tagda Fun',
    'tab.coin': 'Tagda Fun',
    'tab.truthdare': 'Tagda Fun',
    
    // Number generator
    'number.title': '🎲 नंबर जनरेटर',
    'number.subtitle': 'अपनी कस्टम रेंज में रैंडम नंबर जनरेट करें',
    'number.setRange': 'अपनी रेंज सेट करें',
    'number.minimum': 'न्यूनतम',
    'number.maximum': 'अधिकतम',
    'number.generate': 'नंबर जनरेट करें',
    'number.generating': 'जनरेट हो रहा है...',
    'number.reset': 'डिफ़ॉल्ट पर रीसेट करें (1-100)',
    'number.result.title': 'आपका लकी नंबर!',
    'number.result.badge': 'रेंज: {min} - {max}',

    // Coin toss
    'coin.title': '🪙 सिक्का उछाल',
    'coin.subtitle': 'हेड या टेल चुनें, फिर फ्लिप करें!',
    'coin.choose': 'आप क्या चुनते हैं:',
    'coin.heads': 'हेड',
    'coin.tails': 'टेल',
    'coin.flip': 'सिक्का उछालें',
    'coin.flipping': 'उछाल रहे हैं...',
    'coin.result.title': 'सिक्का परिणाम',
    'coin.result.badge': 'आपने चुना: {choice}',
    'coin.result.win': 'आप जीते! 🎉',
    'coin.result.lose': 'आप हार गए! 😅',

    // Truth/Dare
    'td.title': '🎭 सच और साहस',
    'td.subtitle': 'खिलाड़ियों को जोड़ें और खेल शुरू करें',
    'td.players': 'खिलाड़ी',
    'td.addPlayer': 'खिलाड़ी जोड़ें',
    'td.placeholder': 'खिलाड़ी का नाम',
    'td.start': 'खेल शुरू करें',
    'td.spinning': 'घुमा रहे हैं...',
    'td.result.title': 'आपकी बारी!',
    'td.result.badge': '{name} को मिला {type}',
    'td.truth': 'सच',
    'td.dare': 'साहस',
    'td.validation.maxLength': 'अधिकतम 25 अक्षर',

    // Name picker
    'names.title': '👥 नाम चुनने वाला',
    'names.subtitle': 'नामों की सूची से रैंडम चयन करें',
    'names.enterNames': 'नाम दर्ज करें',
    'names.addName': 'नाम जोड़ें',
    'names.removeName': 'हटाएं',
    'names.pickName': 'नाम चुनें',
    'names.picking': 'चुन रहा है...',
    'names.clearAll': 'सभी नाम साफ़ करें',
    'names.result.title': 'चुना गया नाम!',
    'names.result.badge': '{count} नामों में से',
    'names.placeholder': 'यहाँ नाम दर्ज करें...',
    'names.validation.alphabets': 'केवल अक्षरों की अनुमति है',
    'names.validation.minimum': 'कृपया कम से कम 2 नाम जोड़ें',
    'names.validation.empty': 'कृपया कम से कम एक नाम दर्ज करें',
    'names.validation.maxLength': 'अधिकतम 25 अक्षर',
    
    // Common
    'button.add': 'जोड़ें',
    'button.remove': 'हटाएं',
    'button.clear': 'साफ़ करें',
    'button.close': 'बंद करें',
    
    // Language
    'language.en': 'English',
    'language.hi': 'हिंदी',
    'language.switch': 'भाषा बदलें',

    // Privacy
    'privacy.title': 'गोपनीयता नीति',
    'privacy.intro': 'यह ऐप किसी भी प्रकार की व्यक्तिगत जानकारी एकत्र या संग्रहीत नहीं करता।',
    'privacy.section.dont': 'हम क्या नहीं करते:',
    'privacy.dont.collect': 'व्यक्तिगत डेटा एकत्र करना',
    'privacy.dont.store': 'उपयोगकर्ता जानकारी संग्रहीत करना',
    'privacy.dont.track': 'आपकी गतिविधि को ट्रैक करना',
    'privacy.dont.share': 'थर्ड-पार्टी के साथ डेटा साझा करना',
    'privacy.section.do': 'हम क्या करते हैं:',
    'privacy.do.local': 'स्थानीय रूप से रैंडम नंबर जनरेट करना',
    'privacy.do.simple': 'मज़ेदार और सरल अनुभव प्रदान करना',
    'privacy.do.respect': 'आपकी गोपनीयता का सम्मान करना',
    'privacy.footer': 'आपकी गोपनीयता हमारे लिए महत्वपूर्ण है। ऐप का आनंद लें!',
    
    // Validation messages
    'validation.error': 'त्रुटि',
    'validation.warning': 'चेतावनी',
    'validation.info': 'जानकारी',
    'validation.invalidInput': 'अमान्य इनपुट',
    'validation.invalidMin': 'अमान्य न्यूनतम',
    'validation.invalidMax': 'अमान्य अधिकतम',
    'validation.invalidRange': 'अमान्य रेंज',
    'validation.minValue': 'न्यूनतम मान कम से कम 1 होना चाहिए। कृपया उच्च संख्या दर्ज करें।',
    'validation.maxValue': 'अधिकतम मान 100 से अधिक नहीं हो सकता। कृपया कम संख्या दर्ज करें।',
    'validation.rangeError': 'न्यूनतम मान अधिकतम मान से कम होना चाहिए। कृपया अपनी रेंज समायोजित करें।',
    'validation.enterValidNumbers': 'कृपया न्यूनतम और अधिकतम दोनों मानों के लिए वैध संख्याएं दर्ज करें।',
    'validation.noNames': 'चुनने के लिए कृपया कम से कम एक नाम दर्ज करें।',
    'validation.onlyOneName': 'कृपया चयन को सार्थक बनाने के लिए कम से कम दो नाम दर्ज करें।',
    
    // Success messages
    'success.resetComplete': 'रीसेट पूरा',
    'success.namesCleared': 'नाम साफ़ किए गए',
    'success.resetMessage': 'आपकी रेंज को डिफ़ॉल्ट मानों (1-100) पर रीसेट कर दिया गया है।',
    'success.clearMessage': 'सभी नाम साफ़ कर दिए गए हैं। आप अब नए नाम दर्ज कर सकते हैं।',
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('en');

  const t = (key: string): string => {
    const langTable: Record<string, any> = (translations as any)[language] || {};

    // 1) Try flat key lookup first
    if (Object.prototype.hasOwnProperty.call(langTable, key)) {
      const direct = langTable[key];
      return typeof direct === 'string' ? direct : key;
    }

    // 2) Fallback nested traversal
    const segments = key.split('.');
    let value: any = langTable;
    for (const segment of segments) {
      if (value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, segment)) {
        value = value[segment];
      } else {
        return key;
      }
    }
    return typeof value === 'string' ? value : key;
  };

  const value: LanguageContextType = {
    language,
    setLanguage,
    t
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};
