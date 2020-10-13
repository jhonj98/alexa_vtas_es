/* eslint-disable  func-names */
/* eslint quote-props: ["error", "consistent"]*/

// alexa-cookbook sample code

// There are three sections, Text Strings, Skill Code, and Helper Function(s).
// You can copy and paste the entire file contents as the code for a new Lambda function,
// or copy & paste section #3, the helper function, to the bottom of your existing Lambda code.

// TODO add URL to this entry in the cookbook


 // 1. Text strings =====================================================================================================
 //    Modify these strings and messages to change the behavior of your Lambda function
 var Client = require("node-rest-client").Client;
 var speechOutput;
 var reprompt;
 const welcomeOutput = "Bienvenido a la habilidad de obtener las ventas y el presupuesto de Harinera del Valle, que quieres consultar?";
 const welcomeReprompt = "Puedes pedirme las ventas, el presupuesto o ambos, y tienes que decirme el mes, la oficina de ventas y opcionalmente el grupo de articulos para poder consultar la informacion";

 // 2. Skill Code =======================================================================================================

'use strict';
const Alexa = require('alexa-sdk');
const APP_ID = "amzn1.ask.skill.2b8bf215-1cb4-4a60-adc6-ff7b4ab2bcce";  // TODO replace with your app ID (OPTIONAL). Español
const handlers = {
    'LaunchRequest': function () {
      this.response.speak(welcomeOutput).listen(welcomeReprompt);
      this.emit(':responseReady');
    },
    'ObtenerVentasYPpto': function () {
        //delegate to Alexa to collect all the required slot values
        var filledSlots = delegateSlotCollection.call(this);

        var oficina=this.event.request.intent.slots.oficina.value;
        var periodo=this.event.request.intent.slots.periodo.value;
        var fieldsRequested=this.event.request.intent.slots.fieldsRequested.value;

        var grupoArt = isSlotValid(this.event.request, "grupoArt");
        
        if (this.event.request.dialogState === "COMPLETED"){
           oficinaId = this.event.request.intent.slots.oficina.resolutions.resolutionsPerAuthority[0].values[0].value.id;
           grupoArtId = "";
           if (this.event.request.intent.slots.grupoArt.resolutions){
            grupoArtId = this.event.request.intent.slots.grupoArt.resolutions.resolutionsPerAuthority[0].values[0].value.id;
           }
           fieldsRequestedId = this.event.request.intent.slots.fieldsRequested.resolutions.resolutionsPerAuthority[0].values[0].value.id;
           periodoSAP = periodo.substr(0, 4) + periodo.substr(5,2);
           
           getDataFromSAP(oficinaId, periodoSAP, fieldsRequestedId, grupoArtId, function(salesValue, budgetValue){
             console.log("Grupo de articulo: " + grupoArt);
             if (!grupoArt){
                grupoArtPartText = "";
                connectorAnd = "";
              }else{
                connectorAnd = " y ";
                grupoArtPartText = " grupo de articulos " + grupoArt; 
              }
             switch(fieldsRequestedId){
              case "1": //Solo ventas
               speechOutput = "El valor total de las ventas para la oficina de ventas " + oficina + connectorAnd + grupoArtPartText + " en el mes de " + periodo + " es " + salesValue + " millones de pesos";
               break;
              case "2": //Solo presupuesto
               speechOutput = "El valor total de presupuesto para la oficina de ventas " + oficina + connectorAnd + grupoArtPartText + " en el mes de " + periodo + " es " + budgetValue + " millones de pesos";
               break;   
              case "3": //Ventas y presupuesto
               if (Number(budgetValue) > 0){
                cumplimiento = ((Number(salesValue) / Number(budgetValue)) * 100).toFixed(2).toString();
                speechOutput = "Para la oficina de ventas " + oficina + ", " + grupoArtPartText + " y el mes de " + periodo + " el presupuesto total es de " + budgetValue + " millones de pesos, y el valor total de las ventas es " + salesValue + " millones de pesos, " + " es decir que vamos cumpliendo al " + cumplimiento + " %";
               }else{
                speechOutput = "Para la oficina de ventas " + oficina + ", " + grupoArtPartText + " y el mes de " + periodo + " el presupuesto total es de " + budgetValue + " millones de pesos, y el valor total de las ventas es " + salesValue + " millones de pesos";
               }               
               break;   
             }
             this.response.speak(speechOutput);
             this.emit(":responseReady");
           }.bind(this)); 
           
           //console.log("Grupo de articulo " + grupoArt);
           console.log("Id de la oficina " + this.event.request.intent.slots.oficina.resolutions.resolutionsPerAuthority[0].values[0].value.id);
        }
    },
    'AMAZON.HelpIntent': function () {
        speechOutput = "";
        reprompt = "";
        this.response.speak(speechOutput).listen(reprompt);
        this.emit(':responseReady');
    },
    'AMAZON.CancelIntent': function () {
        speechOutput = "";
        this.response.speak(speechOutput);
        this.emit(':responseReady');
    },
    'AMAZON.StopIntent': function () {
        speechOutput = "";
        this.response.speak(speechOutput);
        this.emit(':responseReady');
    },
    'SessionEndedRequest': function () {
        var speechOutput = "";
        this.response.speak(speechOutput);
        this.emit(':responseReady');
    },
    'Unhandled': function () {
        this.emit(':ask', "No entiendo lo que me dices");
    }
};

