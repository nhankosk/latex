import io,json,pathlib,re,shutil,urllib.request,zipfile,struct,hashlib
from PIL import Image,ImageDraw
root=pathlib.Path(__file__).parent
dest=pathlib.Path("dist")
dest.mkdir(exist_ok=True)
for p in root.iterdir():
    if p.suffix in (".html",".css",".js"): shutil.copy2(p,dest/p.name)
shutil.copytree(root/"media",dest/"media",dirs_exist_ok=True)
people=dest/"media"/"people.png"
if not people.exists():
    req=urllib.request.Request("https://opengameart.org/sites/default/files/people_0.png",headers={"User-Agent":"RouteLab-Education/1.0"})
    with urllib.request.urlopen(req,timeout=90) as response: people.write_bytes(response.read())
if hashlib.sha256(people.read_bytes()).hexdigest()!="d44e8918c54b968819c6aa34086362ee3fd55efc5d6769d3e374565869d9df54":
    raise RuntimeError("O atlas Isometric People mudou; conferir a fonte antes de atualizar.")
assets=dest/"assets";assets.mkdir(exist_ok=True)
packs={
"city":"https://opengameart.org/sites/default/files/isometricCity.zip",
"buildings":"https://opengameart.org/sites/default/files/Isometric%20Buildings.zip",
"vehicles":"https://opengameart.org/sites/default/files/isometricVehicles.zip"}
manifest={}
for pack,url in packs.items():
    req=urllib.request.Request(url,headers={"User-Agent":"RouteLab-Education/1.0"})
    with urllib.request.urlopen(req,timeout=90) as r: data=r.read()
    z=zipfile.ZipFile(io.BytesIO(data)); manifest[pack]=[]
    folder=assets/pack;folder.mkdir(exist_ok=True)
    for info in z.infolist():
        name=info.filename
        if not name.lower().endswith(".png") or "__macosx" in name.lower(): continue
        data=z.read(info);im=Image.open(io.BytesIO(data))
        if im.width>600 or im.height>600: continue
        safe=re.sub(r"[^a-zA-Z0-9_.-]+","-",name)
        path=folder/safe;path.write_bytes(data)
        manifest[pack].append({"name":name,"path":str(path.relative_to(dest)),"w":im.width,"h":im.height})
    manifest[pack].sort(key=lambda a:a["name"])
    print(pack,json.dumps(manifest[pack][:20],ensure_ascii=False))
    entries=manifest[pack][:132];cols=8;cellw=145;cellh=125
    sheet=Image.new("RGB",(cols*cellw,((len(entries)+cols-1)//cols)*cellh),"#e6edf4")
    draw=ImageDraw.Draw(sheet)
    for i,a in enumerate(entries):
        im=Image.open(dest/a["path"]).convert("RGBA");im.thumbnail((128,94))
        x=(i%cols)*cellw;y=(i//cols)*cellh
        sheet.paste(im,(x+(cellw-im.width)//2,y+94-im.height),im)
        label=pathlib.Path(a["name"]).stem
        draw.text((x+5,y+98),str(i)+": "+label[-21:],fill="#101f38")
    sheet.save(assets/(pack+"-contact.jpg"),quality=86)
(assets/"manifest.json").write_text(json.dumps(manifest),encoding="utf-8")
req=urllib.request.Request("https://cdn.jsdelivr.net/npm/pixi.js@8.6.6/dist/pixi.min.js")
with urllib.request.urlopen(req,timeout=60) as r:(assets/"pixi.min.js").write_bytes(r.read())
(assets/"CREDITS.txt").write_text("Art: Kenney.nl. Isometric City, Isometric Buildings #1, Isometric Vehicles #1. CC0 1.0.\nSources:\n"+"\n".join(packs.values())+"\nPixiJS 8.6.6: MIT, https://github.com/pixijs/pixijs\n",encoding="utf-8")
(dest/".nojekyll").touch()
