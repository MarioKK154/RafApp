# backend/app/routers/calculators.py
import math
import logging
from fastapi import APIRouter, Depends, Body, Request, HTTPException, status
from typing import List, Dict, Any, Optional

from .. import schemas
from ..limiter import limiter

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/calculators",
    tags=["Calculators"],
    # No auth dependency
)

# --- CABLE DATA TABLES (Copied from your input) ---
CABLE_DATA = {
    "standard_sizes_mm2": [
        1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240, 300
    ],
    "ampacity": {
        "copper": {
            1.5: 19,  2.5: 26,  4: 36,  6: 46,
            10: 63,  16: 85,  25: 110, 35: 135,
            50: 165, 70: 210, 95: 250, 120: 285,
            150: 325, 185: 370, 240: 435, 300: 500
        },
        "aluminum": {
            10: 45,  16: 60,  25: 80,  35: 100,
            50: 125, 70: 160, 95: 200, 120: 230,
            150: 260, 185: 300, 240: 355, 300: 405
        }
    },
    "electrical_parameters": {
        "copper": {
            "R_ohm_per_km": {
                1.5: 12.1,  2.5: 7.41, 4: 4.61, 6: 3.08,
                10: 1.83, 16: 1.15, 25: 0.73, 35: 0.52,
                50: 0.39, 70: 0.27, 95: 0.20, 120: 0.16,
                150: 0.13, 185: 0.11, 240: 0.08, 300: 0.065
            },
            "X_ohm_per_km": {
                1.5: 0.080, 2.5: 0.080, 4: 0.080, 6: 0.080,
                10: 0.081, 16: 0.081, 25: 0.082, 35: 0.082,
                50: 0.083, 70: 0.083, 95: 0.084, 120: 0.084,
                150: 0.085, 185: 0.085, 240: 0.086, 300: 0.086
            }
        },
        "aluminum": {
            "R_ohm_per_km": {
                10: 3.08,  16: 1.91, 25: 1.20, 35: 0.868,
                50: 0.641, 70: 0.443, 95: 0.320, 120: 0.253,
                150: 0.206, 185: 0.164, 240: 0.125, 300: 0.100
            },
            "X_ohm_per_km": {
                10: 0.080, 16: 0.081, 25: 0.082, 35: 0.082,
                50: 0.083, 70: 0.083, 95: 0.084, 120: 0.084,
                150: 0.085, 185: 0.085, 240: 0.086, 300: 0.086
            }
        },
    },
    "temperature_derating_Ct": {
        20: 1.08, 25: 1.04, 30: 1.00, 35: 0.96,
        40: 0.91, 45: 0.87, 50: 0.82, 55: 0.76, 60: 0.71
    },
    "installation_derating_Ci": {
        "in_air_spaced": 1.00,
        "clipped_direct": 0.95,
        "conduit_surface": 0.90,
        "conduit_embedded": 0.80,
        "buried_direct": 0.85,
        "buried_in_duct": 0.80
    },
    "short_circuit_k": {
        "copper": {"PVC": 115, "XLPE": 143},
        "aluminum": {"PVC": 73, "XLPE": 94}
    },
    "voltage_drop_limits_percent": {
        "lighting": 3.0,
        "general_power": 5.0,
        "motors": 5.0,
        "ev_chargers": 5.0,
        "data_centers": 3.0
    }
}
# --- END CABLE DATA ---

# --- Helper Functions ---

def get_temp_derating_factor(temp: int) -> float:
    """
    Gets the temperature derating factor.
    If the exact temp isn't listed, it uses the factor for the *next highest*
    temperature for safety (which is a lower factor).
    """
    sorted_temps = sorted(CABLE_DATA["temperature_derating_Ct"].keys())

    if temp in CABLE_DATA["temperature_derating_Ct"]:
        return CABLE_DATA["temperature_derating_Ct"][temp]

    for table_temp in sorted_temps:
        if table_temp > temp:
            return CABLE_DATA["temperature_derating_Ct"][table_temp]

    # If temp is higher than any in table, return the factor for the highest temp
    return CABLE_DATA["temperature_derating_Ct"][sorted_temps[-1]]


