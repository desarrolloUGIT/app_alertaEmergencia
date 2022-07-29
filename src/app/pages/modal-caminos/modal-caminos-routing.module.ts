import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ModalCaminosPage } from './modal-caminos.page';

const routes: Routes = [
  {
    path: '',
    component: ModalCaminosPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ModalCaminosPageRoutingModule {}
