import { screeningService } from "@/services/api/screening";
import { notFound } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ExternalLink,
  ShieldAlert,
  Shield,
  Network,
  FileText,
  Upload,
  Save,
  Plus,
  Construction,
  Book,
  SquareCheck,
  NotebookPen,
  Waypoints,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { CountryBadgeList } from "@/components/common/CountryBadge";
import { RiskLevelBadges } from "@/components/common/RiskLevelBadge";
import { EntityTypeBadge } from "@/components/common/EntityTypeBadge";
import { RiskFactorsDisplay } from "@/components/screening/RiskFactorsDisplay";
import { RiskScoreBadge } from "@/components/common/RiskScoreBadge";
import riskFactorsData from "@/lib/risk-factors-data.json";
import {
  calculateEntityRiskScore,
  loadDefaultRiskProfile,
  filterRiskFactorsByProfile,
} from "@/lib/risk-scoring";
import { ProjectEntityMatches } from "@/components/projects/ProjectEntityMatches";

interface EntityProfilePageProps {
  params: Promise<{ projectId: string; projectEntityId: string }>;
}

export default async function EntityProfilePage({
  params,
}: EntityProfilePageProps) {
  const { projectId, projectEntityId } = await params;

  let entity;
  try {
    entity = await screeningService.getProjectEntity(
      projectId,
      projectEntityId,
    );
  } catch (error) {
    console.error("Failed to load entity:", error);
    notFound();
  }

  // Load the active global risk profile for filtering and scoring
  let riskProfile = null;
  try {
    const response = await fetch(
      `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/settings/active-risk-profile`,
      {
        cache: "no-store", // Always get fresh data
      },
    );
    if (response.ok) {
      const data = await response.json();
      riskProfile = data.profile;
    }
  } catch (error) {
    console.error(
      "Failed to load active risk profile, falling back to default:",
      error,
    );
    // Fallback to default profile
    riskProfile = await loadDefaultRiskProfile();
  }

  // Helper function to calculate level counts for risk factors
  const calculateLevelCounts = (riskFactors: unknown) => {
    const riskFactorIds = Array.isArray(riskFactors)
      ? riskFactors.map((rf) => {
          if (typeof rf === "object" && rf !== null && "id" in rf) {
            return (rf as { id: string }).id;
          }
          if (typeof rf === "object" && rf !== null && "factor" in rf) {
            return (rf as { factor: string }).factor;
          }
          return rf as string;
        })
      : Object.keys(riskFactors || {});

    const counts: Record<string, number> = {};
    riskFactorIds.forEach((id) => {
      const csvData = riskFactorsData[id as keyof typeof riskFactorsData];
      let level = "other";

      if (csvData) {
        level =
          csvData.level === "Critical"
            ? "critical"
            : csvData.level === "High"
              ? "high"
              : csvData.level === "Elevated"
                ? "elevated"
                : csvData.level === "Standard"
                  ? "other"
                  : "other";
      }

      counts[level] = (counts[level] || 0) + 1;
    });

    return counts;
  };

  if (!entity) {
    notFound();
  }

  // Combine parent-level and match-level risk factors
  const allRiskFactors = new Set();

  // Add parent-level risk factors
  entity.risk_factors?.forEach(
    (rf: { id?: string; factor?: string } | string) => {
      const id = typeof rf === "string" ? rf : rf.id || rf.factor;
      if (id) allRiskFactors.add(id);
    },
  );

  // Add risk factors from all matches
  entity.matches?.forEach(
    (match: {
      risk_factors?: Array<{ id?: string; factor?: string } | string>;
    }) => {
      match.risk_factors?.forEach(
        (rf: { id?: string; factor?: string } | string) => {
          const id = typeof rf === "string" ? rf : rf.id || rf.factor;
          if (id) allRiskFactors.add(id);
        },
      );
    },
  );

  const combinedRiskFactors = Array.from(allRiskFactors).map((id) => ({
    id: id as string,
  }));

  // Filter risk factors based on risk profile if available
  const filteredRiskFactors = riskProfile
    ? filterRiskFactorsByProfile(combinedRiskFactors, riskProfile)
    : combinedRiskFactors;

  // Calculate risk score if risk scoring is enabled
  let riskScore = null;
  if (riskProfile && riskProfile.riskScoringEnabled) {
    const riskFactorIds = filteredRiskFactors.map((rf) => rf.id);
    riskScore = calculateEntityRiskScore(riskFactorIds, riskProfile);
  }

  const hasRisks = filteredRiskFactors.length > 0;

  const hasUpstreamData = entity.upstream?.has_upstream;
  const products = entity.upstream?.products || [];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Tabbed Content */}
      <Tabs defaultValue="entity" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
          <TabsTrigger
            value="entity"
            className="flex items-center gap-1 lg:gap-2"
          >
            <Book className="h-4 w-4" />
            <span>Summary</span>
          </TabsTrigger>
          <TabsTrigger
            value="matches"
            className="flex items-center gap-1 lg:gap-2"
          >
            <SquareCheck className="h-4 w-4" />
            <span className="hidden sm:inline">
              Matches ({entity.matches?.length || 0})
            </span>
            <span className="sm:hidden">Matches</span>
          </TabsTrigger>
          <TabsTrigger
            value="supply-chain"
            className="flex items-center gap-1 lg:gap-2"
          >
            <Waypoints className="h-4 w-4" />
            <span className="hidden sm:inline">Supply Chain (soon)</span>
            <span className="sm:hidden">Supply (soon)</span>
          </TabsTrigger>
          <TabsTrigger
            value="notes"
            className="flex items-center gap-1 lg:gap-2"
          >
            <NotebookPen className="h-4 w-4" />
            <span className="hidden sm:inline">
              Notes & Recordkeeping (soon)
            </span>
            <span className="sm:hidden">Notes (soon)</span>
          </TabsTrigger>
        </TabsList>

        {/* Summary Tab - Project Entity Profile */}
        <TabsContent value="entity" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Summary Card */}
            <Card>
              <CardContent className="pt-4 space-y-4">
                {/* Entity Label */}
                <div>
                  <h3 className="text-xl font-bold">{entity.label}</h3>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-2">
                  <EntityTypeBadge
                    type={(() => {
                      const typeValue = entity.attributes?.type?.values?.[0];
                      if (
                        typeValue &&
                        typeof typeValue === "object" &&
                        "value" in typeValue
                      ) {
                        return (typeValue as { value: string }).value;
                      }
                      return typeValue || "unknown";
                    })()}
                  />

                  {entity.strength && (
                    <Badge
                      variant="outline"
                      className={
                        entity.strength === "strong"
                          ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20"
                          : entity.strength === "partial"
                            ? "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/20"
                            : "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-500/10 dark:text-gray-400 dark:border-gray-500/20"
                      }
                    >
                      {entity.strength === "strong"
                        ? "high confidence"
                        : entity.strength === "partial"
                          ? "medium confidence"
                          : entity.strength === "no_match"
                            ? "no match"
                            : entity.strength}
                    </Badge>
                  )}

                  <Badge variant="outline" className="text-xs">
                    {formatDistanceToNow(new Date(entity.created_at))} ago
                  </Badge>
                </div>

                {/* Countries */}
                {entity.countries && entity.countries.length > 0 && (
                  <CountryBadgeList countryCodes={entity.countries} size="sm" />
                )}
              </CardContent>
            </Card>

            {/* Workflow Status Card - Placeholder */}
            <Card>
              <CardHeader>
                <CardTitle>Workflow Status</CardTitle>
                <CardDescription>
                  Entity review and approval workflow
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center p-8">
                  <div className="text-center">
                    <Shield className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">
                      Workflow Status
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Workflow functionality coming soon.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Risk Assessment Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {hasRisks ? (
                  <>
                    <ShieldAlert className="h-5 w-5 text-destructive" />
                    Risk Assessment
                    <Badge variant="outline" className="ml-2">
                      {filteredRiskFactors.length}
                    </Badge>
                    {/* Risk Score Badge - Only show for actual matches */}
                    {riskScore &&
                      riskScore.threshold > 0 &&
                      entity.strength !== "no_match" &&
                      (entity.strength === "strong" ||
                        entity.strength === "partial") && (
                        <RiskScoreBadge
                          riskScore={riskScore}
                          size="sm"
                          showThresholdExceeded={true}
                        />
                      )}
                  </>
                ) : (
                  <>
                    <Shield className="h-5 w-5 text-green-600" />
                    Risk Assessment
                    <Badge variant="secondary" className="ml-2">
                      Clear
                    </Badge>
                  </>
                )}
              </CardTitle>
              <CardDescription>
                Risk factors and assessment based on screening profile
              </CardDescription>
            </CardHeader>
            <CardContent>
              {hasRisks ? (
                <div className="space-y-4">
                  <RiskLevelBadges
                    counts={calculateLevelCounts(filteredRiskFactors)}
                    size="default"
                  />
                  <RiskFactorsDisplay
                    riskFactors={filteredRiskFactors}
                    showTitle={false}
                    riskScores={riskProfile?.riskScores}
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center p-8">
                  <div className="text-center">
                    <Shield className="mx-auto h-12 w-12 text-green-600 mb-4" />
                    <h3 className="text-lg font-medium mb-2">
                      No Risk Factors Identified
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      This entity has no identified risk factors based on the
                      current screening profile.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Matches Tab */}
        <TabsContent value="matches" className="space-y-6">
          <ProjectEntityMatches
            matches={entity.matches || []}
            projectId={projectId}
            projectEntityId={projectEntityId}
            riskScores={riskProfile?.riskScores}
            screeningAttributes={(() => {
              // Transform attributes to ensure values are arrays of strings
              if (!entity.attributes) return undefined;

              const transformed: Record<
                string,
                { resolve: boolean; values: string[] }
              > = {};
              for (const [key, attr] of Object.entries(entity.attributes)) {
                if (attr && typeof attr === "object" && "values" in attr) {
                  // Transform values array to ensure strings
                  const attrObj = attr as {
                    resolve?: boolean;
                    values: unknown[];
                  };
                  const values = attrObj.values.map((v: unknown) => {
                    if (typeof v === "object" && v !== null && "value" in v) {
                      return (v as { value: string }).value;
                    }
                    return String(v);
                  });
                  transformed[key] = {
                    resolve: attrObj.resolve || false,
                    values: values,
                  };
                }
              }
              return transformed;
            })()}
          />
        </TabsContent>

        {/* Supply Chain Tab */}
        <TabsContent value="supply-chain" className="space-y-6">
          <Alert>
            <Construction className="h-4 w-4" />
            <AlertDescription>
              Under Construction - coming soon
            </AlertDescription>
          </Alert>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Network className="h-5 w-5" />
                Supply Chain Information
                {hasUpstreamData && (
                  <Badge
                    variant="outline"
                    className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20"
                  >
                    data available
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Upstream trade data and supply chain relationships
              </CardDescription>
            </CardHeader>
            <CardContent>
              {hasUpstreamData ? (
                <div className="space-y-6">
                  {/* Upstream Countries */}
                  {entity.upstream?.countries &&
                    entity.upstream.countries.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-3">
                          Upstream Countries
                        </h4>
                        <CountryBadgeList
                          countryCodes={entity.upstream.countries}
                          size="sm"
                        />
                      </div>
                    )}

                  {/* Products */}
                  {products.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-3">
                        Products (HS Codes)
                      </h4>
                      <div className="flex flex-wrap gap-1">
                        {products.map((product, index) => (
                          <Badge
                            key={index}
                            variant="outline"
                            className="font-mono text-xs"
                          >
                            {product}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Upstream Risk Factors */}
                  {entity.upstream?.risk_factors &&
                    Array.isArray(entity.upstream.risk_factors) &&
                    entity.upstream.risk_factors.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-3">
                          Upstream Risk Factors
                        </h4>
                        <RiskFactorsDisplay
                          riskFactors={
                            entity.upstream.risk_factors as
                              | Array<{
                                  id?: string;
                                  factor?: string;
                                  description?: string;
                                  severity?: string;
                                }>
                              | Record<string, unknown>
                          }
                          showTitle={false}
                          riskScores={riskProfile?.riskScores}
                        />
                      </div>
                    )}
                </div>
              ) : (
                <div className="flex items-center justify-center p-8">
                  <div className="text-center">
                    <Network className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">
                      No Supply Chain Data
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      No upstream trade data is available for this entity.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notes & Recordkeeping Tab */}
        <TabsContent value="notes" className="space-y-6">
          <Alert>
            <Construction className="h-4 w-4" />
            <AlertDescription>
              Under Construction - coming soon
            </AlertDescription>
          </Alert>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Notes Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Analysis Notes
                </CardTitle>
                <CardDescription>
                  Add notes and observations for this entity
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="note-title">Note Title</Label>
                  <Input
                    id="note-title"
                    placeholder="Enter a title for your note..."
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="note-content">Note Content</Label>
                  <Textarea
                    id="note-content"
                    placeholder="Write your analysis notes here..."
                    className="min-h-32 w-full resize-none"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    Auto-saved 2 minutes ago
                  </div>
                  <Button size="sm" className="flex items-center gap-2">
                    <Save className="h-4 w-4" />
                    Save Note
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Document Upload Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Document Recordkeeping
                </CardTitle>
                <CardDescription>
                  Upload and manage documents related to this entity
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* File Upload Area */}
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-muted-foreground/50 transition-colors">
                  <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground mb-2">
                    Drag and drop files here, or click to browse
                  </p>
                  <p className="text-xs text-muted-foreground mb-4">
                    Supports PDF, DOC, DOCX, JPG, PNG (max 10MB)
                  </p>
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Choose Files
                  </Button>
                </div>

                {/* Uploaded Files List */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Uploaded Documents</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 border rounded-lg">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">
                            compliance_report.pdf
                          </p>
                          <p className="text-xs text-muted-foreground">
                            2.3 MB • Uploaded 1 hour ago
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between p-2 border rounded-lg">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">
                            risk_assessment.docx
                          </p>
                          <p className="text-xs text-muted-foreground">
                            1.8 MB • Uploaded 2 days ago
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Previous Notes Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Previous Notes
              </CardTitle>
              <CardDescription>
                History of analysis notes for this entity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border-l-4 border-blue-500 pl-4 py-2">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium">
                      Initial Risk Assessment
                    </h4>
                    <span className="text-xs text-muted-foreground">
                      3 days ago
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Entity shows elevated risk factors related to sanctions
                    exposure. Requires additional due diligence on beneficial
                    ownership structure.
                  </p>
                  <div className="text-xs text-muted-foreground">
                    By: John Smith (Analyst)
                  </div>
                </div>

                <div className="border-l-4 border-yellow-500 pl-4 py-2">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium">
                      Follow-up Investigation
                    </h4>
                    <span className="text-xs text-muted-foreground">
                      1 day ago
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Additional documentation received. Corporate structure
                    verified through third-party sources. Risk level may be
                    reduced pending final review.
                  </p>
                  <div className="text-xs text-muted-foreground">
                    By: Sarah Johnson (Senior Analyst)
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
