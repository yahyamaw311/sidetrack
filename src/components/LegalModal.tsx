import React from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING } from '../constants/theme';

interface LegalModalProps {
  visible: boolean;
  onClose: () => void;
}

export const LegalModal: React.FC<LegalModalProps> = ({ visible, onClose }) => {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Legal & Privacy</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Close Legal Screen">
            <Ionicons name="close" size={24} color={COLORS.text.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Privacy Policy</Text>
            <Text style={styles.paragraph}>
              Your privacy is important to us. Sidetrack is designed with privacy in mind. We do not collect, store, or transmit your personal data to any external servers or third-party databases.
            </Text>
            <Text style={styles.paragraph}>
              All of your personal watch history, favorites, settings, and other app data are stored purely locally on your device. Deleting the app will result in the loss of this data unless it is backed up using your device's native backup system.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Data Disclosure</Text>
            <Text style={styles.paragraph}>
              In order to provide information about movies and television shows, Sidetrack communicates directly with external APIs from your device:
            </Text>
            <View style={styles.bulletList}>
              <View style={styles.bulletItem}>
                <Text style={styles.bulletPoint}>•</Text>
                <Text style={styles.bulletText}>
                  <Text style={styles.boldText}>TMDB API:</Text> We use the TMDB API to fetch extensive metadata, posters, backdrops, and cast information.
                </Text>
              </View>
              <View style={styles.bulletItem}>
                <Text style={styles.bulletPoint}>•</Text>
                <Text style={styles.bulletText}>
                  <Text style={styles.boldText}>IMDb & YouTube APIs:</Text> Used for fetching details such as ratings and playing trailer videos.
                </Text>
              </View>
            </View>
            <Text style={styles.paragraph}>
              These services may log IP addresses and device information associated with the requests per their own privacy policies. We do not send your personal information or watch history to these services.
            </Text>
            <Text style={styles.paragraph}>
              This product uses the TMDB API but is not endorsed or certified by TMDB.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Terms of Service</Text>
            <Text style={styles.paragraph}>
              By using Sidetrack, you agree to these terms. Sidetrack is provided "as is" without warranties of any kind.
            </Text>
            <Text style={styles.paragraph}>
              We are not responsible for any loss of data, errors, or inaccuracies in the movie or television data provided, or any consequences arising from the use or inability to use the application. The content displayed through the app (text, images, videos) is the property of their respective owners.
            </Text>
          </View>
          
          <View style={styles.footer}>
            <Text style={styles.footerText}>Sidetrack App</Text>
            <Text style={styles.footerText}>Last Updated: April 2026</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.m,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  headerTitle: {
    color: COLORS.text.primary,
    fontFamily: FONTS.display,
    fontSize: 20,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.m,
    paddingBottom: SPACING.xl * 2,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    color: COLORS.primary,
    fontFamily: FONTS.heading,
    fontSize: 18,
    marginBottom: SPACING.s,
  },
  paragraph: {
    color: COLORS.text.secondary,
    fontFamily: FONTS.body,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: SPACING.s,
  },
  bulletList: {
    marginBottom: SPACING.s,
  },
  bulletItem: {
    flexDirection: 'row',
    marginBottom: SPACING.xs,
    paddingLeft: SPACING.s,
  },
  bulletPoint: {
    color: COLORS.text.primary,
    fontSize: 14,
    marginRight: SPACING.s,
  },
  bulletText: {
    flex: 1,
    color: COLORS.text.secondary,
    fontFamily: FONTS.body,
    fontSize: 14,
    lineHeight: 22,
  },
  boldText: {
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.text.primary,
  },
  footer: {
    marginTop: SPACING.l,
    alignItems: 'center',
    paddingVertical: SPACING.l,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  footerText: {
    color: COLORS.text.muted,
    fontFamily: FONTS.body,
    fontSize: 12,
    marginBottom: 4,
  }
});
