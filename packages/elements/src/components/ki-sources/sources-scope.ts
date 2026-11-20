import { orderSources, readSourceUrl, type SourceDestination } from './sources-model';

const SOURCE = 'ki-source';
const SOURCES = 'ki-sources';
const CITATION = 'ki-citation';
const SCOPE_ELEMENTS = [SOURCE, SOURCES, CITATION, 'base'].join(',');
const sourceScopeKey = Symbol.for('kimen.sources.render-scope.v1');

type ReferenceGroup = symbol | undefined;
type ScopedElement = Element & { [sourceScopeKey]?: symbol };

function referenceGroup(element: ScopedElement): ReferenceGroup {
  return element[sourceScopeKey];
}

interface SourceDefinition extends SourceDestination {
  id: string;
  title: string;
  snippet: string;
}

export interface NumberedSource extends SourceDefinition {
  number: number;
}

interface SourceList {
  update: (sources: NumberedSource[]) => void;
  reveal: (id: string) => boolean;
}

export interface CitationTarget {
  source: NumberedSource;
  reveal: SourceList['reveal'];
}

type CitationListener = (target: CitationTarget | undefined) => void;
type SourceRoot = Document | DocumentFragment;

const scopes = new WeakMap<SourceRoot, SourcesScope>();

export function connectSources(host: HTMLElement, list: SourceList): (() => void) | undefined {
  return scopeFor(host)?.registerList(host, list);
}

export function connectCitation(
  host: HTMLElement,
  update: CitationListener,
): (() => void) | undefined {
  return scopeFor(host)?.registerCitation(host, update);
}

export function sameSource(a: NumberedSource | undefined, b: NumberedSource | undefined): boolean {
  return (
    a?.id === b?.id &&
    a?.number === b?.number &&
    a?.href === b?.href &&
    a?.title === b?.title &&
    a?.snippet === b?.snippet
  );
}

function scopeFor(host: HTMLElement): SourcesScope | undefined {
  const root = host.getRootNode();
  if (!(root instanceof Document || root instanceof DocumentFragment)) {
    return undefined;
  }
  let scope = scopes.get(root);
  if (!scope) {
    scope = new SourcesScope(root);
    scopes.set(root, scope);
  }
  return scope;
}

function definitionFor(element: Element): SourceDefinition | undefined {
  const id = element.getAttribute('source-id') ?? element.id;
  const title = element.getAttribute('title')?.trim();
  const destination = readSourceUrl(element.getAttribute('href') ?? '', element.baseURI);
  if (!id || !title || !destination) {
    return undefined;
  }
  return { id, title, snippet: element.getAttribute('snippet') ?? '', ...destination };
}

function containsSources(node: Node): boolean {
  return (
    node instanceof Element &&
    (node.matches(SCOPE_ELEMENTS) || node.querySelector(SCOPE_ELEMENTS) !== null)
  );
}

function affectsSources(record: MutationRecord): boolean {
  if (record.type === 'attributes') {
    return record.target instanceof Element && record.target.matches(SCOPE_ELEMENTS);
  }
  return [...record.addedNodes, ...record.removedNodes].some(containsSources);
}

/** One subscription and one ordering pass for all source lists in a tree. */
class SourcesScope {
  private readonly lists = new Map<HTMLElement, SourceList>();
  private readonly citations = new Map<HTMLElement, CitationListener>();
  private readonly observer: MutationObserver;
  private pending = false;

  constructor(private readonly root: SourceRoot) {
    this.observer = new MutationObserver((records) => {
      if (records.some(affectsSources)) {
        this.scheduleUpdate();
      }
    });
    this.observer.observe(root, {
      subtree: true,
      childList: true,
      attributeFilter: ['id', 'source-id', 'ref', 'href', 'title', 'snippet'],
    });
  }

  registerList(host: HTMLElement, list: SourceList): () => void {
    return this.register(this.lists, host, list);
  }

  registerCitation(host: HTMLElement, update: CitationListener): () => void {
    return this.register(this.citations, host, update);
  }

  private register<T>(items: Map<HTMLElement, T>, host: HTMLElement, value: T): () => void {
    items.set(host, value);
    this.scheduleUpdate();
    return () => {
      items.delete(host);
      if (this.lists.size === 0 && this.citations.size === 0) {
        this.observer.disconnect();
        scopes.delete(this.root);
      } else {
        this.scheduleUpdate();
      }
    };
  }

  private scheduleUpdate(): void {
    if (this.pending) {
      return;
    }
    this.pending = true;
    queueMicrotask(() => {
      this.pending = false;
      if (this.lists.size || this.citations.size) {
        this.update();
      }
    });
  }

  private update(): void {
    const ownersByGroup = new Map<ReferenceGroup, Map<string, SourceList>>();
    const definitionsByList = new Map<SourceList, SourceDefinition[]>();
    for (const host of this.root.querySelectorAll<HTMLElement>(SOURCES)) {
      const list = this.lists.get(host);
      if (!list) {
        continue;
      }
      const group = referenceGroup(host);
      const ownerById = ownersByGroup.get(group) ?? new Map<string, SourceList>();
      ownersByGroup.set(group, ownerById);
      const definitions: SourceDefinition[] = [];
      for (const child of host.children) {
        const source =
          child.localName === SOURCE && referenceGroup(child) === group
            ? definitionFor(child)
            : undefined;
        if (source && !ownerById.has(source.id)) {
          definitions.push(source);
          ownerById.set(source.id, list);
        }
      }
      definitionsByList.set(list, definitions);
    }

    const ownerOf = (citation: Element, id: string): SourceList | undefined =>
      ownersByGroup.get(referenceGroup(citation))?.get(id);

    const referencesByList = new Map<SourceList, string[]>();
    for (const citation of this.root.querySelectorAll(CITATION)) {
      const id = citation.getAttribute('ref');
      const list = id ? ownerOf(citation, id) : undefined;
      if (list && id) {
        const references = referencesByList.get(list) ?? [];
        references.push(id);
        referencesByList.set(list, references);
      }
    }

    const targetsByList = new Map<SourceList, Map<string, CitationTarget>>();
    for (const [list, definitions] of definitionsByList) {
      const sources = orderSources(definitions, referencesByList.get(list) ?? []).map(
        (source, index) => ({ ...source, number: index + 1 }),
      );
      list.update(sources);
      targetsByList.set(
        list,
        new Map(sources.map((source) => [source.id, { source, reveal: list.reveal }])),
      );
    }
    for (const [host, update] of this.citations) {
      const id = host.getAttribute('ref') ?? '';
      const list = ownerOf(host, id);
      update(list ? targetsByList.get(list)?.get(id) : undefined);
    }
  }
}
