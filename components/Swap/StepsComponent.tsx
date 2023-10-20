import Step from "./Step";
import { StatusStep } from "./Withdraw/Processing/types";

export default function Steps({ steps }: { steps: StatusStep[] }) {
  return (
    <nav aria-label="Progress">
      <ol role="list" className="overflow-hidden">
        {steps.map((step, index) => (
          <Step key={index} step={step} isLastStep={index === steps.length - 1} />
        ))}
      </ol>
    </nav>
  );
}