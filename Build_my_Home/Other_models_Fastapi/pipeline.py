"""
pipeline.py
===========
Full BIM Pipeline Orchestrator.

Flow:
  User Input (NLP text)
  → NLP Constraint Extractor   (building_nlp.py)
  → Constraint Validator        (constraint_validator.py)
  → RL Floor Plan Generator     (floor_plan_env + ppo_agent)
  → Multi-floor Planner         (multifloor_env)
  → Structural Grid             (structural_grid)
  → MEP Routing                 (mep_routing)
  → Construction Task Engine    (task_engine)
  → CPM/PERT Scheduler          (scheduler)
  → Cost Estimator              (cost_estimator)
  → Visualizations

All modules are imported and executed in sequence.
The full result is a single JSON dict (or FastAPI response).
"""

from __future__ import annotations

import json
import math
import time
import random
import traceback
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

import numpy as np

# ── Module imports (all previous modules) ─────────────────────────────────
from building_nlp        import BuildingNLPParser
from constraint_validator import ConstraintValidator
from mep_routing          import MEPRouter
from task_engine          import ConstructionTaskEngine
from scheduler            import ProjectScheduler
from cost_estimator       import CostEstimationModel

# Structural grid (may not be in path — graceful fallback)
try:
    from structural_grid import MultiFloorStructuralGrid
    STRUCTURAL_OK = True
except ImportError:
    STRUCTURAL_OK = False

GRID = 20


# ─────────────────────────────────────────────────────────────────────────────
# Zone-based architectural floor plan generator
# ─────────────────────────────────────────────────────────────────────────────

