// createUser.cjs
// -------------
// Node.js script to create a specific user in Firebase Authentication
// using the Admin SDK. This is needed when the Firebase Console UI
// doesn't allow setting a custom UID during manual creation.

'use strict';

const admin = require('firebase-admin');

// --- Configuration ---

// 1. IMPORTANT: Set the path to your service account key file
const SERVICE_ACCOUNT_KEY_PATH = './serviceAccountKey.json'; // Make sure this path is correct!

// 2. IMPORTANT: Set the EXACT User ID (UID) string used in your seed script
const TARGET_USER_ID = 'test-user-node-cjs-123'; // Replace with your actual TEST_USER_ID from seedFirestore.cjs

// 3. Set the Email and a Temporary Password for this user
const USER_EMAIL = 'test-user-node-cjs-123@example.com'; // Use a unique email
const USER_PASSWORD = 'password123'; // Choose a temporary password - REMEMBER THIS!

// --- Firebase Admin Initialization ---
let auth;
try {
    const serviceAccount = require(SERVICE_ACCOUNT_KEY_PATH);

    // Avoid initializing multiple times if run accidentally after setup
    if (admin.apps.length === 0) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            // Optional: projectId if not in key file
            // projectId: 'YOUR_PROJECT_ID'
        });
    }
    auth = admin.auth(); // Get the Auth service instance
    console.log('Firebase Admin SDK initialized successfully.');

} catch (error) {
    console.error('Error initializing Firebase Admin SDK:', error);
    if (error.code === 'MODULE_NOT_FOUND') {
         console.error(`\n>>> Ensure the file "${SERVICE_ACCOUNT_KEY_PATH}" exists in the correct location relative to the script.`);
    }
    console.log('\nPlease also ensure:');
    console.log(`1. The file "${SERVICE_ACCOUNT_KEY_PATH}" is a valid JSON service account key.`);
    console.log(`2. You have run 'npm install firebase-admin'.`);
    process.exit(1);
}

// --- Create User Function ---
async function createTestUser() {
    console.log(`Attempting to create user with:\n  UID: ${TARGET_USER_ID}\n  Email: ${USER_EMAIL}`);

    try {
        const userRecord = await auth.createUser({
            uid: TARGET_USER_ID, // Set the specific UID
            email: USER_EMAIL,
            password: USER_PASSWORD,
            emailVerified: false, // You can set this to true if desired
            disabled: false, // Ensure the user is enabled
        });
        console.log('--------------------------------------------------');
        console.log('✅ Successfully created new user:');
        console.log(`   Email: ${userRecord.email}`);
        console.log(`   UID: ${userRecord.uid}`);
        console.log('--------------------------------------------------');
        console.log(`\n>>> You can now log in to your application using:`);
        console.log(`    Email: ${USER_EMAIL}`);
        console.log(`    Password: ${USER_PASSWORD}`);
        console.log('--------------------------------------------------');

    } catch (error) { // Removed ': any' annotation here
        console.error('\n❌ Error creating user:', error.message);
        // Error codes are generally reliable properties on Firebase errors
        if (error.code === 'auth/uid-already-exists') {
            console.error(`>>> The UID "${TARGET_USER_ID}" already exists in Firebase Authentication.`);
            console.error(`>>> Please check the Firebase Console. If the user exists, you can use its existing credentials or delete it and run this script again.`);
        } else if (error.code === 'auth/email-already-exists') {
            console.error(`>>> The email "${USER_EMAIL}" already exists in Firebase Authentication.`);
            console.error(`>>> Please choose a different email in the script or delete the existing user with that email.`);
        } else {
            console.error('>>> An unexpected error occurred.');
            console.error('Error Code:', error.code);
        }
        console.log('--------------------------------------------------');
        process.exit(1); // Exit with error code
    }
}

// --- Main Execution ---
(async () => {
    if (!TARGET_USER_ID || !USER_EMAIL || !USER_PASSWORD) {
        console.error('❌ Please configure TARGET_USER_ID, USER_EMAIL, and USER_PASSWORD at the top of the script.');
        process.exit(1);
    }
    await createTestUser();
})();
