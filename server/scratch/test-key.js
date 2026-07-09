const apiKey = "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";
fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
  },
  body: JSON.stringify({
    model: 'meta/llama-3.1-8b-instruct',
    messages: [
      { role: 'user', content: 'hello' }
    ],
  }),
})
.then(async res => {
  console.log('Status:', res.status);
  console.log('Body:', await res.text());
})
.catch(err => console.error(err));
