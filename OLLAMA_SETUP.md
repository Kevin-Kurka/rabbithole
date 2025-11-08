# Ollama Setup Guide for AI-Guided Formal Inquiry

This guide explains how to set up Ollama for local AI-powered fact-checking, counter-argument generation, and formal inquiry facilitation.

## Why Ollama?

- **100% FREE** - No API costs, no subscriptions
- **100% PRIVATE** - Your data never leaves your machine
- **FAST** - Runs locally with GPU acceleration
- **OPEN SOURCE** - Models like llama3.2, mistral, phi

## Installation

### 1. Install Ollama

**macOS/Linux:**
```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

**Windows:**
Download from https://ollama.ai/download

**Docker:**
```bash
docker run -d -p 11434:11434 --name ollama ollama/ollama
```

### 2. Pull the Model

```bash
# Pull llama3.2 (default, recommended - 2GB)
ollama pull llama3.2

# Alternative models:
# ollama pull mistral        # 4.1GB - Better reasoning
# ollama pull phi3          # 2.3GB - Microsoft's model
# ollama pull llama3.1:8b   # 4.7GB - More powerful
```

### 3. Start Ollama Server

```bash
ollama serve
```

**Verify it's running:**
```bash
curl http://localhost:11434/api/tags
```

You should see a JSON response with available models.

## Configuration

### Backend (.env)

Update your `backend/.env` file:

```bash
# Ollama Configuration
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2

# AI Settings
AI_TEMPERATURE=0.7
AI_MAX_TOKENS=1000
```

### Docker Environment

If running in Docker, Ollama must be accessible from the Docker network:

**Option 1: Run Ollama on host**
```bash
# In docker-compose.yml, add to api service:
extra_hosts:
  - "host.docker.internal:host-gateway"

# In backend/.env:
OLLAMA_URL=http://host.docker.internal:11434
```

**Option 2: Run Ollama in Docker**
```bash
# Add to docker-compose.yml:
ollama:
  image: ollama/ollama
  ports:
    - "11434:11434"
  volumes:
    - ollama-data:/root/.ollama

# In backend/.env:
OLLAMA_URL=http://ollama:11434
```

## Testing AI Features

### 1. Start All Services

```bash
# Start Ollama
ollama serve

# In separate terminal, start app
docker-compose up --build
```

### 2. Test AI Fact-Checking

**Via GraphQL Playground** (http://localhost:4000/graphql):

```graphql
mutation TestFactCheck {
  factCheckClaim(input: {
    claim: "The Earth is flat"
    userId: "test-user"
  }) {
    verdict
    confidence
    analysis
    recommendations
    supportingEvidence {
      nodeId
      content
      credibilityScore
    }
    contradictingEvidence {
      nodeId
      content
      credibilityScore
    }
  }
}
```

**Expected Response:**
```json
{
  "data": {
    "factCheckClaim": {
      "verdict": "contradicted",
      "confidence": 0.95,
      "analysis": "This claim is contradicted by overwhelming scientific evidence...",
      "recommendations": [
        "Review evidence from satellite imagery",
        "Consult peer-reviewed studies on Earth's shape"
      ],
      "supportingEvidence": [],
      "contradictingEvidence": [...]
    }
  }
}
```

### 3. Test Counter-Argument Generation

First create a challenge, then:

```graphql
query TestCounterArgs {
  generateCounterArguments(
    challengeId: "your-challenge-id"
    userId: "test-user"
  ) {
    argument
    reasoning
    evidenceNeeded
    strength
  }
}
```

### 4. Test Evidence Discovery

```graphql
query TestEvidence {
  discoverEvidence(
    challengeId: "your-challenge-id"
    side: "challenger"
    userId: "test-user"
  ) {
    type
    source
    description
    relevance
    expectedImpact
  }
}
```

### 5. Test Process Guidance

```graphql
query TestGuidance {
  getChallengeGuidance(
    challengeId: "your-challenge-id"
    userId: "test-user"
  ) {
    currentStage
    nextSteps {
      action
      description
      priority
      estimatedTime
    }
    warnings
    suggestions
    readinessForResolution {
      ready
      reasoning
      missingElements
    }
  }
}
```

## Frontend Testing

### 1. Create Challenge with AI

1. Navigate to http://localhost:3001
2. Open any article/node
3. Click "Create Challenge"
4. Enter a claim (e.g., "This article contains outdated information")
5. Click "Ask AI to Research This Claim"
6. Wait 2-5 seconds for AI analysis
7. Review verdict, confidence, and recommendations
8. Refine your challenge based on AI suggestions
9. Submit challenge

### 2. Monitor AI Activity

**Backend logs:**
```bash
docker logs -f rabbithole-api-1
```

**Look for:**
```
AI Assistant initialized with Ollama (llama3.2) at http://localhost:11434
Calling Ollama with messages: [...]
Received AI response: {...}
```

**Ollama logs:**
```bash
# If running Ollama natively
tail -f ~/.ollama/logs/server.log

