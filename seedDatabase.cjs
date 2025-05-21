// seedDatabase.cjs - Seeds GLOBAL Data Only (User Templates are separate)
// eslint-disable-next-line @typescript-eslint/no-var-requires
const admin = require('firebase-admin');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const serviceAccount = require('./serviceAccountKey.json'); // Path to your key

// --- Initialize Firebase Admin SDK ---
try {
    if (admin.apps.length === 0) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: serviceAccount.project_id
        });
        console.log('Firebase Admin SDK Initialized.');
    } else { console.log('Firebase Admin SDK already initialized.'); }
} catch (error) { console.error('FATAL: Error initializing Firebase Admin SDK:', error); process.exit(1); }

const db = admin.firestore();
const { DocumentReference } = admin.firestore;

// --- Data Definitions (Global Base Data) ---

// 1. Areas (Added 'type' field)
const areasData = [
    // Define your Area Types clearly
    { id: 'site', name: 'Site', order: 1, type: 'General/Site' },
    { id: 'whole-house', name: 'Whole House', order: 2, type: 'General/Site' },
    { id: 'bathroom-main', name: 'Bathroom - Main', order: 100, type: 'Interior - Wet' },
    { id: 'bathroom-ensuite', name: 'Bathroom - Ensuite', order: 101, type: 'Interior - Wet' },
    { id: 'bathroom-guest', name: 'Bathroom - Guest', order: 102, type: 'Interior - Wet' },
    { id: 'bathroom-upstairs', name: 'Bathroom - Upstairs', order: 103, type: 'Interior - Wet' },
    { id: 'bathroom-downstairs', name: 'Bathroom - Downstairs', order: 104, type: 'Interior - Wet' },
    { id: 'toilet', name: 'Toilet', order: 110, type: 'Interior - Wet' },
    { id: 'kitchen-main', name: 'Kitchen - Main', order: 120, type: 'Interior - Wet' },
    { id: 'kitchen-secondary', name: 'Kitchen - Secondary', order: 121, type: 'Interior - Wet' },
    { id: 'laundry-main', name: 'Laundry - Main', order: 130, type: 'Interior - Wet' },
    { id: 'laundry-secondary', name: 'Laundry - Secondary', order: 131, type: 'Interior - Wet' },
    { id: 'bedroom-master', name: 'Bedroom - Master', order: 200, type: 'Interior - Bedroom' },
    { id: 'bedroom-guest', name: 'Bedroom - Guest', order: 201, type: 'Interior - Bedroom' },
    { id: 'bedroom-additional', name: 'Bedroom - Additional', order: 202, type: 'Interior - Bedroom' },
    { id: 'living-room', name: 'Living Room', order: 210, type: 'Interior - Living' },
    { id: 'dining-room', name: 'Dining Room', order: 211, type: 'Interior - Living' },
    { id: 'study-office', name: 'Study/Office', order: 220, type: 'Interior - Living' },
    { id: 'common-area', name: 'Common Area', order: 230, type: 'Interior - Living' }, // Or General?
    { id: 'entryway', name: 'Entryway', order: 300, type: 'Interior - Circulation' },
    { id: 'hallway', name: 'Hallway', order: 301, type: 'Interior - Circulation' },
    { id: 'staircase', name: 'Staircase', order: 302, type: 'Interior - Circulation' },
    { id: 'courtyard', name: 'Courtyard', order: 310, type: 'Exterior - Attached' }, // Type examples
    { id: 'patio', name: 'Patio', order: 311, type: 'Exterior - Attached' },
    { id: 'deck', name: 'Deck', order: 312, type: 'Exterior - Attached' },
    { id: 'garden-lawn', name: 'Garden/Lawn', order: 320, type: 'Exterior - Grounds' },
    { id: 'driveway-pathway', name: 'Driveway/Pathway', order: 330, type: 'Exterior - Grounds' },
    { id: 'garage-carport', name: 'Garage/Carport', order: 340, type: 'Exterior - Structure' },
    { id: 'storage', name: 'Storage', order: 350, type: 'Interior - Storage' }, // Or Utility?
    { id: 'mechanical-room', name: 'Mechanical Room', order: 360, type: 'Interior - Storage' }, // Or Utility?
    { id: 'area-roof', name: 'Roof (Area)', order: 400, type: 'Exterior - Structure' }, // Renamed Area ID
    { id: 'subfloor', name: 'Subfloor / Underfloor', order: 410, type: 'Structural/Other' },
    { id: 'roof-space', name: 'Roof Space / Attic', order: 411, type: 'Structural/Other' },
    { id: 'ext-walls', name: 'External Walls', order: 420, type: 'Exterior - Structure' },
];

