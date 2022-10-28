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
import { UsuarioService } from '../usuario/usuario.service';

@Injectable({
  providedIn: 'root'
})
export class DireccionService {
  headers = {
    'Authorization': '',
    'Accept': "text/plain",
    'Content-Type': "text/plain",
  };
  constructor(public _us:UsuarioService, public platform:Platform,public network:Network,public toastController: ToastController,private sqlite: SQLite) { }

  activos(){ 
    this.headers['Authorization'] = "Basic " + btoa((this._us.getUser().user + ':' + this._us.getUser().password));
    // menu == 'APR' ? url = this.URL_SERVICIOS + "MOP_WS_MOP_ASSET_DOH" : url = this.URL_SERVICIOS + "MOP_WS_MOP_OPERLOCQRY_DOH";
    // menu == 'APR' ? sr = "<soapenv:Envelope [env]:soapenv='http://schemas.xmlsoap.org/soap/envelope/' [env]:max='http://www.ibm.com/maximo'>  <soapenv:Header/>   <soapenv:Body>      <max:QueryMOP_ASSET_DOH >         <max:MOP_ASSET_DOHQuery operandMode='AND'>            <!--Optional:-->            <max:ASSET>               <!--Zero or more repetitions:-->               <max:ASSETNUM >%</max:ASSETNUM>               <!--Zero or more repetitions:-->               <max:DESCRIPTION >%</max:DESCRIPTION>               <!--Zero or more repetitions:-->               <max:ISLINEAR >0</max:ISLINEAR>               <!--Zero or more repetitions:-->               <max:REGION >%</max:REGION>               <!--Zero or more repetitions:-->               <max:SITEID operator='=' >APR</max:SITEID>               <!--Zero or more repetitions:-->               <max:STATUS operator='=' >ACTIVA</max:STATUS>               <max:SERVICEADDRESS >                  <!--Zero or more repetitions:-->                  <max:COUNTY >%</max:COUNTY>                  <!--Zero or more repetitions:-->                  <max:REGIONDISTRICT >%</max:REGIONDISTRICT>               </max:SERVICEADDRESS>            </max:ASSET>         </max:MOP_ASSET_DOHQuery>      </max:QueryMOP_ASSET_DOH>   </soapenv:Body></soapenv:Envelope>" :
    // menu == 'DGA' ?  
    // sr = "<soapenv:Envelope xmlns:soapenv='http://schemas.xmlsoap.org/soap/envelope/' [env]:max='http://www.ibm.com/maximo'><soapenv:Header/><soapenv:Body><max:QueryMOP_OPERLOC_DOH><max:MOP_OPERLOC_DOHQuery operandMode='AND'><max:LOCATIONS><max:STATUS operator='=' >ACTIVA</max:STATUS><max:SITEID operator='=' >" + menu + "</max:SITEID><max:LOCATION>14%</max:LOCATION></max:LOCATIONS></max:MOP_OPERLOC_DOHQuery></max:QueryMOP_OPERLOC_DOH></soapenv:Body></soapenv:Envelope>" : 
    // sr = "<soapenv:Envelope xmlns:soapenv='http://schemas.xmlsoap.org/soap/envelope/' [env]:max='http://www.ibm.com/maximo'><soapenv:Header/><soapenv:Body><max:QueryMOP_OPERLOC_DOH creationDateTime='2008-09-28T21:49:45'  rsStart='0'><max:MOP_OPERLOC_DOHQuery orderby='LOCATION' operandMode='AND'><max:LOCATIONS><max:ESOBRA operator='=' >1</max:ESOBRA><max:STATUS operator='=' >ACTIVA</max:STATUS><max:SITEID operator='=' >" + menu + "</max:SITEID><max:LOCATION>%</max:LOCATION></max:LOCATIONS></max:MOP_OPERLOC_DOHQuery></max:QueryMOP_OPERLOC_DOH></soapenv:Body></soapenv:Envelope>"
    // console.log('SRRRRR ->>>>> ',sr)

// ACTIVOS APR
  let sr = "<soapenv:Envelope [env]:soapenv='http://schemas.xmlsoap.org/soap/envelope/' [env]:max='http://www.ibm.com/maximo'>"+
    "<soapenv:Header/><soapenv:Body><max:QueryMOP_ASSET_DOH ><max:MOP_ASSET_DOHQuery operandMode='AND'><max:ASSET><max:ASSETNUM >%</max:ASSETNUM><max:DESCRIPTION >%</max:DESCRIPTION>"+
    "<max:ISLINEAR >0</max:ISLINEAR><max:REGION >%</max:REGION><max:SITEID operator='=' >"+this._us.usuario.DEFSITE+"</max:SITEID><max:STATUS operator='=' >ACTIVA</max:STATUS><max:SERVICEADDRESS ><max:COUNTY >%</max:COUNTY>"+
    "<max:REGIONDISTRICT >"+this._us.usuario.PERSON.STATEPROVINCE+"</max:REGIONDISTRICT></max:SERVICEADDRESS></max:ASSET></max:MOP_ASSET_DOHQuery></max:QueryMOP_ASSET_DOH></soapenv:Body></soapenv:Envelope>"
// FIN ACTIVOS APR
    let url = URL_SERVICIOS+'MOP_WS_MOP_ASSET_DOH';
    const options: HttpOptions = {
      url:url,
      data:sr,
      headers:this.headers
    };
    return from(Http.post(options))
  }

  enviar(data){
    this.headers['Authorization'] = "Basic " + btoa((this._us.getUser().user + ':' + this._us.getUser().password));
    let sr = ''
    let url = URL_SERVICIOS+'MOP_WS_MOP_ASSET_DOHds';
    const options: HttpOptions = {
      url:url,
      data:sr,
      headers:this.headers
    };
    return from(Http.post(options))
  }

  dominios(tipo){
    this._us.headers['Authorization'] = "Basic " + btoa((this._us.getUser().user + ':' + this._us.getUser().password));
    let sr = "<soapenv:Envelope [env]:soapenv='http://schemas.xmlsoap.org/soap/envelope/' [env]:max='http://www.ibm.com/maximo'>"+
             "<soapenv:Header/><soapenv:Body><max:QueryMOP_DOMAIN_DOH ><max:MOP_DOMAIN_DOHQuery operandMode='AND'><max:MAXDOMAIN>"+
             "<max:DOMAINID >"+tipo+"</max:DOMAINID></max:MAXDOMAIN></max:MOP_DOMAIN_DOHQuery></max:QueryMOP_DOMAIN_DOH></soapenv:Body></soapenv:Envelope>";
    const options: HttpOptions = {
      url:URL_SERVICIOS+'MOP_WS_MOP_DOMAIN_DOH',
      data:sr,
      headers:this._us.headers
    };
    return from(Http.post(options))
  }
  
}
