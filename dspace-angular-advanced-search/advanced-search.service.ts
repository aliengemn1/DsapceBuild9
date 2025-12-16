/**
 * Advanced Search Service for DSpace 9 Angular UI
 * Place this file in: src/app/advanced-search/advanced-search.service.ts
 *
 * This service handles building REST API queries and communicating with the DSpace backend.
 */
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, forkJoin } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

/**
 * Search row interface representing a single search condition
 */
export interface SearchRow {
  field: string;
  operator: string;
  value: string;
  booleanOperator?: string;
  dateFrom?: string;
  dateTo?: string;
}

/**
 * Advanced search query interface
 */
export interface AdvancedSearchQuery {
  rows: SearchRow[];
  scope?: string;
  page?: number;
  pageSize?: number;
  sort?: string;
  sortDirection?: 'ASC' | 'DESC';
}

/**
 * Scope option interface for communities/collections
 */
export interface ScopeOption {
  label: string;
  value: string;
}

/**
 * Metadata field mapping from UI name to Solr field
 */
export const METADATA_FIELD_MAPPING: { [key: string]: string } = {
  'title': 'title',
  'author': 'author',
  'subject': 'subject',
  'publisher': 'publisher',
  'language': 'language',
  'itemtype': 'itemtype',
  'dateIssued': 'dateIssued',
  'abstract': 'abstract',
  'identifier': 'identifier',
  '*': '*'
};

/**
 * Operator mapping from UI value to DSpace REST API operator
 * DSpace supports: equals, notequals, authority, notauthority, contains, notcontains, query
 */
export const OPERATOR_MAPPING: { [key: string]: string } = {
  'contains': 'contains',
  'equals': 'equals',
  'query': 'query',       // Starts with / partial match
  'notcontains': 'notcontains',
  'notequals': 'notequals',
  'before': 'equals',     // Will be transformed with date logic
  'after': 'equals',      // Will be transformed with date logic
  'range': 'equals'       // Will be transformed to date range query
};

@Injectable({
  providedIn: 'root'
})
export class AdvancedSearchService {

  private baseUrl: string;
  private searchEndpoint = '/api/discover/search/objects';

  constructor(private http: HttpClient) {
    // Use environment configuration or default
    this.baseUrl = environment?.rest?.baseUrl || 'http://localhost:8080/server';
  }

  /**
   * Execute an advanced search query
   * @param query The advanced search query
   * @returns Observable of search results
   */
  search(query: AdvancedSearchQuery): Observable<any> {
    const params = this.buildSearchParams(query);

    return this.http.get(`${this.baseUrl}${this.searchEndpoint}`, { params })
      .pipe(
        catchError(error => {
          console.error('Search error:', error);
          throw error;
        })
      );
  }

  /**
   * Build HTTP params from advanced search query
   * @param query The advanced search query
   * @returns HttpParams object
   */
  private buildSearchParams(query: AdvancedSearchQuery): HttpParams {
    let params = new HttpParams();

    // Build the main query string from search rows
    const queryString = this.buildQueryString(query.rows);
    if (queryString) {
      params = params.set('query', queryString);
    }

    // Add search filters for field-specific searches
    query.rows.forEach((row, index) => {
      if (row.field !== '*' && row.value) {
        const filterParams = this.buildFilterParams(row, index);
        filterParams.forEach((value, key) => {
          params = params.append(key, value);
        });
      }
    });

    // Add scope if specified
    if (query.scope) {
      params = params.set('scope', query.scope);
    }

    // Add pagination
    params = params.set('page', (query.page || 1) - 1); // DSpace uses 0-based pagination
    params = params.set('size', query.pageSize || 10);

    // Add sorting
    if (query.sort) {
      params = params.set('sort', `${query.sort},${query.sortDirection || 'DESC'}`);
    }

    // Always include configuration for default search behavior
    params = params.set('configuration', 'default');

    return params;
  }

