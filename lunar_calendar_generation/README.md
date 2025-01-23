# Generating a lunar calendar

You may use either of these scripts to generate the moon phase data
used by certain features of the desklet.

This step is usually optional, since moon phase data is also provided by
WeatherAPI, so it's only necessary if you prefer to have access to offline
data or if you want to use the "Countdown to the next full moon" feature.

## How to run

You only need to run **one** of the two scripts.
See below for a description of their (minimal) differences.

It doesn't matter which directory you execute these scripts from:
they'll automatically find the standard installation path of the desklet
and put the genreated data there.

### Skyfield version
Setup:
```bash
python3 -m venv venv
source venv/bin/activate
pip3 install skyfield
```

Generate a century and a half's worth of data all at once:
```python3 generate-lunar-calendar-skyfield.py 2000-2148```

**Or** generate just one year:
```python3 generate-lunar-calendar-skyfield.py 2025```

### Ephem version

As above, but replace all instances of `skyfield` with `ephem`.

## Differences between the two scripts

They do the same thing. Results for the year 2024 appear to differ by
a few seconds, which is negligible for the purpose of determining
on which day the moon will be full/new/half.

Regarding the execution time, the `ephem` version is faster, at least on my machine.
There are also more differences in the characteristics of the two libraries.

As far as I could find, **`skyfield` is the most accurate, so I suggest that one**,
as long as you are fine with downloading 32 MB of astronomic tables.
The tables will be stored in the same directory you run the script from,
so you may reuse them again.

As for `ephem`, it won't download anything, but the author of the library notes
that, being written in C, it might turn out to be harder to install for some users.
Anecdotally, I encountered no issues with it.

## About the generated data

Running either script will create a `local_lunar_calendar` directory
in the installation folder of the desklet and store a number of JSON files there.
As a ballpark estimate, the generated data from year 2000 to year 2148
takes up just about 300 KB.

You may generate this data all at once, or you may decide to only generate
the current year. In the latter case, you may want to delete the
`local_lunar_calendar` directory to get rid of the old data.

## Attribution and licensing

`ephem` and `skyfield` are © Brandon Rhodes, licensed under the MIT license.

The scripts in this directory are licensed under the same license as the
desklet as a whole.