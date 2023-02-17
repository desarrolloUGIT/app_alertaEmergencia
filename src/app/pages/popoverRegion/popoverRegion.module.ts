import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { PopoverRegionPageRoutingModule } from './popoverRegion-routing.module';

import { PopoverRegionPage } from './popoverRegion.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    PopoverRegionPageRoutingModule
  ],
  declarations: [PopoverRegionPage]
})
export class PopoverPageModule {}
