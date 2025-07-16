import express from "express";
import { OpenAI } from "openai";

const router = express.Router();

// Use env var, never hardcode your secret
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

router.post("/", async (req, res) => {
  console.log("------ ERP ADVISOR API CALLED ------");
  console.log("Request body:", req.body);
  console.log("API Key present?", !!process.env.OPENAI_API_KEY);

  const { erpDraft } = req.body;

  try {
    const aiPrompt = `
You are an offshore safety Emergency Response Protocol (ERP) advisor.
Your guidance MUST align with these global standards: IMCA, IOGP, OSHA, ISO 45001, NORSOK, ISGOTT, FEMA.
ALSO, apply FMECA (Failure Modes, Effects, and Criticality Analysis) to review gaps.

Given this ERP:
Type: ${erpDraft?.type}
Keywords: ${erpDraft?.keywords}
Notify: ${erpDraft?.notify}
Protocol: ${erpDraft?.protocol}

Perform these steps:
1. Check all fields (type, keywords, notify, protocol) for spelling/clarity.
2. Suggest typo-proof, robust, and exhaustive keywords (comma-separated).
3. Critique and improve protocol steps, referencing international best practices and FMECA.
4. Highlight any missing steps using FMECA (failure modes, effects, controls, criticality).
5. If the ERP is weak, propose a “model answer” ERP based on these standards.
6. Suggest at least one real-world improvement for resilience, clarity, or compliance.

Return as pure JSON (no preamble):
{
  corrections: {...},
  improvedKeywords: "...",
  improvedProtocol: "...",
  modelReference: "...",
  missingSteps: "...",
  industryNotes: "...",
  fmecaTable: [
    { mode: "", effect: "", control: "", criticality: "" }
  ]
}
`;

    // Make the OpenAI API call
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "system", content: aiPrompt }]
    });

    let aiResult;
    try {
      aiResult = JSON.parse(response.choices[0].message.content);
    } catch (err) {
      aiResult = { raw: response.choices[0].message.content, parseError: err?.toString() };
    }

    console.log("AI Result:", aiResult);

    res.json(aiResult);

  } catch (err) {
    console.error("AI ERP advisor error:", err);
    res.status(500).json({ error: "AI review failed", details: String(err) });
  }
});

export default router;