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
  token_user;
  user;
  messages: "";
  message: BehaviorSubject<String>;
  headers = {
    'Authorization': '',
    'Accept': "text/plain",
    'Content-Type': "text/plain",
  };
  URL_SERVICIOS = "https://emergencias-doh.mop.gob.cl/bypass_udp/service/";
  constructor(public storage: NativeStorage,public platform:Platform,public network:Network,public toastController: ToastController ) { 
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
    this.headers['Authorization'] = "Basic " + btoa(data.user + ':' + data.password);
    let sr = "<soapenv:Envelope [env]:soapenv='http://schemas.xmlsoap.org/soap/envelope/' [env]:max='http://www.ibm.com/maximo'>"+
    "<soapenv:Header/><soapenv:Body><max:QueryMOP_USUARIO_DOH ><max:MOP_USUARIO_DOHQuery operandMode='AND'><max:WHERE>status='ACTIVE'</max:WHERE><max:MAXUSER><max:LOGINID >" + 
    data.user + "</max:LOGINID><max:GROUPUSER grounname in><max:GROUPNAME >PLDGA</max:GROUPNAME></max:GROUPUSER></max:MAXUSER>"+
    "</max:MOP_USUARIO_DOHQuery></max:QueryMOP_USUARIO_DOH></soapenv:Body></soapenv:Envelope>";
    const options: HttpOptions = {
      url:this.URL_SERVICIOS+'MOP_WS_MOP_USUARIOQRY_DOH',
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


  saveStorage(res,usuario?){
    this.storage.setItem('usuario', JSON.stringify(res));
    this.storage.setItem('conexion', 'si');
    this.storage.setItem('user', JSON.stringify(usuario));
    localStorage.setItem('usuario', JSON.stringify(res));
    localStorage.setItem('conexion', 'si');
    localStorage.setItem('user', JSON.stringify(usuario));
    if(usuario){
      this.storage.setItem('token_user', JSON.stringify(btoa(usuario.user + ':' + usuario.password)));
      localStorage.setItem('token_user', JSON.stringify(btoa(usuario.user + ':' + usuario.password)));
    }
    this.cargar_storage()
  }

  cerrarSesion(){
    let promesa = new Promise((resolve,reject )=>{
        localStorage.removeItem('token_user');
        localStorage.removeItem('conexion');
        localStorage.removeItem('usuario');
        this.storage.remove('token_user');
        this.storage.remove('conexion');
        this.storage.remove('usuario');
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

  operatividad(){
    this.token_user = JSON.parse(localStorage.getItem("token_user"));
    this.storage.getItem("token_user").then(token_user=>{
      if(token_user){
        this.token_user = JSON.parse(token_user);
      }
    })    
    this.headers['Authorization'] = "Basic " + this.token_user;
    let sr = "<soapenv:Envelope [env]:soapenv='http://schemas.xmlsoap.org/soap/envelope/' [env]:max='http://www.ibm.com/maximo'><soapenv:Header/><soapenv:Body><max:QueryMOP_DOMAIN_DOH ><max:MOP_DOMAIN_DOHQuery operandMode='AND'><max:MAXDOMAIN><max:DOMAINID >ESTADOUB</max:DOMAINID></max:MAXDOMAIN></max:MOP_DOMAIN_DOHQuery></max:QueryMOP_DOMAIN_DOH></soapenv:Body></soapenv:Envelope>";
    const options: HttpOptions = {
      url:this.URL_SERVICIOS+'MOP_WS_MOP_DOMAIN_DOH',
      data:sr,
      headers:this.headers
    };
    return from(Http.post(options))
  }

  nivelAlerta(){
    this.token_user = JSON.parse(localStorage.getItem("token_user"));
    this.storage.getItem("token_user").then(token_user=>{
      if(token_user){
        this.token_user = JSON.parse(token_user);
      }
    })    
    this.headers['Authorization'] = "Basic " + this.token_user;
    let sr = "<soapenv:Envelope [env]:soapenv='http://schemas.xmlsoap.org/soap/envelope/' [env]:max='http://www.ibm.com/maximo'><soapenv:Header/><soapenv:Body><max:QueryMOP_DOMAIN_DOH ><max:MOP_DOMAIN_DOHQuery operandMode='AND'><max:MAXDOMAIN><max:DOMAINID >SIECATEGORIA</max:DOMAINID></max:MAXDOMAIN></max:MOP_DOMAIN_DOHQuery></max:QueryMOP_DOMAIN_DOH></soapenv:Body></soapenv:Envelope>";
    const options: HttpOptions = {
      url:this.URL_SERVICIOS+'MOP_WS_MOP_DOMAIN_DOH',
      data:sr,
      headers:this.headers
    };
    return from(Http.post(options))
  }

  activos(){
    this.token_user = JSON.parse(localStorage.getItem("token_user"));
    this.storage.getItem("token_user").then(token_user=>{
      if(token_user){
        this.token_user = JSON.parse(token_user);
      }
    })    
    this.headers['Authorization'] = "Basic " + this.token_user;
    let sr = "<soapenv:Envelope [env]:soapenv='http://schemas.xmlsoap.org/soap/envelope/' [env]:max='http://www.ibm.com/maximo'>  <soapenv:Header/>   <soapenv:Body>      <max:QueryMOP_ASSET_DOH >         <max:MOP_ASSET_DOHQuery operandMode='AND'>            <!--Optional:-->            <max:ASSET>               <!--Zero or more repetitions:-->               <max:ASSETNUM >%</max:ASSETNUM>               <!--Zero or more repetitions:-->               <max:DESCRIPTION >%</max:DESCRIPTION>               <!--Zero or more repetitions:-->               <max:ISLINEAR >0</max:ISLINEAR>               <!--Zero or more repetitions:-->               <max:REGION >%</max:REGION>               <!--Zero or more repetitions:-->               <max:SITEID operator='=' >APR</max:SITEID>               <!--Zero or more repetitions:-->               <max:STATUS operator='=' >ACTIVA</max:STATUS>               <max:SERVICEADDRESS >                  <!--Zero or more repetitions:-->                  <max:COUNTY >%</max:COUNTY>                  <!--Zero or more repetitions:-->                  <max:REGIONDISTRICT >%</max:REGIONDISTRICT>               </max:SERVICEADDRESS>            </max:ASSET>         </max:MOP_ASSET_DOHQuery>      </max:QueryMOP_ASSET_DOH>   </soapenv:Body></soapenv:Envelope>";
    const options: HttpOptions = {
      url:this.URL_SERVICIOS+'MOP_WS_MOP_ASSET_DOH',
      data:sr,
      headers:this.headers
    };
    return from(Http.post(options))
  }

}
