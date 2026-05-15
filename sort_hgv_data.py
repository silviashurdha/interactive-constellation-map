import numpy as np
import pandas as pd
import json

# ---------------------------------------------------------
# 1. Read in data from HYG and Stellarium files
# ---------------------------------------------------------
hyg = pd.read_csv("hyg_v42.csv")

with open("stellarium_data.json", "r", encoding="utf-8") as file:
    stellarium = json.load(file)

# ---------------------------------------------------------
# 2. Filter stars 
# ---------------------------------------------------------
# Remove the sun 
hyg = hyg[hyg['proper'] != 'Sol']
hyg = hyg[hyg['dec'] >= -40]

#Keep only stars visiable by naked eye
#hyg = hyg[hyg["mag"] <= 6].copy()
hyg = hyg.set_index("hip", drop=False)

# ---------------------------------------------------------
# 3. Build Stellarium star-name lookup (if present)
# ---------------------------------------------------------
stellarium_names = {}

if "star_names" in stellarium:
    for hip_str, name in stellarium["star_names"].items():
        try:
            stellarium_names[int(hip_str)] = name
        except:
            pass

# ---------------------------------------------------------
# 4. Name resolution (Option C)
# ---------------------------------------------------------
def resolve_name(hip):
    # 1. HYG proper name
    if hip in hyg.index:
        name = hyg.loc[hip, "proper"]
        if isinstance(name, str) and name.strip():
            return name.strip()

    # 2. Stellarium name
    if hip in stellarium_names:
        return stellarium_names[hip]

    # 3. Fallback: HIP number as string
    return str(hip)

# ---------------------------------------------------------
# 5. Normalize Stellarium line formats
# ---------------------------------------------------------
def normalize_line(raw):
    """
    Convert Stellarium line formats into a flat list of HIP integers.
    Handles:
    - [hip1, hip2, hip3]
    - ["thin", hip1, hip2]
    - {"type": "...", "line": [hip1, hip2]}
    - [[hip1, hip2], [hip3, hip4]]
    - [[[hip1, hip2]]]
    """

    # # Case 1: dict with "line"
    # if isinstance(raw, dict) and "line" in raw:
    #     raw = raw["line"]

    # # Case 2: ["thin", hip1, hip2]
    # if isinstance(raw, list) and len(raw) > 0 and isinstance(raw[0], str):
    #     raw = raw[1:]

    # # Case 3: nested lists → flatten until flat
    # while isinstance(raw, list) and len(raw) == 1 and isinstance(raw[0], list):
    #     raw = raw[0]

    # # Case 4: list of lists → flatten
    # if isinstance(raw, list) and any(isinstance(x, list) for x in raw):
    #     flat = []
    #     for item in raw:
    #         if isinstance(item, list):
    #             flat.extend(item)
    #         else:
    #             flat.append(item)
    #     raw = flat

    # # Final: keep only integers
    # return [x for x in raw if isinstance(x, int)]

        # Case 1: dict with "line"
    if isinstance(raw, dict) and "line" in raw:
        raw = raw["line"]

    # Case 2: ["thin", hip1, hip2]
    if isinstance(raw, list) and len(raw) > 0 and isinstance(raw[0], str):
        raw = raw[1:]

    # Case 3: nested single wrapper → unwrap once
    while isinstance(raw, list) and len(raw) == 1 and isinstance(raw[0], list):
        raw = raw[0]

    # IMPORTANT: do NOT flatten list-of-lists here.
    # If it's [[hip1, hip2], [hip3, hip4]], that represents
    # two separate segments and must be handled outside.

    # Final: keep only integers
    return [x for x in raw if isinstance(x, int)]

# ---------------------------------------------------------
# 6. Extract constellations
# ---------------------------------------------------------

