#!/usr/bin/env node

/**
 * MCP SuperAssistant Testing Client
 * 
 * Command-line utility for sending test messages to the browser extension.
 * 
 * Usage:
 *   node test-client.js "Your test message here"
 *   node test-client.js --interactive
 *   node test-client.js --examples
 */

const http = require('http');
const readline = require('readline');

// Configuration
const DEFAULT_SERVER_URL = 'http://localhost:3007';
const server_url = process.env.MCP_TEST_SERVER || DEFAULT_SERVER_URL;

// Example messages for testing
const examples = [
  "Hello! This is a test message from the MCP SuperAssistant testing framework.",
  "Can you help me test the extension's ability to inject complex questions into the chat?",
  "Testing special characters: @#$%^&*()_+{}|:<>?[];',./`~",
  "Please analyze this code snippet: console.log('Hello, World!');",
  "What are the benefits of using TypeScript over JavaScript?",
  "Testing a very long message: " + "Lorem ipsum dolor sit amet, consectetur adipiscing elit. ".repeat(10),
  "🚀 Testing emoji support and Unicode characters: 你好世界 🌟",
  "Testing markdown-like content: **bold text** and `code snippet`"
];

function showHelp() {
  console.log(`
🤖 MCP SuperAssistant Testing Client

Usage:
  node test-client.js "Your message here"    Send a specific message
  node test-client.js --interactive          Start interactive mode
  node test-client.js --examples             Show example messages
  node test-client.js --help                 Show this help

Environment Variables:
  MCP_TEST_SERVER    Test server URL (default: ${DEFAULT_SERVER_URL})

Examples:
  node test-client.js "Hello from command line!"
  MCP_TEST_SERVER=http://localhost:8080 node test-client.js "Custom server"
`);
}

function showExamples() {
  console.log('\n📝 Example Test Messages:\n');
  examples.forEach((example, index) => {
    console.log(`${index + 1}. ${example.substring(0, 80)}${example.length > 80 ? '...' : ''}`);
  });
  console.log('\nUse: node test-client.js "message" to send any of these\n');
}

async function sendMessage(text, id = null) {
  const messageData = {
    text: text,
    id: id || `cli-${Date.now()}`,
    timestamp: Date.now(),
    source: 'test-client'
  };

  const data = JSON.stringify(messageData);
  
  const options = {
    hostname: 'localhost',
    port: 3007,
    path: '/send-message',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    }
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(responseData);
          resolve(response);
        } catch (error) {
          reject(new Error(`Invalid JSON response: ${responseData}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

async function checkServerStatus() {
  return new Promise((resolve, reject) => {
    const req = http.get(`${server_url}/status`, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (error) {
          reject(new Error(`Invalid response: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

function startInteractiveMode() {
  console.log('\n🎯 Interactive Testing Mode');
  console.log('Type messages to send to the extension, or commands:');
  console.log('  /examples  - Show example messages');
  console.log('  /status    - Check server status');
  console.log('  /quit      - Exit interactive mode\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '📤 Message> '
  });

  rl.prompt();

  rl.on('line', async (line) => {
    const input = line.trim();
    
    if (input === '/quit' || input === '/exit') {
      console.log('\n👋 Goodbye!');
      rl.close();
      return;
    }

    if (input === '/examples') {
      showExamples();
      rl.prompt();
      return;
    }

    if (input === '/status') {
      try {
        const status = await checkServerStatus();
        console.log('\n📊 Server Status:', status);
      } catch (error) {
        console.log('\n❌ Server Error:', error.message);
      }
      rl.prompt();
      return;
    }

    if (input.startsWith('/example ')) {
      const num = parseInt(input.split(' ')[1]) - 1;
      if (num >= 0 && num < examples.length) {
        const message = examples[num];
        console.log(`\n📤 Sending example ${num + 1}: ${message.substring(0, 50)}...`);
        try {
          const response = await sendMessage(message);
          if (response.success) {
            console.log(`✅ Message sent successfully! ID: ${response.messageId}`);
          } else {
            console.log(`❌ Error: ${response.error}`);
          }
        } catch (error) {
          console.log(`❌ Failed to send message: ${error.message}`);
        }
      } else {
        console.log(`❌ Invalid example number. Use 1-${examples.length}`);
      }
      rl.prompt();
      return;
    }

    if (!input) {
      rl.prompt();
      return;
    }

    // Send the message
    try {
      console.log(`\n📤 Sending: ${input}`);
      const response = await sendMessage(input);
      
      if (response.success) {
        console.log(`✅ Message sent successfully! ID: ${response.messageId}`);
      } else {
        console.log(`❌ Error: ${response.error}`);
      }
    } catch (error) {
      console.log(`❌ Failed to send message: ${error.message}`);
      console.log('💡 Make sure the test server is running: node test-server.js');
    }

    rl.prompt();
  });

  rl.on('close', () => {
    console.log('\n👋 Interactive mode ended');
    process.exit(0);
  });
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    showHelp();
    return;
  }

  if (args[0] === '--examples') {
    showExamples();
    return;
  }

  if (args[0] === '--interactive' || args[0] === '-i') {
    // First check if server is running
    try {
      console.log('🔍 Checking server status...');
      const status = await checkServerStatus();
      console.log(`✅ Server is running on port ${status.port}`);
      startInteractiveMode();
    } catch (error) {
      console.log(`❌ Cannot connect to test server: ${error.message}`);
      console.log('💡 Start the server first: node test-server.js');
      process.exit(1);
    }
    return;
  }

  // Single message mode
  const message = args.join(' ');
  
  if (!message.trim()) {
    console.log('❌ Please provide a message to send');
    showHelp();
    return;
  }

  try {
    console.log('🔍 Checking server status...');
    await checkServerStatus();
    
    console.log(`📤 Sending message: ${message}`);
    const response = await sendMessage(message);
    
    if (response.success) {
      console.log(`✅ Message sent successfully!`);
      console.log(`📋 Message ID: ${response.messageId}`);
      console.log(`⏰ Timestamp: ${new Date(response.timestamp).toLocaleString()}`);
    } else {
      console.log(`❌ Error: ${response.error}`);
      process.exit(1);
    }
    
  } catch (error) {
    console.log(`❌ Failed to send message: ${error.message}`);
    console.log('💡 Make sure the test server is running: node test-server.js');
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run the main function
main().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});