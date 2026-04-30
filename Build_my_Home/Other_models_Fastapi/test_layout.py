"""Standalone test of the zone-based layout algorithm."""
import math, time, random

class QuickFloorPlanner:
    SIZES = {
        "entrance": (3,2), "living_room": (6,5), "living": (6,5),
        "kitchen": (4,3), "dining_room": (4,4), "dining": (4,3),
        "master_bedroom": (5,4), "bedroom": (4,4), "bathroom": (3,2),
        "guest_room": (4,3), "study": (3,3), "home_office": (3,3),
        "parking": (5,5), "gym": (4,4), "staircase": (3,3),
        "elevator": (2,2), "storage": (2,2), "laundry": (2,2),
        "terrace": (4,3), "balcony": (3,2), "corridor": (1,1),
    }
    DEFAULT_SIZE = (3, 3)
    PUBLIC   = {"living_room", "living", "dining_room", "dining", "entrance"}
    SERVICE  = {"kitchen", "laundry", "storage"}
    PRIVATE  = {"bedroom", "master_bedroom", "guest_room", "study", "home_office"}
    WET      = {"bathroom"}
    CIRC     = {"staircase", "elevator"}
    OUTDOOR  = {"parking", "terrace", "balcony", "gym"}

    def plan(self, rooms_spec, n_floors):
        random.seed(time.time() * 1000 + id(self))
        pw = rooms_spec.get("plot_width") or 40
        pl = rooms_spec.get("plot_length") or 60
        grid_w = max(8, int(round(pw * 0.3)))
        grid_h = max(10, int(round(pl * 0.3)))
        r_counts = rooms_spec.get("rooms", {})
        all_rooms = []
        for k, v in r_counts.items():
            if isinstance(v, int) and v > 0:
                all_rooms.extend([k] * v)
        if not all_rooms:
            all_rooms = ["living_room","kitchen","dining_room","bathroom","master_bedroom","bedroom","bedroom"]
        public = [r for r in all_rooms if r in self.PUBLIC]
        service = [r for r in all_rooms if r in self.SERVICE]
        private = [r for r in all_rooms if r in self.PRIVATE]
        wet = [r for r in all_rooms if r in self.WET]
        circ = [r for r in all_rooms if r in self.CIRC]
        outdoor = [r for r in all_rooms if r in self.OUTDOOR]
        if not public:
            public = ["living_room"]
        chunk_priv = math.ceil(len(private) / max(1, n_floors))
        chunk_wet = math.ceil(len(wet) / max(1, n_floors))
        building = {}
        for fn in range(1, n_floors + 1):
            if fn == 1:
                fp, fs, fpr, fw, fo = public, service, private[:chunk_priv], wet[:chunk_wet], outdoor
            else:
                fp, fs = [], []
                fpr = private[(fn-1)*chunk_priv:fn*chunk_priv]
                fw = wet[(fn-1)*chunk_wet:fn*chunk_wet]
                fo = []
            building[f"floor_{fn}"] = self._layout_floor(fp, fs, fpr, fw, circ if n_floors>1 else [], fo, fn, grid_w, grid_h)
        print(f"  [FloorPlanner] {len(building)} floors on {grid_w}x{grid_h} grid")
        return building

    def _layout_floor(self, public, service, private, wet, circ, outdoor, floor_num, grid_w, grid_h):
        placed, occupied = [], set()
        def fits(x,y,w,h):
            if x+w>grid_w or y+h>grid_h: return False
            return all((x+dx,y+dy) not in occupied for dx in range(w) for dy in range(h))
        def place(room,x,y,w,h):
            for dx in range(w):
                for dy in range(h):
                    occupied.add((x+dx,y+dy))
            placed.append({"room":room,"x":x,"y":y,"w":w,"h":h,"floor":floor_num})

        cur_x = 0
        if floor_num == 1:
            if fits(cur_x,0,3,2): place("entrance",cur_x,0,3,2); cur_x+=3
        for rtype in public:
            w,h = self.SIZES.get(rtype,self.DEFAULT_SIZE)
            if cur_x+w>grid_w: w=max(3,grid_w-cur_x)
            if w>0 and fits(cur_x,0,w,h): place(rtype,cur_x,0,w,h); cur_x+=w

        # Service: overflow to row below public zone if first row full
        svc_row_y = 0
        for rtype in service:
            w,h = self.SIZES.get(rtype,self.DEFAULT_SIZE)
            if cur_x+w>grid_w:
                pub_depth = max((p["y"]+p["h"] for p in placed), default=2)
                svc_row_y = pub_depth
                cur_x = 0
            if fits(cur_x,svc_row_y,w,h): place(rtype,cur_x,svc_row_y,w,h); cur_x+=w

        # Corridor (ground floor only)
        pub_depth = max((p["y"]+p["h"] for p in placed), default=0)
        if floor_num == 1 and placed:
            corr_y = pub_depth
            if fits(0,corr_y,grid_w,1): place("corridor",0,corr_y,grid_w,1)
            priv_y = corr_y + 1
        else:
            priv_y = pub_depth if placed else 0

        # Private zone
        cur_x = 0
        for rtype in private:
            w,h = self.SIZES.get(rtype,self.DEFAULT_SIZE)
            bw,bh = self.SIZES.get("bathroom",(3,2))
            if cur_x+w+bw <= grid_w:
                if fits(cur_x,priv_y,w,h):
                    place(rtype,cur_x,priv_y,w,h)
                    if wet and fits(cur_x+w,priv_y,bw,bh):
                        place("bathroom",cur_x+w,priv_y,bw,bh); wet.pop(0); cur_x+=w+bw
                    else: cur_x+=w
            else:
                if cur_x+w<=grid_w and fits(cur_x,priv_y,w,h):
                    place(rtype,cur_x,priv_y,w,h)
                    if wet and fits(cur_x,priv_y+h,bw,bh):
                        place("bathroom",cur_x,priv_y+h,bw,bh); wet.pop(0)
                    cur_x+=w
                else:
                    priv_y+=h+1; cur_x=0
                    if fits(cur_x,priv_y,w,h): place(rtype,cur_x,priv_y,w,h); cur_x+=w
        # Circulation
        if circ:
            cy = max((p["y"]+p["h"] for p in placed),default=0); cx=0
            for rtype in circ:
                w,h = self.SIZES.get(rtype,(3,3))
                if fits(cx,cy,w,h):
                    for dx in range(w):
                        for dy in range(h):
                            occupied.add((cx+dx,cy+dy))
                    placed.append({"room":rtype,"x":cx,"y":cy,"w":w,"h":h,"floor":floor_num,"structural":True}); cx+=w
        # Outdoor
        for rtype in outdoor:
            w,h = self.SIZES.get(rtype,(4,3))
            for y in range(0,grid_h-h+1):
                for x in range(0,grid_w-w+1):
                    if all((x+dx,y+dy) not in occupied for dx in range(w) for dy in range(h)):
                        place(rtype,x,y,w,h); break
                else: continue
                break
        return placed

