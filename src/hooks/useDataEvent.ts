import { useEffect, useRef } from 'react';
import { dataEvents, DataChannel } from '../services/DataEvents';

/**
 * Subscribe to a data-change channel. The callback fires whenever
 * StorageProvider mutates the corresponding data. Auto-unsubscribes on unmount.
 */
export function useDataEvent(channel: DataChannel, callback: () => void) {
  const cbRef = useRef(callback);
  cbRef.current = callback;

  useEffect(() => {
    return dataEvents.subscribe(channel, () => cbRef.current());
  }, [channel]);
}
