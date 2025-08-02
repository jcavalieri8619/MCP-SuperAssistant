import React from 'react';
import { useUserPreferences, useTestingService } from '@src/hooks';
import { Card, CardContent } from '@src/components/ui/card';
import { Typography } from '../ui';
import { AutomationService } from '@src/services/automation.service';
import { cn } from '@src/lib/utils';

// Default delay values in seconds
const DEFAULT_DELAYS = {
  autoInsertDelay: 2,
  autoSubmitDelay: 2,
  autoExecuteDelay: 2
} as const;

const Settings: React.FC = () => {
  const { preferences, updatePreferences } = useUserPreferences();
  const { 
    isEnabled: testingEnabled, 
    config: testingConfig,
    status: testingStatus,
    setEnabled: setTestingEnabled,
    updateConfig: updateTestingConfig,
    sendTestMessage,
    isLoading: testingLoading,
    error: testingError 
  } = useTestingService();

  // Handle delay input changes
  const handleDelayChange = (type: 'autoInsert' | 'autoSubmit' | 'autoExecute', value: string) => {
    const delay = Math.max(0, parseInt(value) || 0); // Ensure non-negative integer
    console.debug(`[Settings] ${type} delay changed to: ${delay}`);
    
    // Update user preferences store with the new delay
    updatePreferences({ [`${type}Delay`]: delay });

    // Store in localStorage
    try {
      const storedDelays = JSON.parse(localStorage.getItem('mcpDelaySettings') || '{}');
      localStorage.setItem('mcpDelaySettings', JSON.stringify({
        ...storedDelays,
        [`${type}Delay`]: delay
      }));
    } catch (error) {
      console.error('[Settings] Error storing delay settings:', error);
    }

    // Update automation state on window
    AutomationService.getInstance().updateAutomationStateOnWindow().catch(console.error);
  };

  // Load stored delays on component mount, set default to 2 seconds if not set
  React.useEffect(() => {
    try {
      const storedDelays = JSON.parse(localStorage.getItem('mcpDelaySettings') || '{}');
      // If no stored delays, use defaults
      if (Object.keys(storedDelays).length === 0) {
        updatePreferences(DEFAULT_DELAYS);
        localStorage.setItem('mcpDelaySettings', JSON.stringify(DEFAULT_DELAYS));
      } else {
        // Use stored delays
        updatePreferences(storedDelays);
      }
    } catch (error) {
      console.error('[Settings] Error loading stored delay settings:', error);
      // Set defaults on error
      updatePreferences(DEFAULT_DELAYS);
      localStorage.setItem('mcpDelaySettings', JSON.stringify(DEFAULT_DELAYS));
    }
  }, [updatePreferences]);

  return (
    <div className="p-4 space-y-4">
      <Card className="border-slate-200 dark:border-slate-700 dark:bg-slate-800">
        <CardContent className="p-4">
          <Typography variant="h4" className="mb-4 text-slate-700 dark:text-slate-300">
            Automation Delay Settings
          </Typography>
          
          <div className="space-y-4">
            {/* Auto Insert Delay */}
            <div>
              <label
                htmlFor="auto-insert-delay"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Auto Insert Delay (seconds)
              </label>
              <input
                id="auto-insert-delay"
                type="number"
                min="0"
                value={preferences.autoInsertDelay || 0}
                onChange={(e) => handleDelayChange('autoInsert', e.target.value)}
                disabled={false}
                className={cn(
                  "w-full p-2 text-sm border rounded-md",
                  "bg-white dark:bg-slate-900",
                  "border-slate-300 dark:border-slate-600",
                  "text-slate-900 dark:text-slate-100"
                )}
              />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Delay before auto-inserting content
              </p>
            </div>

            {/* Auto Submit Delay */}
            <div>
              <label
                htmlFor="auto-submit-delay"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Auto Submit Delay (seconds)
              </label>
              <input
                id="auto-submit-delay"
                type="number"
                min="0"
                value={preferences.autoSubmitDelay || 0}
                onChange={(e) => handleDelayChange('autoSubmit', e.target.value)}
                disabled={false}
                className={cn(
                  "w-full p-2 text-sm border rounded-md",
                  "bg-white dark:bg-slate-900",
                  "border-slate-300 dark:border-slate-600",
                  "text-slate-900 dark:text-slate-100"
                )}
              />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Delay before auto-submitting form
              </p>
            </div>

            {/* Auto Execute Delay */}
            <div>
              <label
                htmlFor="auto-execute-delay"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Auto Execute Delay (seconds)
              </label>
              <input
                id="auto-execute-delay"
                type="number"
                min="0"
                value={preferences.autoExecuteDelay || 0}
                onChange={(e) => handleDelayChange('autoExecute', e.target.value)}
                disabled={false}
                className={cn(
                  "w-full p-2 text-sm border rounded-md",
                  "bg-white dark:bg-slate-900",
                  "border-slate-300 dark:border-slate-600",
                  "text-slate-900 dark:text-slate-100"
                )}
              />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Delay before auto-executing functions
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Testing Settings Section */}
      <Card className="border-slate-200 dark:border-slate-700 dark:bg-slate-800">
        <CardContent className="p-4">
          <Typography variant="h4" className="mb-4 text-slate-700 dark:text-slate-300">
            Testing Framework Settings
          </Typography>
          
          <div className="space-y-4">
            {/* Testing Mode Toggle */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="testing-enabled"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  Enable Testing Mode
                </label>
                <input
                  id="testing-enabled"
                  type="checkbox"
                  checked={testingEnabled}
                  onChange={async (e) => {
                    try {
                      await setTestingEnabled(e.target.checked);
                    } catch (error) {
                      console.error('Failed to toggle testing mode:', error);
                    }
                  }}
                  disabled={testingLoading}
                  className={cn(
                    "w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded",
                    "focus:ring-blue-500 dark:focus:ring-blue-600",
                    "dark:ring-offset-gray-800 focus:ring-2",
                    "dark:bg-gray-700 dark:border-gray-600"
                  )}
                />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Allows external test messages to be injected into chat interfaces
              </p>
            </div>

            {/* Testing Status */}
            {testingStatus && (
              <div>
                <Typography variant="body" className="mb-2 text-slate-700 dark:text-slate-300">
                  Testing Status
                </Typography>
                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Initialized:</span>
                    <span className={testingStatus.initialized ? "text-green-600" : "text-red-600"}>
                      {testingStatus.initialized ? "Yes" : "No"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Queue Length:</span>
                    <span className="text-slate-700 dark:text-slate-300">{testingStatus.queueLength}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Error Display */}
            {testingError && (
              <div className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                <p className="text-xs text-red-600 dark:text-red-400">{testingError}</p>
              </div>
            )}

            {/* Quick Test Message */}
            {testingEnabled && (
              <div>
                <Typography variant="body" className="mb-2 text-slate-700 dark:text-slate-300">
                  Quick Test
                </Typography>
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      try {
                        await sendTestMessage("Hello! This is a test message from MCP SuperAssistant testing framework.");
                      } catch (error) {
                        console.error('Failed to send test message:', error);
                      }
                    }}
                    disabled={testingLoading}
                    className={cn(
                      "px-3 py-1 text-xs rounded-md",
                      "bg-blue-500 hover:bg-blue-600 text-white",
                      "disabled:bg-gray-400 disabled:cursor-not-allowed",
                      "transition-colors"
                    )}
                  >
                    Send Test Message
                  </button>
                  <button
                    onClick={() => {
                      window.open('http://localhost:3007', '_blank', 'width=800,height=600');
                    }}
                    className={cn(
                      "px-3 py-1 text-xs rounded-md",
                      "bg-green-500 hover:bg-green-600 text-white",
                      "transition-colors"
                    )}
                  >
                    Open Test Interface
                  </button>
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Test message injection or open the external testing interface
                </p>
              </div>
            )}

            {/* Configuration Details */}
            {testingEnabled && testingConfig && (
              <div>
                <Typography variant="body" className="mb-2 text-slate-700 dark:text-slate-300">
                  Configuration
                </Typography>
                <div className="text-xs space-y-1 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-md">
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Max Message Length:</span>
                    <span className="text-slate-700 dark:text-slate-300">{testingConfig.maxMessageLength}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Rate Limit:</span>
                    <span className="text-slate-700 dark:text-slate-300">{testingConfig.rateLimitMs}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Debug Mode:</span>
                    <span className={testingConfig.debugMode ? "text-green-600" : "text-slate-500"}>
                      {testingConfig.debugMode ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Instructions */}
            {testingEnabled && (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                <Typography variant="body" className="mb-2 text-yellow-800 dark:text-yellow-200 font-medium">
                  Testing Instructions
                </Typography>
                <div className="text-xs text-yellow-700 dark:text-yellow-300 space-y-1">
                  <p>1. Run test server: <code className="bg-yellow-100 dark:bg-yellow-900 px-1 rounded">node test-server.js</code></p>
                  <p>2. Open test interface: <code className="bg-yellow-100 dark:bg-yellow-900 px-1 rounded">http://localhost:3007</code></p>
                  <p>3. Send test messages that will be injected into the current AI chat</p>
                  <p>4. Messages use existing automation service for insertion</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
