const axios = require('axios');

async function testOllama() {
  console.log('='.repeat(60));
  console.log('Testing Ollama Connection');
  console.log('='.repeat(60));

  try {
    console.log('\n1. Checking Ollama server availability...');
    const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    const model = process.env.OLLAMA_MODEL || 'llama3.2';

    console.log(`   URL: ${ollamaUrl}`);
    console.log(`   Model: ${model}`);

    // Test 1: Check server is running
    console.log('\n2. Testing API endpoint...');
    const response = await axios.post(`${ollamaUrl}/api/chat`, {
      model: model,
      messages: [
        {
          role: 'user',
          content: 'Say hello in exactly 5 words!'
        }
      ],
      stream: false,
      options: {
        temperature: 0.7,
        num_predict: 50
      }
    }, {
      timeout: 30000
    });

    console.log('   Status:', response.status);
    console.log('   Success: API is responding');

    console.log('\n3. Ollama Response:');
    console.log('   ' + '-'.repeat(56));
    console.log('   ' + response.data.message.content);
    console.log('   ' + '-'.repeat(56));

    // Test 2: Check if model responds with reasonable content
    console.log('\n4. Testing AI reasoning...');
    const reasoningResponse = await axios.post(`${ollamaUrl}/api/chat`, {
      model: model,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful AI assistant. Be concise.'
        },
        {
          role: 'user',
          content: 'Explain in one sentence what a knowledge graph is.'
        }
      ],
      stream: false,
      options: {
        temperature: 0.7,
        num_predict: 100
      }
    }, {
      timeout: 30000
    });

    console.log('   ' + '-'.repeat(56));
    console.log('   ' + reasoningResponse.data.message.content);
    console.log('   ' + '-'.repeat(56));

    console.log('\n' + '='.repeat(60));
    console.log('✓ ALL TESTS PASSED!');
    console.log('='.repeat(60));
    console.log('\nOllama is working correctly!');
    console.log('You can now start your backend server.\n');

  } catch (error) {
    console.log('\n' + '='.repeat(60));
    console.log('✗ TEST FAILED');
    console.log('='.repeat(60));

    if (error.code === 'ECONNREFUSED') {
      console.error('\n❌ Ollama connection refused');
      console.log('\nTroubleshooting Steps:');
      console.log('1. Check if Ollama is installed:');
      console.log('   curl -fsSL https://ollama.com/install.sh | sh');
      console.log('\n2. Start Ollama service:');
      console.log('   ollama serve');
      console.log('\n3. Pull the model (in a new terminal):');
      console.log('   ollama pull llama3.2');
      console.log('\n4. Verify Ollama is running:');
      console.log('   ollama list');
      console.log('   curl http://localhost:11434/api/tags');

    } else if (error.response?.status === 404) {
      console.error('\n❌ Model not found');
      console.log('\nThe model "' + (process.env.OLLAMA_MODEL || 'llama3.2') + '" is not available.');
      console.log('\nTroubleshooting Steps:');
      console.log('1. List available models:');
      console.log('   ollama list');
      console.log('\n2. Pull the model:');
      console.log('   ollama pull llama3.2');
      console.log('\n3. Try alternative models:');
      console.log('   ollama pull mistral');
      console.log('   ollama pull llama3.1');

    } else if (error.code === 'ETIMEDOUT') {
      console.error('\n❌ Request timed out');
      console.log('\nThe model is taking too long to respond.');
      console.log('\nTroubleshooting Steps:');
      console.log('1. Check system resources (RAM, CPU)');
      console.log('2. Try a smaller model:');
      console.log('   ollama pull llama3.2:1b');
      console.log('3. Increase timeout in your .env file');

    } else {
      console.error('\n❌ Unexpected error:', error.message);
      if (error.response?.data) {
        console.log('\nServer response:', error.response.data);
      }
    }

    console.log('\n' + '='.repeat(60));
    process.exit(1);
  }
}

// Run the test
console.log('\nStarting Ollama connection test...\n');
testOllama();
