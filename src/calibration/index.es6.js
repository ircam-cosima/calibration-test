'use strict';

let app = window.app || {};

app.debug = require('debug')('soundworks:calibration');
app.platform = require('platform');

app.clientSide = require('soundworks/client');
app.client = app.clientSide.client;

app.audio = require('../common/audio');
app.dom = require('./dom');

app.localStorage = {};
app.localStorage.prefix = 'soundworks-calibration.';
app.localStorage.enabled = typeof window.localStorage !== 'undefined';
if(app.localStorage.enabled) {
  try {
    window.localStorage[app.localStorage.prefix + 'storage-enabled'] = true;
    window.localStorage.removeItem(app.localStorage.prefix + 'storage-enabled');
  } catch (error) {
    app.localStorage.enabled = false;
  }
}

// Initialise the client with its type
// ('player' clients connect via the root URL)
app.client.init('player');

class CalibrationClient extends app.clientSide.Performance {
  /**
   * @constructs CalibrationClient
   * @param {Object} sync
   * @param {Object} options
   */
  constructor(sync, options = {}) {
    super(options);

    this.sync = sync;
    this.syncStatus = 'new';
    this.synth = new app.audio.Synth(sync);

    this.userAgent = app.platform.ua;

    this.audio = {};
    this.audio.active = true;
    this.audio.type = 'clack';
    this.audio.outputs = ['internal', 'external'];
    this.audio.output = this.audio.outputs[0];
    this.audio[this.audio.output] = {};

    this.network = {};
    this.networkStatus = 'offline';

    this.display = {};

    this.display.audio = {};
    this.display.audio.active = new app.dom.Toggle( {
      DOMOrigin: this.view,
      DOMClass: 'audio-active',
      text: 'Audio',
      setter: (value) => { this.audio.active = value; },
      getter: () => { return this.audio.active; }
    } );
    this.display.audio.output = new app.dom.Select( {
      DOMOrigin: this.view,
      DOMClass: 'audio-output',
      options: this.audio.outputs,
      setter: (value) => {
        this.audio.output = value;
        if(typeof this.audio[this.audio.output] === 'undefined') {
          this.audio[this.audio.output] = {};
        }
        this.display.delayCalibration.update();
        this.display.gainCalibration.update();
      },
      getter: () => { return this.audio.output; }
    } );

    this.display.syncMinimalElement = app.dom.createSyncMinimalElement(this.view);
    this.display.syncReportElement = app.dom.createSyncReportElement(this.view);

    this.display.userAgent = new app.dom.Text( {
      DOMOrigin: this.view,
      DOMClass: 'user-agent',
      text: this.userAgent
    } );

    this.display.infoElement = app.dom.createInfoElement( {
      DOMOrigin: this.view,
      validation: () => { this.navigationUpdate('delay'); }
    } );

    this.display.delayCalibration = new app.dom.DelayCalibration( {
      DOMOrigin: this.view,
      setter: (value) => {
        // compensation is the opposite of intrinsic vale
        // (compensation in the interface; intrisic in this.audio)
        // interface is in milliseconds
        this.audio[this.audio.output].delay = -value * 1e-3;
      },
      getter: () => {
        // compensation is the opposite of intrinsic vale
        // (compensation in the interface; intrisic in this.audio)
        // interface is in milliseconds
        return (typeof this.audio[this.audio.output].delay !== 'undefined'
                ? -this.audio[this.audio.output].delay * 1e3
                : 0);
      },
      validation: () => { this.navigationUpdate('gain'); }
    } );

    this.display.gainCalibration = new app.dom.GainCalibration( {
      DOMOrigin: this.view,
      setter: (value) => {
        // compensation is the opposite of intrinsic vale
        // (compensation in the interface; intrisic in this.audio)
        // interface is in dB
        this.audio[this.audio.output].gain = -value;
      },
      getter: () => {
        // compensation is the opposite of intrinsic vale
        // (compensation in the interface; intrisic in this.audio)
        // interface is in dB
        return (typeof this.audio[this.audio.output].gain !== 'undefined'
                ? -this.audio[this.audio.output].gain
                : 0);
      },
      validation: () => { this.navigationUpdate('validation'); }
    } );

    this.display.validationElement = app.dom.createGlobalValidationElement( {
      DOMOrigin: this.view,
      text: 'Validate calibration',
      validation: () => {
        this.save();
        app.dom.updateGlobalValidationElement(this.view, true, false);
      }
    } );

    this.display.restoreElement = app.dom.createRestoreElement( {
      DOMOrigin: this.view,
      text: 'Restore calibration',
      validation: () => {
        this.restore();
        this.navigationUpdate('delay');
      }
    } );

    this.display.navigation = new app.dom.ExclusiveToggles( {
      DOMOrigin: this.view,
      DOMClass: 'navigation',
      options: ['details', 'info', 'delay', 'gain',
                'validation', 'restore'],
      value: 'info',
      setter: (value) => { this.navigationUpdate(value); },
      getter: () => { return this.navigation; }
    } );

    this.sync.on('sync:status', (report) => {
      if(typeof report !== 'undefined') {
        app.dom.updateSyncMinimalElement(this.display.syncMinimalElement, report);
        app.dom.updateSyncReportElement(this.display.syncReportElement, report);

        if(typeof report.status !== 'undefined') {
          this.syncStatus = report.status;
        }

        if(typeof report.connection !== 'undefined') {
          this.networkStatus = report.connection;
        }

        if(typeof report.travelDuration !== 'undefined') {
          this.network.delay = report.travelDuration;
        }
        if(typeof report.travelDurationMax !== 'undefined') {
          this.network.delayMax = report.travelDurationMax;
        }

        const ready = (this.syncStatus === 'sync'
                       && this.networkStatus === 'online');
        app.dom.updateValidationElements(this.view, ready);
      }
    });

    app.client.receive('performance:click', (params) => {
      if( (this.syncStatus === 'sync' || this.syncStatus === 'training')
          && this.audio.active && typeof params !== 'undefined') {

        let audioType = this.audio.type;
        let duration; // undefined is fine
        const timeLeft = params.start - this.sync.getSyncTime();
        if(timeLeft > 0) {
          app.debug('play %s in %s s', audioType, timeLeft);
        } else {
          audioType = 'noise';
          duration = 0.1;
          app.debug('too late by %s s', -timeLeft);
        }

        // compensate delay and gain
        this.synth.play( {
          type: audioType,
          start: params.start
            - (typeof this.audio[this.audio.output].delay !== 'undefined'
               ? this.audio[this.audio.output].delay : 0),
          gain: 0
            - (typeof this.audio[this.audio.output].gain !== 'undefined'
               ? this.audio[this.audio.output].gain : 0),
          duration: duration
        } );
      }
    });

    app.client.receive('performance:client-calibration', (params) => {
      this.restore(params);
    });

  }

