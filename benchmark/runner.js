require('dotenv').config();
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { v4: uuidv4 } = require('uuid');

// Import Adapters
const OpenAIAdapter = require('./providers/openai');
// const AnthropicAdapter = require('./providers/anthropic'); // Add when implemented
// const GoogleAdapter = require('./providers/google'); // Add when implemented

const adapters = [
  new OpenAIAdapter(),
  // new AnthropicAdapter(),
  // new GoogleAdapter()
];

function loadJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, relPath), 'utf8'));
}

function loadFixtures() {
  const fixturesDir = path.join(__dirname, 'fixtures');
  const files = fs.readdirSync(fixturesDir).filter(f => f.endsWith('.md'));
  
  return files.map(file => {
    const raw = fs.readFileSync(path.join(fixturesDir, file), 'utf8');
    // Simple frontmatter parsing
    const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!match) {
      throw new Error(`Invalid fixture format in ${file}`);
    }
    const meta = yaml.load(match[1]);
    const content = match[2].trim();
    return { ...meta, content, filename: file };
  });
}

function getAdapter(providerId) {
  const adapter = adapters.find(a => a.supports(providerId));
  if (!adapter) return null;
  return adapter;
}

function calculateCost(inputTokens, outputTokens, modelConfig) {
  if (inputTokens == null || outputTokens == null) return null;
  return (inputTokens / 1000000 * modelConfig.input_price_per_m) + 
         (outputTokens / 1000000 * modelConfig.output_price_per_m);
}

async function run() {
  console.log("Starting ReadMind Provider-Neutral Benchmark Harness...\n");

  const models = loadJson('config/models.json');
  const actions = loadJson('config/actions.json');
  const fixtures = loadFixtures();

  // Create randomized candidate IDs for blind evaluation
  const candidateMap = {};
  const reversedCandidateMap = {};
  models.forEach((m, idx) => {
    const candidateId = `candidate_${String(idx + 1).padStart(2, '0')}`;
    const modelStr = `${m.provider}/${m.model}`;
    candidateMap[candidateId] = m;
    reversedCandidateMap[modelStr] = candidateId;
  });

  const results = [];
  const evalRows = [];
  const runTimestamp = new Date().toISOString().replace(/[:.]/g, '');

  for (const modelConfig of models) {
    const modelStr = `${modelConfig.provider}/${modelConfig.model}`;
    const candidateId = reversedCandidateMap[modelStr];
    console.log(`\nEvaluating Model: ${modelStr} (Masked as ${candidateId})`);
    
    const adapter = getAdapter(modelConfig.provider);
    if (!adapter) {
      console.warn(`[SKIP] No adapter found for provider: ${modelConfig.provider}`);
      continue;
    }
    
    if (!adapter.hasValidCredentials()) {
      console.warn(`[SKIP] Missing API keys for provider: ${modelConfig.provider}`);
      continue;
    }

    for (const action of actions) {
      for (const fixture of fixtures) {
        console.log(`  -> Action: ${action.id} | Fixture: ${fixture.id}`);
        const runId = uuidv4();
        
        let inputTokens = null;
        let outputTokens = null;
        let success = false;
        let errorMsg = null;
        let generatedText = null;
        let ttftMs = null;
        let totalLatencyMs = null;

        try {
          // Explicit token counting without arbitrary fallback
          try {
            const systemTokens = await adapter.countTokens(action.system_prompt, modelConfig.model);
            const contentTokens = await adapter.countTokens(fixture.content, modelConfig.model);
            if (systemTokens !== null && contentTokens !== null) {
              inputTokens = systemTokens + contentTokens;
            } else {
              console.warn(`    [WARN] Token counting unavailable for model ${modelConfig.model}. Cost estimation will be null.`);
            }
          } catch (e) {
             console.warn(`    [WARN] Token counting failed for ${modelConfig.model}: ${e.message}`);
          }

          // Execute Stream (Dry run fallback handled by adapter if keys missing)
          const res = await adapter.generateStream(action.system_prompt, fixture.content, modelConfig.model);
          
          generatedText = res.generatedText;
          ttftMs = res.ttftMs;
          totalLatencyMs = res.totalLatencyMs;
          
          if (res.inputTokens !== null) inputTokens = res.inputTokens; 
          if (res.outputTokens !== null) outputTokens = res.outputTokens;
          
          success = true;
        } catch (err) {
          success = false;
          errorMsg = err.message;
          console.error(`    [ERROR] ${err.message}`);
        }

        const estimatedCost = calculateCost(inputTokens, outputTokens, modelConfig);

        results.push({
          run_id: runId,
          provider: modelConfig.provider,
          model: modelConfig.model,
          action: action.id,
          fixture: fixture.id,
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          time_to_first_token_ms: ttftMs,
          total_latency_ms: totalLatencyMs,
          estimated_cost_usd: estimatedCost,
          success,
          error: errorMsg,
          generated_text: generatedText,
          // Snapshot pricing to keep historical data immutable
          pricing_snapshot: { ...modelConfig }
        });

        // Add to human blind-eval sheet
        evalRows.push({
          run_id: runId,
          candidate_id: candidateId,
          action: action.id,
          fixture: fixture.id,
          instruction_following_1_5: '',
          content_preservation_1_5: '',
          markdown_preservation_1_5: '',
          writing_quality_1_5: '',
          usefulness_1_5: '',
          notes: ''
        });
      }
    }
  }

  // Write Results
  const resultsDir = path.join(__dirname, 'results');
  if (!fs.existsSync(resultsDir)) fs.mkdirSync(resultsDir);

  const resultsFile = path.join(resultsDir, `run_${runTimestamp}.json`);
  fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));

  // Write Eval CSV
  const csvFile = path.join(resultsDir, `eval_${runTimestamp}.csv`);
  const csvHeader = 'run_id,candidate_id,action,fixture,instruction_following_1_5,content_preservation_1_5,markdown_preservation_1_5,writing_quality_1_5,usefulness_1_5,notes\n';
  const csvBody = evalRows.map(r => `${r.run_id},${r.candidate_id},${r.action},${r.fixture},,,,,,`).join('\n');
  fs.writeFileSync(csvFile, csvHeader + csvBody);

  // Write Mapping JSON (Keep this secret until scoring is done)
  const mapFile = path.join(resultsDir, `mapping_${runTimestamp}.json`);
  fs.writeFileSync(mapFile, JSON.stringify(candidateMap, null, 2));

  console.log(`\nBenchmark Complete!`);
  console.log(`Results saved to: ${resultsFile}`);
  console.log(`Eval CSV saved to: ${csvFile}`);
  console.log(`Identity Mapping saved to: ${mapFile}`);
}

run().catch(console.error);
