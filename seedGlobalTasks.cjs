// seedGlobalTasks.cjs
const admin = require('firebase-admin');

// --- IMPORTANT: Path to your Firebase Admin SDK private key ---
// Ensure this path is correct or place 'serviceAccountKey.json' in the same directory.
const serviceAccount = require('./serviceAccountKey.json');

try {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    console.log("Firebase Admin SDK initialized successfully.");
} catch (error) {
    console.error("Error initializing Firebase Admin SDK:", error.message);
    console.error("Make sure 'serviceAccountKey.json' is present and correctly configured.");
    process.exit(1);
}

const db = admin.firestore();
const tasksCollectionRef = db.collection('tasks');

const newTasksData = [
    { name: "Install only", defaultUnit: "item", description: "Installation service only." },
    { name: "Supply & install", defaultUnit: "item", description: "Supply of materials and installation service." },
    { name: "Apply", defaultUnit: "item", description: "Application of a product or finish." }, // Could be 'm²' or 'coat' depending on context
    { name: "Supply & lay", defaultUnit: "item", description: "Supply of materials and laying service." }, // Could be 'm²' or 'lm'
    { name: "Remove", defaultUnit: "item", description: "Removal of existing items." },
    { name: "Remove & dispose", defaultUnit: "item", description: "Removal and disposal of existing items." },
    { name: "Grind & prepare", defaultUnit: "m²", description: "Grinding and preparation of surfaces." },
    { name: "Cut and chase", defaultUnit: "lm", description: "Cutting and chasing for services." }, // lm for linear meter
    { name: "Rough in and fit off", defaultUnit: "point", description: "Complete electrical or plumbing service from rough-in to fit-off." },
    { name: "Reinstate all items mentioned", defaultUnit: "lot", description: "Reinstatement of all specified items." },
    { name: "Reinstate", defaultUnit: "item", description: "Reinstatement of an item." },
    { name: "Remove & Ready for Reinstatement", defaultUnit: "item", description: "Remove existing items and prepare area for reinstatement." }
];

async function deleteAllExistingTasks() {
    console.log("Deleting existing tasks from global /tasks collection...");
    try {
        const snapshot = await tasksCollectionRef.get();
        if (snapshot.empty) {
            console.log("No existing tasks found to delete.");
            return 0;
        }

        const batch = db.batch();
        snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });

        await batch.commit();
        console.log(`Successfully deleted ${snapshot.size} tasks.`);
        return snapshot.size;
    } catch (error) {
        console.error("Error deleting existing tasks:", error);
        throw error; // Re-throw to be caught by the main execution block
    }
}

async function seedNewTasks() {
    console.log("Seeding new tasks into global /tasks collection...");
    try {
        const batch = db.batch();
        let count = 0;

        newTasksData.forEach(task => {
            const docRef = tasksCollectionRef.doc(); // Auto-generate ID
            const taskData = {
                name: task.name,
                name_lowercase: task.name.toLowerCase(),
                description: task.description || "", // Use provided description or empty string
                defaultUnit: task.defaultUnit || "item", // Use provided unit or default to 'item'
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            };
            batch.set(docRef, taskData);
            count++;
        });

        await batch.commit();
        console.log(`Successfully seeded ${count} new tasks.`);
        return count;
    } catch (error) {
        console.error("Error seeding new tasks:", error);
        throw error; // Re-throw
    }
}

async function main() {
    try {
        await deleteAllExistingTasks();
        await seedNewTasks();
        console.log("\nGlobal tasks seeding process completed successfully!");
    } catch (error) {
        console.error("\nGlobal tasks seeding process failed:", error.message);
        process.exit(1);
    }
}

// Execute the main function
main();