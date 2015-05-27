'use strict';

let dom = require('../common/dom');

dom.createSyncMinimalElement = function (origin) {
  const element = document.createElement('div');
  element.classList.add('sync-minimal');
  origin.appendChild(element);

  let child = document.createElement('div');
  child.classList.add('status');
  element.appendChild(child);

  child = document.createElement('div');
  child.classList.add('status-duration');
  element.appendChild(child);

  child = document.createElement('div');
  child.classList.add('connection');
  element.appendChild(child);

  return element;
};

dom.updateSyncMinimalElement = function (element, report) {
  for(let k in report) {
    if(report.hasOwnProperty(k) ) {
      let selection;
      switch(k) {
      case 'status':
        selection = element.querySelector('.status');
        if(report[k] === 'training') {
          selection.innerHTML = '<strong>training</strong>';
        } else {
          selection.innerHTML = report[k];
        }
        break;
      case 'statusDuration':
        selection = element.querySelector('.status-duration');
        if(report.status !== 'sync') {
          selection.innerHTML = '<strong>(' + report[k].toFixed(0) + '")</strong>';
          selection.style.display = '';
        } else {
          selection.innerHTML = '';
          selection.style.display = 'none';
        }

        break;
      case 'connection':
        selection = element.querySelector('.connection');
        if(report[k] === 'offline') {
          selection.innerHTML = '<strong>OFFLINE</strong>';
        } else {
          selection.innerHTML = report[k];
        }
        break;
      }
    }
  }
};

dom.createSyncReportElement = function (origin) {
  const element = document.createElement('div');
  element.classList.add('sync-report');
  origin.appendChild(element);

  let child = document.createElement('div');
  child.classList.add('status');
  element.appendChild(child);

  child = document.createElement('div');
  child.classList.add('status-duration');
  element.appendChild(child);

  child = document.createElement('div');
  child.classList.add('time-offset');
  element.appendChild(child);

  child = document.createElement('div');
  child.classList.add('frequency-ratio');
  element.appendChild(child);

  child = document.createElement('div');
  child.classList.add('connection');
  element.appendChild(child);

  child = document.createElement('div');
  child.classList.add('connection-duration');
  element.appendChild(child);

  child = document.createElement('div');
  child.classList.add('connection-timeout');
  element.appendChild(child);

  child = document.createElement('div');
  child.classList.add('travel-duration');
  element.appendChild(child);

  child = document.createElement('div');
  child.classList.add('travel-duration-min');
  element.appendChild(child);

  child = document.createElement('div');
  child.classList.add('travel-duration-max');
  element.appendChild(child);

  return element;
};

dom.updateSyncReportElement = function (element, report) {
  for(let k in report) {
    if(report.hasOwnProperty(k) ) {
      switch(k) {
      case 'status':
        element.querySelector('.status').innerHTML
          = 'status: ' + report[k];
        break;
      case 'statusDuration':
        element.querySelector('.status-duration').innerHTML
          = 'status for: ' + report[k].toFixed(0) + '"';
        break;
      case 'timeOffset':
        element.querySelector('.time-offset').innerHTML
        = 'time offset: ' + report[k].toString().replace('.', '"');
        break;
      case 'frequencyRatio':
        element.querySelector('.frequency-ratio').innerHTML
          = 'frequency ratio: ' + report[k];
        break;
      case 'connection':
        const selection = element.querySelector('.connection');
        selection.innerHTML = 'connection: ';
        if(report[k] === 'offline') {
          selection.innerHTML += '<b>OFFLINE</b>';
        } else {
          selection.innerHTML += report[k];
        }
        break;
      case 'connectionDuration':
        element.querySelector('.connection-duration').innerHTML
          = 'connection for: ' + report[k].toFixed(0) + '"';
        break;
      case 'connectionTimeOut':
        element.querySelector('.connection-timeout').innerHTML
          = 'connection time-out: ' + report[k].toFixed(1).replace('.', '"');
        break;
      case 'travelDuration':
        element.querySelector('.travel-duration').innerHTML
          = 'travel duration: ' + report[k].toFixed(3).replace('.', '"');
        break;
      case 'travelDurationMin':
        element.querySelector('.travel-duration-min').innerHTML
          = 'travel duration min: ' + report[k].toFixed(3).replace('.', '"');
        break;
      case 'travelDurationMax':
        element.querySelector('.travel-duration-max').innerHTML
          = 'travel duration max: ' + report[k].toFixed(3).replace('.', '"');
        break;
      }
    } // if(report.hasOwnProperty(k) )
  } // for(let k in report)

};

