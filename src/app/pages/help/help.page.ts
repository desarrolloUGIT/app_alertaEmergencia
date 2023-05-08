import { Component, Injector, Input, OnInit } from '@angular/core';
import { ModalController, NavParams, Platform } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { App } from '@capacitor/app';
import { ActivatedRoute, Router } from '@angular/router';

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
  nomostrar = false;
  constructor(public modalCtrl:ModalController,private route: ActivatedRoute,public platform:Platform) { 
      this.route.queryParams.subscribe(params => {   
        if(params['nomostrar']){
          this.nomostrar = params['nomostrar']
        }else{
          this.nomostrar = false;
        }
      })
    
  }

  ngOnInit() {
    if(this.platform.is('capacitor')){
      App.getInfo().then(e=>{
        this.version = e.version;
      })
    }
  }

}
