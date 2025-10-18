import { useEffect, useRef, useCallback } from 'react';
import LayerSwapApiClient from '../lib/apiClients/layerSwapApiClient';
import { LayerSwapSettings } from '../Models/LayerSwapSettings';

interface UseSettingsRefreshProps {
  apiKey: string;
  onSettingsUpdate: (settings: LayerSwapSettings) => void;
}

export function useSettingsRefresh({ apiKey, onSettingsUpdate }: UseSettingsRefreshProps) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialized = useRef(false);

  const fetchFreshSettings = useCallback(async () => {
    try {
      // Set the API key for this request
      LayerSwapApiClient.apiKey = apiKey;
      const apiClient = new LayerSwapApiClient();

      // Fetch fresh data using the same API calls as server-side
      const [networksResponse, sourceExchangesResponse, sourceRoutesResponse, destinationRoutesResponse] = await Promise.all([
        apiClient.GetLSNetworksAsync(),
        apiClient.GetSourceExchangesAsync(),
        apiClient.GetRoutesAsync('sources'),
        apiClient.GetRoutesAsync('destinations')
      ]);

      // Create settings object in the same format as server-side
      const freshSettings: LayerSwapSettings = {
        networks: networksResponse.data || [],
        sourceExchanges: sourceExchangesResponse.data || [],
        sourceRoutes: sourceRoutesResponse.data || [],
        destinationRoutes: destinationRoutesResponse.data || []
      };

      // Update the settings
      onSettingsUpdate(freshSettings);
    } catch (error) {
      console.warn('Failed to refresh settings:', error);
      // Silently fail - will retry on next interval
    }
  }, [apiKey, onSettingsUpdate]);

  useEffect(() => {
    // Start the initial 10-minute delay timer
    const initialTimer = setTimeout(() => {
      isInitialized.current = true;
      
      // Fetch settings immediately after 10 minutes
      fetchFreshSettings();
      
      // Then set up the recurring 10-minute interval
      intervalRef.current = setInterval(fetchFreshSettings, 10 * 60 * 1000); // 10 minutes
    }, 10 * 60 * 1000); // 10 minutes initial delay

    // Cleanup function
    return () => {
      clearTimeout(initialTimer);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchFreshSettings]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);
}
