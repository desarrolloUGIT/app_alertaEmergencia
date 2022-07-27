import { Injectable } from '@angular/core';
import { Http, HttpOptions } from '@capacitor-community/http';
import { from } from 'rxjs';
import * as xml2js from 'xml2js';
import * as xml2json from 'xml2json';
import { NativeStorage } from '@awesome-cordova-plugins/native-storage/ngx';
import { Platform, ToastController } from '@ionic/angular';
import { Network } from '@awesome-cordova-plugins/network/ngx';
import { BehaviorSubject } from 'rxjs';
import { SQLite, SQLiteObject } from '@awesome-cordova-plugins/sqlite/ngx';


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
  tokenESRI;
  menuType;
  messages: "";
  message: BehaviorSubject<String>;
  headers = {
    'Authorization': '',
    'Accept': "text/plain",
    'Content-Type': "text/plain",
  };
  // URL_SERVICIOS = "https://emergencias-doh.mop.gob.cl/bypass_udp/service/"; //PROD
  URL_SERVICIOS = "https://emergencias-doh.mop.gob.cl/bypass_ugit2/restservice/service/"; //QA
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
    this.storage.setItem('tokenESRI', String(226));
    var menuType = '';
    if (res.DEFSITE == "APR" || res.DEFSITE == "DOH-ALL" || res.DEFSITE == "DOH-CAUC" || res.DEFSITE == "DOH-RIEG") {
      menuType = "APR";
    } else {
      menuType = res.DEFSITE;
    }
    this.storage.setItem('menuType', menuType);
    localStorage.setItem('usuario', JSON.stringify(res));
    localStorage.setItem('conexion', 'si');
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
         if(this.platform.is('capacitor')){
          this.sqlite.deleteDatabase({name:'mydbAlertaTemprana',location:'default',createFromLocation:1}).then((re)=>{
            resolve(true)
          }).catch(err=>{
            resolve(true)
          })
         }else{
          resolve(true);
         }

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
    var menu = '';
    menu = localStorage.getItem("menuType");
    this.storage.getItem("menuType").then(menuType=>{
      if(menuType){
        menu = menuType;
      }
    })    
    this.headers['Authorization'] = "Basic " + this.token_user;
    let sr = '';
    let url = '';
    menu == 'APR' ? url = this.URL_SERVICIOS + "MOP_WS_MOP_ASSET_DOH" : url = this.URL_SERVICIOS + "MOP_WS_MOP_OPERLOCQRY_DOH";
    menu == 'APR' ? sr = "<soapenv:Envelope [env]:soapenv='http://schemas.xmlsoap.org/soap/envelope/' [env]:max='http://www.ibm.com/maximo'>  <soapenv:Header/>   <soapenv:Body>      <max:QueryMOP_ASSET_DOH >         <max:MOP_ASSET_DOHQuery operandMode='AND'>            <!--Optional:-->            <max:ASSET>               <!--Zero or more repetitions:-->               <max:ASSETNUM >%</max:ASSETNUM>               <!--Zero or more repetitions:-->               <max:DESCRIPTION >%</max:DESCRIPTION>               <!--Zero or more repetitions:-->               <max:ISLINEAR >0</max:ISLINEAR>               <!--Zero or more repetitions:-->               <max:REGION >%</max:REGION>               <!--Zero or more repetitions:-->               <max:SITEID operator='=' >APR</max:SITEID>               <!--Zero or more repetitions:-->               <max:STATUS operator='=' >ACTIVA</max:STATUS>               <max:SERVICEADDRESS >                  <!--Zero or more repetitions:-->                  <max:COUNTY >%</max:COUNTY>                  <!--Zero or more repetitions:-->                  <max:REGIONDISTRICT >%</max:REGIONDISTRICT>               </max:SERVICEADDRESS>            </max:ASSET>         </max:MOP_ASSET_DOHQuery>      </max:QueryMOP_ASSET_DOH>   </soapenv:Body></soapenv:Envelope>" :
    menu == 'DGA' ?  
    sr = "<soapenv:Envelope xmlns:soapenv='http://schemas.xmlsoap.org/soap/envelope/' [env]:max='http://www.ibm.com/maximo'><soapenv:Header/><soapenv:Body><max:QueryMOP_OPERLOC_DOH><max:MOP_OPERLOC_DOHQuery operandMode='AND'><max:LOCATIONS><max:STATUS operator='=' >ACTIVA</max:STATUS><max:SITEID operator='=' >" + menu + "</max:SITEID><max:LOCATION>14%</max:LOCATION></max:LOCATIONS></max:MOP_OPERLOC_DOHQuery></max:QueryMOP_OPERLOC_DOH></soapenv:Body></soapenv:Envelope>" : 
    sr = "<soapenv:Envelope xmlns:soapenv='http://schemas.xmlsoap.org/soap/envelope/' [env]:max='http://www.ibm.com/maximo'><soapenv:Header/><soapenv:Body><max:QueryMOP_OPERLOC_DOH creationDateTime='2008-09-28T21:49:45'  rsStart='0'><max:MOP_OPERLOC_DOHQuery orderby='LOCATION' operandMode='AND'><max:LOCATIONS><max:ESOBRA operator='=' >1</max:ESOBRA><max:STATUS operator='=' >ACTIVA</max:STATUS><max:SITEID operator='=' >" + menu + "</max:SITEID><max:LOCATION>%</max:LOCATION></max:LOCATIONS></max:MOP_OPERLOC_DOHQuery></max:QueryMOP_OPERLOC_DOH></soapenv:Body></soapenv:Envelope>"
    // console.log('SRRRRR ->>>>> ',sr)
    const options: HttpOptions = {
      url:url,
      data:sr,
      headers:this.headers
    };
    return from(Http.post(options))
  }

  enviarAlerta(data){
    var menu = '';
    menu = localStorage.getItem("menuType");
    this.storage.getItem("menuType").then(menuType=>{
      if(menuType){
        menu = menuType;
      }
    })    
    this.headers['Authorization'] = "Basic " + this.token_user;
    let sr = '';
    // sr = `
    // <soapenv:Envelope xmlns:soapenv='http://schemas.xmlsoap.org/soap/envelope/' xmlns:max='http://www.ibm.com/maximo'>
    //   <soapenv:Header/>
    //     <soapenv:Body>
    //     <max:SyncMOP_SR_EMER_DOH creationDateTime='?' baseLanguage='EN' transLanguage='ES' messageID='?' maximoVersion='?'>
    //     <max:MOP_SR_EMER_DOHSet>
    //     <max:SR action='Add' transLanguage='ES'>
    //     <max:AFFECTEDPERSON changed='?'></max:AFFECTEDPERSON>
    //     <max:ASSETNUM changed='?'>`+data.locations+`</max:ASSETNUM>
    //     <max:ELEMENTO changed='?'></max:ELEMENTO>
    //     <max:ASSETSITEID changed='?'>`+data.destino+`</max:ASSETSITEID>
    //     <max:CATEGORIAMOP changed='?'>`+data.nivelalerta+`</max:CATEGORIAMOP>
    //     <max:COMPETENCIA changed='?'></max:COMPETENCIA>
    //     <max:ESTADOLOC changed="?">` + data.operatividad + `</max:ESTADOLOC>
    //     <max:DESCRIPTION changed='?'>`+data.titulo+`</max:DESCRIPTION>
    //     <max:DESCRIPTION_LONGDESCRIPTION changed='?'>`+data.descripcion+`</max:DESCRIPTION_LONGDESCRIPTION>
    //     <max:FECHARE changed='?'>`+data.date+`</max:FECHARE>
    //     <max:REPORTDATE changed='?'>`+data.date+`</max:REPORTDATE>
    //     <max:REPORTEDBY changed='?'>`+data.usuario+`</max:REPORTEDBY>
    //     <max:TRANSITO changed='?'></max:TRANSITO>
    //     <max:RESTRICCION changed='?'></max:RESTRICCION>
    //     <max:TIPOTRAB changed='?'></max:TIPOTRAB>
    //     <max:TKSERVICEADDRESS action='AddChange' relationship='?' deleteForInsert='?'>
    //       <max:CITY changed="?"> </max:CITY>
    //       <max:COUNTRY changed="?">CL</max:COUNTRY>
    //       <max:COUNTY changed="?">100202</max:COUNTY>
    //       <max:LATITUDEY changed="?">` + data.lat + `</max:LATITUDEY>
    //       <max:LONGITUDEX changed="?">` + data.lng + `</max:LONGITUDEX>
    //       <max:REFERENCEPOINT changed="?"> </max:REFERENCEPOINT>
    //       <max:REGIONDISTRICT changed="?">` + data.region + `</max:REGIONDISTRICT>
    //       <max:STATEPROVINCE changed="?"></max:STATEPROVINCE>
    //       <max:STREETADDRESS changed="?"></max:STREETADDRESS>
    //       <max:ADDRESSLINE2 changed="?">1</max:ADDRESSLINE2>
    //       <max:ADDRESSLINE3 changed="?"></max:ADDRESSLINE3>
    //     </max:TKSERVICEADDRESS>
    //     <max:DOCLINKS action='AddChange'>
    //     <max:DOCUMENTDATA changed='?'>`+data.picture+`</max:DOCUMENTDATA>
    //     <!--Optional:-->
    //     <max:OWNERTABLE changed='?'>SR</max:OWNERTABLE>
    //     <!--Optional:-->
    //     <max:UPLOAD changed='?'>1</max:UPLOAD>
    //     <!--Optional:-->
    //     <max:URLNAME changed='?'>Imagen</max:URLNAME>
    //     <!--Optional:-->
    //     <max:URLTYPE changed='?'>FILE</max:URLTYPE>
    //     </max:DOCLINKS>?
    //     </max:SR>
    //     </max:MOP_SR_EMER_DOHSet>
    //     </max:SyncMOP_SR_EMER_DOH>
    //   </soapenv:Body>
    // </soapenv:Envelope>
    // `

    // sr = `<soapenv:Envelope xmlns:soapenv='http://schemas.xmlsoap.org/soap/envelope/' [env]:max='http://www.ibm.com/maximo'><soapenv:Header/><soapenv:Body><max:SyncMOP_SR_EMER_DOH ><max:MOP_SR_EMER_DOHSet><max:SR action='Add'><max:ASSETSITEID>APR</max:ASSETSITEID><max:STATUS maxvalue='?'>NUEVO</max:STATUS><max:CLASS maxvalue='?'>SR</max:CLASS><max:DESCRIPTION changed='?'>titulo de prueba</max:DESCRIPTION><max:DESCRIPTION_LONGDESCRIPTION changed='?'>Desc de prueba</max:DESCRIPTION_LONGDESCRIPTION><max:FECHARE changed='?'>2022-07-18T14:56:04.240Z</max:FECHARE><max:CATEGORIAMOP changed='?'>Leve</max:CATEGORIAMOP><max:REPORTDATE>2022-07-18T14:56:04.240Z</max:REPORTDATE><max:REPORTEDBY>mauricio.donoso</max:REPORTEDBY><max:AFFECTEDPERSON changed='?'></max:AFFECTEDPERSON><max:LOCATION changed='?'></max:LOCATION><max:ESTADOLOC changed='?'>OPERATIVO</max:ESTADOLOC><max:ELEMENTO changed='?'></max:ELEMENTO><max:COMPETENCIA changed='?'></max:COMPETENCIA><max:EVENTO changed='?'></max:EVENTO><max:APUNTALAR changed='?'>False</max:APUNTALAR><max:ALZAPRIMAR changed='?'>False</max:ALZAPRIMAR><max:REMOVER changed='?'>0</max:REMOVER><max:ACORDONAR changed='?'>False</max:ACORDONAR><max:PROTECCION changed='?'>0</max:PROTECCION><max:REMCENIZA changed='?'>False</max:REMCENIZA><max:REMBARRO changed='?'>False</max:REMBARRO><max:DESTTUBE changed='?'>False</max:DESTTUBE><max:LIMPCUB changed='?'>0</max:LIMPCUB><max:CORTESUM changed='?'>False</max:CORTESUM><max:OTRO changed='?'>0</max:OTRO><max:NIVOPER changed='?'>ACTIVA</max:NIVOPER><max:COORX changed='?'>1</max:COORX><max:COORY changed='?'>2</max:COORY><max:PROBLEMCODE_LONGDESCRIPTION changed='?'></max:PROBLEMCODE_LONGDESCRIPTION ><max:TKSERVICEADDRESS action='AddChange'><max:CITY changed='?'></max:CITY><max:COUNTRY changed='?'>CL</max:COUNTRY><max:COUNTY changed='?'></max:COUNTY><max:LATITUDEY changed='?'>-33.362549</max:LATITUDEY><max:LONGITUDEX changed='?'>-70.765262</max:LONGITUDEX><max:REFERENCEPOINT changed='?'></max:REFERENCEPOINT><max:REGIONDISTRICT changed='?'>13</max:REGIONDISTRICT><max:STATEPROVINCE changed='?'></max:STATEPROVINCE><max:STREETADDRESS changed='?'></max:STREETADDRESS><max:ADDRESSLINE2 changed='?'>1</max:ADDRESSLINE2><max:ADDRESSLINE3 changed='?'></max:ADDRESSLINE3></max:TKSERVICEADDRESS><max:DOCLINKS action='AddChange' relationship='?' deleteForInsert='?'><max:ADDINFO changed='?'>1</max:ADDINFO><max:COPYLINKTOWO changed='?'>0</max:COPYLINKTOWO><max:DESCRIPTION changed='Ejemplo de archivo'></max:DESCRIPTION><max:DOCTYPE changed='?'>Attachments</max:DOCTYPE><max:DOCUMENT changed='?'>Prueba 1</max:DOCUMENT><max:DOCUMENTDATA changed='?'>`+data.picture+`</max:DOCUMENTDATA><max:OWNERTABLE changed='?'>SR</max:OWNERTABLE><max:UPLOAD changed='?'>1</max:UPLOAD><max:URLNAME changed='?'>Prueba</max:URLNAME><max:URLTYPE changed='?'>FILE</max:URLTYPE></max:DOCLINKS></max:SR></max:MOP_SR_EMER_DOHSet></max:SyncMOP_SR_EMER_DOH></soapenv:Body></soapenv:Envelope> `
   sr =  `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" [env]:max="http://www.ibm.com/maximo">
                    <soapenv:Header/>
                    <soapenv:Body>
                       <max:SyncMOP_SR_EMER_DOH >
                          <max:MOP_SR_EMER_DOHSet>
                             <max:SR action="Add">
                             <max:ASSETSITEID>` + data.destino + `</max:ASSETSITEID>
                                <max:LOCATION maxvalue="?">` + data.locations + `</max:LOCATION>
                                <max:STATUS maxvalue="?">NUEVO</max:STATUS>
                                <max:CLASS maxvalue="?">SR</max:CLASS>
                                <max:DESCRIPTION changed="?">` + data.titulo + `</max:DESCRIPTION>
                                <max:DESCRIPTION_LONGDESCRIPTION changed="?">` + data.descripcion + `</max:DESCRIPTION_LONGDESCRIPTION>
                                <max:FECHARE changed="?">` + data.date + `</max:FECHARE>
                                <max:CATEGORIAMOP changed="?">` + data.nivelalerta + `</max:CATEGORIAMOP>
                                <max:REPORTDATE>` + data.date + `</max:REPORTDATE>
                                <max:REPORTEDBY>` + data.usuario + `</max:REPORTEDBY>
                                <max:AFFECTEDPERSON changed="?"></max:AFFECTEDPERSON>
                                <max:LOCATION changed="?"></max:LOCATION>
                                <max:ESTADOLOC changed="?">` + data.operatividad + `</max:ESTADOLOC>
                                <max:ELEMENTO changed="?"></max:ELEMENTO>
                                <max:COMPETENCIA changed="?"> </max:COMPETENCIA>
                                <max:EVENTO changed="?"> </max:EVENTO>
                                <max:APUNTALAR changed="?">False</max:APUNTALAR>
                                <max:ALZAPRIMAR changed="?">False</max:ALZAPRIMAR>
                                <max:REMOVER changed="?">0</max:REMOVER>
                                <max:ACORDONAR changed="?">False</max:ACORDONAR>
                                <max:PROTECCION changed="?">0</max:PROTECCION>
                                <max:REMCENIZA changed="?">False</max:REMCENIZA>
                                <max:REMBARRO changed="?">False</max:REMBARRO>
                                <max:DESTTUBE changed="?">False</max:DESTTUBE>
                                <max:LIMPCUB changed="?">0</max:LIMPCUB>
                                <max:CORTESUM changed="?">False</max:CORTESUM>
                                <max:OTRO changed="?">0</max:OTRO>
                                <max:COORX changed="?">1</max:COORX>
                                <max:COORY changed="?">2</max:COORY>
                                <max:PROBLEMCODE_LONGDESCRIPTION changed="?">abandonar</max:PROBLEMCODE_LONGDESCRIPTION >
                                <max:TKSERVICEADDRESS action="AddChange">
                                    <max:CITY changed="?"> </max:CITY>
                                    <max:COUNTRY changed="?">CL</max:COUNTRY>
                                    <max:COUNTY changed="?">100202</max:COUNTY>
                                    <max:LATITUDEY changed="?">` + data.lat + `</max:LATITUDEY>
                                   <max:LONGITUDEX changed="?">` + data.lng + `</max:LONGITUDEX>
                                    <max:REFERENCEPOINT changed="?"> </max:REFERENCEPOINT>
                                    <max:REGIONDISTRICT changed="?">` + data.region + `</max:REGIONDISTRICT>
                                    <max:STATEPROVINCE changed="?"></max:STATEPROVINCE>
                                    <max:STREETADDRESS changed="?"></max:STREETADDRESS>
                                    <max:ADDRESSLINE2 changed="?">1</max:ADDRESSLINE2>
                                    <max:ADDRESSLINE3 changed="?"></max:ADDRESSLINE3>
                                </max:TKSERVICEADDRESS>
                                <max:DOCLINKS action="AddChange" relationship="?" deleteForInsert="?">
                                   <max:ADDINFO changed="?">1</max:ADDINFO>
                                   <max:COPYLINKTOWO changed="?">0</max:COPYLINKTOWO>
                                   <max:DESCRIPTION changed="?">` + data.titulo + `</max:DESCRIPTION>
                                   <max:DOCTYPE changed="?">Attachments</max:DOCTYPE>
                                   <max:DOCUMENT changed="?">foto</max:DOCUMENT>
                                   <max:DOCUMENTDATA changed="?"></max:DOCUMENTDATA>
                                   <max:OWNERTABLE changed="?">SR</max:OWNERTABLE>
                                   <max:UPLOAD changed="?">1</max:UPLOAD>
                                   <max:URLNAME changed="?">Imagen</max:URLNAME>
                                   <max:URLTYPE changed="?">FILE</max:URLTYPE>
                                </max:DOCLINKS>
                             </max:SR>
                          </max:MOP_SR_EMER_DOHSet>
                       </max:SyncMOP_SR_EMER_DOH>
                    </soapenv:Body>
                 </soapenv:Envelope>
                 `
    const options: HttpOptions = {
      url:this.URL_SERVICIOS + "MOP_WS_MOP_SR_EMER_DOH",
      data:sr,
      headers:this.headers
    };
    console.log(sr)
    console.log(data.region,data.locations,data.destino)
    return from(Http.post(options))
    // if (menu == "DOP" || menu == "DGA" || menu == "DAP") {
    //   sr = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:max="http://www.ibm.com/maximo">
    //             <soapenv:Header/>
    //             <soapenv:Body>
    //               <max:SyncMOP_SR_EMER_DOH >
    //                   <max:MOP_SR_EMER_DOHSet>
    //                     <!--Zero or more repetitions:-->
    //                     <max:SR action="Add">
    //                     <max:ASSETSITEID>` + data.destino + `</max:ASSETSITEID>
    //                         <max:LOCATION maxvalue="?">` + data.location + `</max:LOCATION>
    //                         <max:STATUS maxvalue="?">NUEVO</max:STATUS>
    //                         <max:CLASS maxvalue="?">SR</max:CLASS>
    //                         <max:DESCRIPTION changed="?">` + data.titulo+ `</max:DESCRIPTION>
    //                         <max:DESCRIPTION_LONGDESCRIPTION changed="?">` + data.descripcion + `</max:DESCRIPTION_LONGDESCRIPTION>
    //                         <max:FECHARE changed="?">` + data.date + `</max:FECHARE>
    //                         <max:CATEGORIAMOP changed="?">` + data.nivelalerta + `</max:CATEGORIAMOP>
    //                         <max:REPORTDATE>` + data.date + `</max:REPORTDATE>
    //                         <max:REPORTEDBY>` + data.usuario.toUpperCase() + `</max:REPORTEDBY>
    //                         <max:AFFECTEDPERSON changed="?"></max:AFFECTEDPERSON>
    //                         <max:LOCATION changed="?"></max:LOCATION>
    //                         <max:ESTADOLOC changed="?">` + data.operatividad + `</max:ESTADOLOC>
    //                         <max:ELEMENTO changed="?"></max:ELEMENTO>
    //                         <max:COMPETENCIA changed="?"> </max:COMPETENCIA>
    //                         <max:EVENTO changed="?"> </max:EVENTO>
    //                         <max:APUNTALAR changed="?">False</max:APUNTALAR>
    //                         <max:ALZAPRIMAR changed="?">False</max:ALZAPRIMAR>
    //                         <max:REMOVER changed="?">0</max:REMOVER>
    //                         <max:ACORDONAR changed="?">False</max:ACORDONAR>
    //                         <max:PROTECCION changed="?">0</max:PROTECCION>
    //                         <max:REMCENIZA changed="?">False</max:REMCENIZA>
    //                         <max:REMBARRO changed="?">False</max:REMBARRO>
    //                         <max:DESTTUBE changed="?">False</max:DESTTUBE>
    //                         <max:LIMPCUB changed="?">0</max:LIMPCUB>
    //                         <max:CORTESUM changed="?">False</max:CORTESUM>
    //                         <max:OTRO changed="?">0</max:OTRO>
    //                         <max:COORX changed="?">1</max:COORX>
    //                         <max:COORY changed="?">2</max:COORY>
    //                         <max:PROBLEMCODE_LONGDESCRIPTION changed="?">abandonar</max:PROBLEMCODE_LONGDESCRIPTION >
    //                         <max:TKSERVICEADDRESS action="AddChange">
    //                             <max:CITY changed="?"> </max:CITY>
    //                             <max:COUNTRY changed="?">CL</max:COUNTRY>
    //                             <max:COUNTY changed="?">100202</max:COUNTY>
    //                             <max:LATITUDEY changed="?">` + data.lat + `</max:LATITUDEY>
    //                           <max:LONGITUDEX changed="?">` + data.lng + `</max:LONGITUDEX>
    //                             <max:REFERENCEPOINT changed="?"> </max:REFERENCEPOINT>
    //                             <max:REGIONDISTRICT changed="?">` + data.region + `</max:REGIONDISTRICT>
    //                             <max:STATEPROVINCE changed="?"></max:STATEPROVINCE>
    //                             <max:STREETADDRESS changed="?"></max:STREETADDRESS>
    //                             <max:ADDRESSLINE2 changed="?">1</max:ADDRESSLINE2>
    //                             <max:ADDRESSLINE3 changed="?"></max:ADDRESSLINE3>
    //                         </max:TKSERVICEADDRESS>
    //                         <!--Zero or more repetitions:-->
    //                         <max:DOCLINKS action="AddChange" relationship="?" deleteForInsert="?">
    //                           <!--Optional:-->
    //                           <max:ADDINFO changed="?">1</max:ADDINFO>
    //                           <!--Optional:-->
    //                           <max:COPYLINKTOWO changed="?">0</max:COPYLINKTOWO>
    //                           <!--Optional:-->
    //                           <max:DESCRIPTION changed="?">` + data.titulo + `</max:DESCRIPTION>
    //                           <!--Optional:-->
    //                           <max:DOCTYPE changed="?">Attachments</max:DOCTYPE>
    //                           <!--Optional:-->
    //                           <max:DOCUMENT changed="?">foto</max:DOCUMENT>
    //                           <!--Optional:-->
    //                           <max:DOCUMENTDATA changed="?">` + data.picture + `</max:DOCUMENTDATA>
    //                           <!--Optional:-->
    //                           <max:OWNERTABLE changed="?">SR</max:OWNERTABLE>
    //                           <!--Optional:-->
    //                           <max:UPLOAD changed="?">1</max:UPLOAD>
    //                           <!--Optional:-->
    //                           <max:URLNAME changed="?">Imagen</max:URLNAME>
    //                           <!--Optional:-->
    //                           <max:URLTYPE changed="?">FILE</max:URLTYPE>
    //                         </max:DOCLINKS>
    //                     </max:SR>
    //                   </max:MOP_SR_EMER_DOHSet>
    //               </max:SyncMOP_SR_EMER_DOH>
    //             </soapenv:Body>
    //         </soapenv:Envelope>`
    //         const options: HttpOptions = {
    //           url:this.URL_SERVICIOS + "MOP_WS_MOP_SR_EMER_DOH",
    //           data:sr,
    //           headers:this.headers
    //         };
    //         return from(Http.post(options))
    // }else{
    //   console.log(data)
    //   sr = `<soapenv:Envelope [env]:soapenv="http://schemas.xmlsoap.org/soap/envelope/" [env]:max="http://www.ibm.com/maximo">
    //         <soapenv:Header/>
    //         <soapenv:Body>
    //             <max:SyncMOP_SR_EMER_DOH >
    //                 <max:MOP_SR_EMER_DOHSet>
    //                     <!--Zero or more repetitions:-->
    //                     <max:SR action="Add">
    //                     <max:ASSETSITEID>` + data.destino + `</max:ASSETSITEID>
    //                     <max:STATUS maxvalue="?">NUEVO</max:STATUS>
    //                     <max:CLASS maxvalue="?">SR</max:CLASS>
    //                     <max:DESCRIPTION changed="?">` + data.titulo+ `</max:DESCRIPTION>
    //                     <max:DESCRIPTION_LONGDESCRIPTION changed="?">` + data.descripcion + `</max:DESCRIPTION_LONGDESCRIPTION>
    //                     <max:FECHARE changed="?">` + data.date + `</max:FECHARE>
    //                     <max:CATEGORIAMOP changed="?">` + data.nivelalerta + `</max:CATEGORIAMOP>
    //                     <max:REPORTDATE>` + data.date + `</max:REPORTDATE>
    //                     <max:REPORTEDBY>` + data.usuario.toUpperCase() + `</max:REPORTEDBY>
    //                     <max:AFFECTEDPERSON changed="?"></max:AFFECTEDPERSON>
    //                     <max:LOCATION changed="?"></max:LOCATION>
    //                     <max:ESTADOLOC changed="?">` + data.operatividad + `</max:ESTADOLOC>
    //                     <max:ELEMENTO changed="?"></max:ELEMENTO>
    //                     <max:COMPETENCIA changed="?"> </max:COMPETENCIA>
    //                     <max:EVENTO changed="?"> </max:EVENTO>
    //                     <max:APUNTALAR changed="?">False</max:APUNTALAR>
    //                     <max:ALZAPRIMAR changed="?">False</max:ALZAPRIMAR>
    //                     <max:REMOVER changed="?">0</max:REMOVER>
    //                     <max:ACORDONAR changed="?">False</max:ACORDONAR>
    //                     <max:PROTECCION changed="?">0</max:PROTECCION>
    //                     <max:REMCENIZA changed="?">False</max:REMCENIZA>
    //                     <max:REMBARRO changed="?">False</max:REMBARRO>
    //                     <max:DESTTUBE changed="?">False</max:DESTTUBE>
    //                     <max:LIMPCUB changed="?">0</max:LIMPCUB>
    //                     <max:CORTESUM changed="?">False</max:CORTESUM>
    //                     <max:OTRO changed="?">0</max:OTRO>
    //                     <max:COORX changed="?">1</max:COORX>
    //                     <max:COORY changed="?">2</max:COORY>
    //                     <max:PROBLEMCODE_LONGDESCRIPTION changed="?">abandonar</max:PROBLEMCODE_LONGDESCRIPTION >
    //                     <max:TKSERVICEADDRESS action="AddChange">
    //                         <max:CITY changed="?"> </max:CITY>
    //                         <max:COUNTRY changed="?">CL</max:COUNTRY>
    //                         <max:COUNTY changed="?">100202</max:COUNTY>
    //                         <max:LATITUDEY changed="?">` + data.lat + `</max:LATITUDEY>
    //                         <max:LONGITUDEX changed="?">` + data.lng + `</max:LONGITUDEX>
    //                         <max:REFERENCEPOINT changed="?"> </max:REFERENCEPOINT>
    //                         <max:REGIONDISTRICT changed="?">` + data.region + `</max:REGIONDISTRICT>
    //                         <max:STATEPROVINCE changed="?"></max:STATEPROVINCE>
    //                         <max:STREETADDRESS changed="?"></max:STREETADDRESS>
    //                         <max:ADDRESSLINE2 changed="?">1</max:ADDRESSLINE2>
    //                         <max:ADDRESSLINE3 changed="?"></max:ADDRESSLINE3>
    //                     </max:TKSERVICEADDRESS>
    //                     <!--Zero or more repetitions:-->
    //                     <max:DOCLINKS action="AddChange" relationship="?" deleteForInsert="?">
    //                         <!--Optional:-->
    //                         <max:ADDINFO changed="?">1</max:ADDINFO>
    //                         <!--Optional:-->
    //                         <max:COPYLINKTOWO changed="?">0</max:COPYLINKTOWO>
    //                         <!--Optional:-->
    //                         <max:DESCRIPTION changed="?">` + data.titulo + `</max:DESCRIPTION>
    //                         <!--Optional:-->
    //                         <max:DOCTYPE changed="?">Attachments</max:DOCTYPE>
    //                         <!--Optional:-->
    //                         <max:DOCUMENT changed="?">foto</max:DOCUMENT>
    //                         <!--Optional:-->
    //                         <max:DOCUMENTDATA changed="?">` + data.picture + `</max:DOCUMENTDATA>
    //                         <!--Optional:-->
    //                         <max:OWNERTABLE changed="?">SR</max:OWNERTABLE>
    //                         <!--Optional:-->
    //                         <max:UPLOAD changed="?">1</max:UPLOAD>
    //                         <!--Optional:-->
    //                         <max:URLNAME changed="?">Imagen</max:URLNAME>
    //                         <!--Optional:-->
    //                         <max:URLTYPE changed="?">FILE</max:URLTYPE>
    //                     </max:DOCLINKS>
    //                     </max:SR>
    //                 </max:MOP_SR_EMER_DOHSet>
    //             </max:SyncMOP_SR_EMER_DOH>
    //         </soapenv:Body>
    //       </soapenv:Envelope>`
    //       const options: HttpOptions = {
    //         url:this.URL_SERVICIOS + "MOP_WS_MOP_SR_EMER_DOH",
    //         data:sr,
    //         headers:this.headers
    //       };
    //       console.log(data)
    //       return from(Http.post(options))

    // }

  }

}
