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

    // 'auto' is 'click' for delay tab, and 'clack' for info tab
    // click is more precise, but of lower energy than clack
    this.clickTypeOptions = [ 'auto',  'click',  'clack' ];
    this.clickType = 'auto';

    // for testing purposes
    this.syncActive = true;
  }

  getServerParameters() {
    return {
      active: this.active,
      lookahead: this.lookahead,
      period: this.period,
      number: this.number,
      click: this.clickType,
      sync: this.syncActive
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

    if(typeof params.click !== 'undefined') {
      this.clickType = params.click;
    }
    if(typeof params.sync !== 'undefined') {
      this.syncActive = params.sync;
    }

    // re-broadcast
    this.emitServerParameters();
  }

  emitServerParameters(client) {
    const name = 'calibration:parameters';
    const params = this.getServerParameters();

    if(typeof client === 'undefined') {
      server.broadcast('calibration-control', name, params);
      server.broadcast('calibration', name, params); // sync
    } else {
      client.send(name, params);
    }
  }

  enter(client) {
    super.enter(client);

    this.emitServerParameters(client);

    client.receive('calibration:parameters',
                   (params) => {
                     const activate = !this.active && params.active;
                     this.setServerParameters(params);

                     if(!this.active || this.number === 0) {
                       clearTimeout(this.timeoutID);
                     } else if(activate) {
                       this.click();
                     }
                   } );

    client.receive('calibration:click-type-options-request', () => {
      client.send('calibration:click-type-options', this.clickTypeOptions);
    });


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
    server.broadcast('calibration', 'calibration:click', {
      start: nextClick
    });
  }

}

const performance = new CalibrationServerPerformance();

// default redirection
app.get('/', function(req, res){
  res.redirect('/calibration');
});

debug('launch server on port %s', port);

server.start(app, dir, port);
server.map('calibration', calibration, sync, performance);
server.map('calibration-control', calibration, sync, performance);
