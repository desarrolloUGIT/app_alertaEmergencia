import { Injectable } from '@angular/core';
import { Http, HttpOptions } from '@capacitor-community/http';
import { from } from 'rxjs';
import * as xml2js from 'xml2js';
import * as xml2json from 'xml2json';


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


  xmlToJson(xml2) {
    // Create the return object
    // var obj = {};
    // console.log(xml.nodeType)
    // if (xml.nodeType == 1) { // element
    //   // do attributes
    //   if (xml.attributes.length > 0) {
    //   obj["@attributes"] = {};
    //     for (var j = 0; j < xml.attributes.length; j++) {
    //       var attribute = xml.attributes.item(j);
    //       obj["@attributes"][attribute.nodeName] = attribute.nodeValue;
    //     }
    //   }
    // } else if (xml.nodeType == 3) { // text
    //   obj = xml.nodeValue;
    // }

    const parser = new xml2js.Parser({ strict: false, trim: true });
    parser.parseString(xml2, (err, result) => {
      console.log(result);
    });
    
    
    // do children
    // console.log(xml)
    // if (xml.hasChildNodes()) {
    //   for(var i = 0; i < xml.childNodes.length; i++) {
    //     var item = xml.childNodes.item(i);
    //     var nodeName = item.nodeName;
    //     if (typeof(obj[nodeName]) == "undefined") {
    //       obj[nodeName] = this.xmlToJson(item);
    //     } else {
    //       if (typeof(obj[nodeName].push) == "undefined") {
    //         var old = obj[nodeName];
    //         obj[nodeName] = [];
    //         obj[nodeName].push(old);
    //       }
    //       obj[nodeName].push(this.xmlToJson(item));
    //     }
    //   }
    // }


    // return obj;
  };
}