// 2. Tasks
const tasksData = [
    { id: 'apply', name: 'Apply' }, { id: 'supply-install', name: 'Supply and install' },
    { id: 'supply-lay', name: 'Supply and lay' }, { id: 'install', name: 'Install' },
    { id: 'remove-dispose', name: 'Remove and dispose' }, { id: 'remove-prepare', name: 'Remove and prepare for reinstatement' },
    { id: 'grind-prep', name: 'Grind and prep' }, { id: 'cut-chase', name: 'Cut and chase' },
    { id: 'rough-fit', name: 'Rough in and fit off' }, { id: 'reinstate', name: 'Reinstate all items mentioned' },
    { id: 'demolish', name: 'Demolish' }, { id: 'strip', name: 'Strip' }, { id: 'excavate', name: 'Excavate' },
    { id: 'frame', name: 'Frame' }, { id: 'measure', name: 'Measure' }, { id: 'paint', name: 'Paint/Finish' },
    { id: 'sand', name: 'Sand' }, { id: 'seal', name: 'Seal' }, { id: 'waterproof', name: 'Waterproof' },
    { id: 'test', name: 'Test' }, { id: 'clean', name: 'Clean' }, { id: 'repair', name: 'Repair' },
    { id: 'fix', name: 'Fix' }, { id: 'assemble', name: 'Assemble' }, { id: 'adjust', name: 'Adjust' },
    { id: 'align', name: 'Align' }, { id: 'setup-item', name: 'Setup Fixed Item' }, { id: 'allowance', name: 'Provisional Allowance' },
];

// 3. Materials and Options Source Data
const materialOptionsSource = { /* ... Paste your full materialOptionsSource object here ... */
    'bath': [ { id: 'bath-freestanding', name: 'Freestanding bath' }, { id: 'bath-built-in', name: 'Built-in bath' }, { id: 'bath-corner', name: 'Corner bath' }, { id: 'bath-spa', name: 'Spa bath' }, { id: 'bath-standard', name: 'Standard bath' } ],
    'toilet': [ { id: 'toilet-wall-hung', name: 'Wall-hung toilet' }, { id: 'toilet-close-coupled', name: 'Close-coupled toilet' }, { id: 'toilet-back-to-wall', name: 'Back-to-wall toilet' }, { id: 'toilet-composting', name: 'Composting toilet' }, { id: 'toilet-standard', name: 'Standard toilet' } ],
    // ... include ALL materials that have options ...
};
const materialsBaseData = [ /* ... Paste your full materialsBaseData list here ... */
    { id: 'door', name: 'Door' }, { id: 'window', name: 'Window' }, /* ..., */ { id: 'signage', name: 'Site Signage' }, { id: 'waterproof-mem', name: 'Waterproofing Membrane'},
];

const materialsData = materialsBaseData.map(mat => {
    const hasOptions = !!materialOptionsSource[mat.id];
    const options = hasOptions
        ? materialOptionsSource[mat.id].map(opt => ({
            id: opt.id,
            data: {
                name: opt.name,
                // TODO: Define default/global option price adjustments here if desired,
                // otherwise these will primarily be handled by user templates.
                 ...(opt.id === 'bath-freestanding' && { priceModifier: 250 }), // Example default adjustment
                 ...(opt.id === 'bath-spa' && { absoluteRate: 1800 }), // Example default adjustment
            }
          }))
        : [];
    return { id: mat.id, data: { name: mat.name, optionsAvailable: hasOptions }, ...(hasOptions && { options: options }) };
});


