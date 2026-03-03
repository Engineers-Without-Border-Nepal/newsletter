const admin = require("firebase-admin");
const XLSX = require("xlsx");
const { v4: uuidv4 } = require("uuid");
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
const EXCEL_FILE_PATH = path.join(__dirname, "..", "mailing_lists", "Newsletter.xlsx"); // Path to your Excel file
const EMAIL_COLUMN = "email"; // Column name in Excel that contains emails

async function bulkAddUsers() {
  try {
    // Read Excel file
    console.log(`Reading Excel file from: ${EXCEL_FILE_PATH}`);
    
    if (!fs.existsSync(EXCEL_FILE_PATH)) {
      console.error(`Error: Excel file not found at ${EXCEL_FILE_PATH}`);
      console.log("Please ensure the Excel file exists at the specified path.");
      process.exit(1);
    }

    const workbook = XLSX.readFile(EXCEL_FILE_PATH);
    const sheetName = workbook.SheetNames[0]; // Use first sheet
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    if (data.length === 0) {
      console.log("No data found in Excel file.");
      return;
    }

    console.log(`Found ${data.length} rows in Excel file`);

    // Validate email column exists
    if (!data[0].hasOwnProperty(EMAIL_COLUMN)) {
      console.error(`Error: Column "${EMAIL_COLUMN}" not found in Excel file.`);
      console.log(`Available columns: ${Object.keys(data[0]).join(", ")}`);
      process.exit(1);
    }

    const collectionRef = db.collection(COLLECTION_NAME);
    const batch = db.batch();
    let batchCount = 0;
    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    // Process each row
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const email = row[EMAIL_COLUMN];

      // Skip if email is empty or invalid
      if (!email || typeof email !== "string" || !email.includes("@")) {
        console.log(`Skipping row ${i + 1}: Invalid or missing email`);
        errorCount++;
        errors.push({ row: i + 1, email: email || "N/A", error: "Invalid or missing email" });
        continue;
      }

      // Generate UUID for userId
      const userId = uuidv4();
      const createdAt = admin.firestore.FieldValue.serverTimestamp();
      const isActive = true;

      // Create document reference
      const docRef = collectionRef.doc();
      
      // Add to batch
      batch.set(docRef, {
        userId,
        email: email.trim().toLowerCase(),
        isActive,
        createdAt,
      });

      batchCount++;

      // Firestore batches have a limit of 500 operations
      if (batchCount === 500) {
        try {
          await batch.commit();
          successCount += batchCount;
          console.log(`Committed batch: ${successCount} users added so far`);
          batchCount = 0;
        } catch (error) {
          console.error(`Error committing batch:`, error);
          errorCount += batchCount;
          errors.push({ batch: "current", error: error.message });
        }
      }
    }

    // Commit remaining batch
    if (batchCount > 0) {
      try {
        await batch.commit();
        successCount += batchCount;
        console.log(`Committed final batch: ${successCount} users added`);
      } catch (error) {
        console.error(`Error committing final batch:`, error);
        errorCount += batchCount;
        errors.push({ batch: "final", error: error.message });
      }
    }

    // Summary
    console.log("\n=== Bulk Import Summary ===");
    console.log(`Total rows processed: ${data.length}`);
    console.log(`Successfully added: ${successCount}`);
    console.log(`Errors: ${errorCount}`);

    if (errors.length > 0) {
      console.log("\n=== Errors ===");
      errors.forEach((err, idx) => {
        console.log(`${idx + 1}. Row ${err.row || "N/A"}: ${err.error}`);
      });
    }

    console.log(`\nUsers added to collection: ${COLLECTION_NAME}`);
  } catch (error) {
    console.error("Error in bulkAddUsers:", error);
    process.exit(1);
  }
}

// Run the function
bulkAddUsers()
  .then(() => {
    console.log("\nBulk import completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
