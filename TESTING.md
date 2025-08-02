# MCP SuperAssistant Testing Framework

This testing framework allows developers to send test messages to the MCP SuperAssistant browser extension, which are then automatically injected into AI assistant chat interfaces (ChatGPT, Perplexity, Gemini, etc.).

## Overview

The testing framework consists of:
- **Testing Service**: Core service that handles test message reception and injection
- **Test Server**: HTTP server providing a web interface for sending test messages
- **Test Client**: Command-line utility for sending messages programmatically
- **UI Integration**: Settings panel in the extension sidebar for configuration

## Quick Start

### 1. Enable Testing Mode

Open the MCP SuperAssistant sidebar on any supported AI platform and:
1. Navigate to the Settings section
2. Enable "Testing Mode" toggle
3. The extension is now ready to receive test messages

### 2. Start the Test Server

```bash
# Start the test server (default port 3007)
pnpm test-server

# Or directly
node test-server.js

# Custom port
node test-server.js 8080
```

### 3. Send Test Messages

#### Option A: Web Interface
1. Open http://localhost:3007 in your browser
2. Enter your test message
3. Click "Send Test Message"
4. The message will be injected into the AI chat interface

#### Option B: Command Line
```bash
# Interactive mode
pnpm test

# Send a single message
pnpm test-client "Hello from command line!"

# Direct usage
node test-client.js "Your test message here"
```

## Detailed Usage

### Test Server

The test server provides a web interface and HTTP API:

```bash
# Start server
node test-server.js [port]

# Endpoints:
# GET  /           - Web interface
# POST /send-message - Send test message
# GET  /status      - Server status
```

**API Example:**
```bash
curl -X POST http://localhost:3007/send-message \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello from API!", "id": "test-123"}'
```

### Test Client Commands

```bash
# Show help
node test-client.js --help

# Interactive mode
node test-client.js --interactive

# Show example messages
node test-client.js --examples

# Send specific message
node test-client.js "Your message here"

# Send example message by number
# (in interactive mode)
/example 1
```

### Browser Console Testing

For quick testing without external tools:

```javascript
// Enable testing mode
window.__MCP_TEST_MODE = true;

// Send test message via API
window.__mcpTesting.sendMessage("Hello from console!");

// Check testing status
window.__mcpTesting.getConfig();
```

## Configuration

### Extension Settings

Access via MCP SuperAssistant sidebar → Settings → Testing Framework Settings:

- **Enable Testing Mode**: Master toggle for testing functionality
- **Quick Test**: Send a predefined test message
- **Open Test Interface**: Launch the web testing interface
- **Configuration Details**: View current settings (rate limits, etc.)

### Environment Variables

```bash
# Enable testing mode automatically
export MCP_TEST_MODE=true

# Custom test server URL
export MCP_TEST_SERVER=http://localhost:8080
```

### Testing Service Configuration

The testing service can be configured programmatically:

```javascript
// Get current config
const config = window.__mcpTesting.getConfig();

// Update configuration
window.__mcpTesting.setConfig({
  maxMessageLength: 5000,
  rateLimitMs: 500,
  debugMode: true
});
```

## How It Works

### Architecture

1. **Message Reception**: Testing service listens for messages via:
   - `postMessage` events from external windows
   - Custom DOM events (`mcp:test-message`)
   - Chrome extension messaging API

2. **Message Processing**: 
   - Validates message format and rate limits
   - Queues messages for processing
   - Triggers the automation service

3. **Message Injection**:
   - Uses existing automation service infrastructure
   - Leverages adapter system for platform-specific injection
   - Integrates with existing text insertion capabilities

### Message Flow

```
Test Interface/API → Testing Service → Automation Service → Adapter → AI Chat Interface
```

### Security Features

- **Origin Validation**: Configurable allowed origins for postMessage
- **Rate Limiting**: Prevents message spam (default: 1 second minimum)
- **Length Limits**: Prevents oversized messages (default: 10,000 chars)
- **Disabled by Default**: Testing mode must be explicitly enabled

