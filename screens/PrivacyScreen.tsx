import React from 'react';
import { View, StyleSheet, ScrollView, Text } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrivacyScreenProps } from '../types';
import { COLORS, TYPOGRAPHY } from '../constants/theme';
import { useLanguage } from '../contexts/LanguageContext';

const PrivacyScreen: React.FC<PrivacyScreenProps> = () => {
  const insets = useSafeAreaInsets();
  const { language } = useLanguage();
  
  const t = (key: string) => {
    const translations = {
      en: {
        title: 'Privacy Policy',
        section1Title: 'Information We Collect',
        section1Text: 'Our app does not collect, store, or transmit any personal information. All data generated within the app (such as random numbers, names, or game results) is stored locally on your device and is not shared with us or any third parties.',
        section2Title: 'How We Use Information',
        section2Text: 'Since we don\'t collect personal information, we don\'t use any data for any purpose. The app functions entirely offline and locally on your device.',
        section3Title: 'Data Storage',
        section3Text: 'Any preferences, settings, or game statistics are stored locally on your device using secure local storage methods. This data remains private and under your control.',
        section4Title: 'Third-Party Services',
        section4Text: 'Our app does not integrate with any third-party services, analytics platforms, or advertising networks that could collect or track your information.',
        section5Title: 'Children\'s Privacy',
        section5Text: 'Our app is suitable for all ages and does not knowingly collect any personal information from children under 13 or any other age group.',
        section6Title: 'Changes to This Policy',
        section6Text: 'We may update this privacy policy from time to time. Any changes will be reflected in the app and users will be notified of significant updates.',
        section7Title: 'Contact Us',
        section7Text: 'If you have any questions about this privacy policy, please contact us through the app store or our support channels.',
        lastUpdated: 'Last updated: August 2025'
      },
      hi: {
        title: 'गोपनीयता नीति',
        section1Title: 'जानकारी जो हम एकत्र करते हैं',
        section1Text: 'हमारा ऐप किसी भी व्यक्तिगत जानकारी को एकत्र, संग्रहीत या प्रसारित नहीं करता। ऐप के भीतर उत्पन्न सभी डेटा (जैसे यादृच्छिक संख्याएं, नाम, या गेम परिणाम) आपके डिवाइस पर स्थानीय रूप से संग्रहीत किया जाता है और हमारे साथ या किसी तृतीय पक्ष के साथ साझा नहीं किया जाता।',
        section2Title: 'हम जानकारी का उपयोग कैसे करते हैं',
        section2Text: 'चूंकि हम व्यक्तिगत जानकारी एकत्र नहीं करते, हम किसी भी उद्देश्य के लिए डेटा का उपयोग नहीं करते। ऐप पूरी तरह से ऑफलाइन और आपके डिवाइस पर स्थानीय रूप से काम करता है।',
        section3Title: 'डेटा संग्रहण',
        section3Text: 'कोई भी प्राथमिकता, सेटिंग, या गेम आंकड़े आपके डिवाइस पर सुरक्षित स्थानीय संग्रहण विधियों का उपयोग करके स्थानीय रूप से संग्रहीत किए जाते हैं। यह डेटा निजी रहता है और आपके नियंत्रण में रहता है।',
        section4Title: 'तृतीय पक्ष सेवाएं',
        section4Text: 'हमारा ऐप किसी भी तृतीय पक्ष सेवाओं, विश्लेषण प्लेटफॉर्म, या विज्ञापन नेटवर्क के साथ एकीकृत नहीं होता जो आपकी जानकारी को एकत्र या ट्रैक कर सकते हैं।',
        section5Title: 'बच्चों की गोपनीयता',
        section5Text: 'हमारा ऐप सभी उम्र के लिए उपयुक्त है और 13 वर्ष से कम या किसी अन्य आयु समूह के बच्चों से जानबूझकर कोई व्यक्तिगत जानकारी एकत्र नहीं करता।',
        section6Title: 'इस नीति में परिवर्तन',
        section6Text: 'हम समय-समय पर इस गोपनीयता नीति को अपडेट कर सकते हैं। कोई भी परिवर्तन ऐप में प्रतिबिंबित होगा और उपयोगकर्ताओं को महत्वपूर्ण अपडेट के बारे में सूचित किया जाएगा।',
        section7Title: 'हमसे संपर्क करें',
        section7Text: 'यदि आपको इस गोपनीयता नीति के बारे में कोई प्रश्न है, तो कृपया ऐप स्टोर या हमारे सहायता चैनलों के माध्यम से हमसे संपर्क करें।',
        lastUpdated: 'अंतिम अपडेट: अगस्त 2025'
      }
    };
    return translations[language as keyof typeof translations]?.[key as keyof typeof translations.en] || key;
  };
  
  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.content}>
        <Text style={styles.title}>{t('title')}</Text>
        
        <Text style={styles.sectionTitle}>{t('section1Title')}</Text>
        <Text style={styles.text}>{t('section1Text')}</Text>

        <Text style={styles.sectionTitle}>{t('section2Title')}</Text>
        <Text style={styles.text}>{t('section2Text')}</Text>

        <Text style={styles.sectionTitle}>{t('section3Title')}</Text>
        <Text style={styles.text}>{t('section3Text')}</Text>

        <Text style={styles.sectionTitle}>{t('section4Title')}</Text>
        <Text style={styles.text}>{t('section4Text')}</Text>

        <Text style={styles.sectionTitle}>{t('section5Title')}</Text>
        <Text style={styles.text}>{t('section5Text')}</Text>

        <Text style={styles.sectionTitle}>{t('section6Title')}</Text>
        <Text style={styles.text}>{t('section6Text')}</Text>

        <Text style={styles.sectionTitle}>{t('section7Title')}</Text>
        <Text style={styles.text}>{t('section7Text')}</Text>

        <Text style={styles.lastUpdated}>{t('lastUpdated')}</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    // Dynamic padding will be applied inline using insets
  },
  content: {
    padding: 20,
    paddingTop: 20,
  },
  title: {
    ...TYPOGRAPHY.h1,
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: 30,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    marginTop: 25,
    marginBottom: 10,
  },
  text: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: 15,
  },
  lastUpdated: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: 30,
    fontStyle: 'italic',
  },
});

export default PrivacyScreen; 