  navigationUpdate(navigation) {
    if(typeof navigation !== 'undefined') {
      this.navigation = navigation;
      // not defined at init
      if(typeof this.display.navigation !== 'undefined') {
        this.display.navigation.update();
      }
    }

    if(this.navigation === 'details') {
      this.display.syncReportElement.style.display = '';
      this.display.userAgent.element.style.display = '';
    } else {
      this.display.syncReportElement.style.display = 'none';
      this.display.userAgent.element.style.display = 'none';
    }

    if(this.navigation === 'info') {
      this.audio.type = 'clack';
      this.display.infoElement.style.display = '';
    } else {
      this.display.infoElement.style.display = 'none';
    }

    if(this.navigation === 'delay') {
      this.audio.type = 'click';
      this.display.delayCalibration.element.style.display = '';
    } else {
      this.display.delayCalibration.element.style.display = 'none';
    }

    if(this.navigation === 'gain') {
      this.audio.type = 'noise';
      this.display.gainCalibration.element.style.display = '';
    } else {
      this.display.gainCalibration.element.style.display = 'none';
    }

    if(this.navigation === 'validation') {
      const ready = (this.syncStatus === 'sync'
                     && this.networkStatus === 'online');
      app.dom.updateGlobalValidationElement(this.view, false, ready);

      this.audio.type = 'click';
      this.display.validationElement.style.display = '';
    } else {
      this.display.validationElement.style.display = 'none';
    }

    if(this.navigation === 'restore') {
      this.audio.type = 'clack';
      this.display.restoreElement.style.display = '';
    } else {
      this.display.restoreElement.style.display = 'none';
    }

  }

