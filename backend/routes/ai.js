const { Router } = require('express');
const store = require('../store');

const router = Router();

// POST /ai/parse-requirements — NLP text → structured constraints
router.post('/parse-requirements', async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'text field is required' });

  // Simulate AI processing time
  await new Promise(r => setTimeout(r, 1500));

  // Parse with regex (mirrors Python building_nlp.py logic)
  const result = {
    plotWidth: 40, plotLength: 60, floors: 1,
    rooms: { bedroom: 2, bathroom: 1, kitchen: 1, living: 1, dining: 0 },
    features: [],
    style: 'modern',
    warnings: []
  };

  // Dimension parsing
  const dimMatch = text.match(/(\d+)\s*[x×by]+\s*(\d+)/i);
  if (dimMatch) {
    result.plotWidth = parseInt(dimMatch[1]);
    result.plotLength = parseInt(dimMatch[2]);
  }

  // Floor parsing
  const floorMatch = text.match(/(\d+)\s*(?:floor|storey|story)/i) || text.match(/G\+(\d+)/i);
  if (floorMatch) result.floors = parseInt(floorMatch[1]);
  if (text.match(/G\+(\d+)/i)) result.floors = parseInt(text.match(/G\+(\d+)/i)[1]) + 1;
  if (/double|two/i.test(text) && /floor|storey/i.test(text)) result.floors = 2;
  if (/triple|three/i.test(text) && /floor|storey/i.test(text)) result.floors = 3;

  // Room parsing
  const bedMatch = text.match(/(\d+)\s*(?:bed(?:room)?s?|bhk)/i);
  if (bedMatch) result.rooms.bedroom = parseInt(bedMatch[1]);
  if (/3\s*bhk/i.test(text)) { result.rooms.bedroom = 3; result.rooms.bathroom = 2; }
  if (/2\s*bhk/i.test(text)) { result.rooms.bedroom = 2; result.rooms.bathroom = 1; }
  if (/4\s*bhk/i.test(text)) { result.rooms.bedroom = 4; result.rooms.bathroom = 3; }

  const bathMatch = text.match(/(\d+)\s*(?:bath(?:room)?s?|toilet)/i);
  if (bathMatch) result.rooms.bathroom = parseInt(bathMatch[1]);

  if (/kitchen/i.test(text)) result.rooms.kitchen = 1;
  if (/living/i.test(text)) result.rooms.living = 1;
  if (/dining/i.test(text)) result.rooms.dining = 1;
  if (/study|office/i.test(text)) result.rooms.study = 1;

  // Feature parsing
  if (/parking|garage/i.test(text)) result.features.push('parking');
  if (/garden|lawn/i.test(text)) result.features.push('garden');
  if (/pool|swimming/i.test(text)) result.features.push('pool');
  if (/elevator|lift/i.test(text)) result.features.push('elevator');
  if (/balcony/i.test(text)) result.features.push('balcony');
  if (/terrace/i.test(text)) result.features.push('terrace');
  if (/basement/i.test(text)) result.features.push('basement');
  if (/solar/i.test(text)) result.features.push('solar');

  // Style
  if (/modern/i.test(text)) result.style = 'modern';
  if (/contemporary/i.test(text)) result.style = 'contemporary';
  if (/colonial/i.test(text)) result.style = 'colonial';
  if (/villa/i.test(text)) result.style = 'villa';
  if (/bungalow/i.test(text)) result.style = 'bungalow';

  // Budget
  const budgetMatch = text.match(/(?:budget|cost)\s*(?:of|is)?\s*(?:₹|rs\.?|inr)?\s*(\d+)\s*(lakh|lac|l|crore|cr|k|million)?/i);
  if (budgetMatch) {
    let amt = parseInt(budgetMatch[1]);
    const unit = (budgetMatch[2] || '').toLowerCase();
    if (unit.startsWith('l') || unit === 'lac') amt *= 100000;
    else if (unit.startsWith('cr')) amt *= 10000000;
    else if (unit === 'k') amt *= 1000;
    else if (unit === 'million') amt *= 1000000;
    result.budget = amt;
  }

  // Validation warnings
  if (result.floors > 4 && !result.features.includes('elevator')) {
    result.warnings.push('Multi-floor building (>4) without elevator');
  }
  if (result.rooms.bathroom > result.rooms.bedroom * 2) {
    result.warnings.push('High bathroom-to-bedroom ratio');
  }

  res.json(result);
});

