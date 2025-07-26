'use client';

import { AlertTriangle, ChevronDown, ChevronRight, Shield, Zap, Leaf, Lock, Scale, User, FileText, Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useState } from 'react';
import { 
  RISK_CATEGORIES,
  ENHANCED_RISK_FACTORS,
  type RiskFactorInfo
} from '@/lib/risk-factors-enhanced';
import riskFactorsData from '@/lib/risk-factors-data.json';
import { RiskLevelBadges } from '@/components/common/RiskLevelBadge';
import { TypeBadge } from '@/components/common/TypeBadge';

interface RiskFactorsDisplayProps {
  riskFactors: Array<{ id?: string; factor?: string; description?: string; severity?: string }> | Record<string, unknown>;
  title?: string;
  showTitle?: boolean;
  riskScores?: Record<string, number>;
}

export function RiskFactorsDisplay({ 
  riskFactors, 
  title = "Risk Factors Found",
  showTitle = true,
  riskScores 
}: RiskFactorsDisplayProps) {
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});
  const [expandedRiskFactors, setExpandedRiskFactors] = useState<Record<string, boolean>>({});

  // Convert risk factors to array of IDs
  const riskFactorIds = Array.isArray(riskFactors) 
    ? riskFactors.map(rf => {
        if (typeof rf === 'object' && rf !== null && 'id' in rf) {
          return (rf as { id: string }).id;
        }
        if (typeof rf === 'object' && rf !== null && 'factor' in rf) {
          return (rf as { factor: string }).factor;
        }
        return rf as string;
      })
    : Object.keys(riskFactors || {});

  // Get risk factor info using CSV data first, then enhanced mappings + fallback
  const getRiskFactorInfo = (riskFactorId: string): RiskFactorInfo => {
    // First, check the CSV data
    const csvData = riskFactorsData[riskFactorId as keyof typeof riskFactorsData];
    if (csvData) {
      // Convert CSV level to severity
      const severity = csvData.level === 'Critical' ? 'critical' :
                      csvData.level === 'High' ? 'high' :
                      csvData.level === 'Elevated' ? 'elevated' : 'other';
      
      return {
        label: csvData.name,
        category: csvData.category,
        severity,
        description: csvData.description,
        type: csvData.type,
        level: csvData.level,
      };
    }
    
    // Check if we have a predefined enhanced mapping as fallback
    if (ENHANCED_RISK_FACTORS[riskFactorId]) {
      return ENHANCED_RISK_FACTORS[riskFactorId];
    }

    // Auto-detect pattern for final fallback
    let detectedCategory = 'relevant';
    let detectedType: string | undefined;
    
    if (riskFactorId.includes('_adjacent')) {
      detectedType = 'network';
      detectedCategory = 'sanctions';
    } else if (riskFactorId.startsWith('psa_')) {
      detectedType = 'psa';
      detectedCategory = 'sanctions';
    } else if (riskFactorId.startsWith('seed_')) {
      detectedType = 'seed';
      detectedCategory = 'regulatory_action';
    } else if (riskFactorId.includes('sanction')) {
      detectedCategory = 'sanctions';
    } else if (riskFactorId.includes('pep')) {
      detectedCategory = 'political_exposure';
    } else if (riskFactorId.includes('adverse_media')) {
      detectedCategory = 'adverse_media';
    } else if (riskFactorId.includes('regulatory')) {
      detectedCategory = 'regulatory_action';
    } else if (riskFactorId.includes('environmental')) {
      detectedCategory = 'environmental_risk';
    } else if (riskFactorId.includes('forced_labor')) {
      detectedCategory = 'forced_labor';
    }
    
    const isAdjacent = riskFactorId.includes('_adjacent');
    const severity = isAdjacent ? 'elevated' :
                    ['sanctions', 'export_controls', 'forced_labor'].includes(detectedCategory) ? 'critical' :
                    detectedCategory === 'political_exposure' ? 'high' : 'other';
    
    return {
      label: riskFactorId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      category: detectedCategory,
      severity,
      ...(detectedType ? { type: detectedType } : {}),
      ...(isAdjacent ? { level: 'Elevated' } : {}),
    };
  };

  // Helper function to get the highest severity from a list of risk factors
  const getHighestSeverity = (riskFactors: Array<{ info: RiskFactorInfo }>) => {
    const severityOrder = { 'critical': 4, 'high': 3, 'elevated': 2, 'other': 1 };
    let highestSeverity = 'other';
    let highestScore = 0;

    riskFactors.forEach(({ info }) => {
      // Determine the actual severity from level or severity
      let actualSeverity = 'other';
      if (info.level) {
        actualSeverity = info.level.toLowerCase() === 'critical' ? 'critical' :
                        info.level.toLowerCase() === 'high' ? 'high' :
                        info.level.toLowerCase() === 'elevated' ? 'elevated' : 'other';
      } else {
        actualSeverity = info.severity;
      }

      const score = severityOrder[actualSeverity as keyof typeof severityOrder] || 1;
      if (score > highestScore) {
        highestScore = score;
        highestSeverity = actualSeverity;
      }
    });

    return highestSeverity;
  };

  // Group risk factors synchronously
  const groupedRiskFactors = (() => {
    const grouped: Record<string, Array<{ id: string; info: RiskFactorInfo }>> = {};
    
    riskFactorIds.forEach(id => {
      const info = getRiskFactorInfo(id);
      let categoryKey = info.category;
      
      // Consolidate all sanctions-related categories into 'sanctions'
      if (categoryKey === 'export_controls' || categoryKey === 'sanctions_and_export_control_lists') {
        categoryKey = 'sanctions';
      }
      
      if (!grouped[categoryKey]) {
        grouped[categoryKey] = [];
      }
      grouped[categoryKey].push({ id, info });
    });
    
    // Ensure 1:1 mapping with defined categories only
    const validGrouped: Record<string, Array<{ id: string; info: RiskFactorInfo }>> = {};
    
    Object.keys(grouped).forEach(categoryKey => {
      if (RISK_CATEGORIES[categoryKey]) {
        validGrouped[categoryKey] = grouped[categoryKey];
      } else {
        if (!validGrouped['relevant']) {
          validGrouped['relevant'] = [];
        }
        validGrouped['relevant'].push(...grouped[categoryKey]);
      }
    });
    
    return validGrouped;
  })();

  if (riskFactorIds.length === 0) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-center py-6">
            <div className="text-center max-w-md">
              <div className="flex justify-center mb-3">
                <div className="rounded-full bg-green-500/10 p-2.5">
                  <Shield className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <h3 className="text-base font-medium text-green-600 dark:text-green-400 mb-1.5">
                No Risk Found
              </h3>
              <p className="text-sm text-green-600/80 dark:text-green-400/80 leading-relaxed">
                This entity has been analyzed and no risk factors were identified based on your current risk configuration.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }


  const categoryKeys = Object.keys(groupedRiskFactors).sort((a, b) => {
    // Fixed category order
    const categoryOrder = {
      'sanctions': 0,
      'export_controls': 0, // Maps to same order as sanctions
      'sanctions_and_export_control_lists': 0, // Maps to same order as sanctions
      'political_exposure': 1,
      'regulatory_action': 2, 
      'forced_labor': 3,
      'environmental_risk': 4,
      'adverse_media': 5,
      'relevant': 6
    };
    
    const orderA = categoryOrder[a as keyof typeof categoryOrder] ?? 999;
    const orderB = categoryOrder[b as keyof typeof categoryOrder] ?? 999;
    return orderA - orderB;
  });

  const toggleCategory = (category: string) => {
    setOpenCategories(prev => ({
      ...prev,
      [category]: !(prev[category] ?? false) // Default to false (collapsed)
    }));
  };

  const toggleRiskFactor = (riskFactorId: string) => {
    setExpandedRiskFactors(prev => ({
      ...prev,
      [riskFactorId]: !(prev[riskFactorId] ?? false)
    }));
  };



  const getCategoryIcon = (categoryKey: string) => {
    switch (categoryKey) {
      case 'adverse_media': return <Zap className="h-4 w-4 text-muted-foreground" />;
      case 'environmental_risk': return <Leaf className="h-4 w-4 text-muted-foreground" />;
      case 'export_controls':
      case 'sanctions':
      case 'sanctions_and_export_control_lists': return <Lock className="h-4 w-4 text-muted-foreground" />;
      case 'forced_labor': return <Scale className="h-4 w-4 text-muted-foreground" />;
      case 'political_exposure': return <User className="h-4 w-4 text-muted-foreground" />;
      case 'regulatory_action': return <FileText className="h-4 w-4 text-muted-foreground" />;
      case 'relevant': return <AlertTriangle className="h-4 w-4 text-muted-foreground" />;
      default: return <AlertTriangle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500/10 border-red-500/20 text-red-600 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400';
      case 'high': return 'bg-orange-500/10 border-orange-500/20 text-orange-600 dark:bg-orange-500/10 dark:border-orange-500/20 dark:text-orange-400';
      case 'elevated': return 'bg-yellow-500/10 border-yellow-500/20 text-yellow-600 dark:bg-yellow-500/10 dark:border-yellow-500/20 dark:text-yellow-400';
      case 'other': return 'bg-muted border-border text-muted-foreground';
      default: return 'bg-muted border-border text-muted-foreground';
    }
  };

  const getCategoryBadgeColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500/10 text-red-600 border-red-500/20 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20';
      case 'high': return 'bg-orange-500/10 text-orange-600 border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20';
      case 'elevated': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/20';
      case 'other': return 'bg-muted text-muted-foreground border-muted';
      default: return 'bg-muted text-muted-foreground border-muted';
    }
  };

  const totalRiskFactors = riskFactorIds.length;
  
  // Calculate actual level counts from risk factors
  const levelCounts = (() => {
    const counts: Record<string, number> = {};
    Object.values(groupedRiskFactors).flat().forEach(({ info }) => {
      const level = info.level || info.severity;
      const normalizedLevel = level === 'critical' ? 'Critical' : 
                             level === 'high' ? 'High' : 
                             level === 'elevated' ? 'Elevated' : 
                             level === 'other' ? 'Other' : 
                             level === 'Standard' ? 'Other' : level;
      counts[normalizedLevel] = (counts[normalizedLevel] || 0) + 1;
    });
    return counts;
  })();

  return (
    <Card>
      {showTitle && (
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <span>{title} ({totalRiskFactors})</span>
            </div>
            <div className="flex items-center space-x-2">
              <RiskLevelBadges counts={{
                critical: levelCounts.Critical || 0,
                high: levelCounts.High || 0,
                elevated: levelCounts.Elevated || 0,
                other: levelCounts.Other || 0
              }} />
            </div>
          </CardTitle>
        </CardHeader>
      )}
      
      <CardContent className="space-y-3">
        {categoryKeys.map((categoryKey) => {
          const category = RISK_CATEGORIES[categoryKey];
          const categoryRisks = groupedRiskFactors[categoryKey];
          const isOpen = openCategories[categoryKey] ?? false; // Default to collapsed
          
          if (!category) return null;

          // Calculate the highest severity dynamically based on actual risk factors
          const dynamicSeverity = getHighestSeverity(categoryRisks);

          return (
            <Collapsible 
              key={categoryKey} 
              open={isOpen} 
              onOpenChange={() => toggleCategory(categoryKey)}
            >
              <CollapsibleTrigger asChild>
                <button className={`w-full p-3 rounded-lg border transition-colors hover:bg-opacity-80 ${getSeverityColor(dynamicSeverity)}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getCategoryIcon(categoryKey)}
                      <div className="text-left">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-sm">{category.name}</span>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${getCategoryBadgeColor(dynamicSeverity)}`}
                          >
                            {categoryRisks.length}
                          </Badge>
                        </div>
                        <p className="text-xs opacity-75 mt-1">{category.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </div>
                  </div>
                </button>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <div className="mt-2 ml-6 space-y-2">
                  {categoryRisks
                    .sort((a, b) => {
                      // First sort by level (critical -> high -> elevated -> other)
                      const levelOrder = { 'Critical': 0, 'High': 1, 'Elevated': 2, 'Standard': 3, 'Other': 3 };
                      const levelA = a.info.level || (a.info.severity === 'critical' ? 'Critical' : 
                                                     a.info.severity === 'high' ? 'High' : 
                                                     a.info.severity === 'elevated' ? 'Elevated' : 'Other');
                      const levelB = b.info.level || (b.info.severity === 'critical' ? 'Critical' : 
                                                     b.info.severity === 'high' ? 'High' : 
                                                     b.info.severity === 'elevated' ? 'Elevated' : 'Other');
                      
                      
                      const levelComparison = (levelOrder[levelA as keyof typeof levelOrder] ?? 4) - 
                                             (levelOrder[levelB as keyof typeof levelOrder] ?? 4);
                      
                      if (levelComparison !== 0) return levelComparison;
                      
                      // Then sort by type (seed -> network -> psa -> others)
                      const typeOrder = { 'seed': 0, 'network': 1, 'psa': 2 };
                      const typeA = a.info.type?.toLowerCase() || 'unknown';
                      const typeB = b.info.type?.toLowerCase() || 'unknown';
                      return (typeOrder[typeA as keyof typeof typeOrder] ?? 3) - 
                             (typeOrder[typeB as keyof typeof typeOrder] ?? 3);
                    })
                    .map(({ id, info }, index) => {
                      const isExpanded = expandedRiskFactors[id] ?? false;
                      
                      return (
                        <Collapsible
                          key={index}
                          open={isExpanded}
                          onOpenChange={() => toggleRiskFactor(id)}
                        >
                          <CollapsibleTrigger asChild>
                            <button className="w-full p-3 bg-card border rounded-md shadow-sm hover:bg-accent transition-colors">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3 flex-1">
                                  <span className="font-medium text-sm text-left">{info.label}</span>
                                </div>
                                
                                <div className="flex items-center space-x-2">
                                  {/* Risk Score Points */}
                                  {riskScores && riskScores[id] && (
                                    <Badge variant="outline" className="bg-muted/50 text-muted-foreground border-muted text-xs">
                                      <Shield className="h-3 w-3 mr-1" />
                                      {riskScores[id]}
                                    </Badge>
                                  )}
                                  
                                  {/* Severity Badge */}
                                  <Badge 
                                    variant="outline" 
                                    className={`text-xs ${getCategoryBadgeColor(info.severity)}`}
                                  >
                                    {info.level ? 
                                      (info.level.toLowerCase() === 'standard' ? 'other' : info.level.toLowerCase()) : 
                                      info.severity.toLowerCase()}
                                  </Badge>
                                  
                                  {/* Type Badge */}
                                  {info.type && info.type !== 'unknown' && (
                                    <TypeBadge 
                                      type={info.type}
                                      size="sm"
                                    />
                                  )}
                                  
                                  {/* Expand/Collapse Icon */}
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4 text-gray-500" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 text-gray-500" />
                                  )}
                                </div>
                              </div>
                            </button>
                          </CollapsibleTrigger>
                          
                          <CollapsibleContent>
                            <div className="px-3 pb-3 pt-2 bg-accent border-t border-border">
                              <p className="text-xs text-gray-600 leading-relaxed">
                                {info.description || 'No description available for this risk factor.'}
                              </p>
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      );
                    })}
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </CardContent>
    </Card>
  );
}