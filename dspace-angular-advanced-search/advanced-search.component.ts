/**
 * Advanced Search Component for DSpace 9 Angular UI
 * Place this file in: src/app/advanced-search/advanced-search.component.ts
 */
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime } from 'rxjs/operators';
import { AdvancedSearchService, SearchRow, AdvancedSearchQuery } from './advanced-search.service';
import { PaginationService } from '../core/pagination/pagination.service';
import { SearchConfigurationService } from '../core/shared/search/search-configuration.service';

/**
 * Interface for metadata field options
 */
export interface MetadataFieldOption {
  label: string;
  value: string;
  solrField: string;
  type: 'text' | 'date';
}

/**
 * Interface for operator options
 */
export interface OperatorOption {
  label: string;
  value: string;
}

@Component({
  selector: 'ds-advanced-search',
  templateUrl: './advanced-search.component.html',
  styleUrls: ['./advanced-search.component.scss']
})
export class AdvancedSearchComponent implements OnInit, OnDestroy {

  // Form group for advanced search
  advancedSearchForm: FormGroup;

  // Available metadata fields for searching
  metadataFields: MetadataFieldOption[] = [
    { label: 'Title', value: 'title', solrField: 'dc.title', type: 'text' },
    { label: 'Author', value: 'author', solrField: 'dc.contributor.author', type: 'text' },
    { label: 'Subject', value: 'subject', solrField: 'dc.subject', type: 'text' },
    { label: 'Publisher', value: 'publisher', solrField: 'dc.publisher', type: 'text' },
    { label: 'Language', value: 'language', solrField: 'dc.language.iso', type: 'text' },
    { label: 'Item Type', value: 'itemtype', solrField: 'dc.type', type: 'text' },
    { label: 'Date Issued', value: 'dateIssued', solrField: 'dc.date.issued', type: 'date' },
    { label: 'Abstract', value: 'abstract', solrField: 'dc.description.abstract', type: 'text' },
    { label: 'Identifier', value: 'identifier', solrField: 'dc.identifier', type: 'text' },
    { label: 'All Fields', value: '*', solrField: '*', type: 'text' }
  ];

  // Available operators for text fields
  textOperators: OperatorOption[] = [
    { label: 'Contains', value: 'contains' },
    { label: 'Equals', value: 'equals' },
    { label: 'Starts With', value: 'query' },
    { label: 'Not Contains', value: 'notcontains' },
    { label: 'Not Equals', value: 'notequals' }
  ];

  // Available operators for date fields
  dateOperators: OperatorOption[] = [
    { label: 'Equals', value: 'equals' },
    { label: 'Before', value: 'before' },
    { label: 'After', value: 'after' },
    { label: 'Range', value: 'range' }
  ];

  // Boolean operators for combining rows
  booleanOperators: OperatorOption[] = [
    { label: 'AND', value: 'AND' },
    { label: 'OR', value: 'OR' }
  ];

  // Search scope options
  scopeOptions: { label: string; value: string }[] = [
    { label: 'All of DSpace', value: '' }
  ];

  // Search results
  searchResults: any = null;
  isLoading = false;
  errorMessage = '';

  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalResults = 0;

  // Applied filters for display
  appliedFilters: string[] = [];

