"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Globe,
  Search,
  Upload,
  Download,
  CheckCircle,
  ExternalLink,
  Loader2,
} from "lucide-react";

interface DistributorCandidate {
  url: string;
  name?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  description?: string;
  logoUrl?: string;
  confidence: number;
  solarRelevance: number;
  productTypes: string[];
  productCount: number;
  reasoning: string;
}

interface BulkImportOptions {
  availableLists: Array<{
    id: string;
    name: string;
    description: string;
    count: number;
  }>;
  importMethods: Array<{
    id: string;
    name: string;
    description: string;
  }>;
  analysisModes: Array<{
    id: string;
    name: string;
    description: string;
  }>;
}

interface DistributorDiscoveryProps {
  onSuccess: () => void;
}

export default function DistributorDiscovery({ onSuccess }: DistributorDiscoveryProps) {
  const [activeTab, setActiveTab] = useState<'single' | 'bulk' | 'predefined'>('single');
  const [singleUrl, setSingleUrl] = useState('');
  const [urlList, setUrlList] = useState('');
  const [selectedList, setSelectedList] = useState('');
  const [analysisMode, setAnalysisMode] = useState('standard');
  const [saveToDatabase, setSaveToDatabase] = useState(true);
  
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{
    candidates: DistributorCandidate[];
  savedDistributors: Array<Record<string, unknown>>;
  summary: Record<string, number>;
  } | null>(null);
  const [bulkOptions, setBulkOptions] = useState<BulkImportOptions | null>(null);
  const [progress, setProgress] = useState(0);

  // Load bulk import options on mount
  React.useEffect(() => {
    loadBulkOptions();
  }, []);

  const loadBulkOptions = async () => {
    try {
      const response = await fetch('/api/distributors/bulk-import');
      const data = await response.json();
      if (data.success) {
        setBulkOptions(data);
      }
    } catch (error) {
      console.error('Failed to load bulk options:', error);
    }
  };

  const handleSingleUrlAnalysis = async () => {
    if (!singleUrl.trim()) {
      alert('Please enter a URL to analyze');
      return;
    }

    setLoading(true);
    setProgress(0);
    setResults(null);

    try {
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const response = await fetch('/api/distributors/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: singleUrl,
          saveToDatabase,
          useAI: analysisMode === 'ai',
          useBrowser: analysisMode === 'browser',
        }),
      });

      clearInterval(progressInterval);
      setProgress(100);

      const data = await response.json();
      if (data.success) {
        setResults(data);
        if (data.savedDistributors?.length > 0) {
          onSuccess();
        }
      } else {
        throw new Error(data.error || 'Analysis failed');
      }
    } catch (error) {
      console.error('Analysis failed:', error);
      alert(`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  const handleBulkImport = async () => {
    const urls = urlList.split('\n').filter(url => url.trim());
    
    if (urls.length === 0) {
      alert('Please enter at least one URL');
      return;
    }

    setLoading(true);
    setProgress(0);
    setResults(null);

    try {
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 2, 90));
      }, 1000);

      const response = await fetch('/api/distributors/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'urls',
          urls,
          saveToDatabase,
          analysisMode,
        }),
      });

      clearInterval(progressInterval);
      setProgress(100);

      const data = await response.json();
      if (data.success) {
        setResults(data);
        if (data.savedDistributors?.length > 0) {
          onSuccess();
        }
      } else {
        throw new Error(data.error || 'Bulk import failed');
      }
    } catch (error) {
      console.error('Bulk import failed:', error);
      alert(`Bulk import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  const handlePredefinedImport = async () => {
    if (!selectedList) {
      alert('Please select a predefined list');
      return;
    }

    setLoading(true);
    setProgress(0);
    setResults(null);

    try {
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 5, 90));
      }, 1000);

      const response = await fetch('/api/distributors/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'predefined',
          predefinedList: selectedList,
          saveToDatabase,
          analysisMode,
        }),
      });

      clearInterval(progressInterval);
      setProgress(100);

      const data = await response.json();
      if (data.success) {
        setResults(data);
        if (data.savedDistributors?.length > 0) {
          onSuccess();
        }
      } else {
        throw new Error(data.error || 'Import failed');
      }
    } catch (error) {
      console.error('Import failed:', error);
      alert(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-100 text-green-800 border-green-200';
    if (confidence >= 0.6) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return 'High Confidence';
    if (confidence >= 0.6) return 'Medium Confidence';
    return 'Low Confidence';
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Discover Solar Distributors
          </CardTitle>
          <CardDescription>
            Automatically find and analyze solar equipment distributors from any website
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Tab Navigation */}
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6">
            <button
              onClick={() => setActiveTab('single')}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'single'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Globe className="h-4 w-4 inline mr-2" />
              Single URL
            </button>
            <button
              onClick={() => setActiveTab('bulk')}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'bulk'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Upload className="h-4 w-4 inline mr-2" />
              Bulk URLs
            </button>
            <button
              onClick={() => setActiveTab('predefined')}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'predefined'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Download className="h-4 w-4 inline mr-2" />
              Predefined Lists
            </button>
          </div>

          {/* Analysis Mode Selection */}
          <div className="mb-6">
            <Label htmlFor="analysis-mode">Analysis Mode</Label>
            <Select value={analysisMode} onValueChange={setAnalysisMode}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select analysis mode" />
              </SelectTrigger>
              <SelectContent>
                {bulkOptions?.analysisModes.map((mode) => (
                  <SelectItem key={mode.id} value={mode.id}>
                    <div>
                      <div className="font-medium">{mode.name}</div>
                      <div className="text-sm text-gray-500">{mode.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Save to Database Toggle */}
          <div className="mb-6">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={saveToDatabase}
                onChange={(e) => setSaveToDatabase(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-sm">Automatically save discovered distributors to database</span>
            </label>
          </div>

          {/* Tab Content */}
          {activeTab === 'single' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="single-url">Website URL</Label>
                <Input
                  id="single-url"
                  type="url"
                  placeholder="https://example-solar-distributor.com"
                  value={singleUrl}
                  onChange={(e) => setSingleUrl(e.target.value)}
                  disabled={loading}
                />
              </div>
              <Button
                onClick={handleSingleUrlAnalysis}
                disabled={loading || !singleUrl.trim()}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Analyze Website
                  </>
                )}
              </Button>
            </div>
          )}

          {activeTab === 'bulk' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="url-list">Website URLs (one per line)</Label>
                <Textarea
                  id="url-list"
                  placeholder={`https://example1.com
https://example2.com
https://example3.com`}
                  value={urlList}
                  onChange={(e) => setUrlList(e.target.value)}
                  disabled={loading}
                  rows={8}
                />
              </div>
              <Button
                onClick={handleBulkImport}
                disabled={loading || !urlList.trim()}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Import URLs
                  </>
                )}
              </Button>
            </div>
          )}

          {activeTab === 'predefined' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="predefined-list">Select Distributor List</Label>
                <Select value={selectedList} onValueChange={setSelectedList}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose a predefined list" />
                  </SelectTrigger>
                  <SelectContent>
                    {bulkOptions?.availableLists.map((list) => (
                      <SelectItem key={list.id} value={list.id}>
                        <div>
                          <div className="font-medium">{list.name}</div>
                          <div className="text-sm text-gray-500">
                            {list.description} ({list.count} distributors)
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handlePredefinedImport}
                disabled={loading || !selectedList}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Import Predefined List
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Progress Bar */}
          {loading && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                <span>Processing...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {results && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Discovery Results
            </CardTitle>
            <CardDescription>
              Found {results.candidates.length} potential distributor candidates
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {results.summary.totalAnalyzed}
                </div>
                <div className="text-sm text-blue-600">Analyzed</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {results.summary.candidatesFound}
                </div>
                <div className="text-sm text-green-600">Candidates</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {results.summary.highConfidence}
                </div>
                <div className="text-sm text-purple-600">High Confidence</div>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {results.summary.saved}
                </div>
                <div className="text-sm text-orange-600">Saved</div>
              </div>
            </div>

            {/* Candidates List */}
            <div className="space-y-4">
              {results.candidates.map((candidate, index) => (
                <Card key={index} className="border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-lg">
                          {candidate.name || new URL(candidate.url).hostname}
                        </h3>
                        <a
                          href={candidate.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline flex items-center gap-1"
                        >
                          {candidate.url}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                      <Badge className={getConfidenceColor(candidate.confidence)}>
                        {getConfidenceLabel(candidate.confidence)} ({Math.round(candidate.confidence * 100)}%)
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                      <div>
                        <div className="text-sm text-gray-600">Contact Information</div>
                        <div className="space-y-1">
                          {candidate.email && (
                            <div className="text-sm">{candidate.email}</div>
                          )}
                          {candidate.phone && (
                            <div className="text-sm">{candidate.phone}</div>
                          )}
                          {candidate.address && (
                            <div className="text-sm text-gray-600">{candidate.address}</div>
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Product Analysis</div>
                        <div className="space-y-1">
                          <div className="text-sm">
                            <strong>{candidate.productCount}</strong> products found
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {candidate.productTypes.map((type, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {type.replace('_', ' ')}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {candidate.reasoning && (
                      <div className="bg-gray-50 p-3 rounded text-sm">
                        <strong>Analysis:</strong> {candidate.reasoning}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