dom.createInfoElement = function (params) {
  const origin = (typeof params.DOMOrigin !== 'undefined'
                  ? params.DOMOrigin : document.body);

  const element = document.createElement('div');
  element.classList.add('info');
  element.innerHTML = '<p>Please wait for the sychronisation process '
    + 'to complete its training. '
    + 'This should last for around 120 seconds.</p>'
    + '<p>Then please proceed to delay calibration; '
    + 'then to gain calibration.</p>'
    + '<p>Do not forget to validate.</p>'
    + '<p>Thank you.</p>';
  origin.appendChild(element);

  dom.createValidationElement( {
    DOMOrigin: element,
    text: 'Proceed to delay',
    setter: params.validation
  } );

  return element;
};

dom.DelayCalibration = class {
  constructor(params) {
    this.setter = params.setter; // undefined is fine
    this.getter = params.getter; // undefined is fine
    this.validation = params.validation;

    const origin = (typeof params.DOMOrigin !== 'undefined'
                   ? params.DOMOrigin : document.body);

    this.element = document.createElement('div');
    this.element.classList.add('delay-calibration');
    origin.appendChild(this.element);

    let child = document.createElement('div');
    child.innerHTML = 'Delay compensation ';
    this.element.appendChild(child);

    const that = this; // problem with gulp-es6-transpiler 1.0.1
    this.input = new dom.Input( {
      DOMOrigin: this.element,
      DOMAttributes: {
        type: 'number',
        step: '1',
        max: '0',
        min: '-100'
      },
      setter: that.setter,
      getter: that.getter
    } );

    child = document.createElement('div');
    child.innerHTML = ' ms';
    this.element.appendChild(child);

    child = document.createElement('br');
    this.element.appendChild(child);

    for(let v of [-50, -10, -5, -1]) {
      child = new dom.Button( {
        DOMOrigin: this.element,
        DOMClass: 'input-control',
        text: v.toString(),
        setter: () => { // eslint-disable-line no-loop-func
          that.setter(that.getter() + v);
          that.input.update();
        }
      } );
    }

    child = new dom.Button( {
      DOMOrigin: this.element,
      DOMClass: 'input-control',
      text: '=0',
      setter: () => {
        that.setter(0);
        that.input.update();
      }
    } );

    for(let v of [1, 5, 10, 50]) {
      child = new dom.Button( {
        DOMOrigin: this.element,
        DOMClass: 'input-control',
        text: '+' + v.toString(),
        setter: () => { // eslint-disable-line no-loop-func
          that.setter(that.getter() + v);
          that.input.update();
        }
      } );
    }

    child = document.createElement('br');
    this.element.appendChild(child);

    dom.createValidationElement( {
      DOMOrigin: this.element,
      text: 'Validate delay',
      setter: that.validation
    } );
  }

  update() {
    this.input.update();
  }

}; // DelayCalibration

