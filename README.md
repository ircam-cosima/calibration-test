#Audio calibration (latency and gain) for Web Audio#

This application permits to manually set a latency, and gain, in a
browser, and to store this information on a server, and locally. The
user-agent is used as the browser identification. It is then possible
to retrieve this information, directly form the local storage if
available, or from the server, given a user-agent. The match of the
user-agent does not need to be exact, as the closest is selected.

Please note that the audio clocks are synchronised before the
calibration. This is accurate if the duration of the measure is long
enough. Depending on the device, 2 to 5 minutes are necessary for
stabilisation.

There is a latency added by the device, which is unknown, and
may come from the browser, and the audio driver. This is what we
estimate here.

Caveat: The relative phase of several audio clocks are undetermined
in-between the audio clock ticks. Their periods are as large as an
audio buffer size: depending on the device, this usually ranges from
64 to 4096 samples (which translates to 6 to 85 ms at 44100 and 48000
Hz).

##Please Contribute!##

If you just cloned or updated the repository, you need to install the
dependencies with

    npm install

Then, you need to start the server with:

    gulp

The server will listen to port 8888. Clients connect to
<http://localhost:8888/> for calibration. You can modify the port used
by the server with the environment variable PORT. For example, to set
the port to 8080:

    PORT=8080 gulp

In order to calibrate a device, one needs to compare it with an other
device, which is *already* calibrated, and serves as a
reference. Please look into the [data](./blob/master/data)
directory for the know user-agents.

Connect both the reference device, and the device to calibrate, to the
server, preferably on a local network (wifi or ethernet). A
synchronisation process will start on both of the devices. Wait for it
to complete. At this point, the sound must be stable, while not
necessarily synchronous. Put the volume to the maximum on both
devices.

Then, go to the `delay` page, on both devices. The sound will turn
into a click, for precise timing. You can check that the reference
device display its already calibrated compensation delay. On the
device to calibrate, there might be some proposed value, that you must
check, and adjust. To adjust the delay *on the device to calibrate
only*, you can type a number, or use the buttons to increment, or
decrement, the delay compensation. When the devices are close one of
each other, you should hear both clicks at the same time. (If the
devices are not at the same position, the time for the sound to arrive
to your ear will differ, as the sounds needs 3 milliseconds to travel
a meter.)

Then, proceed to the `gain` page. The sound will turn into a white
noise, to estimate the energy. Again, the reference device display its
already calibrated compensation gain. On the device to calibrate,
there might be some proposed value, that you must check, and
adjust. Please remember to adjust the gain compensation *only on the
device to calibrate*. When both devices are at the same distance of
your ears, with the speakers directly pointing to the ears, you must
hear them with the same energy. You may want to use the `Ø` button to
de-phase the reference, so as to listen to the devices one after the
other.  The characteristics of the sound devices might differ a lot,
but you should try to concentrate on the relative energy.

Then, please go to the `validation` page, and save your newly
calibrated device. This will update the file
[data/calibration.json](data/calibration.json). Please make a pull
commit with it. Your newly calibrated device can now serve as a
reference also.

