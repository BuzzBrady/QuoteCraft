// QuoteCraftV6/seedEmulator.cjs
// Script to seed local Firebase Emulator from live Firestore data
// Focuses on a specific user's data and THEIR subcollections.

const admin = require("firebase-admin");

// --- Configuration ---
const LIVE_SERVICE_ACCOUNT_PATH = "./serviceAccountKey.json"; // ENSURE THIS FILENAME IS CORRECT and accessible
const LIVE_PROJECT_ID = "quotecraftv6"; // Your live Firebase Project ID
const EMULATOR_FIRESTORE_HOST_PORT = "localhost:8080"; // Expected FIRESTORE_EMULATOR_HOST value
const TARGET_USER_ID_TO_SEED_FROM = "test-user-node-cjs-123"; // The user whose data you want to copy

// --- Initialize LIVE Firebase Admin App (for reading) ---
let liveApp;
let liveDb;
try {
    const serviceAccount = require(LIVE_SERVICE_ACCOUNT_PATH);
    liveApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: LIVE_PROJECT_ID, // Explicitly setting projectId for clarity
    }, "liveAppForSeeding_" + Date.now()); // Unique app name to avoid conflicts
    liveDb = liveApp.firestore();
    
    // Diagnostic log: Confirm the project ID the liveApp is actually using
    const actualLiveProjectId = liveApp.options.projectId;
    console.log(`Successfully initialized liveApp. Configured LIVE_PROJECT_ID: ${LIVE_PROJECT_ID}. Actual liveApp.options.projectId: ${actualLiveProjectId}`);
    if (actualLiveProjectId !== LIVE_PROJECT_ID) {
        console.warn(`WARNING: Mismatch between configured LIVE_PROJECT_ID ('${LIVE_PROJECT_ID}') and actual liveApp.options.projectId ('${actualLiveProjectId}'). This could lead to connecting to the wrong live project.`);
    }
    console.log(`liveDb instance is targeting project: ${actualLiveProjectId}`);

} catch (error) {
    console.error(`Error connecting to LIVE Firestore using key at: ${LIVE_SERVICE_ACCOUNT_PATH}`);
    console.error("Please ensure the path is correct and the service account has 'Cloud Datastore User' or equivalent permissions.");
    console.error("Details:", error.message);
    if (error.code === 'MODULE_NOT_FOUND') {
        console.error(`Could not find the service account key file at: ${require.resolve(LIVE_SERVICE_ACCOUNT_PATH)}. Please check the path.`);
    }
    process.exit(1);
}

// --- Initialize Admin App to connect to EMULATOR (for writing) ---
// This uses the default Firebase app. If FIRESTORE_EMULATOR_HOST is set,
// the Firestore Admin SDK will automatically connect to the emulator.
let emulatorAdminDb;
try {
    // Initialize default app if it doesn't exist. This is for the emulator connection.
    if (!admin.apps.find(app => app && app.name === "[DEFAULT]")) {
        admin.initializeApp({ projectId: LIVE_PROJECT_ID }); // Use any valid project ID for emulator
    }
    emulatorAdminDb = admin.firestore();
    const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
    if (emulatorHost) {
        console.log(`Admin SDK configured to write to Firestore EMULATOR at: ${emulatorHost}`);
    } else {
        console.warn("WARNING: FIRESTORE_EMULATOR_HOST is not set. Admin SDK will target LIVE Firestore for writes!");
        // Potentially exit here if you want to be absolutely sure not to write to live by mistake from this part.
        // process.exit(1);
    }
} catch (e) {
    console.error("Error initializing Admin SDK for EMULATOR connection:", e);
    process.exit(1);
}

/**
 * Recursively seeds a collection and its configured child collections.
 * @param {admin.firestore.Firestore} sourceDb - The Firestore instance to read from (live).
 * @param {admin.firestore.Firestore} targetDb - The Firestore instance to write to (emulator).
 * @param {string} sourceCollectionPath - Full path to the source collection.
 * @param {string} targetCollectionPath - Full path to the target collection.
 * @param {object} collectionConfig - Configuration for the current collection, including
 * { name, limit, orderByField, orderDirection, childCollections }.
 */
