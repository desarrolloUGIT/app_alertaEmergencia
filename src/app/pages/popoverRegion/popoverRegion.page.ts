import { Component, OnInit, Input } from '@angular/core';
import { PopoverController, NavParams } from '@ionic/angular';

@Component({
  selector: 'app-popoverRegion',
  templateUrl: './popoverRegion.page.html',
  styleUrls: ['./popoverRegion.page.scss'],
})
export class PopoverRegionPage implements OnInit {

  @Input() region;

  constructor(public popctrl: PopoverController,public navParams: NavParams) { 
    this.region = navParams.get('region');
  }

  ngOnInit() {
  }

  Selectregion(i) {
    let data = { region:(i && i.detail) ? i.detail.value : null };
    this.popctrl.dismiss(data);
  }

}
