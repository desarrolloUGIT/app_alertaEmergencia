import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { HomeVialidadPage } from './home-vialidad.page';

const routes: Routes = [
  {
    path: '',
    component: HomeVialidadPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class HomeVialidadPageRoutingModule {}