async function seedCollectionRecursive(sourceDb, targetDb, sourceCollectionPath, targetCollectionPath, collectionConfig) {
    // Use liveApp directly as sourceDb.app might be unreliable here. liveApp is globally accessible.
    console.log(`  Querying LIVE collection: ${sourceCollectionPath} (from project: ${liveApp.options.projectId})`);
    let query = sourceDb.collection(sourceCollectionPath);

    if (collectionConfig.orderByField) {
        query = query.orderBy(collectionConfig.orderByField, collectionConfig.orderDirection || 'asc');
        console.log(`    Applying orderBy: ${collectionConfig.orderByField} ${collectionConfig.orderDirection || 'asc'}`);
    }

    const effectiveLimit = collectionConfig.limit || 20; // Default limit for safety
    query = query.limit(effectiveLimit);
    console.log(`    Applying limit: ${effectiveLimit}`);

    const liveSnaps = await query.get();

    if (!liveSnaps.empty) {
        const batch = targetDb.batch();
        console.log(`    Found ${liveSnaps.size} documents in LIVE '${sourceCollectionPath}'. Preparing to seed to '${targetCollectionPath}'.`);

        for (const docSnap of liveSnaps.docs) {
            const docData = docSnap.data();
            const targetDocRef = targetDb.collection(targetCollectionPath).doc(docSnap.id);
            batch.set(targetDocRef, docData);
            // console.log(`      Scheduled set for ${targetCollectionPath}/${docSnap.id}`);

            // Seed child collections if configured
            if (collectionConfig.childCollections && collectionConfig.childCollections.length > 0) {
                for (const childConfig of collectionConfig.childCollections) {
                    const sourceChildPath = `${sourceCollectionPath}/${docSnap.id}/${childConfig.name}`;
                    const targetChildPath = `${targetCollectionPath}/${docSnap.id}/${childConfig.name}`;
                    console.log(`    Recursively processing child collection: ${sourceChildPath}`);
                    await seedCollectionRecursive(
                        sourceDb, // This is liveDb
                        targetDb,
                        sourceChildPath,
                        targetChildPath,
                        childConfig // Pass the config for this specific child collection
                    );
                }
            }
        }
        try {
            await batch.commit();
            console.log(`    Successfully seeded ${liveSnaps.size} documents from '${sourceCollectionPath}' to '${targetCollectionPath}'.`);
        } catch (batchError) {
            console.error(`    Error committing batch for ${targetCollectionPath}:`, batchError);
        }
    } else {
        console.log(`    No documents found in LIVE '${sourceCollectionPath}'. Nothing to seed for this collection.`);
    }
}


