import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, Send } from "lucide-react";
import { Message } from "@/types";
import { apiRequest } from "@/lib/queryClient";
import { useWebSocket } from "@/hooks/useWebSocket";

export function CommunicationHub() {
  const [newMessage, setNewMessage] = useState("");
  const queryClient = useQueryClient();
  const { messages: wsMessages, sendMessage: sendWsMessage, isConnected } = useWebSocket();

  const { data: messages = [], isLoading } = useQuery<Message[]>({
    queryKey: ["/api/messages", { projectId: 1 }], // Forcados project
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      await apiRequest("POST", "/api/messages", {
        content,
        projectId: 1,
        messageType: "CHAT",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      setNewMessage("");
    },
  });

  // Default messages for demo
  const defaultMessages = [
    {
      id: 1,
      senderId: 4,
      content: "Equipment inspection completed. Photos uploaded to system. All systems operational.",
      messageType: "CHAT",
      isUrgent: false,
      createdAt: "2025-01-24T14:32:00Z",
      sender: { firstName: "Nick", lastName: "Roddy", role: "BRONZE" }
    },
    {
      id: 2,
      senderId: 3,
      content: "Acknowledged. Please proceed with next phase checklist.",
      messageType: "CHAT",
      isUrgent: false,
      createdAt: "2025-01-24T14:35:00Z",
      sender: { firstName: "Kene", lastName: "Anyabolu", role: "SILVER" }
    },
    {
      id: 3,
      senderId: 1,
      content: "Weather update: Window extended by 2 hours. Continue operations as planned.",
      messageType: "CHAT",
      isUrgent: false,
      createdAt: "2025-01-24T14:38:00Z",
      sender: { firstName: "David", lastName: "Mooney", role: "GOLD" }
    }
  ];

  const displayMessages = messages.length > 0 ? messages : defaultMessages;
  const allMessages = [...displayMessages, ...wsMessages].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    sendMessageMutation.mutate(newMessage);
    
    // Also send via WebSocket for real-time updates
    if (isConnected) {
      sendWsMessage({
        type: 'NEW_MESSAGE',
        content: newMessage,
        projectId: 1,
        timestamp: new Date().toISOString(),
      });
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'GOLD':
        return 'bg-gold text-gold-foreground';
      case 'SILVER':
        return 'bg-silver text-silver-foreground';
      case 'BRONZE':
        return 'bg-bronze text-bronze-foreground';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`;
  };

  return (
    <Card className="hydro-card">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-hydro-dark flex items-center justify-between">
          <div className="flex items-center">
            <MessageCircle className="text-primary mr-3" />
            Command Communications
          </div>
          {isConnected && (
            <div className="flex items-center space-x-2 text-sm text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Live</span>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-64 bg-gray-50 rounded-lg p-4 mb-4">
          {isLoading ? (
            <div className="text-center text-gray-500">Loading messages...</div>
          ) : (
            <div className="space-y-3">
              {allMessages.map((message) => (
                <div key={message.id} className="flex items-start space-x-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${getRoleColor(message.sender?.role || 'BRONZE')}`}>
                    {getInitials(message.sender?.firstName || 'U', message.sender?.lastName || 'U')}
                  </div>
                  <div className="flex-1 bg-white rounded-lg p-2 shadow-sm">
                    <div className="text-xs text-gray-500 mb-1">
                      {message.sender?.firstName} {message.sender?.lastName} ({message.sender?.role}) • {' '}
                      {new Date(message.createdAt).toLocaleTimeString()}
                    </div>
                    <div className="text-sm">{message.content}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        
        <form onSubmit={handleSendMessage} className="flex space-x-2">
          <Input
            type="text"
            placeholder="Send message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-1"
          />
          <Button 
            type="submit" 
            className="hydro-button-primary"
            disabled={sendMessageMutation.isPending || !newMessage.trim()}
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
