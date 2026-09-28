/**
 * Base Provider Adapter Interface
 * All AI provider implementations must extend this class to be testable.
 */
class BaseProviderAdapter {
  constructor() {
    this.name = 'BaseProvider';
  }

  /**
   * Returns true if this adapter supports the given provider ID (e.g. 'openai')
   */
  supports(providerId) {
    return false;
  }

  /**
   * Evaluates if the API keys are present in process.env.
   * If false, the runner will gracefully skip models relying on this provider.
   */
  hasValidCredentials() {
    return false;
  }

  /**
   * Precisely count tokens using the provider's native tokenizer (e.g., tiktoken)
   * or API endpoint.
   * Do NOT use generic chars/4 approximations.
   * Return null if token counting is unavailable for this model.
   * 
   * @param {string} text 
   * @param {string} modelId 
   * @returns {Promise<number|null>}
   */
  async countTokens(text, modelId) {
    throw new Error('countTokens not implemented');
  }

  /**
   * Execute the generation request and record latency.
   * @param {string} systemPrompt 
   * @param {string|Array<{role: string, content: string}>} userContent - String for normal tasks, Array for conversations
   * @param {string} modelId 
   * @returns {Promise<{ generatedText: string, ttftMs: number, totalLatencyMs: number, inputTokens: number|null, outputTokens: number|null }>}
   */
  async generateStream(systemPrompt, userContent, modelId) {
    throw new Error('generateStream not implemented');
  }
}

module.exports = BaseProviderAdapter;
