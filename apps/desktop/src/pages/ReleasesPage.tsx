import { Download, ExternalLink, Info, ShieldCheck } from 'lucide-react';

interface DownloadLink {
  label: string;
  url: string;
  description?: string;
}

interface PlatformDownload {
  platform: string;
  description: string;
  primary: DownloadLink;
  secondary?: DownloadLink;
  notes?: string;
}

const REPO_BASE = 'https://github.com/sunilkumarvalmiki/polynote';
const LATEST_RELEASE_BASE = `${REPO_BASE}/releases/latest/download`;

const downloadOptions: PlatformDownload[] = [
  {
    platform: 'Windows',
    description: '64-bit installer for Windows 10 and newer',
    primary: {
      label: 'Download .exe',
      url: `${LATEST_RELEASE_BASE}/polynote-windows-x64.exe`,
    },
    notes:
      'Installer bundles the required runtime. Run the installer with administrator rights if you want shell integration.',
  },
  {
    platform: 'macOS',
    description: 'Universal build for Apple Silicon and Intel Macs (macOS 12+)',
    primary: {
      label: 'Download .dmg',
      url: `${LATEST_RELEASE_BASE}/polynote-macos-universal.dmg`,
    },
    notes:
      'Open the DMG and drag PolyNote to Applications. Gatekeeper may prompt for confirmation on the first launch.',
  },
  {
    platform: 'Linux',
    description: 'Desktop builds tested on Ubuntu 22.04 and Fedora 39',
    primary: {
      label: 'Download AppImage',
      url: `${LATEST_RELEASE_BASE}/polynote-linux-x64.AppImage`,
    },
    secondary: {
      label: 'Debian package',
      url: `${LATEST_RELEASE_BASE}/polynote-linux-x64.deb`,
    },
    notes:
      'Make the AppImage executable with chmod +x before launching. Use the DEB for Debian-based distributions.',
  },
];

export function ReleasesPage() {
  return (
    <div className="h-full overflow-auto">
      <div className="max-w-5xl mx-auto p-8 space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold">Releases</h1>
          <p className="text-muted-foreground">
            Download the latest PolyNote installers directly. Links always resolve to the newest
            stable build hosted on GitHub Releases.
          </p>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {downloadOptions.map(item => (
            <article
              key={item.platform}
              className="bg-card border border-border rounded-lg p-6 space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-lg text-primary">
                  <Download size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">{item.platform}</h2>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              </div>

              <div className="space-y-3">
                <a
                  href={item.primary.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between px-4 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <span>{item.primary.label}</span>
                  <ExternalLink size={18} className="opacity-80" />
                </a>
                {item.secondary && (
                  <a
                    href={item.secondary.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between px-4 py-3 rounded-lg border border-border hover:border-primary/60 hover:text-primary transition-colors"
                  >
                    <span>{item.secondary.label}</span>
                    <ExternalLink size={18} className="opacity-60" />
                  </a>
                )}
              </div>

              {item.notes && (
                <p className="text-xs text-muted-foreground bg-muted/50 border border-dashed border-border rounded-lg p-3">
                  {item.notes}
                </p>
              )}
            </article>
          ))}
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card border border-border rounded-lg p-6 space-y-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <ShieldCheck size={18} />
              Verify your download
            </h2>
            <p className="text-sm text-muted-foreground">
              Each release ships with SHA-256 checksum files. After downloading, run the checksum
              command listed on the release notes and confirm it matches the published hash.
            </p>
            <pre className="bg-muted rounded-lg p-3 text-xs overflow-x-auto">
              {`# Example
shasum -a 256 polynote-linux-x64.AppImage`}
            </pre>
          </div>

          <div className="bg-card border border-border rounded-lg p-6 space-y-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Info size={18} />
              Looking for something else?
            </h2>
            <ul className="space-y-2 text-sm text-primary">
              <li>
                <a
                  href={`${REPO_BASE}/releases`}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:underline"
                >
                  Browse all historical releases
                </a>
              </li>
              <li>
                <a
                  href={`${REPO_BASE}/issues/new/choose`}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:underline"
                >
                  Report a download issue
                </a>
              </li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}

export default ReleasesPage;