// 4. Categories (Using Area Types and Task IDs)
const categoryAreaTypesMap = { // Define which Area *Types* each category applies to
    'site-setup': ['General/Site', 'Exterior - Grounds', 'Exterior - Structure', 'Exterior - Attached'],
    'demolition': ['Interior - Wet', 'Interior - Living', 'Interior - Bedroom', 'Interior - Circulation', 'Exterior - Attached', 'Exterior - Structure', 'Structural/Other'],
    'plumbing': ['Interior - Wet', 'Exterior - Pool', 'Exterior - Grounds', 'General/Site', 'Structural/Other'], // Subfloor etc.
    'concrete-masonry': ['Exterior - Grounds', 'Exterior - Structure', 'General/Site', 'Structural/Other'],
    'carpentry': ['Interior - Living', 'Interior - Bedroom', 'Interior - Circulation', 'Exterior - Attached', 'Exterior - Structure', 'General/Site', 'Structural/Other', 'Interior - Storage', 'Interior - Wet'],
    'electrical': ['Interior - Wet', 'Interior - Living', 'Interior - Bedroom', 'Interior - Circulation', 'Exterior - Attached', 'Exterior - Structure', 'General/Site', 'Structural/Other', 'Interior - Storage'],
    'plastering': ['Interior - Wet', 'Interior - Living', 'Interior - Bedroom', 'Interior - Circulation', 'Interior - Storage'],
    'waterproofing': ['Interior - Wet', 'Exterior - Attached', 'Exterior - Structure'],
    'tiling': ['Interior - Wet', 'Interior - Circulation', 'Exterior - Attached'],
    'accessory-cabinet': ['Interior - Wet', 'Interior - Bedroom', 'Interior - Storage', 'Interior - Living'],
    'roof': ['Exterior - Structure'], // Category 'roof'
    'joinery': ['Interior - Wet', 'Interior - Living', 'Interior - Storage', 'Interior - Circulation'],
    // TODO: Add mappings for ALL your categories (Painting, Flooring, etc.)
};
const categoryTasksMap = { // Your category->task ID map
    'site-setup': ['setup-item', 'supply-install', 'install', 'apply', 'measure', 'frame', 'excavate'],
    'demolition': ['remove-dispose', 'demolish', 'strip', 'cut-chase', 'remove-prepare', 'clean'],
    'plumbing': ['supply-install', 'install', 'rough-fit', 'remove-dispose', 'test', 'repair', 'fix'],
    'concrete-masonry': ['supply-install', 'supply-lay', 'apply', 'excavate', 'grind-prep', 'cut-chase', 'repair', 'seal'],
    'carpentry': ['supply-install', 'install', 'frame', 'fix', 'measure', 'cut', 'assemble', 'repair', 'sand'],
    'electrical': ['supply-install', 'install', 'rough-fit', 'test', 'remove-dispose', 'fix', 'adjust'],
    'plastering': ['apply', 'install', 'repair', 'patch', 'sand'],
    'waterproofing': ['apply', 'install', 'test', 'seal', 'waterproof'],
    'tiling': ['supply-lay', 'apply', 'cut', 'measure', 'seal', 'grind-prep', 'install', 'fix'],
    'accessory-cabinet': ['supply-install', 'install', 'measure', 'assemble', 'fix', 'adjust', 'align'],
    'roof': ['supply-install', 'remove-dispose', 'repair', 'seal', 'waterproof', 'fix', 'install'],
    'joinery': ['allowance', 'supply-install', 'install', 'measure', 'assemble', 'fix'],
     // TODO: Add mappings for ALL your categories
};
const categoriesBaseData = [ // Your base list
    { id: 'site-setup', name: 'Site Setup', order: 1 }, { id: 'demolition', name: 'Demolition', order: 2 },
    { id: 'plumbing', name: 'Plumbing', order: 3 }, { id: 'concrete-masonry', name: 'Concrete and Masonry', order: 4 },
    { id: 'carpentry', name: 'Carpentry', order: 5 }, { id: 'electrical', name: 'Electrical', order: 6 },
    { id: 'plastering', name: 'Plastering', order: 7 }, { id: 'waterproofing', name: 'Waterproofing', order: 8 },
    { id: 'tiling', name: 'Tiling', order: 9 }, { id: 'accessory-cabinet', name: 'Accessory and Cabinet Installation', order: 10 },
    { id: 'roof', name: 'Roof', order: 11 }, { id: 'joinery', name: 'Joinery', order: 12},
     // TODO: Add all other categories
];

const categoriesData = categoriesBaseData.map(cat => {
    const applicableAreaTypes = categoryAreaTypesMap[cat.id] || [];
    const taskIds = categoryTasksMap[cat.id] || [];
    // Basic validation
    if (applicableAreaTypes.length === 0) console.warn(`Category ${cat.id} has no applicableAreaTypes defined in map!`);
    if (taskIds.length === 0) console.warn(`Category ${cat.id} has no taskIds defined in map!`);
    return { id: cat.id, data: { name: cat.name, order: cat.order, applicableAreaTypes, taskIds } };
});

// 5. Quote Item Templates - OMITTED
// const quoteItemTemplatesData = [ ... ]; // REMOVED - User specific


