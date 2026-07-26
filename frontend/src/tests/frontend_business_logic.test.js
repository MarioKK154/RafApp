import { describe, it, expect } from 'vitest';

/**
 * Pure Business Logic & State Transition Tests for RafApp Frontend
 */

// Icelandic Payroll Calculations (from AccountingPage.jsx)
function calculateIcelandicPayslip({ hours, hourlyRate, ot1Hours, ot1Multiplier, ot2Hours, ot2Multiplier, bonus, orlofPercent }) {
    const regularPay = hours * hourlyRate;
    const ot1Pay = ot1Hours * hourlyRate * ot1Multiplier;
    const ot2Pay = ot2Hours * hourlyRate * ot2Multiplier;
    const baseSubtotal = regularPay + ot1Pay + ot2Pay + bonus;
    const orlofAmount = baseSubtotal * (orlofPercent / 100);
    const grossSalary = baseSubtotal + orlofAmount;
    
    // Pension Dues (4% Mandatory Pension)
    const mandatoryPension = grossSalary * 0.04;
    const netTaxable = grossSalary - mandatoryPension;

    return {
        regularPay,
        ot1Pay,
        ot2Pay,
        baseSubtotal,
        orlofAmount,
        grossSalary,
        mandatoryPension,
        netTaxable
    };
}

// Landing Page Interactive Price Calculator Algorithm
function calculateSubscriptionCost(userCount, billingCycle) {
    let base = 14900;
    let extraUsers = 0;
    let extraRate = 2500;
    let tierEn = 'Starter (1-5 users)';

    if (userCount > 20) {
        tierEn = 'Enterprise (20+ users)';
        base = 69900;
        extraUsers = Math.max(0, userCount - 20);
        extraRate = 1800;
    } else if (userCount > 5) {
        tierEn = 'Pro (6-20 users)';
        base = 34900;
        extraUsers = userCount - 5;
        extraRate = 2200;
    }

    let subtotal = base + (extraUsers * extraRate);
    if (billingCycle === 'yearly') {
        subtotal = subtotal * 0.85; // 15% yearly discount
    }

    const vsk = subtotal * 0.24; // 24% Icelandic VSK tax
    const totalWithVsk = subtotal * 1.24;

    return { base, extraUsers, extraRate, subtotal, vsk, totalWithVsk, tierEn };
}

// Client-Side Search Filter Algorithm
function filterCollection(items, searchQuery) {
    if (!searchQuery) return items;
    const q = searchQuery.toLowerCase().trim();
    return items.filter(item => 
        (item.name && item.name.toLowerCase().includes(q)) ||
        (item.title && item.title.toLowerCase().includes(q)) ||
        (item.description && item.description.toLowerCase().includes(q))
    );
}

describe('Accounting & Payslip Calculation Tests', () => {
    it('calculates standard electrician monthly salary with 10.17% holiday pay', () => {
        const result = calculateIcelandicPayslip({
            hours: 160,
            hourlyRate: 3500,
            ot1Hours: 10,
            ot1Multiplier: 1.56,
            ot2Hours: 5,
            ot2Multiplier: 1.794,
            bonus: 25000,
            orlofPercent: 10.17
        });

        expect(result.regularPay).toBe(560000);
        expect(result.ot1Pay).toBe(54600);
        expect(result.ot2Pay).toBe(31395);
        expect(result.baseSubtotal).toBe(670995);
        expect(result.orlofAmount).toBeCloseTo(68240.19, 1);
        expect(result.grossSalary).toBeCloseTo(739235.19, 1);
        expect(result.mandatoryPension).toBeCloseTo(29569.41, 1);
    });

    it('handles 0 hours edge case cleanly', () => {
        const result = calculateIcelandicPayslip({
            hours: 0,
            hourlyRate: 3000,
            ot1Hours: 0,
            ot1Multiplier: 1.56,
            ot2Hours: 0,
            ot2Multiplier: 1.794,
            bonus: 0,
            orlofPercent: 10.17
        });

        expect(result.grossSalary).toBe(0);
        expect(result.mandatoryPension).toBe(0);
    });
});

describe('Subscription Pricing Calculator Tests', () => {
    it('calculates Starter plan for 3 users monthly', () => {
        const res = calculateSubscriptionCost(3, 'monthly');
        expect(res.tierEn).toBe('Starter (1-5 users)');
        expect(res.subtotal).toBe(14900);
        expect(res.vsk).toBe(14900 * 0.24);
        expect(res.totalWithVsk).toBe(14900 * 1.24);
    });

    it('applies 15% discount for yearly billing', () => {
        const monthly = calculateSubscriptionCost(10, 'monthly');
        const yearly = calculateSubscriptionCost(10, 'yearly');
        expect(yearly.subtotal).toBe(monthly.subtotal * 0.85);
    });

    it('calculates Enterprise tier for 50 users correctly', () => {
        const res = calculateSubscriptionCost(50, 'monthly');
        expect(res.tierEn).toBe('Enterprise (20+ users)');
        expect(res.extraUsers).toBe(30);
        expect(res.subtotal).toBe(69900 + (30 * 1800));
    });
});

describe('Client-Side Search Filter Algorithm Tests', () => {
    const mockProjects = [
        { id: 1, name: 'Landspítalinn Nýbygging', description: 'Stórt sjúkrahúsverkefni' },
        { id: 2, name: 'Austurhöfn Íbúðir', description: 'Lúxusíbúðir í miðbænum' },
        { id: 3, name: 'Þingvellir Hótel', description: 'Rafverktaka og lýsing' }
    ];

    it('returns all items when search query is empty', () => {
        expect(filterCollection(mockProjects, '')).toHaveLength(3);
    });

    it('filters case-insensitively by project name and Icelandic special characters', () => {
        expect(filterCollection(mockProjects, 'landspítalinn')).toHaveLength(1);
        expect(filterCollection(mockProjects, 'þingvellir')).toHaveLength(1);
    });

    it('returns empty array when query does not match any item', () => {
        expect(filterCollection(mockProjects, 'nonexistent query')).toHaveLength(0);
    });
});
