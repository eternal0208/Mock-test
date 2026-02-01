import ExamLandingPage from '@/components/ExamLandingPage';
import TestList from '@/components/Exam/TestList';

export default function NeetPage() {
    return (
        <ExamLandingPage
            title="NEET"
            description="Join thousands of medical aspirants mastering Biology, Physics, and Chemistry with our NCERT-centric mock tests."
            stats={{ users: "15k+", tests: "500+", avgScore: "+120 Marks" }}
            features={[
                "NCERT Line-by-Line Questions",
                "Previous Year Paper Analysis",
                "Detailed Biology Diagrams Practice",
                "Time Management Strategy for 200 Mins"
            ]}
            themeColor="teal"
        >
            <TestList category="NEET" />
        </ExamLandingPage>
    );
}