// --- Main Seeding Function ---
async function seedData() {
    // Critical check: Ensure the script is targeting the emulator for writes.
    if (process.env.FIRESTORE_EMULATOR_HOST !== EMULATOR_FIRESTORE_HOST_PORT) {
        console.error(`CRITICAL: FIRESTORE_EMULATOR_HOST env var is '${process.env.FIRESTORE_EMULATOR_HOST}', but script expects '${EMULATOR_FIRESTORE_HOST_PORT}'.`);
        console.error("Aborting to prevent accidental writes to the wrong database.");
        process.exit(1);
    }

    console.log(`\nStarting data seed from LIVE project '${LIVE_PROJECT_ID}' to local Firestore emulator at ${EMULATOR_FIRESTORE_HOST_PORT}.`);
    console.log(`Targeting user ID: ${TARGET_USER_ID_TO_SEED_FROM}`);

    try {
        // --- DIAGNOSTIC STEP 1: Try to list all root collections from the live DB ---
        console.log(`\n[DIAGNOSTIC STEP 1] Attempting to list all root collections in LIVE project: ${liveApp.options.projectId}`);
        try {
            const collections = await liveDb.listCollections();
            if (collections.length === 0) {
                console.log("[DIAGNOSTIC STEP 1] liveDb.listCollections() returned an empty array. No collections found or accessible at the root.");
            } else {
                console.log(`[DIAGNOSTIC STEP 1] Found ${collections.length} root collection(s):`);
                collections.forEach(collection => {
                    console.log(`[DIAGNOSTIC STEP 1]   Collection ID: ${collection.id}`);
                });
            }
        } catch (listCollectionsError) {
            console.error("[DIAGNOSTIC STEP 1] Error listing collections:", listCollectionsError);
        }
        // --- END DIAGNOSTIC STEP 1 ---

        // --- DIAGNOSTIC STEP 2: Try to list some users from the live DB ---
        console.log(`\n[DIAGNOSTIC STEP 2] Attempting to list up to 5 users from the 'users' collection in LIVE project: ${liveApp.options.projectId}`);
        try {
            const usersCollectionRef = liveDb.collection('users');
            const usersSnapshot = await usersCollectionRef.limit(5).get();
            if (usersSnapshot.empty) {
                console.log("[DIAGNOSTIC STEP 2] The 'users' collection appears empty or is inaccessible by the script.");
            } else {
                console.log(`[DIAGNOSTIC STEP 2] Found ${usersSnapshot.size} user(s) in the first 5:`);
                usersSnapshot.forEach(doc => {
                    console.log(`[DIAGNOSTIC STEP 2]   User ID: ${doc.id}`);
                });
            }
        } catch (listError) {
            console.error("[DIAGNOSTIC STEP 2] Error listing users:", listError);
        }
        // --- END DIAGNOSTIC STEP 2 ---

        // 1. Fetch and Seed Target User's Profile Document
        console.log(`\nFetching LIVE user profile: users/${TARGET_USER_ID_TO_SEED_FROM} from project ${liveApp.options.projectId}`);
        const userProfileLiveRef = liveDb.doc(`users/${TARGET_USER_ID_TO_SEED_FROM}`);
        const userProfileLiveSnap = await userProfileLiveRef.get();

        if (userProfileLiveSnap.exists) {
            const userProfileData = userProfileLiveSnap.data();
            const userProfileEmuRef = emulatorAdminDb.doc(`users/${TARGET_USER_ID_TO_SEED_FROM}`);
            await userProfileEmuRef.set(userProfileData);
            console.log(`User profile for '${TARGET_USER_ID_TO_SEED_FROM}' seeded to emulator.`);

            // 2. Define User-Specific Subcollections to Seed (and their children)
            const userRootSubcollectionsConfig = [
                { name: "customTasks", limit: 20 },
                {
                    name: "customMaterials", limit: 20,
                    childCollections: [ // Child collections of each customMaterial document
                        { name: "options", limit: 10 }
                    ]
                },
                { name: "kitTemplates", limit: 20 },
                { name: "rateTemplates", limit: 20 },
                {
                    name: "quotes", limit: 5, orderByField: "createdAt", orderDirection: "desc",
                    childCollections: [ // Child collections of each quote document
                        { name: "quoteLines", orderByField: "order", limit: 50 }
                    ]
                }
            ];

            // 3. Seed Target User's Subcollections
            for (const collectionCfg of userRootSubcollectionsConfig) {
                const livePath = `users/${TARGET_USER_ID_TO_SEED_FROM}/${collectionCfg.name}`;
                const emuPath = `users/${TARGET_USER_ID_TO_SEED_FROM}/${collectionCfg.name}`;
                console.log(`\nProcessing user's root subcollection: ${collectionCfg.name} (from ${livePath})`);
                await seedCollectionRecursive(
                    liveDb,
                    emulatorAdminDb,
                    livePath,
                    emuPath,
                    collectionCfg
                );
            }

        } else {
            // Use liveApp.options.projectId directly here as well.
            console.log(`User profile for '${TARGET_USER_ID_TO_SEED_FROM}' not found in LIVE Firestore (checked project: ${liveApp.options.projectId}). No user-specific data will be seeded.`);
        }

        // 4. Global Collections (Skipped as per your context)
        console.log("\nSkipping global collection seeding (areas, tasks, etc.) as they are not targeted by this script.");

        console.log("\n--- Data seeding to emulator complete! ---");
        console.log("Refresh the Emulator UI (usually localhost:4000, then navigate to Firestore) to see the data.");
        console.log("If data is missing, check script logs for errors or 'No documents found' messages,");
        console.log("verify service account permissions, and ensure data exists in the live database for the target user.");
        process.exit(0);

    } catch (error) {
        console.error("\nFATAL ERROR during data seeding process:", error);
        process.exit(1);
    }
}

// --- Script Execution Logic ---
// Ensures FIRESTORE_EMULATOR_HOST is set correctly before running.
if (process.env.FIRESTORE_EMULATOR_HOST === EMULATOR_FIRESTORE_HOST_PORT) {
    console.log(`FIRESTORE_EMULATOR_HOST is correctly set to: ${process.env.FIRESTORE_EMULATOR_HOST}. Proceeding with seeding.`);
    seedData();
} else {
    console.error(`Error: FIRESTORE_EMULATOR_HOST environment variable is not set or is incorrect.`);
    console.error(`  Expected: '${EMULATOR_FIRESTORE_HOST_PORT}'`);
    console.error(`  Found:    '${process.env.FIRESTORE_EMULATOR_HOST || "Not Set"}'`);
    console.error(`Please set it correctly before running this script. For example, in Linux/macOS:`);
    console.error(`  export FIRESTORE_EMULATOR_HOST="${EMULATOR_FIRESTORE_HOST_PORT}"`);
    console.error(`  node seedEmulator.cjs`);
    console.error("Ensure your Firebase emulators (especially Firestore) are running and accessible at the specified host and port.");
    process.exit(1);
}
