import { useEffect, useRef, useState } from 'react';
import { Message } from '@/types';

export function useWebSocket() {
  const ws = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [lastMessage, setLastMessage] = useState<any>(null);

  useEffect(() => {
    let reconnectTimeout: NodeJS.Timeout;
    let mounted = true;
    
    const connect = () => {
      if (!mounted) return;
      
      try {
        // Close existing connection first
        if (ws.current && ws.current.readyState !== WebSocket.CLOSED) {
          ws.current.close();
        }
        
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        
        ws.current = new WebSocket(wsUrl);
        
        ws.current.onopen = () => {
          if (!mounted) return;
          console.log('WebSocket connected');
          setIsConnected(true);
        };
        
        ws.current.onmessage = (event) => {
          if (!mounted) return;
          try {
            const data = JSON.parse(event.data);
            setLastMessage(data);
            
            if (data.type === 'NEW_MESSAGE') {
              setMessages(prev => [data.message, ...prev]);
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };
        
        ws.current.onclose = (event) => {
          if (!mounted) return;
          console.log('WebSocket disconnected', event.code, event.reason);
          setIsConnected(false);
          
          // Only reconnect if not a normal closure and component is still mounted
          if (event.code !== 1000 && mounted) {
            reconnectTimeout = setTimeout(connect, 3000);
          }
        };
        
        ws.current.onerror = (error) => {
          if (!mounted) return;
          console.error('WebSocket error:', error);
          setIsConnected(false);
        };
      } catch (error) {
        if (!mounted) return;
        console.error('Failed to create WebSocket connection:', error);
        setIsConnected(false);
        if (mounted) {
          reconnectTimeout = setTimeout(connect, 5000); // Longer delay on connection errors
        }
      }
    };
    
    // Delay initial connection to avoid conflicts with HMR
    const initialTimeout = setTimeout(connect, 1000);
    
    return () => {
      mounted = false;
      if (initialTimeout) {
        clearTimeout(initialTimeout);
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (ws.current && ws.current.readyState !== WebSocket.CLOSED) {
        ws.current.close(1000, 'Component unmounting');
      }
    };
  }, []);

  const sendMessage = (message: any) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    }
  };

  return {
    isConnected,
    messages,
    sendMessage,
    lastMessage,
  };
}
