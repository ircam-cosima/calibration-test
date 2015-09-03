'use strict';

const debug = require('debug')('soundworks:calibration');

// Express application
const express = require('express');
const app = express();
const port = process.env.PORT || 8888;
const path = require('path');
const dir = path.join(__dirname, '../../public');

// Soundworks library
const serverSide = require('soundworks/server');
const server = serverSide.server;
const calibration = new serverSide.Calibration( {
  persistent: {
    path: path.join(__dirname, '../../data'),
    file: 'calibration.json'
  }
});
const sync = new serverSide.Sync();

class CalibrationServerPerformance extends serverSide.Performance {
  constructor() {
    super();

    // static strings
    CalibrationServerPerformance.serverParametersName =
      'performance:server-params';

    // click
    this.active = true; // run by default
    this.lookahead = 1; // second
    this.period = 1; // second
    this.number = -1; // -1 for infinite, >0 for finite count

    // scheduler
    this.timeoutID = 0; // to cancel setTimeout
    this.nextClick = 0; // absolute time, in seconds
    this.tickDuration = 0.025; // seconds

    // run by default
    this.click();
  }

  getServerParameters() {
    return {
      active: this.active,
      lookahead: this.lookahead,
      period: this.period,
      number: this.number
    };
  }

  setServerParameters(params) {
    if(typeof params.active !== 'undefined') {
      this.active = params.active;
    }
    if(typeof params.lookahead !== 'undefined') {
      this.lookahead = params.lookahead;
    }
    if(typeof params.period !== 'undefined') {
      this.period = params.period;
    }
    if(typeof params.number !== 'undefined') {
      this.number = params.number;
    }

    // re-broadcast
    this.emitServerParameters();
  }

  emitServerParameters(client) {
    const name = CalibrationServerPerformance.serverParametersName;
    const params = this.getServerParameters();

    if(typeof client === 'undefined') {
      server.broadcast('control', name, params);
    } else {
      client.send(name, params);
    }
  }

  enter(client) {
    super.enter(client);

    if(client.type === 'control') {
      this.emitServerParameters(client);
    }

    client.receive(CalibrationServerPerformance.serverParametersName,
                   (params) => {
                     const activate = !this.active && params.active;
                     this.setServerParameters(params);

                     if(!this.active || this.number === 0) {
                       clearTimeout(this.timeoutID);
                     } else if(activate) {
                       this.click();
                     }
                   } );
  }

  click() {
    if(this.active && this.number !== 0) {

      clearTimeout(this.timeoutID);
      const now = sync.getSyncTime();

      if(this.nextClick < now + this.lookahead) {
        --this.number;

        // too late
        if(this.nextClick < now) {
          debug('too late by %s s', now - this.nextClick);
          // good restart from now
          this.nextClick +=
            Math.ceil((now - this.nextClick) / this.period) * this.period;

          // next one might be soon: look ahead
          if(this.nextClick < now + this.lookahead) {
            --this.number;
            debug('soon in %s s', this.nextClick - now);
            this.clickEmit(this.nextClick);
            this.nextClick += this.period;
          }
        } else {
          debug('trigger %s (in %s s)', this.nextClick, this.nextClick - now);
          this.clickEmit(this.nextClick);
          this.nextClick += this.period;
        }
      } // within look-ahead

      // set new timeout
      if (this.number !== 0) {
        this.timeoutID = setTimeout( () => { this.click(); },
                                     this.tickDuration * 1000);
      } else {
        this.active = false;
      }

    }

  }

  clickEmit(nextClick) {
    server.broadcast('player', 'performance:click', {
      start: nextClick
    });
  }

}

const performance = new CalibrationServerPerformance();

debug('launch server on port %s', port);

server.start(app, dir, port);
server.map('player', calibration, sync, performance);
