/**
 * Testing Service for MCP SuperAssistant
 * 
 * This service provides a local testing framework that allows users to send test messages
 * to the browser extension, which are then inserted into AI assistant chat interfaces.
 * 
 * Features:
 * - Receives test messages via various channels (postMessage, custom events, etc.)
 * - Integrates with existing automation service for text insertion
 * - Supports all AI platforms through the adapter system
 * - Configurable test mode with safety checks
 * - Debugging and logging capabilities
 */

import { automationService } from './automation.service';
import { eventBus } from '../events/event-bus';
import { useUIStore } from '../stores/ui.store';

// Type definitions for testing
export interface TestMessage {
  id?: string;
  text: string;
  timestamp?: number;
  source?: string;
  metadata?: Record<string, any>;
}

export interface TestConfig {
  enabled: boolean;
  allowedOrigins: string[];
  maxMessageLength: number;
  rateLimitMs: number;
  debugMode: boolean;
}

export interface TestResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  timestamp: number;
}

/**
 * Testing Service Class
 * Handles test message reception and injection into AI chat interfaces
 */
export class TestingService {
  private static instance: TestingService | null = null;
  private isInitialized = false;
  private config: TestConfig;
  private messageQueue: TestMessage[] = [];
  private lastMessageTime = 0;
  private messageListeners: Map<string, ((message: TestMessage) => void)[]> = new Map();

  // Default configuration
  private readonly defaultConfig: TestConfig = {
    enabled: false, // Disabled by default for security
    allowedOrigins: ['http://localhost', 'https://localhost', 'chrome-extension://'], 
    maxMessageLength: 10000,
    rateLimitMs: 1000, // Minimum 1 second between messages
    debugMode: false
  };

  private constructor() {
    this.config = { ...this.defaultConfig };
  }

  /**
   * Get the singleton instance of TestingService
   */
  public static getInstance(): TestingService {
    if (!TestingService.instance) {
      TestingService.instance = new TestingService();
    }
    return TestingService.instance;
  }

  /**
   * Initialize the testing service
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.debug('[TestingService] Already initialized, skipping');
      return;
    }

    console.debug('[TestingService] Initializing testing service');

    // Load configuration from storage or environment
    await this.loadConfig();

    // Only set up listeners if testing is enabled
    if (this.config.enabled) {
      this.setupMessageListeners();
      this.setupTestingAPI();
      console.info('[TestingService] Testing mode enabled - ready to receive test messages');
    } else {
      console.debug('[TestingService] Testing mode disabled');
    }

    this.isInitialized = true;
    console.debug('[TestingService] Testing service initialized');
  }

  /**
   * Enable or disable testing mode
   */
  public async setTestingEnabled(enabled: boolean): Promise<void> {
    if (this.config.enabled === enabled) {
      return;
    }

    this.config.enabled = enabled;
    await this.saveConfig();

    if (enabled) {
      this.setupMessageListeners();
      this.setupTestingAPI();
      console.info('[TestingService] Testing mode enabled');
    } else {
      this.cleanup();
      console.info('[TestingService] Testing mode disabled');
    }

    // Notify about configuration change
    eventBus.emit('testing:config-changed', { enabled });
  }