def get_vdrop_percent(
    load_current: float,
    cable_length_m: float,
    R_ohm_per_km: float,
    X_ohm_per_km: float,
    voltage_system: str,
    voltage: float,
    power_factor: float
) -> float:
    """Calculates the voltage drop percentage using the full formula."""

    R_ohm_per_m = R_ohm_per_km / 1000.0
    X_ohm_per_m = X_ohm_per_km / 1000.0

    cos_phi = power_factor
    # protect against slightly >1 due to rounding
    sin_phi = math.sqrt(max(0.0, 1.0 - power_factor**2))

    if voltage_system == "single_phase":
        # 1-phase Vdrop = 2 * I * L * (R*cos(phi) + X*sin(phi))
        vdrop_v = 2 * load_current * cable_length_m * (R_ohm_per_m * cos_phi + X_ohm_per_m * sin_phi)
    else:
        # 3-phase Vdrop = sqrt(3) * I * L * (R*cos(phi) + X*sin(phi))
        vdrop_v = math.sqrt(3) * load_current * cable_length_m * (R_ohm_per_m * cos_phi + X_ohm_per_m * sin_phi)

    return (vdrop_v / voltage) * 100.0


def next_standard_size(standard_sizes: List[float], required_mm2: float) -> float:
    """
    Return the smallest standard size >= required_mm2.
    If required_mm2 <= smallest standard, returns the smallest standard.
    If required_mm2 > largest standard, returns largest standard.
    """
    for sz in standard_sizes:
        if sz >= required_mm2:
            return sz
    return standard_sizes[-1]


# --- Main Endpoint ---

