import React, { useEffect } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { useAppStore } from '../store/appStore';

export const useNetwork = () => {
  const isOffline = useAppStore(s => s.isOffline);
  return { isOffline };
};

export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const setIsOfflineStore = useAppStore(s => s.setIsOffline);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const offline = !(state.isConnected && state.isInternetReachable !== false);
      setIsOfflineStore(offline);
    });
    return () => unsubscribe();
  }, [setIsOfflineStore]);

  return <>{children}</>;
};
