import Step from "./Step";

export default function Steps({ steps }) {

  return (
    <div className="bg-secondary-700 font-normal px-3 py-5 rounded-lg flex flex-col border border-secondary-500 w-full relative z-10">
      <nav aria-label="Progress">
        <ol role="list" className="overflow-hidden">
          {steps.map((step, stepIdx) => (
            <Step key={step?.name + stepIdx} step={step} isLastStep={stepIdx === steps.length - 1} />
          ))}
        </ol>
      </nav>
    </div>
  );
}