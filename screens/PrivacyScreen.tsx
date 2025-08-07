import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { PrivacyScreenProps } from '../types';

export default function PrivacyScreen({ navigation }: PrivacyScreenProps): JSX.Element {
  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <Text style={styles.title}>Privacy Policy</Text>
          
          <View style={styles.policyContainer}>
            <Text style={styles.policyText}>
              This app does not collect or store any personal information.
            </Text>
          </View>

          <View style={styles.infoContainer}>
            <Text style={styles.infoTitle}>What we don't do:</Text>
            <Text style={styles.infoText}>• Collect personal data</Text>
            <Text style={styles.infoText}>• Store user information</Text>
            <Text style={styles.infoText}>• Track your activity</Text>
            <Text style={styles.infoText}>• Share data with third parties</Text>
          </View>

          <View style={styles.infoContainer}>
            <Text style={styles.infoTitle}>What we do:</Text>
            <Text style={styles.infoText}>• Generate random numbers locally</Text>
            <Text style={styles.infoText}>• Provide a fun, simple experience</Text>
            <Text style={styles.infoText}>• Respect your privacy</Text>
          </View>

          <Text style={styles.footerText}>
            Your privacy is important to us. Enjoy the app!
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
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
    fontSize: 28,
    fontWeight: 'bold',
    color: '#002244',
    marginBottom: 30,
    textAlign: 'center',
  },
  policyContainer: {
    backgroundColor: '#F8F9FA',
    padding: 20,
    borderRadius: 15,
    marginBottom: 30,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B00',
  },
  policyText: {
    fontSize: 18,
    color: '#002244',
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 26,
  },
  infoContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
    width: '100%',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B00',
    marginBottom: 15,
    textAlign: 'center',
  },
  infoText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
    lineHeight: 22,
  },
  footerText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 20,
  },
}); 