# If running in Docker
docker logs -f ollama
```

## Troubleshooting

### Error: "Ollama is not running"

**Check if Ollama is running:**
```bash
curl http://localhost:11434/api/tags
```

**If not running:**
```bash
ollama serve
```

**If running but backend can't connect:**
- Check `OLLAMA_URL` in backend/.env
- If using Docker, verify extra_hosts or network configuration
- Try `curl http://host.docker.internal:11434/api/tags` from inside container

### Error: "Model not found"

**Pull the model:**
```bash
ollama pull llama3.2
```

**Verify model is available:**
```bash
ollama list
```

### Slow Responses

**Check GPU acceleration:**
```bash
# Should show GPU info
nvidia-smi  # For NVIDIA
rocm-smi    # For AMD
```

**Try smaller model:**
```bash
ollama pull phi3
```

Update `.env`:
```
OLLAMA_MODEL=phi3
```

### Rate Limit Reached

Default: 10 AI requests per hour per user.

**Increase limit:**
Edit `backend/src/services/AIAssistantService.ts`:
```typescript
private readonly MAX_REQUESTS_PER_HOUR = 50; // Increase to 50
```

### JSON Parsing Errors

Ollama sometimes returns text instead of JSON. The service has fallbacks:

**Check logs for:**
```
Failed to parse AI response
```

**Try different model:**
```bash
ollama pull mistral
```

Models with better instruction-following:
- `mistral` - Best JSON reliability
- `llama3.1:8b` - Better than llama3.2 for structured output

## Performance Tips

### GPU Acceleration

**NVIDIA GPU:**
```bash
# Install CUDA drivers
# Ollama will automatically use GPU
ollama run llama3.2 "test"  # Should show GPU usage
```

**AMD GPU:**
```bash
# Install ROCm
HSA_OVERRIDE_GFX_VERSION=11.0.0 ollama serve
```

**Apple Silicon (M1/M2/M3):**
Ollama automatically uses Metal acceleration - no setup needed!

### Memory Management

**Check memory usage:**
```bash
ollama ps
```

**Unload model when not in use:**
```bash
ollama stop llama3.2
```

**Set context size:**
```bash
# In docker-compose.yml or .env
OLLAMA_NUM_CTX=2048  # Default 2048, increase for longer conversations
```

## Model Recommendations

### For Fact-Checking
- **llama3.2** (2GB) - Fast, accurate, good balance
- **mistral** (4.1GB) - Better reasoning, more reliable JSON
- **llama3.1:8b** (4.7GB) - Most accurate, slower

### For Counter-Arguments
- **llama3.1:8b** (4.7GB) - Best logical reasoning
- **mistral** (4.1GB) - Good devil's advocate
- **phi3** (2.3GB) - Fast, decent quality

### For Evidence Discovery
- **llama3.2** (2GB) - Good search query generation
- **llama3.1:8b** (4.7GB) - Better research suggestions

### For Process Guidance
- **mistral** (4.1GB) - Best structured output
- **llama3.1:8b** (4.7GB) - Most comprehensive guidance

## Alternative: Using OpenAI

If you prefer using OpenAI instead of Ollama:

1. Get API key from https://platform.openai.com
2. Update `backend/.env`:
   ```bash
   OPENAI_API_KEY=sk-...
   ```
3. Modify `backend/src/services/AIAssistantService.ts`:
   - Replace `callOllama()` with OpenAI API calls
   - Use `gpt-4` or `gpt-3.5-turbo`

**Pros:**
- Better quality responses
- No local setup needed

**Cons:**
- Costs money (~$0.01-0.10 per request)
- Data sent to OpenAI servers
- Slower due to network latency

## Next Steps

1. ✅ Install Ollama
2. ✅ Pull llama3.2 model
3. ✅ Configure .env
4. ✅ Test GraphQL queries
5. ✅ Test frontend integration
6. 🚀 Create your first AI-assisted challenge!

## Support

- **Ollama Issues**: https://github.com/ollama/ollama/issues
- **Model Documentation**: https://ollama.ai/library
- **Rabbit Hole Issues**: https://github.com/Kevin-Kurka/rabbithole/issues

---

**Happy AI-Assisted Truth-Seeking!** 🐰🕳️🤖