  /**
   * Build the main query string from search rows
   * This creates a Solr-compatible query string
   * @param rows Search rows
   * @returns Query string
   */
  private buildQueryString(rows: SearchRow[]): string {
    const queryParts: string[] = [];

    rows.forEach((row, index) => {
      if (!row.value) return;

      let queryPart = '';

      // Handle different operators
      switch (row.operator) {
        case 'contains':
          queryPart = this.buildContainsQuery(row);
          break;
        case 'equals':
          queryPart = this.buildEqualsQuery(row);
          break;
        case 'query':
          queryPart = this.buildStartsWithQuery(row);
          break;
        case 'notcontains':
          queryPart = this.buildNotContainsQuery(row);
          break;
        case 'notequals':
          queryPart = this.buildNotEqualsQuery(row);
          break;
        case 'before':
          queryPart = this.buildDateBeforeQuery(row);
          break;
        case 'after':
          queryPart = this.buildDateAfterQuery(row);
          break;
        case 'range':
          queryPart = this.buildDateRangeQuery(row);
          break;
        default:
          queryPart = this.buildContainsQuery(row);
      }

      // Add boolean operator for subsequent rows
      if (index > 0 && row.booleanOperator && queryPart) {
        queryParts.push(`${row.booleanOperator} (${queryPart})`);
      } else if (queryPart) {
        queryParts.push(`(${queryPart})`);
      }
    });

    return queryParts.join(' ');
  }

  /**
   * Build a contains query (partial match)
   */
  private buildContainsQuery(row: SearchRow): string {
    const field = this.getSolrField(row.field);
    const value = this.escapeSpecialChars(row.value);

    if (field === '*') {
      return `*${value}*`;
    }
    return `${field}:*${value}*`;
  }

  /**
   * Build an exact match query
   */
  private buildEqualsQuery(row: SearchRow): string {
    const field = this.getSolrField(row.field);
    const value = this.escapeSpecialChars(row.value);

    if (field === '*') {
      return `"${value}"`;
    }
    return `${field}:"${value}"`;
  }

  /**
   * Build a starts with query
   */
  private buildStartsWithQuery(row: SearchRow): string {
    const field = this.getSolrField(row.field);
    const value = this.escapeSpecialChars(row.value);

    if (field === '*') {
      return `${value}*`;
    }
    return `${field}:${value}*`;
  }

  /**
   * Build a NOT contains query
   */
  private buildNotContainsQuery(row: SearchRow): string {
    const field = this.getSolrField(row.field);
    const value = this.escapeSpecialChars(row.value);

    if (field === '*') {
      return `-*${value}*`;
    }
    return `-${field}:*${value}*`;
  }

  /**
   * Build a NOT equals query
   */
  private buildNotEqualsQuery(row: SearchRow): string {
    const field = this.getSolrField(row.field);
    const value = this.escapeSpecialChars(row.value);

    if (field === '*') {
      return `-"${value}"`;
    }
    return `-${field}:"${value}"`;
  }

  /**
   * Build a date before query
   */
  private buildDateBeforeQuery(row: SearchRow): string {
    const field = this.getSolrField(row.field);
    const value = this.formatDateForSolr(row.value);

    return `${field}:[* TO ${value}]`;
  }

  /**
   * Build a date after query
   */
  private buildDateAfterQuery(row: SearchRow): string {
    const field = this.getSolrField(row.field);
    const value = this.formatDateForSolr(row.value);

    return `${field}:[${value} TO *]`;
  }

  /**
   * Build a date range query
   */
  private buildDateRangeQuery(row: SearchRow): string {
    const field = this.getSolrField(row.field);
    const from = row.dateFrom ? this.formatDateForSolr(row.dateFrom) : '*';
    const to = row.dateTo ? this.formatDateForSolr(row.dateTo) : '*';

    return `${field}:[${from} TO ${to}]`;
  }

