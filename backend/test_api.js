const { db } = require('./config/firebaseAdmin');
const http = require('http');

async function test() {
    // Generate a custom token to get an ID token? It's hard in Node without client SDK.
    // Let's just mock the req/res directly by importing the route? No, we can just write a quick script to run the logic of the route.
    const field = 'JEE Main';
    const userInstituteCode = 'SC100';

    const fieldSectionsSnap = await db.collection('notesSections').where('field', '==', field).get();
    const sectionsDocsMap = new Map();
    fieldSectionsSnap.docs.forEach(d => sectionsDocsMap.set(d.id, d));

    if (userInstituteCode) {
        const instSectionsSnap = await db.collection('notesSections').where('instituteCode', '==', userInstituteCode).get();
        instSectionsSnap.docs.forEach(d => sectionsDocsMap.set(d.id, d));
    }

    const sectionsSnapDocs = Array.from(sectionsDocsMap.values());
    console.log("Sections count:", sectionsSnapDocs.length);

    const snapshotSections = sectionsSnapDocs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(s => s.isActive !== false)
        .filter(s => {
            const sCode = s.instituteCode || '';
            return !sCode || sCode === userInstituteCode;
        })
        .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));

    console.log("Filtered sections count:", snapshotSections.length);

    const parentSections = snapshotSections.filter(s => !s.parentId);
    console.log("Parent sections:", parentSections.length);
}
test();
