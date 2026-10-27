'use client';

import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Archive,
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  Clock3,
  Columns3,
  Copy,
  Inbox,
  Link as LinkIcon,
  List,
  LockKeyhole,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Terminal,
  X,
} from 'lucide-react';
import { Card, Stage, stages, stageNames } from '../lib/types';
import { isCodexLink } from '../lib/links';
import Activity from './activity';
import { taskFromLocation, taskPath, formatTaskNumber, PROJECT_PREFIXES } from '../lib/task-number';

import {deploymentConfig} from '../lib/deployment-config';

type WorkspaceView = 'active' | 'backlog' | 'archive';
type QuickFilter = 'all' | 'inProgress' | 'blocked' | 'highPriority' | 'estimated' | 'unestimated';
type StageFilter = 'all' | Stage;

const blank = (): Card => ({
  id: crypto.randomUUID(),
  title: '',
  project: deploymentConfig.defaultProject,
  owner: deploymentConfig.defaultOwner,
  stage: 'plan',
  priority: 'normal',
  storyPoints: null,
  summary: '',
  nextAction: '',
  evidence: '',
  evidenceState: 'unknown',
  evidenceAt: '',
  source: '',
  links: [],
  version: 0,
  updatedAt: '',
});

const evidenceNames = {
  verified: 'Verified',
  reported: 'Reported',
  unknown: 'Not verified',
};

const date = (value: string) => {
  if (!value || Number.isNaN(Date.parse(value))) return 'No date';
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Chisinau',
  }).format(new Date(value));
};

const openStages: Stage[] = stages.filter((stage) => stage !== 'plan' && stage !== 'done');
const points = (items: Card[]) => items.reduce((total, card) => total + (card.storyPoints ?? 0), 0);
const estimated = (items: Card[]) => items.filter((card) => typeof card.storyPoints === 'number');

