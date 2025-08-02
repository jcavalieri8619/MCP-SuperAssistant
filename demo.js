#!/usr/bin/env node

/**
 * MCP SuperAssistant Testing Framework Demo
 * 
 * This script demonstrates the testing framework capabilities.
 * It sends a series of test messages to showcase different features.
 */

import http from 'http';

// Configuration
const TEST_SERVER_URL = 'http://localhost:3007';
const DEMO_MESSAGES = [
  {
    text: "🎉 Hello! This is a demonstration of the MCP SuperAssistant testing framework.",
    delay: 2000
  },
  {
    text: "This message was sent programmatically and will be injected into your AI chat interface.",
    delay: 2000
  },
  {
    text: "The testing framework supports various types of content including special characters: @#$%^&*()",
    delay: 2000
  },
  {
    text: "You can send code snippets: `console.log('Hello, World!');`",
    delay: 2000
  },
  {
    text: "Test emoji support: 🚀 🤖 💻 🌟",
    delay: 2000
  },
  {
    text: "This concludes the testing framework demonstration. Happy testing! 🎯",
    delay: 1000
  }
];

async function sendMessage(text, id = null) {
  const messageData = {
    text: text,
    id: id || `demo-${Date.now()}`,
    timestamp: Date.now(),
    source: 'demo-script'
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

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runDemo() {
  console.log('🎬 Starting MCP SuperAssistant Testing Framework Demo');
  console.log('📝 This demo will send a series of test messages to demonstrate the framework');
  console.log('');
  
  // Check if server is running
  try {
    const statusReq = http.get('http://localhost:3007/status', (res) => {
      if (res.statusCode === 200) {
        console.log('✅ Test server is running');
        runDemoMessages();
      }
    });
    
    statusReq.on('error', (error) => {
      console.log('❌ Test server is not running. Please start it first:');
      console.log('   node test-server.js');
      process.exit(1);
    });
    
  } catch (error) {
    console.log('❌ Error checking server status:', error.message);
    process.exit(1);
  }
}

async function runDemoMessages() {
  console.log('🚀 Sending demo messages...');
  console.log('');
  
  for (let i = 0; i < DEMO_MESSAGES.length; i++) {
    const message = DEMO_MESSAGES[i];
    
    try {
      console.log(`📤 [${i + 1}/${DEMO_MESSAGES.length}] ${message.text.substring(0, 50)}...`);
      
      const response = await sendMessage(message.text);
      
      if (response.success) {
        console.log(`   ✅ Sent successfully (ID: ${response.messageId})`);
      } else {
        console.log(`   ❌ Failed: ${response.error}`);
      }
      
      // Wait before sending next message
      if (i < DEMO_MESSAGES.length - 1) {
        console.log(`   ⏳ Waiting ${message.delay}ms...`);
        await sleep(message.delay);
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }
  
  console.log('');
  console.log('🎉 Demo completed!');
  console.log('');
  console.log('💡 To use the testing framework:');
  console.log('1. Open an AI platform (ChatGPT, Perplexity, etc.)');
  console.log('2. Enable testing mode in the MCP SuperAssistant extension');
  console.log('3. Run this demo or send custom messages via:');
  console.log('   - Web interface: http://localhost:3007');
  console.log('   - Command line: node test-client.js "Your message"');
  console.log('   - Interactive mode: node test-client.js --interactive');
}

// Run the demo
runDemo().catch(error => {
  console.error('❌ Demo failed:', error);
  process.exit(1);
});