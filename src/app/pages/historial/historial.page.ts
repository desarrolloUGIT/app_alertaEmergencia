import { Component, OnInit } from '@angular/core';
import { SQLite, SQLiteObject } from '@awesome-cordova-plugins/sqlite/ngx';
import { AlertController, LoadingController, MenuController, Platform, ModalController, ToastController } from '@ionic/angular';
import { UsuarioService } from '../../services/usuario/usuario.service';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { NativePageTransitions, NativeTransitionOptions } from '@awesome-cordova-plugins/native-page-transitions/ngx';
import { VialidadService } from 'src/app/services/vialidad/vialidad.service';
import { ModalEnviarPage } from '../modal-enviar/modal-enviar.page';

const IMAGE_DIR = 'stored-images';
const SAVE_IMAGE_DIR = 'save-stored-images';


interface LocalFile {
  name:string;
  path:string;
  data:string;
}

@Component({
  selector: 'app-historial',
  templateUrl: './historial.page.html',
  styleUrls: ['./historial.page.scss'],
})
export class HistorialPage implements OnInit {
alertas = [];
images = [];
loader;
mostrar = false;
db:SQLiteObject;
tipo = 'novialidad';
estadoEnvioAlerta = null;
toast;
iconEnviando = false;

  constructor(private sqlite: SQLite,
    public toastController:ToastController,public loadctrl:LoadingController,public alertController:AlertController,public _modalCtrl:ModalController,
    public platform:Platform,private nativePageTransitions: NativePageTransitions,public _us:UsuarioService,public _vs:VialidadService) { 
      this._us.message.subscribe(res=>{
        if(res == 'enviando'){
          this.iconEnviando = true;
        }
        if(res == 'termino de enviar'){
          this.iconEnviando = false;
        }
      })
      if(this.platform.is('capacitor')){
        this.presentLoader('Cargando historial ...').then(()=>{
          this.sqlite.create({name:'mydbAlertaTemprana',location:'default',createFromLocation:1}).then((db:SQLiteObject)=>{
            this.db = db;
            this._us.cargar_storage().then(()=>{
                db.executeSql('SELECT * FROM historial', []).then((data)=>{
                  if(data.rows.length > 0){
                    for(let i = 0;i<data.rows.length;i++){
                      this.alertas.push(data.rows.item(i))
                    }
                  }
                  this.alertas.reverse()
                  this.loader.dismiss()
                  this.mostrar = true;
                })
            })
           
          })
        })
       
      }else{
        this.presentLoader('Cargando historial ...').then(()=>{
        this.loader.dismiss()  
        this.mostrar = true;
      })
      }
    }

  ngOnInit() {
  }

  async presentLoader(msg) {
    this.loader = await this.loadctrl.create({message: msg,mode:'ios'});
    await this.loader.present();
  }

  async borrarHistorial(){
    const alert = await this.alertController.create({
      header: 'Borrar Historial',
      message: '¿Estas segur@ de eliminar el historial almacenado?',
      mode:'ios',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
          cssClass: 'secondary',
          handler: (blah) => {
          }
        }, {
          text: 'Si, borrar',
          id: 'confirm-button',
          handler: () => {
            this.presentLoader('Borrando historial ...').then(()=>{
              this.db.open().then(()=>{
                this.db.transaction(rx=>{
                  rx.executeSql('delete from historial', [], ()=>{ 
                    this.loader.dismiss()  
                    this.presentToast('El historial ha sido eliminado con exito')
                    this.alertas = []
                    this.mostrar = false;
                  },err=>{
                    this.loader.dismiss()  
                    this.presentToast('No se pudo eliminar el historial')
                  })
                })
              })
            })
          }
        }
      ]
    });
    await alert.present();
  }


  async presentToast(message,duration?,cerrar?) {
    this.toast = await this.toastController.create({
      message: message,
      cssClass: 'toast-custom-class',
      mode:'ios',
      duration: !cerrar ?(duration ? duration : 4000) : false,
      buttons: !cerrar ? [
        {
          icon: 'close',
          role: 'cancel',
        }
      ] : null
    });
    await this.toast.present();
  }

}
    