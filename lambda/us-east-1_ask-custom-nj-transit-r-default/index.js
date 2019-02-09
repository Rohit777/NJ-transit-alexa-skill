/* eslint-disable  func-names */
/* eslint-disable  no-console */

const Alexa = require('ask-sdk-core');
const axios = require('axios');

let SELECTED_DRINK = {};
let CURR_STATE = true;


const StationIntentHandler = {
  canHandle(handlerInput) {
    return (handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'StationIntent') ||
      (handlerInput.requestEnvelope.request.type === 'Alexa.Presentation.APL.UserEvent'
          && handlerInput.requestEnvelope.request.arguments.length > 0);
  },
  async handle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    let stationCode;
    let stationName;
    if (request.type  === 'Alexa.Presentation.APL.UserEvent') {
        stationCode = request.arguments[0];
        stationName = request.arguments[1];
    } else {
        stationName = handlerInput.requestEnvelope.request.intent.slots.station.value;
        stationCode = handlerInput.requestEnvelope.request.intent.slots.station.resolutions.resolutionsPerAuthority[0].values[0].value.id;
    }
    
    
    let speechText = '';
    let data ={};

      await axios.get(`http://traindata.njtransit.com:8092/njttraindata.asmx/getTrainScheduleXML?username=%20Spike&password=UWinXbDmBoOMRO&station=${stationCode}`)
      .then(function (response){
        let parseString = require('./node_modules/xml2js').parseString;
        let xml = response.data;
        parseString(xml, function(err, result){

       
          let scheduledDepDateString = result.STATION.ITEMS[0].ITEM[1].SCHED_DEP_DATE[0].split(' ');
          let scheduledDepDate =scheduledDepDateString[1];
          let dest = result.STATION.ITEMS[0].ITEM[1].DESTINATION[0].split(' ');
          let destination = dest[0];
          let trainId = result.STATION.ITEMS[0].ITEM[1].TRAIN_ID[0];
          let fromStationName = result.STATION.STATIONNAME[0];
          
          let stopsNumber = result.STATION.ITEMS[0].ITEM[1].STOPS[0].STOP;
          let stops = [];

          for(var i = 0; i < stopsNumber.length; i++){
            stops[i] = result.STATION.ITEMS[0].ITEM[1].STOPS[0].STOP[i].NAME[0];
          }

          speechText = `the next train from ${stationName} will depart on ${scheduledDepDate} to destination ${destination} and the train number is ${trainId} and it will go from `;

          stops.forEach(function(stop) {
            speechText += `${stop}, `;
          });

          console.log(JSON.stringify(result));
          data = {
            "alexaTrainData":{
              "type": "object",
              "properties":{
                "stationName":fromStationName,
                "schedule":[
                  {
                    "destination":destination,
                    "trainId":trainId,
                    "depDate":scheduledDepDate
                  }
                ]
              }
            }
          };
          if(err) {
             speechText = 'Asked station doesn\'t exist in the transit line. please try again';
          }
       })
      })
      .catch(function (error) {
        console.log(error);
      });
    
    
    
    if(supportsAPL(handlerInput)){
      return handlerInput.responseBuilder
        .speak(speechText)
        .withSimpleCard('NJ Transit',speechText)
        .addDirective({
          type: 'Alexa.Presentation.APL.RenderDocument',
          document: require('./response.json'),
          datasources: data
        })
        .getResponse();
    } else{
      return handlerInput.responseBuilder
        .speak(speechText)
        .withSimpleCard('NJ Transit',speechText)
        .getResponse();
    }
  },
};

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
  },
  handle(handlerInput) {
    const speechText = 'Welcome to the NJ Train Schedule! What train station would you like to hear the schedule for?';

    if (supportsAPL(handlerInput)) {
      return handlerInput.responseBuilder
        .speak(speechText)
        .reprompt(speechText)
        .withSimpleCard('NJ Transit', speechText)  
        .addDirective({
            type: 'Alexa.Presentation.APL.RenderDocument',
            token: "homepage",
            document: require('./request.json'),
            datasources: require('./sampleDatasourceLR.json')
        })
        .getResponse();
    } else {
      return handlerInput.responseBuilder
        .speak(speechText)
        .reprompt(speechText)
        .withSimpleCard('NJ Transit', speechText)
        .getResponse();
    }
  },
};

