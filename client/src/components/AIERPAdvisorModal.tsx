import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type AIERPAdvisorModalProps = {
  open: boolean;
  onClose: () => void;
  loading: boolean;
  aiData: any;
  aiOverrides: Record<string, string>;
  setAiOverrides: (v: Record<string, string>) => void;
  aiSaving: boolean;
  onSave: () => Promise<void>;
  onOverride: () => Promise<void>; // <-- add this line
};


  export function AIERPAdvisorModal({
    open,
    onClose,
    loading,
    aiData,
    aiOverrides,
    setAiOverrides,
    aiSaving,
    onSave,
    onOverride,
  }: AIERPAdvisorModalProps) {
  if (!open) return null;

  const noAISuggestions =
    !loading &&
    !aiData?.error &&
    !(
      aiData?.corrections ||
      aiData?.improvedKeywords ||
      aiData?.improvedProtocol ||
      aiData?.modelReference ||
      aiData?.missingSteps ||
      aiData?.industryNotes ||
      (Array.isArray(aiData?.fmecaTable) && aiData.fmecaTable.length > 0)
    );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-6">
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col p-4 sm:p-8 animate-fade-in">
        {/* Close Button */}
        <button
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-900 text-2xl"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
        <h3 className="text-xl sm:text-2xl font-bold mb-4 text-hydro-dark text-center">
          AI ERP Advisor Results
        </h3>

        {/* Loading State */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-10">
            <div className="animate-spin h-10 w-10 border-4 border-hydro-dark border-t-transparent rounded-full mb-4"></div>
            <div className="text-gray-500 text-lg">Analyzing with AI...</div>
          </div>
        ) : aiData?.error ? (
          <div className="text-red-600 text-lg text-center">{aiData.error}</div>
        ) : (
          <div className="space-y-4">
            {/* AI Corrections */}
            {aiData?.corrections && Object.keys(aiData.corrections).length > 0 && (
              <section className="bg-yellow-50 border-l-4 border-yellow-500 rounded-lg p-4">
                <div className="font-bold text-yellow-900 mb-1">AI Corrections:</div>
                <ul className="list-disc ml-5">
                  {Object.entries(aiData.corrections).map(([field, suggestion]) => (
                    <li key={field} className="mb-1">
                      <span className="font-semibold">{field}:</span>
                      <Input
                        className="inline-block w-auto px-2 py-1 text-sm ml-2"
                        value={aiOverrides[field] ?? suggestion}
                        onChange={e =>
                          setAiOverrides({
                            ...aiOverrides,
                            [field]: e.target.value
                          })
                        }
                        style={{ display: "inline-block", minWidth: 120 }}
                      />
                    </li>
                  ))}
                </ul>
                <div className="text-xs text-gray-500 mt-2">Edit any AI suggestion before saving.</div>
              </section>
            )}

            {/* Improved Keywords */}
            {aiData?.improvedKeywords && (
              <section className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4">
                <div className="font-bold text-blue-900 mb-1">Improved Keywords:</div>
                <div className="font-mono text-blue-700 text-sm">{aiData.improvedKeywords}</div>
              </section>
            )}

            {/* Improved Protocol */}
            {aiData?.improvedProtocol && (
              <section className="bg-green-50 border-l-4 border-green-500 rounded-lg p-4">
                <div className="font-bold text-green-900 mb-1">Improved Protocol:</div>
                <div className="text-green-800 whitespace-pre-line text-sm">{aiData.improvedProtocol}</div>
              </section>
            )}

            {/* Model Reference */}
            {aiData?.modelReference && (
              <section className="bg-gray-50 border-l-4 border-gray-400 rounded-lg p-4">
                <div className="font-bold text-gray-900 mb-1">Model Reference:</div>
                <div className="text-gray-800 text-sm">{aiData.modelReference}</div>
              </section>
            )}

            {/* Missing Steps */}
            {aiData?.missingSteps && (
              <section className="bg-yellow-100 border-l-4 border-yellow-600 rounded-lg p-4">
                <div className="font-bold text-yellow-900 mb-1">Missing Steps:</div>
                <div className="text-yellow-700 text-sm">{aiData.missingSteps}</div>
              </section>
            )}

            {/* Industry Notes */}
            {aiData?.industryNotes && (
              <section className="bg-indigo-50 border-l-4 border-indigo-400 rounded-lg p-4">
                <div className="font-bold text-indigo-900 mb-1">Industry Notes:</div>
                <div className="text-indigo-800 text-sm">{aiData.industryNotes}</div>
              </section>
            )}

            {/* FMECA Table */}
            {Array.isArray(aiData?.fmecaTable) && aiData.fmecaTable.length > 0 && (
              <section className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="font-bold text-gray-800 mb-1">FMECA Table:</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-separate border-spacing-y-1">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="font-bold px-2 py-1 text-left">Mode</th>
                        <th className="font-bold px-2 py-1 text-left">Effect</th>
                        <th className="font-bold px-2 py-1 text-left">Control</th>
                        <th className="font-bold px-2 py-1 text-left">Criticality</th>
                      </tr>
                    </thead>
                    <tbody>
                      {aiData.fmecaTable.map((row: any, i: number) => (
                        <tr key={i}>
                          <td className="px-2 py-1">{row.mode}</td>
                          <td className="px-2 py-1">{row.effect}</td>
                          <td className="px-2 py-1">{row.control}</td>
                          <td className="px-2 py-1">{row.criticality}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* No Suggestions Message */}
            {noAISuggestions && (
              <div className="text-gray-500 text-center py-8">
                The AI has no suggestions or improvements for your protocol.
              </div>
            )}

            {/* Accept & Save / Cancel / Override Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-end mt-5">
              <Button
                onClick={onSave}
                className="hydro-button-primary font-bold px-7"
                disabled={aiSaving}
              >
                {aiSaving ? "Saving..." : "Accept & Save"}
              </Button>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button
                variant="outline"
                className="bg-gray-200 text-gray-800 font-bold"
                disabled={aiSaving}
                onClick={onOverride}
              >
                {aiSaving ? "Saving..." : "Override: Keep My ERP"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}