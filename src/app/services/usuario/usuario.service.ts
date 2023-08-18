import { Injectable } from '@angular/core';
import { Http, HttpOptions } from '@capacitor-community/http';
import { from } from 'rxjs';
import * as xml2js from 'xml2js';
import { NativeStorage } from '@awesome-cordova-plugins/native-storage/ngx';
import { Platform, ToastController } from '@ionic/angular';
import { Network } from '@awesome-cordova-plugins/network/ngx';
import { BehaviorSubject } from 'rxjs';
import { SQLite, SQLiteObject } from '@awesome-cordova-plugins/sqlite/ngx';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { URL_SERVICIOS } from 'src/app/config/url';
const IMAGE_DIR = 'stored-images';
const SAVE_IMAGE_DIR = 'save-stored-images';

interface LocalFile {
  name:string;
  path:string;
  data:string;
}
@Injectable({
  providedIn: 'root'
})
export class UsuarioService {
  usuario = {
    DEFSITE:'',
    GROUPUSER:'',
    LOGINID:'',
    PERSON:{
      CARGOCOMP:'',
      DFLTAPP:'',
      DISPLAYNAME:'',
      DPTOUNI:'',
      INSTITUCION:'',
      PERSONID:'',
      PROFESION:'',
      STATEPROVINCE:'',
      TIPOBOD:null
    },
    STATUS:'',
    USERID:''
   }
  conexion;
  token_user;
  user;
  fechaActualizacion;
  tokenESRI;
  menuType;
  messages: "";
  message: BehaviorSubject<String>;
  headers = {
    'Authorization': '',
    'Accept': "text/plain",
    'Content-Type': "text/plain",
  };
  horas = ['08:00','12:00','16:00','20:00']
  puntero = 0;
  images = [];
  seleccionMapa = 'si';
  coordenadasRegion = [
    {
      region:'01',
      lat:-18.4746,
      lng:-70.29792
    },
    {
      region:'02',
      lat:-23.65236,
      lng:-70.3954
    },
    {
      region:'03',
      lat:-27.36679,
      lng:-70.3314
    },
    {
      region:'04',
      lat:-29.90453,
      lng:-71.24894
    },
    {
      region:'05',
      lat:-33.036,
      lng:-71.62963
    },
    {
      region:'06',
      lat:-34.17083,
      lng:-70.74444
    },
    {
      region:'07',
      lat:-35.4264,
      lng:-71.65542
    },
    {
      region:'08',
      lat:-36.82699,
      lng:-73.04977
    },
    {
      region:'09',
      lat:-38.73965,
      lng:-72.59842
    },
    {
      region:'10',
      lat:-41.4693,
      lng:-72.94237
    },
    {
      region:'11',
      lat:-45.57524,
      lng:-72.06619
    },
    {
      region:'12',
      lat:-53.15483,
      lng:-70.91129
    },
    {
      region:'13',
      lat:-33.44286267068381,
      lng:-70.65266161399654
    },
    {
      region:'14',
      lat:-39.81422,
      lng:-73.24589
    },
    {
      region:'15',
      lat:-18.4746,
      lng:-70.29792
    },
    {
      region:'16',
      lat:-36.60664,
      lng:-72.10344
    },
    {
      region:'20',
      lat:-33.44286267068381,
      lng:-70.65266161399654
    },
  ]
  enviando = false;
  constructor(public storage: NativeStorage,public platform:Platform,public network:Network,public toastController: ToastController,private sqlite: SQLite ) { 
    this.message = new BehaviorSubject(this.messages)
  }
  
  nextmessage(data) {
    this.message.next(data);
  }