dom.GainCalibration = class {
  constructor(params) {
    this.setter = params.setter; // undefined is fine
    this.getter = params.getter; // undefined is fine
    this.validation = params.validation;

    const origin = (typeof params.DOMOrigin !== 'undefined'
                    ? params.DOMOrigin : document.body);

    this.element = document.createElement('div');
    this.element.classList.add('gain-calibration');
    origin.appendChild(this.element);

    let child = document.createElement('div');
    child.innerHTML = 'Gain compensation ';
    this.element.appendChild(child);

    const that = this; // problem with gulp-es6-transpiler 1.0.1
    this.input = new dom.Input( {
      DOMOrigin: this.element,
      DOMAttributes: {
        type: 'number',
        step: '1',
        max: '30',
        min: '-30'
      },
      setter: that.setter,
      getter: that.getter
    } );

    child = document.createElement('div');
    child.innerHTML = ' dB';
    this.element.appendChild(child);

    child = document.createElement('br');
    this.element.appendChild(child);

    for(let v of [-5, -1]) {
      child = new dom.Button( {
        DOMOrigin: this.element,
        DOMClass: 'input-control',
        text: v.toString(),
        setter: () => { // eslint-disable-line no-loop-func
          that.setter(that.getter() + v);
          that.input.update();
        }
      } );
    }

    child = new dom.Button( {
      DOMOrigin: this.element,
      DOMClass: 'input-control',
      text: '=0',
      setter: () => {
        that.setter(0);
        that.input.update();
      }
    } );

    for(let v of [1, 5]) {
      child = new dom.Button( {
        DOMOrigin: this.element,
        DOMClass: 'input-control',
        text: '+' + v.toString(),
        setter: () => { // eslint-disable-line no-loop-func
          that.setter(that.getter() + v);
          that.input.update();
        }
      } );
    }

    child = document.createElement('br');
    this.element.appendChild(child);

    dom.createValidationElement( {
      DOMOrigin: this.element,
      text: 'Validate gain',
      setter: that.validation
    } );
  }

  update() {
    this.input.update();
  }
}; // GainCalibration

dom.createValidationElement = function (params) {
  const origin = (typeof params.DOMOrigin !== 'undefined'
                  ? params.DOMOrigin : document.body);

  const element = document.createElement('div');
  element.classList.add('validation');
  origin.appendChild(element);

  let child = new dom.Button( {
    DOMOrigin: element,
    DOMClass: 'validate',
    text: (typeof params.text !== 'undefined'
           ? params.text : 'Validate'),
    setter: params.setter
  } );

  // wait for synchronisation
  element.style.display = 'none';

  return element;
};

dom.updateValidationElements = function (origin, display) {
  const elements = origin.querySelectorAll('.validation');
  for(let e = 0; e < elements.length; ++e) {
    if(display) {
      elements[e].style.display = '';
    } else {
      elements[e].style.display = 'none';
    }
  }
};

dom.createGlobalValidationElement = function (params) {
  const origin = (typeof params.DOMOrigin !== 'undefined'
                  ? params.DOMOrigin : document.body);

  const element = document.createElement('div');
  element.classList.add('global-validation');
  origin.appendChild(element);

  const child = document.createElement('div');
  child.classList.add('done');
  child.innerHTML = 'Thank you';
  child.style.display = 'none';
  element.appendChild(child);

  dom.createValidationElement( {
    DOMOrigin: element,
    text: 'Validate calibration',
    setter: params.validation
  } );

  return element;
};

dom.updateGlobalValidationElement = function (origin, done = false) {
  const element = origin.querySelector('.global-validation');
  const validation = element.querySelector('.validate');

  validation.style.display = (!done ? '' : 'none');

  const text = element.querySelector('.done');
  text.style.display = (done ? '' : 'none');
};

dom.createRestoreElement = function (params) {
  const origin = (typeof params.DOMOrigin !== 'undefined'
                  ? params.DOMOrigin : document.body);

  const element = document.createElement('div');
  element.classList.add('restore-calibration');
  element.innerHTML = '<p>Restore settings from a previous calibration.</p>';
  origin.appendChild(element);

  const child = new dom.Button( {
    DOMOrigin: element,
    DOMClass: 'restore',
    text: 'Restore calibration',
    setter: params.validation
  } );

  return element;
};

module.exports = exports = dom;
