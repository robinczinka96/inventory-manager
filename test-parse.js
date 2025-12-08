
const parseNumber = (value) => {
    if (value === undefined || value === null || value === '') return NaN;
    if (typeof value === 'number') return value;

    let str = value.toString();
    // 1. Remove whitespace (including non-breaking spaces \u00A0)
    str = str.replace(/[\s\u00A0]/g, '');

    // Check if it's a "clean" number already (e.g. "1200.50" from raw JSON)
    // If it has only digits and a dot, and no comma, treat dot as decimal
    if (/^\d+\.\d+$/.test(str)) {
        return parseFloat(str);
    }

    // 2. Remove dots (thousand separators) and currency symbols (non-digit/non-comma/non-minus)
    str = str.replace(/[^\d,-]/g, '');
    // 3. Replace comma with dot
    str = str.replace(/,/g, '.');

    return parseFloat(str);
};

const testCases = [
    "1200",
    "1200.50",
    "1 200",
    "1.200",
    "1,200", // Ambiguous: 1.2 or 1200? In HU, comma is decimal. So 1.2.
    "1 200 Ft",
    "1.200 Ft",
    "1200,50",
    "1200,50 Ft",
    "   1200   ",
    undefined,
    null,
    ""
];

testCases.forEach(tc => {
    console.log(`Input: "${tc}" -> Output: ${parseNumber(tc)}`);
});
