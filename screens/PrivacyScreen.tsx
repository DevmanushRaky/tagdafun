import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { PrivacyScreenProps } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { COLORS, TYPOGRAPHY } from '../constants/theme';

export default function PrivacyScreen({ navigation }: PrivacyScreenProps): JSX.Element {
  const { t } = useLanguage();

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <Text style={styles.title}>{t('privacy.title')}</Text>
          
          <View style={styles.policyContainer}>
            <Text style={styles.policyText}>
              {t('privacy.intro')}
            </Text>
          </View>

          <View style={styles.infoContainer}>
            <Text style={styles.infoTitle}>{t('privacy.section.dont')}</Text>
            <Text style={styles.infoText}>• {t('privacy.dont.collect')}</Text>
            <Text style={styles.infoText}>• {t('privacy.dont.store')}</Text>
            <Text style={styles.infoText}>• {t('privacy.dont.track')}</Text>
            <Text style={styles.infoText}>• {t('privacy.dont.share')}</Text>
          </View>

          <View style={styles.infoContainer}>
            <Text style={styles.infoTitle}>{t('privacy.section.do')}</Text>
            <Text style={styles.infoText}>• {t('privacy.do.local')}</Text>
            <Text style={styles.infoText}>• {t('privacy.do.simple')}</Text>
            <Text style={styles.infoText}>• {t('privacy.do.respect')}</Text>
          </View>

          <Text style={styles.footerText}>
            {t('privacy.footer')}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
  },
  content: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    ...TYPOGRAPHY.h1,
    color: COLORS.secondary,
    marginBottom: 30,
    textAlign: 'center',
  },
  policyContainer: {
    backgroundColor: COLORS.surface,
    padding: 20,
    borderRadius: 15,
    marginBottom: 30,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  policyText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.secondary,
    textAlign: 'center',
    lineHeight: 26,
  },
  infoContainer: {
    backgroundColor: COLORS.background,
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
    width: '100%',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  infoTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.primary,
    marginBottom: 15,
    textAlign: 'center',
  },
  infoText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginBottom: 8,
    lineHeight: 22,
  },
  footerText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 20,
  },
}); 