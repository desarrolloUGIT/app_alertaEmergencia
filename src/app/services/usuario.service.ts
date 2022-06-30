import { Injectable } from '@angular/core';
import { Http, HttpOptions } from '@capacitor-community/http';
import { from } from 'rxjs';
import * as xml2js from 'xml2js';
import * as xml2json from 'xml2json';
import { NativeStorage } from '@awesome-cordova-plugins/native-storage/ngx';
import { Platform, ToastController } from '@ionic/angular';
import { Network } from '@awesome-cordova-plugins/network/ngx';
import { BehaviorSubject } from 'rxjs';


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
  messages: "";
  message: BehaviorSubject<String>;

  constructor(public storage: NativeStorage,public platform:Platform,public network:Network,public toastController: ToastController ) { 
    this.message = new BehaviorSubject(this.messages)
  }
  
  nextmessage(data) {
    this.message.next(data);
  }

  // getIdentity(){
  //   var id_user1 = (localStorage.getItem('id_user'));
  //   if(id_user1){
  //       this.id_user = id_user1;
  //   }else{
  //       this.id_user = null;
  //   }
  //   this.storage.getItem("id_user").then(id_user=>{
  //     if(id_user){
  //       this.id_user = id_user;
  //       }
  //     });
    
  //   return this.id_user;
  // }

  // getToken(){
  //   let token1 = localStorage.getItem('token');
  //   if(token1 != "undefined"){
  //       this.token = token1;
  //   }else{
  //       this.token = null;
  //   }
  //   this.storage.getItem("token").then(token=>{
  //     if(token){
  //       this.token = token;
  //       }
  //     });
    
  //   return this.token
  // }

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
          resolve(null);
        }
    })
    return promesa
  }

  login(user?){
    var data = {
      user: user.user ,
      password:user.password
    }
    var headers = {
      'Authorization': '',
      'Accept': "text/plain",
      'Content-Type': "text/plain",
    };
    headers['Authorization'] = "Basic " + btoa(data.user + ':' + data.password);
    let sr = "<soapenv:Envelope [env]:soapenv='http://schemas.xmlsoap.org/soap/envelope/' [env]:max='http://www.ibm.com/maximo'>"+
    "<soapenv:Header/><soapenv:Body><max:QueryMOP_USUARIO_DOH ><max:MOP_USUARIO_DOHQuery operandMode='AND'><max:WHERE>status='ACTIVE'</max:WHERE><max:MAXUSER><max:LOGINID >" + 
    data.user + "</max:LOGINID><max:GROUPUSER grounname in><max:GROUPNAME >PLDGA</max:GROUPNAME></max:GROUPUSER></max:MAXUSER>"+
    "</max:MOP_USUARIO_DOHQuery></max:QueryMOP_USUARIO_DOH></soapenv:Body></soapenv:Envelope>";
    const options: HttpOptions = {
      url:'https://emergencias-doh.mop.gob.cl/bypass_udp/service/MOP_WS_MOP_USUARIOQRY_DOH',
      data:sr,
      headers:headers
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


  saveStorage(res){
    this.storage.setItem('usuario', JSON.stringify(res));
    this.storage.setItem('conexion', 'si');
    localStorage.setItem('usuario', JSON.stringify(res));
    localStorage.setItem('conexion', 'si');
    this.cargar_storage()
  }

  cerrarSesion(){
    let promesa = new Promise((resolve,reject )=>{
        localStorage.clear();
        this.storage.clear();
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
         };
        resolve(true);
    })
    return promesa;
  }

}
