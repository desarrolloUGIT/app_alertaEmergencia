import { Component } from '@angular/core';
import { Network } from '@awesome-cordova-plugins/network/ngx';
import { Platform, NavController, MenuController, ToastController, LoadingController, AlertController } from '@ionic/angular';
import { UsuarioService } from './services/usuario.service';
import { Router } from '@angular/router';
import { NativeStorage } from '@awesome-cordova-plugins/native-storage/ngx';
import { NativePageTransitions, NativeTransitionOptions } from '@awesome-cordova-plugins/native-page-transitions/ngx';
// import { SplashScreen } from '@awesome-cordova-plugins/splash-screen/ngx';
import { StatusBar } from '@awesome-cordova-plugins/status-bar/ngx';
import { SplashScreen } from '@capacitor/splash-screen';


@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent {
  loader;
  connectSubscription;
  usuario;
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
    // private splashScreen: SplashScreen,
    private statusBar: StatusBar,
  ) {
    this.initializeApp()
    let disconnectSubscription = this.network.onDisconnect().subscribe(() => {
      console.log('aca desconectado')

      this.presentToast('Sin conexión ...')
      this.storage.setItem('conexion', 'no');
      localStorage.setItem('conexion','no')
      this._us.cargar_storage().then(()=>{})
    });
    this.observadorConectado()
    this._us.message.subscribe(res=>{
      this._us.cargar_storage().then(()=>{
        if(this._us.usuario){
          this._mc.enable(true,'first')
          this.usuario = this._us.usuario
        }
      }).catch(()=>{
        this._mc.enable(false,'first')
      })
    })
  }

  observadorConectado(){
    this.connectSubscription = this.network.onConnect().subscribe(() => {
      console.log('aca conectado')
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

  async splash(){
    await SplashScreen.show({
      showDuration: 5000,
      autoHide: true
    });
  }
  initializeApp() {
    this.platform.ready().then(() => {
      this.splash()
      this._mc.enable(false,'first')
      this._us.cargar_storage().then(()=>{
        if(this._us.usuario){
          this._mc.enable(true,'first')
          this.usuario = this._us.usuario
        }
      }).catch(()=>{
        this._mc.enable(false,'first')
      })
      this.statusBar.overlaysWebView(false);
      // this.statusBar.backgroundColorByHexString('#000000');
      this.statusBar.hide()

      // this.splashScreen.hide();
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

  async presentLoader(msg) {
    this.loader = await this.loadctrl.create({message: msg,mode:'ios',duration:3000});
    await this.loader.present();
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

  async cerrarSesion(){
    const alert = await this.alertController.create({
      header: 'Cerrar Sesión',
      message: '¿Estas segur@ de cerrar sesión?',
      mode:'ios',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
          cssClass: 'secondary',
          handler: (blah) => {
          }
        }, {
          text: 'Si, cerrar',
          id: 'confirm-button',
          handler: () => {
            this.presentLoader('Cerrando sesión').then(()=>{
              setTimeout(()=>{
                this._us.cerrarSesion().then(()=>{
                  let options: NativeTransitionOptions ={
                    direction:'left',
                    duration:500
                  }
                  // this.loader.dismiss()
                  this.nativePageTransitions.flip(options);
                  this._mc.toggle()
                  this._mc.enable(false)
                  this.navCtrl.navigateRoot('/login')
                })
              },3000)
            }).catch(()=>{
              this._us.cerrarSesion().then(()=>{
                let options: NativeTransitionOptions ={
                  direction:'left',
                  duration:500
                }
                this.nativePageTransitions.flip(options);
                this._mc.toggle()
                this._mc.enable(false)
                this.navCtrl.navigateRoot('/login')
              })
            })
           
          }
        }
      ]
    });
    await alert.present();
    
   
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
