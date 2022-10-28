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
import { Directory, Filesystem } from '@capacitor/filesystem';
import { VialidadService } from './services/vialidad/vialidad.service';

const SAVE_IMAGE_DIR = 'save-stored-images';

interface LocalFile {
  name:string;
  path:string;
  data:string;
}

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
  images = [];
  alertas = [];
  porenviar = [];
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
    private sqlite: SQLite,
    public _vs:VialidadService
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
      }
      this.buscarAlertasPendientes()
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
          if((String(this.router.url).includes('home_vialidad') || String(this.router.url).includes('modal-caminos')) && this._us.seleccionMapa == 'no'){
            this._us.nextmessage('conexión establecida sin mapa') 
              const alert = await this.alertController.create({
                header: 'Conexión Establecida',
                message: 'Se reactivo el mapa para seleccionar punto de la emergencia, por tanto se limpio el formulario en la sección de datos del Activo ',
                buttons: ['OK'],
                mode:'ios'
              });
              await alert.present();
              setTimeout((()=>{
                this.buscarAlertasPendientes()
              }),4000);
          }else{
            this._us.nextmessage('conexión establecida') 
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
              console.log('PENDIENTES-> ',data.rows.length)
              if(data.rows.length > 0){
                this.alertas = [];
                this.porenviar = [];
                for(let i = 0;i<data.rows.length;i++){
                  if(data.rows.item(i).error == 'internet'){
                    this.alertas.push(data.rows.item(i))
                  }else{
                    this.porenviar.push(data.rows.item(i))
                  }
                }
                if(this.alertas.length > 0){
                  this.loadFiles()
                }else{
                  if(this.porenviar.length > 0){
                    this.presentToast('Hay '+this.porenviar.length +' emergencias pendientes por enviar')
                  }
                }
                if(this.porenviar.length > 0){
                  this.pendientes = true;
                }else{
                  this.pendientes = false;
                }
              }else{
                this.pendientes = false;
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

  async loadFiles(){
    this.images = [];
      Filesystem.readdir({
        directory:Directory.Data,
        path:SAVE_IMAGE_DIR
      }).then(res=>{
        if(res.files.length == 0){
          this._us.nextmessage('sin pendiente')        
        }
        this.loadFileData(res.files)
      })
    
  }

  async loadFileData(fileNames:string[]){
    for (let f of fileNames){
      const filePath = SAVE_IMAGE_DIR+'/'+f;
      const readFile = await Filesystem.readFile({
        directory:Directory.Data,
        path:filePath
      });
      this.images.push({
        name:f,
        path:filePath,
        data:readFile.data
      })
    }
    this.images.forEach(i=>{
      this.alertas.forEach(a=>{
        if('save_'+a.id+'_foto.jpg' == i.name){
          a.foto = i;
        }
      })
    })
    if(this.alertas.length > 0){
      // ENVIAR
      this.enviar(this.alertas[0],this.alertas[0].id,0,0,0)
    }
  }

  eliminar(id,i){
      this._us.cargar_storage().then(()=>{
        if(this._us.usuario.DEFSITE != 'DV' && this._us.usuario.DEFSITE != 'VIALIDAD'){
          this.db.executeSql('DELETE FROM alerta WHERE id = '+id, []).then((data)=>{
            if(data.rowsAffected > 0){
              this.deleteImage(this.alertas[i].name)
            }else{
              this.presentToast('No se pudo eliminar la emergencia');
            }
          })
        }else{
          this.db.executeSql('DELETE FROM alertaVialidad WHERE id = '+id, []).then((data)=>{
            if(data.rowsAffected > 0){
              this.deleteImage(this.alertas[i].foto)
            }else{
              this.presentToast('No se pudo eliminar la emergencia');
            }
          })
        }
      })
  }

  enviar(data,id,i,posicion,enviadas){
    data.picture = data.foto.data;
    this._vs.enviarAlerta(data).subscribe((res:any)=>{
      if(res && res.status == '200'){
        this.eliminar(id,i)
        if((posicion + 1) >= this.alertas.length){
          this.alertas = [];
          enviadas++;
          this.presentToast('Se han enviado '+enviadas+' emergencias que estaban pendientes')
          setTimeout(()=>{
            if(this.porenviar.length > 0){
              this.pendientes = true;
              this.presentToast('Hay '+this.porenviar.length +' emergencias pendientes por enviar')
            }
          },4000)
        }else{
          posicion++;
          enviadas++;
          this.enviar(this.alertas[posicion],this.alertas[posicion].id,posicion,posicion,enviadas)
        } 
      }else{
        console.log('******************** ERROR ENVIAR ******************** ')
        this.porenviar.push(data)
        if((posicion + 1) >= this.alertas.length){
          this.alertas = [];
          enviadas++;
          this.presentToast('Se han enviado '+enviadas+' emergencias que estaban pendientes')
          setTimeout(()=>{
            if(this.porenviar.length > 0){
              this.pendientes = true;
              this.presentToast('Hay '+this.porenviar.length +' emergencias pendientes por enviar')
            }
          },4000)
        }else{
          posicion++;
          enviadas++;
          this.enviar(this.alertas[posicion],this.alertas[posicion].id,posicion,posicion,enviadas)
        } 
      }
    },err=>{
      console.log('******************** ERROR ENVIAR ******************** ',err)
      this.porenviar.push(data)
      if((posicion + 1) >= this.alertas.length){
        this.alertas = [];
        enviadas++;
        this.presentToast('Se han enviado '+enviadas+' emergencias que estaban pendientes')
        setTimeout(()=>{
          if(this.porenviar.length > 0){
            this.pendientes = true;
            this.presentToast('Hay '+this.porenviar.length +' emergencias pendientes por enviar')
          }
        },4000)
      }else{
        posicion++;
        enviadas++;
        this.enviar(this.alertas[posicion],this.alertas[posicion].id,posicion,posicion,enviadas)
      } 
    })
  }

  async deleteImage(file:LocalFile){
    console.log(file.path)
    await Filesystem.deleteFile({
      directory:Directory.Data,
      path:file.path
    });
    // this.loadFiles()
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
      cssClass: 'toast-custom-class',
      duration: 4000,
      buttons: [
        {
          icon: 'close',
          role: 'cancel',
        }
      ],
      mode:'ios'
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
                  this.pagina = 'home';
                  this.pendientes = false;
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
                this.pagina = 'home';
                this.pendientes = false;
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
      // this._mc.toggle()
      // this.navCtrl.pop();
    });
  }

  cerrarMenu(){
    this._mc.close();
  }

}
