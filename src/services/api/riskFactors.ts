import Papa from 'papaparse';
import fs from 'fs/promises';
import path from 'path';
import type { RiskFactor } from '@/types/api.types';

interface RiskFactorCSVRow {
  Risk: string;
  Description: string;
  Category: string;
  Level: string;
  Type: string;
  Key: string;
  'Traversal Parameters': string;
  URL: string;
}

class RiskFactorService {
  private riskFactorMap: Map<string, RiskFactor> = new Map();
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    // Prevent multiple simultaneous initialization
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this._loadRiskFactors();
    await this.initPromise;
    this.initialized = true;
  }

  private async _loadRiskFactors(): Promise<void> {
    try {
      const csvPath = path.join(process.cwd(), 'risks.csv');
      const csvContent = await fs.readFile(csvPath, 'utf-8');
      
      return new Promise((resolve, reject) => {
        Papa.parse<RiskFactorCSVRow>(csvContent, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            try {
              results.data.forEach((row) => {
                if (row.Key && row.Risk) {
                  this.riskFactorMap.set(row.Key, {
                    id: row.Key,
                    name: row.Risk,
                    description: row.Description || '',
                    category: row.Category || 'unknown',
                    level: this.normalizeLevel(row.Level),
                    type: row.Type || 'unknown',
                    url: row.URL || undefined,
                  });
                }
              });
              
              // Risk factors loaded successfully
              resolve();
            } catch (error) {
              reject(error);
            }
          },
          error: (error: Error) => {
            reject(new Error(`Failed to parse CSV: ${error.message}`));
          },
        });
      });
    } catch (error) {
      console.error('Failed to load risk factors:', error);
      throw new Error('Could not initialize risk factor mappings');
    }
  }

  private normalizeLevel(level: string): 'Critical' | 'High' | 'Elevated' | 'Standard' {
    const normalized = level?.toLowerCase().trim();
    
    switch (normalized) {
      case 'critical':
        return 'Critical';
      case 'high':
        return 'High';
      case 'elevated':
        return 'Elevated';
      case 'standard':
      case 'low':
      case 'medium':
        return 'Standard';
      default:
        return 'Standard';
    }
  }

  async getRiskFactors(ids: string[]): Promise<RiskFactor[]> {
    await this.initialize();
    
    return ids
      .map(id => this.riskFactorMap.get(id))
      .filter((factor): factor is RiskFactor => factor !== undefined);
  }

  async getRiskFactor(id: string): Promise<RiskFactor | undefined> {
    await this.initialize();
    return this.riskFactorMap.get(id);
  }

  async getAllRiskFactors(): Promise<RiskFactor[]> {
    await this.initialize();
    return Array.from(this.riskFactorMap.values());
  }

  async getRiskFactorsByCategory(category: string): Promise<RiskFactor[]> {
    await this.initialize();
    
    return Array.from(this.riskFactorMap.values()).filter(
      factor => factor.category.toLowerCase() === category.toLowerCase()
    );
  }

  async getRiskFactorsByLevel(level: 'Critical' | 'High' | 'Elevated' | 'Standard'): Promise<RiskFactor[]> {
    await this.initialize();
    
    return Array.from(this.riskFactorMap.values()).filter(
      factor => factor.level === level
    );
  }

  async getCategories(): Promise<string[]> {
    await this.initialize();
    
    const categories = new Set<string>();
    for (const factor of this.riskFactorMap.values()) {
      categories.add(factor.category);
    }
    
    return Array.from(categories).sort();
  }

  async searchRiskFactors(query: string): Promise<RiskFactor[]> {
    await this.initialize();
    
    const lowercaseQuery = query.toLowerCase();
    
    return Array.from(this.riskFactorMap.values()).filter(factor =>
      factor.name.toLowerCase().includes(lowercaseQuery) ||
      factor.description.toLowerCase().includes(lowercaseQuery) ||
      factor.category.toLowerCase().includes(lowercaseQuery)
    );
  }

  // Check if risk factor service is ready
  isInitialized(): boolean {
    return this.initialized;
  }

  // Force refresh of risk factors
  async refresh(): Promise<void> {
    this.initialized = false;
    this.initPromise = null;
    this.riskFactorMap.clear();
    await this.initialize();
  }

  // Get statistics about loaded risk factors
  async getStats(): Promise<{
    total: number;
    byCategory: Record<string, number>;
    byLevel: Record<string, number>;
  }> {
    await this.initialize();
    
    const byCategory: Record<string, number> = {};
    const byLevel: Record<string, number> = {};
    
    for (const factor of this.riskFactorMap.values()) {
      byCategory[factor.category] = (byCategory[factor.category] || 0) + 1;
      byLevel[factor.level] = (byLevel[factor.level] || 0) + 1;
    }
    
    return {
      total: this.riskFactorMap.size,
      byCategory,
      byLevel,
    };
  }
}

// Create singleton instance
export const riskFactorService = new RiskFactorService();

// Export for use in API routes
export default riskFactorService;