/**
 * Hook for managing testing service state and configuration
 */

import { useState, useEffect } from 'react';
import { testingService, type TestConfig } from '@src/services/testing.service';
import { eventBus } from '@src/events/event-bus';

export interface UseTestingServiceReturn {
  isEnabled: boolean;
  config: TestConfig | null;
  status: {
    initialized: boolean;
    enabled: boolean;
    queueLength: number;
  } | null;
  setEnabled: (enabled: boolean) => Promise<void>;
  updateConfig: (config: Partial<TestConfig>) => Promise<void>;
  sendTestMessage: (text: string, options?: any) => Promise<any>;
  isLoading: boolean;
  error: string | null;
}

export const useTestingService = (): UseTestingServiceReturn => {
  const [isEnabled, setIsEnabledState] = useState(false);
  const [config, setConfig] = useState<TestConfig | null>(null);
  const [status, setStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load initial state
  useEffect(() => {
    const loadInitialState = async () => {
      try {
        setIsLoading(true);
        const serviceStatus = testingService.getStatus();
        setStatus(serviceStatus);
        setConfig(serviceStatus.config);
        setIsEnabledState(serviceStatus.enabled);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load testing service state');
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialState();
  }, []);

  // Listen for configuration changes
  useEffect(() => {
    const handleConfigChange = ({ enabled }: { enabled: boolean }) => {
      setIsEnabledState(enabled);
      // Refresh status
      const serviceStatus = testingService.getStatus();
      setStatus(serviceStatus);
      setConfig(serviceStatus.config);
    };

    eventBus.on('testing:config-changed', handleConfigChange);

    return () => {
      eventBus.off('testing:config-changed', handleConfigChange);
    };
  }, []);

  const setEnabled = async (enabled: boolean): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      await testingService.setTestingEnabled(enabled);
      setIsEnabledState(enabled);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update testing mode');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const updateConfig = async (newConfig: Partial<TestConfig>): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      await testingService.updateConfig(newConfig);
      
      // Refresh status
      const serviceStatus = testingService.getStatus();
      setStatus(serviceStatus);
      setConfig(serviceStatus.config);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update configuration');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const sendTestMessage = async (text: string, options: any = {}): Promise<any> => {
    try {
      setError(null);
      return await testingService.sendTestMessage(text, options);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send test message');
      throw err;
    }
  };

  return {
    isEnabled,
    config,
    status,
    setEnabled,
    updateConfig,
    sendTestMessage,
    isLoading,
    error
  };
};