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
export class VialidadService {

  constructor(public _us:UsuarioService, public platform:Platform,public network:Network,public toastController: ToastController,private sqlite: SQLite) { }

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


  activosVialidad(){
    this._us.headers['Authorization'] = "Basic " + btoa((this._us.getUser().user + ':' + this._us.getUser().password));
    let sr = `<soapenv:Envelope [env]:soapenv="http://schemas.xmlsoap.org/soap/envelope/" [env]:max="http://www.ibm.com/maximo">
              <soapenv:Header/>
              <soapenv:Body>
                <max:QueryMOP_ASSET_DOH >
                    <max:MOP_ASSET_DOHQuery operandMode="AND">
                      <!--Optional:-->
                      <max:ASSET>
                          <!--Zero or more repetitions:-->
                          <max:ASSETNUM >%</max:ASSETNUM>
                          <!--Zero or more repetitions:-->
                          <max:DESCRIPTION >%</max:DESCRIPTION>
                          <!--Zero or more repetitions:-->
                          <max:ISLINEAR >1</max:ISLINEAR>
                          <!--Zero or more repetitions:-->
                          <max:REGION >`+this._us.usuario.PERSON.STATEPROVINCE+`</max:REGION>
                          <!--Zero or more repetitions:-->
                          <max:SITEID operator="=" >`+this._us.usuario.DEFSITE+`</max:SITEID>
                          <!--Zero or more repetitions:-->
                          <max:STATUS operator="=" >ACTIVA</max:STATUS>
                      </max:ASSET>
                    </max:MOP_ASSET_DOHQuery>
                </max:QueryMOP_ASSET_DOH>
              </soapenv:Body>
          </soapenv:Envelope>
          `
    let url = URL_SERVICIOS+'MOP_WS_MOP_ASSET_DOH';
    const options: HttpOptions = {
      url:url,
      data:sr,
      headers:this._us.headers
    };
    return from(Http.post(options))
  }

  enviarAlerta(data){
    this._us.headers['Authorization'] = "Basic " + btoa((this._us.getUser().user + ':' + this._us.getUser().password));
    let sr = ''
    let url = URL_SERVICIOS+'MOP_WS_MOP_ASSET_DOH';
    const options: HttpOptions = {
      url:url,
      data:sr,
      headers:this._us.headers
    };
    return from(Http.post(options))
  }

}
