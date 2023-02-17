import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { PopoverRegionPage } from './popoverRegion.page';

const routes: Routes = [
  {
    path: '',
    component: PopoverRegionPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PopoverRegionPageRoutingModule {}
