import Step from "./Step";

export default function Steps({ steps }) {
  return (
    <nav aria-label="Progress">
      <ol role="list" className="overflow-hidden">
        {steps.map((step, stepIdx) => (
          <Step key={step?.name + stepIdx} step={step} isLastStep={stepIdx === steps.length - 1} />
        ))}
      </ol>
    </nav>
  );
}