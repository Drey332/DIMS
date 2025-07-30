import React, { useState, useEffect } from "react";
import { AlertTriangle, MapPin, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { db, auth } from "../firebase";
import { doc, setDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";

interface EmergencyAlarmModalProps {
  isOpen: boolean;
  onClose: () => void;
  incidentId: string;
  incidentTitle: string;
  severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

interface User {
  uid: string;
  displayName: string | null;
  photoURL: string | null;
  email: string | null;
}

export function EmergencyAlarmModal({ 
  isOpen, 
  onClose, 
  incidentId, 
  incidentTitle,
  severity = "HIGH" 
}: EmergencyAlarmModalProps) {
  const [isAcknowledging, setIsAcknowledging] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [hasAcknowledged, setHasAcknowledged] = useState(false);
  const [strobeEffect, setStrobeEffect] = useState(true);
  const { toast } = useToast();

  // Monitor auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user: any) => {
      if (user) {
        setCurrentUser({
          uid: user.uid,
          displayName: user.displayName,
          photoURL: user.photoURL,
          email: user.email
        });
      } else {
        setCurrentUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  // Strobe effect for emergency alarm
  useEffect(() => {
    if (!isOpen || hasAcknowledged) {
      setStrobeEffect(false);
      return;
    }

    const interval = setInterval(() => {
      setStrobeEffect(prev => !prev);
    }, 500);

    return () => clearInterval(interval);
  }, [isOpen, hasAcknowledged]);

  // Play alarm sound (optional - add audio file to public folder)
  useEffect(() => {
    if (isOpen && !hasAcknowledged) {
      const audio = new Audio('/emergency-alarm.mp3'); // Add this file to public folder
      audio.loop = true;
      audio.volume = 0.7;
      audio.play().catch(console.error); // Browser may block autoplay

      return () => {
        audio.pause();
        audio.currentTime = 0;
      };
    }
  }, [isOpen, hasAcknowledged]);

  const getSeverityColors = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-600 border-red-700 text-white';
      case 'HIGH':
        return 'bg-orange-500 border-orange-600 text-white';
      case 'MEDIUM':
        return 'bg-yellow-500 border-yellow-600 text-black';
      case 'LOW':
        return 'bg-blue-500 border-blue-600 text-white';
      default:
        return 'bg-red-600 border-red-700 text-white';
    }
  };

  const requestLocationAndAcknowledge = async () => {
    if (!currentUser) {
      toast({
        title: "Authentication Required",
        description: "Please log in to acknowledge emergency",
        variant: "destructive"
      });
      return;
    }

    setIsAcknowledging(true);

    try {
      let lat: number | null = null;
      let lng: number | null = null;
      let locationError: string | null = null;

      // Request geolocation with clear prompt
      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
              resolve,
              reject,
              {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000 // 5 minutes
              }
            );
          });

          lat = position.coords.latitude;
          lng = position.coords.longitude;
          
          toast({
            title: "Location Captured",
            description: "Your location has been recorded for emergency response",
          });
        } catch (geoError: any) {
          locationError = geoError.message;
          console.warn("Geolocation error:", geoError);
          
          // Show user-friendly message based on error
          const errorMessage = geoError.code === 1 
            ? "Location access denied. Acknowledgment saved without location."
            : "Could not get location. Acknowledgment saved without location.";
          
          toast({
            title: "Location Unavailable",
            description: errorMessage,
            variant: "destructive"
          });
        }
      } else {
        locationError = "Geolocation not supported";
        toast({
          title: "Location Not Supported",
          description: "Your device doesn't support location services",
          variant: "destructive"
        });
      }

      // Save acknowledgment to Firestore with flat fields
      const ackData = {
        userId: currentUser.uid,
        name: currentUser.displayName || currentUser.email || "Unknown User",
        photoURL: currentUser.photoURL,
        email: currentUser.email,
        lat: lat, // Flat field
        lng: lng, // Flat field
        acknowledgedAt: new Date().toISOString(),
        timestamp: new Date().toISOString(),
        locationError: locationError,
        userAgent: navigator.userAgent,
        // Legacy nested format for backward compatibility
        gps: lat && lng ? {
          latitude: lat,
          longitude: lng,
          accuracy: null,
          timestamp: new Date().toISOString()
        } : null
      };

      // Save to Firestore
      await setDoc(
        doc(db, "emergencies", incidentId, "acks", currentUser.uid),
        ackData
      );

      setHasAcknowledged(true);
      
      toast({
        title: "Emergency Acknowledged",
        description: `You have successfully acknowledged the emergency: ${incidentTitle}`,
      });

      // Auto-close after acknowledgment
      setTimeout(() => {
        onClose();
      }, 2000);

    } catch (error: any) {
      console.error("Error acknowledging emergency:", error);
      toast({
        title: "Acknowledgment Failed",
        description: error.message || "Failed to record emergency acknowledgment",
        variant: "destructive"
      });
    } finally {
      setIsAcknowledging(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm">
      {/* Strobe Effect Overlay */}
      {strobeEffect && !hasAcknowledged && (
        <div className="absolute inset-0 bg-red-500/30 animate-pulse pointer-events-none" />
      )}
      
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className={`w-full max-w-2xl mx-auto ${getSeverityColors(severity)} border-4 shadow-2xl animate-bounce`}>
          <CardContent className="p-8 text-center">
            {/* Close Button - only show after acknowledgment */}
            {hasAcknowledged && (
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-white/80 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            )}

            {/* Emergency Icon */}
            <div className="mb-6">
              <AlertTriangle 
                className={`w-24 h-24 mx-auto ${hasAcknowledged ? 'text-green-400' : 'text-white animate-ping'}`} 
              />
            </div>

            {/* Alert Content */}
            {!hasAcknowledged ? (
              <>
                <h1 className="text-4xl font-bold mb-4 uppercase tracking-wider">
                  EMERGENCY ALERT
                </h1>
                
                <div className="bg-black/20 rounded-lg p-4 mb-6">
                  <h2 className="text-2xl font-semibold mb-2">
                    {incidentTitle}
                  </h2>
                  <p className="text-lg opacity-90">
                    Severity: {severity}
                  </p>
                </div>

                <div className="mb-8">
                  <p className="text-xl mb-4 font-medium">
                    🚨 IMMEDIATE ACTION REQUIRED 🚨
                  </p>
                  <p className="text-lg opacity-90">
                    Click "Acknowledge & Muster" to confirm you are safe and share your location for emergency response coordination.
                  </p>
                </div>

                {/* Acknowledge Button */}
                <Button
                  onClick={requestLocationAndAcknowledge}
                  disabled={isAcknowledging || !currentUser}
                  className="w-full py-6 text-2xl font-bold bg-white text-red-600 hover:bg-gray-100 border-4 border-white"
                >
                  {isAcknowledging ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600 mr-3"></div>
                      Processing...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <MapPin className="w-8 h-8 mr-3" />
                      Acknowledge & Muster
                    </div>
                  )}
                </Button>

                {!currentUser && (
                  <p className="mt-4 text-sm opacity-75">
                    Please log in to acknowledge the emergency
                  </p>
                )}

                {/* Location Permission Info */}
                <div className="mt-6 bg-black/20 rounded-lg p-4">
                  <p className="text-sm opacity-90">
                    📍 Location permission will be requested to help emergency responders locate you.
                    If you deny location access, your acknowledgment will still be recorded.
                  </p>
                </div>
              </>
            ) : (
              /* Acknowledgment Success */
              <div className="text-green-400">
                <div className="mb-6">
                  <div className="w-24 h-24 mx-auto bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"></path>
                    </svg>
                  </div>
                </div>
                
                <h2 className="text-3xl font-bold mb-4">
                  Emergency Acknowledged
                </h2>
                
                <p className="text-xl mb-4">
                  Thank you for confirming your status.
                </p>
                
                <p className="text-lg opacity-90">
                  Emergency response teams have been notified of your acknowledgment.
                  Please follow all emergency procedures and await further instructions.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default EmergencyAlarmModal;