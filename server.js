import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import PDFDocument from "pdfkit";
import fs from "fs";
import { OpenAI } from "openai";

const app = express();
app.use(cors());
app.use(bodyParser.json());
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, "public")));

// ------ OpenAI Client ------
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ------ MAIN API: Build report ------
app.post("/generate-report", async (req, res) => {
  try {
    const { answers } = req.body;

    if (!answers) {
      return res.status(400).json({ error: "Missing 'answers' field" });
    }

    // Ask AI to generate the security assessment text
    const prompt = `
      You are an expert in physical security, emergency preparedness,
      critical infrastructure protection and operational risk.
      Based on the following survey answers, create a clear, structured,
      professional security assessment with:
      - Risk Summary
      - Key Vulnerabilities
      - Recommended Actions
      - Priority Levels (High / Medium / Low)

      Survey answers:
      ${JSON.stringify(answers, null, 2)}
    `;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    });

    const aiText = completion.choices[0].message.content;

    // Generate PDF file
    const pdfName = `security-report-${Date.now()}.pdf`;
    const pdfPath = `/tmp/${pdfName}`;

    const doc = new PDFDocument();
    const stream = fs.createWriteStream(pdfPath);
    doc.pipe(stream);

    doc.fontSize(20).text("Security Assessment Report", { underline: true });
    doc.moveDown();
    doc.fontSize(12).text(aiText);

    doc.end();

    stream.on("finish", () => {
      res.download(pdfPath, pdfName, () => {
        fs.unlinkSync(pdfPath);
      });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "AI or PDF error", details: err.message });
  }
});

// Serve static files
app.use(express.static("public"));

// Homepage
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ---- Start server ----
app.listen(process.env.PORT || 3000, () =>
  console.log("✅ Security AI backend running")
);
