import express from "express";
import { OpenAI } from "openai";

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

router.post("/", async (req, res) => {
  console.log("------ ERP ADVISOR API CALLED ------");
  const { erpDraft } = req.body;
  if (!erpDraft) {
    return res.status(400).json({ error: "No ERP draft submitted" });
  }

  // --- Lock down original notify field ---
  const originalNotify = erpDraft.notify;

  try {
    const aiPrompt = `
IMPORTANT: You must NEVER modify the "notify" field or suggest changes to who should be notified. Only the user can set who to notify. If you believe there is a problem, add a comment in industryNotes, but DO NOT change the notify field in corrections or improved fields.

You are an offshore safety Emergency Response Protocol (ERP) advisor.
Your guidance MUST align with these global standards: IMCA, IOGP, OSHA, ISO 45001, NORSOK, ISGOTT, FEMA.
ALSO, apply FMECA (Failure Modes, Effects, and Criticality Analysis) to review gaps.

Given this ERP submission:
Type: ${erpDraft?.type}
Keywords: ${erpDraft?.keywords}
Notify: ${erpDraft?.notify}
Protocol: ${erpDraft?.protocol}

Your job:
- Carefully analyze the *type* and protocol, even if it is not fire (e.g. gas leak, oil spill, explosion, injury, loss of comms, medical emergency, evacuation, equipment failure, etc).
- Suggest robust keywords, including common misspellings and all related terms for the scenario type.
- Always suggest corrections and improvements even for unusual, incomplete, or rare scenarios (do not leave any field blank; always make your best guess based on global standards).
- If the protocol is missing or weak, invent a model answer based on international best practice.
- If you can't match a standard, synthesize the best possible steps from related standards and practical experience.
- Even if the protocol is already excellent, **always provide actionable comments, suggestions, or risk notes** for further improvement, resilience, or clarity.
- If you have nothing to correct, provide praise and still include new insights or recent lessons from incidents globally.

Return ONLY a single valid JSON object. DO NOT include any commentary, Markdown, or text before or after the JSON. Output only JSON, nothing else.

{
  corrections: {...},           // corrections to type, keywords, protocol (NEVER notify), always fill even if 'none'
  improvedKeywords: "...",      // exhaustive, typo-proof, scenario-specific
  improvedProtocol: "...",      // a much improved protocol step-by-step, even if just minor tweaks or added details
  modelReference: "...",        // best-practice template
  missingSteps: "...",          // any missing actions or steps, or confirm "All main steps present, but consider [additional tip]"
  industryNotes: "...",         // links to real standards, or a summary of global guidance
  fmecaTable: [
    { mode: "", effect: "", control: "", criticality: "" }
  ]
}

Example: If the type is "gas leak", suggest keywords like: gas leak, leakage, H2S, hydrogen sulphide, alarm, detector, ventilation, toxic, etc.

Never say you "cannot provide suggestions". Always do your best to give practical, scenario-specific advice for any situation, common or rare.
`;

    // Make the OpenAI API call
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "system", content: aiPrompt }]
    });

    let aiResult;
    const content = response.choices[0].message.content;

    // Remove code block markers and ALL whitespace before/after
    const cleaned = content.replace(/^[\s`]*```json[\s`]*/i, '')
                          .replace(/```[\s`]*$/i, '')
                          .trim();

    // Try parsing cleaned directly
    try {
      aiResult = JSON.parse(cleaned);
    } catch (err1) {
      // Extract *largest* JSON object/array block (robust fallback)
      const jsonMatch = cleaned.match(/({[^]*})|($begin:math:display$[^]*$end:math:display$)/);
      if (jsonMatch) {
        try {
          aiResult = JSON.parse(jsonMatch[0]);
        } catch (err2) {
          aiResult = {
            error: "AI response could not be parsed as JSON (block match).",
            raw: content,
            parseError: err2?.toString()
          };
        }
      } else {
        aiResult = {
          error: "AI response could not be parsed as JSON (no JSON block found).",
          raw: content,
          parseError: err1?.toString()
        };
      }
    }
    if (aiResult.error) {
      console.error("RAW AI OUTPUT:\n", content);
    }

    // --- Always lock back original notify field ---
    if (!aiResult.error) {
      aiResult.corrections = aiResult.corrections ?? {};
      // Remove any AI modification of notify
      if ("notify" in aiResult.corrections) {
        aiResult.corrections.notify = originalNotify;
      }
      // You could also fully delete the field to make sure:
      // delete aiResult.corrections.notify;

      aiResult.improvedKeywords = aiResult.improvedKeywords ?? "No additional keywords found. Protocol is robust.";
      aiResult.improvedProtocol = aiResult.improvedProtocol ?? "No improvements necessary. Protocol meets global best practice.";
      aiResult.modelReference = aiResult.modelReference ?? "See IMCA/ISO45001 for reference protocols.";
      aiResult.missingSteps = aiResult.missingSteps ?? "All key steps present. Review for site-specific needs.";
      aiResult.industryNotes = aiResult.industryNotes ?? "Protocol aligns with current global guidance.";
      aiResult.fmecaTable = Array.isArray(aiResult.fmecaTable) ? aiResult.fmecaTable : [];
    }

    // Add one last guarantee (the top-level notify, just in case)
    if (aiResult.notify !== undefined) {
      aiResult.notify = originalNotify;
    }

    res.json(aiResult);

  } catch (err) {
    console.error("AI ERP advisor error:", err);
    res.status(500).json({ error: "AI review failed", details: String(err) });
  }
});

export default router;