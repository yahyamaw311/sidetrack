import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, Linking, ActivityIndicator } from 'react-native';
import { useAppStore } from '../store/appStore';
import { COLORS, SPACING, FONTS } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export const ApiKeyModal: React.FC = () => {
  const tmdbApiKey = useAppStore(s => s.tmdbApiKey);
  const setTmdbApiKey = useAppStore(s => s.setTmdbApiKey);
  
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);

  // If the key is present, don't render the modal
  if (tmdbApiKey && tmdbApiKey.trim().length > 0) return null;

  const handleSave = async () => {
    if (inputValue.trim().length < 20) {
      setError(true);
      return;
    }
    setError(false);
    setSaving(true);
    try {
      await setTmdbApiKey(inputValue.trim());
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={true} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Ionicons name="key-outline" size={24} color={COLORS.primary} />
            <Text style={styles.title}>API Key Required</Text>
          </View>
          
          <Text style={styles.description}>
            To protect user privacy and avoid bundling sensitive API keys, Sidetrack requires you to bring your own TMDB API key.
          </Text>
          
          <TouchableOpacity 
            onPress={() => Linking.openURL('https://www.themoviedb.org/documentation/api')}
            style={styles.linkButton}
          >
            <Text style={styles.linkText}>Get a free API key at TMDB &rarr;</Text>
          </TouchableOpacity>

          <TextInput
            style={[styles.input, error && styles.inputError]}
            placeholder="Paste your TMDB API Key (v3 auth) here..."
            placeholderTextColor={COLORS.text.muted}
            value={inputValue}
            onChangeText={(text) => {
              setInputValue(text);
              if (error) setError(false);
            }}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {error && <Text style={styles.errorText}>Please enter a valid API key.</Text>}

          <TouchableOpacity style={[styles.saveButton, saving && styles.saveButtonDisabled]} onPress={handleSave} disabled={saving}>
            {saving ? (
              <ActivityIndicator color={COLORS.background} size="small" />
            ) : (
              <Text style={styles.saveButtonText}>Save Key</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.overlay.dark,
    justifyContent: 'center',
    padding: SPACING.l,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: SPACING.m,
    padding: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.s,
    marginBottom: SPACING.m,
  },
  title: {
    fontFamily: FONTS.display,
    fontSize: 20,
    color: COLORS.text.primary,
  },
  description: {
    fontFamily: FONTS.body,
    fontSize: 16,
    color: COLORS.text.secondary,
    lineHeight: 22,
    marginBottom: SPACING.s,
  },
  linkButton: {
    marginBottom: SPACING.l,
  },
  linkText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: COLORS.primary,
  },
  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SPACING.s,
    padding: SPACING.m,
    color: COLORS.text.primary,
    fontFamily: FONTS.body,
    fontSize: 16,
    marginBottom: SPACING.m,
  },
  inputError: {
    borderColor: COLORS.coral,
  },
  errorText: {
    color: COLORS.coral,
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    marginBottom: SPACING.m,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    padding: SPACING.m,
    borderRadius: SPACING.s,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: COLORS.background,
    fontFamily: FONTS.heading,
    fontSize: 16,
  },
});