  /**
   * Store calibration on server, and locally.
   *
   * @function CalibrationClient~save
   */
  save() {
    const params = {};
    for(let o of this.audio.outputs) {
      if(typeof this.audio[o] !== 'undefined') {
        if(typeof params.audio === 'undefined') {
          params.audio = {};
        }
        params.audio[o] = this.audio[o];
      }
    }
    params.network = this.network;

    const keys = ['audio', 'network'];
    if(app.localStorage.enabled) {
      try {
        for(let k of keys) {
          if(typeof params[k] !== 'undefined') {
            window.localStorage[app.localStorage.prefix + k]
              = JSON.stringify(params[k]);
          }
        }
      } catch (error) {
        console.log(error.message);
        app.localStorage.enabled = false;
      }
    }

    app.client.send('performance:client-calibration-store', {
      userAgent: this.userAgent,
      audio: params.audio,
      network: params.network
    } );
  }

  /**
   * Restore calibration from local storage, or from server.
   *
   * Do not restore network statistics (which are stored).
   *
   * @function CalibrationClient~restore
   * @param {Object} restoreParams if undefined, get the values from
   * the local storage, or the server.
   * @param {Object} restoreParams.audio
   * @param {Object} restoreParams.audio.internal internal speaker
   * @param {Object} restoreParams.audio.internal.delay in seconds
   * @param {Object} restoreParams.audio.internal.gain in dB
   * @param {Object} restoreParams.audio.external external audio output
   * @param {Object} restoreParams.audio.external.delay in seconds
   * @param {Object} restoreParams.audio.external.gain in dB
   *
   */
  restore(restoreParams) {
    if(typeof restoreParams !== 'undefined') {
      // actually restore from given parameters

      if(typeof restoreParams.audio !== 'undefined') {
        for(let o of this.audio.outputs) {
          if(restoreParams.audio.hasOwnProperty(o) ) {
            this.audio[o] = restoreParams.audio[o];
          }
        }
        this.display.delayCalibration.update();
        this.display.gainCalibration.update();
      }
    } else {
      // get parameters from localStorage, or from server

      let params = {};
      // retrieve from local storage first
      let localStorageUsed = false;
      if(app.localStorage.enabled
         && typeof window.localStorage[app.localStorage.prefix + 'audio']
         !== 'undefined') {
        localStorageUsed = true;
        params.audio = JSON.parse(window.localStorage[app.localStorage.prefix + 'audio']);

        this.restore(params);
      }

      if(!localStorageUsed) {
        app.client.send('performance:client-calibration-request', {
          userAgent: this.userAgent
        });
      }

    }
  }
}

app.init = function () {
  const welcome = new app.clientSide.Dialog({
    id: 'welcome',
    text: '<p>Welcome to <b>Calibration</b>.</p> <p>Touch the screen to start.</p>',
    activateAudio: true
  });

  app.sync = new app.clientSide.Sync();
  app.performance = new CalibrationClient(app.sync);

  // Start the scenario and link the modules
  app.client.start(
    app.client.serial(
      welcome,
      app.sync, // init the sync process
      app.performance // when all of them are done, we launch the performance
    )
  );

};

window.app = app;

window.addEventListener('DOMContentLoaded', () => {
  app.init();
});
