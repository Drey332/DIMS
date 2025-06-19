import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Camera, Upload, MapPin, Clock, User, FolderOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PhotoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  incidentId?: number;
  projectId?: number;
}

export function PhotoUploadModal({ isOpen, onClose, incidentId, projectId }: PhotoUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [gpsLocation, setGpsLocation] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) throw new Error("No file selected");
      
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("description", description);
      formData.append("gpsLocation", gpsLocation);
      if (incidentId) formData.append("incidentId", incidentId.toString());
      if (projectId) formData.append("projectId", projectId.toString());
      
      // Add metadata
      const metadata = {
        timestamp: new Date().toISOString(),
        fileSize: selectedFile.size,
        fileType: selectedFile.type,
        deviceInfo: navigator.userAgent,
      };
      formData.append("metadata", JSON.stringify(metadata));
      
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Upload failed");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Photo uploaded successfully with compliance metadata",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/files"] });
      handleClose();
    },
    onError: (error) => {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      
      // Try to get GPS location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            setGpsLocation(`${latitude.toFixed(6)}°N, ${longitude.toFixed(6)}°E`);
          },
          (error) => {
            console.log("GPS unavailable:", error);
            setGpsLocation("Location not available");
          }
        );
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !description.trim()) {
      toast({
        title: "Validation Error",
        description: "Please select a file and provide a description",
        variant: "destructive",
      });
      return;
    }
    uploadMutation.mutate();
  };

  const handleClose = () => {
    setSelectedFile(null);
    setDescription("");
    setGpsLocation("");
    onClose();
  };

  const currentTimestamp = new Date().toLocaleString();
  const currentUser = "David Mooney (GOLD)";
  const currentProject = "863-01-24";

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Camera className="w-5 h-5 mr-2" />
            Upload Evidence Photo
          </DialogTitle>
          <DialogDescription>
            Upload timestamped photo evidence with GPS location and metadata for incident documentation.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            {selectedFile ? (
              <div className="space-y-2">
                <div className="text-green-600 text-4xl">✓</div>
                <p className="text-sm font-medium text-green-700">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-gray-500">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            ) : (
              <>
                <Camera className="mx-auto text-4xl text-gray-400 mb-4" />
                <p className="text-gray-600 mb-2">Take photo or select from device</p>
              </>
            )}
            <Input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              id="photo-upload"
            />
            <Label htmlFor="photo-upload">
              <Button type="button" className="hydro-button-primary" asChild>
                <div className="cursor-pointer">
                  <Upload className="w-3 h-3 mr-2" />
                  {selectedFile ? "Change Photo" : "Select Photo"}
                </div>
              </Button>
            </Label>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-hydro-dark mb-2">Automatic Metadata</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <div className="flex items-center">
                <Clock className="w-3 h-3 mr-2" />
                Timestamp: <span className="font-medium ml-1">{currentTimestamp}</span>
              </div>
              <div className="flex items-center">
                <MapPin className="w-3 h-3 mr-2" />
                GPS Location: <span className="font-medium ml-1">{gpsLocation || "Detecting..."}</span>
              </div>
              <div className="flex items-center">
                <User className="w-3 h-3 mr-2" />
                User: <span className="font-medium ml-1">{currentUser}</span>
              </div>
              <div className="flex items-center">
                <FolderOpen className="w-3 h-3 mr-2" />
                Project: <span className="font-medium ml-1">{currentProject}</span>
              </div>
            </div>
          </div>
          
          <div>
            <Label htmlFor="description" className="text-sm font-medium text-hydro-dark">
              Description (Required)
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this photo documents..."
              rows={3}
              className="mt-1"
              required
            />
          </div>
          
          <div className="flex space-x-3">
            <Button
              type="submit"
              className="flex-1 hydro-button-primary"
              disabled={uploadMutation.isPending || !selectedFile || !description.trim()}
            >
              {uploadMutation.isPending ? "Uploading..." : "Upload"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={handleClose}
              disabled={uploadMutation.isPending}
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
