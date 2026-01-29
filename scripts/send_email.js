const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");

require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const serviceAccount = require("../serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

console.log(serviceAccount);
const db = admin.firestore();

console.log("Environment variables check:");
console.log("EMAIL_USER:", process.env.EMAIL_USER ? "Loaded" : "Missing");
console.log(
  "EMAIL_PASSWORD:",
  process.env.EMAIL_PASSWORD ? "Loaded" : "Missing"
);

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

async function getSubscribersFromDatabase() {
  try {
    const subscribersRef = db.collection("chapter");
    const snapshot = await subscribersRef.where("isActive", "==", true).get();

    if (snapshot.empty) {
      console.log("No active subscribers found.");
      return [];
    }

    const subscribers = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.email && data.userId) {
        subscribers.push({
          email: data.email,
          userId: data.userId,
        });
      }
    });

    console.log(`Found ${subscribers.length} active subscribers`);
    return subscribers;
  } catch (error) {
    console.error("Error fetching subscribers:", error);
    return [];
  }
}

function personalizeEmailContent(htmlContent, userId) {
  return htmlContent.replace(/userid=409238740234/g, `userid=${userId}`);
}

const logFilePath = path.join(__dirname, "chapter_log.txt");

async function main() {
  const htmlContent = fs.readFileSync(
    path.join(__dirname, "..", "newsletters", "october_edition.html"),
    "utf-8"
  );

  const subscribers = await getSubscribersFromDatabase();

  if (subscribers.length === 0) {
    console.log("No subscribers found. Exiting.");
    return;
  }

  console.log(
    `Starting to send emails to ${subscribers.length} subscribers...`
  );

  let count = 1;
  for (const subscriber of subscribers) {
    try {
      const personalizedContent = personalizeEmailContent(
        htmlContent,
        subscriber.userId
      );

      await transporter.sendMail({
        from: '"EWB Nepal" <contact@ewb.org.np>',
        to: subscriber.email,
        subject: "EWBN Newsletter | October Edition",
        html: personalizedContent,
      });

      console.log(`${subscriber.email} - success ${count}`);
      count += 1;
      fs.appendFileSync(logFilePath, `${subscriber.email},success\n`);
    } catch (error) {
      console.log(`${subscriber.email} - fail (${error.message})`);
      fs.appendFileSync(logFilePath, `${subscriber.email},fail\n`);
    }
  }

  console.log(`\nEmail sending completed!`);
}

main().catch(console.error);
