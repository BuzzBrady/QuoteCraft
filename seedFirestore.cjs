// Use strict mode for potentially better error handling and compatibility
'use strict';

const admin = require('firebase-admin');

// --- Configuration ---
// Path to your service account key file - MUST BE NAMED 'serviceAccountKey.json'
const SERVICE_ACCOUNT_KEY_PATH = './serviceAccountKey.json';

// Optional: Define a test user ID to seed user-specific data
// Set to null or undefined to skip seeding user-specific data.
const TEST_USER_ID = 'test-user-node-cjs-123'; // Example ID
// const TEST_USER_ID = null;

// --- Firebase Initialization ---
let db; // Declare db outside the try block (using let)
let serverTimestamp; // Declare serverTimestamp outside as well

try {
    // require() is the standard way to import JSON in CommonJS
    const serviceAccount = require(SERVICE_ACCOUNT_KEY_PATH);

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        // Optional: If your key file doesn't contain the projectId, specify it here
        // projectId: 'YOUR_PROJECT_ID'
    });

    // Assign the values inside the try block
    db = admin.firestore();
    // Assign the serverTimestamp function itself
    serverTimestamp = admin.firestore.FieldValue.serverTimestamp;

    console.log('Firebase Admin SDK initialized successfully.');

} catch (error) {
    console.error('Error initializing Firebase Admin SDK:', error);
    if (error.code === 'MODULE_NOT_FOUND') {
         console.error(`\n>>> Ensure the file "${SERVICE_ACCOUNT_KEY_PATH}" exists in the correct location relative to the script.`);
    }
    console.log('\nPlease also ensure:');
    console.log(`1. The file "${SERVICE_ACCOUNT_KEY_PATH}" is a valid JSON service account key.`);
    console.log(`2. You have run 'npm install firebase-admin'.`);
    process.exit(1); // Exit if initialization fails
}

// --- Data Definitions ---
// 1. Areas
const areasData = [
    { id: 'bathroom-main', name: 'Main Bathroom', description: 'Main bathroom on ground floor', type: 'Internal Wet Area', order: 1, },
    { id: 'kitchen', name: 'Kitchen', type: 'Internal Living Area', order: 2, },
    { id: 'roof-area', name: 'Roof', description: 'Main roof structure', type: 'External Structure', order: 10, },
    { id: 'bedroom-master', name: 'Master Bedroom', type: 'Internal Living Area', order: 3, },
];

// 2. Tasks (Global)
const tasksData = [
    { id: 'install-gpo-double', name: 'Install Double Power Point', description: 'Includes chasing wall, running cable, fitting off.', defaultUnit: 'each', },
    { id: 'paint-wall-prep', name: 'Prepare Wall for Painting', description: 'Includes cleaning, patching minor holes, sanding.', defaultUnit: 'm²', },
    { id: 'labour-general', name: 'General Labour', defaultUnit: 'hour', },
    { id: 'install-downlight', name: 'Install LED Downlight', description: 'Includes cutting hole, wiring, fitting.', defaultUnit: 'each', },
    { id: 'supply-paint-standard', name: 'Supply Standard Wall Paint', defaultUnit: 'litre', },
];

// 3. Materials (Global) & Options
const materialsData = [
    { id: 'gpo-double-white', name: 'GPO Double Outlet - White', description: 'Standard Clipsal GPO', searchKeywords: ['power', 'point', 'gpo', 'outlet', 'double', 'white', 'clipsal'], optionsAvailable: true, options: [ { id: 'white', name: 'White', description: 'Standard white plastic' }, { id: 'black', name: 'Black', description: 'Matt black finish' }, { id: 'stainless', name: 'Stainless Steel Look' }, ], },
    { id: 'led-downlight-9w-warm', name: 'LED Downlight 9W Warm White', description: 'Standard 90mm cutout Warm White LED', searchKeywords: ['led', 'downlight', 'light', '9w', 'warm', 'white', 'ceiling'], optionsAvailable: false, options: [], },
    { id: 'paint-standard-white', name: 'Standard Interior Wall Paint - White', description: 'Washable low-sheen acrylic', searchKeywords: ['paint', 'white', 'interior', 'wall', 'acrylic'], optionsAvailable: true, options: [ { id: '1l', name: '1 Litre' }, { id: '4l', name: '4 Litre' }, { id: '10l', name: '10 Litre' }, ], },
    { id: 'cable-tps-2.5mm', name: 'Cable TPS 2.5mm Twin & Earth', description: 'Standard electrical cable for power circuits', searchKeywords: ['cable', 'wire', 'tps', '2.5mm', 'twin', 'earth'], optionsAvailable: false, options: [], },
];

