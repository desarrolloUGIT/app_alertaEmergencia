import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { HomeVialidad2Page } from './home-vialidad2.page';

const routes: Routes = [
  {
    path: '',
    component: HomeVialidad2Page
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class HomeVialidad2PageRoutingModule {}
