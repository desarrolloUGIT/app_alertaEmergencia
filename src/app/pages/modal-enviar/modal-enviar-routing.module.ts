import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ModalEnviarPage } from './modal-enviar.page';

const routes: Routes = [
  {
    path: '',
    component: ModalEnviarPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ModalEnviarPageRoutingModule {}
