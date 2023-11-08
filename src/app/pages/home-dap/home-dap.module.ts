import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { HomeDapPageRoutingModule } from './home-dap-routing.module';

import { HomeDapPage } from './home-dap.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    HomeDapPageRoutingModule
  ],
  declarations: [HomeDapPage]
})
export class HomeDapPageModule {}