const DrinkIntentHandler = {
    canHandle(handlerInput) {
      return (handlerInput.requestEnvelope.request.type === 'IntentRequest'
        && handlerInput.requestEnvelope.request.intent.name === 'DrinkIntent') 
        || (handlerInput.requestEnvelope.request.type === 'Alexa.Presentation.APL.UserEvent'
          && handlerInput.requestEnvelope.request.arguments.length > 0
          && handlerInput.requestEnvelope.request.arguments[0] != 'videoEnded');
    },
    handle(handlerInput) {
      const request = handlerInput.requestEnvelope.request;
      let selectedIndex = 0;
      if (request.type  === 'Alexa.Presentation.APL.UserEvent') {
        selectedIndex = parseInt(request.arguments[0]);
      } else {
        selectedIndex = handlerInput.requestEnvelope.request.intent.slots.drink.resolutions.resolutionsPerAuthority[0].values[0].value.id;
      }
  
      SELECTED_DRINK = POPULAR_TRAINS[selectedIndex];
      
      const speechText = "To make a " 
          + SELECTED_DRINK.name + ", "
          + SELECTED_DRINK.recipe;
  
      if (supportsAPL(handlerInput)) {
        return handlerInput.responseBuilder
          .speak(speechText)
          .reprompt(speechText)
          .withSimpleCard('Mixing Drinks', speechText)  
          .addDirective({
              type: 'Alexa.Presentation.APL.RenderDocument',
              token: "VideoPlayerToken",
              document: require('./drink.json'),
              datasources: {}
          })
          .getResponse();
      } else {
        return handlerInput.responseBuilder
          .speak(speechText)
          .reprompt("What other drink do you want to learn about?")
          .withSimpleCard('Mixing Drinks', speechText)
          .getResponse();
      }
    },
  };  

const HelpIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
    const speechText = 'Ask me to show you the next train for the train station you would like to learn about.';

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .withSimpleCard('Ask me to show you the next train for the train station you would like to learn about.', speechText)
      .getResponse();
  },
};

const CancelAndStopIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.CancelIntent'
        || handlerInput.requestEnvelope.request.intent.name === 'AMAZON.StopIntent');
  },
  handle(handlerInput) {
    const speechText = 'Goodbye!';

    return handlerInput.responseBuilder
      .speak(speechText)
      .withSimpleCard('Thank you for using the skill, come back the next time you need the train time.', speechText)
      .getResponse();
  },
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    console.log(`Session ended with reason: ${handlerInput.requestEnvelope.request.reason}`);

    return handlerInput.responseBuilder.getResponse();
  },
};

const ErrorHandler = {
    canHandle() {
      return true;
    },
    handle(handlerInput, error) {
      console.log("WHOLE ERROR" + JSON.stringify(error));
      console.log(`Error handled: ${error.message}`);
  
      return handlerInput.responseBuilder
        .speak('Sorry, I can\'t understand the command. Try saying a city name like Woodbridge, Westwood, or Emerson.')
        .reprompt('Sorry, I can\'t understand the command. Please say again.')
        .getResponse();
    },
  };
  
  function supportsAPL(handlerInput) {
      const supportedInterfaces = handlerInput.requestEnvelope.context.System.device.supportedInterfaces;
      const aplInterface = supportedInterfaces['Alexa.Presentation.APL'];
      return aplInterface != null && aplInterface != undefined;
  }
  
const skillBuilder = Alexa.SkillBuilders.custom();

exports.handler = skillBuilder
  .addRequestHandlers(
    LaunchRequestHandler,
    StationIntentHandler,
    DrinkIntentHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler,
    SessionEndedRequestHandler
  )
  .addErrorHandlers(ErrorHandler)
  .lambda();

  const POPULAR_TRAINS = [
    {
      "name": "New York Penn Station",
    },
    {
      "name": "Metropark Station",
    },
    {
      "name": "Newark Penn Station",
    },
  ];