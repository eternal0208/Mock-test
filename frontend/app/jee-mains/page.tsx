import ExamLandingPage from '@/components/ExamLandingPage';
import TestList from '@/components/Exam/TestList';

export default function JeeMainsPage() {
    return (
        <ExamLandingPage
            title="JEE Mains"
            description="Target 99+ Percentile with our high-precision mock tests modeled on the latest NTA patterns."
            stats={{ users: "20k+", tests: "800+", avgScore: "+98 %ile" }}
            features={[
                "NTA Level Physics & Maths Problems",
                "Shift-wise Recent Paper Analysis",
                "Integer Type Question Practice",
                "Speed & Accuracy Analytics"
            ]}
            themeColor="blue"
        >
            <TestList category="JEE Main" />
        </ExamLandingPage>
    );
}
