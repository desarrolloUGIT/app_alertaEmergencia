import { Component, OnInit } from '@angular/core';
import { SQLite, SQLiteObject } from '@awesome-cordova-plugins/sqlite/ngx';
import { AlertController, LoadingController, MenuController, Platform, ModalController, ToastController } from '@ionic/angular';
import { UsuarioService } from '../../services/usuario/usuario.service';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { NativePageTransitions, NativeTransitionOptions } from '@awesome-cordova-plugins/native-page-transitions/ngx';

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
tipo = 'novialidad'
  constructor(private sqlite: SQLite,
    public toastController:ToastController,public loadctrl:LoadingController,public alertController:AlertController,public platform:Platform,private nativePageTransitions: NativePageTransitions,public _us:UsuarioService) { 
      if(this.platform.is('capacitor')){
        this.sqlite.create({name:'mydbAlertaTemprana',location:'default',createFromLocation:1}).then((db:SQLiteObject)=>{
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
                console.log(data)
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
        this.alertas = [{"id":1,"usuario":"maximo.emrdv","nivelalerta":"Muy Grave","elemento":"Elementos de Saneamiento","titulo":"jbivksn isno s","competencia":"Si","km_f":"84.754","descripcion":"ñsjs. jxbdi ceyv js hce lc eunidbud. ke uce lceblc ei. dl cie cei celg elg el cel cel ","km_i":"68.5","lat":-33.036,"codigo":"65A10602","date":"Tue Aug 02 2022 10:58:46 GMT-0400 (-04)","region":"05","transito":"Con Restricción","lng":-71.655293,"fechaEmergencia":"2022-08-16T10:58:00-04:00","restriccion":"Sólo Vehículos Livianos","name":"Cruce Ruta 68 (Placilla) - Camino La Pólvora - Valparaíso (Puerto)"}]
        this.loadFiles()
      }
    }

  ngOnInit() {
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
          this._us.nextmessage('sin pendiente')        
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
        data:'data:image/jpeg;base64,'+readFile.data
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

  async presentToast(message) {
    const toast = await this.toastController.create({
      message: message,
      duration: 4000
    });
    toast.present();
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
            this.presentLoader('Eliminando ...').then(()=>{
              this.mostrar = false;
              this._us.cargar_storage().then(()=>{
                if(this._us.usuario.DEFSITE != 'DV' && this._us.usuario.DEFSITE != 'VIALIDAD'){
                  this.db.executeSql('DELETE FROM alerta WHERE id = '+id, []).then((data)=>{
                    if(data.rowsAffected > 0){
                      this.deleteImage(this.alertas[i].name).then(()=>{
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
        }
      ]
    });
    await alert.present();
  }

  enviar(data){
    
  }
}
    