'use client';

import { useState } from 'react';
import { Download, FileText, Table, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ExportData {
  id: string;
  entity_name: string;
  entity_type: string;
  match_strength?: string;
  risk_factors: Record<string, unknown> | unknown[];
  created_at: string;
  sayari_entity_id?: string;
}

interface ExportButtonProps {
  data: ExportData[];
  filename?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
}

export function ExportButton({ 
  data, 
  filename = 'analysis-results', 
  variant = 'outline',
  size = 'default' 
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const generateCSV = (includeDetails = false) => {
    const headers = [
      'Entity Name',
      'Type', 
      'Match Strength',
      'Risk Factor Count',
      'Has Risks',
      'Screened Date',
      'Days Ago',
    ];

    if (includeDetails) {
      headers.push('Entity ID', 'Risk Factors');
    }

    const csvRows = [
      headers.join(','),
      ...data.map(result => {
        const riskFactorCount = Array.isArray(result.risk_factors) 
          ? result.risk_factors.length 
          : Object.keys(result.risk_factors || {}).length;
        
        const hasRisks = riskFactorCount > 0;
        const daysAgo = Math.floor((Date.now() - new Date(result.created_at).getTime()) / (1000 * 60 * 60 * 24));

        const row = [
          `"${result.entity_name.replace(/"/g, '""')}"`, // Escape quotes
          result.entity_type,
          result.match_strength || 'unknown',
          riskFactorCount.toString(),
          hasRisks ? 'Yes' : 'No',
          new Date(result.created_at).toLocaleDateString(),
          daysAgo.toString(),
        ];

        if (includeDetails) {
          row.push(
            result.sayari_entity_id || '',
            `"${JSON.stringify(result.risk_factors).replace(/"/g, '""')}"`
          );
        }

        return row.join(',');
      })
    ];

    return csvRows.join('\n');
  };

  const generateJSON = () => {
    return JSON.stringify(data.map(result => ({
      ...result,
      risk_factor_count: Array.isArray(result.risk_factors) 
        ? result.risk_factors.length 
        : Object.keys(result.risk_factors || {}).length,
      has_risks: Array.isArray(result.risk_factors) 
        ? result.risk_factors.length > 0 
        : Object.keys(result.risk_factors || {}).length > 0,
      screened_date: new Date(result.created_at).toISOString(),
      days_ago: Math.floor((Date.now() - new Date(result.created_at).getTime()) / (1000 * 60 * 60 * 24)),
    })), null, 2);
  };

  const downloadFile = (content: string, extension: string, mimeType: string) => {
    const timestamp = new Date().toISOString().split('T')[0];
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}-${timestamp}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExport = async (format: 'csv' | 'csv-detailed' | 'json') => {
    setIsExporting(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate processing time
      
      switch (format) {
        case 'csv':
          downloadFile(generateCSV(false), 'csv', 'text/csv');
          break;
        case 'csv-detailed':
          downloadFile(generateCSV(true), 'csv', 'text/csv');
          break;
        case 'json':
          downloadFile(generateJSON(), 'json', 'application/json');
          break;
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  if (data.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} disabled={isExporting}>
          {isExporting ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Export ({data.length})
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Export Format</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={() => handleExport('csv')}>
          <Table className="mr-2 h-4 w-4" />
          <div className="flex flex-col">
            <span>CSV (Summary)</span>
            <span className="text-xs text-muted-foreground">
              Basic entity and risk info
            </span>
          </div>
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={() => handleExport('csv-detailed')}>
          <FileText className="mr-2 h-4 w-4" />
          <div className="flex flex-col">
            <span>CSV (Detailed)</span>
            <span className="text-xs text-muted-foreground">
              Includes full risk factor data
            </span>
          </div>
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={() => handleExport('json')}>
          <FileText className="mr-2 h-4 w-4" />
          <div className="flex flex-col">
            <span>JSON</span>
            <span className="text-xs text-muted-foreground">
              Complete structured data
            </span>
          </div>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        <div className="px-2 py-1 text-xs text-muted-foreground">
          <Calendar className="inline h-3 w-3 mr-1" />
          Exported: {new Date().toLocaleDateString()}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}