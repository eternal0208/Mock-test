import ExamLandingPage from '@/components/ExamLandingPage';
import TestList from '@/components/Exam/TestList';

export default function JeeAdvancedPage() {
    return (
        <ExamLandingPage
            title="JEE Advanced"
            description="The ultimate test of concepts. Prepare for IITs with deep, multi-concept problems and varied patterns."
            stats={{ users: "8k+", tests: "300+", avgScore: "Top 500 AIR" }}
            features={[
                "Multi-Correct & Matrix Match Types",
                "Deep Conceptual Physics & Chemistry",
                "Paragraph Based Questions",
                "Mock Tests with New Patters"
            ]}
            themeColor="rose"
        >
            <TestList category="JEE Advanced" />
        </ExamLandingPage>
    );
}
