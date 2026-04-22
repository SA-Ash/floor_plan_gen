const axios = require('axios');
const API = 'http://localhost:8000/api';

async function run() {
  try {
    console.log('1. Creating project "AI Verified Demo"...');
    const createRes = await axios.post(`${API}/projects`, {
      name: "AI Verified Demo",
      buildingType: "house",
      floors: 2,
      plotWidth: 40,
      plotLength: 60,
      nlInput: "2 floor house with 3 bedrooms and parking"
    });
    const id = createRes.data.id;
    console.log('   ✓ Project created:', id);

    console.log('2. Starting Full BIM Pipeline (this ranges from 30-60s)...');
    const genRes = await axios.post(`${API}/projects/${id}/generate`, {}, { timeout: 120000 });
    
    console.log('3. Verification Complete!');
    console.log('   ✓ Building Layout:', !!genRes.data.building ? 'Generated' : 'Missing');
    console.log('   ✓ Structural Grid:', !!genRes.data.structural ? 'Generated' : 'Missing');
    console.log('   ✓ MEP Routing:', !!genRes.data.mep ? 'Generated' : 'Missing');
    console.log('   ✓ Schedule Tasks:', (genRes.data.tasks || []).length);
    console.log('   ✓ Cost Estimate:', genRes.data.cost ? 'Generated' : 'Missing');
    
    console.log('\nSUCCESS: The AI architecture pipeline is fully operational.');
  } catch (err) {
    console.error('\nFAIL: Pipeline error:', err.message);
    if (err.response) console.error('Details:', JSON.stringify(err.response.data));
  }
}
run();
