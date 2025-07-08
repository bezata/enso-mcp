interface AIResponse {
  answer: string;
  confidence?: number;
  sources?: string[];
}

export class AIService {
  private apiKey: string | undefined;
  private apiEndpoint: string;
  private model: string;
  private maxRetries: number;
  private retryDelay: number;

  constructor() {
    this.apiKey = Bun.env.AI_API_KEY || process.env.AI_API_KEY;
    this.apiEndpoint = Bun.env.AI_ENDPOINT || process.env.AI_ENDPOINT || 'https://api.openai.com/v1/chat/completions';
    this.model = Bun.env.AI_MODEL || process.env.AI_MODEL || 'gpt-4o';
    this.maxRetries = 3;
    this.retryDelay = 1000;
  }

  async askQuestion(question: string, context: string = ''): Promise<string> {
    if (!this.apiKey) {
      throw new Error('AI_API_KEY not configured. Please set the environment variable.');
    }

    const systemPrompt = `You are an expert assistant for Enso documentation. 
You help developers understand and use Enso effectively. 
Your responses should be accurate, helpful, and based on the provided documentation context when available.
If you're unsure about something, acknowledge it and suggest where to find more information.`;

    const userPrompt = context 
      ? `Based on the following documentation context:\n\n${context}\n\nQuestion: ${question}`
      : question;

    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const response = await this.callAIEndpoint(systemPrompt, userPrompt);
        return response.answer;
      } catch (error) {
        lastError = error as Error;
        
        if (lastError.message.includes('401') || lastError.message.includes('403')) {
          throw lastError;
        }
        
        if (attempt < this.maxRetries - 1) {
          await this.sleep(this.retryDelay * (attempt + 1));
        }
      }
    }

    throw lastError || new Error('Failed to get AI response');
  }

  private async callAIEndpoint(systemPrompt: string, userPrompt: string): Promise<AIResponse> {
    const response = await fetch(this.apiEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 1000,
        top_p: 0.9,
        frequency_penalty: 0.0,
        presence_penalty: 0.0
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI API error (${response.status}): ${errorText}`);
    }

    const data = await response.json() as any;

    if (data.choices && data.choices[0]?.message?.content) {
      return {
        answer: data.choices[0].message.content,
        confidence: 1.0
      };
    } else if (data.response) {
      return {
        answer: data.response,
        confidence: data.confidence || 1.0
      };
    } else {
      throw new Error('Unexpected AI API response format');
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async validateConfiguration(): Promise<boolean> {
    if (!this.apiKey) {
      console.error('AI_API_KEY not set');
      return false;
    }

    try {
      const response = await this.askQuestion('test', '');
      return true;
    } catch (error) {
      console.error('AI API validation failed:', error);
      return false;
    }
  }
}