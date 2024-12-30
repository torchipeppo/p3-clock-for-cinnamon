import ephem
import sys
import json
from pathlib import Path

def to_ISO_string(date):
    year, month, day, hour, minute, second_with_fractional = date.tuple()
    return f"{year}-{month:02d}-{day:02d}T{hour:02d}:{minute:02d}:{second_with_fractional:06.3f}Z"

PHASE_NEW_MOON = "new"
PHASE_FIRST_QUARTER = "fq"
PHASE_FULL_MOON = "full"
PHASE_LAST_QUARTER = "lq"

NEXT_PHASE = {
    PHASE_NEW_MOON: PHASE_FIRST_QUARTER,
    PHASE_FIRST_QUARTER: PHASE_FULL_MOON,
    PHASE_FULL_MOON: PHASE_LAST_QUARTER,
    PHASE_LAST_QUARTER: PHASE_NEW_MOON,
}

PHASE_GENERATORS = {
    PHASE_NEW_MOON: ephem.next_new_moon,
    PHASE_FIRST_QUARTER: ephem.next_first_quarter_moon,
    PHASE_FULL_MOON: ephem.next_full_moon,
    PHASE_LAST_QUARTER: ephem.next_last_quarter_moon,
}

MOON_PATH = Path.home() / ".torchipeppo-moon"



def calculate_year(target_year):
    phases_list = []
    month_idx_list = []

    # start with the last moon phase(s) of the previous year,
    # so the desklet can look behind in early January w/o loading a different file.
    phase = PHASE_FULL_MOON
    date = ephem.previous_full_moon(f"{target_year}")
    prev_month = date.triple()[1]
    while True:
        year, month, _ = date.triple()
        # build index list for fast search in the desklet
        if month != prev_month:
            month_idx_list.append(len(phases_list))
        # build actual lunar calendar
        phases_list.append((to_ISO_string(date), phase))

        # exit condition: stop at the next full moon of the next year
        # so the desklet can look ahead in late December w/o loading a different file.
        if year > target_year and phase == PHASE_FULL_MOON:
            break

        # set up next iteration
        prev_month = month
        phase = NEXT_PHASE[phase]
        date = PHASE_GENERATORS[phase](date)

    with open(MOON_PATH / f"{target_year}.json", "w") as f:
        json.dump({"calendar": phases_list, "month_index": month_idx_list}, f)



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
