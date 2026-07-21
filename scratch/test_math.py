# scratch/test_math.py

# Yearly configurations based on the payslips
YEAR_CONFIGS = {
    "2023": {
        "brackets": [
            {"limit": 409986, "rate": 0.3145},
            {"limit": 1151780, "rate": 0.3795},
            {"limit": float('inf'), "rate": 0.4625}
        ],
        "personal_credit": 59665,
        "union_rate": 0.010,
        "ot1_mult": 1.56,
        "ot2_mult": 1.794
    },
    "2024": {
        "brackets": [
            {"limit": 446137, "rate": 0.3148},
            {"limit": 1252501, "rate": 0.3798},
            {"limit": float('inf'), "rate": 0.4628}
        ],
        "personal_credit": 64926,
        "union_rate": 0.010,
        "ot1_mult": 1.56,
        "ot2_mult": 1.794
    },
    "2026": {
        "brackets": [
            {"limit": 498123, "rate": 0.3149},
            {"limit": 1398307, "rate": 0.3799}, # standard 2026 bracket
            {"limit": float('inf'), "rate": 0.4629}
        ],
        "personal_credit": 72492,
        "union_rate": 0.010,
        "ot1_mult": 1.56,
        "ot2_mult": 1.794
    }
}

payslips = [
    {
        "name": "Payslip 7 2023.pdf",
        "year": "2023",
        "hours": 126.00,
        "rate": 4256.07,
        "ot1_hours": 16.50,
        "ot2_hours": 0.0,
        "bonus": 0.0,
        "deductions": 10000.0, # Vöruúttekt
        "orlof_pct": 10.17,
        "apply_tax_credit": True,
        "expected_gross": 711494,
        "expected_net": 425342
    },
    {
        "name": "Payslip 7 2024.pdf",
        "year": "2024",
        "hours": 148.00,
        "rate": 4695.64,
        "ot1_hours": 17.33,
        "ot2_hours": 20.67,
        "bonus": 50000.0,
        "deductions": 18999.0 + 6966.0 + 2000.0, # Vöruúttekt + Opinber + Starfsmannafélag
        "orlof_pct": 10.64,
        "apply_tax_credit": True,
        "expected_gross": 1157320,
        "expected_net": 632149
    },
    {
        "name": "Payslip 10 2024.pdf",
        "year": "2024",
        "hours": 144.00,
        "rate": 4695.64,
        "ot1_hours": 17.33,
        "ot2_hours": 75.67,
        "bonus": 50000.0,
        "deductions": 4432.0 + 2000.0, # Vöruúttekt + Starfsmannafélag
        "orlof_pct": 10.64,
        "apply_tax_credit": True,
        "expected_gross": 1649156,
        "expected_net": 866852
    },
    {
        "name": "Payslip 6 2026.pdf",
        "year": "2026",
        "hours": 138.87,
        "rate": 5129.07,
        "ot1_hours": 5.80,
        "ot2_hours": 0.0,
        "bonus": 50000.0,
        "deductions": 7400.0 + 2000.0, # Opinber + Starfsmannafélag
        "orlof_pct": 12.07,
        "apply_tax_credit": True,
        "expected_gross": 906289,
        "expected_net": 528309
    }
]

for p in payslips:
    cfg = YEAR_CONFIGS[p["year"]]
    
    # 1. Base Earnings
    reg_pay = p["hours"] * p["rate"]
    ot1_pay = p["ot1_hours"] * p["rate"] * cfg["ot1_mult"]
    ot2_pay = p["ot2_hours"] * p["rate"] * cfg["ot2_mult"]
    base_subtotal = reg_pay + ot1_pay + ot2_pay + p["bonus"]
    
    # 2. Orlof
    orlof_amount = base_subtotal * (p["orlof_pct"] / 100)
    brutto = base_subtotal + orlof_amount
    
    # 3. Pension
    pension = brutto * 0.04
    
    # 4. Taxable Income
    taxable_income = brutto - pension # no private pension in these samples
    
    # 5. Income Tax
    remaining = taxable_income
    computed_tax = 0
    last_limit = 0
    for b in cfg["brackets"]:
        limit = b["limit"]
        rate = b["rate"]
        span = limit - last_limit
        if remaining > span:
            computed_tax += span * rate
            remaining -= span
            last_limit = limit
        else:
            computed_tax += remaining * rate
            remaining = 0
            break
            
    personal_credit = cfg["personal_credit"] if p["apply_tax_credit"] else 0
    net_tax = max(0.0, computed_tax - personal_credit)
    
    # 6. Union Fee
    union = brutto * cfg["union_rate"]
    
    # 7. Net Salary calculation
    # Note: Orlof is added to brutto, but it is paid into a bank account (so it is deducted from the payout!)
    net_payout = brutto - pension - union - net_tax - p["deductions"] - orlof_amount
    
    print("-" * 50)
    print(f"File: {p['name']}")
    print(f"Calculated Gross: {round(brutto)} | Expected: {p['expected_gross']} | Diff: {round(brutto) - p['expected_gross']}")
    print(f"Calculated Net:   {round(net_payout)} | Expected: {p['expected_net']} | Diff: {round(net_payout) - p['expected_net']}")
