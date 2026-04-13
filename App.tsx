import React, { useCallback, useEffect } from 'react';
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
import { GDPRConsentModal } from './src/components/GDPRConsentModal';
import { ApiKeyModal } from './src/components/ApiKeyModal';
import { NetworkProvider } from './src/contexts/NetworkContext';
import { ErrorNotifierProvider } from './src/contexts/ErrorNotifier';
import { StorageProvider } from './src/services/StorageProvider';
import { DetailCache } from './src/services/DetailCache';
import { useAppStore } from './src/store/appStore';
import { COLORS } from './src/constants/theme';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
    },
  },
});

export default function App() {
  const [fontsLoaded] = useFonts({
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  const hydrated = useAppStore(s => s.hydrated);


  useEffect(() => {
    let cancelled = false;
    // Trigger storage optimization and hydrate the store
    StorageProvider.migrateToPartitionedStorage().then(async () => {
      if (cancelled) return;
      // Prune stale/excess detail cache entries from prior sessions
      await DetailCache.pruneStaleEntries();
      if (cancelled) return;
      // Hydrate the centralized store after migration is complete
      await useAppStore.getState().hydrate();
    });
    return () => { cancelled = true; };
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded && hydrated) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, hydrated]);

  if (!fontsLoaded || !hydrated) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <NetworkProvider>
        <ErrorNotifierProvider>
          <QueryClientProvider client={queryClient}>
            <ErrorBoundary>
              <View style={styles.container} onLayout={onLayoutRootView}>
                <StatusBar barStyle="light-content" backgroundColor={COLORS.background} translucent={false} />
                <MainNavigation />
                <GDPRConsentModal />
                <ApiKeyModal />
              </View>
            </ErrorBoundary>
          </QueryClientProvider>
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
