import React, { createContext, useContext, useEffect, useState } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { useAppStore } from '../store/appStore';

interface NetworkContextType {
  isOffline: boolean;
}

const NetworkContext = createContext<NetworkContextType>({ isOffline: false });

export const useNetwork = () => useContext(NetworkContext);

export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const setIsOfflineStore = useAppStore(s => s.setIsOffline);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const offline = !(state.isConnected && state.isInternetReachable !== false);
      setIsOffline(offline);
      setIsOfflineStore(offline);
    });
    return () => unsubscribe();
  }, [setIsOfflineStore]);

  return (
    <NetworkContext.Provider value={{ isOffline }}>
      {children}
    </NetworkContext.Provider>
  );
};
