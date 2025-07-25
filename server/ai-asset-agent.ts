// server/ai-asset-agent.ts

import { db } from "@/firebase"; // ✅ correct (Firestore instance)
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

// 1. Get Asset Status
export async function getAssetStatus(assetId: string) {
  try {
    const assetRef = doc(db, "projects", "1", "assets", assetId);
    const assetSnap = await getDoc(assetRef);
    if (!assetSnap.exists()) return { error: "Asset not found" };
    const asset = assetSnap.data();

    const issuesSnap = await getDocs(
      query(collection(db, "projects", "1", "assets", assetId, "issues"), where("status", "==", "OPEN"))
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
export async function scheduleMaintenance(assetId: string, date: string, engineer: string) {
  try {
    const maintRef = collection(db, "projects", "1", "assets", assetId, "maintenance");
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
export async function generateReport(assetId?: string) {
  try {
    let assets: any[] = [];
    if (assetId) {
      const snap = await getDoc(doc(db, "projects", "1", "assets", assetId));
      if (snap.exists()) assets.push({ ...snap.data(), id: assetId });
    } else {
      const snap = await getDocs(collection(db, "projects", "1", "assets"));
      assets = snap.docs.map(d => ({ ...d.data(), id: d.id }));
    }
    return { count: assets.length, assets };
  } catch (err: any) {
    return { error: "Failed to generate report", detail: err.message };
  }
}

// 4. Fetch Open Issues
export async function fetchOpenIssues(assetId: string) {
  try {
    const issuesSnap = await getDocs(
      query(collection(db, "projects", "1", "assets", assetId, "issues"), where("status", "==", "OPEN"))
    );
    const openIssues = issuesSnap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    return { assetId, openIssues };
  } catch (err: any) {
    return { error: "Failed to fetch open issues", detail: err.message };
  }
}

// 5. Suggest Optimized Maintenance Schedule
export async function suggestOptimizedSchedule(assetId: string) {
  try {
    const maintSnap = await getDocs(
      query(collection(db, "projects", "1", "assets", assetId, "maintenance"), orderBy("date", "desc"))
    );
    let nextSuggestedDate: string;
    if (!maintSnap.empty) {
      const lastDate = maintSnap.docs[0].data().date;
      const last = new Date(lastDate);
      last.setMonth(last.getMonth() + 6); // Suggest 6 months after last
      nextSuggestedDate = last.toISOString().split('T')[0];
    } else {
      const now = new Date();
      now.setMonth(now.getMonth() + 6);
      nextSuggestedDate = now.toISOString().split('T')[0];
    }
    return { assetId, nextSuggestedDate };
  } catch (err: any) {
    return { error: "Failed to suggest schedule", detail: err.message };
  }
}

// 6. Verify Certification
export async function verifyCertification(assetId: string, certType: string) {
  try {
    const assetRef = doc(db, "projects", "1", "assets", assetId);
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

// 7. Predict Next Fault
export async function predictNextFault(assetId: string) {
  try {
    const maintSnap = await getDocs(
      query(collection(db, "projects", "1", "assets", assetId, "maintenance"),
        where("type", "==", "Repair"), orderBy("date", "desc"))
    );
    const repairs = maintSnap.docs.map(doc => doc.data());
    if (repairs.length < 2) return { prediction: "Insufficient data" };

    const intervals = [];
    for (let i = 1; i < repairs.length; i++) {
      const prev = new Date(repairs[i - 1].date);
      const curr = new Date(repairs[i].date);
      intervals.push(Math.abs((prev.getTime() - curr.getTime()) / (1000 * 3600 * 24)));
    }
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const lastRepair = new Date(repairs[0].date);
    lastRepair.setDate(lastRepair.getDate() + Math.round(avgInterval));
    return {
      assetId,
      predictedFaultDate: lastRepair.toISOString().split('T')[0],
      avgDaysBetweenFaults: avgInterval
    };
  } catch (err: any) {
    return { error: "Failed to predict next fault", detail: err.message };
  }
}

// 8. Find Overdue Assets
export async function findOverdueAssets() {
  try {
    const assetsSnap = await getDocs(collection(db, "projects", "1", "assets"));
    const overdue: any[] = [];
    for (const docSnap of assetsSnap.docs) {
      const assetId = docSnap.id;
      const maintSnap = await getDocs(
        query(collection(db, "projects", "1", "assets", assetId, "maintenance"), orderBy("date", "desc"))
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
export async function summarizeAssetHistory(assetId: string) {
  try {
    const assetRef = doc(db, "projects", "1", "assets", assetId);
    const assetSnap = await getDoc(assetRef);
    if (!assetSnap.exists()) return { error: "Asset not found" };
    const asset = assetSnap.data();

    const maintSnap = await getDocs(
      query(collection(db, "projects", "1", "assets", assetId, "maintenance"), orderBy("date", "desc"))
    );
    const maintenance = maintSnap.docs.map(doc => doc.data());

    const issuesSnap = await getDocs(
      query(collection(db, "projects", "1", "assets", assetId, "issues"), orderBy("createdAt", "desc"))
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