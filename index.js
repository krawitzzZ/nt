var WS = require('websocket').w3cwebsocket;
var client = new WS('ws://nuclear.t.javascript.ninja');

var state = {
  levers: [undefined, undefined, undefined, undefined],
  stateId: 0
};

var TURNED_OFF = 0; // our supposition. it can be either 0 or 1
var isFirstPull = true;
var firstTryLeverPosition;
var checkingLever;
var knownLever;

client.onopen = function() {
  console.log('Connected to Caitlin.');
  console.log();
};

client.onerror = function(error) {
  console.log('Error to connect to Caitlin. Try restart the app.');
  console.error(error);
  process.exit(0);
};

client.onmessage = function(event) {
  var msg = parseMessage(event.data);

  if (msg.hasOwnProperty('pulled')) {
    updateState(msg.pulled, msg.stateId);
    console.log('Wait for it...');
    console.log(state);
    console.log();

    if (isAllLeversSame()) {
      turnCaitlinOff(state.stateId);
    }

    var undefinedLever = state.levers.indexOf(undefined);

    if (undefinedLever !== -1) {
      checkingLever = undefinedLever;
      checkStatus(knownLever, checkingLever, state.stateId);
    }

    return;
  }

  if (msg.hasOwnProperty('action')) {
    updateStateAfterCheck(knownLever, checkingLever, msg.same);

    return;
  }

  if (msg.hasOwnProperty('newState') && !msg.hasOwnProperty('token')) {
    console.log('Ah! We were wrong! Let\'s try with opposite levers position!');
    console.log();

    return;
  }

  console.log('Congratulations!!! You did it! You saved us!');
  console.log('Received token: ', msg.token);
  process.exit(0);
};

function updateState(lever, stateId) {
  if (isFirstPull) {
    state.levers[lever] = TURNED_OFF;
    isFirstPull = false;
    knownLever = lever;
  }

  if (typeof state.levers[lever] !== 'undefined') {
    state.levers[lever] = Number(!state.levers[lever]);
  }

  state.stateId = stateId;
}

function checkStatus(lever1, lever2, stateId) {
  var message = {
    action: 'check',
    lever1: lever1,
    lever2: lever2,
    stateId: stateId
  };

  client.send(JSON.stringify(message));
}

function updateStateAfterCheck(pulledLever, checkedLever, isSame) {
  if (isSame) {
    state.levers[checkedLever] = state.levers[pulledLever];
    return;
  }

  state.levers[checkedLever] = Number(!state.levers[pulledLever]);
}

function turnCaitlinOff(stateId) {
  var currentTryLeverPosition = state.levers[0];

  if (firstTryLeverPosition === currentTryLeverPosition) {
    console.log('No.. We must try to turn it off in another levers position.');
    console.log();
    return;
  }

  firstTryLeverPosition = currentTryLeverPosition;
  var message = {
    action: 'powerOff',
    stateId: stateId
  };

  console.log('Gotcha!!');
  console.log();
  client.send(JSON.stringify(message));
}

function isAllLeversSame() {
  var allTurnedOff = state.levers.every(function(lever) {
    return lever === TURNED_OFF;
  });

  var allTurnedOn = state.levers.every(function(lever) {
    return lever === Number(!TURNED_OFF);
  });

  return allTurnedOff || allTurnedOn;
}

function parseMessage(data) {
  var parsedData;
  try {
    parsedData = JSON.parse(data);
  } catch (err) {
    console.log('Error to parse JSON data. Please restart the app.');
    process.exit(0);
  }

  return parsedData;
}
