import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Header } from "@/components/header";
import { Navigation } from "@/components/navigation";
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
  Filter
} from "lucide-react";

interface Asset {
  id: number;
  name: string;
  category: string;
  location: string;
  status: 'VERIFIED' | 'PENDING' | 'OVERDUE';
  lastVerified?: string;
  verifiedBy?: string;
  photoCount: number;
  dueDate?: string;
  verificationPhoto?: string;
  verificationComment?: string;
  verificationTimestamp?: string;
}

// Actual project asset data for Forcados decommissioning
const mockAssets: Asset[] = [
  {
    id: 1,
    name: "Emergency Generator Set #1",
    category: "Power Systems",
    location: "Deck A, Port Side",
    status: "VERIFIED",
    lastVerified: "2025-01-15",
    verifiedBy: "Steve Hardy",
    photoCount: 1
  },
  {
    id: 2,
    name: "Boat #1 (Port)",
    category: "Safety Equipment",
    location: "Deck B",
    status: "PENDING",
    dueDate: "2025-01-29",
    photoCount: 0
  },
  {
    id: 3,
    name: "Fire Suppression System",
    category: "Safety Equipment",
    location: "Engine Room",
    status: "OVERDUE",
    lastVerified: "2024-12-20",
    photoCount: 0
  },
  {
    id: 4,
    name: "Communication Radio Array",
    category: "Communications",
    location: "Bridge",
    status: "VERIFIED",
    lastVerified: "2025-01-22",
    verifiedBy: "Nick Roddy",
    photoCount: 2
  },
  {
    id: 5,
    name: "Emergency Medical Kit",
    category: "Medical Equipment",
    location: "Medical Bay",
    status: "PENDING",
    dueDate: "2025-02-01",
    photoCount: 0
  },
  {
    id: 6,
    name: "Crane System #2",
    category: "Mechanical Systems",
    location: "Deck C, Starboard",
    status: "VERIFIED",
    lastVerified: "2025-01-10",
    verifiedBy: "Dean Golding",
    photoCount: 3
  }
];