// 4. Kit Templates (Global)
const kitTemplatesData = [
    { id: 'starter-elec-gpo-install', name: 'Starter Kit: Standard GPO Install', description: 'Basic materials and labour for installing one double GPO.', tags: ['electrical', 'fit-off', 'internal'], isGlobal: true, lineItems: [ { taskId: 'install-gpo-double', materialId: null, materialOptionId: null, displayName: 'Labour: Install Double GPO', unit: 'each', inputType: 'quantity', baseQuantity: 1, }, { taskId: null, materialId: 'gpo-double-white', materialOptionId: 'white', displayName: 'Supply: Double GPO (White)', unit: 'each', inputType: 'quantity', baseQuantity: 1, }, { taskId: null, materialId: 'cable-tps-2.5mm', materialOptionId: null, displayName: 'Supply: Cable (Allowance)', unit: 'm', inputType: 'quantity', baseQuantity: 5, }, ], },
    { id: 'starter-paint-room-basic', name: 'Starter Kit: Basic Room Paint (Per m²)', description: 'Basic prep and paint supply/labour per square meter of wall.', tags: ['painting', 'prep', 'finish'], isGlobal: true, lineItems: [ { taskId: 'paint-wall-prep', materialId: null, materialOptionId: null, displayName: 'Labour: Prepare Wall Surface', unit: 'm²', inputType: 'quantity', baseQuantity: 1, }, { taskId: 'supply-paint-standard', materialId: 'paint-standard-white', materialOptionId: '4l', displayName: 'Supply: Standard Wall Paint', unit: 'm²', inputType: 'quantity', baseQuantity: 0.1, }, { taskId: 'labour-general', materialId: null, materialOptionId: null, displayName: 'Labour: Apply Paint', unit: 'm²', inputType: 'quantity', baseQuantity: 0.1, }, ], }
];

// 5. User Specific Data (Example for TEST_USER_ID)
let userRateTemplatesData = [];
let userCustomTasksData = [];
let userCustomMaterialsData = [];
let userKitTemplatesData = [];

if (TEST_USER_ID) {
    userRateTemplatesData = [
        { taskId: 'install-gpo-double', materialId: null, materialOptionId: null, displayName: 'My Rate: Install Standard GPO', referenceRate: 85.0, unit: 'each', inputType: 'quantity', order: 1, },
        { taskId: null, materialId: 'gpo-double-white', materialOptionId: 'white', displayName: 'My Price: Supply GPO White', referenceRate: 12.5, unit: 'each', inputType: 'quantity', order: 2, },
        { taskId: 'labour-general', materialId: null, materialOptionId: null, displayName: 'My Hourly Rate', referenceRate: 95.0, unit: 'hour', inputType: 'quantity', order: 0, },
    ];
    userCustomTasksData = [
        { id: 'custom-site-clean-user', name: 'Custom: End of Day Site Clean', description: 'User specific task for daily site cleanup.', defaultUnit: 'allowance', },
    ];
    userCustomMaterialsData = [
        { id: 'custom-widget-deluxe-user', name: 'Custom: Deluxe Widget', description: 'A special widget only I use.', searchKeywords: ['widget', 'custom', 'deluxe'], optionsAvailable: true, options: [ { id: 'red', name: 'Red Finish' }, { id: 'blue', name: 'Blue Finish' }, ], },
        { id: 'custom-bracket-small-user', name: 'Custom: Small Bracket', description: 'User specific small bracket', searchKeywords: ['bracket', 'small', 'custom'], optionsAvailable: false, options: [], },
    ];
    userKitTemplatesData = [
        { name: 'My Kit: Deluxe Widget Install', description: 'Labour and custom material for widget.', tags: ['custom', 'widget'], isGlobal: false, lineItems: [ { taskId: 'labour-general', materialId: null, materialOptionId: null, displayName: 'Labour: Install Widget', unit: 'hour', inputType: 'quantity', baseQuantity: 0.5, }, { taskId: null, materialId: 'custom-widget-deluxe-user', materialOptionId: 'red', displayName: 'Supply: Deluxe Widget (Red)', unit: 'each', inputType: 'quantity', baseQuantity: 1, }, ], },
    ];
}


