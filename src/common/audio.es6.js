'use strict';

let audio = {};

audio.context = require('soundworks/client').audioContext;

/**
 * Convert dB to linear gain value (1e-3 for -60dB)
 *
 * @param {Number} dBValue
 *
 * @return {Number} gain value
 */
audio.dBToLin = function (dBValue) {
  return Math.pow(10, dBValue / 20);
};

audio.generateClickBuffer = function () {
  const length = 2;
  const channels = 1;
  const gain = -10; // dB

  let buffer = audio.context.createBuffer(channels, length,
                                          audio.context.sampleRate);
  let data = buffer.getChannelData(0);

  const amplitude = audio.dBToLin(gain);
  data[0] = amplitude;
  data[1] = -amplitude;

  return buffer;
};

audio.generateClackBuffer = function () {
  const length = 5;
  const channels = 1;
  const gain = -10; // dB

  let buffer = audio.context.createBuffer(channels, length,
                                          audio.context.sampleRate);
  const amplitude = this.dBToLin(gain);
  let data = buffer.getChannelData(0);

  for(let i = 0; i < length; ++i) {
    data[i] = amplitude; // sic
  }

  return buffer;
};

audio.generateNoiseBuffer = function () {
  const duration = 0.5; // second
  const gain = -30; // dB

  const length = duration * audio.context.sampleRate;
  const amplitude = this.dBToLin(gain);
  const channelCount = audio.context.destination.channelCount;
  let buffer = audio.context.createBuffer(channelCount, length,
                                          audio.context.sampleRate);
  for(let c = 0; c < channelCount; ++c) {
    let data = buffer.getChannelData(c);
    for(let i = 0; i < length; ++i) {
      data[i] = amplitude * (Math.random() * 2 - 1);
    }
  }
  return buffer;
};

audio.Synth = class {
  constructor(sync) {
    this.sync = sync;

    this.clickBuffer = audio.generateClickBuffer();
    this.clackBuffer = audio.generateClackBuffer();
    this.noiseBuffer = audio.generateNoiseBuffer();
  }

  play(params = {}) {
    const type = params.type || 'click';
    const start = (typeof params.start !== undefined ? params.start : 0);
    const gain = (typeof params.gain !== undefined ? params.gain : 0);
    const duration = params.duration; // undefined is possible

    let bufferSource = audio.context.createBufferSource();

    switch(type) {
    case 'click':
      bufferSource.buffer = this.clickBuffer;
      break;
    case 'clack':
      bufferSource.buffer = this.clackBuffer;
      break;
    case 'noise':
      bufferSource.buffer = this.noiseBuffer;
    }

    const gainNode = audio.context.createGain();
    gainNode.gain.value = audio.dBToLin(gain);

    bufferSource.connect(gainNode);
    gainNode.connect(audio.context.destination);

    const localTime = Math.max(0, this.sync.getLocalTime(start));
    bufferSource.start(localTime);
    if(typeof duration !== 'undefined') {
      bufferSource.stop(localTime + duration);
    }
  }

};

module.exports = exports = audio;
