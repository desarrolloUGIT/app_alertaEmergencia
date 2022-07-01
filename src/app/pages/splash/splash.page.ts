import { Component, OnInit } from '@angular/core';
import { NavController, AlertController, Platform, MenuController } from '@ionic/angular';
import { NativePageTransitions, NativeTransitionOptions } from '@awesome-cordova-plugins/native-page-transitions/ngx';
import { UsuarioService } from '../../services/usuario.service';

@Component({
  selector: 'app-splash',
  templateUrl: './splash.page.html',
  styleUrls: ['./splash.page.scss'],
})
export class SplashPage implements OnInit {

  constructor(public navctrl:NavController, public _us:UsuarioService,public platform:Platform,
    private nativePageTransitions: NativePageTransitions,public alertctrl:AlertController,public _mc:MenuController) { }

  ngOnInit() {
    this._mc.enable(false,'first')
  }

  async salir() {
    const alert = await this.alertctrl.create({
      header: 'Sesión caducada!',
      message: 'Tú sesión ha caducado, favor iniciar nuevamente',
      buttons: ['OK'],
      mode:'ios'
    });
    await alert.present();
  }

  async actualizacion() {
    const alert = await this.alertctrl.create({
      header: 'Actualización',
      message: 'La app se ha actualizado, favor vuelve a iniciar sesión',
      buttons: ['OK'],
      mode:'ios'
    });
    await alert.present();
  }

  ngAfterViewInit(){    
    setTimeout(()=>{ 
      if(this.platform.is("capacitor")){
        let options: NativeTransitionOptions ={
          direction:'left',
          duration:200
        }
        this.nativePageTransitions.fade(options);
      }
      this._us.cargar_storage().then(()=>{
        if(this._us.usuario){
          this._mc.enable(false,'first')
          this._mc.enable(true,'first')
          this.navctrl.navigateRoot('/home')
        }else{
          this._mc.enable(false,'first')
          this.navctrl.navigateRoot('/login')
        }
      }).catch(()=>{
        this._mc.enable(false,'first')
        this.navctrl.navigateRoot('/login')
      })
     }, 7000);
  }

}
