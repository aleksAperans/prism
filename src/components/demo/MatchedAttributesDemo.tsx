'use client';

import { MatchedAttributesDisplay } from '../screening/MatchedAttributesDisplay';

export function MatchedAttributesDemo() {
  // Example data from your screenshot
  const exampleMatchedAttributes = {
    name: [
      '<em>Владимир</em> <em>Владимирович</em> <em>Путин</em>',
      '<em>владимир</em> <em>владимирович</em> <em>путин</em>',
      '<em>Vladimir</em> Vladimirovich <em>PUTIN</em>',
      '<em>Vladimir</em> <em>Putin</em>',
      '<em>Vladimir</em> Vladimirovitj <em>PUTIN</em>'
    ],
    country: [
      '<em>Russia</em>',
      '<em>Russian Federation</em>'
    ]
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-bold">Collapsible Matched Attributes Display</h2>
        <p className="text-muted-foreground">
          Demo showing how matched values are displayed in a collapsible, concise format with highlighted matched parts. Click on sections to expand/collapse.
        </p>
      </div>
      
      <div className="bg-card border rounded-lg p-4">
        <MatchedAttributesDisplay matchedAttributes={exampleMatchedAttributes} />
      </div>
      
      <div className="text-xs text-muted-foreground">
        <p><strong>Note:</strong> The highlighted parts (in yellow) represent the portions that matched the screening request, using the original &lt;em&gt; tags from the API response.</p>
      </div>
    </div>
  );
}