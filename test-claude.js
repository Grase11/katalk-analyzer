const Anthropic = require('@anthropic-ai/sdk');
const apiKey = process.env.ANTHROPIC_API_KEY || require('./ecosystem.config.js').apps[0].env.ANTHROPIC_API_KEY;
console.log('API Key prefix:', apiKey ? apiKey.substring(0, 15) + '...' : 'NOT SET');

const client = new Anthropic({ apiKey });
client.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 50,
  messages: [{ role: 'user', content: 'Say hi in Korean, one word only' }]
}).then(r => {
  console.log('SUCCESS:', JSON.stringify(r.content));
}).catch(e => {
  console.log('ERROR TYPE:', e.constructor.name);
  console.log('ERROR STATUS:', e.status);
  console.log('ERROR MESSAGE:', e.message);
  console.log('ERROR FULL:', JSON.stringify(e, null, 2));
});
