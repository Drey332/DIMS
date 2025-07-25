import React, { useEffect, useState } from "react";
import {
  collection,
  query,
  onSnapshot,
  DocumentData,
} from "firebase/firestore";
import { db } from "@/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Eye, Plus, Package, Filter, QrCode
} from "lucide-react";
import { QRCodeSVG as QRCode } from "qrcode.react";
import { cn } from "@/lib/utils";

interface Asset {
  id: string;
  name: string;
  category: string;
  modelSerial: string;
  manufacturer: string;
  year: string;
  condition: string;
  assignedTo: string;
  specs?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export default function AssetManagement() {
  // Check if we're accessing a specific asset via QR code
  const urlParams = new URLSearchParams(window.location.search);
  const targetAssetId = urlParams.get('asset');
  
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [showQR, setShowQR] = useState<{ open: boolean; asset: Asset | null }>({ open: false, asset: null });
  const [highlightedAssetId, setHighlightedAssetId] = useState<string | null>(targetAssetId);

  // THIS is your Firestore project ID — matches what's in Firebase!
  const projectId = "1";

  // Real-time Firestore subscription (to 'assets' collection)
  useEffect(() => {
    const q = query(collection(db, "projects", projectId, "assets"));
    const unsub = onSnapshot(q, (snap) => {
      const assetData = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Asset));
      setAssets(assetData);
      
      // If we have a target asset ID from QR code, auto-select it
      if (targetAssetId && assetData.length > 0) {
        const targetAsset = assetData.find(asset => asset.id === targetAssetId);
        if (targetAsset) {
          setSelectedAsset(targetAsset);
          // Auto-scroll to the asset
          setTimeout(() => {
            const element = document.getElementById(`asset-${targetAssetId}`);
            if (element) {
              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, 100);
        }
      }
    });
    return unsub;
  }, [projectId, targetAssetId]);

  // Filter/search logic
  const filteredAssets = assets.filter((asset) => {
    const match =
      asset.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.modelSerial?.toLowerCase().includes(searchTerm.toLowerCase());
    const statusMatch =
      statusFilter === "ALL" || asset.condition?.toUpperCase() === statusFilter;
    return match && statusMatch;
  });

  // Status badge color
  const getStatusBadge = (condition: string) => {
    switch (condition) {
      case "Needs Repair":
        return "bg-red-100 text-red-700 border-red-300";
      case "Fair":
        return "bg-yellow-100 text-yellow-700 border-yellow-300";
      case "Good":
        return "bg-green-100 text-green-700 border-green-300";
      case "New":
        return "bg-blue-100 text-blue-700 border-blue-300";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  return (
    <main>
      <div className="container mx-auto px-4 py-8">
        {/* QR Code Access Banner */}
        {targetAssetId && (
          <div className="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-lg">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <QrCode className="h-5 w-5 text-yellow-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  <strong>QR Code Access:</strong> Showing asset {targetAssetId}
                  {selectedAsset && ` - ${selectedAsset.name}`}
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-extrabold text-[#045cff] mb-2 tracking-tight flex items-center gap-2">
              <Package className="inline-block w-8 h-8 mb-1 text-[#045cff]" />
              Asset Management
            </h1>
            <p className="text-gray-500 text-lg">
              Monitor, manage, and future-proof all critical assets.
            </p>
          </div>
          <div className="flex gap-3">
            <Input
              className="rounded-lg border-2 border-[#045cff] focus:border-blue-700 shadow-sm px-4 py-2 text-lg"
              placeholder="Search by name, serial, or category..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="rounded-lg border-[#045cff] w-40 text-base">
                <Filter className="w-5 h-5 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="New">New</SelectItem>
                <SelectItem value="Good">Good</SelectItem>
                <SelectItem value="Fair">Fair</SelectItem>
                <SelectItem value="Needs Repair">Needs Repair</SelectItem>
              </SelectContent>
            </Select>
            <Button className="bg-[#045cff] hover:bg-blue-700 text-white rounded-lg px-5 py-2 font-bold shadow transition">
              <Plus className="w-5 h-5 mr-2" />
              Add Asset
            </Button>
          </div>
        </div>

        {/* ASSET GRID */}
        {filteredAssets.length === 0 ? (
          <Card className="mt-10 shadow-md border-blue-100">
            <CardContent className="flex flex-col items-center justify-center py-20">
              <Package className="h-16 w-16 text-blue-200 mb-6" />
              <h3 className="text-2xl font-bold text-blue-800 mb-2">No assets found</h3>
              <p className="text-gray-500 text-center mb-4">
                Start by adding assets and equipment. All your critical gear in one place.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredAssets.map(asset => (
              <Card
                key={asset.id}
                id={`asset-${asset.id}`}
                className={cn(
                  "rounded-2xl p-0 overflow-hidden shadow-xl transition-transform hover:scale-105 group",
                  "bg-gradient-to-tr from-[#f8faff] via-white to-[#e8f2fd]",
                  highlightedAssetId === asset.id && "ring-4 ring-yellow-400 ring-opacity-75 shadow-2xl scale-105"
                )}
              >
                <CardHeader className="pb-3 bg-[#045cff]/5">
                  <div className="flex items-center justify-between">
                    <CardTitle className="font-extrabold text-[#102347] text-xl">
                      {asset.name}
                    </CardTitle>
                    <Badge className={cn("px-3 py-1 text-base font-semibold border", getStatusBadge(asset.condition))}>
                      {asset.condition}
                    </Badge>
                  </div>
                  <div className="text-gray-600 text-sm mt-2">
                    <span className="font-bold">{asset.category}</span>
                    {asset.modelSerial && (
                      <> • <span className="font-mono">{asset.modelSerial}</span></>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="text-gray-600">{asset.manufacturer} ({asset.year})</span>
                    {asset.assignedTo && (
                      <span className="ml-2 text-blue-800 font-semibold">
                        Assigned: {asset.assignedTo}
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-3 mb-2">
                    {/* QR Code Button */}
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-lg font-bold"
                      onClick={() => setShowQR({ open: true, asset })}
                    >
                      <QrCode className="w-5 h-5 mr-1" /> QR
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-lg font-bold"
                      onClick={() => window.open(`/asset/${asset.id}`, '_blank')}
                    >
                      <Eye className="w-5 h-5 mr-1" /> Open
                    </Button>
                  </div>
                  {asset.specs && (
                    <div className="text-xs text-gray-700 mt-2 whitespace-pre-wrap">
                      <b>Specs:</b> {asset.specs}
                    </div>
                  )}
                  {asset.notes && (
                    <div className="text-xs text-gray-500 mt-1">
                      <b>Notes:</b> {asset.notes}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* --- QR Modal --- */}
        {showQR.open && showQR.asset && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
            <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center">
              <h2 className="text-xl font-bold mb-3">
                QR Code for: {showQR.asset.name}
              </h2>
              <QRCode value={`${window.location.origin}/asset-management?asset=${showQR.asset.id}`} size={220} />
              <div className="mt-4 text-center text-sm text-gray-600">
                <p>Scan to open asset in HydroSafe</p>
                <p className="font-mono text-xs">{showQR.asset.id}</p>
              </div>
              <Button
                className="mt-6 bg-[#045cff] text-white px-7"
                onClick={() => setShowQR({ open: false, asset: null })}
              >
                Close
              </Button>
            </div>
          </div>
        )}

        {/* --- Asset Detail Modal --- */}
        {selectedAsset && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-7 flex flex-col items-stretch">
              <h2 className="text-2xl font-extrabold mb-2 text-blue-900">{selectedAsset.name}</h2>
              <div className="mb-3 flex flex-wrap gap-4">
                <Badge className={getStatusBadge(selectedAsset.condition)}>{selectedAsset.condition}</Badge>
                <span className="text-gray-600">{selectedAsset.category} • {selectedAsset.modelSerial}</span>
                <span className="text-gray-600">{selectedAsset.manufacturer} ({selectedAsset.year})</span>
                {selectedAsset.assignedTo && (
                  <span className="text-blue-800 font-semibold">Assigned: {selectedAsset.assignedTo}</span>
                )}
              </div>
              <div className="mb-3 text-sm text-gray-800 whitespace-pre-wrap">
                <b>Specs:</b> {selectedAsset.specs || <span className="text-gray-400">None</span>}
              </div>
              <div className="mb-3 text-sm text-gray-700">
                <b>Notes:</b> {selectedAsset.notes || <span className="text-gray-400">None</span>}
              </div>
              <div className="flex gap-3 justify-end mt-2">
                <Button variant="outline" onClick={() => setSelectedAsset(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}