import { Component, OnInit } from '@angular/core';
import { SQLite, SQLiteObject } from '@awesome-cordova-plugins/sqlite/ngx';
import { AlertController, LoadingController, MenuController, Platform, ModalController, ToastController } from '@ionic/angular';
import { UsuarioService } from '../../services/usuario/usuario.service';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { NativePageTransitions, NativeTransitionOptions } from '@awesome-cordova-plugins/native-page-transitions/ngx';
import { VialidadService } from 'src/app/services/vialidad/vialidad.service';
import { ModalEnviarPage } from '../modal-enviar/modal-enviar.page';
import { DireccionService } from '../../services/direccion/direccion.service';
import { Clipboard } from '@ionic-native/clipboard/ngx';

const IMAGE_DIR = 'stored-images';
const SAVE_IMAGE_DIR = 'save-stored-images';


interface LocalFile {
  name:string;
  path:string;
  data:string;
}

@Component({
  selector: 'app-pendientes',
  templateUrl: './pendientes.page.html',
  styleUrls: ['./pendientes.page.scss'],
})
export class PendientesPage implements OnInit {
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
    public toastController:ToastController,public loadctrl:LoadingController,public alertController:AlertController,public _modalCtrl:ModalController,private clipboard: Clipboard,
    public platform:Platform,private nativePageTransitions: NativePageTransitions,public _us:UsuarioService,public _vs:VialidadService, public _ds:DireccionService) { 
       this._us.message.subscribe(res=>{
        if(res == 'enviando'){
          this.iconEnviando = true;
        }
        if(res == 'termino de enviar'){
          this.iconEnviando = false;
        }
      })
      if(this.platform.is('capacitor')){
        this.sqlite.create({name:'mydbAlertaTempranaPROD',location:'default'}).then((db:SQLiteObject)=>{
          this.db = db;
          this._us.cargar_storage().then(()=>{
            if(this._us.usuario.DEFSITE != 'DV' && this._us.usuario.DEFSITE != 'VIALIDAD'){
              db.executeSql('SELECT * FROM alerta', []).then((data)=>{
                if(data.rows.length > 0){
                  for(let i = 0;i<data.rows.length;i++){
                    this.alertas.push(data.rows.item(i))
                  }
                  this.loadFiles()
                }else{
                  this._us.nextmessage('sin pendiente') 
                }
              })
            }else{
              this.tipo = 'vialidad';
              db.executeSql('SELECT * FROM alertaVialidad', []).then((data)=>{
                // console.log('PENDIENTES ??? ->>>>>>>> ',data.rows.length)
                if(data.rows.length > 0){
                  for(let i = 0;i<data.rows.length;i++){
                    this.alertas.push(data.rows.item(i))
                  }
                  this.loadFiles()
                }else{
                  this._us.nextmessage('sin pendiente') 
                }
              })
            }
          })
         
        })
      }else{
        // this.alertas = [{"id":1,"usuario":"mauricio.donoso","destino":"APR","operatividad":"RESTRICCIÓN","titulo":"Titulo de la alerta","nivelalerta":"Moderado","descripcion":"Esta es la descripción de la alerta","lat":-33.293582,"date":"2022-07-15T14:19:55.830Z","location":"SSR001492","region":"13","lng":-70.69901,"name":"Thu Jul 14 2022 09:17:21 GMT-0400 (hora estándar de Chile)"}]
        // this.alertas = [{"id":1,"usuario":"maximo.emrdv","nivelalerta":"Muy Grave","elemento":"Elementos de Saneamiento","titulo":"jbivksn isno s","competencia":"Si","km_f":"84.754","descripcion":"ñsjs. jxbdi ceyv js hce lc eunidbud. ke uce lceblc ei. dl cie cei celg elg el cel cel ","km_i":"68.5","lat":-33.036,"codigo":"65A10602","date":"Tue Aug 02 2022 10:58:46 GMT-0400 (-04)","region":"05","transito":"Con Restricción","lng":-71.655293,"fechaEmergencia":"2022-08-16T10:58:00-04:00","restriccion":"Sólo Vehículos Livianos","name":"Cruce Ruta 68 (Placilla) - Camino La Pólvora - Valparaíso (Puerto)"}]
        this.loadFiles()
      }
    }

  ngOnInit() {
  }

  copyString(data){
    if(this.tipo == 'vialidad'){
      this.clipboard.copy(this._vs.recuperarXML(data));
      this.presentToast('Ahora se puede pegar en un correo o por el medio preferido para informar del problema.',null,null,'Se ha copiado en el portapapeles el XML del servicio')
    }else{
      this.clipboard.copy(this._ds.recuperarXML(data));
      this.presentToast('Se ha copiado en el portapapeles el XML del servicio')
    }
  }

  async presentLoader(msg) {
    this.loader = await this.loadctrl.create({message: msg,mode:'ios'});
    await this.loader.present();
  }

  async loadFiles(){
    this.images = [];
    this.presentLoader('Cargando imagenes ...').then(()=>{
      Filesystem.readdir({
        directory:Directory.Data,
        path:SAVE_IMAGE_DIR
      }).then(res=>{
        if(res.files.length == 0){
          // this._us.nextmessage('sin pendiente')        
        }
        this.loadFileData(res.files)
        this.loader.dismiss()
      }).catch(()=>{
        this.loader.dismiss()
        if(this.alertas.length <= 0){
          this._us.nextmessage('sin pendiente')        
        }
      })
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
        if('save_'+(a.date)+'_foto.jpg' == i.name){
          a.foto = i;
        }
      })
    })
    if(this.alertas.length > 0){
      // console.log(JSON.stringify(this.alertas))
      this.mostrar = true;
    }else{
      this._us.nextmessage('sin pendiente')        
    }
  }

  async deleteImage(file:LocalFile){
    await Filesystem.deleteFile({
      directory:Directory.Data,
      path:file.path
    });
    // this.loadFiles()
  }

  async presentToast(message,duration?,cerrar?,header?) {
    this.toast = await this.toastController.create({
      header:header ? header : null,
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

  eliminar(id,i){
    this.presentLoader('Eliminando ...').then(()=>{
      this.mostrar = false;
      this._us.cargar_storage().then(()=>{
        if(this._us.usuario.DEFSITE != 'DV' && this._us.usuario.DEFSITE != 'VIALIDAD'){
          this.db.executeSql('DELETE FROM alerta WHERE id = '+id, []).then((data)=>{
            if(data.rowsAffected > 0){
              this.deleteImage(this.alertas[i].foto).then(()=>{
                this.alertas.splice(i,1)
                this.loader.dismiss()
                if(this.alertas.length <= 0){
                  this.mostrar = false;
                  this._us.nextmessage('sin pendiente')        
                }else{
                  this.mostrar = true;
                }
              }).catch((err)=>{
                this.alertas.splice(i,1)
                this.loader.dismiss()
                if(this.alertas.length <= 0){
                  this.mostrar = false;
                  this._us.nextmessage('sin pendiente')        
                }else{
                  this.mostrar = true;
                }
              })
            }else{
              this.loader.dismiss()
              this.presentToast('No se pudo eliminar la alerta');
            }
          })
        }else{
          this.db.executeSql('DELETE FROM alertaVialidad WHERE id = '+id, []).then((data)=>{
            if(data.rowsAffected > 0){
              this.deleteImage(this.alertas[i].foto).then((a)=>{
                console.log('ELIMINADO A-> ',a)
                this.alertas.splice(i,1)
                this.loader.dismiss()
                if(this.alertas.length <= 0){
                  this.mostrar = false;
                  this._us.nextmessage('sin pendiente')        
                }else{
                  this.mostrar = true;
                }
              }).catch(err=>{
                console.log('ERROR-> ',err)
                this.mostrar = true;
                this.loader.dismiss()
                this.presentToast('No se pudo eliminar la alerta');
              })
            }else{
              this.loader.dismiss()
              this.presentToast('No se pudo eliminar la alerta');
            }
          })
        }
      })

    })
  }

  async eliminarAlerta(id,i){
    const alert = await this.alertController.create({
      header: 'Borrar alerta',
      message: '¿Estas segur@ de eliminar esta alerta?, esta acción no se puede revertir y la información almacenada de esta alerta será borrara por completo.',
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
           this.eliminar(id,i)
          }
        }
      ]
    });
    await alert.present();
  }

  enviar(data,id,i){
    if(this.tipo == 'vialidad'){
      data.picture = (data.foto && data.foto.data) ? data.foto.data : '';
      this.presentLoader('Enviando Emergencia ...').then(()=>{
        if(this._us.conexion == 'no'){
          this.loader.dismiss()
          this.estadoEnvioAlerta = 'pendiente'
          this.openModalEnvio(this.estadoEnvioAlerta)
          this.presentToast('La emergencia no pudo ser enviada, favor interlo nuevamente',null,true);
        }else{
          this._vs.enviarAlerta(data).subscribe((res:any)=>{
            console.log('**************** RESPUESTA AL ENVIAR FORMULARIO **************', res)
            this.loader.dismiss()
            if(res && res.status == '200'){
             this.estadoEnvioAlerta = 'exitoso'
             this.eliminar(id,i)
             this.openModalEnvio(this.estadoEnvioAlerta)
             this.presentToast('La emergencia fue enviada exitosamente',null,true);
            }else{
              this.estadoEnvioAlerta = 'fallido'
              this.openModalEnvio(this.estadoEnvioAlerta)
              this.presentToast('La emergencia no pudo ser enviada, favor interlo nuevamente',null,true);
              console.log('******************** ERROR ENVIAR ******************** ')
            }
          },err=>{
            this.loader.dismiss()
            this.estadoEnvioAlerta = 'fallido'
            this.openModalEnvio(this.estadoEnvioAlerta)
            this.presentToast('La emergencia no pudo ser enviada, favor interlo nuevamente',null,true);
            console.log('******************** ERROR ENVIAR ******************** ',err)
          })
        }
      })
    }else{
      data.picture = (data.foto && data.foto.data) ? data.foto.data : '';
      this.presentLoader('Enviando Emergencia ...').then(()=>{
        if(this._us.conexion == 'no'){
          this.loader.dismiss()
          this.estadoEnvioAlerta = 'pendiente'
          this.openModalEnvio(this.estadoEnvioAlerta)
          this.presentToast('La emergencia no pudo ser enviada, favor interlo nuevamente',null,true);
        }else{
          this._ds.enviar(data).subscribe((res:any)=>{
            console.log('**************** RESPUESTA AL ENVIAR FORMULARIO **************', res)
            this.loader.dismiss()
            if(res && res.status == '200'){
             this.estadoEnvioAlerta = 'exitoso'
             this.eliminar(id,i)
             this.openModalEnvio(this.estadoEnvioAlerta)
             this.presentToast('La emergencia fue enviada exitosamente',null,true);
            }else{
              this.estadoEnvioAlerta = 'fallido'
              this.openModalEnvio(this.estadoEnvioAlerta)
              this.presentToast('La emergencia no pudo ser enviada, favor interlo nuevamente',null,true);
              console.log('******************** ERROR ENVIAR ******************** ')
            }
          },err=>{
            this.loader.dismiss()
            this.estadoEnvioAlerta = 'fallido'
            this.openModalEnvio(this.estadoEnvioAlerta)
            this.presentToast('La emergencia no pudo ser enviada, favor interlo nuevamente',null,true);
            console.log('******************** ERROR ENVIAR ******************** ',err)
          })
        }
      })
    }
  }

  async openModalEnvio(estado) {
    const modal = await this._modalCtrl.create({
      component: ModalEnviarPage,
      showBackdrop:true,
      mode:'ios',
      swipeToClose:false,
      cssClass: 'my-custom-class',
      backdropDismiss:false,
      componentProps:{
        estadoEnvioAlerta:estado,
      }
    });
    modal.present();
    const { data } = await modal.onWillDismiss();
    this.toast.dismiss()

  }
}
    