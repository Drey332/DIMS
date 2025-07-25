import OpenAI from "openai";
import { db } from "@/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  addDoc
} from "firebase/firestore";

// === OpenAI Assistant integration ===
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const ASSISTANT_ID = "asst_n8xDlhXKwjoaa3ajBvODLJex"; // your custom assistant

// Helper to call the OpenAI Asset Assistant with asset info and a question
async function askAssetAI({ asset, question, fileIds = [] }: { asset: any, question: string, fileIds?: string[] }) {
  const thread = await openai.beta.threads.create({
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Asset name: ${asset?.name || "Unknown"}\nAsset ID: ${asset?.id || "Unknown"}\nSpecs: ${JSON.stringify(asset?.specs || {})}\n\nQuestion: ${question}`,
          }
        ]
      }
    ]
  });

  const run = await openai.beta.threads.runs.create(thread.id, {
    assistant_id: ASSISTANT_ID,
    ...(fileIds.length > 0 ? { tools: [{ type: "file_search" }], file_ids: fileIds } : {}),
  });

  let runStatus = await openai.beta.threads.runs.retrieve(run.id, { thread_id: thread.id });
  while (runStatus.status !== "completed" && runStatus.status !== "failed") {
    await new Promise(res => setTimeout(res, 1200));
    runStatus = await openai.beta.threads.runs.retrieve(run.id, { thread_id: thread.id });
  }
  if (runStatus.status !== "completed") throw new Error("AI Assistant failed.");

  const messages = await openai.beta.threads.messages.list(thread.id);
  const answerMsg = messages.data.find(m => m.role === "assistant");
  
  // Type-safe access to the text content
  const firstContent = answerMsg?.content?.[0];
  if (firstContent && firstContent.type === "text") {
    return firstContent.text.value;
  }
  
  return "No AI response.";
}

// 1. Get Asset Status
export async function getAssetStatus(assetId: string, projectId = "1") {
  try {
    const assetRef = doc(db, "projects", projectId, "assets", assetId);
    const assetSnap = await getDoc(assetRef);
    if (!assetSnap.exists()) return { error: "Asset not found" };
    const asset = assetSnap.data();

    const issuesSnap = await getDocs(
      query(collection(db, "projects", projectId, "assets", assetId, "issues"), where("status", "==", "OPEN"))
    );
    const openIssues = issuesSnap.docs.map(doc => ({ ...doc.data(), id: doc.id }));

    return {
      id: assetId,
      name: asset?.name,
      condition: asset?.condition,
      assignedTo: asset?.assignedTo,
      openIssues,
      specs: asset?.specs,
      notes: asset?.notes,
      lastUpdated: asset?.updatedAt,
    };
  } catch (err: any) {
    return { error: "Failed to fetch asset status", detail: err.message };
  }
}

// 2. Schedule Maintenance
export async function scheduleMaintenance(assetId: string, date: string, engineer: string, projectId = "1") {
  try {
    const maintRef = collection(db, "projects", projectId, "assets", assetId, "maintenance");
    await addDoc(maintRef, {
      type: "Scheduled",
      date,
      addedBy: engineer,
      createdAt: new Date().toISOString(),
      description: `Scheduled maintenance by ${engineer}`,
    });
    return { success: true, message: "Maintenance scheduled." };
  } catch (err: any) {
    return { error: "Failed to schedule maintenance", detail: err.message };
  }
}

// 3. Generate Asset Report (single or all)
export async function generateReport(assetId?: string, projectId = "1") {
  try {
    let assets: any[] = [];
    if (assetId) {
      const snap = await getDoc(doc(db, "projects", projectId, "assets", assetId));
      if (snap.exists()) assets.push({ ...snap.data(), id: assetId });
    } else {
      const snap = await getDocs(collection(db, "projects", projectId, "assets"));
      assets = snap.docs.map(d => ({ ...d.data(), id: d.id }));
    }
    return { count: assets.length, assets };
  } catch (err: any) {
    return { error: "Failed to generate report", detail: err.message };
  }
}

// 4. Fetch Open Issues
export async function fetchOpenIssues(assetId: string, projectId = "1") {
  try {
    const issuesSnap = await getDocs(
      query(collection(db, "projects", projectId, "assets", assetId, "issues"), where("status", "==", "OPEN"))
    );
    const openIssues = issuesSnap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    return { assetId, openIssues };
  } catch (err: any) {
    return { error: "Failed to fetch open issues", detail: err.message };
  }
}

// 5. Suggest Optimized Maintenance Schedule (uses OpenAI Assistant)
export async function suggestOptimizedSchedule(assetId: string, projectId = "1") {
  try {
    const assetRef = doc(db, "projects", projectId, "assets", assetId);
    const assetSnap = await getDoc(assetRef);
    if (!assetSnap.exists()) return { error: "Asset not found", advisory: true };
    const asset = assetSnap.data();

    // Optionally, pass manual/spec file IDs (if you store them on asset)
    const fileIds = asset?.manualFileIds || asset?.specs?.manualFileIds || [];

    const question = "Based on manufacturer documentation and maintenance history, what is the optimal next maintenance schedule for this asset? Give your reasoning based on the uploaded specs. (This is advisory only; the project manager must approve actions.)";
    const aiAdvice = await askAssetAI({ asset, question, fileIds });

    return {
      assetId,
      recommendation: aiAdvice,
      advisory: true,
      note: "AI is advisory only. Project manager must approve actions."
    };
  } catch (err: any) {
    return { error: "AI failed to suggest optimized schedule", detail: err.message, advisory: true };
  }
}

// 6. Verify Certification
export async function verifyCertification(assetId: string, certType: string, projectId = "1") {
  try {
    const assetRef = doc(db, "projects", projectId, "assets", assetId);
    const snap = await getDoc(assetRef);
    if (!snap.exists()) return { error: "Asset not found" };
    const asset = snap.data();
    const certs = asset?.certifications || [];
    const cert = certs.find((c: any) => c.type === certType);
    if (!cert) return { certified: false, message: "No such certification found" };
    const isValid = new Date(cert.validUntil) > new Date();
    return { certified: isValid, expires: cert.validUntil, certType };
  } catch (err: any) {
    return { error: "Failed to verify certification", detail: err.message };
  }
}

// 7. Predict Next Fault (uses OpenAI Assistant)
export async function predictNextFault(assetId: string, projectId = "1") {
  try {
    const assetRef = doc(db, "projects", projectId, "assets", assetId);
    const assetSnap = await getDoc(assetRef);
    if (!assetSnap.exists()) return { error: "Asset not found", advisory: true };
    const asset = assetSnap.data();

    const fileIds = asset?.manualFileIds || asset?.specs?.manualFileIds || [];

    const question = "Using the asset specs and maintenance/fault history, predict the next likely fault or required intervention date. State your reasoning. (AI is advisory only.)";
    const aiAdvice = await askAssetAI({ asset, question, fileIds });

    return {
      assetId,
      prediction: aiAdvice,
      advisory: true,
      note: "AI is advisory only. Project manager decides final actions."
    };
  } catch (err: any) {
    return { error: "AI failed to predict next fault", detail: err.message, advisory: true };
  }
}

// 8. Find Overdue Assets
export async function findOverdueAssets(projectId = "1") {
  try {
    const assetsSnap = await getDocs(collection(db, "projects", projectId, "assets"));
    const overdue: any[] = [];
    for (const docSnap of assetsSnap.docs) {
      const assetId = docSnap.id;
      const maintSnap = await getDocs(
        query(collection(db, "projects", projectId, "assets", assetId, "maintenance"), orderBy("date", "desc"))
      );
      if (!maintSnap.empty) {
        const lastDate = maintSnap.docs[0].data().date;
        const diffDays = (new Date().getTime() - new Date(lastDate).getTime()) / (1000 * 3600 * 24);
        if (diffDays > 365) overdue.push({ id: assetId, name: docSnap.data().name, lastMaintenance: lastDate });
      }
    }
    return { overdue };
  } catch (err: any) {
    return { error: "Failed to find overdue assets", detail: err.message };
  }
}

// 9. Summarize Asset History
export async function summarizeAssetHistory(assetId: string, projectId = "1") {
  try {
    const assetRef = doc(db, "projects", projectId, "assets", assetId);
    const assetSnap = await getDoc(assetRef);
    if (!assetSnap.exists()) return { error: "Asset not found" };
    const asset = assetSnap.data();

    const maintSnap = await getDocs(
      query(collection(db, "projects", projectId, "assets", assetId, "maintenance"), orderBy("date", "desc"))
    );
    const maintenance = maintSnap.docs.map(doc => doc.data());

    const issuesSnap = await getDocs(
      query(collection(db, "projects", projectId, "assets", assetId, "issues"), orderBy("createdAt", "desc"))
    );
    const issues = issuesSnap.docs.map(doc => doc.data());

    return {
      id: assetId,
      name: asset?.name,
      summary: `Asset '${asset?.name}' has had ${maintenance.length} maintenance events and ${issues.length} issues reported.`,
      lastMaintenance: maintenance[0]?.date || null,
      lastIssue: issues[0]?.description || null,
      openIssues: issues.filter(i => i.status === "OPEN").length,
      closedIssues: issues.filter(i => i.status === "CLOSED").length,
      details: {
        maintenance,
        issues,
      }
    };
  } catch (err: any) {
    return { error: "Failed to summarize asset history", detail: err.message };
  }
}

// 10. (Optional) Ask a general question about an asset
export async function askAiAboutAsset(assetId: string, question: string, projectId = "1") {
  try {
    const assetRef = doc(db, "projects", projectId, "assets", assetId);
    const assetSnap = await getDoc(assetRef);
    if (!assetSnap.exists()) return { error: "Asset not found", advisory: true };
    const asset = assetSnap.data();

    const fileIds = asset?.manualFileIds || asset?.specs?.manualFileIds || [];
    const aiAdvice = await askAssetAI({ asset, question, fileIds });

    return { assetId, answer: aiAdvice, advisory: true };
  } catch (err: any) {
    return { error: "AI Assistant failed to answer", detail: err.message, advisory: true };
  }
}