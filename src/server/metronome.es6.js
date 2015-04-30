'use strict';

let e = {};

e.Metronome = class {

  constructor(callback) {
    this.active = true;
    this.number = -1;
    this.timeoutID = 0; // to cancel setTimeout
    this.nextClick = 0; // absolute time; in seconds
    this.period = 1; // in seconds
    this.tickDuration = 0.025; // second
    this.callback = callback;
  }

  tick() {
  if(serverParams.active && serverParams.number !== 0) {

    clearTimeout(metroParams.timeoutID);
    debugger;
    var now = getSyncTime();

    if(metroParams.nextClick < now + serverParams.delay) {
      -- serverParams.number;

      // too late
      if(metroParams.nextClick < now) {
        console.log('too late by ' + (now -metroParams.nextClick) + ' s');
        // good restart from now
        metroParams.nextClick +=
          Math.ceil((now - metroParams.nextClick) / metroParams.period) *
          metroParams.period;

        // next one might be soon: look ahead
        if(metroParams.nextClick < now + serverParams.delay) {
          -- serverParams.number;
          console.log('soon in ' + (metroParams.nextClick - now) + ' s');
          clickEmit(metroParams.nextClick);
          metroParams.nextClick += metroParams.period;
        }
      } else {
        console.log('trigger ' + metroParams.nextClick +
                    ' (in ' + (metroParams.nextClick - now) + ' s)');
        clickEmit(metroParams.nextClick);
        metroParams.nextClick += metroParams.period;
      }
      
      
    } // within look-ahead

    // set new timeout
    if (serverParams.number !== 0) {
      metroParams.timeoutID = setTimeout(click, metroParams.tickDuration * 1000);
    } else {
      serverParams.active = false;
    }  
  }
  
  // TODO: limit broadcast to control clients
  io.emit('server-params', serverParams);

  }

};


module.exports = exports = e;
