import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileImage, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function AssetUpload() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [assetData, setAssetData] = useState({
    name: "",
    category: "",
    location: "",
    description: "",
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (data: FormData) => {
      return await apiRequest("POST", "/api/upload", data);
    },
    onSuccess: () => {
      toast({
        title: "Asset uploaded successfully",
        description: "The asset has been added to the system.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      // Reset form
      setSelectedFile(null);
      setAssetData({ name: "", category: "", location: "", description: "" });
    },
    onError: (error: any) => {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload asset",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select a file to upload",
        variant: "destructive",
      });
      return;
    }

    if (!assetData.name || !assetData.category || !assetData.location) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("name", assetData.name);
    formData.append("category", assetData.category);
    formData.append("location", assetData.location);
    formData.append("description", assetData.description);
    formData.append("projectId", "1"); // Forcados project

    uploadMutation.mutate(formData);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <Card className="hydro-card">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-hydro-dark flex items-center">
              <Upload className="text-primary mr-3" />
              Upload New Asset
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* File Upload */}
              <div className="space-y-2">
                <Label htmlFor="file-upload">Asset Photo/Document *</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <input
                    id="file-upload"
                    type="file"
                    accept="image/*,.pdf,.doc,.docx"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    {selectedFile ? (
                      <div className="flex items-center justify-center space-x-2">
                        <FileImage className="w-8 h-8 text-green-600" />
                        <span className="text-sm font-medium">{selectedFile.name}</span>
                      </div>
                    ) : (
                      <div>
                        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">
                          Click to upload or drag and drop
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Images, PDF, or Word documents
                        </p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {/* Asset Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Asset Name *</Label>
                  <Input
                    id="name"
                    value={assetData.name}
                    onChange={(e) => setAssetData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Crane #3, Safety Equipment"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    value={assetData.category}
                    onValueChange={(value) => setAssetData(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CRANE">Crane Equipment</SelectItem>
                      <SelectItem value="SAFETY">Safety Equipment</SelectItem>
                      <SelectItem value="VESSEL">Marine Vessel</SelectItem>
                      <SelectItem value="STRUCTURE">Platform Structure</SelectItem>
                      <SelectItem value="ELECTRICAL">Electrical Systems</SelectItem>
                      <SelectItem value="MECHANICAL">Mechanical Systems</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location *</Label>
                <Input
                  id="location"
                  value={assetData.location}
                  onChange={(e) => setAssetData(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="e.g., Platform A, Deck 3, Port Side"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={assetData.description}
                  onChange={(e) => setAssetData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Additional details about the asset..."
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg">
                <AlertCircle className="w-5 h-5 text-blue-600" />
                <p className="text-sm text-blue-800">
                  All uploaded assets will be timestamped and GPS tagged for audit compliance.
                </p>
              </div>

              <Button
                type="submit"
                className="w-full hydro-button-primary"
                disabled={uploadMutation.isPending}
              >
                {uploadMutation.isPending ? "Uploading..." : "Upload Asset"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}