  /**
   * Load configuration from storage
   */
  private async loadConfig(): Promise<void> {
    try {
      // Check for environment variable first (for development)
      const envTestMode = (window as any).__MCP_TEST_MODE;
      if (envTestMode) {
        this.config.enabled = true;
        this.config.debugMode = true;
        console.debug('[TestingService] Test mode enabled via environment variable');
        return;
      }

      // Load from Chrome storage
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.local.get('mcp_testing_config');
        if (result.mcp_testing_config) {
          this.config = { ...this.defaultConfig, ...result.mcp_testing_config };
          console.debug('[TestingService] Loaded config from storage:', this.config);
        }
      }
    } catch (error) {
      console.warn('[TestingService] Error loading config, using defaults:', error);
    }
  }

  /**
   * Save configuration to storage
   */
  private async saveConfig(): Promise<void> {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        await chrome.storage.local.set({ mcp_testing_config: this.config });
        console.debug('[TestingService] Saved config to storage');
      }
    } catch (error) {
      console.error('[TestingService] Error saving config:', error);
    }
  }

  /**
   * Set up message listeners for test messages
   */
  private setupMessageListeners(): void {
    // Listen for postMessage events
    window.addEventListener('message', this.handlePostMessage.bind(this), false);

    // Listen for custom DOM events
    document.addEventListener('mcp:test-message', this.handleCustomEvent.bind(this));

    // Listen for Chrome extension messages (if available)
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.onMessage.addListener(this.handleChromeMessage.bind(this));
    }

    console.debug('[TestingService] Message listeners set up');
  }

  /**
   * Set up testing API on window object for external access
   */
  private setupTestingAPI(): void {
    (window as any).__mcpTesting = {
      sendMessage: this.sendTestMessage.bind(this),
      getConfig: () => ({ ...this.config }),
      setConfig: this.updateConfig.bind(this),
      getQueue: () => [...this.messageQueue],
      clearQueue: () => { this.messageQueue = []; },
      isEnabled: () => this.config.enabled,
      version: '1.0.0'
    };

    console.debug('[TestingService] Testing API exposed on window.__mcpTesting');
  }

  /**
   * Handle postMessage events
   */
  private async handlePostMessage(event: MessageEvent): Promise<void> {
    if (!this.config.enabled) return;

    // Check origin if configured
    if (this.config.allowedOrigins.length > 0) {
      const isAllowed = this.config.allowedOrigins.some(origin => 
        event.origin.startsWith(origin)
      );
      if (!isAllowed) {
        console.warn('[TestingService] Message from disallowed origin:', event.origin);
        return;
      }
    }

    // Check for test message format
    if (event.data && event.data.type === 'mcp-test-message') {
      await this.processTestMessage({
        id: event.data.id,
        text: event.data.text,
        timestamp: event.data.timestamp || Date.now(),
        source: 'postMessage',
        metadata: event.data.metadata
      });
    }
  }

  /**
   * Handle custom DOM events
   */
  private async handleCustomEvent(event: Event): Promise<void> {
    if (!this.config.enabled) return;

    const customEvent = event as CustomEvent;
    if (customEvent.detail && customEvent.detail.text) {
      await this.processTestMessage({
        id: customEvent.detail.id,
        text: customEvent.detail.text,
        timestamp: customEvent.detail.timestamp || Date.now(),
        source: 'customEvent',
        metadata: customEvent.detail.metadata
      });
    }
  }

  /**
   * Handle Chrome extension messages
   */
  private async handleChromeMessage(message: any, sender: any, sendResponse: Function): Promise<void> {
    if (!this.config.enabled) return;

    if (message.type === 'mcp-test-message' && message.text) {
      const result = await this.processTestMessage({
        id: message.id,
        text: message.text,
        timestamp: message.timestamp || Date.now(),
        source: 'chromeMessage',
        metadata: message.metadata
      });
      
      sendResponse(result);
    }
  }

  /**
   * Process and validate test message
   */
  private async processTestMessage(message: TestMessage): Promise<TestResponse> {
    const now = Date.now();
    const messageId = message.id || `test-${now}`;

    try {
      // Rate limiting check
      if (now - this.lastMessageTime < this.config.rateLimitMs) {
        const error = `Rate limit exceeded. Wait ${this.config.rateLimitMs}ms between messages`;
        console.warn('[TestingService]', error);
        return { success: false, error, timestamp: now };
      }

      // Message length validation
      if (message.text.length > this.config.maxMessageLength) {
        const error = `Message too long. Max length: ${this.config.maxMessageLength}`;
        console.warn('[TestingService]', error);
        return { success: false, error, timestamp: now };
      }

      // Add to queue
      this.messageQueue.push({ ...message, id: messageId });
      this.lastMessageTime = now;

      if (this.config.debugMode) {
        console.debug('[TestingService] Processing test message:', message);
      }

      // Inject message into chat interface
      const success = await this.injectMessageToChat(message.text);

      const response: TestResponse = {
        success,
        messageId,
        timestamp: now
      };

      if (!success) {
        response.error = 'Failed to inject message into chat interface';
      }

      // Emit event for listeners
      eventBus.emit('testing:message-processed', { message, response });

      return response;

    } catch (error) {
      console.error('[TestingService] Error processing test message:', error);
      return {
        success: false,
        messageId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: now
      };
    }
  }

  /**
   * Inject message into the AI chat interface using the automation service
   */
  private async injectMessageToChat(text: string): Promise<boolean> {
    try {
      // Check if automation service is available
      if (!automationService.isServiceInitialized()) {
        console.warn('[TestingService] Automation service not initialized');
        return false;
      }

      // Create a mock tool execution event to trigger the automation service
      const testEvent: any = {
        result: text,
        isFileAttachment: false,
        skipAutoInsertCheck: false, // Allow auto-insert
        functionName: 'test_message_injection',
        callId: `test-${Date.now()}`
      };

      // Trigger automation to insert the text
      await automationService.triggerTestAutomation(testEvent);

      console.debug('[TestingService] Successfully triggered message injection');
      return true;

    } catch (error) {
      console.error('[TestingService] Error injecting message to chat:', error);
      return false;
    }
  }

  /**
   * Public method to send test message (for API access)
   */
  public async sendTestMessage(text: string, options: Partial<TestMessage> = {}): Promise<TestResponse> {
    if (!this.config.enabled) {
      return {
        success: false,
        error: 'Testing mode is disabled',
        timestamp: Date.now()
      };
    }

    const message: TestMessage = {
      id: options.id,
      text,
      timestamp: options.timestamp || Date.now(),
      source: 'api',
      metadata: options.metadata
    };

    return await this.processTestMessage(message);
  }

  /**
   * Update configuration
   */
  public async updateConfig(newConfig: Partial<TestConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    await this.saveConfig();

    // Restart listeners if enabled state changed
    if ('enabled' in newConfig) {
      await this.setTestingEnabled(this.config.enabled);
    }

    console.debug('[TestingService] Configuration updated:', this.config);
  }

  /**
   * Clean up listeners and resources
   */
  public cleanup(): void {
    if (!this.isInitialized) return;

    // Remove event listeners
    window.removeEventListener('message', this.handlePostMessage.bind(this));
    document.removeEventListener('mcp:test-message', this.handleCustomEvent.bind(this));

    // Clear testing API
    if ((window as any).__mcpTesting) {
      delete (window as any).__mcpTesting;
    }

    // Clear message queue
    this.messageQueue = [];
    this.messageListeners.clear();

    console.debug('[TestingService] Testing service cleaned up');
  }

  /**
   * Get service status
   */
  public getStatus(): { 
    initialized: boolean;
    enabled: boolean;
    queueLength: number;
    config: TestConfig;
  } {
    return {
      initialized: this.isInitialized,
      enabled: this.config.enabled,
      queueLength: this.messageQueue.length,
      config: { ...this.config }
    };
  }
}

// Export singleton instance
export const testingService = TestingService.getInstance();

// Export initialization function
export async function initializeTestingService(): Promise<void> {
  await testingService.initialize();
}

// Export cleanup function
export function cleanupTestingService(): void {
  testingService.cleanup();
}

// Default export for convenience
export default testingService;