import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, MapPin, User, Trash2, Edit } from "lucide-react";
import type { Client } from "@shared/schema";

interface ClientCardProps {
  client: Client;
  onEdit?: (client: Client) => void;
  onDelete?: (id: number) => void;
  userRole?: string;
}

export default function ClientCard({ client, onEdit, onDelete, userRole }: ClientCardProps) {
  const canModify = userRole === 'GOLD' || userRole === 'SILVER';

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200 hydro-card">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg font-semibold text-hydro-dark">
            {client.name}
          </CardTitle>
          {canModify && (
            <div className="flex gap-2">
              {onEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(client)}
                  className="h-8 w-8 p-0"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(client.id)}
                  className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {client.contactPerson && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <User className="h-4 w-4" />
            <span>{client.contactPerson}</span>
          </div>
        )}
        
        {client.email && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Mail className="h-4 w-4" />
            <a 
              href={`mailto:${client.email}`}
              className="hover:text-primary underline"
            >
              {client.email}
            </a>
          </div>
        )}
        
        {client.location && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <MapPin className="h-4 w-4" />
            <span>{client.location}</span>
          </div>
        )}
        
        <div className="pt-2 border-t">
          <Badge variant="outline" className="text-xs">
            Added {new Date(client.createdAt!).toLocaleDateString()}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}