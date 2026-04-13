import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { BlurView } from 'expo-blur';
import { useAppStore } from '../store/appStore';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, GRADIENTS } from '../constants/theme';
import { CONFIG } from '../constants/config';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export const GDPRConsentModal = () => {
  const { consentGiven, setConsentGiven, hydrated } = useAppStore();
  const [visible, setVisible] = useState(false);
  const [accepting, setAccepting] = useState(false);
  
  useEffect(() => {
    if (hydrated && consentGiven === null) {
      setVisible(true);
    }
  }, [hydrated, consentGiven]);

  const handleConsent = async () => {
    setAccepting(true);
    try {
      await setConsentGiven(true);
      setVisible(false);
    } finally {
      setAccepting(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={() => {}}>
      <BlurView intensity={80} tint="dark" style={styles.overlay}>
        <View style={styles.container}>
          <LinearGradient
            colors={GRADIENTS.wrapped}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}
          >
            <View style={styles.iconContainer}>
              <Ionicons name="shield-checkmark" size={48} color={COLORS.primary} />
            </View>
            
            <Text style={styles.title}>Data Privacy & APIs</Text>
            
            <ScrollView style={styles.scrollArea}>
              <Text style={styles.description}>
                To provide you with the most accurate and up-to-date movie and television information, Sidetrack needs to fetch data directly from third-party services:
              </Text>
              
              <View style={styles.providerBox}>
                <Text style={styles.providerName}>• TMDB API</Text>
                <Text style={styles.providerName}>• IMDb GraphQL</Text>
                <Text style={styles.providerName}>• YouTube</Text>
              </View>

              <Text style={styles.description}>
                By proceeding, you consent to this app making direct network requests to these services. These providers may log your IP address and device information according to their respective privacy policies. 
              </Text>
              
              <Text style={styles.note}>
                Note: We do not collect, store, or share your personal watch history remotely. All your personal data remains strictly on your device.
              </Text>
            </ScrollView>

            <TouchableOpacity style={[styles.button, accepting && styles.buttonDisabled]} onPress={handleConsent} activeOpacity={CONFIG.LAYOUT.ACTIVE_OPACITY_CARD} disabled={accepting}>
              {accepting ? (
                <ActivityIndicator color={COLORS.text.inverse} size="small" />
              ) : (
                <Text style={styles.buttonText}>I Understand and Accept</Text>
              )}
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </BlurView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.m,
  },
  container: {
    width: '100%',
    maxWidth: 400,
    borderRadius: BORDER_RADIUS.l,
    overflow: 'hidden',
  },
  card: {
    padding: SPACING.l,
    alignItems: 'center',
    maxHeight: '80%',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.white.alpha10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.m,
  },
  title: {
    fontFamily: FONTS.display,
    fontSize: 24,
    color: COLORS.text.primary,
    marginBottom: SPACING.m,
    textAlign: 'center',
  },
  scrollArea: {
    width: '100%',
    marginBottom: SPACING.l,
  },
  description: {
    fontFamily: FONTS.body,
    fontSize: 15,
    color: COLORS.text.secondary,
    lineHeight: 22,
    marginBottom: SPACING.m,
  },
  providerBox: {
    backgroundColor: COLORS.overlay.providerBox,
    padding: SPACING.m,
    borderRadius: BORDER_RADIUS.m,
    marginBottom: SPACING.m,
  },
  providerName: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 15,
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  note: {
    fontFamily: FONTS.body,
    fontSize: 13,
    color: COLORS.primaryLight,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  button: {
    backgroundColor: COLORS.primary,
    width: '100%',
    paddingVertical: SPACING.m,
    borderRadius: BORDER_RADIUS.m,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 16,
    color: COLORS.text.inverse,
  },
});