// GET /ai/floor-plan/status/:jobId
router.get('/floor-plan/status/:jobId', (req, res) => {
  res.json({ jobId: req.params.jobId, status: 'completed', progress: 100 });
});

// GET /ai/structural/:projectId
router.get('/structural/:projectId', (req, res) => {
  const project = store.getProject(req.params.projectId);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  res.json(project.structural || { columns: [], beams: [], slabs: [] });
});

// GET /ai/mep/:projectId
router.get('/mep/:projectId', (req, res) => {
  const project = store.getProject(req.params.projectId);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  res.json(project.mep || { plumbingRoutes: [], electricalRoutes: [], rooms: [], columns: [] });
});

// POST /ai/predict-cost/:projectId
router.post('/predict-cost/:projectId', async (req, res) => {
  const project = store.getProject(req.params.projectId);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  await new Promise(r => setTimeout(r, 800));

  // Calculate cost from inputs
  const { builtUpArea, rooms, qualityGrade, location } = req.body;
  const area = builtUpArea || (project.plotWidth * project.plotLength);
  const gradeMultiplier = { standard: 1.0, premium: 1.35, luxury: 1.8 }[qualityGrade || 'standard'] || 1.0;
  const locationMultiplier = { metro: 1.3, urban: 1.0, suburban: 0.8, rural: 0.6 }[location || 'urban'] || 1.0;
  const baseRate = 1800; // ₹/sqft

  const totalCost = Math.round(area * baseRate * gradeMultiplier * locationMultiplier);
  const materialCost = Math.round(totalCost * 0.55);
  const laborCost = Math.round(totalCost * 0.30);
  const mepCost = Math.round(totalCost * 0.15);

  const costData = {
    materialCost, laborCost, mepCost,
    totalBudget: totalCost,
    costPerSqFt: Math.round(totalCost / Math.max(area, 1)),
    areaStr: `${area} sq ft`,
    phases: project.cost?.phases || [
      { phase: 'Foundation', material: (materialCost * 0.15 / 100000).toFixed(1), labor: (laborCost * 0.2 / 100000).toFixed(1) },
      { phase: 'Structure', material: (materialCost * 0.3 / 100000).toFixed(1), labor: (laborCost * 0.35 / 100000).toFixed(1) },
      { phase: 'Masonry', material: (materialCost * 0.15 / 100000).toFixed(1), labor: (laborCost * 0.15 / 100000).toFixed(1) },
      { phase: 'MEP', material: (materialCost * 0.2 / 100000).toFixed(1), labor: (laborCost * 0.18 / 100000).toFixed(1) },
      { phase: 'Finishing', material: (materialCost * 0.2 / 100000).toFixed(1), labor: (laborCost * 0.12 / 100000).toFixed(1) },
    ],
    monthly: project.cost?.monthly || []
  };

  project.cost = costData;
  project.pipelineStatus.cost = 'done';
  store.updateProject(project.id, project);

  res.json(costData);
});

// GET /ai/worker-tasks/:projectId
router.get('/worker-tasks/:projectId', (req, res) => {
  const project = store.getProject(req.params.projectId);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  res.json(project.workerGuidance || []);
});

// PUT /ai/worker-tasks/:projectId/step/:stepId
router.put('/worker-tasks/:projectId/step/:stepId', (req, res) => {
  const project = store.getProject(req.params.projectId);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const { done } = req.body;
  for (const phase of (project.workerGuidance || [])) {
    const step = phase.steps.find(s => s.id === req.params.stepId);
    if (step) {
      step.done = done;
      // Recalculate phase progress
      const total = phase.steps.length;
      const completed = phase.steps.filter(s => s.done).length;
      phase.progress = Math.round((completed / total) * 100);
      phase.status = completed === total ? 'completed' : completed > 0 ? 'in_progress' : 'pending';
      // Clear 'current' flags
      phase.steps.forEach(s => { s.current = false; });
      const nextPending = phase.steps.find(s => !s.done);
      if (nextPending) nextPending.current = true;
      break;
    }
  }

  store.updateProject(project.id, project);
  res.json(project.workerGuidance);
});

module.exports = router;
