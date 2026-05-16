import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import ClientCard from "@/features/clients/ClientCard";
import ClientForm from "@/features/clients/ClientForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Plus, Users, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Client, InsertClient } from "@shared/schema";

export default function ClientsPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get current user to check permissions
  const { data: user } = useQuery({
    queryKey: ['/api/user/profile'],
    queryFn: () => fetch('/api/user/profile').then(res => res.json()),
  });

  // Fetch clients
  const { data: clients = [], isLoading, error } = useQuery({
    queryKey: ['/api/clients'],
    queryFn: () => fetch('/api/clients').then(res => res.json()),
  });

  // Create client mutation
  const createClientMutation = useMutation({
    mutationFn: (clientData: InsertClient) => 
      apiRequest('/api/clients', 'POST', clientData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      setShowForm(false);
      toast({
        title: "Success",
        description: "Client created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create client",
        variant: "destructive",
      });
    },
  });

  // Update client mutation
  const updateClientMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<InsertClient> }) =>
      apiRequest(`/api/clients/${id}`, 'PUT', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      setEditingClient(null);
      toast({
        title: "Success",
        description: "Client updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update client",
        variant: "destructive",
      });
    },
  });

  // Delete client mutation
  const deleteClientMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/clients/${id}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      toast({
        title: "Success",
        description: "Client deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete client",
        variant: "destructive",
      });
    },
  });

  const handleAddClient = (clientData: InsertClient) => {
    createClientMutation.mutate(clientData);
  };

  const handleEditClient = (client: Client) => {
    setEditingClient(client);
    setShowForm(true);
  };

  const handleUpdateClient = (clientData: InsertClient) => {
    if (editingClient) {
      updateClientMutation.mutate({ id: editingClient.id, data: clientData });
    }
  };

  const handleDeleteClient = (id: number) => {
    if (confirm("Are you sure you want to delete this client?")) {
      deleteClientMutation.mutate(id);
    }
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingClient(null);
  };

  const canCreateClients = user?.role === 'GOLD' || user?.role === 'SILVER';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading clients...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="m-6">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load clients. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <main>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold text-hydro-dark">Client Management</h1>
              <p className="text-gray-600">Manage your client organizations and contacts</p>
            </div>
        </div>
        
        {canCreateClients && (
            <Button
              onClick={() => setShowForm(true)}
              className="gap-2"
              disabled={showForm}
            >
              <Plus className="h-4 w-4" />
              Add New Client
            </Button>
        )}
      </div>

        {showForm && (
          <ClientForm
            client={editingClient || undefined}
            onSave={editingClient ? handleUpdateClient : handleAddClient}
            onCancel={handleCancelForm}
          />
        )}

        {clients.length === 0 ? (
          <Card className="hydro-card">
            <CardHeader>
              <CardTitle className="text-center text-gray-600">No Clients Found</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">
                No clients have been added yet.
              </p>
              {canCreateClients && (
                <Button onClick={() => setShowForm(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Your First Client
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clients.map((client: Client) => (
              <ClientCard
                key={client.id}
                client={client}
                onEdit={canCreateClients ? handleEditClient : undefined}
                onDelete={canCreateClients ? handleDeleteClient : undefined}
                userRole={user?.role}
              />
            ))}
          </div>
        )}
    </main>
  );
}
