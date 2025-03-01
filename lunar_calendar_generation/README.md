# Generating an accurate lunar calendar

By default, this desklet computes data related to the moon phases by itself,
with a JavaScript library called `suncalc`. Although it's easy to include
in the project and doesn't require any setup by the user, the simple algorithm
in this library can be a little inaccurate, resulting in random errors
of several hours in magnitude and sometimes reporting new/full/half moons
one day earlier or later.

Now, this is nothing catastrophic for the purposes of this application
(showing a little moon icon and occasionally a countdown to the next full moon),
but still, those who want more precise astronomical data can follow these
instructions and run the included Python script to generate an accurate
lunar calendar that the desklet will read instead of calling `suncalc`.

Note that this is completely optional: the only gain is in precision,
not in features.

## Requirements and effects

You will be required to install the `skyfield` Python library,
which is geared for high-precision astronomical calculations.

Running the included Python script will also download a file containing
a so-called "ephemeris table", a collection of detailed astronomical data
necessary for `skyfield` to accurately compute future moon phases.
As of the time of writing, the script is instructed to download
the shortest-term ephemeris table from among those published by the
NASA Jet Propulsion Laboratory, which **weighs about 32 MB**
and allows to calculate moon phases in the **year range 2000-2148**.
The ephemeris file will be stored in the same directory you run the script from,
so you may reuse it again.
For more information and to select a different ephemeris table,
see around the beginning of the script.

It doesn't matter which directory you execute the script from:
it will automatically find the standard installation path of the desklet
and put the generated data there, inside a directory called `local_lunar_calendar`.

## How to run

Start by creating a Python virtual environment and installing the `skyfield`
library:
```bash
python3 -m venv venv
source venv/bin/activate
pip3 install skyfield
```

Then, run the included script, specifying the year or years for which
to generate the moon phase data.

For example, you may generate a century and a half's worth of data at the same time
and never think about it again (~300KB at the time of writing):
```python3 generate-lunar-calendar.py 2000-2148```

**Or** you may generate just one year at a time:
```python3 generate-lunar-calendar.py 2025```
(In this case, you may want to delete the old data first.)

## Using the generated data

The generated data should be automatically detected by the applet within one minute.
No confirmation is given of this.
If you want to make sure the local lunar calendar is being detected,
restart Cinnamon and check the Looking Glass log for a message that says
whether it's been found or not.
(This check is only made once, as the desklet starts up.)

If the lunar calendar for the current year is not found,
the desklet will silently switch back to `suncalc` until this is corrected.

## Attribution and licensing

`skyfield` is © Brandon Rhodes, licensed under the MIT license.

The scripts in this directory are licensed under the same license as the
desklet as a whole.