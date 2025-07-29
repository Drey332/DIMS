import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

export function AssetAIChat({ assetId, assetName }: { assetId: string, assetName?: string }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const askAI = async (e: React.FormEvent) => {
    e.preventDefault();
    setAnswer(null);
    setError(null);
    setLoading(true);
    try {
      const resp = await fetch(`/api/ai-asset/assistant/${assetId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Unknown error");
      setAnswer(data.answer);
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    }
    setLoading(false);
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>AI Assistant for {assetName || "Asset"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={askAI} className="flex flex-col gap-2">
          <Textarea
            value={question}
            onChange={e => setQuestion(e.target.value)}
            placeholder="Ask anything about this asset. (e.g., Recommended next maintenance? Any red flags?)"
            required
            className="resize-none"
            rows={3}
          />
          <Button type="submit" disabled={loading || !question}>
            {loading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : null}
            Ask AI
          </Button>
        </form>
        {answer && (
          <div className="mt-4 p-3 rounded-xl border bg-gray-50 text-sm text-gray-900">
            <b>Assistant:</b>
            <div className="whitespace-pre-line mt-2">{answer}</div>
          </div>
        )}
        {error && (
          <div className="mt-4 p-2 bg-red-100 text-red-800 rounded">{error}</div>
        )}
      </CardContent>
    </Card>
  );
}
// At the bottom of your file, or in AssetAIChat.tsx if you prefer
const AssetAIChatWidget = () => (
  <div
    style={{
      position: "fixed",
      bottom: "28px",
      right: "32px",
      zIndex: 1200,
      maxWidth: 420,
      width: "100%",
    }}
    className="shadow-2xl rounded-xl bg-white border border-gray-200"
  >
    <AssetAIChat/>
  </div>
);