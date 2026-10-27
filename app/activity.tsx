'use client';

import { useEffect, useState } from 'react';
import { ActivityEntry, stageNames } from '../lib/types';
import { isCodexLink } from '../lib/links';

const labels: Record<string, string> = {
  title: 'title',
  project: 'project',
  owner: 'owner',
  stage: 'stage',
  priority: 'priority',
  storyPoints: 'story points',
  summary: 'context',
  nextAction: 'next step',
  evidence: 'evidence',
  evidenceState: 'evidence state',
  evidenceAt: 'evidence date',
  source: 'source',
  links: 'links',
};

const date = (value: string) => new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Chisinau',
}).format(new Date(value));

export default function Activity({ cardId, version }: { cardId: string; version: number }) {
  const [entries, setEntries] = useState<ActivityEntry[] | null>(null);
  const [error, setError] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    let active = true;
    setEntries(null);
    setError('');
    fetch(`/api/board?cardId=${encodeURIComponent(cardId)}`, { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Could not load task history.');
        return await response.json() as { activity: ActivityEntry[] };
      })
      .then((data) => {
        if (active) {
          setEntries(data.activity);
          setHasMore(data.activity.length === 100);
        }
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Could not load task history.');
      });
    return () => { active = false; };
  }, [cardId, version]);

  async function loadOlder() {
    if (!entries?.length) return;
    setLoadingMore(true);
    try {
      const response = await fetch(
        `/api/board?cardId=${encodeURIComponent(cardId)}&beforeVersion=${entries[entries.length - 1].version}`,
        { cache: 'no-store' },
      );
      if (!response.ok) throw new Error('Could not load earlier updates.');
      const data = await response.json() as { activity: ActivityEntry[] };
      setEntries((current) => [...(current || []), ...data.activity]);
      setHasMore(data.activity.length === 100);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load earlier updates.');
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <section className="activity">
      <h3>Update history</h3>
      <p className="activity-caption">Meaningful changes, new evidence, and the last recorded next step. History starts when tracking was enabled; older events were not backfilled.</p>
      {error ? <p role="alert">{error}</p>
        : entries === null ? <p className="muted">Loading history…</p>
          : entries.length === 0 ? <div className="history-empty">This is the current task snapshot. History begins with its next update.</div>
            : <ol>{entries.map((entry) => (
              <li key={entry.id}>
                <div className="event-heading"><span>{date(entry.createdAt)}</span><b>v{entry.version}</b></div>
                <p className="event-change">{entry.kind === 'created' ? 'Task created' : `Updated: ${entry.changedFields.filter((key) => key !== 'id' && key !== 'evidenceAt').map((key) => labels[key] || key).join(', ')}`}</p>
                <details>
                  <summary>{stageNames[entry.snapshot.stage]} · {entry.snapshot.owner || 'Unassigned'}</summary>
                  <p><strong>Next step:</strong> {entry.snapshot.nextAction || 'No next step recorded.'}</p>
                  {entry.snapshot.storyPoints != null && <p><strong>Story points:</strong> {entry.snapshot.storyPoints}</p>}
                  {entry.snapshot.evidence && <p><strong>Evidence:</strong> {entry.snapshot.evidence}</p>}
                  {entry.snapshot.source && <code>{entry.snapshot.source}</code>}
                  {entry.snapshot.evidenceAt && <small>Evidence date: {date(entry.snapshot.evidenceAt)}</small>}
                  <div className="event-links">{entry.snapshot.links.map((link) => (
                    <a key={link.url} href={link.url} target={isCodexLink(link.url) ? undefined : '_blank'} rel="noopener noreferrer">
                      {isCodexLink(link.url) ? 'Open in Codex' : link.label} ↗
                    </a>
                  ))}</div>
                </details>
              </li>
            ))}</ol>}
      {entries && hasMore && <button className="secondary history-more" disabled={loadingMore} onClick={loadOlder}>{loadingMore ? 'Loading…' : 'Load earlier updates'}</button>}
    </section>
  );
}
