/* eslint-disable  func-names */
/* eslint-disable  no-console */

const Alexa = require('ask-sdk-core');
const axios = require('axios');

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
  },
  handle(handlerInput) {
    const speechText = 'Welcome to the NJ Transit, you can ask me about the next trains at a station. Which stations next train would you like to know about?';

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .withSimpleCard('NJ Transit', speechText)
      .getResponse();
  },
};

const StationIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'StationIntent';
  },
  async handle(handlerInput) {
    const stationName = handlerInput.requestEnvelope.request.intent.slots.station.value;
    const stationCode = handlerInput.requestEnvelope.request.intent.slots.station.resolutions.resolutionsPerAuthority[0].values[0].value.id;
    let speechText = '';
    
    await axios.get(`http://traindata.njtransit.com:8092/njttraindata.asmx/getTrainScheduleXML19Rec?username=%20Spike&password=UWinXbDmBoOMRO&station=${stationCode}`)
      .then(function (response){
        let parseString = require('./node_modules/xml2js').parseString;
        let xml = response.data;
        parseString(xml, function(err, result){
          let scheduledDepDate = result.STATION.ITEMS[0].ITEM[0].SCHED_DEP_DATE[0];
          let destination = result.STATION.ITEMS[0].ITEM[0].DESTINATION[0];
          let trainId = result.STATION.ITEMS[0].ITEM[0].TRAIN_ID[0];
          let scheduledDepDate1 = result.STATION.ITEMS[1].ITEM[0].SCHED_DEP_DATE[0];
          let destination1 = result.STATION.ITEMS[1].ITEM[0].DESTINATION[0];
          let trainId1 = result.STATION.ITEMS[1].ITEM[0].TRAIN_ID[0];
          let scheduledDepDate2 = result.STATION.ITEMS[2].ITEM[0].SCHED_DEP_DATE[0];
          let destination2 = result.STATION.ITEMS[2].ITEM[0].DESTINATION[0];
          let trainId2 = result.STATION.ITEMS[2].ITEM[0].TRAIN_ID[0];

              speechText = `the next train from ${stationName} will depart on ${scheduledDepDate}, ${scheduledDepDate1}, ${scheduledDepDate2}  and it will go to ${destination}, ${destination1}, ${destination2} and the train number is ${trainId}, ${trainId1}, ${trainId2} `;
          if(err) {
             speechText = 'Asked station doesn\'t exist in the transit line. please try again';
          }
        })
      })
      .catch(function (error) {
        console.log(error)
      });

    return handlerInput.responseBuilder
      .speak(speechText)
      .withSimpleCard('NJ Transit', speechText)
      .getResponse();
  },
};

const HelpIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
    const speechText = 'You can say hello to me!';

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .withSimpleCard('Hello World', speechText)
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
      .withSimpleCard('Hello World', speechText)
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
    console.log(`Error handled: ${error.message}`);

    return handlerInput.responseBuilder
      .speak('Sorry, I can\'t understand the command. Please say again.')
      .reprompt('Sorry, I can\'t understand the command. Please say again.')
      .getResponse();
  },
};

const skillBuilder = Alexa.SkillBuilders.custom();

exports.handler = skillBuilder
  .addRequestHandlers(
    LaunchRequestHandler,
    StationIntentHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler,
    SessionEndedRequestHandler
  )
  .addErrorHandlers(ErrorHandler)
  .lambda();
