import React, { useCallback, useState, useEffect } from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import {
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';
import { MainNavigation } from './src/navigation/MainNavigation';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { NetworkBanner } from './src/components/NetworkBanner';
import { NetworkProvider } from './src/contexts/NetworkContext';
import { ErrorNotifierProvider } from './src/contexts/ErrorNotifier';
import { OnboardingOverlay } from './src/components/OnboardingOverlay';
import { StorageProvider } from './src/services/StorageProvider';
import { COLORS } from './src/constants/theme';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [fontsLoaded] = useFonts({
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    // Check onboarding and trigger storage optimization
    Promise.all([
      StorageProvider.hasCompletedOnboarding(),
      StorageProvider.migrateToPartitionedStorage(),
    ]).then(([completed]) => {
      setShowOnboarding(!completed);
    });
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <NetworkProvider>
        <ErrorNotifierProvider>
          <ErrorBoundary>
            <View style={styles.container} onLayout={onLayoutRootView}>
              <StatusBar barStyle="light-content" backgroundColor={COLORS.background} translucent={false} />
              <NetworkBanner />
              <MainNavigation />
              {showOnboarding && (
                <OnboardingOverlay onComplete={() => setShowOnboarding(false)} />
              )}
            </View>
          </ErrorBoundary>
        </ErrorNotifierProvider>
      </NetworkProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
});
