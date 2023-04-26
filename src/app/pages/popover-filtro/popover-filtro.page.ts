import { Component, OnInit, Input } from '@angular/core';
import { PopoverController, NavParams } from '@ionic/angular';

@Component({
  selector: 'app-popover-filtro',
  templateUrl: './popover-filtro.page.html',
  styleUrls: ['./popover-filtro.page.scss'],
})
export class PopoverFiltroPage implements OnInit {

  @Input() filtro;

  constructor(public popctrl: PopoverController,public navParams: NavParams) { 
    this.filtro = navParams.get('filtro');
  }

  ngOnInit() {
  }

  SelectFitro(i) {
    let data = { filtro:(i && i.detail) ? i.detail.value : null };
    this.popctrl.dismiss(data);
  }


}
