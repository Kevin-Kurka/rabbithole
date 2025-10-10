# Ollama Integration Guide for RabbitHole AI Assistant

## Overview

RabbitHole now uses **Ollama** for local AI assistance - completely free and private! This guide will help you set up and use Ollama with the RabbitHole backend.

## Why Ollama?

- **FREE**: No API costs, no subscription fees
- **Private**: Your data never leaves your machine
- **Fast**: Runs locally on your hardware
- **Offline**: Works without internet connection
- **Flexible**: Multiple models available
- **Open Source**: Community-driven development

## System Requirements

### Minimum Requirements
- **RAM**: 8GB (for llama3.2:1b)
- **Storage**: 5GB free disk space
- **OS**: macOS, Linux, or Windows with WSL

### Recommended Requirements
- **RAM**: 16GB (for llama3.2 or mistral)
- **Storage**: 10GB free disk space
- **GPU**: Optional, but speeds up inference significantly

## Installation

### Step 1: Install Ollama

#### macOS / Linux
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

#### Manual Installation
Visit [https://ollama.com/download](https://ollama.com/download) and download the installer for your OS.

### Step 2: Verify Installation
```bash
ollama --version
```

You should see output like: `ollama version 0.x.x`

### Step 3: Start Ollama Service
```bash
# Start in foreground (for testing)
ollama serve

# Or start in background (for production)
ollama serve > /dev/null 2>&1 &
```

### Step 4: Pull a Model

#### Option A: Recommended Model (llama3.2)
```bash
ollama pull llama3.2
```
- **Size**: ~2GB
- **Quality**: Good
- **Speed**: Fast
- **RAM**: 8GB minimum

#### Option B: Smallest Model (llama3.2:1b)
```bash
ollama pull llama3.2:1b
```
- **Size**: ~1.3GB
- **Quality**: Decent
- **Speed**: Very fast
- **RAM**: 4GB minimum

#### Option C: Best Quality (mistral)
```bash
ollama pull mistral
```
- **Size**: ~4GB
- **Quality**: Excellent
- **Speed**: Moderate
- **RAM**: 16GB recommended

### Step 5: Verify Model is Available
```bash
ollama list
```

You should see your downloaded model(s) listed.

## Configuration

### Backend Environment Variables

Update your `/Users/kmk/rabbithole/backend/.env` file:

```bash
# Ollama Configuration
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
AI_MAX_TOKENS=1000
AI_TEMPERATURE=0.7
```

### Configuration Options

| Variable | Default | Description |
|----------|---------|-------------|
| `OLLAMA_URL` | `http://localhost:11434` | Ollama API endpoint |
| `OLLAMA_MODEL` | `llama3.2` | Model to use for AI responses |
| `AI_MAX_TOKENS` | `1000` | Maximum tokens per response |
| `AI_TEMPERATURE` | `0.7` | Response creativity (0.0-1.0) |

## Testing Your Setup

### Test 1: Quick Connection Test
```bash
cd /Users/kmk/rabbithole/backend
node test-ollama.js
```

Expected output:
```
============================================================
Testing Ollama Connection
============================================================

1. Checking Ollama server availability...
   URL: http://localhost:11434
   Model: llama3.2

2. Testing API endpoint...
   Status: 200
   Success: API is responding

3. Ollama Response:
   --------------------------------------------------------
   Hello there, nice to meet you today!
   --------------------------------------------------------

4. Testing AI reasoning...
   --------------------------------------------------------
   A knowledge graph is a structured representation of...
   --------------------------------------------------------

============================================================
✓ ALL TESTS PASSED!
============================================================

Ollama is working correctly!
You can now start your backend server.
```

### Test 2: Manual API Test
```bash
curl http://localhost:11434/api/chat -d '{
  "model": "llama3.2",
  "messages": [
    {
      "role": "user",
      "content": "Hello!"
    }
  ],
  "stream": false
}'
```

### Test 3: Start Backend Server
```bash
cd /Users/kmk/rabbithole/backend
npm install
npm start
```

The server should log:
```
AI Assistant initialized with Ollama (llama3.2) at http://localhost:11434
```

## Usage Examples

### Example 1: Get Methodology Guidance

```graphql
query {
  getMethodologyGuidance(graphId: "your-graph-id")
}
```

Ollama will analyze your graph and provide suggestions based on the methodology.

### Example 2: Chat with AI Assistant

```graphql
mutation {
  askAIAssistant(
    graphId: "your-graph-id"
    question: "How do I know when I've found the root cause?"
  )
}
```

### Example 3: Check for Inconsistencies

```graphql
query {
  detectGraphInconsistencies(graphId: "your-graph-id")
}
```

## Troubleshooting

### Issue: "Ollama is not running"

**Symptoms:**
```
Error: Ollama is not running. Please start Ollama with: ollama serve
```

**Solution:**
```bash
# Check if Ollama is running
ps aux | grep ollama

# If not running, start it
ollama serve &
```

### Issue: "Model not found"

**Symptoms:**
```
Error: model 'llama3.2' not found
```

**Solution:**
```bash
# Pull the model
ollama pull llama3.2

# Verify it's available
ollama list
```

### Issue: Slow Response Times

**Symptoms:** Requests take 30+ seconds

**Solutions:**
1. **Use a smaller model:**
   ```bash
   ollama pull llama3.2:1b
   export OLLAMA_MODEL=llama3.2:1b
   ```

2. **Reduce token limit:**
   ```bash
   export AI_MAX_TOKENS=500
   ```

3. **Upgrade RAM or use GPU acceleration**

### Issue: Out of Memory

**Symptoms:**
```
Error: failed to allocate memory
```

**Solutions:**
1. **Use smaller model:**
   ```bash
   ollama pull llama3.2:1b
   ```

2. **Close other applications**

3. **Increase system swap space**

### Issue: Connection Timeout

**Symptoms:**
```
Error: timeout of 60000ms exceeded
```

**Solutions:**
1. **First request is slow (model loading):** Wait 30-60 seconds
2. **Increase timeout in code** (for very slow hardware)
3. **Use smaller model**

## Model Comparison

| Model | Size | RAM Required | Speed | Quality | Use Case |
|-------|------|--------------|-------|---------|----------|
| llama3.2:1b | 1.3GB | 4GB | Very Fast | Good | Development/Testing |
| llama3.2 | 2GB | 8GB | Fast | Very Good | Production (Recommended) |
| mistral | 4GB | 16GB | Moderate | Excellent | High-Quality Analysis |
| llama3.1 | 4.7GB | 16GB | Moderate | Excellent | Complex Reasoning |

## Performance Optimization

### 1. Keep Model Loaded
The first request after starting Ollama will be slow (model loading). Subsequent requests are much faster.

### 2. Use GPU Acceleration (if available)
Ollama automatically uses GPU if available. Check with:
```bash
ollama ps
```

### 3. Adjust Token Limits
Lower token limits = faster responses:
```bash
export AI_MAX_TOKENS=500  # Instead of 1000
```

### 4. Tune Temperature
Lower temperature = more consistent, faster responses:
```bash
export AI_TEMPERATURE=0.3  # Instead of 0.7
```

## Production Deployment

### Using systemd (Linux)

Create `/etc/systemd/system/ollama.service`:

```ini
[Unit]
Description=Ollama Local LLM Service
After=network.target

[Service]
Type=simple
User=your-user
ExecStart=/usr/local/bin/ollama serve
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable ollama
sudo systemctl start ollama
sudo systemctl status ollama
```

### Using Docker

```dockerfile
# In your backend Dockerfile
FROM ollama/ollama:latest as ollama

FROM node:18
COPY --from=ollama /bin/ollama /usr/local/bin/ollama

# Pull model during build
RUN ollama pull llama3.2

# Start both Ollama and your app
CMD ollama serve & npm start
```

### Health Checks

Add to your monitoring:
```bash
# Check Ollama is responding
curl -f http://localhost:11434/api/tags || exit 1

# Check model is loaded
curl -f http://localhost:11434/api/show -d '{"name":"llama3.2"}' || exit 1
```

## Security Considerations

### 1. Network Access
By default, Ollama listens on localhost only. To expose on network:
```bash
OLLAMA_HOST=0.0.0.0 ollama serve
```

**Warning:** Only do this behind a firewall!

### 2. Resource Limits
Set memory limits to prevent OOM:
```bash
# In systemd service
MemoryMax=8G
MemoryHigh=7G
```

### 3. Model Verification
Ollama verifies model checksums automatically. Always use official models:
```bash
ollama pull llama3.2  # Official
```

## Advanced Features

### Custom Model Parameters

Fine-tune model behavior in your backend code:

```typescript
const response = await axios.post(`${this.ollamaUrl}/api/chat`, {
  model: this.model,
  messages,
  stream: false,
  options: {
    temperature: 0.7,      // Creativity (0.0-1.0)
    top_p: 0.9,           // Nucleus sampling
    top_k: 40,            // Top-k sampling
    repeat_penalty: 1.1,  // Penalize repetition
    num_predict: 1000,    // Max tokens
  }
});
```

### Streaming Responses (Future Enhancement)

```typescript
// Enable streaming for real-time responses
const response = await axios.post(`${this.ollamaUrl}/api/chat`, {
  model: this.model,
  messages,
  stream: true  // Enable streaming
});
```

## Monitoring

### Check Ollama Status
```bash
# List running models
ollama ps

# View logs
journalctl -u ollama -f  # systemd
tail -f /var/log/ollama.log  # manual
```

### Performance Metrics
```bash
# Monitor resource usage
htop

# Check model load time
time ollama run llama3.2 "test"
```

## Migration from OpenAI

If you previously used OpenAI:

1. **No code changes needed** - The interface is the same
2. **Remove API key** from `.env`
3. **Install Ollama** and pull a model
4. **Update environment variables** to use Ollama
5. **Restart backend server**

Cost savings: ~$300/month → $0/month for 100 users!

## FAQ

**Q: Can I use multiple models?**
A: Yes! Change `OLLAMA_MODEL` environment variable and restart the server.

**Q: Does it work offline?**
A: Yes! Once models are downloaded, no internet connection is needed.

**Q: Can I use my own fine-tuned models?**
A: Yes! See [Ollama Model Import Guide](https://github.com/ollama/ollama/blob/main/docs/import.md)

**Q: How do I update Ollama?**
A: Run the install script again: `curl -fsSL https://ollama.com/install.sh | sh`

**Q: Can I run this on a server?**
A: Yes! Use systemd or Docker as shown in Production Deployment section.

## Resources

- **Ollama Website**: https://ollama.com
- **Ollama GitHub**: https://github.com/ollama/ollama
- **Model Library**: https://ollama.com/library
- **API Documentation**: https://github.com/ollama/ollama/blob/main/docs/api.md

## Support

If you encounter issues:

1. Check this guide's Troubleshooting section
2. Run `node test-ollama.js` for diagnostics
3. Check Ollama logs: `journalctl -u ollama -f`
4. Visit Ollama Discord: https://discord.gg/ollama
5. Check RabbitHole backend logs for detailed errors

---

**Last Updated**: 2025-10-09
**Ollama Version**: 0.x.x
**Recommended Model**: llama3.2
