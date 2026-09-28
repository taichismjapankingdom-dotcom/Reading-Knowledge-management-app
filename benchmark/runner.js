require('dotenv').config();
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { v4: uuidv4 } = require('uuid');

// CLI Arguments
const args = process.argv.slice(2);
const actionArgIndex = args.indexOf('--action');
const targetAction = actionArgIndex > -1 ? args[actionArgIndex + 1] : null;

// Import Adapters
const OpenAIAdapter = require('./providers/openai');

const adapters = [
  new OpenAIAdapter(),
];

function loadJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, relPath), 'utf8'));
}

function loadFixtures() {
  const fixturesDir = path.join(__dirname, 'fixtures');
  const files = fs.readdirSync(fixturesDir);
  
  return files.map(file => {
    const raw = fs.readFileSync(path.join(fixturesDir, file), 'utf8');
    if (file.endsWith('.json')) {
      return { ...JSON.parse(raw), filename: file };
    } else if (file.endsWith('.md')) {
      const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
      if (!match) {
        console.warn(`[WARN] Invalid fixture format in ${file}`);
        return null;
      }
      const meta = yaml.load(match[1]);
      const content = match[2].trim();
      return { ...meta, content, filename: file };
    }
    return null;
  }).filter(Boolean);
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

function getEvalColumns(actionId, fixtureType) {
  const allCols = [
    'instruction_following_1_5', 'content_preservation_1_5', 'markdown_preservation_1_5',
    'writing_quality_1_5', 'usefulness_1_5', 'groundedness_1_5', 'factual_faithfulness_1_5',
    'citation_correctness_1_5', 'naturalness_1_5', 'clarity_1_5', 'semantic_consistency_1_5',
    'context_retention_1_5'
  ];
  
  let activeCols = [];
  if (['summarize', 'extract_concepts', 'improve_writing', 'organize_notes'].includes(actionId)) {
    activeCols = ['instruction_following_1_5', 'content_preservation_1_5', 'markdown_preservation_1_5', 'writing_quality_1_5', 'usefulness_1_5'];
  } else if (actionId === 'definition_explanation') {
    activeCols = ['factual_faithfulness_1_5', 'semantic_consistency_1_5', 'naturalness_1_5', 'clarity_1_5'];
  } else if (actionId === 'example_generation') {
    activeCols = ['naturalness_1_5', 'semantic_consistency_1_5', 'writing_quality_1_5', 'usefulness_1_5'];
  } else if (actionId === 'grounded_qa') {
    activeCols = ['groundedness_1_5', 'factual_faithfulness_1_5', 'citation_correctness_1_5', 'usefulness_1_5'];
  } else if (actionId === 'conversation') {
    activeCols = ['instruction_following_1_5', 'context_retention_1_5', 'naturalness_1_5', 'usefulness_1_5'];
    if (fixtureType === 'grounded') {
      activeCols.push('groundedness_1_5', 'citation_correctness_1_5');
    }
  }

  return allCols.map(c => activeCols.includes(c) ? '' : 'N/A');
}

async function run() {
  console.log("Starting ReadMind Provider-Neutral Benchmark Harness...\n");
  if (targetAction) console.log(`[FILTER] Running only action: ${targetAction}\n`);

  const models = loadJson('config/models.json');
  let actions = loadJson('config/actions.json');
  
  if (targetAction) {
    actions = actions.filter(a => a.id === targetAction);
    if (actions.length === 0) {
      console.error(`Error: Action '${targetAction}' not found in actions.json`);
      process.exit(1);
    }
  }

  const fixtures = loadFixtures();

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
        if (!action.supported_types.includes(fixture.type)) continue;

        console.log(`  -> Action: ${action.id} | Fixture: ${fixture.id}`);
        const runId = uuidv4();
        
        let inputTokens = null;
        let outputTokens = null;
        let success = false;
        let errorMsg = null;
        let generatedText = '';
        let ttftMs = null;
        let totalLatencyMs = 0;
        let estimatedCost = 0;
        const perTurnMetrics = [];

        try {
          if (fixture.type === 'conversation') {
            const history = [];
            let aggInput = 0, aggOutput = 0, aggLatency = 0, aggCost = 0;
            
            for (let i = 0; i < fixture.turns.length; i++) {
              const turn = fixture.turns[i];
              history.push({ role: 'user', content: turn.user });
              
              let systemPrompt = action.system_prompt;
              if (fixture.knowledge_context) {
                // Ensure expected_citations are stripped out
                const safeContext = fixture.knowledge_context.map(k => ({ id: k.id, text: k.text }));
                systemPrompt += "\n\nKnowledge Context:\n" + JSON.stringify(safeContext, null, 2);
              }

              let currentInputTokens = null, currentOutputTokens = null;
              try {
                 const turnTokens = await adapter.countTokens(JSON.stringify(history), modelConfig.model);
                 if (turnTokens !== null) currentInputTokens = turnTokens;
              } catch (e) {
                 if (i===0) console.warn(`    [WARN] Token counting unavailable/failed for model ${modelConfig.model}.`);
              }

              const res = await adapter.generateStream(systemPrompt, history, modelConfig.model);
              history.push({ role: 'assistant', content: res.generatedText });
              
              if (res.inputTokens !== null) currentInputTokens = res.inputTokens; 
              if (res.outputTokens !== null) currentOutputTokens = res.outputTokens;
              
              if (i === 0) ttftMs = res.ttftMs;
              
              const turnCost = calculateCost(currentInputTokens, currentOutputTokens, modelConfig) || 0;
              
              aggInput += currentInputTokens || 0;
              aggOutput += currentOutputTokens || 0;
              aggLatency += res.totalLatencyMs || 0;
              aggCost += turnCost;
              
              perTurnMetrics.push({
                turn: i + 1,
                inputTokens: currentInputTokens,
                outputTokens: currentOutputTokens,
                ttftMs: res.ttftMs,
                totalLatencyMs: res.totalLatencyMs,
                estimatedCost: turnCost
              });

              generatedText += `[User]: ${turn.user}\n[AI]: ${res.generatedText}\n\n`;
            }
            
            inputTokens = aggInput;
            outputTokens = aggOutput;
            totalLatencyMs = aggLatency;
            estimatedCost = aggCost;

          } else {
            // Standard single-turn execution. Remove expected_citations to prevent leaking to model.
            const safeFixture = { ...fixture };
            delete safeFixture.expected_citations;
            delete safeFixture.filename;
            
            const payload = fixture.content ? fixture.content : JSON.stringify(safeFixture, null, 2);
            
            try {
              const sysTokens = await adapter.countTokens(action.system_prompt, modelConfig.model);
              const conTokens = await adapter.countTokens(payload, modelConfig.model);
              if (sysTokens !== null && conTokens !== null) {
                inputTokens = sysTokens + conTokens;
              } else {
                console.warn(`    [WARN] Token counting unavailable for model ${modelConfig.model}. Cost estimation will be null.`);
              }
            } catch (e) {
               console.warn(`    [WARN] Token counting failed for ${modelConfig.model}: ${e.message}`);
            }

            const res = await adapter.generateStream(action.system_prompt, payload, modelConfig.model);
            
            generatedText = res.generatedText;
            ttftMs = res.ttftMs;
            totalLatencyMs = res.totalLatencyMs;
            
            if (res.inputTokens !== null) inputTokens = res.inputTokens; 
            if (res.outputTokens !== null) outputTokens = res.outputTokens;
            
            estimatedCost = calculateCost(inputTokens, outputTokens, modelConfig) || 0;
          }
          
          success = true;
        } catch (err) {
          success = false;
          errorMsg = err.message;
          console.error(`    [ERROR] ${err.message}`);
        }

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
          per_turn_metrics: perTurnMetrics.length > 0 ? perTurnMetrics : undefined,
          success,
          error: errorMsg,
          generated_text: generatedText,
          pricing_snapshot: { ...modelConfig }
        });

        const isGroundedConv = fixture.type === 'conversation' && !!fixture.knowledge_context;
        const evalCols = getEvalColumns(action.id, isGroundedConv ? 'grounded' : 'standard');
        
        evalRows.push([
          runId, candidateId, action.id, fixture.id, ...evalCols, '' 
        ].join(','));
      }
    }
  }

  const resultsDir = path.join(__dirname, 'results');
  if (!fs.existsSync(resultsDir)) fs.mkdirSync(resultsDir);

  const resultsFile = path.join(resultsDir, `run_${runTimestamp}.json`);
  fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));

  const csvFile = path.join(resultsDir, `eval_${runTimestamp}.csv`);
  const csvHeader = 'run_id,candidate_id,action,fixture,instruction_following_1_5,content_preservation_1_5,markdown_preservation_1_5,writing_quality_1_5,usefulness_1_5,groundedness_1_5,factual_faithfulness_1_5,citation_correctness_1_5,naturalness_1_5,clarity_1_5,semantic_consistency_1_5,context_retention_1_5,notes\n';
  fs.writeFileSync(csvFile, csvHeader + evalRows.join('\n'));

  const mapFile = path.join(resultsDir, `mapping_${runTimestamp}.json`);
  fs.writeFileSync(mapFile, JSON.stringify(candidateMap, null, 2));

  console.log(`\nBenchmark Complete!`);
  console.log(`Results saved to: ${resultsFile}`);
  console.log(`Eval CSV saved to: ${csvFile}`);
  console.log(`Identity Mapping saved to: ${mapFile}`);
}

run().catch(console.error);
