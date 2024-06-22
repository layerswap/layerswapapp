import { SwapStatus } from "../../Models/SwapStatus";
import {
  PublishedSwapTransactions,
  SwapItem,
  TransactionType,
} from "../../lib/layerSwapApiClient";
import { ReactNode } from "react";

enum StatusColor {
  Red = "#E43636",
  Green = "#55B585",
  Yellow = "#facc15",
  Grey = "#808080",
  Purple = "#A020F0",
}

export default function StatusIcon({
  swap,
  short,
}: {
  swap: SwapItem;
  short?: boolean;
}) {
  const status = swap.status;

  const StatusComponent = ({
    icon: Icon,
    text,
    color,
  }: {
    icon: ReactNode;
    text: string;
    color: StatusColor;
  }) => (
    <div className="inline-flex items-center bg-gray-900 rounded px-1 py-0.5">
      {!short && (
        <p className="text-[10px]" style={{ color }}>
          {text}
        </p>
      )}
      {Icon}
    </div>
  );

  const data: PublishedSwapTransactions = JSON.parse(
    localStorage.getItem("swapTransactions") || "{}"
  );
  const txForSwap = data?.[swap.id];

  switch (status) {
    case SwapStatus.Failed:
      return (
        <StatusComponent
          icon={<RedIcon />}
          text="Failed"
          color={StatusColor.Red}
        />
      );
    case SwapStatus.Completed:
      return (
        <StatusComponent
          icon={<CheckIcon />}
          text="Completed"
          color={StatusColor.Green}
        />
      );
    case SwapStatus.Cancelled:
      return (
        <StatusComponent
          icon={<GreyIcon />}
          text="Cancelled"
          color={StatusColor.Grey}
        />
      );
    case SwapStatus.Expired:
      return (
        <StatusComponent
          icon={<GreyIcon />}
          text="Expired"
          color={StatusColor.Grey}
        />
      );
    case SwapStatus.UserTransferPending:
      const isProcessing =
        txForSwap ||
        swap.transactions.find((t) => t.type === TransactionType.Input);
      return (
        <StatusComponent
          icon={isProcessing ? <PurpleIcon /> : <YellowIcon />}
          text={isProcessing ? "Processing" : "Pending"}
          color={isProcessing ? StatusColor.Purple : StatusColor.Yellow}
        />
      );
    case SwapStatus.LsTransferPending:
      return (
        <StatusComponent
          icon={<PurpleIcon />}
          text="Processing"
          color={StatusColor.Purple}
        />
      );
    case SwapStatus.UserTransferDelayed:
      return (
        <StatusComponent
          icon={<YellowIcon />}
          text="Delayed"
          color={StatusColor.Yellow}
        />
      );
    case SwapStatus.Created:
      return (
        <StatusComponent
          icon={<YellowIcon />}
          text="Created"
          color={StatusColor.Yellow}
        />
      );
    default:
      return null;
  }
}

const Icon = ({ color }: { color: StatusColor }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="ml-1 w-2 h-2 lg:h-2 lg:w-2"
    viewBox="0 0 60 60"
    fill="none"
  >
    <circle cx="30" cy="30" r="30" fill={color} />
  </svg>
);

const CheckIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="ml-1 w-2 h-2 lg:h-2 lg:w-2"
    viewBox="0 0 24 24"
    fill={StatusColor.Green}
  >
    <path d="M20.285 2.999a1 1 0 0 0-1.523-1.254l-10.74 13.022L4.54 10.64a1 1 0 0 0-1.445 1.364l4.5 5.5a1 1 0 0 0 1.518 0l11-13z" />
  </svg>
);

export const RedIcon = () => <Icon color={StatusColor.Red} />;
export const GreenIcon = () => <Icon color={StatusColor.Green} />;
export const YellowIcon = () => <Icon color={StatusColor.Yellow} />;
export const GreyIcon = () => <Icon color={StatusColor.Grey} />;
export const PurpleIcon = () => <Icon color={StatusColor.Purple} />;
