import { useQuery } from "@tanstack/react-query";
import { CommandDashboard } from "@/components/command-dashboard";
import { DecisionMakingModel } from "@/components/decision-making-model";
import { EmergencyContacts } from "@/components/emergency-contacts";
import { CommunicationHub } from "@/components/communication-hub";
import { AuditTrail } from "@/components/audit-trail";
import { useState } from "react";
import { PhotoUploadModal } from "@/components/photo-upload-modal";

export default function Dashboard() {
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);

  // Default user and project data for HydroDive Forcados project
  const user = {
    role: "GOLD",
    name: "David Mooney",
    title: "General Manager",
    initials: "DM"
  };

  const project = {
    name: "Forcados ACOE Decommissioning Project",
    number: "863-01-24",
    client: "Shell Petroleum Development Company (SPDC)"
  };

  return (
    <div>
      <main>
        <CommandDashboard />
        <DecisionMakingModel />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <EmergencyContacts />
          <CommunicationHub />
        </div>
        <AuditTrail />
      </main>
      
      <PhotoUploadModal
        isOpen={isPhotoModalOpen}
        onClose={() => setIsPhotoModalOpen(false)}
        projectId={1}
      />
    </div>
  );
}
