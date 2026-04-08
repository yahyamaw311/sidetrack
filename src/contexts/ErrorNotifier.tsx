import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../constants/theme';

interface ErrorNotification {
  id: number;
  message: string;
  type: 'api' | 'storage';
}

interface ErrorNotifierContextType {
  notifyError: (message: string, type?: 'api' | 'storage') => void;
}

const ErrorNotifierContext = createContext<ErrorNotifierContextType>({
  notifyError: () => {},
});

export const useErrorNotifier = () => useContext(ErrorNotifierContext);

// Module-level callback so non-React code (tmdbService, StorageProvider) can call it
let _globalNotify: ((message: string, type?: 'api' | 'storage') => void) | null = null;

/**
 * Fire-and-forget: call from anywhere (even outside React trees).
 * If the provider hasn't mounted yet the notification is silently dropped.
 */
export const notifyErrorGlobal = (message: string, type: 'api' | 'storage' = 'api') => {
  _globalNotify?.(message, type);
};

export const ErrorNotifierProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<ErrorNotification[]>([]);
  const counter = useRef(0);
  const timers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  const notifyError = useCallback((message: string, type: 'api' | 'storage' = 'api') => {
    const id = ++counter.current;
    setNotifications(prev => {
      // Deduplicate identical messages still on screen
      if (prev.some(n => n.message === message)) return prev;
      return [...prev.slice(-2), { id, message, type }]; // keep at most 3
    });
    // Auto-dismiss after 4s
    const timerId = setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
      timers.current.delete(timerId);
    }, 4000);
    timers.current.add(timerId);
  }, []);

  // Register global callback
  useEffect(() => {
    _globalNotify = notifyError;
    return () => { _globalNotify = null; };
  }, [notifyError]);

  useEffect(() => {
    const currentTimers = timers.current;
    return () => {
      currentTimers.forEach(clearTimeout);
      currentTimers.clear();
    };
  }, []);

  const dismiss = useCallback((id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  return (
    <ErrorNotifierContext.Provider value={{ notifyError }}>
      {children}
      {/* Toast stack rendered on top of everything */}
      {notifications.length > 0 && (
        <View style={styles.toastStack} pointerEvents="box-none">
          {notifications.map((notif) => (
            <ErrorToast key={notif.id} notif={notif} onDismiss={dismiss} />
          ))}
        </View>
      )}
    </ErrorNotifierContext.Provider>
  );
};

const ErrorToast: React.FC<{ notif: ErrorNotification; onDismiss: (id: number) => void }> = ({ notif, onDismiss }) => {
  const slideAnim = useRef(new Animated.Value(60)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, damping: 20, stiffness: 200, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [slideAnim, opacityAnim]);

  const icon = notif.type === 'storage' ? 'alert-circle-outline' : 'cloud-offline-outline';
  const iconColor = notif.type === 'storage' ? COLORS.coral : '#F5C518';

  return (
    <Animated.View style={[styles.toast, { transform: [{ translateY: slideAnim }], opacity: opacityAnim }]}>
      <Ionicons name={icon as any} size={16} color={iconColor} />
      <Text style={styles.toastText} numberOfLines={2}>{notif.message}</Text>
      <TouchableOpacity onPress={() => onDismiss(notif.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="close" size={14} color={COLORS.text.muted} />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  toastStack: {
    position: 'absolute',
    bottom: 100,
    left: SPACING.m,
    right: SPACING.m,
    zIndex: 9999,
    gap: SPACING.xs,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.s,
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.m,
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.s + 2,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    // subtle shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  toastText: {
    flex: 1,
    color: COLORS.text.secondary,
    fontFamily: FONTS.body,
    fontSize: 13,
    lineHeight: 18,
  },
});
