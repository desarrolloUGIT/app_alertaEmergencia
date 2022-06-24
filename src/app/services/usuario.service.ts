import { Injectable } from '@angular/core';
import { Http, HttpOptions } from '@capacitor-community/http';
import { from } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UsuarioService {

  constructor() { }

  doGet(){
    var data = {
      user:'maximo.emrdv',
      password:'Dfg.Cvb#47'
    }
    var headers = {
      'Authorization': '',
      'Accept': "text/plain",
      'Content-Type': "text/plain",
    };
    headers['Authorization'] = "Basic " + btoa(data.user + ':' + data.password);
    let sr = "<soapenv:Envelope [env]:soapenv='http://schemas.xmlsoap.org/soap/envelope/' [env]:max='http://www.ibm.com/maximo'><soapenv:Header/><soapenv:Body><max:QueryMOP_USUARIO_DOH ><max:MOP_USUARIO_DOHQuery operandMode='AND'><max:WHERE>status='ACTIVE'</max:WHERE><max:MAXUSER><max:LOGINID >" + data.user + "</max:LOGINID><max:GROUPUSER grounname in><max:GROUPNAME >PLDGA</max:GROUPNAME></max:GROUPUSER></max:MAXUSER></max:MOP_USUARIO_DOHQuery></max:QueryMOP_USUARIO_DOH></soapenv:Body></soapenv:Envelope>";
    const options: HttpOptions = {
      url:'https://emergencias-doh.mop.gob.cl/bypass_udp/service/MOP_WS_MOP_USUARIOQRY_DOH',
      data:sr,
      headers:headers
    };
    return from(Http.post(options))
  }
}
