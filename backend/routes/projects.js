const { Router } = require('express');
const { v4: uuidv4 } = require('uuid');
const store = require('../store');
const { broadcastToAll } = require('../ws');
const axios = require('axios');
const config = require('../config');

const router = Router();

// GET /projects
router.get('/', (req, res) => {
  const { status, type, sort } = req.query;
  const projects = store.getProjects({ status, type, sort });
  const summaries = projects.map(p => ({
    id: p.id, name: p.name, description: p.description,
    buildingType: p.buildingType, status: p.status, progress: p.progress,
    plotWidth: p.plotWidth, plotLength: p.plotLength, floors: p.floors,
    budget: p.budget, rooms: p.rooms, features: p.features,
    pipelineStatus: p.pipelineStatus,
    createdAt: p.createdAt, updatedAt: p.updatedAt,
  }));
  res.json(summaries);
});

// GET /projects/:id  — returns FULL project with all BIM data
router.get('/:id', (req, res) => {
  const project = store.getProject(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  res.json(project);
});

// POST /projects — create a new project shell
router.post('/', (req, res) => {
  const { name, description, buildingType, plotWidth, plotLength, floors, budget, rooms, features, nlInput } = req.body;
  const project = {
    id: 'proj-' + uuidv4().slice(0, 8),
    name: name || 'Untitled Project',
    description: description || '',
    buildingType: buildingType || 'house',
    plotWidth: plotWidth || 40,
    plotLength: plotLength || 60,
    floors: floors || 1,
    budget: budget || 0,
    rooms: rooms || { bedroom: 2, bathroom: 1, kitchen: 1, living: 1 },
    features: features || [],
    nlInput: nlInput || '',
    status: 'created',
    progress: 5,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    pipelineStatus: {
      nlp: nlInput ? 'done' : 'pending',
      constraints: 'pending', floorPlan: 'pending',
      structural: 'pending', mep: 'pending', tasks: 'pending',
      schedule: 'pending', cost: 'pending'
    },
    building: null, structural: null, mep: null,
    tasks: [], schedule: null, cost: null, workerGuidance: []
  };

  store.createProject(project);
  broadcastToAll({ type: 'project_created', payload: { id: project.id, name: project.name } });
  console.log(`[PROJECT] Created: ${project.id} — "${project.name}"`);
  res.status(201).json(project);
});

// PUT /projects/:id
router.put('/:id', (req, res) => {
  const updated = store.updateProject(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Project not found' });
  res.json(updated);
});

// DELETE /projects/:id
router.delete('/:id', (req, res) => {
  const existed = store.deleteProject(req.params.id);
  if (!existed) return res.status(404).json({ error: 'Project not found' });
  res.json({ success: true });
});

// ═══════════════════════════════════════════════════════════════
// POST /projects/:id/generate — Full AI pipeline
// ═══════════════════════════════════════════════════════════════
router.post('/:id/generate', async (req, res) => {
  const { id } = req.params;
  console.log(`[GENERATE] Request received for Project ID: "${id}"`);
  
  const project = store.getProject(id);
  if (!project) {
    console.error(`[GENERATE] 404 Error: Project "${id}" NOT FOUND in store. Available: ${Array.from(store.projects.keys()).join(', ')}`);
    return res.status(404).json({ error: `Project "${id}" not found in current session store` });
  }

  try {
    console.log(`\n[PIPELINE] ═══════════════════════════════════════`);
    console.log(`[PIPELINE] Starting AI generation for: ${project.id} — "${project.name}"`);

    broadcastToAll({
      type: 'pipeline_progress',
      payload: { projectId: project.id, stage: 'AI Pipeline', progress: 10, status: 'running' }
    });

    // ── Build requirement string from user input ──
    let requirement = project.nlInput;
    if (!requirement || requirement.trim().length < 3) {
      const roomStr = Object.entries(project.rooms || {})
        .filter(([_, count]) => count > 0)
        .map(([room, count]) => `${count} ${room.replace('_', ' ')}${count > 1 ? 's' : ''}`)
        .join(', ');
      const featureStr = (project.features || []).length > 0 ? ` with ${project.features.join(', ')}` : '';
      requirement = `I want a ${project.floors} floor ${project.buildingType} on a ${project.plotWidth}x${project.plotLength} plot with ${roomStr}${featureStr}.`;
    }

    console.log(`[PIPELINE] Requirement: "${requirement}"`);
    console.log(`[PIPELINE] Calling FastAPI at ${config.PYTHON_BIM_URL}/generate ...`);

    // ── Call Python AI Engine ──
    const aiRes = await axios.post(`${config.PYTHON_BIM_URL}/generate`, {
      requirement: requirement,
      save_outputs: false
    }, { timeout: 120000 }); // 2 min timeout

    const aiData = aiRes.data;
    console.log(`[PIPELINE] AI responded with keys: ${Object.keys(aiData).join(', ')}`);

    // ── Validate AI response ──
    if (!aiData.building || Object.keys(aiData.building).length === 0) {
      throw new Error('AI returned empty building layout');
    }

    // ── Count generated rooms for logging ──
    let totalRooms = 0;
    for (const [floorKey, rooms] of Object.entries(aiData.building)) {
      const nonStructural = rooms.filter(r => !r.structural);
      totalRooms += nonStructural.length;
      console.log(`[PIPELINE]   ${floorKey}: ${nonStructural.length} rooms`);
    }
    console.log(`[PIPELINE]   Total rooms: ${totalRooms}`);

    // ── Store AI output into project (OVERWRITE everything) ──
    project.building = aiData.building;
    project.structural = aiData.structural || null;
    project.mep = aiData.mep || null;
    project.tasks = aiData.tasks || [];
    project.schedule = aiData.schedule || null;
    project.cost = aiData.cost || null;

    // ── Build worker guidance from tasks ──
    project.workerGuidance = (aiData.tasks || []).map((t, i) => ({
      id: `step-${i}`,
      title: (t.task || t.name || '').replace(/_/g, ' ').toUpperCase(),
      description: `Phase duration: ${t.duration_days || 0} days. Crew: ${t.crew || 'General'}`,
      completed: false
    }));

    // ── Mark all pipeline stages done ──
    const stages = ['nlp', 'constraints', 'floorPlan', 'structural', 'mep', 'tasks', 'schedule', 'cost'];
    stages.forEach(s => project.pipelineStatus[s] = 'done');

    project.status = 'completed';
    project.progress = 100;
    project.updatedAt = new Date().toISOString();

    // ── Persist to store ──
    store.updateProject(project.id, project);

    console.log(`[PIPELINE] ✓ Project ${project.id} fully generated and stored`);
    console.log(`[PIPELINE] ═══════════════════════════════════════\n`);

    store.addActivity('cpu', `AI pipeline generated BIM layout for ${project.name}`, project.id);
    broadcastToAll({ type: 'pipeline_complete', payload: { projectId: project.id } });

    // Return the full project so the frontend has everything
    res.json(project);
  } catch (err) {
    console.error(`[PIPELINE] ✗ ERROR: ${err.message}`);
    if (err.response) {
      console.error(`[PIPELINE] FastAPI status: ${err.response.status}`);
      console.error(`[PIPELINE] FastAPI body: ${JSON.stringify(err.response.data).slice(0, 500)}`);
    }
    project.status = 'error';
    store.updateProject(project.id, project);
    res.status(500).json({ error: `AI generation failed: ${err.message}. Is FastAPI running on port 8001?` });
  }
});

// ═══════════════════════════════════════════════════════════════
// Individual pipeline stage endpoints
// ═══════════════════════════════════════════════════════════════

router.post('/:id/generate-structural', async (req, res) => {
  const project = store.getProject(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  if (!project.building) return res.status(400).json({ error: 'Generate floor plan first' });

  try {
    console.log(`[STRUCTURAL] Generating for ${project.id}...`);
    const aiRes = await axios.post(`${config.PYTHON_BIM_URL}/structural`, {
      building: project.building
    }, { timeout: 60000 });

    project.structural = aiRes.data;
    project.pipelineStatus.structural = 'done';
    project.progress = Math.max(project.progress, 50);
    store.updateProject(project.id, project);

    console.log(`[STRUCTURAL] ✓ Done for ${project.id}`);
    res.json({ structural: project.structural, pipelineStatus: project.pipelineStatus });
  } catch (err) {
    console.error(`[STRUCTURAL] ✗ Error: ${err.message}`);
    res.status(500).json({ error: 'Failed to generate structural grid.' });
  }
});

router.post('/:id/generate-mep', async (req, res) => {
  const project = store.getProject(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  if (!project.building) return res.status(400).json({ error: 'Generate floor plan first' });

  try {
    console.log(`[MEP] Generating for ${project.id}...`);
    const all_cols = [];
    if (project.structural) {
      Object.values(project.structural).forEach(floor => {
        if (floor && floor.columns) all_cols.push(...floor.columns);
      });
    }
    const all_rooms = [];
    Object.values(project.building).forEach(floor => {
      if (Array.isArray(floor)) all_rooms.push(...floor);
    });

    const aiRes = await axios.post(`${config.PYTHON_BIM_URL}/mep`, {
      layout: all_rooms,
      columns: all_cols,
      core: {}
    }, { timeout: 60000 });

    // Normalize MEP response
    if (Array.isArray(aiRes.data)) {
      project.mep = { plumbing_routes: [], electrical_routes: aiRes.data };
    } else {
      project.mep = {
        plumbing_routes: aiRes.data.plumbing_routes || [],
        electrical_routes: aiRes.data.electrical_routes || []
      };
    }

    project.pipelineStatus.mep = 'done';
    project.progress = Math.max(project.progress, 65);
    store.updateProject(project.id, project);

    console.log(`[MEP] ✓ Done for ${project.id}`);
    res.json({ mep: project.mep, pipelineStatus: project.pipelineStatus });
  } catch (err) {
    console.error(`[MEP] ✗ Error: ${err.message}`);
    res.status(500).json({ error: 'Failed to route MEP.' });
  }
});

router.post('/:id/generate-schedule', async (req, res) => {
  const project = store.getProject(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  if (!project.building) return res.status(400).json({ error: 'Generate layout first' });

  try {
    console.log(`[SCHEDULE] Generating for ${project.id}...`);
    const aiRes = await axios.post(`${config.PYTHON_BIM_URL}/schedule`, {
      area_m2: (project.plotWidth * project.plotLength) / 10.764,
      n_floors: project.floors,
      building: project.building,
      structural: project.structural || {},
      mep: project.mep || {}
    }, { timeout: 60000 });

    project.tasks = aiRes.data.tasks || [];
    project.schedule = aiRes.data.schedule || {};
    project.pipelineStatus.tasks = 'done';
    project.pipelineStatus.schedule = 'done';
    project.progress = Math.max(project.progress, 85);
    store.updateProject(project.id, project);

    console.log(`[SCHEDULE] ✓ Done — ${project.tasks.length} tasks`);
    res.json({ tasks: project.tasks, schedule: project.schedule, pipelineStatus: project.pipelineStatus });
  } catch (err) {
    console.error(`[SCHEDULE] ✗ Error: ${err.message}`);
    res.status(500).json({ error: 'Failed to generate schedule.' });
  }
});

router.get('/:id/cost-estimate', async (req, res) => {
  const project = store.getProject(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  // Return existing cost if already generated
  if (project.cost) {
    return res.json(project.cost);
  }

  // Otherwise, generate on-demand
  try {
    console.log(`[COST] Generating for ${project.id}...`);
    const all_rooms = [];
    if (project.building) {
      Object.values(project.building).forEach(floor => {
        if (Array.isArray(floor)) all_rooms.push(...floor);
      });
    }

    const aiRes = await axios.post(`${config.PYTHON_BIM_URL}/cost`, {
      area_m2: (project.plotWidth * project.plotLength) / 10.764,
      n_rooms: all_rooms.length || 1,
      n_floors: project.floors || 1,
      rooms: all_rooms,
      structural: project.structural ? Object.values(project.structural)[0] || {} : {}
    }, { timeout: 60000 });

    project.cost = aiRes.data;
    project.pipelineStatus.cost = 'done';
    store.updateProject(project.id, project);

    console.log(`[COST] ✓ Done — total: $${aiRes.data.grand_total || 0}`);
    res.json(project.cost);
  } catch (err) {
    console.error(`[COST] ✗ Error: ${err.message}`);
    res.status(500).json({ error: 'Failed to estimate cost.' });
  }
});

module.exports = router;
