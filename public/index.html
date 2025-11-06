// server.js  (ESM)
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import PDFDocument from "pdfkit";
import fs from "fs";
import { OpenAI } from "openai";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(cors());
app.use(bodyParser.json());

// ---------- OpenAI ----------
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ---------- Static site ----------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "public")));

// דף הבית (יש לנו public/index.html)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ---------- יצירת PDF ע"י AI ----------
app.post("/generate-pdf", async (req, res) => {
  console.log("POST /generate-pdf", Object.keys(req.body || {}));

  try {
    const formData = req.body || {};
    const prompt = `
You are a security consultant. Based on the intake form below,
write a concise one-page "Business Security & Emergency Preparedness Assessment"
with clear headings and bullet points.

Intake:
${JSON.stringify(formData, null, 2)}
`;

    // קריאה ל-OpenAI (API החדש)
    const ai = await client.responses.create({
      model: "gpt-4.1-mini",
      input: [
        { role: "system", content: "You are a senior security analyst." },
        { role: "user", content: prompt }
      ]
    });

    const aiText = ai.output_text || "No AI output.";

    // הכנת PDF זמני בתיקיית /tmp (נדרש ב-Render)
    const pdfName = "Security_Assessment_Report.pdf";
    const pdfPath = `/tmp/${pdfName}`;
    const doc = new PDFDocument({ margin: 40 });
    const stream = fs.createWriteStream(pdfPath);
    doc.pipe(stream);

    doc.fontSize(18).text("Security Assessment Report", { underline: true });
    doc.moveDown();
    doc.fontSize(12).text(aiText, { align: "left" });
    doc.end();

    stream.on("finish", () => {
      console.log("PDF ready:", pdfPath);
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
    res.status(500).json({ error: "AI or PDF error", details: err?.message });
  }
});

// ---------- Start server ----------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("✅ Security AI backend running on", PORT));
