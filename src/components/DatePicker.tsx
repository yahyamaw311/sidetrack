import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../constants/theme';

interface DatePickerProps {
  visible: boolean;
  date: Date;
  onConfirm: (date: Date) => void;
  onCancel: () => void;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export const DatePickerModal: React.FC<DatePickerProps> = ({ visible, date, onConfirm, onCancel }) => {
  const [viewYear, setViewYear] = useState(date.getFullYear());
  const [viewMonth, setViewMonth] = useState(date.getMonth());
  const [selectedDate, setSelectedDate] = useState(date);

  // Reset view when modal opens
  React.useEffect(() => {
    if (visible) {
      setViewYear(date.getFullYear());
      setViewMonth(date.getMonth());
      setSelectedDate(date);
    }
  }, [visible, date]);

  const daysInMonth = useMemo(() => {
    return new Date(viewYear, viewMonth + 1, 0).getDate();
  }, [viewYear, viewMonth]);

  const firstDayOfWeek = useMemo(() => {
    return new Date(viewYear, viewMonth, 1).getDay();
  }, [viewYear, viewMonth]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const goToPrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const goToNextMonth = () => {
    const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1;
    const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;
    const nextDate = new Date(nextYear, nextMonth, 1);
    // Don't go past current month
    if (nextDate <= new Date(today.getFullYear(), today.getMonth() + 1, 0)) {
      setViewMonth(nextMonth);
      setViewYear(nextYear);
    }
  };

  const selectDay = (day: number) => {
    const newDate = new Date(viewYear, viewMonth, day, 12, 0, 0);
    if (newDate <= today) {
      setSelectedDate(newDate);
    }
  };

  const isSelected = (day: number) => {
    return (
      selectedDate.getDate() === day &&
      selectedDate.getMonth() === viewMonth &&
      selectedDate.getFullYear() === viewYear
    );
  };

  const isToday = (day: number) => {
    return (
      today.getDate() === day &&
      today.getMonth() === viewMonth &&
      today.getFullYear() === viewYear
    );
  };

  const isFuture = (day: number) => {
    const d = new Date(viewYear, viewMonth, day);
    return d > today;
  };

  const canGoNext = () => {
    const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1;
    const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;
    return new Date(nextYear, nextMonth, 1) <= new Date(today.getFullYear(), today.getMonth() + 1, 0);
  };

  const setToday = () => {
    const now = new Date();
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    setSelectedDate(now);
  };

  // Build the grid cells
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  // Pad to fill the last row
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={dpStyles.overlay}>
        <View style={dpStyles.container}>
          {/* Month/Year header */}
          <View style={dpStyles.header}>
            <TouchableOpacity onPress={goToPrevMonth} style={dpStyles.navBtn}>
              <Ionicons name="chevron-back" size={20} color={COLORS.text.primary} />
            </TouchableOpacity>
            <Text style={dpStyles.monthYear}>
              {MONTHS[viewMonth]} {viewYear}
            </Text>
            <TouchableOpacity onPress={goToNextMonth} style={dpStyles.navBtn} disabled={!canGoNext()}>
              <Ionicons name="chevron-forward" size={20} color={canGoNext() ? COLORS.text.primary : COLORS.text.muted} />
            </TouchableOpacity>
          </View>

          {/* Day-of-week labels */}
          <View style={dpStyles.weekRow}>
            {DAYS.map(d => (
              <View key={d} style={dpStyles.dayCell}>
                <Text style={dpStyles.dayLabel}>{d}</Text>
              </View>
            ))}
          </View>

          {/* Calendar grid */}
          <View style={dpStyles.grid}>
            {cells.map((day, idx) => (
              <View key={idx} style={dpStyles.dayCell}>
                {day ? (
                  <TouchableOpacity
                    style={[
                      dpStyles.dayButton,
                      isSelected(day) && dpStyles.dayButtonSelected,
                      isToday(day) && !isSelected(day) && dpStyles.dayButtonToday,
                    ]}
                    onPress={() => selectDay(day)}
                    disabled={isFuture(day)}
                    activeOpacity={0.6}
                  >
                    <Text
                      style={[
                        dpStyles.dayText,
                        isSelected(day) && dpStyles.dayTextSelected,
                        isFuture(day) && dpStyles.dayTextDisabled,
                        isToday(day) && !isSelected(day) && dpStyles.dayTextToday,
                      ]}
                    >
                      {day}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ))}
          </View>

          {/* Footer */}
          <View style={dpStyles.footer}>
            <TouchableOpacity onPress={setToday} style={dpStyles.todayBtn}>
              <Text style={dpStyles.todayBtnText}>Today</Text>
            </TouchableOpacity>
            <View style={dpStyles.footerActions}>
              <TouchableOpacity onPress={onCancel} style={dpStyles.cancelBtn}>
                <Text style={dpStyles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => onConfirm(selectedDate)} style={dpStyles.confirmBtn}>
                <Text style={dpStyles.confirmBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const dpStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.m,
  },
  container: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.l,
    padding: SPACING.m,
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.m,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthYear: {
    color: COLORS.text.primary,
    fontFamily: FONTS.heading,
    fontSize: 16,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: SPACING.xs,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.285%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayLabel: {
    color: COLORS.text.muted,
    fontFamily: FONTS.mono,
    fontSize: 11,
    textTransform: 'uppercase',
  },
  dayButton: {
    width: 36,
    height: 36,
    borderRadius: BORDER_RADIUS.round,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayButtonSelected: {
    backgroundColor: COLORS.primary,
  },
  dayButtonToday: {
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  dayText: {
    color: COLORS.text.primary,
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
  },
  dayTextSelected: {
    color: COLORS.text.inverse,
    fontFamily: FONTS.heading,
  },
  dayTextDisabled: {
    color: COLORS.text.muted,
    opacity: 0.4,
  },
  dayTextToday: {
    color: COLORS.primary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.m,
  },
  todayBtn: {
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.s,
  },
  todayBtnText: {
    color: COLORS.primary,
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
  },
  footerActions: {
    flexDirection: 'row',
    gap: SPACING.s,
  },
  cancelBtn: {
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.s,
    borderRadius: BORDER_RADIUS.s,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelBtnText: {
    color: COLORS.text.secondary,
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
  },
  confirmBtn: {
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.s,
    borderRadius: BORDER_RADIUS.s,
    backgroundColor: COLORS.primary,
  },
  confirmBtnText: {
    color: COLORS.text.inverse,
    fontFamily: FONTS.heading,
    fontSize: 14,
  },
});
