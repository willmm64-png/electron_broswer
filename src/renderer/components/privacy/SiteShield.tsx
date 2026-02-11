import type { PrivacyReport } from '@/shared/types';

interface Props {
  report: PrivacyReport | null;
}

export function SiteShield({ report }: Props) {
  if (!report) {
    return <div className="rounded-lg border border-borderColor bg-bgSecondary p-3 text-sm">No site data yet.</div>;
  }

  return (
    <div className="rounded-lg border border-borderColor bg-bgSecondary p-3 text-sm">
      <h3 className="font-medium">🛡️ Site Shield</h3>
      <p>Privacy Score: <span className="font-semibold">{report.privacyScore}/100</span></p>
      <p>Connection: {report.https ? '✅ Secure' : '⚠️ Insecure'}</p>
      <p>Trackers: {report.trackers.reduce((sum, tracker) => sum + tracker.count, 0)}</p>
      <p>3rd-party requests: {report.thirdPartyRequests}</p>
    </div>
  );
}