// --- Seeding Functions ---

/**
 * Seeds a collection with data using batched writes.
 * Uses the globally available 'serverTimestamp' function.
 * @param {admin.firestore.Firestore} dbInstance - Firestore database instance (passed as argument).
 * @param {string} collectionPath - Path to the collection.
 * @param {Array<Object>} data - Array of data objects to seed.
 * @param {string | null} idField - Field for document ID.
 * @param {string | null} userId - User ID for subcollections.
 * @returns {Promise<Object>} ID map.
 */
async function seedCollection(
    dbInstance, // Use the passed Firestore instance
    collectionPath,
    data,
    idField = null,
    userId = null
) {
    const collectionRef = dbInstance.collection(collectionPath);
    let batch = dbInstance.batch();
    let count = 0;
    const MAX_BATCH_SIZE = 400;
    const idMap = {};

    console.log(`Seeding collection: ${collectionPath}...`);

    for (const item of data) {
        let docId = null;
        let docData = { ...item };

        if (idField && item[idField]) {
            docId = item[idField];
            delete docData[idField];
        }

        if (docData.name) docData.name_lowercase = docData.name.toLowerCase();
        if (docData.displayName) docData.displayName_lowercase = docData.displayName.toLowerCase();

        // *** Use the globally scoped serverTimestamp function ***
        docData.createdAt = serverTimestamp();
        docData.updatedAt = serverTimestamp();

        if (userId && collectionPath.startsWith('users/')) {
            docData.userId = userId;
        }

        const options = docData.options;
        delete docData.options;

        const docRef = docId ? collectionRef.doc(docId) : collectionRef.doc();
        if (docId) idMap[docId] = docRef.id;

        batch.set(docRef, docData);
        count++;

        // Handle options subcollection (asynchronously)
        if (options && Array.isArray(options) && options.length > 0) {
            batch.update(docRef, { optionsAvailable: true });
            // Pass dbInstance down to the recursive/parallel call
            seedCollection(dbInstance, `${docRef.path}/options`, options, 'id', userId)
                .catch(err => console.error(`Error seeding options for ${docRef.path}:`, err));
        } else if (collectionPath === 'materials' || collectionPath.endsWith('/customMaterials')) {
             batch.update(docRef, { optionsAvailable: false });
        }

        // Commit batch periodically
        if (count % MAX_BATCH_SIZE === 0) {
            console.log(`  Committing batch of ${MAX_BATCH_SIZE}...`);
            await batch.commit();
            batch = dbInstance.batch(); // Start a new batch using the passed instance
        }
    }

    // Commit any remaining items
    if (count % MAX_BATCH_SIZE !== 0) {
        console.log(`  Committing final batch of ${count % MAX_BATCH_SIZE}...`);
        await batch.commit();
    }

    console.log(
        `Seeding complete for ${collectionPath}. Total documents: ${count}`
    );
    return idMap;
}

/**
 * Seeds all global collections.
 * @param {admin.firestore.Firestore} dbInstance - The Firestore instance.
 */
