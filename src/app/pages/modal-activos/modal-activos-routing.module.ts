import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ModalActivosPage } from './modal-activos.page';

const routes: Routes = [
  {
    path: '',
    component: ModalActivosPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ModalActivosPageRoutingModule {}