## API Reference

### Testing Service API

```javascript
// Available on window.__mcpTesting when enabled

// Send test message
await window.__mcpTesting.sendMessage(text, options);

// Get configuration
const config = window.__mcpTesting.getConfig();

// Update configuration
await window.__mcpTesting.setConfig(newConfig);

// Check if enabled
const enabled = window.__mcpTesting.isEnabled();

// Get message queue
const queue = window.__mcpTesting.getQueue();

// Clear message queue
window.__mcpTesting.clearQueue();
```

### Message Format

```typescript
interface TestMessage {
  id?: string;           // Optional unique identifier
  text: string;          // Message content (required)
  timestamp?: number;    // Unix timestamp
  source?: string;       // Source identifier
  metadata?: Record<string, any>; // Additional data
}
```

### Response Format

```typescript
interface TestResponse {
  success: boolean;      // Whether message was processed
  messageId?: string;    // Assigned message ID
  error?: string;        // Error message if failed
  timestamp: number;     // Processing timestamp
}
```

## Examples

### Example Messages

```javascript
// Simple greeting
"Hello! This is a test message from the MCP SuperAssistant testing framework."

// Complex question
"Can you explain quantum computing in simple terms? This is a test of the extension's ability to inject complex questions."

// Special characters
"Testing special characters: @#$%^&*()_+{}|:<>?[];',./`~"

// Code snippet
"Please analyze this code snippet: console.log('Hello, World!');"

// Unicode and emoji
"🚀 Testing emoji support and Unicode characters: 你好世界 🌟"
```

### Automated Testing Script

```javascript
// Simple automation example
const messages = [
  "Test message 1",
  "Test message 2", 
  "Test message 3"
];

for (const message of messages) {
  await window.__mcpTesting.sendMessage(message);
  await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
}
```

## Troubleshooting

### Common Issues

1. **Testing mode not working**
   - Ensure testing mode is enabled in extension settings
   - Check browser console for error messages
   - Verify the extension is active on the current page

2. **Test server connection failed**
   - Verify server is running: `node test-server.js`
   - Check the correct port (default: 3007)
   - Ensure no firewall blocking localhost connections

3. **Messages not appearing in chat**
   - Verify automation service is initialized
   - Check that auto-insert is enabled in extension settings
   - Ensure the correct adapter is active for the current platform

4. **Rate limiting errors**
   - Wait between messages (default: 1 second minimum)
   - Adjust rate limit in configuration if needed

### Debug Mode

Enable debug mode for detailed logging:

```javascript
// Enable debug mode
window.__mcpTesting.setConfig({ debugMode: true });

// Check browser console for detailed logs
```

### Browser Console Commands

```javascript
// Check testing service status
window.__mcpTesting?.getConfig()

// Force enable testing mode (development)
window.__MCP_TEST_MODE = true;

// Check automation service
window.__automationService?.getState()

// Manually trigger test automation
window.__automationService?.testAutoInsert("Test message")
```

## Development

### Adding New Features

1. **Testing Service**: Extend `pages/content/src/services/testing.service.ts`
2. **UI Components**: Modify `pages/content/src/components/sidebar/Settings/Settings.tsx`
3. **Test Server**: Update `test-server.js` for new endpoints
4. **Test Client**: Enhance `test-client.js` for new commands

### Running in Development

```bash
# Start extension in development mode
pnpm dev

# Start test server
pnpm test-server

# Use test client
pnpm test-client --interactive
```

## Security Considerations

- **Only enable testing mode in development/testing environments**
- **Testing mode allows external control of chat input**
- **Rate limiting and validation provide basic protection**
- **Always disable testing mode in production builds**

## Contributing

When contributing to the testing framework:

1. Maintain backward compatibility with existing API
2. Add appropriate error handling and validation
3. Update documentation for new features
4. Test across multiple AI platforms
5. Consider security implications of changes

## License

This testing framework is part of MCP SuperAssistant and follows the same MIT license terms.