class QuickFloorPlanner:
    """
    Zone-based architectural layout generator.
    Places rooms in logical zones: public (front), service, private (back),
    connected by a corridor, with entrance and proper adjacency rules.
    """

    # Room sizes in grid units (width, depth) — consistent, no random wobble
    SIZES = {
        "entrance":       (3, 2), "living_room":  (6, 5), "living":       (6, 5),
        "kitchen":        (4, 3), "dining_room":  (4, 4), "dining":       (4, 3),
        "master_bedroom": (5, 4), "bedroom":      (4, 4), "bathroom":     (3, 2),
        "guest_room":     (4, 3), "study":        (3, 3), "home_office":  (3, 3),
        "parking":        (5, 5), "gym":          (4, 4), "staircase":    (3, 3),
        "elevator":       (2, 2), "storage":      (2, 2), "laundry":     (2, 2),
        "terrace":        (4, 3), "balcony":      (3, 2), "corridor":    (1, 1),
    }
    DEFAULT_SIZE = (3, 3)

    # Zone classification
    PUBLIC   = {"living_room", "living", "dining_room", "dining", "entrance"}
    SERVICE  = {"kitchen", "laundry", "storage"}
    PRIVATE  = {"bedroom", "master_bedroom", "guest_room", "study", "home_office"}
    WET      = {"bathroom"}
    CIRC     = {"staircase", "elevator"}
    OUTDOOR  = {"parking", "terrace", "balcony", "gym"}

    def plan(self, rooms_spec: dict, n_floors: int) -> dict[str, list[dict]]:
        random.seed(time.time() * 1000 + id(self))

        # ── Plot dimensions (ft → metres) — upper bound only ──
        pw = rooms_spec.get("plot_width") or 40
        pl = rooms_spec.get("plot_length") or 60
        max_w = max(8, int(round(pw * 0.3)))
        max_h = max(10, int(round(pl * 0.3)))

        r_counts = rooms_spec.get("rooms", {})
        all_rooms = []
        for k, v in r_counts.items():
            if isinstance(v, int) and v > 0:
                all_rooms.extend([k] * v)

        if not all_rooms:
            btype = rooms_spec.get("building_type", "house")
            if btype == "office":
                all_rooms = ["study", "home_office", "bathroom", "kitchen", "study"]
            elif btype == "apartment":
                all_rooms = ["living_room", "kitchen", "bathroom", "bedroom", "balcony"]
            else:
                all_rooms = ["living_room", "kitchen", "dining_room",
                             "bathroom", "master_bedroom", "bedroom", "bedroom"]

        # Classify rooms into zones
        public  = [r for r in all_rooms if r in self.PUBLIC]
        service = [r for r in all_rooms if r in self.SERVICE]
        private = [r for r in all_rooms if r in self.PRIVATE]
        wet     = [r for r in all_rooms if r in self.WET]
        circ    = [r for r in all_rooms if r in self.CIRC]
        outdoor = [r for r in all_rooms if r in self.OUTDOOR]

        if not public:
            public = ["living_room"]

        # ── Ensure each floor has at least kitchen + living for multi-floor ──
        if n_floors > 1:
            while len(service) < n_floors:
                service.append("kitchen")
            while len(public) < n_floors:
                public.append("living_room")

        # ── Compute building size from actual room requirements ──
        total_area = sum(self.SIZES.get(r, self.DEFAULT_SIZE)[0] *
                         self.SIZES.get(r, self.DEFAULT_SIZE)[1]
                         for r in (["entrance"] + public + service + private + wet))
        total_area += len(private) * 2  # corridor overhead
        per_floor_area = total_area / max(1, n_floors)
        grid_w = max(8, min(max_w, int(math.ceil(math.sqrt(per_floor_area * 1.4)))))
        grid_h = max(10, min(max_h, int(math.ceil(per_floor_area / grid_w)) + 6))

        # ── Distribute ALL room types evenly across floors ──
        chunk_pub  = math.ceil(len(public) / max(1, n_floors))
        chunk_svc  = math.ceil(len(service) / max(1, n_floors))
        chunk_priv = math.ceil(len(private) / max(1, n_floors))
        chunk_wet  = math.ceil(len(wet) / max(1, n_floors))

        building = {}
        for fn in range(1, n_floors + 1):
            floor_pub  = public[(fn-1)*chunk_pub : fn*chunk_pub]
            floor_svc  = service[(fn-1)*chunk_svc : fn*chunk_svc]
            floor_priv = private[(fn-1)*chunk_priv : fn*chunk_priv]
            floor_wet  = wet[(fn-1)*chunk_wet : fn*chunk_wet]
            floor_out  = outdoor if fn == 1 else []

            # Every floor must have at least a living + kitchen
            if not floor_pub:
                floor_pub = ["living_room"]
            if not floor_svc:
                floor_svc = ["kitchen"]

            building[f"floor_{fn}"] = self._layout_floor(
                floor_pub, floor_svc, floor_priv, list(floor_wet), circ if n_floors > 1 else [],
                floor_out, fn, grid_w, grid_h
            )

        print(f"  [FloorPlanner] Generated {len(building)} floors on {grid_w}x{grid_h} grid, "
              f"rooms per floor: {[len(v) for v in building.values()]}")
        return building


    # ── Row-based helper: place rooms in a row and stretch to fill width ──
    def _place_row(self, room_list, x0, y, row_h, grid_w, floor_num):
        """Place rooms in a horizontal row, stretching widths to fill grid_w."""
        if not room_list:
            return []
        # Get natural sizes
        items = []
        for rtype in room_list:
            w, h = self.SIZES.get(rtype, self.DEFAULT_SIZE)
            items.append({"room": rtype, "nat_w": w, "h": min(h, row_h)})

        total_nat = sum(it["nat_w"] for it in items)
        avail = grid_w - x0

        # Stretch widths proportionally to fill available space
        placed = []
        cx = x0
        for i, it in enumerate(items):
            if i == len(items) - 1:
                # Last room takes all remaining width
                w = avail - (cx - x0)
            else:
                w = max(2, int(round(it["nat_w"] * avail / total_nat)))
            h = row_h
            placed.append({"room": it["room"], "x": cx, "y": y,
                           "w": w, "h": h, "floor": floor_num})
            cx += w
        return placed

    def _place_private_zone(self, private, wet, zone_y, zone_h, grid_w, floor_num):
        """Place bedrooms with small bathrooms tucked beside them.
        Bedrooms expand to fill available width — no wasted corridor."""
        placed = []
        BATH_W, BATH_H = 2, 3  # bathroom ~6 sq m (fixed small size)

        if not private and not wet:
            private = ["bedroom"]

        # Build pairs
        pairs = []
        for rtype in private:
            if wet:
                pairs.append((rtype, True))
                wet.pop(0)
            else:
                pairs.append((rtype, False))

        if not pairs:
            return placed

        # Count how many pairs fit per row
        n_pairs = len(pairs)
        row_h = min(max(4, zone_h // max(1, math.ceil(n_pairs * 6 / grid_w))), zone_h)

        # Layout pairs in rows
        cx, cy = 0, zone_y
        row_items = []  # collect items for current row

        def flush_row(items, y, h):
            """Place a row of bedroom(+bath) items, expanding to fill grid_w."""
            if not items:
                return
            # Calculate total natural width
            total_nat = sum(it["nat_w"] for it in items)
            avail = grid_w
            rx = 0
            for idx, it in enumerate(items):
                # Proportional width, last item takes remainder
                if idx == len(items) - 1:
                    w = avail - rx
                else:
                    w = max(3, int(round(it["nat_w"] * avail / total_nat)))

                if it["has_bath"]:
                    # Bathroom gets fixed small width, bedroom gets the rest
                    bw = min(BATH_W, max(2, w // 3))
                    bed_w = w - bw
                    placed.append({"room": it["room"], "x": rx, "y": y,
                                   "w": bed_w, "h": h, "floor": floor_num})
                    placed.append({"room": "bathroom", "x": rx + bed_w, "y": y,
                                   "w": bw, "h": min(BATH_H, h), "floor": floor_num})
                    # Fill gap below bathroom if any
                    if h > BATH_H:
                        placed.append({"room": "storage", "x": rx + bed_w, "y": y + BATH_H,
                                       "w": bw, "h": h - BATH_H, "floor": floor_num})
                else:
                    placed.append({"room": it["room"], "x": rx, "y": y,
                                   "w": w, "h": h, "floor": floor_num})
                rx += w

        for bedroom, has_bath in pairs:
            nat_w = 6 if has_bath else 4  # natural width of this pair
            # Check if adding this pair would exceed grid width
            total_row_nat = sum(it["nat_w"] for it in row_items) + nat_w
            if total_row_nat > grid_w * 1.8 and row_items:
                # Flush current row
                flush_row(row_items, cy, row_h)
                cy += row_h
                row_items = []

            row_items.append({"room": bedroom, "has_bath": has_bath, "nat_w": nat_w})

        # Flush last row — expand height to fill remaining zone
        remaining_h = max(row_h, zone_h - (cy - zone_y))
        flush_row(row_items, cy, remaining_h)

        return placed


    def _layout_floor(self, public, service, private, wet, circ, outdoor,
                      floor_num, grid_w, grid_h):
        placed = []

        # ── Reserve space for circulation at bottom ──
        circ_h = 0
        if circ:
            circ_h = 3  # staircase/elevator height
        usable_h = grid_h - circ_h

        if floor_num == 1:
            # ── GROUND FLOOR LAYOUT ──
            # Row 1: Entrance + Public + Service (top of plan)
            row1_rooms = ["entrance"] + public + service
            row1_h = max(self.SIZES.get(r, self.DEFAULT_SIZE)[1] for r in row1_rooms)
            row1 = self._place_row(row1_rooms, 0, 0, row1_h, grid_w, floor_num)
            placed.extend(row1)

            # Row 2: Corridor
            corr_y = row1_h
            placed.append({"room": "corridor", "x": 0, "y": corr_y,
                           "w": grid_w, "h": 1, "floor": floor_num})

            # Row 3: Private zone — bedrooms with realistically-sized bathrooms
            priv_y = corr_y + 1
            priv_h = max(usable_h - priv_y, 4)
            placed.extend(self._place_private_zone(
                private, wet, priv_y, priv_h, grid_w, floor_num))

            # Outdoor (parking etc) — place below private if space
            for rtype in outdoor:
                ow, oh = self.SIZES.get(rtype, (4, 3))
                out_y = priv_y + priv_h
                if out_y + oh <= usable_h:
                    placed.append({"room": rtype, "x": 0, "y": out_y,
                                   "w": grid_w, "h": oh, "floor": floor_num})

        else:
            # ── UPPER FLOOR LAYOUT ──
            # Bedrooms with attached bathrooms filling the full footprint
            priv_h = max(usable_h, 4)
            placed.extend(self._place_private_zone(
                private, wet, 0, priv_h, grid_w, floor_num))

        # ── Circulation (staircase/elevator) — bottom strip, full width ──
        if circ:
            circ_y = usable_h
            cx = 0
            for rtype in circ:
                w, h = self.SIZES.get(rtype, (3, 3))
                placed.append({"room": rtype, "x": cx, "y": circ_y,
                               "w": w, "h": circ_h, "floor": floor_num, "structural": True})
                cx += w
            # Fill remaining circ row width
            if cx < grid_w:
                placed.append({"room": "corridor", "x": cx, "y": circ_y,
                               "w": grid_w - cx, "h": circ_h, "floor": floor_num})

        return placed


# ─────────────────────────────────────────────────────────────────────────────
# Pipeline result
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class PipelineResult:
    input_text:    str
    nlp:           dict
    constraints:   dict
    building:      dict   # {"floor_1": [...], ...}
    structural:    dict   # {"floor_1": {"columns":[],"beams":[],"slabs":[]}}
    mep:           dict   # {"plumbing_routes":[], "electrical_routes":[]}
    tasks:         list[dict]
    schedule:      dict
    cost:          dict
    timings:       dict
    errors:        list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "input_text":  self.input_text,
            "nlp":         self.nlp,
            "constraints": self.constraints,
            "building":    self.building,
            "structural":  self.structural,
            "mep":         self.mep,
            "tasks":       self.tasks,
            "schedule":    self.schedule,
            "cost":        self.cost,
            "timings_sec": self.timings,
            "errors":      self.errors,
        }

    def to_json(self, indent: int = 2) -> str:
        return json.dumps(self.to_dict(), indent=indent)

    def summary(self) -> str:
        c = self.cost
        s = self.schedule
        lines = [
            "╔" + "═"*56 + "╗",
            "║  BIM PIPELINE — FULL BUILD SUMMARY                    ║",
            "╠" + "═"*56 + "╣",
            f"║  Input       : {self.input_text[:50]:<50} ║",
            f"║  Floors      : {self.nlp.get('floors',1):<50} ║",
            f"║  Rooms       : {len([r for fl in self.building.values() for r in fl if not r.get('structural')]):<50} ║",
            f"║  Columns     : {sum(len(v.get('columns',[])) for v in self.structural.values()):<50} ║",
            f"║  Plumb runs  : {len(self.mep.get('plumbing_routes',[])):<50} ║",
            f"║  Elec runs   : {len(self.mep.get('electrical_routes',[])):<50} ║",
            f"║  Tasks       : {len(self.tasks):<50} ║",
            f"║  Duration    : {s.get('project_duration_days',0):.0f} days (P90: {s.get('pert_p90_days',0):.0f}d){'':<24} ║",
            f"║  Material    : ${c.get('material_cost',0):>12,.0f}{'':<36} ║",
            f"║  Labor       : ${c.get('labor_cost',0):>12,.0f}{'':<36} ║",
            f"║  Grand Total : ${c.get('grand_total',0):>12,.0f}{'':<36} ║",
            f"║  Cost/m²     : ${c.get('cost_per_m2',0):>12,.0f}{'':<36} ║",
            "╚" + "═"*56 + "╝",
        ]
        return "\n".join(lines)


# ─────────────────────────────────────────────────────────────────────────────
# Pipeline
# ─────────────────────────────────────────────────────────────────────────────

class BIMPipeline:
    """
    Full Building Information Model generation pipeline.
    Call run(text) to execute all stages.
    """

    def __init__(self, verbose: bool = True):
        self.verbose    = verbose
        self._nlp       = BuildingNLPParser()
        self._cv        = ConstraintValidator()
        self._planner   = QuickFloorPlanner()
        self._sched     = ProjectScheduler()
        self._cost      = CostEstimationModel()
        self._struct    = MultiFloorStructuralGrid() if STRUCTURAL_OK else None
        self._models_ready = False

    def prepare(self):
        """Pre-train all ML models. Call once before run()."""
        if self.verbose:
            print("\n── Preparing ML models ─────────────────────────────────")
        if self._struct:
            self._struct.train(verbose=self.verbose)
        self._cost.train(verbose=self.verbose)
        self._models_ready = True
        if self.verbose:
            print("── Models ready ────────────────────────────────────────\n")

    def run(self, text: str) -> PipelineResult:
        t_total = time.time()
        timings = {}
        errors  = []

        def step(name: str, fn):
            t0 = time.time()
            try:
                result = fn()
                timings[name] = round(time.time() - t0, 3)
                if self.verbose:
                    print(f"  ✓ {name:<28} {timings[name]:.2f}s")
                return result
            except Exception as e:
                timings[name]  = round(time.time() - t0, 3)
                errors.append(f"{name}: {str(e)}")
                if self.verbose:
                    print(f"  ✗ {name:<28} ERROR: {e}")
                return None

        if self.verbose:
            print("\n" + "═"*60)
            print("  BIM PIPELINE EXECUTING")
            print("═"*60)
            print(f"INPUT: {text}")

        # ── Stage 1: NLP ─────────────────────────────────────────────
        nlp_result = step("1. NLP extraction",
            lambda: self._nlp.parse(text))
        nlp_dict = nlp_result.to_dict() if nlp_result else {"floors":1,"rooms":{"bedroom":2},"parking":False}
        nlp_dict.pop("warnings", None)

        if self.verbose:
            print(f"CONSTRAINTS: {json.dumps(nlp_dict)}")

        # ── Stage 2: Constraint validation ───────────────────────────
        cv_result = step("2. Constraint validation",
            lambda: self._cv.validate(nlp_dict))
        cv_dict = cv_result.to_dict() if cv_result else {}

        # ── Stage 3: Floor plan generation ───────────────────────────
        n_floors  = nlp_dict.get("floors", 1)
        building  = step("3. Floor plan generation",
            lambda: self._planner.plan(nlp_dict, n_floors))
        if building is None:
            building = {"floor_1":[{"room":"living_room","x":0,"y":0,"w":5,"h":5}]}

        # ── Stage 4: Structural grid ──────────────────────────────────
        if self._struct and self._models_ready:
            structural_all = step("4. Structural grid",
                lambda: self._struct.generate_all(building, verbose=False))
            structural_dict = {
                f"floor_{fn}": g.to_dict()
                for fn, g in (structural_all or {}).items()
            }
        else:
            structural_dict = self._fallback_structural(building)
            timings["4. Structural grid"] = 0.0

        # Combined columns for MEP
        all_cols = []
        for fd in structural_dict.values():
            all_cols.extend(fd.get("columns", []))

        # ── Stage 5: MEP routing ──────────────────────────────────────
        all_rooms = [r for fl in building.values() for r in fl]
        core_dict = {}

        def do_mep():
            router = MEPRouter(all_rooms, all_cols, core_dict)
            return router.route()

        mep_result = step("5. MEP routing", do_mep)
        mep_dict   = mep_result.path_coords() if mep_result else {"plumbing_routes":[],"electrical_routes":[]}

        # ── Stage 6: Construction tasks ───────────────────────────────
        area_m2    = (nlp_dict.get("plot_width") or 20) * (nlp_dict.get("plot_length") or 20)
        s1_struct  = list(structural_dict.values())[0] if structural_dict else {}

        def do_tasks():
            eng = ConstructionTaskEngine()
            eng.generate(
                rooms      = all_rooms,
                structural = s1_struct,
                mep        = mep_dict,
                n_floors   = n_floors,
                area_m2    = float(area_m2),
            )
            return eng

        task_eng = step("6. Task generation", do_tasks)
        tasks_list = [t.to_dict() for t in (task_eng.tasks if task_eng else [])]

        # ── Stage 7: CPM/PERT scheduling ─────────────────────────────
        def do_schedule():
            return self._sched.compute(task_eng.tasks, task_eng.get_dag())

        schedule_result = step("7. CPM/PERT scheduling", do_schedule)
        schedule_dict   = schedule_result.to_dict() if schedule_result else {}

        # ── Stage 8: Cost estimation ──────────────────────────────────
        def do_cost():
            return self._cost.estimate(
                area_m2    = float(area_m2),
                n_rooms    = len(all_rooms),
                n_floors   = n_floors,
                rooms      = all_rooms,
                structural = s1_struct,
                mep        = mep_dict,
            )

        cost_result = step("8. Cost estimation", do_cost)
        cost_dict   = cost_result.to_dict() if cost_result else {}

        timings["total"] = round(time.time() - t_total, 3)
        if self.verbose:
            print(f"\n  Total pipeline time: {timings['total']}s")
            if errors:
                print(f"  Errors: {len(errors)}")

        return PipelineResult(
            input_text   = text,
            nlp          = nlp_dict,
            constraints  = cv_dict,
            building     = building,
            structural   = structural_dict,
            mep          = mep_dict,
            tasks        = tasks_list,
            schedule     = schedule_dict,
            cost         = cost_dict,
            timings      = timings,
            errors       = errors,
        )

    def _fallback_structural(self, building: dict) -> dict:
        """Column grid fallback — only within actual building footprint."""
        result = {}
        for key, layout in building.items():
            if not layout:
                result[key] = {"columns": [], "beams": [], "slabs": []}
                continue
            # Compute actual building bounding box from placed rooms
            max_x = max(r['x'] + r['w'] for r in layout)
            max_y = max(r['y'] + r['h'] for r in layout)
            # Place columns at ~4m spacing within bounds only
            spacing = 4
            cols = []
            for x in range(0, max_x + 1, spacing):
                for y in range(0, max_y + 1, spacing):
                    cols.append([float(x), float(y)])
            # Also add boundary columns at max extents if not already covered
            for x in range(0, max_x + 1, spacing):
                if [float(x), float(max_y)] not in cols:
                    cols.append([float(x), float(max_y)])
            for y in range(0, max_y + 1, spacing):
                if [float(max_x), float(y)] not in cols:
                    cols.append([float(max_x), float(y)])
            result[key] = {"columns": cols, "beams": [], "slabs": []}
        return result



class BIMApp:
    

    def __init__(self):
        self.pipeline = BIMPipeline(verbose=True)
        self._ready   = False

    def startup(self):
        """Call on app startup — trains all ML models."""
        self.pipeline.prepare()
        self._ready = True

    def generate(self, requirement_text: str, save_outputs: bool = True) -> dict:
        """
        POST /generate  — Main API endpoint.
        Input : {"requirement": "I want a 2 floor house..."}
        Output: Full BIM JSON
        """
        if not self._ready:
            self.startup()

        result = self.pipeline.run(requirement_text)

        if save_outputs:
            out = Path("outputs"); out.mkdir(exist_ok=True)
            with open(out / "pipeline_result.json", "w") as f:
                json.dump(result.to_dict(), f, indent=2)

            # Gantt chart
            if result.schedule.get("tasks"):
                from scheduler import Schedule, ScheduledTask
                try:
                    sched_obj = self._rebuild_schedule(result.schedule)
                    self.pipeline._sched.gantt_chart(
                        sched_obj, save_path=str(out/"gantt.png")
                    )
                except Exception as e:
                    print(f"  Gantt chart error: {e}")

        print("\n" + result.summary())
        return result.to_dict()

    def _rebuild_schedule(self, schedule_dict: dict):
        """Rebuild Schedule object from dict for visualization."""
        from scheduler import Schedule, ScheduledTask
        tasks = []
        for td in schedule_dict.get("tasks", []):
            st = ScheduledTask(
                task=td["task"], crew=td["crew"],
                duration=td["duration_days"], workers=td["workers"],
                cost_usd=td["cost_usd"], description=td.get("description",""),
                es=td["es"], ef=td["ef"], ls=td["ls"], lf=td["lf"],
                tf=td["float_days"],
                pert_expected=td.get("pert_expected",td["duration_days"]),
                pert_variance=td.get("pert_std",0)**2,
                on_critical_path=td["on_critical_path"],
            )
            tasks.append(st)
        return Schedule(
            tasks=tasks,
            project_duration=schedule_dict["project_duration_days"],
            critical_path=schedule_dict["critical_path"],
            total_cost=schedule_dict["total_cost_usd"],
            pert_p50=schedule_dict.get("pert_p50_days",0),
            pert_p90=schedule_dict.get("pert_p90_days",0),
            worker_peak=schedule_dict.get("worker_peak",0),
        )