export default function Board() {
  const [cards, setCards] = useState<Card[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [project, setProject] = useState('All projects');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Card | null>(null);
  const [editing, setEditing] = useState(false);
  const [linkText, setLinkText] = useState('');
  const [view, setView] = useState<'board' | 'list'>('board');
  const [compact, setCompact] = useState(true);
  const [workspace, setWorkspace] = useState<WorkspaceView>('active');
  const [stageFilter, setStageFilter] = useState<StageFilter>('all');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [mobileViewport, setMobileViewport] = useState(false);
  const navToggleRef = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const routeSearch = useRef<string | null>(null);

  async function refresh() {
    try {
      setError('');
      const response = await fetch('/api/board', { cache: 'no-store' });
      const data = await response.json() as { error?: string; cards: Card[] };
      if (!response.ok) throw new Error(data.error || 'Could not load the board.');
      setCards(data.cards);
      setLoaded(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Network error.');
    }
  }

  useEffect(() => {
    void refresh();
    try {
      const savedView = localStorage.getItem('kanban-view');
      setView(savedView === 'board' || savedView === 'list'
        ? savedView
        : window.matchMedia('(max-width: 700px)').matches ? 'list' : 'board');
      setCompact(localStorage.getItem('kanban-compact') !== 'false');
      setSidebarCollapsed(localStorage.getItem('kanban-sidebar-collapsed') === 'true');
    } catch {
      setView(window.matchMedia('(max-width: 700px)').matches ? 'list' : 'board');
    }
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 700px)');
    const updateViewport = () => setMobileViewport(media.matches);
    updateViewport();
    media.addEventListener('change', updateViewport);
    return () => media.removeEventListener('change', updateViewport);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    function resolveRoute() {
      const parsed = taskFromLocation(window.location.pathname, window.location.search);
      routeSearch.current = window.location.pathname + window.location.search;
      if (parsed.invalid) {
        setSelected(null);
        setError(`Invalid task link. Use a task number such as ${formatTaskNumber(1)}.`);
        return;
      }
      if (!parsed.task) {
        setSelected(null);
        setEditing(false);
        return;
      }
      const found = cards.find((card) => card.taskNumber === parsed.task);
      if (!found) {
        setSelected(null);
        setError(`Task ${parsed.task} was not found on this private board.`);
        return;
      }
      setSelected({ ...found });
      setEditing(false);
      setLinkText(found.links.map((link) => `${link.label} | ${link.url}`).join('\n'));
    }
    if (routeSearch.current !== window.location.pathname + window.location.search) resolveRoute();
    window.addEventListener('popstate', resolveRoute);
    return () => window.removeEventListener('popstate', resolveRoute);
  }, [loaded, cards]);

  useEffect(() => {
    if (selected && !dialog.current?.open) dialog.current?.showModal();
    if (!selected && dialog.current?.open) dialog.current?.close();
  }, [selected]);

  function closeCard() {
    setSelected(null);
    setEditing(false);
    if (window.history.state?.kanbanTask) window.history.back();
    else {
      window.history.replaceState(null, '', '/');
      routeSearch.current = '/';
    }
  }

  async function copyTaskLink() {
    if (!selected?.taskNumber) return;
    const url = new URL(taskPath(selected.taskNumber), window.location.origin).href;
    try {
      await navigator.clipboard.writeText(url);
      setNotice(`Private link for ${selected.taskNumber} copied.`);
    } catch {
      setError(`Could not copy the link. Use: ${url}`);
    }
  }

  function changeView(nextView: 'board' | 'list') {
    setView(nextView);
    try { localStorage.setItem('kanban-view', nextView); } catch { /* optional preference */ }
  }

  function changeCompact() {
    setCompact((current) => {
      try { localStorage.setItem('kanban-compact', String(!current)); } catch { /* optional preference */ }
      return !current;
    });
  }

  function toggleSidebar() {
    if (window.matchMedia('(max-width: 700px)').matches) {
      setMobileNavOpen((open) => !open);
      return;
    }
    setSidebarCollapsed((collapsed) => {
      try { localStorage.setItem('kanban-sidebar-collapsed', String(!collapsed)); } catch { /* optional preference */ }
      return !collapsed;
    });
  }

  function closeMobileNav() {
    setMobileNavOpen(false);
    if (mobileViewport) navToggleRef.current?.focus();
  }

  async function mutate(action: string, card?: Card) {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/board', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, card }),
      });
      const data = await response.json() as Card & { error?: string };
      if (!response.ok) throw new Error(data.error || 'Could not save the board.');
      await refresh();
      setNotice('Saved to the shared board.');
      return data;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Network error.');
      return null;
    } finally {
      setBusy(false);
    }
  }

  function openCard(card: Card, edit = false) {
    if (card.taskNumber) {
      const path = taskPath(card.taskNumber);
      if (window.location.pathname + window.location.search !== path) {
        window.history.pushState({ kanbanTask: true }, '', path);
      }
      routeSearch.current = window.location.pathname + window.location.search;
    }
    setSelected({ ...card });
    setEditing(edit);
    setLinkText(card.links.map((link) => `${link.label} | ${link.url}`).join('\n'));
    if (mobileNavOpen) closeMobileNav();
  }

  async function saveCard() {
    if (!selected) return;
    const links = linkText.trim()
      ? linkText.split('\n').filter(Boolean).map((line) => {
        const separator = line.indexOf('|');
        return {
          label: (separator < 0 ? line : line.slice(0, separator)).trim(),
          url: (separator < 0 ? '' : line.slice(separator + 1)).trim(),
        };
      })
      : [];
    const saved = await mutate('upsert', { ...selected, links });
    if (saved) openCard(saved, false);
  }

  async function moveCard(card: Card, stage: Stage) {
    if (card.stage !== stage) await mutate('upsert', { ...card, stage });
  }

  const projects = ['All projects', ...Array.from(new Set(cards.map((card) => card.project))).sort()];
  const matchesProjectAndSearch = (card: Card) => {
    const matchesProject = project === 'All projects' || card.project === project;
    const haystack = `${card.taskNumber || ''} ${card.title} ${card.owner} ${card.summary} ${card.nextAction}`.toLowerCase();
    return matchesProject && haystack.includes(query.trim().toLowerCase());
  };
  const inScope = cards.filter(matchesProjectAndSearch);
  const activeCards = inScope.filter((card) => openStages.includes(card.stage));
  const backlogCards = inScope.filter((card) => card.stage === 'plan');
  const doneCards = inScope.filter((card) => card.stage === 'done');
  const workspaceCards = workspace === 'active' ? activeCards : workspace === 'backlog' ? backlogCards : doneCards;
  const filtered = cards.filter((card) => {
    if (workspace === 'active' && !openStages.includes(card.stage)) return false;
    if (workspace === 'backlog' && card.stage !== 'plan') return false;
    if (workspace === 'archive' && card.stage !== 'done') return false;
    if (!matchesProjectAndSearch(card)) return false;
    if (stageFilter !== 'all' && card.stage !== stageFilter) return false;
    if (workspace === 'active' && quickFilter === 'inProgress' && card.stage !== 'active') return false;
    if (workspace === 'active' && quickFilter === 'blocked' && card.stage !== 'blocked') return false;
    if (workspace === 'active' && quickFilter === 'highPriority' && card.priority !== 'high') return false;
    if (quickFilter === 'estimated' && card.storyPoints == null) return false;
    if (quickFilter === 'unestimated' && card.storyPoints != null) return false;
    return true;
  });

  const stagesToRender = workspace === 'active'
    ? (stageFilter === 'all' ? openStages : [stageFilter])
    : [workspace === 'backlog' ? 'plan' : 'done'] as Stage[];
  const hasFilters = project !== 'All projects' || query.length > 0 || stageFilter !== 'all' || quickFilter !== 'all';
  const titles: Record<WorkspaceView, { eyebrow: string; title: string; subtitle: string }> = {
    active: {
      eyebrow: 'A CLEAR VIEW OF THE WORK',
      title: 'Project workspace',
      subtitle: 'The next step, the current state, and what needs attention.',
    },
    backlog: {
      eyebrow: 'NOT ON THE ACTIVE BOARD',
      title: 'Backlog',
      subtitle: 'Keep ideas here until you are ready to move them into active work.',
    },
    archive: {
      eyebrow: 'COMPLETED · HISTORY RETAINED',
      title: 'Done & archive',
      subtitle: 'Completed cards stay here. Reopen one by moving it back to active work.',
    },
  };
  const title = titles[workspace];
  const activeEstimateCount = estimated(activeCards).length;
  const activePointTotal = points(activeCards);
  const doneEstimateCount = estimated(doneCards).length;
  const donePointTotal = points(doneCards);
  const coverage = activeCards.length ? Math.round((activeEstimateCount / activeCards.length) * 100) : 0;

  const field = (key: keyof Card, value: unknown) => {
    setSelected((card) => card ? { ...card, [key]: value } : card);
  };

  const clearFilters = () => {
    setProject('All projects');
    setStageFilter('all');
    setQuickFilter('all');
    setQuery('');
  };

  function selectWorkspace(next: WorkspaceView) {
    setWorkspace(next);
    setStageFilter('all');
    setQuickFilter('all');
    closeMobileNav();
  }

  function focusView(nextWorkspace: WorkspaceView, nextFilter: QuickFilter) {
    setWorkspace(nextWorkspace);
    setStageFilter('all');
    setQuickFilter(nextFilter);
    closeMobileNav();
  }

  function selectQuickFilter(nextFilter: QuickFilter) {
    setQuickFilter(nextFilter);
    setStageFilter('all');
  }

  const quickViews = workspace === 'active'
    ? [
      { filter: 'all' as const, label: 'All active', count: activeCards.length },
      { filter: 'inProgress' as const, label: 'In progress', count: activeCards.filter((card) => card.stage === 'active').length },
      { filter: 'blocked' as const, label: 'Blocked', count: activeCards.filter((card) => card.stage === 'blocked').length },
      { filter: 'highPriority' as const, label: 'High priority', count: activeCards.filter((card) => card.priority === 'high').length },
      { filter: 'estimated' as const, label: 'Estimated', count: estimated(activeCards).length },
      { filter: 'unestimated' as const, label: 'Unestimated', count: activeCards.length - estimated(activeCards).length },
    ]
    : [
      { filter: 'all' as const, label: workspace === 'backlog' ? 'All backlog' : 'All done', count: workspaceCards.length },
      { filter: 'estimated' as const, label: 'Estimated', count: estimated(workspaceCards).length },
      { filter: 'unestimated' as const, label: 'Unestimated', count: workspaceCards.length - estimated(workspaceCards).length },
    ];

  const cardTile = (card: Card) => (
    <article className={`task-card priority-${card.priority}`} key={card.id} draggable={!busy}
      onDragStart={(event) => event.dataTransfer.setData('text/plain', card.id)}>
      <button className="task-card-main" onClick={() => openCard(card)}>
        <div className="task-card-top">
          {card.taskNumber && <span className="task-number">{card.taskNumber}</span>}
          <span className={`project-tag ${card.project.toLowerCase()}`}>{card.project}</span>
          <span className={`priority-badge ${card.priority}`}>
            {card.priority === 'high' ? '↑ High' : card.priority === 'low' ? '↓ Low' : 'Standard'}
          </span>
        </div>
        <h3>{card.title}</h3>
        {card.storyPoints != null && <span className="points-pill">{card.storyPoints} pts</span>}
        {card.stage === 'blocked' ? <>
          <div className="blocked-note"><AlertCircle size={13} />Needs attention</div>
          <div className="blocked-context"><span>WHY IT NEEDS ATTENTION</span><p>{card.summary || 'No reason has been recorded yet.'}</p></div>
        </> : card.summary && <p className="card-summary">{card.summary}</p>}
        <div className="next-step"><span>NEXT STEP</span><p>{card.nextAction || 'Next step not recorded.'}</p></div>
        <div className="card-meta">
          <span className="person"><b>{card.owner.slice(0, 1) || '?'}</b>{card.owner || 'Unassigned'}</span>
          <span className={`evidence-pill ${card.evidenceState}`} title={evidenceNames[card.evidenceState]}>
            {card.evidenceState === 'verified' ? <Check size={12} /> : <Clock3 size={12} />}
            <span>{evidenceNames[card.evidenceState]}</span>
          </span>
          {card.links.length > 0 && <span className="link-count"><LinkIcon size={12} />{card.links.length}</span>}
        </div>
        <div className="card-date">Updated {date(card.updatedAt)}</div>
      </button>
      <div className="card-links">
        {card.links.slice(0, 3).map((link) => (
          <a key={link.url} href={link.url} target={isCodexLink(link.url) ? undefined : '_blank'}
            rel="noopener noreferrer" title={isCodexLink(link.url) ? 'Open in Codex' : link.label}
            aria-label={isCodexLink(link.url) ? `Open ${card.title} in Codex` : link.label}>
            {isCodexLink(link.url) ? <Terminal size={13} /> : <LinkIcon size={13} />}
            <span>{isCodexLink(link.url) ? 'Codex' : link.label.toLowerCase().includes('pr') ? 'PR' : link.label.toLowerCase().includes('gpt') ? 'Chat' : 'Link'}</span>
          </a>
        ))}
      </div>
      <div className="move-control">
        <label>Move to <select aria-label={`Move ${card.title}`} value={card.stage} disabled={busy}
          onChange={(event) => moveCard(card, event.target.value as Stage)}>
          {stages.map((stage) => <option key={stage} value={stage}>{stageNames[stage]}</option>)}
        </select></label>
      </div>
    </article>
  );

  return (
    <div className={`shell ${compact ? 'compact' : 'expanded'} view-${view} ${sidebarCollapsed ? 'sidebar-collapsed' : ''} ${mobileNavOpen ? 'sidebar-mobile-open' : ''}`}>
      {mobileNavOpen && <button className="sidebar-backdrop" aria-label="Close navigation" onClick={closeMobileNav} />}
      <aside id="workspace-sidebar" className="sidebar" aria-label="Workspace navigation"
        aria-hidden={mobileViewport && !mobileNavOpen} inert={mobileViewport && !mobileNavOpen}>
        <a className="brand" href="/" aria-label="Kanban home">
          <span className="brand-icon">k<span>·</span></span>
          <span className="brand-copy">Kanban<span className="brand-sub">PROJECT WORKSPACE</span></span>
        </a>
        <div className="workspace-tag" title="Private workspace">
          <span className="avatar">O</span>
          <div className="workspace-copy">Kanban<small>Private workspace</small></div>
          <LockKeyhole size={14} />
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav className="workspace-nav" aria-label="Workspace views">
          <button className={`nav-item ${workspace === 'active' ? 'selected' : ''}`} title="Active work" onClick={() => selectWorkspace('active')}>
            <Columns3 size={17} /><span className="nav-copy">Active work</span><span className="nav-count">{activeCards.length}</span>
          </button>
          <button className={`nav-item ${workspace === 'backlog' ? 'selected' : ''}`} title="Backlog" onClick={() => selectWorkspace('backlog')}>
            <Inbox size={17} /><span className="nav-copy">Backlog</span><span className="nav-count">{backlogCards.length}</span>
          </button>
          <button className={`nav-item ${workspace === 'archive' ? 'selected' : ''}`} title="Done & archive" onClick={() => selectWorkspace('archive')}>
            <Archive size={17} /><span className="nav-copy">Done & archive</span><span className="nav-count">{doneCards.length}</span>
          </button>
        </nav>
        <div className="nav-label projects-label">PROJECTS</div>
        <nav className="project-nav-list" aria-label="Filter by project">
          {projects.filter((name) => name !== 'All projects').map((name) => (
            <button key={name} className={`project-nav ${project === name ? 'chosen' : ''}`} title={name}
              onClick={() => { setProject(name); closeMobileNav(); }}>
              <i className={`dot ${name.toLowerCase()}`} /><span className="project-nav-copy">{name}</span>
              <span className="nav-count">{cards.filter((card) => card.project === name && openStages.includes(card.stage)).length}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="private-badge"><LockKeyhole size={14} /><span className="sidebar-copy">Private to the owner</span></div>
          <p className="sidebar-copy">A careful snapshot of project work.<br />No task execution happens here.</p>
          <span className="owner-avatar">A</span>
          <strong className="sidebar-copy">{deploymentConfig.defaultOwner}<small>Coordinator</small></strong>
        </div>
      </aside>

      <main>
        <header className="topbar">
          <div className="topbar-start">
            <button ref={navToggleRef} className="nav-toggle" onClick={toggleSidebar} aria-label="Toggle navigation"
              aria-controls="workspace-sidebar" aria-expanded={mobileViewport ? mobileNavOpen : !sidebarCollapsed} title="Toggle navigation">
              {sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </button>
            <span className="breadcrumb">Project workspace</span><span className="slash">/</span><span>Kanban</span>
          </div>
          <span className="top-private"><LockKeyhole size={13} />Owner-only</span>
        </header>

        <section className="page-head">
          <div>
            <div className="eyebrow">{title.eyebrow}</div>
            <h1>{title.title}<span>.</span></h1>
            <p>{title.subtitle}</p>
          </div>
          <button className="primary" disabled={!loaded} onClick={() => openCard(blank(), true)}><Plus size={17} />New task</button>
        </section>

        {workspace === 'active' && (
          <section className="overview-strip" aria-label="Work overview">
            <button className="metric-card metric-action" aria-pressed={workspace === 'active' && quickFilter === 'all' && stageFilter === 'all'} onClick={() => focusView('active', 'all')}>
              <span>Active cards</span><strong>{activeCards.length}</strong><small>In progress, review &amp; blocked</small><i className="metric-dot violet" />
            </button>
            <button className="metric-card metric-action needs-attention" aria-pressed={workspace === 'active' && quickFilter === 'blocked' && stageFilter === 'all'} onClick={() => focusView('active', 'blocked')}>
              <span>Blocked · needs help</span><strong>{activeCards.filter((card) => card.stage === 'blocked').length}</strong><small>Recorded blockers</small><i className="metric-dot amber" />
            </button>
            <button className="metric-card metric-action" aria-pressed={workspace === 'active' && quickFilter === 'estimated' && stageFilter === 'all'} onClick={() => focusView('active', 'estimated')}>
              <span>Open story points</span><strong>{activeEstimateCount ? activePointTotal : '—'}</strong><small>{activeEstimateCount} estimated cards</small>
            </button>
            <button className="metric-card metric-action" aria-pressed={false} onClick={() => focusView('archive', 'estimated')}>
              <span>Done-card points</span><strong>{doneEstimateCount ? donePointTotal : '—'}</strong><small>{doneEstimateCount} estimated cards · all Done</small>
            </button>
            <button className="metric-card metric-action" aria-pressed={workspace === 'active' && quickFilter === 'unestimated' && stageFilter === 'all'} onClick={() => focusView('active', 'unestimated')}>
              <span>Unestimated active</span><strong>{activeCards.length - activeEstimateCount}</strong><small>No historical points added</small>
            </button>
            <div className="estimation-coverage">
              <div><span>Estimation coverage</span><strong>{activeEstimateCount}/{activeCards.length || 0}</strong></div>
              <div className="coverage-track"><i style={{ width: `${coverage}%` }} /></div>
              <small>Only explicitly entered values are counted; no historical estimates were added. Done-point totals include every retained Done card, with no time window. They use current card values—not estimate-at-start, throughput, quality, or forecasts; small samples can mislead. Points are not converted to hours.</small>
            </div>
          </section>
        )}

        {workspace === 'archive' && (
          <div className="archive-note"><CheckCircle2 size={16} /><span>Archive is reversible. Cards and their update history remain available; move a card to another stage to reopen it.</span></div>
        )}

        <section className="toolbar" aria-label="Task controls">
          <div className="toolbar-top">
            <div className="view-toggle" aria-label="Task view">
              <button className={view === 'board' ? 'active' : ''} aria-pressed={view === 'board'} onClick={() => changeView('board')}><Columns3 size={16} />Board</button>
              <button className={view === 'list' ? 'active' : ''} aria-pressed={view === 'list'} onClick={() => changeView('list')}><List size={16} />List</button>
            </div>
            <select aria-label="Filter by project" value={project} onChange={(event) => setProject(event.target.value)}>
              {projects.map((name) => <option key={name}>{name}</option>)}
            </select>
            <select aria-label="Filter by stage" value={stageFilter} onChange={(event) => setStageFilter(event.target.value as StageFilter)}>
              <option value="all">All stages</option>
              {(workspace === 'active' ? openStages : [workspace === 'backlog' ? 'plan' : 'done'] as Stage[])
                .map((stage) => <option key={stage} value={stage}>{stageNames[stage]}</option>)}
            </select>
          </div>
          <div className="toolbar-tools">
            <label className="search"><Search size={16} /><input aria-label="Search tasks" placeholder="Search tasks…" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
            <button className="compact-toggle" aria-pressed={compact} onClick={changeCompact}>{compact ? 'Compact' : 'Comfortable'}</button>
            <button className="icon-button refresh-button" aria-label="Refresh board" title="Refresh board" onClick={refresh} disabled={busy}><RefreshCw size={17} /></button>
          </div>
        </section>

        <section className="quick-views" aria-label="Quick views">
          <span className="quick-view-label"><Sparkles size={14} />Quick views</span>
          <div className="quick-view-list">
            {quickViews.map((item) => <button key={item.filter} className={`${quickFilter === item.filter ? 'active' : ''} ${item.filter === 'blocked' ? 'blocked-view' : ''} ${item.filter === 'highPriority' ? 'priority-view' : ''}`} aria-pressed={quickFilter === item.filter} onClick={() => selectQuickFilter(item.filter)}>{item.label} <b>{item.count}</b></button>)}
          </div>
          {hasFilters && <button className="clear-filters" onClick={clearFilters}>Clear filters</button>}
        </section>

        <div className="status-messages" aria-live="polite">
          {error && <div className="banner error"><AlertCircle size={17} />{error}<button onClick={() => setError('')} aria-label="Dismiss error"><X size={15} /></button></div>}
          {notice && !error && <div className="banner notice"><Check size={16} />{notice}<button onClick={() => setNotice('')} aria-label="Dismiss notice"><X size={15} /></button></div>}
        </div>

        {loaded && <div className="results-summary" role="status"><span><strong>{filtered.length}</strong> {filtered.length === 1 ? 'task' : 'tasks'} in {title.title}</span>
          {hasFilters && <span>Filtered view · counts above use the same project and search scope.</span>}</div>}

        {!loaded && !error ? <div className="loading">Loading the shared board…</div>
          : loaded && cards.length === 0 ? (
            <div className="empty-board"><Columns3 size={32} /><h2>Your workspace starts here</h2>
              <p>Create a first task. New tasks begin in Backlog and only move onto the active board when you choose a stage.</p>
              <div className="empty-actions"><button className="primary" onClick={() => openCard(blank(), true)}><Plus size={16} />Create a task</button></div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-board"><Search size={28} /><h2>No tasks match this view</h2><p>Try a different search or clear the selected filters.</p>
              <button className="secondary" onClick={clearFilters}>Clear filters</button></div>
          ) : (
            <section className={`board ${view === 'list' ? 'task-list' : ''}`} aria-label={view === 'board' ? 'Kanban board' : 'Task list'}>
              {stagesToRender.map((stage) => {
                const stageCards = filtered.filter((card) => card.stage === stage);
                return (
                  <div className={`column ${stage}`} key={stage} onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => { event.preventDefault(); const card = cards.find((item) => item.id === event.dataTransfer.getData('text/plain')); if (card && !busy) void moveCard(card, stage); }}>
                    <div className="column-head"><h2><i />{stageNames[stage]}<span>{stageCards.length}</span></h2>
                      {workspace !== 'archive' && <button aria-label={`Add task to ${stageNames[stage]}`} title={`Add task to ${stageNames[stage]}`} onClick={() => openCard({ ...blank(), stage }, true)}><Plus size={16} /></button>}
                    </div>
                    <div className="column-cards">
                      {stageCards.map(cardTile)}
                      {stageCards.length === 0 && <div className="empty-column">Nothing here yet</div>}
                      {workspace !== 'archive' && <button className="add-card" onClick={() => openCard({ ...blank(), stage }, true)}><Plus size={15} />Add task</button>}
                    </div>
                  </div>
                );
              })}
            </section>
          )}

        <footer><span><i />Private project snapshot · Europe/Chisinau</span><span>Changing a card does not start or stop agent work.</span></footer>
      </main>

      <dialog ref={dialog} onCancel={(event) => { event.preventDefault(); closeCard(); }} onClick={(event) => { if (event.target === dialog.current) closeCard(); }}>
        <div className="detail">
          {selected && <>
            <div className="detail-top"><span className="eyebrow">{editing ? 'EDIT TASK' : 'TASK DETAILS'}</span><button className="icon-button" onClick={closeCard} aria-label="Close task"><X /></button></div>
            {editing ? <>
              <label className="form-label">Task title<input maxLength={120} value={selected.title} onChange={(event) => field('title', event.target.value)} /></label>
              <div className="form-row">
                <label className="form-label">Project<select value={selected.project} onChange={(event) => field('project', event.target.value)}>
                  {!Object.keys(PROJECT_PREFIXES).includes(selected.project) && <option value={selected.project}>{selected.project}</option>}
                  {Object.keys(PROJECT_PREFIXES).map((name) => <option value={name} key={name}>{name}</option>)}
                </select></label>
                <label className="form-label">Owner<input maxLength={40} value={selected.owner} onChange={(event) => field('owner', event.target.value)} /></label>
              </div>
              <div className="form-row">
                <label className="form-label">Stage<select value={selected.stage} onChange={(event) => field('stage', event.target.value)}>
                  {stages.map((stage) => <option value={stage} key={stage}>{stageNames[stage]}</option>)}
                </select></label>
                <label className="form-label">Priority<select value={selected.priority} onChange={(event) => field('priority', event.target.value)}>
                  <option value="high">High</option><option value="normal">Standard</option><option value="low">Low</option>
                </select></label>
              </div>
              <div className="form-row">
                <label className="form-label">Story points <span className="field-hint">Optional · only enter a real estimate</span>
                  <select value={selected.storyPoints ?? ''} onChange={(event) => field('storyPoints', event.target.value ? Number(event.target.value) : null)}>
                    <option value="">Not estimated</option>
                    {[1, 2, 3, 5, 8, 13].map((value) => <option value={value} key={value}>{value} points</option>)}
                  </select>
                </label>
                <label className="form-label">Evidence state<select value={selected.evidenceState} onChange={(event) => field('evidenceState', event.target.value)}>
                  {Object.entries(evidenceNames).map(([key, value]) => <option key={key} value={key}>{value}</option>)}
                </select></label>
              </div>
              {([['summary', 'Context'], ['nextAction', 'Next step'], ['evidence', 'Evidence & constraints']] as const).map(([key, label]) => (
                <label className="form-label" key={key}>{label}<textarea rows={3} value={selected[key]} onChange={(event) => field(key, event.target.value)} /></label>
              ))}
              <div className="form-row">
                <label className="form-label">Evidence date (ISO)<input placeholder="2026-10-26T11:00:00Z" value={selected.evidenceAt} onChange={(event) => field('evidenceAt', event.target.value)} /></label>
                <label className="form-label">Source / commit<input maxLength={300} value={selected.source} onChange={(event) => field('source', event.target.value)} /></label>
              </div>
              <label className="form-label">Links · label | HTTPS or codex://threads/UUID<textarea rows={3} value={linkText} onChange={(event) => setLinkText(event.target.value)} /></label>
              <div className="detail-actions"><button className="secondary" onClick={closeCard}>Cancel</button>
                <button className="primary" disabled={busy || !selected.title.trim() || !selected.project.trim()} onClick={saveCard}>{busy ? 'Saving…' : 'Save changes'}</button></div>
            </> : <>
              <div className="detail-tags">{selected.taskNumber && <span className="task-number detail-number">{selected.taskNumber}</span>}
                <span className={`project-tag ${selected.project.toLowerCase()}`}>{selected.project}</span><span className="status-tag">{stageNames[selected.stage]}</span>
                {selected.storyPoints != null && <span className="points-pill">{selected.storyPoints} pts</span>}
                {selected.taskNumber && <button className="copy-task-link" onClick={copyTaskLink} title="Private link, available only to the owner" aria-label={`Copy private link for ${selected.taskNumber}`}><Copy size={14} /><span>Copy link</span></button>}
              </div>
              <h2>{selected.title}</h2>
              <div className="detail-owner"><span className="avatar">{selected.owner[0] || '?'}</span><span>{selected.owner || 'Unassigned'}<small>Owner</small></span>
                <button className="secondary" onClick={() => setEditing(true)}><SlidersHorizontal size={15} />Edit task</button></div>
              <p className="detail-summary">{selected.summary || 'No context added yet.'}</p>
              <section className="next-panel"><span className="eyebrow"><ArrowRight size={14} />NEXT STEP</span><p>{selected.nextAction || 'No next step recorded.'}</p></section>
              <section className="evidence-section"><h3>Evidence behind this status <span className={`evidence-label ${selected.evidenceState}`}>{evidenceNames[selected.evidenceState]}</span></h3>
                <p>{selected.evidence || 'No supporting details added yet.'}</p><small>Snapshot: {date(selected.evidenceAt)}</small>
                {selected.source && <div className="source">{selected.source}</div>}
              </section>
              <h3 className="links-title">Links & discussions</h3>
              <div className="detail-links">{selected.links.length ? selected.links.map((link) => (
                <a key={link.url} href={link.url} target={isCodexLink(link.url) ? undefined : '_blank'} rel="noopener noreferrer">
                  {isCodexLink(link.url) ? <Terminal size={15} /> : <LinkIcon size={15} />}
                  <span>{isCodexLink(link.url) ? 'Open in Codex' : link.label}{isCodexLink(link.url) && <small>Requires the Codex desktop app</small>}</span><ArrowUpRight size={16} />
                </a>
              )) : <p className="muted">No links added yet.</p>}</div>
              <Activity cardId={selected.id} version={selected.version} />
              <div className="detail-footer">Updated {date(selected.updatedAt)} · version {selected.version}</div>
            </>}
            {error && <p className="inline-error" role="alert">{error}</p>}
          </>}
        </div>
      </dialog>
    </div>
  );
}
