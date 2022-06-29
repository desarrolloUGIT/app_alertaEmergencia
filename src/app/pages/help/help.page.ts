import { Component, OnInit } from '@angular/core';
import { addIcons } from 'ionicons';
addIcons({
  'not-signal': 'assets/img/not_signal.svg',
});
@Component({
  selector: 'app-help',
  templateUrl: './help.page.html',
  styleUrls: ['./help.page.scss'],
})
export class HelpPage implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