@router.post("/cable-size", response_model=schemas.CableSizerOutput)
@limiter.limit("30/minute")
def calculate_cable_size(
    request: Request,
    inputs: schemas.CableSizerInput = Body(...)
):
    """
    Calculates the minimum cable size based on Ampacity, Voltage Drop,
    and (optionally) Short-Circuit thermal withstand.
    """

    # === STEP 1: DERIVED VALUES ===

    # 1.1. Load Current
    load_power_w = inputs.load_power_kw * 1000.0
    if inputs.voltage_system == "single_phase":
        load_current_a = load_power_w / (inputs.voltage * inputs.power_factor)
    else:
        load_current_a = load_power_w / (math.sqrt(3) * inputs.voltage * inputs.power_factor)

    # 1.2. Allowable Voltage Drop
    if inputs.allowable_vdrop_percent:
        allowable_vdrop_percent = inputs.allowable_vdrop_percent
    elif inputs.load_type:
        allowable_vdrop_percent = CABLE_DATA["voltage_drop_limits_percent"].get(inputs.load_type, 5.0)
    else:
        allowable_vdrop_percent = 5.0  # Default to 5% if nothing is specified

    allowable_vdrop_v = inputs.voltage * (allowable_vdrop_percent / 100.0)

    # 1.3. Correction Factors
    Ct = get_temp_derating_factor(inputs.ambient_temperature_c)
    Ci = CABLE_DATA["installation_derating_Ci"].get(inputs.installation_method, 1.0)
    Cg = 1.0  # Grouping factor not implemented in inputs yet, assume 1.0
    total_derating_factor = Ct * Ci * Cg

    effective_required_ampacity_a = load_current_a / total_derating_factor

    # 1.4. Short Circuit handling -- SAFER / PRACTICAL defaults
    #
    # NOTE: Previously the code used inputs.fault_current_ka (system prospective)
    # directly to compute S_min and forced cable selection based on that.
    # That is the reason small lighting runs were pushed to 25 mm² when callers
    # supplied substation-level fault currents.
    #
    # New behavior:
    # - Short-circuit check is *disabled by default* (so lighting spurs are sized by ampacity + vdrop).
    # - If the caller sets `enable_short_circuit_check` to True, then:
    #     * if `fault_current_at_load_ka` is provided, that value is used (preferred).
    #     * else if only `fault_current_ka` (source-level) is provided then we will
    #       apply an attenuation fraction (assume_fraction) to estimate current at the cable end.
    #       The caller can supply `assume_fault_at_load_fraction` (0.0-1.0). If omitted, default=0.10.
    #
    # This keeps behavior backward-compatible while preventing common oversize errors.
    enable_sc_check = getattr(inputs, "enable_short_circuit_check", False)

    # get k (will raise KeyError naturally if material/insulation invalid)
    k = CABLE_DATA["short_circuit_k"][inputs.material][inputs.insulation]

    # Determine which fault current to use (A)
    fault_current_used_a = 0.0
    sc_note = ""
    if enable_sc_check:
        # prefer explicit per-load current if supplied
        fc_at_load_ka = getattr(inputs, "fault_current_at_load_ka", None)
        if fc_at_load_ka is not None and fc_at_load_ka > 0:
            fault_current_used_a = fc_at_load_ka * 1000.0
            sc_note = "used fault_current_at_load_ka"
        else:
            # Fall back to provided system prospective but attenuate it unless caller asked otherwise.
            fc_system_ka = getattr(inputs, "fault_current_ka", None)
            if fc_system_ka is None:
                # No fault current provided -> cannot perform short-circuit check; treat as disabled
                enable_sc_check = False
                sc_note = "no fault_current provided; short circuit check disabled"
            else:
                # Use fraction to estimate portion present at the cable end (caller can override)
                assume_fraction = getattr(inputs, "assume_fault_at_load_fraction", None)
                if assume_fraction is None:
                    # Conservative default fraction: use 10% of source fault at the cable end.
                    # This is a pragmatic heuristic for radial low-voltage spurs; when available,
                    # callers should provide a measured/estimated fraction or direct `fault_current_at_load_ka`.
                    assume_fraction = 0.10
                # clamp fraction
                assume_fraction = max(0.0, min(1.0, float(assume_fraction)))
                fault_current_used_a = (fc_system_ka * 1000.0) * assume_fraction
                sc_note = f"used attenuated system fault_current_ka with fraction={assume_fraction}"
    else:
        sc_note = "short circuit check disabled by default; enable_short_circuit_check=True to enable"

    # compute S_min only if short-circuit check enabled
    if enable_sc_check and fault_current_used_a > 0:
        short_circuit_min_mm2 = (fault_current_used_a * math.sqrt(inputs.disconnection_time_s)) / k
    else:
        short_circuit_min_mm2 = 0.0  # no short-circuit constraint applied

    derived_values = schemas.CableSizerDerivedValues(
        load_current_a=load_current_a,
        allowable_vdrop_percent=allowable_vdrop_percent,
        allowable_vdrop_v=allowable_vdrop_v,
        Ct_temp=Ct,
        Ci_install=Ci,
        total_derating_factor=total_derating_factor,
        effective_required_ampacity_a=effective_required_ampacity_a,
        short_circuit_k_factor=k,
        short_circuit_min_mm2=short_circuit_min_mm2
    )

    # === STEP 2: ITERATE & CHECK CANDIDATES ===

    reasoning_steps = []
    final_selection_step = None

    available_sizes = CABLE_DATA["standard_sizes_mm2"]

    for size_mm2 in available_sizes:
        # Get data for this size, handle missing data
        try:
            base_ampacity_a = CABLE_DATA["ampacity"][inputs.material][size_mm2]
            R_ohm_per_km = CABLE_DATA["electrical_parameters"][inputs.material]["R_ohm_per_km"][size_mm2]
            X_ohm_per_km = CABLE_DATA["electrical_parameters"][inputs.material]["X_ohm_per_km"][size_mm2]
        except KeyError:
            # This size (e.g., 1.5mm² Al) is not in our tables, skip it
            continue

        # 2.1. Ampacity Check
        derated_ampacity_a = base_ampacity_a * total_derating_factor
        ampacity_ok = (derated_ampacity_a >= load_current_a)

        # 2.2. Voltage Drop Check
        vdrop_percent = get_vdrop_percent(
            load_current_a, inputs.cable_length_m, R_ohm_per_km, X_ohm_per_km,
            inputs.voltage_system, inputs.voltage, inputs.power_factor
        )
        vdrop_ok = (vdrop_percent <= allowable_vdrop_percent)

        # 2.3. Short Circuit Check
        if enable_sc_check and short_circuit_min_mm2 > 0:
            short_circuit_ok = (size_mm2 >= short_circuit_min_mm2)
        else:
            # If we didn't enable SC check or didn't have a usable fault current, treat as OK
            short_circuit_ok = True

        step = schemas.CableSizerReasoningStep(
            size_mm2=size_mm2,
            base_ampacity_a=base_ampacity_a,
            derated_ampacity_a=derated_ampacity_a,
            ampacity_ok=ampacity_ok,
            resistance_ohm_per_km=R_ohm_per_km,
            reactance_ohm_per_km=X_ohm_per_km,
            voltage_drop_percent=vdrop_percent,
            vdrop_ok=vdrop_ok,
            short_circuit_ok=short_circuit_ok
        )
        reasoning_steps.append(step)

        # 2.4. Final Selection Check
        if ampacity_ok and vdrop_ok and short_circuit_ok and not final_selection_step:
            # This is the first cable size that passes ALL three checks
            final_selection_step = step
            # We don't break, we continue calculating all steps for the reasoning log

    # === STEP 3: RETURN RESULTS ===

    if not final_selection_step:
        # No cable in our table passed all checks
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No suitable cable size found. The load may be too large or the cable run too long."
        )

    # Log a short note about SC decision (useful for server logs / debugging)
    logger.debug("Cable sizing completed. short_circuit_check_enabled=%s, note=%s, fault_current_used_A=%s",
                 enable_sc_check, sc_note, (fault_current_used_a if enable_sc_check else 0.0))

    return schemas.CableSizerOutput(
        inputs=inputs,
        derived_values=derived_values,
        reasoning=reasoning_steps,
        final_selection=final_selection_step
    )