export default function AssetVerification() {
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [comment, setComment] = useState("");
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const { toast } = useToast();

  const user = {
    role: "GOLD",
    name: "David Mooney",
    title: "General Manager",
    initials: "DM"
  };

  const projectData = {
    name: "Forcados ACOE Decommissioning Project",
    number: "863-01-24",
    client: "Shell Petroleum Development Company (SPDC)"
  };

  // Mock query for assets - in real app this would fetch from backend
  const { data: assets = mockAssets, isLoading } = useQuery({
    queryKey: ["/api/assets"],
    queryFn: () => Promise.resolve(mockAssets),
  });

  const uploadVerificationMutation = useMutation({
    mutationFn: async (data: { assetId: number; photo: File; comment: string }) => {
      const formData = new FormData();
      formData.append('file', data.photo);
      formData.append('assetId', data.assetId.toString());
      formData.append('comment', data.comment);
      formData.append('verificationType', 'ASSET_VERIFICATION');
      
      await apiRequest("POST", "/api/upload", formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      setIsUploadModalOpen(false);
      setSelectedAsset(null);
      setPhotoFile(null);
      setComment("");
      toast({
        title: "Success",
        description: "Asset verification uploaded successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to upload asset verification",
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setPhotoFile(file);
    }
  };

  const handleVerifyAsset = (asset: Asset) => {
    setSelectedAsset(asset);
    setIsUploadModalOpen(true);
  };

  const handleSubmitVerification = () => {
    if (!selectedAsset || !photoFile) return;
    
    uploadVerificationMutation.mutate({
      assetId: selectedAsset.id,
      photo: photoFile,
      comment: comment,
    });
  };

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         asset.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         asset.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === "ALL" || asset.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const assetStats = {
    verified: assets.filter(a => a.status === 'VERIFIED').length,
    pending: assets.filter(a => a.status === 'PENDING').length,
    overdue: assets.filter(a => a.status === 'OVERDUE').length,
    total: assets.length
  };

  const getAssetCardStyle = (status: Asset['status']) => {
    switch (status) {
      case 'VERIFIED':
        return 'hydro-card-verified';
      case 'PENDING':
        return 'hydro-card-pending';
      case 'OVERDUE':
        return 'hydro-card-overdue';
      default:
        return 'hydro-card';
    }
  };

  const getStatusIcon = (status: Asset['status']) => {
    switch (status) {
      case 'VERIFIED':
        return <CheckCircle className="w-6 h-6 text-green-600" />;
      case 'PENDING':
        return <Clock className="w-6 h-6 text-yellow-600" />;
      case 'OVERDUE':
        return <AlertTriangle className="w-6 h-6 text-red-600" />;
      default:
        return <Package className="w-6 h-6 text-gray-600" />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-hydro-light to-white">
        <Header user={user} project={projectData} />
        <div className="flex">
          <Navigation />
          <div className="flex-1 p-6">
            <div className="text-center">Loading assets...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-hydro-light to-white">
      <Header user={user} project={projectData} />
      <div className="flex">
        <Navigation />
        <div className="flex-1 p-6">
          <div className="w-full">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-hydro-dark mb-2">Asset Verification</h1>
              <p className="text-gray-600">
                Verify and document all project assets with photos and detailed comments to maintain compliance and safety standards
              </p>
            </div>

            {/* Asset Statistics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="text-center">
                    <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
                    <p className="text-sm font-medium text-green-700 mb-1">Verified Assets</p>
                    <p className="text-3xl font-bold text-green-800">
                      {assets.filter(a => a.status === 'VERIFIED').length}
                    </p>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200 hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="text-center">
                    <Clock className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
                    <p className="text-sm font-medium text-yellow-700 mb-1">Pending Verification</p>
                    <p className="text-3xl font-bold text-yellow-800">
                      {assets.filter(a => a.status === 'PENDING').length}
                    </p>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200 hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="text-center">
                    <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-3" />
                    <p className="text-sm font-medium text-red-700 mb-1">Overdue Assets</p>
                    <p className="text-3xl font-bold text-red-800">
                      {assets.filter(a => a.status === 'OVERDUE').length}
                    </p>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-hydro-light to-blue-100 border-blue-200 hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="text-center">
                    <Package className="w-12 h-12 text-hydro-dark mx-auto mb-3" />
                    <p className="text-sm font-medium text-hydro-dark mb-1">Total Assets</p>
                    <p className="text-3xl font-bold text-hydro-dark">{assets.length}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Search and Actions */}
            <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search assets..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="hydro-button-primary">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Asset
                </Button>
                <Button variant="outline" className="bg-gray-600 text-white hover:bg-gray-700">
                  <Download className="w-4 h-4 mr-2" />
                  Export Audit Log
                </Button>
              </div>
            </div>

            {/* Asset Cards */}
            <div className="space-y-4">
              {filteredAssets.map((asset) => (
                <div
                  key={asset.id}
                  className={cn("p-6 rounded-xl shadow-sm hover:shadow-md transition-all duration-200", getAssetCardStyle(asset.status))}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        {getStatusIcon(asset.status)}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{asset.name}</h3>
                        <p className="text-sm text-gray-600">{asset.category} | {asset.location}</p>
                        {asset.status === 'VERIFIED' && asset.lastVerified && (
                          <p className="text-sm text-gray-600">
                            Last verified: {asset.lastVerified} by {asset.verifiedBy}
                          </p>
                        )}
                        {asset.status === 'PENDING' && asset.dueDate && (
                          <p className="text-sm text-gray-600">
                            Pending verification (due: {asset.dueDate})
                          </p>
                        )}
                        {asset.status === 'OVERDUE' && asset.lastVerified && (
                          <p className="text-sm text-red-600 font-medium">
                            OVERDUE! Last verified: {asset.lastVerified}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      {asset.photoCount > 0 && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Camera className="w-4 h-4 mr-1" />
                          {asset.photoCount} Photo{asset.photoCount !== 1 ? 's' : ''}
                        </div>
                      )}
                      
                      <div className="flex space-x-2">
                        {asset.status === 'VERIFIED' ? (
                          <Button size="sm" variant="outline" className="hydro-button-primary">
                            <Eye className="w-3 h-3 mr-1" />
                            View Details
                          </Button>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              className="hydro-button-verify"
                              onClick={() => handleVerifyAsset(asset)}
                            >
                              <Camera className="w-3 h-3 mr-1" />
                              Upload Photo
                            </Button>
                            <Button size="sm" className="hydro-button-verify">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Mark as Verified
                            </Button>
                            {asset.status === 'OVERDUE' && (
                              <Button size="sm" variant="outline" className="hydro-button-warning">
                                <Bell className="w-3 h-3 mr-1" />
                                Notify Team
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Photo Upload Modal */}
            {isUploadModalOpen && selectedAsset && (
              <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                  <h3 className="text-xl font-bold text-hydro-dark mb-4">
                    Verify Asset: {selectedAsset.name}
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Upload Photo
                      </label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="hidden"
                          id="photo-upload"
                        />
                        <label
                          htmlFor="photo-upload"
                          className="cursor-pointer flex flex-col items-center"
                        >
                          {photoFile ? (
                            <div className="text-center">
                              <FileImage className="w-8 h-8 text-green-600 mx-auto mb-2" />
                              <p className="text-sm text-green-600">{photoFile.name}</p>
                            </div>
                          ) : (
                            <div className="text-center">
                              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                              <p className="text-sm text-gray-600">Click to upload photo</p>
                            </div>
                          )}
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Verification Comment
                      </label>
                      <Textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Add verification notes, condition details, or observations..."
                        rows={3}
                      />
                    </div>

                    <div className="flex items-center text-sm text-gray-600">
                      <Clock className="w-4 h-4 mr-1" />
                      Timestamp: {new Date().toLocaleString()}
                    </div>

                    <div className="flex space-x-3">
                      <Button
                        className="flex-1 hydro-button-primary"
                        onClick={handleSubmitVerification}
                        disabled={!photoFile || uploadVerificationMutation.isPending}
                      >
                        {uploadVerificationMutation.isPending ? "Uploading..." : "Submit Verification"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={() => setIsUploadModalOpen(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}