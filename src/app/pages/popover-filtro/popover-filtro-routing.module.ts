import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { PopoverFiltroPage } from './popover-filtro.page';

const routes: Routes = [
  {
    path: '',
    component: PopoverFiltroPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PopoverFiltroPageRoutingModule {}
