// server.js  —  Complete ESM Express server for Security AI Form

import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai";

// ---------- Setup ----------
const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: "1mb" }));

// paths for static/site
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// serve the static front-end from ./public (index.html etc.)
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ---------- OpenAI ----------
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // set in Render → Environment
});

// ---------- Helpers ----------
function sanitize(txt) {
  return (txt ?? "").toString().trim();
}

function buildPrompt(form) {
  // form is the JSON sent from the browser; map all fields safely
  const p = {
    businessName:          sanitize(form.businessName),
    contactName:           sanitize(form.contactName),
    phone:                 sanitize(form.phone),
    email:                 sanitize(form.email),
    address:               sanitize(form.address),
    businessActivity:      sanitize(form.businessActivity),
    employees:             sanitize(form.employees),
    facility:              sanitize(form.facility),
    currentSecurity:       sanitize(form.currentSecurity),
    pastIncidents:         sanitize(form.pastIncidents),
    threatConcerns:        sanitize(form.threatConcerns),
    criticalAssets:        sanitize(form.criticalAssets),
    emergencyPreparedness: sanitize(form.emergencyPreparedness),
    desiredOutcomes:       sanitize(form.desiredOutcomes),
  };

  return `
You are a senior security consultant. Based on the client's intake answers, write a concise,
clear **Business Security & Emergency Preparedness Assessment**.

Tone: professional, international English (no local slang). Avoid speculation; use best practices.

Structure (use markdown headings and lists):
1) Executive Summary (3–6 bullet points)
2) Organization Overview (2–4 sentences)
3) Current Security Posture (bullets)
4) Identified Risks & Gaps (bullets, prioritize)
5) Recommended Controls
   - Physical Security
   - Operational Procedures
   - Technology (CCTV/VMS, ACS, alarms, networking)
   - Emergency Preparedness & BCM
6) Quick-Win Actions (0–30 days)
7) Medium-Term Roadmap (30–180 days)
8) Notes & Assumptions

Client data:
- Business Name: ${p.businessName}
- Primary Contact: ${p.contactName}
- Phone: ${p.phone}
- Email: ${p.email}
- Address: ${p.address}
- Business Activity: ${p.businessActivity}
- # Employees: ${p.employees}
- Facility Characteristics: ${p.facility}
- Current Security Measures: ${p.currentSecurity}
- Past Incidents: ${p.pastIncidents}
- Threat Concerns: ${p.threatConcerns}
- Critical Assets: ${p.criticalAssets}
- Emergency Preparedness: ${p.emergencyPreparedness}
- Desired Outcomes: ${p.desiredOutcomes}
`;
}

// Turn minimal markdown to readable plain text for PDF
function mdToPlain(md) {
  return md
    .replace(/^###\s+/gm, "")  // h3
    .replace(/^##\s+/gm, "")   // h2
    .replace(/^#\s+/gm, "")    // h1
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/^- /gm, "• ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ---------- API: Generate PDF ----------
app.post("/generate-pdf", async (req, res) => {
  try {
    const form = req.body || {};
    const prompt = buildPrompt(form);

    // Call OpenAI (cheap & capable model)
    const ai = await client.responses.create({
      model: "gpt-4.1-mini",
      input: [
        { role: "system", content: "You generate structured security assessment text." },
        { role: "user", content: prompt },
      ],
    });

    const aiText =
      ai?.output_text?.trim() ||
      "Security assessment could not be generated at this time.";

    // Create PDF
    const pdfName = "Security_Assessment_Report.pdf";
    const pdfPath = path.join("/tmp", pdfName);

    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(pdfPath);
    doc.pipe(stream);

    // Title
    doc.fontSize(20).text("Security Assessment Report", { underline: true });
    doc.moveDown();

    // Header fields
    doc.fontSize(12).text("Business Security & Emergency Preparedness Assessment");
    if (form.businessName) doc.text(`Business Name: ${form.businessName}`);
    if (form.contactName)  doc.text(`Contact Name: ${form.contactName}`);
    doc.moveDown();

    // Body
    doc.fontSize(11).text(mdToPlain(aiText), {
      width: 500,
      align: "left",
    });

    doc.end();

    stream.on("finish", () => {
      // Send file then delete
      res.download(pdfPath, pdfName, () => {
        try { fs.unlinkSync(pdfPath); } catch {}
      });
    });

    stream.on("error", (e) => {
      console.error("PDF stream error:", e);
      res.status(500).json({ error: "PDF stream error", details: e.message });
    });
  } catch (err) {
    console.error("GEN_ERR:", err?.stack || err);
    // Common failure: 401/429/quota
    res.status(500).json({
      error: "AI or PDF error",
      details:
        err?.message ||
        "OpenAI request failed (check API key or billing) or PDF creation error.",
    });
  }
});

// ---------- Start ----------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("✅ Security AI backend running on", PORT));