// --- Utility: Clear Collections ---
async function clearCollections(collectionNames) { /* ... function as provided before ... */
    console.log(`Attempting to clear collections: ${collectionNames.join(', ')}...`);
    for (const collectionName of collectionNames) { /* ... rest of clear logic ... */ }
    console.log(`Finished clearing specified collections.`);
}


// --- Main Seeding Function ---
async function seedDatabase() {
    console.log('--- Starting GLOBAL DATA Seed ---');

    // Only clear global collections now
    const collectionsToClear = [ 'materialOptions', 'materials', 'tasks', 'categories', 'areas', 'quoteItemTemplates' ]; // Keep quoteItemTemplates here to clear old global ones
    await clearCollections(collectionsToClear);

    const mainBatch = db.batch();
    let writeCounter = 0;
    const MAX_BATCH_WRITES = 499;

    function checkBatch(currentBatch, count) { /* ... helper function as before ... */
         if (count >= MAX_BATCH_WRITES) { console.log(`Batch limit (${count}), committing...`); return { batch: db.batch(), count: 0 }; }
         return { batch: currentBatch, count: count };
     }
    let currentBatchData = { batch: mainBatch, count: writeCounter };

    // Seed Areas
    console.log(`Seeding Areas (${areasData.length})...`);
    areasData.forEach(area => {
        const areaRef = db.collection('areas').doc(area.id); const { id, ...data } = area;
        currentBatchData.batch.set(areaRef, data); currentBatchData.count++;
    });

    // Seed Tasks
    console.log(`Seeding Tasks (${tasksData.length})...`);
    tasksData.forEach(task => {
        const taskRef = db.collection('tasks').doc(task.id); const { id, ...data } = task;
        currentBatchData.batch.set(taskRef, data); currentBatchData.count++;
    });

    // Seed Materials (Base data only)
    console.log(`Seeding Materials (${materialsData.length} base)...`);
    materialsData.forEach(mat => {
        const matRef = db.collection('materials').doc(mat.id);
        currentBatchData.batch.set(matRef, mat.data); currentBatchData.count++;
    });

     // Seed Categories (including task references)
     console.log(`Seeding Categories (${categoriesData.length})...`);
     categoriesData.forEach(cat => {
        const catRef = db.collection('categories').doc(cat.id);
        const taskReferences = (cat.data.taskIds || []).map(taskId => db.doc(`tasks/${taskId}`)).filter(ref => ref);
        const categoryData = { name: cat.data.name, order: cat.data.order, applicableAreaTypes: cat.data.applicableAreaTypes || [], tasks: taskReferences };
        currentBatchData.batch.set(catRef, categoryData); currentBatchData.count++;
    });

    // ---- NO quoteItemTemplates Seeding ----
    console.log('Skipping global quoteItemTemplates seeding.');

    // Commit the main batch
    try {
        console.log(`Committing main batch (${currentBatchData.count} operations)...`);
        await currentBatchData.batch.commit();
        console.log('Main collections seeded successfully!');

        // Now seed the options separately
        console.log('Seeding Material Options...');
        let totalOptionsSeeded = 0;
        for (const mat of materialsData) {
             if (mat.options && mat.options.length > 0) {
                 let optionsBatch = db.batch(); let optionsWriteCounter = 0;
                 const matRef = db.collection('materials').doc(mat.id);
                 console.log(` -> Staging options for ${mat.id}...`);
                 for (const opt of mat.options) {
                    if (opt.data) {
                         currentBatchData = checkBatch(optionsBatch, optionsWriteCounter); optionsBatch = currentBatchData.batch; optionsWriteCounter = currentBatchData.count;
                        const optRef = matRef.collection('materialOptions').doc(opt.id);
                        optionsBatch.set(optRef, opt.data); optionsWriteCounter++; totalOptionsSeeded++;
                    }
                 }
                 if (optionsWriteCounter > 0) { await optionsBatch.commit(); console.log(` --> Committed ${optionsWriteCounter} options for ${mat.id}`); }
            }
        }
        if (totalOptionsSeeded > 0) console.log(`Total material options seeded: ${totalOptionsSeeded}`); else console.log('No material options to seed.');

        console.log('-------------------------------------');
        console.log('GLOBAL DATABASE SEEDING COMPLETED!');
        console.log('User-specific quoteItemTemplates need to be created via the app or on signup.');
        console.log('-------------------------------------');
        process.exit(0);

    } catch (error) { console.error('Error committing batch:', error); process.exit(1); }
}

// --- Run the Seeding Function ---
seedDatabase().catch(error => {
    console.error('Unhandled error in seeding process:', error);
    process.exit(1);
});