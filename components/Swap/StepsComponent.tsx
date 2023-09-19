import Step from "./Step";

export default function Steps({ steps }) {
    const filteredSteps = steps.filter((s) => s.status);

    return (
        <div className="bg-secondary-700 font-normal px-3 py-5 rounded-lg flex flex-col border border-secondary-500 w-full relative z-10">
            <nav aria-label="Progress">
                <ol role="list" className="overflow-hidden">
                    {filteredSteps.map((step, stepIdx) => (
                        <Step key={step?.name} step={step} isLastStep={stepIdx === filteredSteps.length - 1} />
                    ))}
                </ol>
            </nav>
        </div>
    );
}