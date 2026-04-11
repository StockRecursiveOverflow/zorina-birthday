require('dotenv').config();
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// ── Config ──────────────────────────────────────────────────────────────────
const RSVP_EMAIL = process.env.GMAIL_USER;
const DRY_RUN    = process.argv.includes('--dry-run'); // preview without sending

// ── Load contacts ────────────────────────────────────────────────────────────
const contacts = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'contacts.json'), 'utf8')
);

// ── Load HTML template ───────────────────────────────────────────────────────
const templateRaw = fs.readFileSync(
  path.join(__dirname, 'template.html'), 'utf8'
);

function buildEmail(name) {
  return templateRaw
    .replace(/\{\{NAME\}\}/g,       name)
    .replace(/\{\{RSVP_EMAIL\}\}/g, RSVP_EMAIL);
}

// ── Gmail transporter ────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,   // App Password, NOT your Gmail password
  },
});

// ── Send ─────────────────────────────────────────────────────────────────────
async function run() {
  console.log(`\n🎂 Zorina Birthday Invitations`);
  console.log(`   Contacts loaded : ${contacts.length}`);
  console.log(`   Mode            : ${DRY_RUN ? '🔍 DRY RUN (no emails sent)' : '📨 LIVE SEND'}\n`);

  let sent = 0, failed = 0;

  for (const contact of contacts) {
    const { name, email } = contact;
    const html = buildEmail(name);

    if (DRY_RUN) {
      console.log(`  ✅ [dry-run] Would send to ${name} <${email}>`);
      continue;
    }

    try {
      await transporter.sendMail({
        from    : `"${process.env.FROM_NAME}" <${process.env.GMAIL_USER}>`,
        to      : `"${name}" <${email}>`,
        subject : `🎂 You're Invited to Zorina's Birthday Party!`,
        html,
      });
      console.log(`  ✅ Sent → ${name} <${email}>`);
      sent++;

      // Small delay to avoid Gmail rate limits
      await new Promise(r => setTimeout(r, 400));
    } catch (err) {
      console.error(`  ❌ Failed → ${name} <${email}> : ${err.message}`);
      failed++;
    }
  }

  if (!DRY_RUN) {
    console.log(`\n🎉 Done! Sent: ${sent}  Failed: ${failed}\n`);
  }
}

run().catch(console.error);
