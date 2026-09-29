import { useEffect, useState } from 'react'
import { BootIcon, ExternalIcon, ListPeakIcon, SearchIcon, SummitIcon } from '@/components/icons'
import { track } from '@/telemetry'
import { formatFeet, formatMiles } from '@/utils/format'
import type { Peak } from './peak'
import { peakLinks, type PeakLink, type PeakLinkSite } from './peakLinks'
import './PeakLinkList.css'

const siteNames: Record<PeakLinkSite, string> = {
  summitpost: 'SummitPost',
  peakbagger: 'Peakbagger',
  wta: 'WTA hikes',
}

const siteIcons: Record<PeakLinkSite, typeof SummitIcon> = {
  summitpost: SummitIcon,
  peakbagger: ListPeakIcon,
  wta: BootIcon,
}

// The peak's links, or null while the link indexes load. Keyed by the peak,
// so a new selection never shows the previous peak's links.
function usePeakLinks(peak: Peak): PeakLink[] | null {
  const [loaded, setLoaded] = useState<{ peak: Peak; links: PeakLink[] } | null>(null)
  useEffect(() => {
    let current = true
    void peakLinks(peak).then((links) => {
      if (current) setLoaded({ peak, links })
    })
    return () => {
      current = false
    }
  }, [peak])
  return loaded?.peak === peak ? loaded.links : null
}

// Links grouped by site, in the order peakLinks gives them.
function bySite(links: PeakLink[]): [PeakLinkSite, PeakLink[]][] {
  const groups = new Map<PeakLinkSite, PeakLink[]>()
  for (const link of links) groups.set(link.site, [...(groups.get(link.site) ?? []), link])
  return [...groups]
}

type RowProps = { link: PeakLink; label: string }

// A row's right-hand icon says what kind of link it is: a magnifier for a
// search, an external-page mark for an exact page. Screen readers get the
// same as words.
function LinkRow({ link, label }: RowProps) {
  const opened = () => track('peak.link_opened', { site: link.site, link_type: link.kind })
  const SiteIcon = siteIcons[link.site]
  const KindIcon = link.kind === 'exact' ? ExternalIcon : SearchIcon
  return (
    <a
      className="peak-links-row"
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={opened}
      onAuxClick={opened}
    >
      <SiteIcon className="peak-links-site-icon" />
      <span className="peak-links-label">{label}</span>
      <KindIcon className="peak-links-kind" size={16} />
      <span className="peak-links-hidden">
        {link.kind === 'exact' ? ', page' : ', search'} (opens in a new tab)
      </span>
    </a>
  )
}

// A matched WTA hike as a small card: its name, then its length and gain, so
// hikes can be compared before opening one.
function HikeCard({ link }: { link: PeakLink }) {
  const opened = () => track('peak.link_opened', { site: link.site, link_type: link.kind })
  const length = link.lengthMi === undefined ? null : formatMiles(link.lengthMi)
  const gain = link.gainFt === undefined ? null : formatFeet(link.gainFt)
  return (
    <a
      className="peak-links-hike"
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={opened}
      onAuxClick={opened}
    >
      <span className="peak-links-hike-name">
        {link.title}
        <ExternalIcon className="peak-links-kind" size={16} />
      </span>
      {(length || gain) && (
        <span className="peak-links-hike-stats">
          {length && (
            <span>
              {length.value} {length.unit}
            </span>
          )}
          {gain && (
            <span>
              {gain.value} {gain.unit} gain
            </span>
          )}
        </span>
      )}
      <span className="peak-links-hidden"> (opens in a new tab)</span>
    </a>
  )
}

/** Links from a peak to SummitPost, Peakbagger and WTA: exact pages where known, searches otherwise. */
export function PeakLinkList({ peak }: { peak: Peak }) {
  const links = usePeakLinks(peak)

  if (links === null) return <div className="peak-links" aria-busy="true" />
  if (links.length === 0) {
    return <p className="peak-links peak-links-note">Links are available for Washington peaks only.</p>
  }

  return (
    <nav className="peak-links" aria-label={`${peak.name} on other sites`}>
      <ul className="peak-links-list">
        {bySite(links).map(([site, siteLinks]) => (
          <li key={site}>
            {site === 'wta' && siteLinks[0].kind === 'exact' ? (
              <>
                <span className="peak-links-group">
                  <BootIcon className="peak-links-site-icon" />
                  {siteNames.wta}
                </span>
                <ul className="peak-links-list peak-links-hikes">
                  {siteLinks.map((link) => (
                    <li key={link.url}>
                      <HikeCard link={link} />
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <LinkRow link={siteLinks[0]} label={siteNames[site]} />
            )}
          </li>
        ))}
      </ul>
    </nav>
  )
}
