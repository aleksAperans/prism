'use client';

import { AlertTriangle, ChevronDown, ChevronRight, Shield, AlertCircle, Info, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useState } from 'react';
import { 
  RISK_CATEGORIES,
  type RiskFactorInfo
} from '@/lib/risk-factors-enhanced';
import { RiskLevelBadges } from '@/components/common/RiskLevelBadge';
import { TypeBadge } from '@/components/common/TypeBadge';

interface RiskFactorsDisplayClientProps {
  groupedRiskFactors: Record<string, Array<{ id: string; info: RiskFactorInfo }>>;
  riskFactorIds: string[];
  title?: string;
  showTitle?: boolean;
}

export function RiskFactorsDisplayClient({ 
  groupedRiskFactors,
  riskFactorIds,
  title = "Risk Factors Found",
  showTitle = true 
}: RiskFactorsDisplayClientProps) {
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});

  if (riskFactorIds.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center text-green-600 bg-green-500/10 p-4 rounded-md">
            <Shield className="h-5 w-5 mr-3" />
            <div>
              <span className="font-medium">No Risk Factors Identified</span>
              <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                This entity does not have any identified risk factors in our database.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const categoryKeys = Object.keys(groupedRiskFactors).sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, elevated: 2, other: 3 };
    const severityA = RISK_CATEGORIES[a]?.severity || 'other';
    const severityB = RISK_CATEGORIES[b]?.severity || 'other';
    return severityOrder[severityA] - severityOrder[severityB];
  });

  const toggleCategory = (category: string) => {
    setOpenCategories(prev => ({
      ...prev,
      [category]: !(prev[category] ?? false) // Default to false (collapsed)
    }));
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'high': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'medium': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'low': return <Info className="h-4 w-4 text-blue-500" />;
      default: return <Info className="h-4 w-4 text-gray-500" />;
    }
  };


  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500/10 border-red-500/20 text-red-600 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400';
      case 'high': return 'bg-orange-500/10 border-orange-500/20 text-orange-600 dark:bg-orange-500/10 dark:border-orange-500/20 dark:text-orange-400';
      case 'medium': return 'bg-yellow-500/10 border-yellow-500/20 text-yellow-600 dark:bg-yellow-500/10 dark:border-yellow-500/20 dark:text-yellow-400';
      case 'low': return 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:bg-blue-500/10 dark:border-blue-500/20 dark:text-blue-400';
      default: return 'bg-muted border-border text-muted-foreground';
    }
  };

  const getCategoryBadgeColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500/10 text-red-600 border-red-500/20 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20';
      case 'high': return 'bg-orange-500/10 text-orange-600 border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20';
      case 'medium': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/20';
      case 'low': return 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20';
      default: return 'bg-muted text-muted-foreground border-muted';
    }
  };

  const totalRiskFactors = riskFactorIds.length;
  const criticalCount = categoryKeys.filter(cat => RISK_CATEGORIES[cat]?.severity === 'critical').length;
  const highCount = categoryKeys.filter(cat => RISK_CATEGORIES[cat]?.severity === 'high').length;
  const elevatedCount = categoryKeys.filter(cat => RISK_CATEGORIES[cat]?.severity === 'elevated').length;
  const otherCount = categoryKeys.filter(cat => !['critical', 'high', 'elevated'].includes(RISK_CATEGORIES[cat]?.severity || '')).length;
  
  const levelCounts = {
    critical: criticalCount,
    high: highCount,
    elevated: elevatedCount,
    other: otherCount
  };

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
              <RiskLevelBadges counts={levelCounts} />
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

          return (
            <Collapsible 
              key={categoryKey} 
              open={isOpen} 
              onOpenChange={() => toggleCategory(categoryKey)}
            >
              <CollapsibleTrigger asChild>
                <button className={`w-full p-3 rounded-lg border transition-colors hover:bg-opacity-80 ${getSeverityColor(category.severity)}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-lg">{category.icon}</span>
                      <div className="text-left">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{category.name}</span>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${getCategoryBadgeColor(category.severity)}`}
                          >
                            {categoryRisks.length} factor{categoryRisks.length !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                        <p className="text-xs opacity-75 mt-1">{category.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getSeverityIcon(category.severity)}
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
                  {categoryRisks.map(({ info }, index) => (
                    <div 
                      key={index}
                      className="p-3 bg-card border rounded-md shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 flex-1">
                          <div className="flex items-center space-x-2">
                            {getSeverityIcon(info.severity)}
                            <span className="font-medium text-sm">{info.label}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {/* Severity Badge */}
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${getCategoryBadgeColor(info.severity)}`}
                          >
                            {info.level ? info.level.toUpperCase() : info.severity.toUpperCase()}
                          </Badge>
                          
                          {/* Type Badge */}
                          {info.type && info.type !== 'unknown' && (
                            <TypeBadge 
                              type={info.type}
                              size="sm"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </CardContent>
    </Card>
  );
}