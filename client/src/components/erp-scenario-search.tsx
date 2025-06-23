import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Search, AlertTriangle, Clock, Users, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ERPScenario {
  id: string;
  title: string;
  content: string;
  category: 'medical' | 'fire' | 'marine' | 'environmental' | 'security' | 'diving' | 'weather' | 'operational';
  severity: 'low' | 'medium' | 'high' | 'critical';
  timeToRespond: string;
  requiredPersonnel: string[];
  keywords: string[];
}

interface ERPScenarioSearchProps {
  onScenarioSelect?: (scenario: ERPScenario) => void;
  showFullView?: boolean;
}

export function ERPScenarioSearch({ onScenarioSelect, showFullView = true }: ERPScenarioSearchProps) {
  const [query, setQuery] = useState('');
  const [scenarios, setScenarios] = useState<ERPScenario[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<ERPScenario | null>(null);
  const [loading, setLoading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const { toast } = useToast();

  const searchScenarios = async (searchQuery: string = query) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('q', searchQuery);
      if (categoryFilter) params.append('category', categoryFilter);
      if (severityFilter) params.append('severity', severityFilter);

      const response = await fetch(`/api/erp/scenarios?${params}`);
      if (response.ok) {
        const data = await response.json();
        setScenarios(data);
      } else {
        toast({
          title: "Error",
          description: "Failed to search emergency scenarios",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error searching scenarios:', error);
      toast({
        title: "Error",
        description: "Failed to connect to emergency response system",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    searchScenarios('');
  }, [categoryFilter, severityFilter]);

  const handleScenarioClick = (scenario: ERPScenario) => {
    if (showFullView) {
      setSelectedScenario(scenario);
    }
    if (onScenarioSelect) {
      onScenarioSelect(scenario);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-black';
      case 'low': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'medical': return 'bg-red-100 text-red-800 border-red-200';
      case 'fire': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'marine': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'environmental': return 'bg-green-100 text-green-800 border-green-200';
      case 'security': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'diving': return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      case 'weather': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'operational': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (selectedScenario && showFullView) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedScenario(null)}
              className="text-blue-600 hover:text-blue-800"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Search
            </Button>
          </div>
          <CardTitle className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-red-500" />
            {selectedScenario.title}
          </CardTitle>
          <div className="flex gap-2 flex-wrap">
            <Badge className={getSeverityColor(selectedScenario.severity)}>
              {selectedScenario.severity.toUpperCase()}
            </Badge>
            <Badge variant="outline" className={getCategoryColor(selectedScenario.category)}>
              {selectedScenario.category.toUpperCase()}
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {selectedScenario.timeToRespond}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Required Personnel
              </h4>
              <div className="flex gap-1 flex-wrap">
                {selectedScenario.requiredPersonnel.map((person, index) => (
                  <Badge key={index} variant="secondary">
                    {person}
                  </Badge>
                ))}
              </div>
            </div>
            
            <Separator />
            
            <div>
              <h4 className="font-semibold mb-3">Emergency Response Procedures</h4>
              <div className="bg-gray-50 p-4 rounded-lg">
                <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed">
                  {selectedScenario.content}
                </pre>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Emergency Response Scenarios
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Search and access HydroDive emergency response protocols
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Input */}
        <div className="flex gap-2">
          <Input
            placeholder="Search by incident type, keywords, or procedures..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                searchScenarios();
              }
            }}
            className="flex-1"
          />
          <Button 
            onClick={() => searchScenarios()}
            disabled={loading}
          >
            {loading ? 'Searching...' : 'Search'}
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Category:</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-sm border rounded px-2 py-1"
            >
              <option value="">All Categories</option>
              <option value="medical">Medical</option>
              <option value="fire">Fire</option>
              <option value="marine">Marine</option>
              <option value="environmental">Environmental</option>
              <option value="security">Security</option>
              <option value="diving">Diving</option>
              <option value="weather">Weather</option>
              <option value="operational">Operational</option>
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Severity:</label>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="text-sm border rounded px-2 py-1"
            >
              <option value="">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-4">
              <div className="text-sm text-muted-foreground">Searching scenarios...</div>
            </div>
          ) : scenarios.length === 0 ? (
            <div className="text-center py-4">
              <div className="text-sm text-muted-foreground">
                No emergency scenarios found. Try adjusting your search terms.
              </div>
            </div>
          ) : (
            scenarios.map((scenario) => (
              <Card
                key={scenario.id}
                className="cursor-pointer hover:bg-gray-50 transition-colors border-l-4 border-l-red-500"
                onClick={() => handleScenarioClick(scenario)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-2">{scenario.title}</h3>
                      <div className="flex gap-2 flex-wrap mb-2">
                        <Badge className={getSeverityColor(scenario.severity)}>
                          {scenario.severity.toUpperCase()}
                        </Badge>
                        <Badge variant="outline" className={getCategoryColor(scenario.category)}>
                          {scenario.category.toUpperCase()}
                        </Badge>
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {scenario.timeToRespond}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {scenario.content.substring(0, 150)}...
                      </p>
                    </div>
                    <div className="ml-4">
                      <AlertTriangle className={`h-5 w-5 ${
                        scenario.severity === 'critical' ? 'text-red-500' :
                        scenario.severity === 'high' ? 'text-orange-500' :
                        scenario.severity === 'medium' ? 'text-yellow-500' :
                        'text-green-500'
                      }`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}