# ── Run tests ──
print("=" * 60)
print("Zone-based Floor Plan Test")
print("=" * 60)

planner = QuickFloorPlanner()
specs = {
    "rooms": {"bedroom": 3, "bathroom": 2, "kitchen": 1, "living": 1, "dining": 1},
    "plot_width": 40, "plot_length": 60, "building_type": "house"
}
building = planner.plan(specs, n_floors=2)

for fk, rooms in building.items():
    print(f"\n{fk} ({len(rooms)} rooms):")
    for r in rooms:
        print(f"  {r['room']:20s} pos=({r['x']:2d},{r['y']:2d}) size={r['w']}x{r['h']}")
    occ = set()
    overlaps = 0
    for r in rooms:
        for dx in range(r['w']):
            for dy in range(r['h']):
                c = (r['x']+dx, r['y']+dy)
                if c in occ: overlaps += 1
                occ.add(c)
    mx = max(r['x']+r['w'] for r in rooms) if rooms else 0
    my = max(r['y']+r['h'] for r in rooms) if rooms else 0
    print(f"  Overlaps: {overlaps} | BBox: {mx}x{my}")
    cols = len([(x,y) for x in range(0,mx+1,4) for y in range(0,my+1,4)])
    print(f"  Structural columns (4m grid): {cols} (was 49 before fix)")

    # Check kitchen is present on floor 1
    room_types = [r['room'] for r in rooms]
    if fk == "floor_1":
        assert "kitchen" in room_types, "FAIL: Kitchen missing from floor 1!"
        assert "entrance" in room_types, "FAIL: Entrance missing from floor 1!"
        print("  [OK] Kitchen and entrance present")

print("\nAll tests passed!")