 cargar_storage(){
    let promesa = new Promise((resolve,reject )=>{
      // this.platform.ready().then(()=>{
        if(this.platform.is("capacitor")){
          //dispositivo
          this.storage.getItem("conexion").then(conexion=>{
            if(conexion){
              this.conexion = conexion;
            }
          });
          this.storage.getItem("seleccionMapa").then(seleccionMapa=>{
            if(seleccionMapa){
              this.seleccionMapa = seleccionMapa;
            }
          });
          this.storage.getItem("puntero").then(puntero=>{
            if(puntero){
              this.puntero = Number(puntero);
            }
          });
          this.storage.getItem("user").then(user=>{
            if(user){
              this.user =JSON.parse(user);
            }
          });
          this.storage.getItem("token_user").then(token_user=>{
            if(token_user){
              this.token_user = token_user;
            }
          });
          this.storage.getItem("fechaActualizacion").then(fechaActualizacion=>{
            if(fechaActualizacion){
              this.fechaActualizacion = JSON.parse(fechaActualizacion);
            }
          });
          this.storage.getItem("menuType").then(menuType=>{
            if(menuType){
              this.menuType = menuType;
            }
          });
          this.storage.getItem("tokenESRI").then(tokenESRI=>{
            if(tokenESRI){
              this.tokenESRI = Number(tokenESRI);
            }
          });
          this.storage.getItem("usuario").then(usuario=>{
            if(usuario){
              this.usuario = JSON.parse(usuario);
              resolve('');
            }
          }).catch(()=>{
            reject('');
          })     
        }else{
        //desktop
          this.usuario = JSON.parse(localStorage.getItem("usuario"));
          this.conexion = localStorage.getItem("conexion");
          this.token_user = localStorage.getItem("token_user");
          this.menuType = localStorage.getItem("menuType");
          this.puntero = Number(localStorage.getItem("puntero"));
          this.fechaActualizacion = JSON.parse(localStorage.getItem("fechaActualizacion"));
          this.tokenESRI = Number(localStorage.getItem("tokenESRI"));
          this.user = JSON.parse(localStorage.getItem("user"));
          resolve(null);
        }
    })
    return promesa
  }

  login(user){
    var data = {
      user: user.user ,
      password:user.password
    }
    this.headers['Authorization'] = "Basic " + btoa((data.user + ':' + data.password));
    let sr = "<soapenv:Envelope [env]:soapenv='http://schemas.xmlsoap.org/soap/envelope/' [env]:max='http://www.ibm.com/maximo'>"+
    "<soapenv:Header/><soapenv:Body><max:QueryMOP_USUARIO_DOH ><max:MOP_USUARIO_DOHQuery operandMode='AND'><max:WHERE>status='ACTIVE'</max:WHERE><max:MAXUSER><max:LOGINID >" + 
    data.user + "</max:LOGINID><max:GROUPUSER grounname in><max:GROUPNAME >PLDGA</max:GROUPNAME></max:GROUPUSER></max:MAXUSER>"+
    "</max:MOP_USUARIO_DOHQuery></max:QueryMOP_USUARIO_DOH></soapenv:Body></soapenv:Envelope>";
    const options: HttpOptions = {
      url:URL_SERVICIOS+'MOP_WS_MOP_USUARIOQRY_DOH',
      data:sr,
      headers:this.headers
    };
    return from(Http.post(options))
  }

  xmlToJson(data) {
    var promise = new Promise((resolve,request)=>{
      const parser = new xml2js.Parser({ strict: false, trim: true });
      data = JSON.stringify(data).replace(/\n  /g,'')
      parser.parseString(data, (err, result) => {
        if(result){
          resolve(result)
        }else{
          request(err)
        }
      });
    })
    return promise;
  };


  getUser(){
    if(this.platform.is('capacitor')){
      this.storage.getItem("user").then(user=>{
        if(user){
          this.user = JSON.parse(user);
        }
      }) 
    }else{
      this.user = JSON.parse(localStorage.getItem("user"));
    }
    return this.user
  }

  saveStorage(res,usuario?){
    this.storage.setItem('usuario', JSON.stringify(res));
    this.storage.setItem('conexion', 'si');
    this.storage.setItem('user', JSON.stringify(usuario));
    this.storage.setItem('tokenESRI', String(226));
    this.storage.setItem('seleccionMapa', 'si');
    this.storage.setItem('puntero', '0');
    var menuType = '';
    // if (res.DEFSITE == "APR" || res.DEFSITE == "DOH-ALL" || res.DEFSITE == "DOH-CAUC" || res.DEFSITE == "DOH-RIEG") {
    //   menuType = "APR";
    // } else {
    //   menuType = res.DEFSITE;
    // }
    menuType = res.DEFSITE;
    this.storage.setItem('menuType', menuType);
    localStorage.setItem('usuario', JSON.stringify(res));
    localStorage.setItem('conexion', 'si');
    localStorage.setItem('seleccionMapa', 'si');
    localStorage.setItem('puntero', '0');
    localStorage.setItem('user', JSON.stringify(usuario));
    localStorage.setItem('tokenESRI', String(226));
    localStorage.setItem('menuType', menuType);
    if(usuario){
      this.storage.setItem('token_user', JSON.stringify(btoa((encodeURIComponent(usuario.user + ':' + usuario.password)))));
      localStorage.setItem('token_user', JSON.stringify(btoa((encodeURIComponent(usuario.user + ':' + usuario.password)))));
    }
    this.cargar_storage() 
  }

