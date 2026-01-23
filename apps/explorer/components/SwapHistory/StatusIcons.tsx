import { ReactNode, SVGProps } from "react";
import { SwapStatus } from "../../models/SwapStatus";
import { CheckCircleFilled } from "../icons/CheckCircleFilled";

type StatusVariant = 'success' | 'warning' | 'error';

interface StatusConfig {
  label: string;
  variant: StatusVariant;
  icon?: (props: SVGProps<SVGSVGElement>) => ReactNode;
}

const STATUS_CONFIG: Record<string, StatusConfig> = {
  [SwapStatus.Completed]: {
    label: "Completed",
    variant: "success",
    icon: CheckCircleFilled,
  },
  [SwapStatus.Failed]: {
    label: "Failed",
    variant: "error",
  },
  [SwapStatus.Refunded]: {
    label: "Refunded",
    variant: "error",
  },
  [SwapStatus.Cancelled]: {
    label: "Cancelled",
    variant: "error",
    icon: GreyIcon,
  },
  [SwapStatus.Expired]: {
    label: "Expired",
    variant: "error",
    icon: GreyIcon,
  },
  [SwapStatus.UserTransferPending]: {
    label: "Deposit pending",
    variant: "warning",
    icon: PendingDot,
  },
  [SwapStatus.UserTransferDelayed]: {
    label: "Delayed",
    variant: "warning",
    icon: PendingDot,
  },
  [SwapStatus.LsTransferPending]: {
    label: "In Progress",
    variant: "warning",
    icon: PendingDot,
  },
};

const VARIANT_STYLES: Record<StatusVariant, string> = {
  success: "text-success-foreground bg-success-background",
  warning: "text-warning-foreground bg-warning-background",
  error: "text-error-foreground bg-error-background",
};

export default function StatusIcon({ swap }: { swap: string | undefined }) {
  if (!swap) return null;

  const config = STATUS_CONFIG[swap];
  if (!config) return null;

  const { label, variant, icon } = config;

  const Icon = icon;

  return (
    <div className={`inline-flex items-center space-x-1 sm:space-x-1.5 px-2 py-1 rounded-lg w-max ${VARIANT_STYLES[variant]}`}>
      {Icon && <Icon className="w-3.5 h-3.5 sm:w-5 sm:h-5" />}
      <span className="font-medium text-sm md:text-xl">{label}</span>
    </div>
  );
}

function PendingDot() {
  return <span className="w-3 h-3 rounded-full bg-warning-foreground" />;
}

export function GreyIcon() {
  return (
    <svg className="w-2 h-2 rounded-sm mr-1">
      <rect fill="#808080" width="100%" height="100%" />
    </svg>
  );
}

export function YellowIcon() {
  return (
    <svg className="w-2 h-2 rounded-sm mr-1">
      <rect fill="currentColor" width="100%" height="100%" />
    </svg>
  );
}
