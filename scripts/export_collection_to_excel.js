const admin = require("firebase-admin");
const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const serviceAccount = require("../serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// Configuration
const COLLECTION_NAME = "website_list"; // Change this to your desired collection name
const OUTPUT_DIR = path.join(__dirname, "..", "mailing_lists"); // Output directory
const OUTPUT_FILENAME = `${COLLECTION_NAME}_export_${new Date().toISOString().split('T')[0]}.xlsx`; // Output filename with date

// Helper function to convert Firestore data to plain JavaScript objects
function convertFirestoreData(data) {
  const converted = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) {
      converted[key] = "";
    } else if (value instanceof admin.firestore.Timestamp) {
      // Convert Firestore Timestamp to readable date string
      converted[key] = value.toDate().toISOString();
    } else if (value instanceof Date) {
      converted[key] = value.toISOString();
    } else if (typeof value === "object" && value.constructor === Object) {
      // Nested object - convert to JSON string
      converted[key] = JSON.stringify(value);
    } else if (Array.isArray(value)) {
      // Array - convert to comma-separated string
      converted[key] = value.join(", ");
    } else {
      converted[key] = value;
    }
  }
  
  return converted;
}

async function exportCollectionToExcel() {
  try {
    console.log(`Exporting collection: ${COLLECTION_NAME}`);
    
    // Get all documents from the collection
    const collectionRef = db.collection(COLLECTION_NAME);
    const snapshot = await collectionRef.get();

    if (snapshot.empty) {
      console.log(`No documents found in collection: ${COLLECTION_NAME}`);
      return;
    }

    console.log(`Found ${snapshot.size} documents`);

    // Convert documents to array of objects
    const data = [];
    snapshot.forEach((doc) => {
      const docData = doc.data();
      const convertedData = convertFirestoreData(docData);
      // Optionally add document ID
      convertedData._documentId = doc.id;
      data.push(convertedData);
    });

    // Create a new workbook
    const workbook = XLSX.utils.book_new();

    // Convert data to worksheet
    const worksheet = XLSX.utils.json_to_sheet(data);

    // Set column widths (optional - makes Excel file more readable)
    const maxWidths = {};
    data.forEach((row) => {
      Object.keys(row).forEach((key) => {
        const value = String(row[key] || "");
        const currentMax = maxWidths[key] || 10;
        maxWidths[key] = Math.max(currentMax, Math.min(value.length, 50));
      });
    });

    const colWidths = Object.keys(maxWidths).map((key) => ({
      wch: maxWidths[key],
    }));
    worksheet["!cols"] = colWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, COLLECTION_NAME);

    // Ensure output directory exists
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
      console.log(`Created output directory: ${OUTPUT_DIR}`);
    }

    // Write file
    const outputPath = path.join(OUTPUT_DIR, OUTPUT_FILENAME);
    XLSX.writeFile(workbook, outputPath);

    console.log(`\n=== Export Summary ===`);
    console.log(`Collection: ${COLLECTION_NAME}`);
    console.log(`Documents exported: ${data.length}`);
    console.log(`Output file: ${outputPath}`);
    console.log(`\nExport completed successfully!`);
  } catch (error) {
    console.error("Error exporting collection:", error);
    process.exit(1);
  }
}

// Run the function
exportCollectionToExcel()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
