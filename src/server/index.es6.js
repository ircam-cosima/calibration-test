'use strict';

const debug = require('debug')('soundworks:calibration');

// Express application
const express = require('express');
const app = express();
const port = process.env.PORT || 8888;
const path = require('path');
const dir = path.join(__dirname, '../../public');

// Persistent data
const fs = require('fs');
const pjson = require('../../package.json'); // version
const persistentPath = path.join(__dirname, '../../data');
const persistentFile = path.join(persistentPath, 'web-audio-calibration.json');
const persistentFileEncoding = 'utf8';
let persistentData = {};

try {
  fs.mkdirSync(persistentPath);
  console.log('Creating data directory: ' + persistentPath);
} catch (error) {
  if(error.code === 'EEXIST') {
    console.log('Using existing data directory: ' + persistentPath);
  }
  else {
    console.log('Error creating data directory: ' + persistentPath);
  }
}

try {
  const data = fs.readFileSync(persistentFile, persistentFileEncoding);
  persistentData = JSON.parse(data);
} catch (error) {
  if(error.code === 'ENOENT') {
    console.log('Creating new persistent file: ' + persistentFile);
  } else {
    console.log('Error while reading persistent file: ' + error);
  }
}
persistentData[pjson.name + '.version'] = pjson.version;


// Soundworks library
const serverSide = require('soundworks/server');
const server = serverSide.server;
const sync = new serverSide.Sync();

const string = require('../common/string');

class CalibrationServerPerformance extends serverSide.Performance {
  constructor() {
    super();

    // static strings
    CalibrationServerPerformance.serverParametersName =
      'performance:server-params';
    CalibrationServerPerformance.clientParametersName =
      'performance:client-calibration';
    CalibrationServerPerformance.clientParametersStoreName =
      CalibrationServerPerformance.clientParametersName
      + '-store';
    CalibrationServerPerformance.clientParametersRequestName =
      CalibrationServerPerformance.clientParametersName
      + '-request';

    this.levenshtein = new string.Levenshtein();

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
  }

  emitServerParameters(client) {
    const name = CalibrationServerPerformance.serverParametersName;
    const params = this.getServerParameters();

    if(typeof client === 'undefined') {
      server.broadcast('control', name, params);
      server.broadcast('player', name, params);
    } else {
      client.send(name, params);
    }
  }

  enter(client) {
    super.enter(client);

    this.emitServerParameters(client);

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

    client.receive(
      CalibrationServerPerformance.clientParametersStoreName,
      (params) => {
        debug(CalibrationServerPerformance.clientParametersStoreName,
              params);
        if(typeof params !== 'undefined'
           && typeof params.userAgent !== 'undefined') {
          const date = new Date();
          let writeFile = false;

          if(typeof params.audio !== 'undefined')
          {
            writeFile = true;
            if(typeof persistentData[params.userAgent] === 'undefined') {
              persistentData[params.userAgent] = {};
            }

            if(typeof persistentData[params.userAgent].audio === 'undefined') {
              persistentData[params.userAgent].audio = {};
            }
            // outputs = ['internal', 'external']
            for(let output in params.audio) {
              if(params.audio.hasOwnProperty(output) ) {

                if(typeof persistentData[params.userAgent].audio[output]
                   === 'undefined') {
                  persistentData[params.userAgent].audio[output] = [];
                }

                persistentData[params.userAgent].audio[output]
                  .push([date.toISOString(), params.audio[output] ] );

                console.log(date.toISOString());
                console.log(params.userAgent);
                console.log(params.audio.output);
              }
            }
          }

          if(typeof params.network !== 'undefined')
          {
            writeFile = true;
            if(typeof persistentData[params.userAgent] === 'undefined') {
              persistentData[params.userAgent] = {};
            }

            if(typeof persistentData[params.userAgent].network === 'undefined') {
              persistentData[params.userAgent].network = [];
            }
            persistentData[params.userAgent].network
              .push([date.toISOString(), params.network]);

            console.log(date.toISOString());
            console.log(params.userAgent);
            console.log(params.network);
          }

          if(writeFile) {
            fs.writeFile(persistentFile, JSON.stringify(persistentData) );
          }
        }
      });

    client.receive(
      CalibrationServerPerformance.clientParametersRequestName,
      (params) => {

        if(typeof persistentData !== 'undefined'
           && typeof params !== 'undefined'
           && typeof params.userAgent !== 'undefined') {
          const closest = this.levenshtein.closestKey(persistentData,
                                                      params.userAgent);

          debug('%s -> %s (%s)',
                params.userAgent, closest.key, closest.distance);
          // upper bound on closest.distance?
          const data = persistentData[closest.key];
          if(typeof data !== 'undefined') {
            let calibration = {};
            let sendCalibration = false;
            if(typeof data.audio !== 'undefined') {
              // outputs = ['internal', 'external']
              for(let output in data.audio) {
                if(data.audio.hasOwnProperty(output) ) {
                  sendCalibration = true;
                  if(typeof calibration.audio === 'undefined') {
                    calibration.audio = {};
                  }
                  // retrieve last value
                  calibration.audio[output]
                    = data.audio[output].slice(-1)[0][1];
                }
              }
            }

            if(typeof data.network !== 'undefined') {
              sendCalibration = true;
              calibration.network = data.network.slice(-1)[0][1];
            }

            if(sendCalibration) {
              client.send(CalibrationServerPerformance.clientParametersName,
                          calibration);
            }
          }
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

    this.emitServerParameters();
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
server.map('player', sync, performance);
server.map('control', sync, performance);
