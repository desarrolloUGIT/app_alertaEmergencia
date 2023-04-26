import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { PopoverFiltroPageRoutingModule } from './popover-filtro-routing.module';

import { PopoverFiltroPage } from './popover-filtro.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    PopoverFiltroPageRoutingModule
  ],
  declarations: [PopoverFiltroPage]
})
export class PopoverFiltroPageModule {}