async function seedGlobalCollections(dbInstance) {
    console.log('\n--- Seeding Global Collections ---');
    // Pass dbInstance to the seeding functions
    await seedCollection(dbInstance, 'areas', areasData, 'id');
    const taskMap = await seedCollection(dbInstance, 'tasks', tasksData, 'id');
    const materialMap = await seedCollection(dbInstance, 'materials', materialsData, 'id');

    // Prepare Kit Templates - Replace descriptive IDs with actual Firestore IDs
    const processedKitTemplates = kitTemplatesData.map(kit => {
        const processedKit = { ...kit, lineItems: [] };
        processedKit.lineItems = kit.lineItems.map(item => ({
             ...item,
             taskId: item.taskId ? taskMap[item.taskId] || item.taskId : null,
             materialId: item.materialId ? materialMap[item.materialId] || item.materialId : null,
             // materialOptionId remains descriptive ID used in subcollection
        }));
        return processedKit;
    });

    await seedCollection(dbInstance, 'kitTemplates', processedKitTemplates, 'id');
    console.log('--- Global Collections Seeding Complete ---');
    return { taskMap, materialMap };
}

/**
 * Seeds user-specific data.
 * @param {admin.firestore.Firestore} dbInstance - The Firestore instance.
 * @param {string | null} userId - The user ID (or null/undefined to skip).
 * @param {object} globalMaps - Maps of global task/material IDs.
 */
async function seedUserData(dbInstance, userId, globalMaps) {
    if (!userId) {
        console.log('\nSkipping user-specific data seeding (TEST_USER_ID not set).');
        return;
    }

    console.log(`\n--- Seeding User Data for ${userId} ---`);
    // Use the passed dbInstance
    const userRef = dbInstance.collection('users').doc(userId);

    // Ensure user profile exists (using global serverTimestamp function)
    await userRef.set({
        email: `${userId}@example.com`,
        displayName: `Test User ${userId}`,
        businessName: 'Test Business Inc.',
        createdAt: serverTimestamp(), // Call the function
        updatedAt: serverTimestamp(), // Call the function
        abn: null, logoUrl: null, defaultTerms: 'Standard Test Terms.'
    }, { merge: true });
    console.log(`Ensured basic profile exists for user ${userId}`);

    // Pass dbInstance down for user's subcollections
    const customTaskMap = await seedCollection(dbInstance, `users/${userId}/customTasks`, userCustomTasksData, 'id', userId);
    const customMaterialMap = await seedCollection(dbInstance, `users/${userId}/customMaterials`, userCustomMaterialsData, 'id', userId);

    // Prepare and seed Rate Templates
    const processedRateTemplates = userRateTemplatesData.map(rate => ({
        ...rate,
        taskId: rate.taskId ? globalMaps.taskMap[rate.taskId] || rate.taskId : null,
        materialId: rate.materialId ? globalMaps.materialMap[rate.materialId] || rate.materialId : null,
    }));
    await seedCollection(dbInstance, `users/${userId}/rateTemplates`, processedRateTemplates, null, userId); // Auto-generate IDs

    // Prepare and seed User Kit Templates
     const processedUserKits = userKitTemplatesData.map(kit => {
        const processedKit = { ...kit, lineItems: [] };
        processedKit.lineItems = kit.lineItems.map(item => ({
             ...item,
             taskId: item.taskId ? globalMaps.taskMap[item.taskId] || customTaskMap[item.taskId] || item.taskId : null, // Check global then custom
             materialId: item.materialId ? globalMaps.materialMap[item.materialId] || customMaterialMap[item.materialId] || item.materialId : null, // Check global then custom
        }));
        return processedKit;
    });
    await seedCollection(dbInstance, `users/${userId}/kitTemplates`, processedUserKits, null, userId); // Auto-generate IDs

    console.log(`--- User Data Seeding Complete for ${userId} ---`);
}


// --- Main Execution ---
// Use an async IIFE (Immediately Invoked Function Expression) to allow top-level await
(async () => {
    try {
        console.log('Starting Firestore seeding process...');

        // Ensure db is initialized before proceeding
        if (!db) {
            throw new Error("Firestore database instance (db) is not initialized. Check initialization block.");
        }

        // 'db' is accessible here because it was declared in the higher scope
        // Pass the db instance to the seeding functions
        const globalMaps = await seedGlobalCollections(db);
        await seedUserData(db, TEST_USER_ID, globalMaps);

        console.log('\nFirestore seeding process completed successfully!');
    } catch (error) {
        // Catch errors from initialization or seeding
        console.error('\nError during Firestore seeding:', error);
        process.exit(1); // Exit with error code
    }
})();