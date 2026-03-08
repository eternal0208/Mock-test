const { db } = require('../config/firebaseAdmin');

// Expected overall NTA Rank/Percentile Data
const DEFAULT_PERCENTILE_DATA = {
    overall: [
        { minPercentile: 99.9, maxPercentile: 100, minRank: 1, maxRank: 1200, minMarks: 240, maxMarks: 300 },
        { minPercentile: 99.5, maxPercentile: 99.89, minRank: 1201, maxRank: 6000, minMarks: 210, maxMarks: 239 },
        { minPercentile: 99.0, maxPercentile: 99.49, minRank: 6001, maxRank: 12000, minMarks: 180, maxMarks: 209 },
        { minPercentile: 98.0, maxPercentile: 98.99, minRank: 12001, maxRank: 25000, minMarks: 160, maxMarks: 179 },
        { minPercentile: 97.0, maxPercentile: 97.99, minRank: 25001, maxRank: 35000, minMarks: 140, maxMarks: 159 },
        { minPercentile: 95.0, maxPercentile: 96.99, minRank: 35001, maxRank: 60000, minMarks: 120, maxMarks: 139 },
        { minPercentile: 90.0, maxPercentile: 94.99, minRank: 60001, maxRank: 110000, minMarks: 100, maxMarks: 119 },
        { minPercentile: 80.0, maxPercentile: 89.99, minRank: 110001, maxRank: 250000, minMarks: 70, maxMarks: 99 }
    ],
    shiftWise: [
        { shift: "21 S1", percentiles: { 99: 167, 98.5: 154, 98: 144, 97.5: 137, 97: 130, 96.5: 124, 96: 120, 95.5: 115, 95: 110, 94: 105, 93: 99, 92: 94, 91: 90, 90: 85 } },
        { shift: "21 S2", percentiles: { 99: 171, 98.5: 157, 98: 147, 97.5: 139, 97: 132, 96.5: 127, 96: 122, 95.5: 117, 95: 113, 94: 106, 93: 100, 92: 93, 91: 89, 90: 84 } },
        { shift: "22 S1", percentiles: { 99: 158, 98.5: 144, 98: 134, 97.5: 126, 97: 120, 96.5: 115, 96: 110, 95.5: 106, 95: 101, 94: 93, 93: 88, 92: 84, 91: 79, 90: 74 } },
        { shift: "22 S2", percentiles: { 99: 155, 98.5: 143, 98: 131, 97.5: 126, 97: 120, 96.5: 115, 96: 111, 95.5: 107, 95: 104, 94: 97, 93: 92, 92: 88, 91: 84, 90: 81 } },
        { shift: "23 S1", percentiles: { 99: 158, 98.5: 145, 98: 135, 97.5: 127, 97: 121, 96.5: 116, 96: 111, 95.5: 107, 95: 103, 94: 96, 93: 89, 92: 86, 91: 81, 90: 77 } },
        { shift: "23 S2", percentiles: { 99: 163, 98.5: 150, 98: 139, 97.5: 132, 97: 126, 96.5: 120, 96: 115, 95.5: 111, 95: 106, 94: 100, 93: 94, 92: 88, 91: 83, 90: 79 } },
        { shift: "24 S1", percentiles: { 99: 162, 98.5: 150, 98: 141, 97.5: 134, 97: 127, 96.5: 123, 96: 118, 95.5: 113, 95: 109, 94: 102, 93: 96, 92: 92, 91: 86, 90: 80 } },
        { shift: "24 S2", percentiles: { 99: 160, 98.5: 146, 98: 137, 97.5: 128, 97: 121, 96.5: 115, 96: 110, 95.5: 104, 95: 101, 94: 93, 93: 88, 92: 81, 91: 77, 90: 73 } },
        { shift: "28 S1", percentiles: { 99: 161, 98.5: 149, 98: 138, 97.5: 132, 97: 126, 96.5: 121, 96: 114, 95.5: 112, 95: 109, 94: 102, 93: 96, 92: 91, 91: 86, 90: 82 } },
        { shift: "28 S2", percentiles: { 99: 162, 98.5: 150, 98: 140, 97.5: 133, 97: 126, 96.5: 123, 96: 116, 95.5: 112, 95: 108, 94: 103, 93: 95, 92: 91, 91: 86, 90: 85 } }
    ]
};

async function getPercentileData() {
    const doc = await db.collection('settings').doc('percentileData').get();
    if (!doc.exists) {
        // Seed default if not exists
        await db.collection('settings').doc('percentileData').set(DEFAULT_PERCENTILE_DATA);
        return DEFAULT_PERCENTILE_DATA;
    }
    return doc.data();
}

async function updatePercentileData(data) {
    await db.collection('settings').doc('percentileData').set(data, { merge: true });
    return true;
}

module.exports = { getPercentileData, updatePercentileData };
