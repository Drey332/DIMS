// server/ai-project-analytics.js

import express from "express";
import { OpenAI } from "openai";
import { getFirestore } from "firebase-admin/firestore";

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const db = getFirestore(); // assumes you've initialized firebase-admin!

/**
 * Pull ALL relevant data for a given projectId from Firestore.
 * (incidents = emergencies, observations, near-misses, acks, ROI)
 */
async function fetchProjectAnalyticsData(projectId) {
  // 1. Fetch all incidents (aka "emergencies") for this project
  const incidentsSnap = await db
    .collection("emergencies")
    .where("projectId", "==", projectId)
    .get();
  const incidents = incidentsSnap.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  // 2. Fetch all observations (includes near-misses: status field = "NEAR_MISS")
  const observationsSnap = await db
    .collection("observations")
    .where("projectId", "==", projectId)
    .get();
  const observations = observationsSnap.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  // 3. Fetch acks for each incident (emergencies/[incidentId]/acks)
  //    Also flatten into a single array for AI pattern detection
  let allAcks = [];
  for (const incident of incidents) {
    const acksSnap = await db
      .collection("emergencies")
      .doc(incident.id)
      .collection("acks")
      .get();
    const acks = acksSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      incidentId: incident.id
    }));
    allAcks = allAcks.concat(acks);
  }

  // 4. Compute simple ROI metrics for the project (you can enhance this!)
  const closedObservations = observations.filter(obs => obs.status === "CLOSED").length;
  const totalObservations = observations.length;
  const closureRate = totalObservations > 0
    ? Math.round((closedObservations / totalObservations) * 100)
    : 0;

  // Basic performance summary
  const performance = {
    totalIncidents: incidents.length,
    totalObservations,
    closureRate,
    totalAcks: allAcks.length,
    closedObservations
    // Add more as you like (response times, team stats, etc)
  };

  return { incidents, observations, allAcks, performance };
}

function buildStarkPrompt({ incidents, observations, allAcks, performance }, projectId) {
  // Tony Stark-level prompt for advanced, actionable insights
  return `
You are HydroSafe's world-class oil & gas operations digital safety analyst—part CTO, part Tony Stark AI.

You receive live project safety data for Project ID: ${projectId}.
Your role: analyze all patterns, spot hidden risks, and give brutally honest, actionable, ROI-driven recommendations for offshore upstream safety, productivity, and compliance.

Use IMCA, IOGP, OSHA, ISO 45001, NORSOK, ISGOTT, and industry incident databases for context and benchmarking.
Show no mercy for mediocrity. Always suggest how to go from good to *world class*.

**Input Data:**  
Incidents (emergencies): ${JSON.stringify(incidents, null, 2)}
Observations (incl. near-misses): ${JSON.stringify(observations, null, 2)}
Acks (muster, response logs): ${JSON.stringify(allAcks, null, 2)}
Performance metrics: ${JSON.stringify(performance, null, 2)}

**Your output: Strict JSON. Return ONLY this, with NO comments, markdown, or explanation.**
{
  executiveSummary: "Short, sharp overview of project safety, culture, compliance, risks.",
  recommendations: [ "Action 1", "Action 2", ... ],
  topRisks: [ { risk: "...", evidence: "...", recommendedAction: "..." } ],
  improvementOpportunities: [ { opportunity: "...", howToAchieve: "..." } ],
  trendAlerts: [ "What hazards/trends are up/down, e.g. 'Rising gas leaks in July'" ],
  patternDetections: [ "E.g. 'Multiple near-misses on Jetty deck', 'Same team involved in >2 incidents'" ],
  complianceNotes: "How well does project align with global standards? Gaps?",
  costSavingsIdeas: [ "AI-identified ways to reduce losses/increase efficiency" ],
  perSectionDeepDive: {
    incidents: { summary: "...", recs: [...] },
    observations: { summary: "...", recs: [...] },
    nearMisses: { summary: "...", recs: [...] },
    headcount: { summary: "...", recs: [...] },
    roi: { summary: "...", recs: [...] }
  }
}
If any section is weak or data is sparse, still provide *practical* suggestions.
Never output "not enough data". Always extrapolate. Every output must teach, warn, or inspire action.
If you find zero risks, invent new ways to optimize, train, or set new safety standards.
`.trim();
}

// === ROUTE: POST /api/ai-project-analytics
router.post("/", async (req, res) => {
  try {
    const { projectId } = req.body;
    if (!projectId) return res.status(400).json({ error: "Missing projectId." });

    // 1. Gather ALL project analytics data (CTO-grade, full context)
    const analyticsData = await fetchProjectAnalyticsData(projectId);

    // 2. Build prompt and call OpenAI
    const prompt = buildStarkPrompt(analyticsData, projectId);

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // Use gpt-4o for best insights; downgrade if needed
      messages: [{ role: "system", content: prompt }],
      temperature: 0.3,
      max_tokens: 2300
    });

    // Parse and validate the JSON result
    let aiResult;
    let content = response.choices[0].message.content;
    // Remove possible code blocks/markdown
    const cleaned = content.replace(/^[\s`]*```json[\s`]*/i, '')
                          .replace(/```[\s`]*$/i, '')
                          .trim();
    try {
      aiResult = JSON.parse(cleaned);
    } catch (err1) {
      // Fallback: Extract largest JSON block
      const jsonMatch = cleaned.match(/({[^]*})|($begin:math:display$[^]*$end:math:display$)/);
      if (jsonMatch) {
        try { aiResult = JSON.parse(jsonMatch[0]); }
        catch (err2) { aiResult = { error: "AI output unparseable", raw: content, parseError: err2?.toString() }; }
      } else {
        aiResult = { error: "AI output could not be parsed.", raw: content, parseError: err1?.toString() };
      }
    }

    // 3. Store in Firestore under project
    await db.collection("projects")
      .doc(projectId)
      .collection("aiAnalytics")
      .doc("latest")
      .set({
        projectId,
        createdAt: new Date().toISOString(),
        aiResult,
        inputSnapshot: analyticsData // for audit/debugging, remove if too heavy
      });

    res.json({
      status: "AI project analysis complete.",
      aiResult,
      runAt: new Date().toISOString()
    });

  } catch (error) {
    console.error("AI Project Analytics error:", error);
    res.status(500).json({ error: "Failed to run AI analytics", details: String(error) });
  }
});

export default router;