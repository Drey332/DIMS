import { useEffect, useRef, useState } from 'react';
import { Message } from '@/types';

export function useWebSocket() {
  const ws = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const connecting = useRef(false);
  const reconnectCount = useRef(0);

  useEffect(() => {
    let reconnectTimeout: NodeJS.Timeout;
    let mounted = true;
    
    const connect = () => {
      if (!mounted || connecting.current) return;
      
      // Prevent excessive reconnections
      if (reconnectCount.current > 5) {
        console.log('Too many reconnection attempts, stopping');
        return;
      }
      
      connecting.current = true;
      
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
          connecting.current = false;
          reconnectCount.current = 0; // Reset counter on successful connection
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
          connecting.current = false;
          
          // Only reconnect if not a normal closure and component is still mounted
          if (event.code !== 1000 && mounted && reconnectCount.current <= 5) {
            reconnectCount.current++;
            const delay = Math.min(3000 * reconnectCount.current, 30000); // Exponential backoff
            reconnectTimeout = setTimeout(connect, delay);
          }
        };
        
        ws.current.onerror = (error) => {
          if (!mounted) return;
          console.error('WebSocket error:', error);
          setIsConnected(false);
          connecting.current = false;
        };
      } catch (error) {
        if (!mounted) return;
        console.error('Failed to create WebSocket connection:', error);
        setIsConnected(false);
        connecting.current = false;
        if (mounted && reconnectCount.current <= 5) {
          reconnectCount.current++;
          const delay = Math.min(5000 * reconnectCount.current, 30000);
          reconnectTimeout = setTimeout(connect, delay);
        }
      }
    };
    
    // Only connect if not in development HMR mode
    if (import.meta.env.MODE === 'development') {
      // Longer delay in development to avoid HMR conflicts
      const initialTimeout = setTimeout(connect, 2000);
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
    } else {
      connect();
    }
    
    return () => {
      mounted = false;
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
