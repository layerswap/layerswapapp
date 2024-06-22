import { useRouter } from "next/router";
import React, { useCallback, useEffect, useState } from "react";
import LayerSwapApiClient, {
  SwapItem,
  SwapResponse,
  TransactionType,
} from "../../lib/layerSwapApiClient";
import SpinIcon from "../icons/spinIcon";
import { Eye, GitCommitVertical, RefreshCcw, Scroll } from "lucide-react";
import SwapDetails from "./SwapDetailsComponent";
import Image from "next/image";
import SubmitButton from "../buttons/submitButton";
import { SwapHistoryComponentSceleton } from "../Sceletons";
import StatusIcon from "./StatusIcons";
import toast from "react-hot-toast";
import ToggleButton from "../buttons/toggleButton";
import Modal from "../modal/modal";
import HeaderWithMenu from "../HeaderWithMenu";
import Link from "next/link";
import { resolvePersistantQueryParams } from "../../helpers/querryHelper";
import AppSettings from "../../lib/AppSettings";
import { truncateDecimals } from "../utils/RoundDecimals";
import shortenAddress from "../utils/ShortenAddress";
import useWallet from "../../hooks/useWallet";

const PAGE_SIZE = 20;

function TransactionsHistory() {
  const { wallets } = useWallet();
  const [page, setPage] = useState(0);
  const [isLastPage, setIsLastPage] = useState(false);
  const [swaps, setSwaps] = useState<{
    [key: string]: SwapResponse[];
  }>({});
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [selectedSwap, setSelectedSwap] = useState<SwapItem | undefined>();
  const [openSwapDetailsModal, setOpenSwapDetailsModal] = useState(false);
  const [showAllSwaps, setShowAllSwaps] = useState(false);

  const wallet = wallets[0];

  const goBack = useCallback(() => {
    window?.["navigation"]?.["canGoBack"]
      ? router.back()
      : router.push({
          pathname: "/",
          query: resolvePersistantQueryParams(router.query),
        });
  }, [router]);

  const fetchSwaps = useCallback(
    async (page: number, showAllSwaps, reset = false) => {
      setLoading(true);
      setIsLastPage(false);
      const layerswapApiClient = new LayerSwapApiClient();
      const { data, error } = await layerswapApiClient.GetSwapsAsync(
        page,
        showAllSwaps
      );

      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }
      let combinedData = data;

      if (wallet?.address) {
        const { data: explorerData, error: explorerError } =
          await layerswapApiClient.GetExplorerSwapsAsync(wallet.address);

        if (explorerError) {
          toast.error(explorerError.message);
        } else if (explorerData) {
          const uniqueExplorerData = explorerData.filter(
            (explorerSwap) =>
              !data?.some((swap) => swap.swap.id === explorerSwap.swap.id)
          );
          combinedData = [...(data || []), ...uniqueExplorerData];
          combinedData.sort((a, b) =>
            a.swap.created_date < b.swap.created_date ? 1 : -1
          );
        }
      }

      if (combinedData) {
        const groupByCreatedDate = (array: SwapResponse[]) => {
          return array.reduce<{ [key: string]: SwapResponse[] }>((acc, obj) => {
            const date = obj.swap.created_date.split("T")[0];
            if (!acc[date]) {
              acc[date] = [];
            }
            acc[date].push(obj);
            return acc;
          }, {});
        };

        const groupedData = groupByCreatedDate(combinedData);

        setSwaps((prev) => {
          const mergedData = reset ? groupedData : { ...prev };

          if (!reset) {
            for (const [key, value] of Object.entries(groupedData)) {
              if (mergedData[key]) {
                mergedData[key] = [...mergedData[key], ...value];
              } else {
                mergedData[key] = value;
              }
            }
          }

          return mergedData;
        });

        setPage(page);
        setIsLastPage(combinedData?.length < PAGE_SIZE);
      }

      setLoading(false);
    },
    [wallet?.address]
  );

  useEffect(() => {
    fetchSwaps(1, showAllSwaps, true);
  }, [router.query, showAllSwaps, fetchSwaps]);

  const handleLoadMore = useCallback(() => {
    const nextPage = page + 1;
    fetchSwaps(nextPage, showAllSwaps);
  }, [page, showAllSwaps, fetchSwaps]);

  const handleOpenSwapDetails = (swap: SwapItem) => {
    setSelectedSwap(swap);
    setOpenSwapDetailsModal(true);
  };

  const handleToggleChange = (value: boolean) => {
    setShowAllSwaps(value);
  };

  return (
    <div className="bg-secondary-900 sm:shadow-card rounded-lg mb-6 w-full text-primary-text overflow-hidden relative min-h-[620px]">
      <HeaderWithMenu goBack={goBack} />
      {page == 0 && loading ? (
        <SwapHistoryComponentSceleton />
      ) : (
        <>
          {Object.keys(swaps).length > 0 ? (
            <div className="w-full flex flex-col justify-between h-full px-4 space-y-5 text-secondary-text">
              <div className="mt-4">
                <div className="flex justify-end mb-2">
                  <div className="flex space-x-2">
                    <p className="flex items-center text-xs md:text-sm font-medium">
                      Show all swaps
                    </p>
                    <ToggleButton
                      onChange={handleToggleChange}
                      value={showAllSwaps}
                    />
                  </div>
                </div>
                <div className=" sm:max-h-[450px] styled-scroll overflow-y-auto ">
                  <div className="pr-2">
                    {Object.keys(swaps).map((date) => (
                      <div key={date}>
                        <div className="text-sm text-secondary-text mt-4">
                          {date}
                        </div>
                        {swaps[date].map((swapData, index) => {
                          const swap = swapData.swap;
                          const {
                            source_network,
                            destination_network,
                            source_exchange,
                            destination_exchange,
                            source_token,
                            destination_token,
                          } = swap;

                          const output_transaction = swap.transactions.find(
                            (t) => t.type === TransactionType.Output
                          );

                          return (
                            <div
                              key={swap.id}
                              onClick={() => handleOpenSwapDetails(swap)}
                              className="w-full cursor-pointer"
                            >
                              <div className="mt-2 bg-secondary p-3 rounded-lg border-2 border-secondary-text/5 flex gap-x-4 pb-4">
                                <div className="flex flex-col flex-grow w-16">
                                  <div className="text-primary-text flex flex-col items-center">
                                    <div className="flex-shrink-0  relative">
                                      {source_network && (
                                        <div>
                                          <Image
                                            src={
                                              source_exchange?.logo ||
                                              source_network.logo
                                            }
                                            alt="Source Logo"
                                            height="40"
                                            width="40"
                                            className="rounded-md object-contain"
                                          />
                                          <Image
                                            src={source_token.logo}
                                            alt="Source token logo"
                                            width="20"
                                            height="20"
                                            className="rounded-full absolute right-0 bottom-0 translate-x-1/2 translate-y-1/2 border border-secondary-text/80"
                                          />
                                        </div>
                                      )}
                                    </div>
                                    <GitCommitVertical className="h-5 my-2 text-secondary-text" />
                                    <div className="flex-shrink-0 relative block">
                                      {destination_network && (
                                        <div>
                                          <Image
                                            src={
                                              destination_exchange?.logo ||
                                              destination_network.logo
                                            }
                                            alt="Destination Logo"
                                            height="40"
                                            width="40"
                                            className="rounded-md object-contain"
                                          />
                                          <Image
                                            src={destination_token.logo}
                                            alt="Source token logo"
                                            width="20"
                                            height="20"
                                            className="rounded-full absolute right-0 bottom-0 translate-x-1/2 translate-y-1/2 border border-secondary-text/80"
                                          />
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  {index !== 0 ? (
                                    <div className="absolute right-0 left-6 -top-px h-px bg-secondary-500" />
                                  ) : null}
                                </div>

                                <div
                                  className="flex flex-col justify-between items-baseline cursor-pointer w-56"
                                  onClick={(e) => {
                                    handleOpenSwapDetails(swap);
                                    e.preventDefault();
                                  }}
                                >
                                  <div className="flex flex-col max-w-56">
                                    <div className="text-xl flex">
                                      <span className="truncate">
                                        {truncateDecimals(
                                          swap.requested_amount,
                                          source_token?.precision
                                        )}
                                      </span>
                                      <span className="ml-1">
                                        {source_token?.symbol}
                                      </span>
                                    </div>
                                    <div className="text-secondary-text text-xs  truncate">
                                      <span>
                                        {swap?.source_network.display_name} -
                                      </span>
                                      <span>
                                        {shortenAddress(
                                          swap.destination_address
                                        )}
                                      </span>
                                    </div>
                                    <p className="text-secondary-text "></p>
                                  </div>

                                  {output_transaction ? (
                                    <div className="flex flex-col max-w-56">
                                      <div className="text-xl flex">
                                        <span className="truncate">
                                          {truncateDecimals(
                                            output_transaction?.amount,
                                            source_token?.precision
                                          )}
                                        </span>
                                        <span className="ml-1">
                                          {destination_token?.symbol}
                                        </span>
                                      </div>
                                      <div className="text-secondary-text text-xs truncate">
                                        <span>
                                          {
                                            swap?.destination_network
                                              .display_name
                                          }
                                          -
                                        </span>
                                        <span>
                                          {shortenAddress(
                                            swap.destination_address
                                          )}
                                        </span>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="text-left text-base">-</div>
                                  )}
                                </div>
                                <div className="flex flex-grow items-end justify-end">
                                  {swap && <StatusIcon swap={swap} />}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="text-primary-text text-sm flex justify-center">
                {!isLastPage && (
                  <button
                    disabled={isLastPage || loading}
                    type="button"
                    onClick={handleLoadMore}
                    className="group disabled:text-primary-800 mb-2 text-primary relative flex justify-center py-3 px-4 border-0 font-semibold rounded-md focus:outline-none transform hover:-translate-y-0.5 transition duration-200 ease-in-out"
                  >
                    <span className="flex items-center mr-2">
                      {!isLastPage && !loading && (
                        <RefreshCcw className="h-5 w-5" />
                      )}
                      {loading ? (
                        <SpinIcon className="animate-spin h-5 w-5" />
                      ) : null}
                    </span>
                    <span>Load more</span>
                  </button>
                )}
              </div>
              <Modal
                height="fit"
                show={openSwapDetailsModal}
                setShow={setOpenSwapDetailsModal}
                header="Swap details"
                modalId="swapHistory"
              >
                <div className="mt-2">
                  {selectedSwap && <SwapDetails id={selectedSwap?.id} />}
                  {selectedSwap && (
                    <div className="text-primary-text text-sm mt-6 space-y-3">
                      <div className="flex flex-row text-primary-text text-base space-x-2">
                        <SubmitButton
                          text_align="center"
                          onClick={() =>
                            router.push({
                              pathname: `/swap/${selectedSwap.id}`,
                              query: resolvePersistantQueryParams(router.query),
                            })
                          }
                          isDisabled={false}
                          isSubmitting={false}
                          icon={<Eye className="h-5 w-5" />}
                        >
                          View swap
                        </SubmitButton>
                      </div>
                    </div>
                  )}
                </div>
              </Modal>
            </div>
          ) : (
            <div className="absolute top-1/4 right-0 text-center w-full">
              <Scroll className="h-40 w-40 text-secondary-700 mx-auto" />
              <p className="my-2 text-xl">It&apos;s empty here</p>
              <p className="px-14 text-primary-text">
                You can find all your transactions by searching with address in
              </p>
              <Link
                target="_blank"
                href={AppSettings.ExplorerURl}
                className="underline hover:no-underline cursor-pointer hover:text-secondary-text text-primary-text font-light"
              >
                <span>Layerswap Explorer</span>
              </Link>
            </div>
          )}
        </>
      )}
      <div id="widget_root" />
    </div>
  );
}

export default TransactionsHistory;
