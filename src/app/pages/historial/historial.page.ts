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

  constructor(private sqlite: SQLite,
    public toastController:ToastController,public loadctrl:LoadingController,public alertController:AlertController,public _modalCtrl:ModalController,
    public platform:Platform,private nativePageTransitions: NativePageTransitions,public _us:UsuarioService,public _vs:VialidadService) { 
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
                  // console.log(this.alertas)
                  this.loader.dismiss()
                  this.mostrar = true;
                })
            })
           
          })
        })
       
      }else{
        this.presentLoader('Cargando historial ...').then(()=>{
        // this.alertas = [{"id":1,"usuario":"mauricio.donoso","destino":"APR","operatividad":"RESTRICCIÓN","titulo":"Titulo de la alerta","nivelalerta":"Moderado","descripcion":"Esta es la descripción de la alerta","lat":-33.293582,"date":"2022-07-15T14:19:55.830Z","location":"SSR001492","region":"13","lng":-70.69901,"name":"Thu Jul 14 2022 09:17:21 GMT-0400 (hora estándar de Chile)","error":"vialidad"}]
        // this.alertas = [{"id":1,"usuario":"maximo.emrdv","nivelalerta":"Muy Grave","elemento":"Elementos de Saneamiento","titulo":"Prueba historial","competencia":"Si","km_f":"84.754","descripcion":"descripción de prueba ","km_i":"68.5","lat":-33.036,"codigo":"65A10602","date":"Tue Aug 02 2022 10:58:46 GMT-0400 (-04)","region":"05","transito":"Con Restricción","lng":-71.655293,"fechaEmergencia":"2022-08-16T10:58:00-04:00","restriccion":"Sólo Vehículos Livianos","name":"Cruce Ruta 68 (Placilla) - Camino La Pólvora - Valparaíso (Puerto)","error":"vialidad"}]
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

}
    