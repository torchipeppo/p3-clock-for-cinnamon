"""
Copy all files to release into my fork of cinnamon-spices-desklets.
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

def copy_replacing_uuid(src, dst, additional_content_processing=None):
    with open(src, "r") as f:
        content = f.read()
    content = content.replace(develop_uuid, release_uuid)
    if additional_content_processing is not None:
        content = additional_content_processing(content)
    with open(dst, "w") as f:
        f.write(content)

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
                copy_replacing_uuid(p, dst/p.name)

        elif (p.is_dir() and re.match(VERSION_DIR_PATTERN, p.name)):
            copy_code_dir(src / p.name, dst / p.name)



# step 1: files here

src_dir = Path(__file__).resolve().parent
dst_dir = src_dir.parent.parent / "cinnamon repo forks/cinnamon-spices-desklets" / release_uuid
dst_dir.mkdir(exist_ok=True)

copy_replacing_uuid(
    src_dir/"README.md",
    dst_dir/"README.md",
    lambda content: content.replace(
        '<img src="',
        f'<img src="https://cinnamon-spices.linuxmint.com/git/desklets/{release_uuid}/'
    )
)
shutil.copy(src_dir/"info.json", dst_dir)



# step 2: screenshots
shutil.copy(src_dir/"screenshot.png", dst_dir)
(dst_dir/"assets").mkdir(exist_ok=True)
for p in (src_dir/"assets").iterdir():
    shutil.copy(p, dst_dir/"assets")



# step 3: code

src_dir = src_dir / "files" / develop_uuid
dst_dir = dst_dir / "files" / release_uuid
dst_dir.mkdir(exist_ok=True, parents=True)

shutil.copy(src_dir/"metadata-RELEASE.json", dst_dir/"metadata.json")
shutil.copy(src_dir/"p3corner-template.svgtemp", dst_dir)
shutil.copy(src_dir/"icon.png", dst_dir)
copy_code_dir(src_dir, dst_dir)



# step 4: translations

src_dir = src_dir / "po"
dst_dir = dst_dir / "po"
dst_dir.mkdir(exist_ok=True)

copy_replacing_uuid(src_dir/f"{develop_uuid}.pot", dst_dir/f"{release_uuid}.pot")
for p in src_dir.iterdir():
    if p.suffix == ".po":
        copy_replacing_uuid(p, dst_dir/p.name)