  /**
   * Build filter parameters for DSpace REST API
   * Uses the f.<field>=<value>,<operator> format
   */
  private buildFilterParams(row: SearchRow, index: number): Map<string, string> {
    const params = new Map<string, string>();
    const solrField = METADATA_FIELD_MAPPING[row.field] || row.field;
    const operator = OPERATOR_MAPPING[row.operator] || 'contains';

    let value = row.value;

    // Handle date range specially
    if (row.operator === 'range' && row.dateFrom && row.dateTo) {
      value = `[${row.dateFrom} TO ${row.dateTo}]`;
    } else if (row.operator === 'before') {
      value = `[* TO ${row.value}]`;
    } else if (row.operator === 'after') {
      value = `[${row.value} TO *]`;
    }

    // DSpace REST API filter format: f.<filterName>=<value>,<operator>
    params.set(`f.${solrField}`, `${value},${operator}`);

    return params;
  }

  /**
   * Get the Solr field name for a UI field
   */
  private getSolrField(uiField: string): string {
    return METADATA_FIELD_MAPPING[uiField] || uiField;
  }

  /**
   * Escape special Solr characters
   */
  private escapeSpecialChars(value: string): string {
    // Escape Solr special characters: + - && || ! ( ) { } [ ] ^ " ~ * ? : \ /
    return value.replace(/([+\-&|!(){}[\]^"~*?:\\/])/g, '\\$1');
  }

  /**
   * Format a date string for Solr
   * Supports YYYY, YYYY-MM, and YYYY-MM-DD formats
   */
  private formatDateForSolr(dateStr: string): string {
    if (!dateStr) return '*';

    // Check format and pad as needed
    const parts = dateStr.split('-');

    if (parts.length === 1) {
      // Just year: YYYY -> YYYY-01-01T00:00:00Z
      return `${parts[0]}-01-01T00:00:00Z`;
    } else if (parts.length === 2) {
      // Year and month: YYYY-MM -> YYYY-MM-01T00:00:00Z
      return `${parts[0]}-${parts[1]}-01T00:00:00Z`;
    } else {
      // Full date: YYYY-MM-DD -> YYYY-MM-DDT00:00:00Z
      return `${dateStr}T00:00:00Z`;
    }
  }

  /**
   * Get available search scopes (communities and collections)
   * @returns Observable of scope options
   */
  getSearchScopes(): Observable<ScopeOption[]> {
    // Fetch communities and collections to populate scope dropdown
    const communities$ = this.http.get<any>(`${this.baseUrl}/api/core/communities?size=100`);
    const collections$ = this.http.get<any>(`${this.baseUrl}/api/core/collections?size=100`);

    return forkJoin([communities$, collections$]).pipe(
      map(([communities, collections]) => {
        const scopes: ScopeOption[] = [];

        // Add communities
        if (communities?._embedded?.communities) {
          communities._embedded.communities.forEach((community: any) => {
            scopes.push({
              label: `Community: ${community.name}`,
              value: community.uuid
            });
          });
        }

        // Add collections
        if (collections?._embedded?.collections) {
          collections._embedded.collections.forEach((collection: any) => {
            scopes.push({
              label: `Collection: ${collection.name}`,
              value: collection.uuid
            });
          });
        }

        return scopes;
      }),
      catchError(error => {
        console.error('Error loading scopes:', error);
        return of([]);
      })
    );
  }

  /**
   * Get available facet values for a field
   * Useful for autocomplete suggestions
   */
  getFacetValues(field: string, prefix?: string): Observable<string[]> {
    let params = new HttpParams()
      .set('configuration', 'default')
      .set('size', '20');

    if (prefix) {
      params = params.set('prefix', prefix);
    }

    const solrField = METADATA_FIELD_MAPPING[field] || field;

    return this.http.get<any>(`${this.baseUrl}/api/discover/facets/${solrField}`, { params })
      .pipe(
        map(response => {
          if (response?._embedded?.values) {
            return response._embedded.values.map((v: any) => v.label || v.value);
          }
          return [];
        }),
        catchError(error => {
          console.error('Error loading facet values:', error);
          return of([]);
        })
      );
  }

  /**
   * Get search configuration
   * Returns available filters, sort options, etc.
   */
  getSearchConfiguration(scope?: string): Observable<any> {
    let params = new HttpParams();
    if (scope) {
      params = params.set('scope', scope);
    }

    return this.http.get<any>(`${this.baseUrl}/api/discover/search`, { params });
  }

  /**
   * Build a URL for the search that can be shared
   */
  buildShareableUrl(query: AdvancedSearchQuery): string {
    const params = this.buildSearchParams(query);
    return `${window.location.origin}/advanced-search?${params.toString()}`;
  }

  /**
   * Export search results to various formats
   * @param query The search query
   * @param format Export format (csv, bibtex, ris, etc.)
   */
  exportResults(query: AdvancedSearchQuery, format: string): Observable<Blob> {
    const params = this.buildSearchParams(query)
      .set('format', format);

    return this.http.get(`${this.baseUrl}/api/discover/export`, {
      params,
      responseType: 'blob'
    });
  }
}

/**
 * Query Builder Utility class for more complex query construction
 */
export class AdvancedQueryBuilder {

  private queryParts: string[] = [];
  private filters: Map<string, string[]> = new Map();

  /**
   * Add a search condition
   */
  addCondition(field: string, operator: string, value: string, booleanOp: string = 'AND'): this {
    const condition = this.buildCondition(field, operator, value);
    if (this.queryParts.length > 0) {
      this.queryParts.push(`${booleanOp} ${condition}`);
    } else {
      this.queryParts.push(condition);
    }
    return this;
  }

  /**
   * Add a filter
   */
  addFilter(field: string, value: string, operator: string = 'equals'): this {
    const filterKey = `f.${field}`;
    const filterValue = `${value},${operator}`;

    if (!this.filters.has(filterKey)) {
      this.filters.set(filterKey, []);
    }
    this.filters.get(filterKey)?.push(filterValue);

    return this;
  }

  /**
   * Add a date range filter
   */
  addDateRange(field: string, from: string, to: string): this {
    const condition = `${field}:[${from || '*'} TO ${to || '*'}]`;
    this.queryParts.push(condition);
    return this;
  }

  /**
   * Build the final query string
   */
  buildQuery(): string {
    return this.queryParts.join(' ');
  }

  /**
   * Build the filters object
   */
  buildFilters(): { [key: string]: string[] } {
    const result: { [key: string]: string[] } = {};
    this.filters.forEach((values, key) => {
      result[key] = values;
    });
    return result;
  }

  /**
   * Reset the builder
   */
  reset(): this {
    this.queryParts = [];
    this.filters.clear();
    return this;
  }

  private buildCondition(field: string, operator: string, value: string): string {
    const escapedValue = this.escapeValue(value);

    switch (operator) {
      case 'contains':
        return field === '*' ? `*${escapedValue}*` : `${field}:*${escapedValue}*`;
      case 'equals':
        return field === '*' ? `"${escapedValue}"` : `${field}:"${escapedValue}"`;
      case 'starts_with':
        return field === '*' ? `${escapedValue}*` : `${field}:${escapedValue}*`;
      case 'not_contains':
        return field === '*' ? `-*${escapedValue}*` : `-${field}:*${escapedValue}*`;
      case 'not_equals':
        return field === '*' ? `-"${escapedValue}"` : `-${field}:"${escapedValue}"`;
      default:
        return field === '*' ? escapedValue : `${field}:${escapedValue}`;
    }
  }

  private escapeValue(value: string): string {
    return value.replace(/([+\-&|!(){}[\]^"~*?:\\/])/g, '\\$1');
  }
}
