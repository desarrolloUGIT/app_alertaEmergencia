import { Component, OnInit } from '@angular/core';
import { addIcons } from 'ionicons';
import { App } from '@capacitor/app';

addIcons({
  'not-signal': 'assets/img/not_signal.svg',
});
@Component({
  selector: 'app-help',
  templateUrl: './help.page.html',
  styleUrls: ['./help.page.scss'],
})
export class HelpPage implements OnInit {
  version;
  constructor() { }

  ngOnInit() {
    App.getInfo().then(e=>{
      this.version = e.version;
      console.log('INFOOOOOOOOOO =>',e)
    })
  }

}