  // Subject for cleanup
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private advancedSearchService: AdvancedSearchService,
    private paginationService: PaginationService,
    private searchConfigurationService: SearchConfigurationService
  ) {
    this.advancedSearchForm = this.createForm();
  }

  ngOnInit(): void {
    // Load communities and collections for scope selection
    this.loadScopeOptions();

    // Check for URL parameters and restore search state
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        if (params['advSearch']) {
          this.restoreSearchFromParams(params);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Create the form structure
   */
  private createForm(): FormGroup {
    return this.fb.group({
      scope: [''],
      searchRows: this.fb.array([this.createSearchRow()]),
      dateRangeFrom: [''],
      dateRangeTo: ['']
    });
  }

  /**
   * Create a single search row
   */
  private createSearchRow(data?: Partial<SearchRow>): FormGroup {
    return this.fb.group({
      field: [data?.field || 'title', Validators.required],
      operator: [data?.operator || 'contains', Validators.required],
      value: [data?.value || '', Validators.required],
      booleanOperator: [data?.booleanOperator || 'AND']
    });
  }

  /**
   * Get search rows as FormArray
   */
  get searchRows(): FormArray {
    return this.advancedSearchForm.get('searchRows') as FormArray;
  }

  /**
   * Add a new search row
   */
  addSearchRow(): void {
    if (this.searchRows.length < 10) {
      this.searchRows.push(this.createSearchRow());
    }
  }

  /**
   * Remove a search row
   */
  removeSearchRow(index: number): void {
    if (this.searchRows.length > 1) {
      this.searchRows.removeAt(index);
    }
  }

  /**
   * Get operators for a specific field
   */
  getOperatorsForField(fieldValue: string): OperatorOption[] {
    const field = this.metadataFields.find(f => f.value === fieldValue);
    return field?.type === 'date' ? this.dateOperators : this.textOperators;
  }

  /**
   * Check if field is a date type
   */
  isDateField(fieldValue: string): boolean {
    const field = this.metadataFields.find(f => f.value === fieldValue);
    return field?.type === 'date';
  }

  /**
   * Check if date range inputs should be shown
   */
  shouldShowDateRange(index: number): boolean {
    const row = this.searchRows.at(index);
    return this.isDateField(row.get('field')?.value) &&
           row.get('operator')?.value === 'range';
  }

  /**
   * Load scope options (communities and collections)
   */
  private loadScopeOptions(): void {
    // This would typically call a service to get communities/collections
    // For now, we'll keep the default "All of DSpace" option
    this.advancedSearchService.getSearchScopes()
      .pipe(takeUntil(this.destroy$))
      .subscribe(scopes => {
        this.scopeOptions = [
          { label: 'All of DSpace', value: '' },
          ...scopes
        ];
      });
  }

  /**
   * Execute the advanced search
   */
  search(): void {
    if (!this.validateForm()) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.appliedFilters = [];

    const searchQuery = this.buildSearchQuery();

    // Update URL with search parameters
    this.updateUrlParams(searchQuery);

    // Execute search
    this.advancedSearchService.search(searchQuery)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (results) => {
          this.searchResults = results;
          this.totalResults = results._embedded?.searchResult?.page?.totalElements || 0;
          this.buildAppliedFiltersDisplay();
          this.isLoading = false;
        },
        error: (error) => {
          this.errorMessage = 'An error occurred while searching. Please try again.';
          console.error('Search error:', error);
          this.isLoading = false;
        }
      });
  }

  /**
   * Validate the form before searching
   */
  private validateForm(): boolean {
    let isValid = true;

    this.searchRows.controls.forEach((row, index) => {
      const value = row.get('value')?.value;
      const field = row.get('field')?.value;
      const operator = row.get('operator')?.value;

      // Check for empty values
      if (!value || value.trim() === '') {
        row.get('value')?.setErrors({ required: true });
        isValid = false;
      }

      // Validate date format for date fields
      if (this.isDateField(field) && value) {
        const datePattern = /^\d{4}(-\d{2}(-\d{2})?)?$/;
        if (!datePattern.test(value)) {
          row.get('value')?.setErrors({ invalidDate: true });
          isValid = false;
        }
      }

      // Validate date range
      if (operator === 'range') {
        const dateFrom = this.advancedSearchForm.get('dateRangeFrom')?.value;
        const dateTo = this.advancedSearchForm.get('dateRangeTo')?.value;

        if (!dateFrom || !dateTo) {
          this.errorMessage = 'Please provide both start and end dates for date range search.';
          isValid = false;
        }
      }
    });

    return isValid;
  }

  /**
   * Build the search query object
   */
  private buildSearchQuery(): AdvancedSearchQuery {
    const formValue = this.advancedSearchForm.value;

    const rows: SearchRow[] = formValue.searchRows.map((row: any, index: number) => {
      const searchRow: SearchRow = {
        field: row.field,
        operator: row.operator,
        value: row.value,
        booleanOperator: index > 0 ? row.booleanOperator : undefined
      };

      // Handle date range
      if (row.operator === 'range' && this.isDateField(row.field)) {
        searchRow.dateFrom = formValue.dateRangeFrom;
        searchRow.dateTo = formValue.dateRangeTo;
      }

      return searchRow;
    });

    return {
      rows,
      scope: formValue.scope,
      page: this.currentPage,
      pageSize: this.pageSize
    };
  }

  /**
   * Update URL parameters with search state
   */
  private updateUrlParams(query: AdvancedSearchQuery): void {
    const params: any = {
      advSearch: 'true',
      scope: query.scope || '',
      page: query.page,
      size: query.pageSize
    };

    // Encode search rows
    params.rows = btoa(JSON.stringify(query.rows));

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: params,
      queryParamsHandling: 'merge'
    });
  }

  /**
   * Restore search from URL parameters
   */
  private restoreSearchFromParams(params: any): void {
    try {
      if (params.scope) {
        this.advancedSearchForm.patchValue({ scope: params.scope });
      }

      if (params.rows) {
        const rows = JSON.parse(atob(params.rows));

        // Clear existing rows
        while (this.searchRows.length > 0) {
          this.searchRows.removeAt(0);
        }

        // Add rows from params
        rows.forEach((row: SearchRow) => {
          this.searchRows.push(this.createSearchRow(row));
        });

        // If date range, restore those values
        const dateRow = rows.find((r: SearchRow) => r.operator === 'range');
        if (dateRow) {
          this.advancedSearchForm.patchValue({
            dateRangeFrom: dateRow.dateFrom,
            dateRangeTo: dateRow.dateTo
          });
        }
      }

      if (params.page) {
        this.currentPage = parseInt(params.page, 10);
      }

      if (params.size) {
        this.pageSize = parseInt(params.size, 10);
      }

      // Execute search
      this.search();
    } catch (e) {
      console.error('Error restoring search from params:', e);
    }
  }

  /**
   * Build display of applied filters
   */
  private buildAppliedFiltersDisplay(): void {
    this.appliedFilters = this.searchRows.controls.map((row, index) => {
      const field = this.metadataFields.find(f => f.value === row.get('field')?.value);
      const operator = row.get('operator')?.value;
      const value = row.get('value')?.value;
      const booleanOp = index > 0 ? row.get('booleanOperator')?.value : '';

      let filterText = `${field?.label || 'Unknown'} ${this.getOperatorLabel(operator)} "${value}"`;
      if (booleanOp) {
        filterText = `${booleanOp} ${filterText}`;
      }

      return filterText;
    });
  }

  /**
   * Get human-readable operator label
   */
  private getOperatorLabel(operatorValue: string): string {
    const allOperators = [...this.textOperators, ...this.dateOperators];
    const operator = allOperators.find(op => op.value === operatorValue);
    return operator?.label.toLowerCase() || operatorValue;
  }

  /**
   * Clear all filters and reset form
   */
  clearAll(): void {
    // Reset form
    this.advancedSearchForm.reset({
      scope: '',
      dateRangeFrom: '',
      dateRangeTo: ''
    });

    // Clear all rows and add one empty row
    while (this.searchRows.length > 0) {
      this.searchRows.removeAt(0);
    }
    this.searchRows.push(this.createSearchRow());

    // Clear results
    this.searchResults = null;
    this.appliedFilters = [];
    this.errorMessage = '';
    this.currentPage = 1;

    // Clear URL params
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {}
    });
  }

  /**
   * Remove a specific applied filter
   */
  removeFilter(index: number): void {
    if (this.searchRows.length > 1) {
      this.searchRows.removeAt(index);
      this.search();
    } else {
      this.clearAll();
    }
  }

  /**
   * Change page
   */
  onPageChange(page: number): void {
    this.currentPage = page;
    this.search();
  }

  /**
   * Change page size
   */
  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.currentPage = 1;
    this.search();
  }

  /**
   * Handle field change - reset operator if switching between date and text
   */
  onFieldChange(index: number): void {
    const row = this.searchRows.at(index);
    const field = row.get('field')?.value;
    const operators = this.getOperatorsForField(field);

    // Reset operator to first available for this field type
    row.patchValue({ operator: operators[0].value });

    // Clear value when switching field types
    if (this.isDateField(field)) {
      row.patchValue({ value: '' });
    }
  }

  /**
   * Navigate to standard search with current query
   */
  switchToSimpleSearch(): void {
    const query = this.buildSimpleQueryString();
    this.router.navigate(['/search'], {
      queryParams: { query }
    });
  }

  /**
   * Build a simple query string from advanced search rows
   */
  private buildSimpleQueryString(): string {
    const parts: string[] = [];

    this.searchRows.controls.forEach((row, index) => {
      const field = row.get('field')?.value;
      const value = row.get('value')?.value;
      const booleanOp = index > 0 ? row.get('booleanOperator')?.value : '';

      const metadataField = this.metadataFields.find(f => f.value === field);
      const solrField = metadataField?.solrField || field;

      let part = '';
      if (solrField === '*') {
        part = value;
      } else {
        part = `${solrField}:${value}`;
      }

      if (booleanOp && index > 0) {
        parts.push(`${booleanOp} ${part}`);
      } else {
        parts.push(part);
      }
    });

    return parts.join(' ');
  }
}
