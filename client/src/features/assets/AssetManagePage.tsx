import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, Search, Filter, Edit, Trash2, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface Asset {
  id: number;
  name: string;
  category: string;
  location: string;
  status: 'VERIFIED' | 'PENDING' | 'OVERDUE';
  lastVerified?: string;
  description?: string;
  verificationPhoto?: string;
}

export default function AssetManage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Mock data for demonstration
  const mockAssets: Asset[] = [
    {
      id: 1,
      name: "Main Crane #1",
      category: "CRANE",
      location: "Platform A - North Side",
      status: "VERIFIED",
      lastVerified: "2025-01-19T10:30:00Z",
      description: "Primary lifting crane for heavy operations"
    },
    {
      id: 2,
      name: "Emergency Lifeboat #3",
      category: "SAFETY",
      location: "Platform B - Port Side",
      status: "PENDING",
      description: "50-person capacity emergency vessel"
    },
    {
      id: 3,
      name: "Fire Suppression Panel",
      category: "SAFETY",
      location: "Control Room A",
      status: "OVERDUE",
      lastVerified: "2025-01-10T14:15:00Z",
      description: "Main fire control system"
    },
    {
      id: 4,
      name: "Subsea ROV #2",
      category: "VESSEL",
      location: "Dive Support Vessel",
      status: "VERIFIED",
      lastVerified: "2025-01-18T09:45:00Z",
      description: "Remotely operated underwater vehicle"
    }
  ];

  const { data: assets = mockAssets } = useQuery<Asset[]>({
    queryKey: ["/api/assets"],
    enabled: false // Use mock data for now
  });

  const deleteAssetMutation = useMutation({
    mutationFn: async (assetId: number) => {
      return await apiRequest("DELETE", `/api/assets/${assetId}`);
    },
    onSuccess: () => {
      toast({
        title: "Asset deleted",
        description: "The asset has been removed from the system.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
    },
    onError: (error: any) => {
      toast({
        title: "Delete failed",
        description: error.message || "Failed to delete asset",
        variant: "destructive",
      });
    },
  });

  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         asset.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || asset.status === statusFilter;
    const matchesCategory = categoryFilter === "ALL" || asset.category === categoryFilter;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return 'bg-green-100 text-green-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'OVERDUE':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'CRANE':
        return 'bg-blue-100 text-blue-800';
      case 'SAFETY':
        return 'bg-red-100 text-red-800';
      case 'VESSEL':
        return 'bg-purple-100 text-purple-800';
      case 'ELECTRICAL':
        return 'bg-yellow-100 text-yellow-800';
      case 'MECHANICAL':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleDeleteAsset = (assetId: number) => {
    if (confirm("Are you sure you want to delete this asset?")) {
      deleteAssetMutation.mutate(assetId);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="hydro-card">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-hydro-dark flex items-center justify-between">
            <div className="flex items-center">
              <Package className="text-primary mr-3" />
              Manage Assets
            </div>
            <div className="text-sm font-normal text-gray-600">
              {filteredAssets.length} of {assets.length} assets
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search assets by name or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="VERIFIED">Verified</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="OVERDUE">Overdue</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Categories</SelectItem>
                <SelectItem value="CRANE">Crane</SelectItem>
                <SelectItem value="SAFETY">Safety</SelectItem>
                <SelectItem value="VESSEL">Vessel</SelectItem>
                <SelectItem value="ELECTRICAL">Electrical</SelectItem>
                <SelectItem value="MECHANICAL">Mechanical</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Assets Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAssets.map((asset) => (
              <Card key={asset.id} className="border hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-semibold text-lg">{asset.name}</h3>
                    <div className="flex space-x-1">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-800"
                        onClick={() => handleDeleteAsset(asset.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2 mb-3">
                    <div className="flex justify-between items-center">
                      <Badge className={getCategoryColor(asset.category)}>
                        {asset.category}
                      </Badge>
                      <Badge className={getStatusColor(asset.status)}>
                        {asset.status}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-gray-600">
                      <strong>Location:</strong> {asset.location}
                    </p>
                    
                    {asset.description && (
                      <p className="text-sm text-gray-600">{asset.description}</p>
                    )}
                    
                    {asset.lastVerified && (
                      <div className="flex items-center text-xs text-gray-500">
                        <Calendar className="w-3 h-3 mr-1" />
                        Last verified: {new Date(asset.lastVerified).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredAssets.length === 0 && (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No assets found</h3>
              <p className="text-gray-500">
                {searchTerm || statusFilter !== "ALL" || categoryFilter !== "ALL"
                  ? "Try adjusting your search or filters"
                  : "No assets have been added to this project yet"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}