import React, { useState, useEffect } from 'react';
import { Cloud } from 'lucide-react';

let cachedOrgUrl = null;
let fetchPromise = null;

export function fetchOrgUrl() {
  if (!fetchPromise) {
    fetchPromise = fetch('/api/sf-org-url')
      .then((r) => r.json())
      .then((d) => { cachedOrgUrl = d.url; return d.url; })
      .catch(() => null);
  }
  return fetchPromise;
}

// Shared hook so any component can build an Open-in-Salesforce href from the
// same cached org URL (one fetch for the whole app).
export function useOrgUrl() {
  const [orgUrl, setOrgUrl] = useState(cachedOrgUrl);

  useEffect(() => {
    if (!orgUrl) fetchOrgUrl().then(setOrgUrl);
  }, [orgUrl]);

  return orgUrl;
}

// Build a Salesforce record URL once the org URL is known; null otherwise.
export function salesforceRecordUrl(orgUrl, recordId) {
  if (!orgUrl || !recordId) return null;
  return `${orgUrl.replace(/\/+$/, '')}/${recordId}`;
}

export default function SalesforceLink({ recordId }) {
  const orgUrl = useOrgUrl();

  const href = salesforceRecordUrl(orgUrl, recordId);
  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-[10px] text-[#00A1E0] hover:text-[#1798c1] transition-colors"
      title="Open in Salesforce"
    >
      <Cloud size={11} />
      Open in Salesforce
    </a>
  );
}
