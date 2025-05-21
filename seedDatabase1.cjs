// Firestore Seed Script for Construction Data Hierarchy
// This script creates the complete hierarchical structure for a construction project
// To use: Update your Firebase config in the initializeApp section and run the script

const admin = require('firebase-admin');
const serviceAccount = require('./path-to-your-firebase-admin-sdk.json'); // Update path to your service account key

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Seed data for the hierarchical structure
async function seedFirestore() {
  try {
    console.log('Starting database seeding...');
    
    // Clear collections if needed
    await clearCollections(['areas', 'categories', 'tasks', 'materials', 'materialOptions', 'areaRelationships']);
    
    // Create all areas
    const areaRefs = await seedAreas();
    
    // Create all categories
    const categoryRefs = await seedCategories();
    
    // Create all tasks
    const taskRefs = await seedTasks();
    
    // Create all materials
    const materialRefs = await seedMaterials();
    
    // Create all material options
    const materialOptionRefs = await seedMaterialOptions(materialRefs);
    
    // Create complete hierarchical relationships
    await createAllHierarchicalRelationships(areaRefs, categoryRefs, taskRefs, materialRefs);
    
    console.log('Database seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

// Clear collections before seeding
async function clearCollections(collectionNames) {
  for (const collectionName of collectionNames) {
    const snapshot = await db.collection(collectionName).get();
    
    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    if (snapshot.docs.length > 0) {
      await batch.commit();
      console.log(`Cleared ${snapshot.docs.length} documents from ${collectionName}`);
    }
  }
}

// Seed areas collection
async function seedAreas() {
  console.log('Seeding areas...');
  const areasData = [
    // Wet Areas
    { id: 'bathroom-main', name: 'Bathroom - Main', category: 'Wet Areas' },
    { id: 'bathroom-ensuite', name: 'Bathroom - Ensuite', category: 'Wet Areas' },
    { id: 'bathroom-guest', name: 'Bathroom - Guest', category: 'Wet Areas' },
    { id: 'bathroom-upstairs', name: 'Bathroom - Upstairs', category: 'Wet Areas' },
    { id: 'bathroom-downstairs', name: 'Bathroom - Downstairs', category: 'Wet Areas' },
    { id: 'toilet', name: 'Toilet', category: 'Wet Areas' },
    { id: 'kitchen-main', name: 'Kitchen - Main', category: 'Wet Areas' },
    { id: 'kitchen-secondary', name: 'Kitchen - Secondary', category: 'Wet Areas' },
    { id: 'laundry-main', name: 'Laundry - Main', category: 'Wet Areas' },
    { id: 'laundry-secondary', name: 'Laundry - Secondary', category: 'Wet Areas' },
    
    // Living Spaces
    { id: 'bedroom-master', name: 'Bedroom - Master', category: 'Living Spaces' },
    { id: 'bedroom-guest', name: 'Bedroom - Guest', category: 'Living Spaces' },
    { id: 'bedroom-additional', name: 'Bedroom - Additional', category: 'Living Spaces' },
    { id: 'living-room', name: 'Living Room', category: 'Living Spaces' },
    { id: 'dining-room', name: 'Dining Room', category: 'Living Spaces' },
    { id: 'study-office', name: 'Study/Office', category: 'Living Spaces' },
    { id: 'common-area', name: 'Common Area', category: 'Living Spaces' },
    
    // Other Areas
    { id: 'entryway', name: 'Entryway', category: 'Other Areas' },
    { id: 'hallway', name: 'Hallway', category: 'Other Areas' },
    { id: 'staircase', name: 'Staircase', category: 'Other Areas' },
    { id: 'courtyard', name: 'Courtyard', category: 'Other Areas' },
    { id: 'patio', name: 'Patio', category: 'Other Areas' },
    { id: 'deck', name: 'Deck', category: 'Other Areas' },
    { id: 'garden-lawn', name: 'Garden/Lawn', category: 'Other Areas' },
    { id: 'driveway-pathway', name: 'Driveway/Pathway', category: 'Other Areas' },
    { id: 'garage-carport', name: 'Garage/Carport', category: 'Other Areas' },
    { id: 'storage', name: 'Storage', category: 'Other Areas' },
    { id: 'mechanical-room', name: 'Mechanical Room', category: 'Other Areas' },
    { id: 'roof', name: 'Roof', category: 'Other Areas' },
  ];
  
  const areaRefs = {};
  const batch = db.batch();
  
  areasData.forEach(area => {
    const ref = db.collection('areas').doc(area.id);
    batch.set(ref, area);
    areaRefs[area.id] = ref;
  });
  
  await batch.commit();
  console.log(`Added ${areasData.length} areas`);
  return areaRefs;
}

// Seed categories collection
async function seedCategories() {
  console.log('Seeding categories...');
  const categoriesData = [
    { id: 'site-setup', name: 'Site Setup' },
    { id: 'demolition', name: 'Demolition' },
    { id: 'plumbing', name: 'Plumbing' },
    { id: 'concrete-masonry', name: 'Concrete and Masonry' },
    { id: 'carpentry', name: 'Carpentry' },
    { id: 'electrical', name: 'Electrical' },
    { id: 'plastering', name: 'Plastering' },
    { id: 'waterproofing', name: 'Waterproofing' },
    { id: 'tiling', name: 'Tiling' },
    { id: 'accessory-cabinet', name: 'Accessory and Cabinet Installation' },
    { id: 'roof', name: 'Roof' },
  ];
  
  const categoryRefs = {};
  const batch = db.batch();
  
  categoriesData.forEach(category => {
    const ref = db.collection('categories').doc(category.id);
    batch.set(ref, category);
    categoryRefs[category.id] = ref;
  });
  
  await batch.commit();
  console.log(`Added ${categoriesData.length} categories`);
  return categoryRefs;
}

// Seed tasks collection
async function seedTasks() {
  console.log('Seeding tasks...');
  const tasksData = [
    { id: 'apply', name: 'Apply' },
    { id: 'supply-install', name: 'Supply and install' },
    { id: 'supply-lay', name: 'Supply and lay' },
    { id: 'install', name: 'Install' },
    { id: 'remove-dispose', name: 'Remove and dispose' },
    { id: 'remove-prepare', name: 'Remove and prepare for reinstatement' },
    { id: 'grind-prep', name: 'Grind and prep' },
    { id: 'cut-chase', name: 'Cut and chase' },
    { id: 'rough-fit', name: 'Rough in and fit off' },
    { id: 'reinstate', name: 'Reinstate all items mentioned' },
    { id: 'demolish', name: 'Demolish' },
    { id: 'strip', name: 'Strip' },
    { id: 'excavate', name: 'Excavate' },
    { id: 'frame', name: 'Frame' },
    { id: 'measure', name: 'Measure' },
    { id: 'paint', name: 'Paint/Finish' },
    { id: 'sand', name: 'Sand' },
    { id: 'seal', name: 'Seal' },
    { id: 'waterproof', name: 'Waterproof' },
    { id: 'test', name: 'Test' },
    { id: 'clean', name: 'Clean' },
    { id: 'repair', name: 'Repair' },
    { id: 'fix', name: 'Fix' },
    { id: 'assemble', name: 'Assemble' },
    { id: 'adjust', name: 'Adjust' },
    { id: 'align', name: 'Align' },
  ];
  
  const taskRefs = {};
  const batch = db.batch();
  
  tasksData.forEach(task => {
    const ref = db.collection('tasks').doc(task.id);
    batch.set(ref, task);
    taskRefs[task.id] = ref;
  });
  
  await batch.commit();
  console.log(`Added ${tasksData.length} tasks`);
  return taskRefs;
}

// Seed materials collection
async function seedMaterials() {
  console.log('Seeding materials...');
  const materialsData = [
    { id: 'door', name: 'Door' },
    { id: 'window', name: 'Window' },
    { id: 'floor', name: 'Floor/Flooring' },
    { id: 'wall', name: 'Wall' },
    { id: 'ceiling', name: 'Ceiling' },
    { id: 'roof-material', name: 'Roof/Roofing' },
    { id: 'insulation', name: 'Insulation' },
    { id: 'bath', name: 'Bath' },
    { id: 'toilet', name: 'Toilet' },
    { id: 'cabinetry', name: 'Cabinetry' },
    { id: 'built-in-wardrobe', name: 'Built-in wardrobe' },
    { id: 'fence', name: 'Fence' },
    { id: 'retaining-wall', name: 'Retaining wall' },
    { id: 'pergola', name: 'Pergola' },
    { id: 'shed', name: 'Shed' },
    { id: 'hot-water-system', name: 'Hot water system' },
    { id: 'tiles', name: 'Tiles' },
    { id: 'concrete', name: 'Concrete' },
    { id: 'paint', name: 'Paint' },
    { id: 'carpet', name: 'Carpet' },
    { id: 'timber-flooring', name: 'Timber flooring' },
    { id: 'pavers', name: 'Pavers' },
    { id: 'fixtures-fittings', name: 'Fixtures and fittings' },
    { id: 'cornice', name: 'Cornice' },
    { id: 'slab', name: 'Slab' },
    { id: 'staircase', name: 'Staircase' },
    { id: 'pool', name: 'Pool' },
    { id: 'vegetation', name: 'Vegetation' },
    { id: 'shelving', name: 'Shelving' },
  ];
  
  const materialRefs = {};
  const batch = db.batch();
  
  materialsData.forEach(material => {
    const ref = db.collection('materials').doc(material.id);
    batch.set(ref, material);
    materialRefs[material.id] = ref;
  });
  
  await batch.commit();
  console.log(`Added ${materialsData.length} materials`);
  return materialRefs;
}

// Seed material options collection
async function seedMaterialOptions(materialRefs) {
  console.log('Seeding material options...');
  
  // Group options by material for readability
  const materialOptionsData = {
    'door': [
      { id: 'door-aluminium-sliding', name: 'Aluminium sliding glass door' },
      { id: 'door-hinged-timber', name: 'Hinged timber door' },
      { id: 'door-hinged-aluminium', name: 'Hinged aluminium door' },
      { id: 'door-hinged-steel', name: 'Hinged steel door' },
      { id: 'door-bifold-timber', name: 'Bifold timber door' },
      { id: 'door-bifold-aluminium', name: 'Bifold aluminium door' },
      { id: 'door-french', name: 'French doors' },
      { id: 'door-cavity-sliding', name: 'Cavity sliding door' },
      { id: 'door-security', name: 'Security door' },
      { id: 'door-fire-rated', name: 'Fire-rated door' }
    ],
    'window': [
      { id: 'window-aluminium-sliding', name: 'Aluminium sliding window' },
      { id: 'window-aluminium-double-hung', name: 'Aluminium double-hung window' },
      { id: 'window-timber-casement', name: 'Timber casement window' },
      { id: 'window-timber-double-hung', name: 'Timber double-hung window' },
      { id: 'window-awning', name: 'Awning window' },
      { id: 'window-fixed', name: 'Fixed window' },
      { id: 'window-louvre', name: 'Louvre window' },
      { id: 'window-bay', name: 'Bay window' },
      { id: 'window-skylight', name: 'Skylight' },
      { id: 'window-double-glazed', name: 'Double-glazed window' }
    ],
    'floor': [
      { id: 'floor-timber-hardwood', name: 'Timber flooring (hardwood)' },
      { id: 'floor-timber-engineered', name: 'Timber flooring (engineered)' },
      { id: 'floor-carpet-wool', name: 'Carpet (wool)' },
      { id: 'floor-carpet-synthetic', name: 'Carpet (synthetic)' },
      { id: 'floor-vinyl', name: 'Vinyl flooring' },
      { id: 'floor-laminate', name: 'Laminate flooring' },
      { id: 'floor-concrete-polished', name: 'Concrete flooring (polished)' },
      { id: 'floor-concrete-sealed', name: 'Concrete flooring (sealed)' }
    ],
    'tiles': [
      { id: 'tiles-ceramic', name: 'Ceramic tiles' },
      { id: 'tiles-porcelain', name: 'Porcelain tiles' },
      { id: 'tiles-natural-stone', name: 'Natural stone tiles' },
      { id: 'tiles-mosaic', name: 'Mosaic tiles' },
      { id: 'tiles-glass', name: 'Glass tiles' },
      { id: 'tiles-subway', name: 'Subway tiles' },
      { id: 'tiles-large-format', name: 'Large format tiles' },
      { id: 'tiles-terrazzo', name: 'Terrazzo tiles' }
    ],
    'wall': [
      { id: 'wall-brick-exposed', name: 'Brick wall (exposed)' },
      { id: 'wall-brick-rendered', name: 'Brick wall (rendered)' },
      { id: 'wall-timber-framed', name: 'Timber-framed wall' },
      { id: 'wall-steel-framed', name: 'Steel-framed wall' },
      { id: 'wall-plasterboard', name: 'Plasterboard wall' },
      { id: 'wall-concrete', name: 'Concrete wall' },
      { id: 'wall-stone', name: 'Stone wall' },
      { id: 'wall-timber-cladding', name: 'Timber cladding' },
      { id: 'wall-fibre-cement', name: 'Fibre cement cladding' },
      { id: 'wall-weatherboard', name: 'Weatherboard cladding' }
    ],
    'roof-material': [
      { id: 'roof-metal-colorbond', name: 'Metal roof (colorbond)' },
      { id: 'roof-metal-zinc', name: 'Metal roof (zinc)' },
      { id: 'roof-terracotta', name: 'Terracotta roof tiles' },
      { id: 'roof-concrete', name: 'Concrete roof tiles' },
      { id: 'roof-slate', name: 'Slate roof tiles' },
      { id: 'roof-timber-shingles', name: 'Timber shingles' },
      { id: 'roof-asphalt-shingles', name: 'Asphalt shingles' },
      { id: 'roof-membrane', name: 'Membrane roofing' }
    ],
    'bath': [
      { id: 'bath-freestanding', name: 'Freestanding bath' },
      { id: 'bath-built-in', name: 'Built-in bath' },
      { id: 'bath-corner', name: 'Corner bath' },
      { id: 'bath-spa', name: 'Spa bath' },
      { id: 'bath-standard', name: 'Standard bath' }
    ],
    'toilet': [
      { id: 'toilet-wall-hung', name: 'Wall-hung toilet' },
      { id: 'toilet-close-coupled', name: 'Close-coupled toilet' },
      { id: 'toilet-back-to-wall', name: 'Back-to-wall toilet' },
      { id: 'toilet-composting', name: 'Composting toilet' },
      { id: 'toilet-standard', name: 'Standard toilet' }
    ],
    'cabinetry': [
      { id: 'cabinetry-kitchen-timber', name: 'Kitchen cabinetry (timber)' },
      { id: 'cabinetry-kitchen-laminate', name: 'Kitchen cabinetry (laminate)' },
      { id: 'cabinetry-kitchen-poly', name: 'Kitchen cabinetry (polyurethane)' },
      { id: 'cabinetry-bathroom-wall-hung', name: 'Bathroom vanity (wall-hung)' },
      { id: 'cabinetry-bathroom-freestanding', name: 'Bathroom vanity (freestanding)' },
      { id: 'cabinetry-laundry', name: 'Laundry cabinetry' }
    ],
    'built-in-wardrobe': [
      { id: 'wardrobe-sliding', name: 'Built-in wardrobe (sliding doors)' },
      { id: 'wardrobe-hinged', name: 'Built-in wardrobe (hinged doors)' },
      { id: 'wardrobe-walk-in', name: 'Walk-in wardrobe' },
      { id: 'wardrobe-custom', name: 'Custom wardrobe system' }
    ],
    'fence': [
      { id: 'fence-timber', name: 'Timber fence' },
      { id: 'fence-colorbond', name: 'Colorbond fence' },
      { id: 'fence-brick', name: 'Brick fence' },
      { id: 'fence-rendered-brick', name: 'Rendered brick fence' },
      { id: 'fence-wrought-iron', name: 'Wrought iron fence' },
      { id: 'fence-chain-link', name: 'Chain link fence' },
      { id: 'fence-composite', name: 'Composite fence' }
    ],
    'retaining-wall': [
      { id: 'retaining-concrete', name: 'Concrete retaining wall' },
      { id: 'retaining-timber', name: 'Timber retaining wall' },
      { id: 'retaining-stone', name: 'Stone retaining wall' },
      { id: 'retaining-block', name: 'Block retaining wall' },
      { id: 'retaining-gabion', name: 'Gabion retaining wall' },
      { id: 'retaining-brick', name: 'Brick retaining wall' }
    ],
    'insulation': [
      { id: 'insulation-ceiling-batts', name: 'Ceiling insulation (batts)' },
      { id: 'insulation-ceiling-blow-in', name: 'Ceiling insulation (blow-in)' },
      { id: 'insulation-wall-batts', name: 'Wall insulation (batts)' },
      { id: 'insulation-wall-rigid', name: 'Wall insulation (rigid board)' },
      { id: 'insulation-underfloor', name: 'Underfloor insulation' },
      { id: 'insulation-acoustic', name: 'Acoustic insulation' }
    ],
    'hot-water-system': [
      { id: 'hot-water-gas', name: 'Gas hot water system' },
      { id: 'hot-water-electric', name: 'Electric hot water system' },
      { id: 'hot-water-solar', name: 'Solar hot water system' },
      { id: 'hot-water-heat-pump', name: 'Heat pump hot water system' },
      { id: 'hot-water-instantaneous', name: 'Instantaneous hot water system' },
      { id: 'hot-water-storage', name: 'Storage tank hot water system' }
    ]
  };
  
  const optionRefs = {};
  
  // Process each material's options
  for (const [materialId, options] of Object.entries(materialOptionsData)) {
    const batch = db.batch();
    const materialRef = materialRefs[materialId];
    
    if (!materialRef) {
      console.warn(`Material with ID ${materialId} not found. Skipping its options.`);
      continue;
    }
    
    // Update material with option IDs
    const optionIds = options.map(option => option.id);
    batch.update(materialRef, { materialOptionIds: optionIds });
    
    // Create all options for this material
    options.forEach(option => {
      const ref = db.collection('materialOptions').doc(option.id);
      batch.set(ref, {
        ...option,
        materialId: materialId
      });
      optionRefs[option.id] = ref;
    });
    
    await batch.commit();
    console.log(`Added ${options.length} options for material: ${materialId}`);
  }
  
  return optionRefs;
}

// Define the complete hierarchical relationships for areas
async function createAllHierarchicalRelationships(areaRefs, categoryRefs, taskRefs, materialRefs) {
  console.log('Creating complete hierarchical relationships...');
  
  // This defines a comprehensive relational mapping:
  // For each area, specify relevant categories, tasks, and materials
  const areaRelationships = {
    // Wet Areas - Bathrooms
    'bathroom-main': {
      categories: ['demolition', 'plumbing', 'electrical', 'waterproofing', 'tiling', 'accessory-cabinet', 'plastering'],
      tasks: ['remove-dispose', 'demolish', 'strip', 'supply-install', 'install', 'rough-fit', 'apply', 'waterproof', 'seal', 'supply-lay', 'test', 'measure', 'repair', 'clean', 'fix', 'assemble', 'adjust', 'align'],
      materials: ['bath', 'toilet', 'cabinetry', 'tiles', 'fixtures-fittings', 'wall', 'floor', 'ceiling', 'door', 'window', 'hot-water-system', 'paint']
    },
    'bathroom-ensuite': {
      categories: ['demolition', 'plumbing', 'electrical', 'waterproofing', 'tiling', 'accessory-cabinet', 'plastering'],
      tasks: ['remove-dispose', 'demolish', 'strip', 'supply-install', 'install', 'rough-fit', 'apply', 'waterproof', 'seal', 'supply-lay', 'test', 'measure', 'repair', 'clean', 'fix', 'assemble', 'adjust', 'align'],
      materials: ['bath', 'toilet', 'cabinetry', 'tiles', 'fixtures-fittings', 'wall', 'floor', 'ceiling', 'door', 'window', 'hot-water-system', 'paint']
    },
    'bathroom-guest': {
      categories: ['demolition', 'plumbing', 'electrical', 'waterproofing', 'tiling', 'accessory-cabinet', 'plastering'],
      tasks: ['remove-dispose', 'demolish', 'strip', 'supply-install', 'install', 'rough-fit', 'apply', 'waterproof', 'seal', 'supply-lay', 'test', 'measure', 'repair', 'clean', 'fix', 'assemble', 'adjust', 'align'],
      materials: ['bath', 'toilet', 'cabinetry', 'tiles', 'fixtures-fittings', 'wall', 'floor', 'ceiling', 'door', 'window', 'hot-water-system', 'paint']
    },
    'bathroom-upstairs': {
      categories: ['demolition', 'plumbing', 'electrical', 'waterproofing', 'tiling', 'accessory-cabinet', 'plastering'],
      tasks: ['remove-dispose', 'demolish', 'strip', 'supply-install', 'install', 'rough-fit', 'apply', 'waterproof', 'seal', 'supply-lay', 'test', 'measure', 'repair', 'clean', 'fix', 'assemble', 'adjust', 'align'],
      materials: ['bath', 'toilet', 'cabinetry', 'tiles', 'fixtures-fittings', 'wall', 'floor', 'ceiling', 'door', 'window', 'hot-water-system', 'paint']
    },
    'bathroom-downstairs': {
      categories: ['demolition', 'plumbing', 'electrical', 'waterproofing', 'tiling', 'accessory-cabinet', 'plastering'],
      tasks: ['remove-dispose', 'demolish', 'strip', 'supply-install', 'install', 'rough-fit', 'apply', 'waterproof', 'seal', 'supply-lay', 'test', 'measure', 'repair', 'clean', 'fix', 'assemble', 'adjust', 'align'],
      materials: ['bath', 'toilet', 'cabinetry', 'tiles', 'fixtures-fittings', 'wall', 'floor', 'ceiling', 'door', 'window', 'hot-water-system', 'paint']
    },
    'toilet': {
      categories: ['demolition', 'plumbing', 'electrical', 'waterproofing', 'tiling', 'accessory-cabinet', 'plastering'],
      tasks: ['remove-dispose', 'supply-install', 'install', 'rough-fit', 'apply', 'waterproof', 'seal', 'supply-lay', 'test', 'clean', 'repair'],
      materials: ['toilet', 'tiles', 'fixtures-fittings', 'wall', 'floor', 'ceiling', 'door', 'window', 'paint']
    },
    
    // Wet Areas - Kitchen
    'kitchen-main': {
      categories: ['demolition', 'plumbing', 'electrical', 'concrete-masonry', 'carpentry', 'accessory-cabinet', 'plastering', 'tiling'],
      tasks: ['remove-dispose', 'demolish', 'supply-install', 'install', 'rough-fit', 'apply', 'supply-lay', 'cut', 'measure', 'assemble', 'fix', 'adjust', 'align', 'repair', 'clean'],
      materials: ['cabinetry', 'fixtures-fittings', 'tiles', 'wall', 'floor', 'ceiling', 'door', 'window', 'paint', 'concrete']
    },
    'kitchen-secondary': {
      categories: ['demolition', 'plumbing', 'electrical', 'concrete-masonry', 'carpentry', 'accessory-cabinet', 'plastering', 'tiling'],
      tasks: ['remove-dispose', 'demolish', 'supply-install', 'install', 'rough-fit', 'apply', 'supply-lay', 'cut', 'measure', 'assemble', 'fix', 'adjust', 'align', 'repair', 'clean'],
      materials: ['cabinetry', 'fixtures-fittings', 'tiles', 'wall', 'floor', 'ceiling', 'door', 'window', 'paint', 'concrete']
    },
    
    // Wet Areas - Laundry
    'laundry-main': {
      categories: ['demolition', 'plumbing', 'electrical', 'waterproofing', 'tiling', 'accessory-cabinet', 'plastering'],
      tasks: ['remove-dispose', 'supply-install', 'install', 'rough-fit', 'apply', 'waterproof', 'seal', 'supply-lay', 'test', 'clean', 'repair'],
      materials: ['cabinetry', 'fixtures-fittings', 'tiles', 'wall', 'floor', 'ceiling', 'door', 'window', 'paint']
    },
    'laundry-secondary': {
      categories: ['demolition', 'plumbing', 'electrical', 'waterproofing', 'tiling', 'accessory-cabinet', 'plastering'],
      tasks: ['remove-dispose', 'supply-install', 'install', 'rough-fit', 'apply', 'waterproof', 'seal', 'supply-lay', 'test', 'clean', 'repair'],
      materials: ['cabinetry', 'fixtures-fittings', 'tiles', 'wall', 'floor', 'ceiling', 'door', 'window', 'paint']
    },
    
    // Living Spaces
    'bedroom-master': {
      categories: ['demolition', 'carpentry', 'electrical', 'plastering', 'accessory-cabinet'],
      tasks: ['remove-dispose', 'demolish', 'strip', 'supply-install', 'install', 'apply', 'measure', 'repair', 'fix', 'assemble', 'adjust', 'align', 'clean'],
      materials: ['wall', 'floor', 'ceiling', 'door', 'window', 'built-in-wardrobe', 'carpet', 'timber-flooring', 'paint']
    },
    'bedroom-guest': {
      categories: ['demolition', 'carpentry', 'electrical', 'plastering', 'accessory-cabinet'],
      tasks: ['remove-dispose', 'demolish', 'strip', 'supply-install', 'install', 'apply', 'measure', 'repair', 'fix', 'assemble', 'adjust', 'align', 'clean'],
      materials: ['wall', 'floor', 'ceiling', 'door', 'window', 'built-in-wardrobe', 'carpet', 'timber-flooring', 'paint']
    },
    'bedroom-additional': {
      categories: ['demolition', 'carpentry', 'electrical', 'plastering', 'accessory-cabinet'],
      tasks: ['remove-dispose', 'demolish', 'strip', 'supply-install', 'install', 'apply', 'measure', 'repair', 'fix', 'assemble', 'adjust', 'align', 'clean'],
      materials: ['wall', 'floor', 'ceiling', 'door', 'window', 'built-in-wardrobe', 'carpet', 'timber-flooring', 'paint']
    },
    'living-room': {
      categories: ['demolition', 'carpentry', 'electrical', 'plastering'],
      tasks: ['remove-dispose', 'demolish', 'strip', 'supply-install', 'install', 'apply', 'measure', 'repair', 'fix', 'clean'],
      materials: ['wall', 'floor', 'ceiling', 'door', 'window', 'carpet', 'timber-flooring', 'paint', 'fixtures-fittings']
    },
    'dining-room': {
      categories: ['demolition', 'carpentry', 'electrical', 'plastering'],
      tasks: ['remove-dispose', 'demolish', 'strip', 'supply-install', 'install', 'apply', 'measure', 'repair', 'fix', 'clean'],
      materials: ['wall', 'floor', 'ceiling', 'door', 'window', 'carpet', 'timber-flooring', 'paint', 'fixtures-fittings']
    },
    'study-office': {
      categories: ['demolition', 'carpentry', 'electrical', 'plastering'],
      tasks: ['remove-dispose', 'demolish', 'strip', 'supply-install', 'install', 'apply', 'measure', 'repair', 'fix', 'clean'],
      materials: ['wall', 'floor', 'ceiling', 'door', 'window', 'carpet', 'timber-flooring', 'paint', 'fixtures-fittings', 'cabinetry']
    },
    'common-area': {
      categories: ['demolition', 'carpentry', 'electrical', 'plastering'],
      tasks: ['remove-dispose', 'demolish', 'strip', 'supply-install', 'install', 'apply', 'measure', 'repair', 'fix', 'clean'],
      materials: ['wall', 'floor', 'ceiling', 'door', 'window', 'carpet', 'timber-flooring', 'paint', 'fixtures-fittings']
    },
    
    // Transition Areas
    'entryway': {
      categories: ['demolition', 'carpentry', 'electrical', 'plastering', 'tiling'],
      tasks: ['remove-dispose', 'demolish', 'supply-install', 'install', 'apply', 'supply-lay', 'measure', 'repair', 'clean'],
      materials: ['wall', 'floor', 'ceiling', 'door', 'window', 'tiles', 'timber-flooring', 'paint']
    },
    'hallway': {
      categories: ['demolition', 'carpentry', 'electrical', 'plastering', 'tiling'],
      tasks: ['remove-dispose', 'demolish', 'supply-install', 'install', 'apply', 'supply-lay', 'measure', 'repair', 'clean'],
      materials: ['wall', 'floor', 'ceiling', 'door', 'window', 'tiles', 'carpet', 'timber-flooring', 'paint']
    },
    'staircase': {
      categories: ['demolition', 'carpentry', 'electrical', 'plastering'],
      tasks: ['remove-dispose', 'demolish', 'supply-install', 'install', 'apply', 'measure', 'repair', 'clean'],
      materials: ['staircase', 'wall', 'carpet', 'timber-flooring', 'paint']
    },
    
    // Outdoor Areas
    'courtyard': {
      categories: ['site-setup', 'demolition', 'concrete-masonry', 'carpentry', 'tiling'],
      tasks: ['remove-dispose', 'demolish', 'excavate', 'supply-install', 'supply-lay', 'apply', 'measure', 'repair', 'clean'],
      materials: ['concrete', 'pavers', 'tiles', 'fence', 'pergola']
    },
    'patio': {
      categories: ['site-setup', 'demolition', 'concrete-masonry', 'carpentry', 'tiling'],
      tasks: ['remove-dispose', 'demolish', 'excavate', 'supply-install', 'supply-lay', 'apply', 'measure', 'repair', 'clean'],
      materials: ['concrete', 'pavers', 'tiles', 'fence', 'pergola']
    },
    'deck': {
      categories: ['site-setup', 'demolition', 'concrete-masonry', 'carpentry', 'waterproofing'],
      tasks: ['remove-dispose', 'demolish', 'excavate', 'supply-install', 'apply', 'waterproof', 'seal', 'measure', 'repair', 'clean'],
      materials: ['timber-flooring', 'concrete', 'fence', 'pergola']
    },
    'garden-lawn': {
      categories: ['site-setup', 'demolition'],
      tasks: ['remove-dispose', 'demolish', 'excavate', 'clean'],
      materials: ['vegetation', 'fence', 'retaining-wall', 'pavers']
    },
    'driveway-pathway': {
      categories: ['site-setup', 'demolition', 'concrete-masonry'],
      tasks: ['remove-dispose', 'demolish', 'excavate', 'supply-install', 'supply-lay', 'apply', 'measure', 'repair', 'clean'],
      materials: ['concrete', 'pavers']
    },
    
    // Utility Areas
    'garage-carport': {
      categories: ['site-setup', 'demolition', 'concrete-masonry', 'carpentry', 'electrical'],
      tasks: ['remove-dispose', 'demolish', 'excavate', 'supply-install', 'install', 'apply', 'measure', 'repair', 'clean'],
      materials: ['concrete', 'wall', 'floor', 'ceiling', 'door', 'window', 'paint']
    },
    'storage': {
      categories: ['demolition', 'carpentry', 'electrical', 'plastering'],
      tasks: ['remove-dispose', 'demolish', 'supply-install', 'install', 'apply', 'measure', 'repair', 'clean'],
      materials: ['wall', 'floor', 'ceiling', 'door', 'window', 'paint', 'shelving']
    },
    'mechanical-room': {
      categories: ['demolition', 'plumbing', 'electrical'],
      tasks: ['remove-dispose', 'supply-install', 'install', 'rough-fit', 'test', 'repair'],
      materials: ['hot-water-system', 'fixtures-fittings', 'wall', 'floor', 'ceiling', 'door']
    },
    
    // Roof
    'roof': {
      categories: ['site-setup', 'demolition', 'carpentry', 'waterproofing', 'roof'],
      tasks: ['remove-dispose', 'supply-install', 'install', 'waterproof', 'seal', 'repair', 'clean'],
      materials: ['roof-material', 'insulation']
    }
  };
  
  // Now create area-based relationships
  console.log('Creating area-based relationships...');
  for (const [areaId, relationships] of Object.entries(areaRelationships)) {
    const areaRef = areaRefs[areaId];
    if (!areaRef) {
      console.warn(`Area with ID ${areaId} not found. Skipping relationships.`);
      continue;
    }
    
    // Update the area with all relevant relationships
    await areaRef.update({
      relevantCategoryIds: relationships.categories,
      relevantTaskIds: relationships.tasks,
      relevantMaterialIds: relationships.materials
    });
    
    console.log(`Updated relationships for area: ${areaId}`);
  }
  
  // Also create the specific category-task and task-material relationships for filtering
  await createCategoryTaskRelationships(categoryRefs, taskRefs);
  await createTaskMaterialRelationships(taskRefs, materialRefs);
  
  console.log('Complete hierarchical relationships created');
}

// Create relationships between categories and tasks 
// (This is still needed for filtering at category level)
async function createCategoryTaskRelationships(categoryRefs, taskRefs) {
  console.log('Creating category-task relationships...');
  
  // Define which tasks are relevant for each category
  const categoryTasks = {
    'site-setup': ['supply-install', 'install', 'apply', 'measure', 'frame', 'excavate'],
    'demolition': ['remove-dispose', 'demolish', 'strip', 'cut-chase', 'remove-prepare', 'clean'],
    'plumbing': ['supply-install', 'install', 'rough-fit', 'remove-dispose', 'test', 'repair'],
    'concrete-masonry': ['supply-install', 'supply-lay', 'apply', 'excavate', 'grind-prep', 'cut-chase', 'repair', 'seal'],
    'carpentry': ['supply-install', 'install', 'frame', 'fix', 'measure', 'cut', 'assemble', 'repair', 'sand'],
    'electrical': ['supply-install', 'install', 'rough-fit', 'test', 'remove-dispose'],
    'plastering': ['apply', 'install', 'repair', 'patch', 'sand'],
    'waterproofing': ['apply', 'install', 'test', 'seal', 'waterproof'],
    'tiling': ['supply-lay', 'apply', 'cut', 'measure', 'seal'],
    'accessory-cabinet': ['supply-install', 'install', 'measure', 'assemble', 'fix', 'adjust', 'align'],
    'roof': ['supply-install', 'remove-dispose', 'repair', 'seal', 'waterproof', 'fix'],
  };
  
  // Update each category with its relevant tasks
  const batch = db.batch();
  
  for (const [categoryId, taskIds] of Object.entries(categoryTasks)) {
    const categoryRef = categoryRefs[categoryId];
    if (!categoryRef) {
      console.warn(`Category with ID ${categoryId} not found. Skipping relationships.`);
      continue;
    }
    
    batch.update(categoryRef, { relevantTaskIds: taskIds });
  }
  
  await batch.commit();
  console.log('Category-task relationships created');
}

// Create relationships between tasks and materials
// (This is still needed for filtering at task level)
async function createTaskMaterialRelationships(taskRefs, materialRefs) {
  console.log('Creating task-material relationships...');
  
  // Define which materials are relevant for each task
  const taskMaterials = {
    'apply': ['paint', 'concrete', 'tiles', 'insulation'],
    'supply-install': ['door', 'window', 'cabinetry', 'built-in-wardrobe', 'hot-water-system', 'bath', 'toilet', 'insulation', 'ceiling', 'cornice', 'staircase', 'pergola', 'fence', 'shed', 'retaining-wall', 'roof-material'],
    'supply-lay': ['tiles', 'carpet', 'timber-flooring', 'pavers', 'concrete'],
    'install': ['door', 'window', 'fixtures-fittings', 'insulation', 'cabinetry', 'built-in-wardrobe', 'roof-material', 'fence'],
    'remove-dispose': ['fixtures-fittings', 'door', 'window', 'wall', 'floor', 'ceiling', 'roof-material', 'bath', 'toilet', 'cabinetry', 'built-in-wardrobe', 'fence', 'shed', 'pavers', 'retaining-wall'],
    'remove-prepare': ['door', 'window', 'fixtures-fittings', 'floor', 'wall', 'ceiling'],
    'grind-prep': ['concrete', 'floor', 'wall', 'slab'],
    'cut-chase': ['wall', 'floor', 'concrete'],
    'rough-fit': ['hot-water-system', 'fixtures-fittings'],
    'reinstate': ['door', 'window', 'fixtures-fittings', 'floor', 'wall', 'ceiling'],
    'demolish': ['wall', 'ceiling', 'floor', 'shed', 'fence', 'retaining-wall'],
    'strip': ['paint', 'floor', 'wall', 'ceiling', 'roof-material'],
    'excavate': ['concrete', 'slab'],
    'frame': ['wall', 'ceiling', 'roof-material', 'pergola'],
    'measure': ['door', 'window', 'floor', 'wall', 'ceiling', 'tiles', 'carpet', 'timber-flooring'],
    'paint': ['wall', 'ceiling', 'door', 'window', 'timber-flooring'],
    'sand': ['wall', 'floor', 'timber-flooring', 'door'],
    'seal': ['floor', 'wall', 'tiles', 'timber-flooring', 'concrete', 'roof-material'],
    'waterproof': ['floor', 'wall', 'roof-material'],
    'test': ['hot-water-system', 'fixtures-fittings'],
    'clean': ['floor', 'wall', 'tiles', 'window', 'concrete'],
    'repair': ['wall', 'floor', 'ceiling', 'roof-material', 'door', 'window', 'fence', 'retaining-wall'],
    'fix': ['door', 'window', 'fixtures-fittings', 'cabinetry', 'built-in-wardrobe'],
    'assemble': ['cabinetry', 'built-in-wardrobe', 'fence', 'shed', 'pergola'],
    'adjust': ['door', 'window', 'cabinetry', 'built-in-wardrobe'],
    'align': ['door', 'window', 'cabinetry', 'built-in-wardrobe', 'tiles'],
  };
  
  // Update each task with its relevant materials
  const batch = db.batch();
  
  for (const [taskId, materialIds] of Object.entries(taskMaterials)) {
    const taskRef = taskRefs[taskId];
    if (!taskRef) {
      console.warn(`Task with ID ${taskId} not found. Skipping relationships.`);
      continue;
    }
    
    batch.update(taskRef, { relevantMaterialIds: materialIds });
  }
  
  await batch.commit();
  console.log('Task-material relationships created');
}

// Run the seeding process
seedFirestore();