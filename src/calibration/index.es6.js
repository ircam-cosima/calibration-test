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

class CalibrationClientPerformance extends app.clientSide.Performance {
  /**
   * @constructs CalibrationClient
   * @param {Object} options passed to clientSide.Performance
   */
  constructor(options = {}) {
    super(options);
    const that = this;

    this.calibration = new app.clientSide.Calibration( {
      updateFunction: () => { that.calibrationUpdated(); }
    });
    this.sync = new app.clientSide.Sync();
    this.syncStatus = 'new';
    this.synth = new app.audio.Synth(this.sync);

    this.userAgent = app.platform.ua;

    this.audio = {};
    this.audio.active = true;
    this.audio.type = 'clack';
    this.audio.compensation = {
      delay: 0,
      gain: 0
    };

    this.network = {};
    this.networkStatus = 'offline';

    this.display = {};

    this.display.audio = {};
    this.display.audio.active = new app.dom.Toggle( {
      DOMOrigin: this.view,
      DOMClass: 'audio-active',
      text: 'Audio',
      setter: (value) => { that.audio.active = value; },
      getter: () => { return that.audio.active; }
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
      validation: () => { that.navigationUpdate('delay'); }
    } );

    this.display.delayCalibration = new app.dom.DelayCalibration( {
      DOMOrigin: this.view,
      setter: (value) => {
        // compensation is the opposite of intrinsic vale
        // (compensation in the interface; intrisic in this.audio)
        // interface is in milliseconds, 1 digit precision
        that.audio.compensation.delay = 0.1 * Math.round(10 * -value) * 1e-3;
      },
      getter: () => {
        // compensation is the opposite of intrinsic vale
        // (compensation in the interface; intrisic in this.audio)
        // interface is in milliseconds
        return -that.audio.compensation.delay * 1e3;
      },
      validation: () => { that.navigationUpdate('gain'); }
    } );

    this.display.gainCalibration = new app.dom.GainCalibration( {
      DOMOrigin: this.view,
      setter: (value) => {
        // compensation is the opposite of intrinsic vale
        // (compensation in the interface; intrisic in this.audio)
        // interface is in dB, 1 digit precision
        that.audio.compensation.gain = 0.1 * Math.round(10 * -value);
      },
      getter: () => {
        // compensation is the opposite of intrinsic vale
        // (compensation in the interface; intrisic in this.audio)
        // interface is in dB
        return -that.audio.compensation.gain;
      },
      validation: () => { that.navigationUpdate('validation'); }
    } );

    this.display.validationElement = app.dom.createGlobalValidationElement( {
      DOMOrigin: this.view,
      text: 'Validate calibration',
      validation: () => {
        that.save();
      }
    } );

    this.display.restoreElement = app.dom.createRestoreElement( {
      DOMOrigin: this.view,
      text: 'Restore calibration',
      validation: () => {
        that.load();
        that.navigationUpdate('delay');
      }
    } );

    this.display.navigation = new app.dom.ExclusiveToggles( {
      DOMOrigin: this.view,
      DOMClass: 'navigation',
      options: ['details', 'info', 'delay', 'gain',
                'validation', 'restore'],
      value: 'info',
      setter: (value) => { that.navigationUpdate(value); },
      getter: () => { return that.navigation; }
    } );

    this.sync.on('sync:status', (report) => {
      if(typeof report !== 'undefined') {
        app.dom.updateSyncMinimalElement(that.display.syncMinimalElement, report);
        app.dom.updateSyncReportElement(that.display.syncReportElement, report);

        if(typeof report.status !== 'undefined') {
          that.syncStatus = report.status;
        }

        if(typeof report.connection !== 'undefined') {
          that.networkStatus = report.connection;
        }

        if(typeof report.travelDuration !== 'undefined') {
          that.network.delay = report.travelDuration;
        }
        if(typeof report.travelDurationMax !== 'undefined') {
          that.network.delayMax = report.travelDurationMax;
        }

        const ready = (that.syncStatus === 'sync'
                       && that.networkStatus === 'online');
        app.dom.updateValidationElements(that.view, ready);
      }
    });

    app.client.receive('performance:click', (params) => {
      if( (that.syncStatus === 'sync' || that.syncStatus === 'training')
          && that.audio.active && typeof params !== 'undefined') {

        let audioType = that.audio.type;
        let duration; // undefined is fine
        const timeLeft = params.start - that.sync.getSyncTime();
        if(timeLeft > 0) {
          app.debug('play %s in %s s', audioType, timeLeft);
        } else {
          audioType = 'noise';
          duration = 0.1;
          app.debug('too late by %s s', -timeLeft);
        }

        // compensate delay and gain
        that.synth.play( {
          type: audioType,
          start: params.start - that.audio.compensation.delay,
          gain: -that.audio.compensation.gain,
          duration: duration
        } );
      }
    });

    app.client.receive('performance:client-calibration', (params) => {
      that.set(params);
    });

  }

  /**
   * Start the performance module, and restore the calibration.
   */
  start() {
    super.start();
    this.load();
  }

  /**
   * Select the current view.
   *
   * @param {String} navigation
   */
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
    this.calibration.set( {
      audio: this.audio.compensation,
      network: this.network
    } );
    this.calibration.save();
  }

  /**
   * Set calibration with given values.
   *
   * Do not set network statistics (even when provided).
   *
   * @function CalibrationClient~set
   * @param {calibration} params
   */
  set(params) {
    if(typeof params !== 'undefined'
       && typeof params.audio !== 'undefined') {
      this.audio.compensation = params.audio;
      this.display.delayCalibration.update();
      this.display.gainCalibration.update();
    }
  }


  /**
   * Load previous calibration.
   */
  load() {
    this.calibration.load();
    this.set(this.calibration.get() );
  }

  calibrationUpdated() {
    const update = this.calibration.get();
    if(typeof update.audio !== 'undefined') {
      this.audio.compensation = update.audio;
      this.display.delayCalibration.update();
      this.display.gainCalibration.update();
    }
  }
}

app.init = function () {
  const welcome = new app.clientSide.Dialog({
    id: 'welcome',
    text: '<p>Welcome to <b>Calibration</b>.</p> <p>Touch the screen to start.</p>',
    activateAudio: true
  });

  app.performance = new CalibrationClientPerformance();

  // Start the scenario and link the modules
  app.client.start(
    app.client.serial(
      welcome,
      app.performance.calibration, // calibration set-up
      app.performance.sync, // init the sync process
      app.performance // when all of them are done, we launch the performance
    )
  );

};

window.app = app;

window.addEventListener('DOMContentLoaded', () => {
  app.init();
});
