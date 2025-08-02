/**
 * Services Index
 * 
 * Centralized export point for all application services
 */

export { 
  AutomationService, 
  automationService, 
  initializeAutomationService, 
  cleanupAutomationService,
  type AutomationState,
  type ToolExecutionCompleteDetail
} from './automation.service';

export {
  TestingService,
  testingService,
  initializeTestingService,
  cleanupTestingService,
  type TestMessage,
  type TestConfig,
  type TestResponse
} from './testing.service';

// Export initialization function for all services
export async function initializeAllServices(): Promise<void> {
  console.debug('[Services] Initializing all application services...');
  
  try {
    // Initialize automation service
    const { initializeAutomationService } = await import('./automation.service');
    await initializeAutomationService();
    
    // Initialize testing service
    const { initializeTestingService } = await import('./testing.service');
    await initializeTestingService();
    
    console.debug('[Services] All services initialized successfully');
  } catch (error) {
    console.error('[Services] Error initializing services:', error);
    throw error;
  }
}

// Export cleanup function for all services
export async function cleanupAllServices(): Promise<void> {
  console.debug('[Services] Cleaning up all application services...');
  
  try {
    // Cleanup automation service
    const { cleanupAutomationService } = await import('./automation.service');
    cleanupAutomationService();
    
    // Cleanup testing service
    const { cleanupTestingService } = await import('./testing.service');
    cleanupTestingService();
    
    console.debug('[Services] All services cleaned up successfully');
  } catch (error) {
    console.error('[Services] Error cleaning up services:', error);
  }
}
