
const parseNumber = (value) => {
    if (value === undefined || value === null || value === '') return NaN;
    if (typeof value === 'number') return value;

    let str = value.toString().trim();
    // Remove whitespace
    str = str.replace(/[\s\u00A0]/g, '');

    // If it has a comma, it's the decimal separator (Hungarian standard)
    if (str.includes(',')) {
        str = str.replace(/\./g, ''); // Remove thousand separators (dots)
        str = str.replace(',', '.');  // Replace decimal separator
        return parseFloat(str);
    }

    // No comma present.
    // Check for dots.
    if (str.includes('.')) {
        // Heuristic: If dot is followed by exactly 3 digits (and it's the last dot), treat as thousand separator.
        // E.g. "1.200" -> 1200
        // "1.5" -> 1.5
        // "10.50" -> 10.5
        // "1.000.000" -> 1000000

        // Actually, simpler: In Hungarian context, if there is NO comma, and there are dots,
        // we should check if it looks like a valid English float or a Hungarian integer.

        // If we strip dots and it parses to the same number as when we don't, it's ambiguous.
        // But "1.200" -> 1.2 (float) vs 1200 (int).

        // Let's assume if it has multiple dots, they are thousand separators.
        const dotCount = (str.match(/\./g) || []).length;
        if (dotCount > 1) {
            str = str.replace(/\./g, '');
            return parseFloat(str);
        }

        // Single dot.
        // If followed by 3 digits -> Thousand separator.
        if (/\.\d{3}$/.test(str)) {
            str = str.replace(/\./g, '');
            return parseFloat(str);
        }

        // Otherwise (e.g. 1.5, 12.50), treat as decimal.
        return parseFloat(str);
    }

    // No comma, no dot -> Integer
    return parseFloat(str);
};

const testCases = [
    "1200",
    "1200.50", // English float
    "1 200",
    "1.200",   // HU Integer (1200)
    "1.500",   // HU Integer (1500)
    "1.5",     // EN Float (1.5)
    "12.50",   // EN Float (12.5)
    "1,200",   // HU Float (1.2)
    "1 200 Ft",
    "1.200 Ft", // HU Integer (1200)
    "1.000.000", // HU Integer
    "1200,50", // HU Float
    "1200,50 Ft",
    "   1200   ",
    undefined,
    null,
    ""
];

testCases.forEach(tc => {
    console.log(`Input: "${tc}" -> Output: ${parseNumber(tc)}`);
});
