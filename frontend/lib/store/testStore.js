import { create } from 'zustand';

export const useTestStore = create((set) => ({
    preloadedTests: {}, // Store tests by ID

    // Action to store a fetched test
    setPreloadedTest: (id, testData) => set((state) => ({
        preloadedTests: { ...state.preloadedTests, [id]: testData }
    })),

    // Action to clear a test (e.g. after submission)
    clearTest: (id) => set((state) => {
        const newTests = { ...state.preloadedTests };
        delete newTests[id];
        return { preloadedTests: newTests };
    }),
}));
