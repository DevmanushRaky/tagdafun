import React from 'react';
import { View, StyleSheet, ScrollView, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrivacyScreenProps } from '../types';
import { COLORS, TYPOGRAPHY } from '../constants/theme';
import { useLanguage } from '../contexts/LanguageContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const PrivacyScreen: React.FC<PrivacyScreenProps> = () => {
  const insets = useSafeAreaInsets();
  const { language } = useLanguage();
  
  const t = (key: string) => {
    const translations = {
      en: {
        title: 'Privacy Policy',
        subtitle: 'Your privacy is our priority',
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
        lastUpdated: 'Last updated: August 2025',
        privacyBadge: '🔒 100% Private',
        offlineBadge: '📱 Works Offline',
        localBadge: '💾 Local Storage Only'
      },
      hi: {
        title: 'गोपनीयता नीति',
        subtitle: 'आपकी गोपनीयता हमारी प्राथमिकता है',
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
        lastUpdated: 'अंतिम अपडेट: दिसंबर 2024',
        privacyBadge: '🔒 100% निजी',
        offlineBadge: '📱 ऑफलाइन काम करता है',
        localBadge: '💾 केवल स्थानीय संग्रहण'
      }
    };
    return translations[language as keyof typeof translations]?.[key as keyof typeof translations.en] || key;
  };

  const renderSection = (title: string, text: string, icon: string) => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionIcon}>{icon}</Text>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <Text style={styles.text}>{text}</Text>
    </View>
  );

  const renderBadge = (text: string, color: string) => (
    <View style={[styles.badge, { backgroundColor: color }]}>
      <Text style={styles.badgeText}>{text}</Text>
    </View>
  );
  
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryDark]}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <View style={styles.titleContainer}>
              <Ionicons name="shield-checkmark" size={32} color="white" />
              <Text style={styles.title}>{t('title')}</Text>
            </View>
            <Text style={styles.subtitle}>{t('subtitle')}</Text>
            
            {/* Privacy Badges */}
            <View style={styles.badgesContainer}>
              {renderBadge(t('privacyBadge'), 'rgba(255, 255, 255, 0.2)')}
              {renderBadge(t('offlineBadge'), 'rgba(255, 255, 255, 0.2)')}
              {renderBadge(t('localBadge'), 'rgba(255, 255, 255, 0.2)')}
            </View>
          </View>
        </LinearGradient>

        {/* Content Sections */}
        <View style={styles.content}>
          {renderSection(t('section1Title'), t('section1Text'), '📊')}
          {renderSection(t('section2Title'), t('section2Text'), '🔍')}
          {renderSection(t('section3Title'), t('section3Text'), '💾')}
          {renderSection(t('section4Title'), t('section4Text'), '🚫')}
          {renderSection(t('section5Title'), t('section5Text'), '👶')}
          {renderSection(t('section6Title'), t('section6Text'), '📝')}
          {renderSection(t('section7Title'), t('section7Text'), '📞')}
          
          <View style={styles.lastUpdatedContainer}>
            <Text style={styles.lastUpdated}>{t('lastUpdated')}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  headerGradient: {
   
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    alignItems: 'center',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    ...TYPOGRAPHY.h1,
    color: 'white',
    marginLeft: 12,
    fontWeight: 'bold',
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 15,
  },
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  badge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  badgeText: {
    ...TYPOGRAPHY.caption,
    color: 'white',
    fontWeight: '600',
  },
  content: {
    padding: 20,
    paddingTop: 10,
  },
  section: {
    marginBottom: 20,
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    flex: 1,
    fontWeight: '600',
  },
  text: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    lineHeight: 24,
  },
  lastUpdatedContainer: {
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  lastUpdated: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textLight,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});

export default PrivacyScreen; 