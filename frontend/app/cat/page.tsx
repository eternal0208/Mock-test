'use client';
import React from 'react';
import TestList from '@/components/Exam/TestList';
import ExamLandingPage from '@/components/ExamLandingPage';

export default function CATPage() {
    return (
        <ExamLandingPage
            title="CAT"
            description="Master Data Interpretation, Logical Reasoning, and Quantitative Ability. Our mocks are designed to match the unpredictable nature of CAT."
            stats={{ users: "12k+", tests: "450+", avgScore: "99.5 %ile" }}
            features={[
                "Unpredictable Pattern Mocks",
                "Advanced DILR Sets",
                "VARC Logic & Inference Drills",
                "Percentile Predictor"
            ]}
            themeColor="purple"
        >
            <TestList category="CAT" />
        </ExamLandingPage>
    );
}
