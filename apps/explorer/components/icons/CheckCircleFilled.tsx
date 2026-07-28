export const CheckCircleFilled = ({ className, size = 12 }: { className?: string; size?: number }) => {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" className="fill-success-foreground" />
      <path d="M9 12l2 2 4-4" className="stroke-success-background" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};
