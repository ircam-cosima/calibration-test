'use strict';

let app = window.app || {};

app.debug = require('debug')('soundworks:calibration');

app.clientSide = require('soundworks/client');
app.client = app.clientSide.client;

app.dom = require('../common/dom');

// Initialise the client with its type
app.client.init('calibration-control');

class CalibrationControlClientPerformance extends app.clientSide.Performance {
  constructor(options = {}) {
    super(options);
    const that = this;

    this.audio = {};

    this.audio.active = true;

    this.syncActive = true;

    this.display = {};

    this.display.audio = {};

    this.display.synchronisation = new app.dom.Toggle( {
      DOMOrigin: this.view,
      DOMClass: 'synchronisation',
      text: 'Sync',
      setter: (value) => {
        that.syncActive = value;
        that.parametersSend();
      },
      getter: () => { return that.syncActive; }
    } );

    this.display.audio.label = new app.dom.Text( {
      DOMOrigin: that.view,
      DOMClass: 'label',
      text: 'Audio:'
    } );

    this.display.audio.active = new app.dom.Toggle( {
      DOMOrigin: that.view,
      DOMClass: 'active',
      text: 'Active',
      setter: (value) => {
        that.audio.active = value;
        that.parametersSend();
      },
      getter: () => { return that.audio.active; }
    } );

    this.audio.click = '';
    this.audio.clickOptions = [];
    this.display.audio.click = new app.dom.ExclusiveToggles( {
      DOMOrigin: this.view,
      DOMClass: 'click',
      setter: (value) => { that.clickSet(value); },
      getter: () => { return that.audio.click; }
    } );
  }

  clickOptionsUpdate(options) {
    this.audio.clickOptions = options.slice(0);
    this.display.audio.click.setOptions(this.audio.clickOptions);
  }

  clickUpdate(option) {
    this.audio.click = option;
    this.display.audio.click.update();
  }

  clickSet(option) {
    this.clickUpdate(option);
    app.client.send('calibration:parameters', {
      click: this.audio.click
    } );
  }

  parametersSend() {
    app.client.send('calibration:parameters', {
      active: this.audio.active,
      click: this.audio.click,
      sync: this.syncActive
    } );

  }

  start() {
    super.start();
    const that = this;

    app.client.receive('calibration:parameters', (params) => {
      /// audio
      if(typeof params.active !== 'undefined') {
        that.audio.active = params.active;
        that.display.audio.active.update();
      }
      if(typeof params.click !== 'undefined') {
        that.audio.click = params.click;
        that.display.audio.click.update();
      }

      /// sync
      if(typeof params.sync !== 'undefined') {
        that.syncActive = params.sync;
        that.display.synchronisation.update();
      }
    } );
    app.client.send('calibration:parameters-request');

    app.client.receive('calibration:click-type-options', (options) => {
      that.clickOptionsUpdate(options);
    } );
    app.client.send('calibration:click-type-options-request');

  } // start


}

app.init = function () {
  app.performance = new CalibrationControlClientPerformance();

  // Start the scenario and link the modules
  app.client.start(
    app.performance
  );

};

window.app = app;

window.addEventListener('DOMContentLoaded', () => {
  app.init();
});