exports.handler = (event, context) => {
    var alexa = Alexa.handler(event, context);
    alexa.appId = APP_ID;
    // To enable string internationalization (i18n) features, set a resources object.
    //alexa.resources = languageStrings;
    alexa.registerHandlers(handlers);
    alexa.execute();
};

//    END of Intent Handlers {} ========================================================================================
// 3. Helper Function  =================================================================================================

function delegateSlotCollection(){
  console.log("in delegateSlotCollection");
  console.log("current dialogState: "+this.event.request.dialogState);
    if (this.event.request.dialogState === "STARTED") {
      console.log("in Beginning");
      var updatedIntent=this.event.request.intent;
      //optionally pre-fill slots: update the intent object with slot values for which
      //you have defaults, then return Dialog.Delegate with this updated intent
      // in the updatedIntent property
      this.emit(":delegate", updatedIntent);
    } else if (this.event.request.dialogState !== "COMPLETED") {
      console.log("in not completed");
      // return a Dialog.Delegate directive with no updatedIntent property.
      this.emit(":delegate");
    } else {
      console.log("in completed");
      console.log("returning: "+ JSON.stringify(this.event.request.intent));
      // Dialog is now complete and all required slots should be filled,
      // so call your normal intent handler.
      return this.event.request.intent;
    }
}

function getDataFromSAP(pOficinaId, pPeriodoSAP, pFieldsRequestedId, pGrupoArtId, callback){
  var url = "https://gwaas-p1165303trial.hanatrial.ondemand.com/odata/SAP/ZSD_DEMO_ALEXA_VTASV2_SRV;v=1";
  var entitySet = "/VentasSet";
  var format = "&$format=json";
  var version = "";
  var args = {
                headers: { 
                           "Authorization": "Basic amoudGVyYW5AaGFyaW5lcmFkZWx2YWxsZS5jb206Q2NtdDQyNjEk" 
                         }
  };
  
  if (pFieldsRequestedId === "1"){ 
       version = " and Version eq '000'";
  } else if (pFieldsRequestedId === "2") {
       version = " and Version eq '999'";
  } //Si toma valor 3 que significa leer ventas y ppto la version va vacia
  
  console.log("Requested fields " + pFieldsRequestedId + " Version " + version);
  var filtro = "/?$filter=" + escape("Periodo eq '" + pPeriodoSAP + "' and Oficina eq '" + pOficinaId + "' and GrupoArticulos eq '" + pGrupoArtId + "'" + version);

  client = new Client(); 

  console.log("Url: " + url + entitySet + filtro + format);

  client.get(url + entitySet + filtro + format, args, function(data, response){
    var totalSales = 0;
    var totalBudget = 0; 
    console.log(data.d.results);
    data.d.results.forEach(function(data){
      if (data.Version === "000"){
        totalSales = (Number(data.ValorNeto) / 1000000).toFixed(0).toString();
      } else {
        totalBudget = (Number(data.ValorNeto) / 1000000).toFixed(0).toString();
      }
    });  
    callback(totalSales,totalBudget);
  });  
}

function isSlotValid(request, slotName){
        var slot = request.intent.slots[slotName];
        //console.log("request = "+JSON.stringify(request)); //uncomment if you want to see the request
        var slotValue;

        //if we have a slot, get the text and store it into speechOutput
        if (slot && slot.value) {
            //we have a value in the slot
            slotValue = slot.value.toLowerCase();
            return slotValue;
        } else {
            //we didn't get a value in the slot.
            return false;
        }
}