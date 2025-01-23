"""
TODO

Questa sarà l'evoluzione del remove-DEV
Ma anziché toccare roba qui (che poi devo stare attento a non committarla),
ci copierà direttamente tutto nella directory dove abbiamo il fork di
cinnamon-spices-desklets.

TODO mancano le traduzioni, aggiungerle qui dopo averle messe nella repo

Poi faccio seguire il remove-DEV del directory menu commentato,
come scaletta delle cose da fare
"""

from pathlib import Path
import shutil
import json
import re

# get UUIDs
with open("files/p3-clock@torchipeppo/metadata.json", "r") as f:
    develop_uuid = json.load(f)["uuid"]
with open("files/p3-clock@torchipeppo/metadata-RELEASE.json", "r") as f:
    release_uuid = json.load(f)["uuid"]



VERSION_DIR_PATTERN = re.compile(r"[0123456789.]+")

def copy_code_dir(src : Path, dst : Path):
    dst.mkdir(exist_ok=True)
    for p in src.iterdir():
        if (
            not p.is_dir()
            and (
                p.suffix == ".js"
                or p.suffix == ".py"
                or (p.suffix == ".json" and "metadata" not in p.stem)
            )
        ):
            if p.is_symlink():
                dst_file = dst / p.name
                if dst_file.exists():
                    dst_file.unlink()
                shutil.copy(p, dst_file, follow_symlinks=False)
            else:
                with open(p, "r") as f:
                    content = f.read()
                content = content.replace(develop_uuid, release_uuid)
                with open(dst/p.name, "w") as f:
                    f.write(content)

        elif (p.is_dir() and re.match(VERSION_DIR_PATTERN, p.name)):
            copy_code_dir(src / p.name, dst / p.name)



# step 1: files here

src_dir = Path(__file__).resolve().parent
dst_dir = src_dir.parent / "cinnamon repo forks/cinnamon-spices-desklets" / release_uuid
dst_dir.mkdir(exist_ok=True)

shutil.copy(src_dir/"README.md", dst_dir)



# step 2: code

src_dir = src_dir / "files" / develop_uuid
dst_dir = dst_dir / "files" / release_uuid
dst_dir.mkdir(exist_ok=True, parents=True)

shutil.copy(src_dir/"metadata-RELEASE.json", dst_dir/"metadata.json")
shutil.copy(src_dir/"p3corner-template.svgtemp", dst_dir)
copy_code_dir(src_dir, dst_dir)



# step 3: translations

# TODO






########################################################################
########################################################################



# # be very restrictive here to avoid accidents
# po = list(directory.glob("po/*.po"))
# for fname in po + [directory/"applet.js", directory/"popup_menu.py"]:
#     with open(fname, "r") as f:
#         content = f.read()
#     content = content.replace("directory-menu-DEV", "directory-menu")
#     content = content.replace("torchipeppo-DEV", "torchipeppo")
#     with open(fname, "w") as f:
#         f.write(content)

# # here too, but rename also
# potfile = directory/"po"/"directory-menu-DEV@torchipeppo-DEV.pot"
# with open(potfile, "r") as f:
#     content = f.read()
# content = content.replace("directory-menu-DEV", "directory-menu")
# content = content.replace("torchipeppo-DEV", "torchipeppo")
# with open(directory/"po"/"directory-menu@torchipeppo.pot", "w") as f:
#     f.write(content)
# potfile.unlink()

# # reset icon
# shutil.copy("icon-standard.png", directory/"icon.png")