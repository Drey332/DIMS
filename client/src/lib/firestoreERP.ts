import { db } from "../firebase";
import {
  collection,
  getDocs,
  setDoc,
  doc,
  deleteDoc,
  updateDoc,
  getDoc
} from "firebase/firestore";

// ---- ERP Protocols ----
export async function fetchERPProtocols(projectId: string) {
  const ref = collection(db, "projects", projectId, "erpProtocols");
  const snap = await getDocs(ref);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function addERPProtocol(projectId: string, protocol: any) {
  const ref = collection(db, "projects", projectId, "erpProtocols");
  // Use Firestore auto-id:
  const newRef = doc(ref);
  await setDoc(newRef, { ...protocol, id: newRef.id });
  return newRef.id;
}

export async function updateERPProtocol(projectId: string, protocolId: string, protocol: any) {
  const ref = doc(db, "projects", projectId, "erpProtocols", protocolId);
  await setDoc(ref, { ...protocol, id: protocolId });
}

export async function deleteERPProtocol(projectId: string, protocolId: string) {
  const ref = doc(db, "projects", projectId, "erpProtocols", protocolId);
  await deleteDoc(ref);
}

// ---- Project Info ----
export async function fetchProjectInfo(projectId: string) {
  const ref = doc(db, "projects", projectId);
  const snap = await getDoc(ref);
  return { id: snap.id, ...snap.data() };
}

export async function updateProjectInfo(projectId: string, data: any) {
  const ref = doc(db, "projects", projectId);
  await updateDoc(ref, data);
}
