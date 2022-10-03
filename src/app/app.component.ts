import { Component } from '@angular/core';
import { Network } from '@awesome-cordova-plugins/network/ngx';
import { Platform, NavController, MenuController, ToastController, LoadingController, AlertController } from '@ionic/angular';
import { UsuarioService } from './services/usuario/usuario.service';
import { Router } from '@angular/router';
import { NativeStorage } from '@awesome-cordova-plugins/native-storage/ngx';
import { NativePageTransitions, NativeTransitionOptions } from '@awesome-cordova-plugins/native-page-transitions/ngx';
import { StatusBar } from '@awesome-cordova-plugins/status-bar/ngx';
import { SplashScreen } from '@capacitor/splash-screen';
import { App } from '@capacitor/app';
import { SQLite, SQLiteObject } from '@awesome-cordova-plugins/sqlite/ngx';


@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent {
  loader;
  connectSubscription;
  usuario;
  db:SQLiteObject;
  pendientes = false;
  pagina = '';
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
    private sqlite: SQLite
  ) {
    this.initializeApp()
    let disconnectSubscription = this.network.onDisconnect().subscribe(() => {
      this.presentToast('Sin conexión ...')
      this.storage.setItem('conexion', 'no');
      localStorage.setItem('conexion','no')
      this._us.nextmessage('sin conexión') 
      this._us.cargar_storage().then(()=>{})
    });
    this.observadorConectado();
    this._us.cargar_storage().then(()=>{
      if(this._us.conexion == 'si'){
        this.storage.setItem('seleccionMapa', 'si');
        localStorage.setItem('seleccionMapa','si')
        this.buscarAlertasPendientes()
      }
    })
    this._us.message.subscribe(res=>{
      if(res == 'pendiente'){
        this.pendientes = true;
      }
      if(res == 'sin pendiente'){
        this.pendientes = false;
        this.cambiarPag('home')
      }
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
      this._us.cargar_storage().then(async ()=>{        
        if(this._us.conexion == 'no' || !this._us.conexion){
          console.log('RUTA-> ',this.router.url,this._us.seleccionMapa)
          if((String(this.router.url).includes('home_vialidad') || String(this.router.url).includes('modal-caminos')) && this._us.seleccionMapa == 'no'){
            this._us.nextmessage('conexión establecida') 
              const alert = await this.alertController.create({
                header: 'Conexión Establecida',
                message: 'Se reactivo el mapa para seleccionar punto de la emergencia, por tanto se limpio el formulario en la sección de datos del Activo ',
                buttons: ['OK'],
                mode:'ios'
              });
              await alert.present();
          }else{
            this.presentToast('Conexión establecida').then(()=>{
              setTimeout((()=>{
                this.buscarAlertasPendientes()
              }),4000)
            })
          }
        }
        this.storage.setItem('conexion', 'si');
        localStorage.setItem('conexion','si')
        this._us.cargar_storage().then(()=>{})
      })
    });
  }

  buscarAlertasPendientes(){
    if(this.platform.is('capacitor')){
      this.sqlite.create({name:'mydbAlertaTemprana',location:'default',createFromLocation:1}).then((db:SQLiteObject)=>{
        this.db = db;
        this.db.transaction(async tx=>{
          this._us.cargar_storage().then(()=>{
            var sql = (this._us.usuario.DEFSITE == 'VIALIDAD' || this._us.usuario.DEFSITE == 'DV') ? 'SELECT * FROM alertaVialidad' : 'SELECT * FROM alerta'
            this.db.executeSql(sql, []).then((data)=>{
              if(data.rows.length > 0){
                this.pendientes = true;
                this.presentToast('Hay '+data.rows.length +' alertas pendientes por enviar')
              }else{
                let options: NativeTransitionOptions ={
                  direction:'right',
                  duration:500
                }
                this.nativePageTransitions.fade(options);
                if(this._us.usuario.DEFSITE == 'VIALIDAD' || this._us.usuario.DEFSITE == 'DV'){
                  this.navCtrl.navigateRoot('/home_vialidad')
                }else{
                  this.navCtrl.navigateRoot('/home')
                }
                this.pagina = 'home'
              }
            })
          })

        })
      })
    }
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
          this.pagina = 'home'
        }
      }).catch(()=>{
        this._mc.enable(false,'first')
      })
      this.statusBar.overlaysWebView(false);
      this.statusBar.hide()
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
    this._mc.close();
    if(this.router.url != '/'+page){
      let options: NativeTransitionOptions ={
        direction:'right',
        duration:500
      }
      this.nativePageTransitions.flip(options);
      if(page == 'home'){
        this._us.cargar_storage().then(()=>{
          if(this._us.usuario.DEFSITE == 'VIALIDAD' || this._us.usuario.DEFSITE == 'DV'){
            console.log('aca?')
            this.navCtrl.navigateRoot('/home_vialidad')  
          }else{
            this.navCtrl.navigateRoot('/home')  
          }
        })
      }else{
        this.navCtrl.navigateRoot('/'+page)
      }
      this.pagina = page
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
                    direction:'right',
                    duration:500
                  }
                  this.nativePageTransitions.slide(options);
                  this._mc.close()
                  this._mc.enable(false)
                  this._us.cargar_storage()
                  this.navCtrl.navigateRoot('/login')
                  this.pagina = 'home'
                })
              },3000)
            }).catch(()=>{
              this._us.cerrarSesion().then(()=>{
                let options: NativeTransitionOptions ={
                  direction:'right',
                  duration:500
                }
                this.nativePageTransitions.slide(options);
                this._mc.close()
                this._mc.enable(false)
                this._us.cargar_storage()
                this.navCtrl.navigateRoot('/login')
                this.pagina = 'home'
              })
            })
           
          }
        }
      ]
    });
    await alert.present();
  }

  registerBackButton() {
    this.platform.backButton.subscribe(() => {
      this._mc.toggle()
    });
  }

  cerrarMenu(){
    this._mc.close();
  }

}
