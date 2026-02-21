import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../constants/theme';
import { EpisodeDetail } from '../screens/EpisodeDetail';
import { MovieDetail } from '../screens/MovieDetail';
import { DiscoveryScreen } from '../screens/DiscoveryScreen';
import { WatchlistScreen } from '../screens/WatchlistScreen';
import { HistoryScreen } from '../screens/HistoryScreen';
import { AddWatchedScreen } from '../screens/AddWatchedScreen';
import { SearchResult } from '../types';

type TabRoute = 'Explore' | 'Saved' | 'Log';

export const MainNavigation = () => {
  const [activeTab, setActiveTab] = useState<TabRoute>('Explore');
  const [selectedShow, setSelectedShow] = useState<SearchResult | null>(null);
  const [addWatchedVisible, setAddWatchedVisible] = useState(false);
  const [historyKey, setHistoryKey] = useState(0);

  const handleTabChange = (tab: TabRoute) => {
    setActiveTab(tab);
    if (tab !== 'Explore') {
      setSelectedShow(null);
    }
  };

  const handleSelectShow = (show: SearchResult) => {
    setSelectedShow(show);
  };

  const handleSelectFromWatchlist = (id: number, type: 'tv' | 'movie') => {
    setActiveTab('Explore');
    setSelectedShow({ 
      id, 
      media_type: type,
      name: type === 'tv' ? '' : undefined,
      title: type === 'movie' ? '' : undefined,
      poster_path: null,
      backdrop_path: null,
      overview: '',
      vote_average: 0,
    });
  };

  const handleSelectFromHistory = (id: number) => {
    setActiveTab('Explore');
    setSelectedShow({ 
      id, 
      media_type: 'movie',
      title: '',
      poster_path: null,
      backdrop_path: null,
      overview: '',
      vote_average: 0,
    });
  };

  const handleSelectShowFromHistory = (id: number) => {
    setActiveTab('Explore');
    setSelectedShow({
      id,
      media_type: 'tv',
      name: '',
      poster_path: null,
      backdrop_path: null,
      overview: '',
      vote_average: 0,
    });
  };

  const handleBack = () => {
    setSelectedShow(null);
  };

  const handleAddWatchedClose = () => {
    setAddWatchedVisible(false);
    setHistoryKey(prev => prev + 1);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'Explore':
        if (selectedShow) {
          if (selectedShow.media_type === 'movie') {
            return <MovieDetail route={{ params: { movieId: selectedShow.id } }} onBack={handleBack} />;
          }
          return <EpisodeDetail route={{ params: { tvId: selectedShow.id, seasonNumber: 1, episodeNumber: 1 } }} onBack={handleBack} />;
        }
        return <DiscoveryScreen onSelectShow={handleSelectShow} />; 
      case 'Saved':
        return <WatchlistScreen onSelectShow={handleSelectFromWatchlist} />;
      case 'Log':
        return <HistoryScreen key={historyKey} onSelectMovie={handleSelectFromHistory} onSelectShow={handleSelectShowFromHistory} />;
    }
  };

  return (
    <View style={styles.container}>
      {renderContent()}

      <BlurView intensity={80} tint="dark" style={styles.navBar}>
        <View style={styles.navInner}>
          <TabButton 
            icon="compass-outline" 
            activeIcon="compass" 
            label="Explore" 
            isActive={activeTab === 'Explore'} 
            onPress={() => handleTabChange('Explore')} 
          />
          
          <TabButton 
            icon="heart-outline" 
            activeIcon="heart" 
            label="Saved" 
            isActive={activeTab === 'Saved'} 
            onPress={() => handleTabChange('Saved')} 
          />

          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => setAddWatchedVisible(true)}
            activeOpacity={0.7}
          >
            <View style={styles.addButtonInner}>
              <Ionicons name="add" size={22} color={COLORS.text.inverse} />
            </View>
          </TouchableOpacity>

          <TabButton 
            icon="journal-outline" 
            activeIcon="journal" 
            label="Log" 
            isActive={activeTab === 'Log'} 
            onPress={() => handleTabChange('Log')} 
          />
        </View>
      </BlurView>

      <Modal
        visible={addWatchedVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleAddWatchedClose}
      >
        <AddWatchedScreen onClose={handleAddWatchedClose} />
      </Modal>
    </View>
  );
};

const TabButton = ({ icon, activeIcon, label, isActive, onPress }: { icon: any, activeIcon: any, label: string, isActive: boolean, onPress: () => void }) => (
  <TouchableOpacity onPress={onPress} style={styles.tabButton} activeOpacity={0.7}>
    {isActive && <View style={styles.activeIndicatorLine} />}
    <Ionicons name={isActive ? activeIcon : icon} size={21} color={isActive ? COLORS.primary : COLORS.text.muted} />
    <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  navBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    overflow: 'hidden',
  },
  navInner: {
    flexDirection: 'row',
    paddingTop: SPACING.s,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
    position: 'relative',
    paddingTop: 6,
  },
  activeIndicatorLine: {
    position: 'absolute',
    top: -SPACING.s,
    width: 20,
    height: 2,
    backgroundColor: COLORS.primary,
    borderRadius: 1,
  },
  tabLabel: {
    fontSize: 10,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.text.muted,
  },
  tabLabelActive: {
    color: COLORS.primary,
  },
  addButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 6,
  },
  addButtonInner: {
    width: 42,
    height: 42,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