def extract_segments(raw_line):
    """
    Returns a list of polylines.
    Each polyline is a list of HIP ints.
    """

    # Case 1: dict wrapper
    if isinstance(raw_line, dict) and "line" in raw_line:
        return [normalize_line(raw_line["line"])]

    # Case 2: ["thin", hip1, hip2]
    if isinstance(raw_line, list) and len(raw_line) > 0 and isinstance(raw_line[0], str):
        return [normalize_line(raw_line[1:])]

    # Case 3: list of lists → multiple polylines
    if isinstance(raw_line, list) and any(isinstance(x, list) for x in raw_line):
        polylines = []
        for sub in raw_line:
            if isinstance(sub, dict) and "line" in sub:
                polylines.append(normalize_line(sub["line"]))
            else:
                polylines.append(normalize_line(sub))
        return polylines

    # Case 4: simple polyline
    return [normalize_line(raw_line)]

constellations = {}

for c in stellarium["constellations"]:
    name = c["common_name"]["native"]
    constellations[name] = []

    for raw_line in c["lines"]:
        # # If this is a list of lists, treat each sub-line separately
        # if isinstance(raw_line, list) and any(isinstance(x, list) for x in raw_line):
        #     sub_lines = raw_line
        # else:
        #     sub_lines = [raw_line]
        polylines = extract_segments(raw_line)
        
        for line in polylines:
            for i in range(len(line) - 1):
                hip1 = line[i]
                hip2 = line[i + 1]

                # ⭐ Skip segments where either star is missing from HYG
                if hip1 not in hyg.index or hip2 not in hyg.index:
                    continue

                constellations[name].append({
                    "from": hip1,
                    "from_name": resolve_name(hip1),
                    "to": hip2,
                    "to_name": resolve_name(hip2)
                })

# ---------------------------------------------------------
# 7. Extract asterisms (robust handling)
# ---------------------------------------------------------
asterisms = {}

if "asterisms" in stellarium:
    for idx, a in enumerate(stellarium["asterisms"]):

        name = (
            a.get("common_name", {}).get("native")
            or a.get("common_name", {}).get("english")
            or a.get("name")
            or f"Asterism {idx}"
        )

        asterisms[name] = []

        for raw_line in a["lines"]:

            if isinstance(raw_line, list) and any(isinstance(x, list) for x in raw_line):
                sub_lines = raw_line
            else:
                sub_lines = [raw_line]

            for sub in sub_lines:
                line = normalize_line(sub)

                for i in range(len(line) - 1):
                    hip1 = line[i]
                    hip2 = line[i + 1]

                    asterisms[name].append({
                        "from": hip1,
                        "from_name": resolve_name(hip1),
                        "to": hip2,
                        "to_name": resolve_name(hip2)
                    })

# ---------------------------------------------------------
# 8. Stereographic projection of stars
# ---------------------------------------------------------
ra_hours = hyg["ra"]
dec_deg = hyg["dec"]
# Projection parameters
R = 1.0
ra0 = 0  # central RA in hours

# Convert units
ra = np.deg2rad(ra_hours * 15)   # hours → degrees → radians
ra0 = np.deg2rad(ra0 * 15)
dec = np.deg2rad(dec_deg)

# Angular difference
dalpha = ra - ra0

# Radial distance from pole
rho = 2 * R * np.tan((np.pi/2 - dec) / 2)

# Projected coordinates
hyg["x"] = rho * np.sin(dalpha)
hyg["y"] = rho * np.cos(dalpha)

# ---------------------------------------------------------
# 9. Prepare star output
# ---------------------------------------------------------
stars = hyg.reset_index(drop=True)[[
    "hip", "id", "proper", "ra", "dec", "mag", "ci", "con", "x", "y"
]]

stars["proper"] = stars["proper"].fillna("")

# ---------------------------------------------------------
# 10. Save final JSON
# ---------------------------------------------------------
final = {
    "stars": stars.to_dict(orient="records"),
    "constellations": constellations,
    "asterisms": asterisms
}

with open("sky.json", "w", encoding="utf-8") as f:
    json.dump(final, f, ensure_ascii=False, indent=2)

print("Arcturus exists:", 69673 in hyg.index)
print(hyg[hyg["hip"] == 69673] if 69673 in hyg.index else "NOT FOUND")
print(hyg.columns)

print("Done! Saved sky.json")
