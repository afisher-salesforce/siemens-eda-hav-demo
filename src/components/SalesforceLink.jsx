import React, { useState, useEffect } from 'react';
import { ExternalLink } from 'lucide-react';

let cachedOrgUrl = null;
let fetchPromise = null;

function fetchOrgUrl() {
  if (!fetchPromise) {
    fetchPromise = fetch('/api/sf-org-url')
      .then((r) => r.json())
      .then((d) => { cachedOrgUrl = d.url; return d.url; })
      .catch(() => null);
  }
  return fetchPromise;
}

export default function SalesforceLink({ recordId }) {
  const [orgUrl, setOrgUrl] = useState(cachedOrgUrl);

  useEffect(() => {
    if (!orgUrl) fetchOrgUrl().then(setOrgUrl);
  }, [orgUrl]);

  if (!recordId || !orgUrl) return null;

  const href = `${orgUrl.replace(/\/+$/, '')}/${recordId}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-[10px] text-gray-500 hover:text-siemens-accent transition-colors"
      title="Open in Salesforce"
    >
      Open in Salesforce
      <ExternalLink size={10} />
    </a>
  );
}
