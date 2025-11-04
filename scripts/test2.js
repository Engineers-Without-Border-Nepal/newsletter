const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  },
});

const mailingList = ["shubhamshakya369@gmail.com"]

const logFilePath = path.join(__dirname, "email_log.txt");

async function main() {
  const htmlContent = fs.readFileSync(
    path.join(__dirname, "..", "july_edition.html"),
    "utf-8"
  );

  for (const recipient of mailingList) {
    try {
      await transporter.sendMail({
        from: '"shubhamshakya369@gmail.com" <shubhamshakya369@gmail.com>',
        to: recipient,
        subject: "EWBN Newsletter | March Edition",
        html: htmlContent,
      });

      console.log(`${recipient} - success`);
      fs.appendFileSync(logFilePath, `${recipient},success\n`);
    } catch (error) {
      console.log(`${recipient} - fail (${error.message})`);
      fs.appendFileSync(logFilePath, `${recipient},fail\n`);
    }
  }
}

main().catch(console.error);
