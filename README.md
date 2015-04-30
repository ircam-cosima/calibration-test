Audio calibration (latency and gain) for Web Audio browsers

    npm install
    gulp

Please note that the audio clocks are synchronised before the
calibration. This is accurate if the duration of measure is long
enough. Depending on the device, 2 to 5 minutes are necessary for
stabilisation.

There is an other latency added by the device, which is unknown, and
may come from the browser, and the audio driver. This is what we
estimate here.

Caveat:

- The relative phase of several audio clocks are undetermined
  in-between the audio clock ticks. Their periods are as large as an
  audio buffer size: depending on the device, this usually ranges
  from 64 to 4096 samples (which translates to 6 to 85 ms at 44100 and
  48000 Hz).