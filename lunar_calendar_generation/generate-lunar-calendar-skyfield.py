from skyfield import almanac
from skyfield.api import load
import numpy as np
import sys
import json
from pathlib import Path

# skyfield has one that says "Full Moon" etc., but these shorter codes are nicer
# for my desklet (less time spent comparing strings while still being readable)
PHASE_CODES = np.array(["new", "fq", "full", "lq"])

# downloads astronomic tables from the NASA JPL.
# "de440s.bsp" was calculated in 2020, the most recent one as of the time of writing.
# As the "short" version, it only has data up tp 2150 (more than enough),
# but it is very accurate.
# The following line will download this 32 MB file in the working directory.
# For alternative table files and extra info: https://rhodesmill.org/skyfield/planets.html
EPHEMERIS = load("de440s.bsp")

MOON_PATH = Path.home() / ".torchipeppo-moon"



def calculate_year(target_year):
    # include the last moon phases of the previous year (and the first ones of the next year)
    # so the desklet can look behind (ahead) in early January (late December)
    # w/o loading a different file.
    # (we are guaranteed to have at least one of each phase in those extra months
    #  due to them being 31 days each and the lunar cycle being about 29.5 days.)
    ts = load.timescale()
    t0 = ts.utc(target_year-1, 12, 1)
    t1 = ts.utc(target_year+1, 1, 31)

    # find all instances of the four main phases
    times, phases = almanac.find_discrete(t0, t1, almanac.moon_phases(EPHEMERIS))
    # zip dates and phases to make up the final lunar calendar list
    lunar_calendar_list = list(zip(times.utc_iso(), [PHASE_CODES[p] for p in phases]))

    # lunar calendar done in just a few lines (and a 32MB download)!
    # now build index list for fast search in the desklet
    month_idx_list = []
    prev_month = times[0].utc.month
    for i, t in enumerate(times):
        if t.utc.month != prev_month and t.utc.year == target_year:
            month_idx_list.append(i)
        prev_month = t.utc.month
    assert len(month_idx_list) == 12

    with open(MOON_PATH / f"{target_year}.json", "w") as f:
        json.dump({"calendar": lunar_calendar_list, "month_index": month_idx_list}, f)



if len(sys.argv) != 2:
    print("Usage:", __file__, "year1[-year2]")
    exit(1)

MOON_PATH.mkdir(exist_ok=True)

arg = sys.argv[1]
if "-" in arg:
    year1, year2 = arg.split("-")
    year1, year2 = int(year1), int(year2)
    for y in range(year1, year2+1):
        calculate_year(y)
else:
    calculate_year(int(sys.argv[1]))
