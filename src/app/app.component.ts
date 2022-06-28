import { Component } from '@angular/core';
import { Network } from '@awesome-cordova-plugins/network/ngx';
import { Platform, NavController, MenuController, ToastController, LoadingController, AlertController } from '@ionic/angular';
import { UsuarioService } from './services/usuario.service';
import { Router } from '@angular/router';
import { NativeStorage } from '@awesome-cordova-plugins/native-storage/ngx';
import { NativePageTransitions, NativeTransitionOptions } from '@awesome-cordova-plugins/native-page-transitions/ngx';
import { SplashScreen } from '@awesome-cordova-plugins/splash-screen/ngx';
import { StatusBar } from '@awesome-cordova-plugins/status-bar/ngx';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent {
  loader;
  connectSubscription;
  constructor(
    public network: Network,
    private platform: Platform,
    public _mc:MenuController,
    private nativePageTransitions: NativePageTransitions,
    public navCtrl:NavController,public router:Router,
    public _us:UsuarioService,
    public toastController: ToastController,
    public storage: NativeStorage,
    public loadctrl: LoadingController,
    public alertController: AlertController,
    private splashScreen: SplashScreen,
    private statusBar: StatusBar,
  ) {
    let disconnectSubscription = this.network.onDisconnect().subscribe(() => {
      // console.log('network was disconnected :-(');
      this.presentToast('Sin conexión ...')
      this.storage.setItem('conexion', 'no');
      localStorage.setItem('conexion','no')
      this._us.cargar_storage().then(()=>{})
      
    });
    this.observadorConectado()
  }

  observadorConectado(){
    this.connectSubscription = this.network.onConnect().subscribe(() => {
      this._us.cargar_storage().then(()=>{        
        if(this._us.conexion == 'no' || !this._us.conexion){
          this.presentToast('Conexión establecida')
        }
        this.storage.setItem('conexion', 'si');
        localStorage.setItem('conexion','si')
        this.navCtrl.pop().then(()=>{
          this.navCtrl.navigateRoot('/home')
        }).catch(()=>{
          this.navCtrl.navigateRoot('/home')
        })
        this._us.cargar_storage().then(()=>{})
      })
    });
  }

  initializeApp() {
    this.platform.ready().then(() => {
      this.statusBar.styleDefault();
      this.splashScreen.hide();
      this.registerBackButton()
    });
  }

  async presentToast(message) {
    const toast = await this.toastController.create({
      message: message,
      duration: 4000
    });
    toast.present();
  }

  cambiarPag(page:string){
    this._mc.toggle();
    if(this.router.url != '/'+page){
      let options: NativeTransitionOptions ={
        direction:'right',
        duration:500
      }
      this.nativePageTransitions.flip(options);
      this.navCtrl.navigateRoot('/'+page)
    }
  }

  cerrarSesion(){
    // this._us.cerrarSesion().then(()=>{
    //   let options: NativeTransitionOptions ={
    //     direction:'left',
    //     duration:500
    //   }
    //   this.nativePageTransitions.flip(options);
    //   this._mc.toggle()
    //   this._mc.enable(false)
    //   this.navCtrl.navigateRoot('/login')
    // })
  }

  registerBackButton() {
    // this.platform.backButton.subscribe(() => {
    //   console.log(this.router.url)
    //   if(String(this.router.url).includes('parametros')){
    //     this.navCtrl.pop()
    //   }else{
    //     if(this.router.url != '/home' && this.router.url != '/login' && this.router.url != '/splash'){
    //       this.navCtrl.navigateRoot('/home')   
    //     }else{
    //       if(this.router.url == '/home'){
    //         this.appMinimize.minimize();
    //       }
    //     }
    //   }  
    // });
  }

  cerrarMenu(){
    this._mc.close();
  }

}