  cerrarSesion(){
    let promesa = new Promise((resolve,reject )=>{
       
        if(this.platform.is('capacitor')){
          this.storage.remove('token_user');
          this.storage.remove('conexion');
          this.storage.remove('seleccionMapa');
          this.storage.remove('usuario');
          this.storage.remove('menuType');
          this.storage.remove('fechaActualizacion');
          this.storage.remove('puntero');
        }else{
          localStorage.removeItem('token_user');
          localStorage.removeItem('conexion');
          localStorage.removeItem('seleccionMapa');
          localStorage.removeItem('usuario');
          localStorage.removeItem('menuType');
          localStorage.removeItem('fechaActualizacion');
          localStorage.removeItem('puntero');
        }
        this.usuario = {
          DEFSITE:'',
          GROUPUSER:'',
          LOGINID:'',
          PERSON:{
            CARGOCOMP:'',
            DFLTAPP:'',
            DISPLAYNAME:'',
            DPTOUNI:'',
            INSTITUCION:'',
            PERSONID:'',
            PROFESION:'',
            STATEPROVINCE:'',
            TIPOBOD:null
          },
          STATUS:'',
          USERID:''
         }
         this.fechaActualizacion = null;
         this.puntero = null;
         this.enviando = false;

         if(this.platform.is('capacitor')){
          this.sqlite.deleteDatabase({name:'mydbAlertaTempranaPROD',location:'default',createFromLocation:1}).then((re)=>{
            this.loadFiles(IMAGE_DIR)
            this.loadFiles(SAVE_IMAGE_DIR)
            resolve(true)
          }).catch(err=>{
            this.loadFiles(IMAGE_DIR)
            this.loadFiles(SAVE_IMAGE_DIR)
            resolve(true)
          })
         }else{
          this.loadFiles(IMAGE_DIR)
          this.loadFiles(SAVE_IMAGE_DIR)
          resolve(true);
         }

    })
    return promesa;
  }

  async loadFiles(RUTA){
    this.images = [];
      Filesystem.readdir({
        directory:Directory.Data,
        path:RUTA
      }).then(res=>{
        this.loadFileData(res.files,RUTA)
      })
  }

  async loadFileData(fileNames:string[],RUTA){
    for (let f of fileNames){
      const filePath = RUTA+'/'+f;
      const readFile = await Filesystem.readFile({
        directory:Directory.Data,
        path:filePath
      });
      this.deleteImage({
        name:f,
        path:filePath,
        data:'data:image/jpeg;base64,'+readFile.data
      })
    }
  }
  async deleteImage(file:LocalFile){
    await Filesystem.deleteFile({
      directory:Directory.Data,
      path:file.path
    });
  }

  fecha(fech){
    var now = new Date(fech);
    var month = JSON.stringify(now.getMonth() + 1);
    var horaN = JSON.stringify(now.getHours());
    var dia = JSON.stringify(now.getDate());
    var minutos = JSON.stringify(now.getMinutes());
    if(dia.length == 1){
      dia ="0"+dia;
    }if(month.length == 1){
      month = "0"+month;
    }if(horaN.length == 1){
      horaN = "0"+horaN;
    }if(minutos.length == 1){
      minutos = "0"+minutos;
    }         
    var fec = now.getFullYear()+'-'+month+'-'+dia+'T'+horaN+':'+minutos;
    return fec;
  }

  fechaActualizar(fech,type){
    var now = new Date(fech);
    var month = JSON.stringify(now.getMonth() + 1);
    var horaN = JSON.stringify(now.getHours());
    var dia = JSON.stringify(now.getDate());
    var minutos = JSON.stringify(now.getMinutes());
    if(dia.length == 1){
      dia ="0"+dia;
    }if(month.length == 1){
      month = "0"+month;
    }if(horaN.length == 1){
      horaN = "0"+horaN;
    }if(minutos.length == 1){
      minutos = "0"+minutos;
    }         
    if(type == 'hora'){
      var fec = now.getFullYear()+'-'+month+'-'+dia+' '+horaN+':'+minutos;
    }else{
      var fec = now.getFullYear()+'-'+month+'-'+dia;
    }
    // var fec = horaN+':'+minutos;
    return fec;
  }


}
