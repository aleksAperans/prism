import { groupRiskFactorsByCategoryServer } from '@/lib/risk-factors-server';
import { RiskFactorsDisplayClient } from './RiskFactorsDisplayClient';

interface RiskFactorsWrapperProps {
  riskFactors: Array<{ id?: string; factor?: string; description?: string; severity?: string }> | Record<string, unknown>;
  title?: string;
  showTitle?: boolean;
}

export async function RiskFactorsWrapper({ 
  riskFactors, 
  title = "Risk Factors Found",
  showTitle = true 
}: RiskFactorsWrapperProps) {
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

  // Pre-load risk factor data on the server
  const groupedRiskFactors = await groupRiskFactorsByCategoryServer(riskFactorIds);

  return (
    <RiskFactorsDisplayClient
      groupedRiskFactors={groupedRiskFactors}
      riskFactorIds={riskFactorIds}
      title={title}
      showTitle={showTitle}
    />
  );
}