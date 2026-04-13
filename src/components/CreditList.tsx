import React, { useCallback } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS, FONTS, LETTER_SPACING } from '../constants/theme';
import { tmdbService } from '../services/tmdbService';
import { CreditPerson } from '../types';
import { FadeImage } from './FadeImage';

interface CreditListProps {
  cast?: CreditPerson[];
  crew?: CreditPerson[];
  guestStars?: CreditPerson[];
  title?: string;
  horizontal?: boolean;
}

const CastCard = React.memo<{ person: CreditPerson; idx: number }>(({ person }) => (
  <View style={styles.castCard}>
    <FadeImage
      source={tmdbService.getImageSource(person.profile_path, 'w185')}
      style={styles.castImage}
      resizeMode="cover"
    />
    <View style={styles.castInfo}>
      <Text style={styles.castName} numberOfLines={1}>{person.name}</Text>
      <Text style={styles.castCharacter} numberOfLines={1}>{person.character || person.job || 'Cast'}</Text>
    </View>
  </View>
));

export const CreditList: React.FC<CreditListProps> = ({
  cast = [],
  crew = [],
  guestStars = [],
  title = 'CAST',
  horizontal = true
}) => {
  const director = crew.find((p) => p.job === 'Director');
  const writers = crew.filter((p) => p.department === 'Writing' || p.job === 'Writer').slice(0, 2);

  // For episodes, guest stars are often prominent
  const combinedCast = [...guestStars, ...cast].slice(0, 15);

  if (combinedCast.length === 0 && !director && writers.length === 0) return null;

  const renderCastCard = useCallback(({ item, index }: { item: CreditPerson; index: number }) => (
    <CastCard person={item} idx={index} />
  ), []);

  const keyExtractor = useCallback((person: CreditPerson, idx: number) =>
    `${person.id}-${person.character}-${idx}`, []);

  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>{title}</Text>

      {horizontal ? (
        <FlatList
          horizontal
          data={combinedCast}
          keyExtractor={keyExtractor}
          renderItem={renderCastCard}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.castScroll}
          initialNumToRender={5}
          windowSize={3}
          maxToRenderPerBatch={5}
        />
      ) : (
        <View style={styles.verticalList}>
           {combinedCast.slice(0, 5).map((person, idx) => (
            <View key={`${person.id}-${person.character}-${idx}`} style={styles.verticalItem}>
               <FadeImage
                source={tmdbService.getImageSource(person.profile_path, 'w185')}
                style={styles.verticalImage}
              />
              <View style={styles.verticalText}>
                <Text style={styles.castName}>{person.name}</Text>
                <Text style={styles.castCharacter}>{person.character}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {(director || writers.length > 0) && (
        <View style={styles.crewSection}>
          {director && (
            <View style={styles.crewItem}>
              <Text style={styles.crewLabel}>Director</Text>
              <Text style={styles.crewName}>{director.name}</Text>
            </View>
          )}
          {writers.length > 0 && (
            <View style={styles.crewItem}>
              <Text style={styles.crewLabel}>{writers.length > 1 ? 'Writers' : 'Writer'}</Text>
              <Text style={styles.crewName}>{writers.map(w => w.name).join(', ')}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: SPACING.m,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: FONTS.heading,
    color: COLORS.text.muted,
    marginBottom: SPACING.s,
    letterSpacing: LETTER_SPACING.wide,
    paddingHorizontal: SPACING.m,
  },
  castScroll: {
    paddingHorizontal: SPACING.m,
    gap: SPACING.m,
  },
  castCard: {
    width: 100,
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.m,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  castImage: {
    width: 100,
    height: 120,
    backgroundColor: COLORS.surface,
  },
  castInfo: {
    padding: SPACING.xs,
  },
  castName: {
    fontSize: 12,
    fontFamily: FONTS.heading,
    color: COLORS.text.primary,
  },
  castCharacter: {
    fontSize: 10,
    color: COLORS.text.muted,
    marginTop: SPACING.xxs,
  },
  crewSection: {
    marginTop: SPACING.m,
    paddingHorizontal: SPACING.m,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.l,
  },
  crewItem: {
    minWidth: '40%',
  },
  crewLabel: {
    fontSize: 10,
    color: COLORS.text.muted,
    textTransform: 'uppercase',
    letterSpacing: LETTER_SPACING.half,
  },
  crewName: {
    fontSize: 13,
    fontFamily: FONTS.heading,
    color: COLORS.text.primary,
    marginTop: SPACING.xxs,
  },
  verticalList: {
    paddingHorizontal: SPACING.m,
  },
  verticalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.s,
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.m,
    padding: SPACING.xs,
  },
  verticalImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
  },
  verticalText: {
    marginLeft: SPACING.s,
    flex: 1,
  },
});
