import React, { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { 
  Camera, 
  Upload, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Package,
  FileImage,
  Calendar,
  Search,
  Plus,
  Download,
  Eye,
  Bell,
  Filter,
  RefreshCw
} from "lucide-react";

interface AssetVerification {
  id: number;
  projectId: number;
  assetName: string;
  assetType: string;
  status: 'VERIFIED' | 'PENDING' | 'OVERDUE' | 'FAILED';
  lastChecked?: string;
  nextCheckDue?: string;
  verifiedBy?: number;
  photoId?: number;
  comments?: string;
  complianceNotes?: string;
  protocolReference?: string;
  checklistData?: any;
  createdAt: string;
  updatedAt: string;
}

export default function AssetVerification() {
  const [selectedAsset, setSelectedAsset] = useState<AssetVerification | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [verificationComment, setVerificationComment] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [activeProjectId, setActiveProjectId] = useState<number | null>(null);
  const { toast } = useToast();

  // Get current user and projects from API
  const { data: currentUser } = useQuery({
    queryKey: ['/api/user/profile'],
    queryFn: () => fetch('/api/user/profile').then(res => res.json())
  });

  const { data: projects } = useQuery({
    queryKey: ['/api/user/projects'],
    queryFn: () => fetch('/api/user/projects').then(res => res.json())
  });

  // Set the first project as active by default
  useEffect(() => {
    if (projects && projects.length > 0 && !activeProjectId) {
      setActiveProjectId(projects[0].id);
    }
  }, [projects, activeProjectId]);

  // Fetch asset verifications from database
  const { data: assets, isLoading, error } = useQuery({
    queryKey: ['/api/asset-verifications', activeProjectId],
    queryFn: () => {
      if (!activeProjectId) return [];
      return fetch(`/api/asset-verifications/${activeProjectId}`)
        .then(res => {
          if (!res.ok) throw new Error(`API error: ${res.status}`);
          return res.json();
        });
    },
    enabled: !!activeProjectId
  });

  // Create new asset verification
  const createAssetMutation = useMutation({
    mutationFn: (assetData: any) => apiRequest('/api/asset-verifications', 'POST', assetData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/asset-verifications'] });
      toast({
        title: "Asset Created",
        description: "New asset verification entry created successfully",
      });
    },
    onError: (error: any) => {
      console.error("Asset creation error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create asset verification",
        variant: "destructive",
      });
    }
  });

  // Update asset verification
  const updateAssetMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => 
      apiRequest(`/api/asset-verifications/${id}`, 'PUT', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/asset-verifications'] });
      setSelectedAsset(null);
      setIsVerifying(false);
      setPhotoFile(null);
      setVerificationComment("");
      toast({
        title: "Asset Updated",
        description: "Asset verification completed successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update asset verification",
        variant: "destructive",
      });
    }
  });

  const filteredAssets = (assets || []).filter((asset: AssetVerification) => {
    const matchesSearch = asset.assetName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         asset.assetType.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || asset.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateAsset = () => {
    if (!activeProjectId || !currentUser) {
      console.log("Cannot create asset - missing data:", { activeProjectId, currentUser: !!currentUser });
      return;
    }
    const newAsset = {
      projectId: activeProjectId,
      assetName: "New Asset " + Date.now(),
      assetType: "EQUIPMENT",
      status: "PENDING",
      nextCheckDue: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      protocolReference: "IOGP Report 456 - KPI Framework",
      comments: "Asset created for verification"
    };
    createAssetMutation.mutate(newAsset);
  };

  const handleVerifyAsset = async () => {
    if (!selectedAsset || !currentUser) return;
    setIsVerifying(true);

    // Upload photo if provided
    let photoId = null;
    if (photoFile) {
      const formData = new FormData();
      formData.append('file', photoFile);
      formData.append('projectId', activeProjectId?.toString() || '');
      formData.append('type', 'ASSET_VERIFICATION');
      try {
        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });
        const uploadResult = await uploadResponse.json();
        photoId = uploadResult.id;
      } catch (error) {
        console.error('Photo upload failed:', error);
      }
    }

    const updateData = {
      status: 'VERIFIED',
      lastChecked: new Date().toISOString(),
      nextCheckDue: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      comments: verificationComment,
      photoId: photoId,
      complianceNotes: "",
      protocolReference: selectedAsset.protocolReference,
    };

    updateAssetMutation.mutate({ id: selectedAsset.id, data: updateData });
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'VERIFIED': return 'bg-green-100 text-green-800 border-green-200';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'OVERDUE': return 'bg-red-100 text-red-800 border-red-200';
      case 'FAILED': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <main>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading assets...</span>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64 text-red-600">
            <AlertTriangle className="h-8 w-8 mr-2" />
            <span>Asset Error: {error.message || "Unknown error loading assets"}</span>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main>
      <div className="container mx-auto px-4 py-8">
        {/* Project Selection */}
        {projects && projects.length > 1 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Select Project</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={activeProjectId?.toString()} onValueChange={(value) => setActiveProjectId(parseInt(value))}>
                <SelectTrigger className="w-full max-w-md">
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project: any) => (
                    <SelectItem key={project.id} value={project.id.toString()}>
                      {project.name} ({project.number})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}

        {/* Header and Controls */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Asset Verification</h1>
            <p className="text-gray-600">Monitor and verify critical assets according to safety protocols</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
            <div className="relative flex-1 lg:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search assets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="VERIFIED">Verified</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="OVERDUE">Overdue</SelectItem>
                <SelectItem value="FAILED">Failed</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleCreateAsset} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Asset
            </Button>
          </div>
        </div>

        {/* Assets Grid */}
        {!filteredAssets || filteredAssets.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No assets found</h3>
              <p className="text-gray-500 text-center mb-4">
                {!activeProjectId 
                  ? "Please select a project to view assets" 
                  : "No assets found for this project. Please add or verify assets."}
              </p>
              {activeProjectId && (
                <Button onClick={handleCreateAsset} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Create First Asset
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAssets.map((asset: AssetVerification) => (
              <Card key={asset.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg font-semibold text-gray-900 mb-1">
                        {asset.assetName}
                      </CardTitle>
                      <p className="text-sm text-gray-600">{asset.assetType}</p>
                    </div>
                    <Badge className={cn("ml-2", getStatusBadgeColor(asset.status))}>
                      {asset.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {asset.lastChecked 
                        ? `Last checked: ${new Date(asset.lastChecked).toLocaleDateString()}`
                        : "Not yet verified"}
                    </span>
                  </div>
                  {asset.nextCheckDue && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="h-4 w-4" />
                      <span>Due: {new Date(asset.nextCheckDue).toLocaleDateString()}</span>
                    </div>
                  )}
                  {asset.comments && (
                    <div className="text-sm text-gray-700">
                      <strong>Comments:</strong> {asset.comments}
                    </div>
                  )}
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedAsset(asset);
                        setVerificationComment(asset.comments || "");
                      }}
                      className="flex-1"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Verify
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Verification Modal */}
        {selectedAsset && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Verify Asset: {selectedAsset.assetName}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Photo Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Verification Photo
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                      className="hidden"
                      id="photo-upload"
                    />
                    <label
                      htmlFor="photo-upload"
                      className="flex flex-col items-center cursor-pointer"
                    >
                      <Camera className="h-8 w-8 text-gray-400 mb-2" />
                      <span className="text-sm text-gray-600">
                        {photoFile ? photoFile.name : "Click to upload photo"}
                      </span>
                    </label>
                  </div>
                </div>
                {/* Comments */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Verification Comments
                  </label>
                  <Textarea
                    value={verificationComment}
                    onChange={(e) => setVerificationComment(e.target.value)}
                    placeholder="Add verification notes, observations, or concerns..."
                    rows={4}
                  />
                </div>
                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={handleVerifyAsset}
                    disabled={isVerifying || updateAssetMutation.isPending}
                    className="flex-1"
                  >
                    {isVerifying || updateAssetMutation.isPending ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Complete Verification
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedAsset(null);
                      setIsVerifying(false);
                      setPhotoFile(null);
                      setVerificationComment("");
                    }}
                    disabled={isVerifying || updateAssetMutation.isPending}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </main>
  );
}