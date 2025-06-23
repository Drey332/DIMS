import React from 'react';
import { ERPScenarioSearch } from '@/components/erp-scenario-search';

export default function EmergencyProtocols() {
  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Emergency Response Protocols</h1>
        <p className="text-gray-600 mt-2">
          Access HydroDive's comprehensive emergency response procedures and incident-specific protocols
        </p>
      </div>
      
      <ERPScenarioSearch />
    </div>
  );
}