/**
 * Advanced Search Routing Module for DSpace 9 Angular UI
 * Place this file in: src/app/advanced-search/advanced-search-routing.module.ts
 */
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AdvancedSearchComponent } from './advanced-search.component';

const routes: Routes = [
  {
    path: '',
    component: AdvancedSearchComponent,
    data: {
      title: 'Advanced Search',
      breadcrumb: 'Advanced Search'
    }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdvancedSearchRoutingModule { }
