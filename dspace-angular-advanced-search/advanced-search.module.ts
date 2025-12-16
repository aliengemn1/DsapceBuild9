/**
 * Advanced Search Module for DSpace 9 Angular UI
 * Place this file in: src/app/advanced-search/advanced-search.module.ts
 */
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { AdvancedSearchComponent } from './advanced-search.component';
import { AdvancedSearchService } from './advanced-search.service';
import { AdvancedSearchRoutingModule } from './advanced-search-routing.module';

// Import shared DSpace modules as needed
// import { SharedModule } from '../shared/shared.module';

@NgModule({
  declarations: [
    AdvancedSearchComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule,
    AdvancedSearchRoutingModule,
    // SharedModule
  ],
  providers: [
    AdvancedSearchService
  ],
  exports: [
    AdvancedSearchComponent
  ]
})
export class AdvancedSearchModule { }
