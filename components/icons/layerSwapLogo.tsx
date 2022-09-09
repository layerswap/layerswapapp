import { FC } from "react";

interface Props {
    className: string
    partnerName: string
}

const LayerswapLogo: FC<Props> = (({ className, partnerName }) => {
    return (
        <>
            <svg className={className} xmlns="http://www.w3.org/2000/svg" width="302" height="77" viewBox="0 0 302 77" fill="none">
                <path d="M98.538 55.8601C97.9464 55.8601 97.4668 55.3757 97.4668 54.7781V27.874C97.4668 27.2764 97.9464 26.792 98.538 26.792H102.723C103.315 26.792 103.794 27.2764 103.794 27.874V50.4588H116.031C116.622 50.4588 117.102 50.9432 117.102 51.5408V54.7781C117.102 55.3757 116.622 55.8601 116.031 55.8601H98.538Z" fill="white" />
                <path d="M127.113 56.3136C125.617 56.3136 124.297 56.025 123.154 55.4478C122.011 54.8705 121.099 54.0871 120.419 53.0976C119.765 52.108 119.439 50.9948 119.439 49.7579C119.439 48.301 119.82 47.1328 120.582 46.2532C121.344 45.3736 122.582 44.7551 124.297 44.3978C126.011 44.0129 128.284 43.8205 131.114 43.8205H131.889C132.273 43.8205 132.583 43.5067 132.583 43.1196C132.583 41.9102 132.311 41.058 131.767 40.5633C131.223 40.041 130.297 39.7799 128.991 39.7799C127.903 39.7799 126.746 39.9585 125.521 40.3159C124.685 40.5464 123.848 40.8641 123.011 41.2691C122.427 41.5516 121.713 41.3038 121.469 40.6981L120.587 38.5022C120.394 38.0229 120.563 37.4687 121.013 37.2231C121.552 36.9301 122.156 36.6553 122.827 36.3989C123.861 36.0141 124.936 35.7255 126.052 35.533C127.168 35.3131 128.229 35.2032 129.236 35.2032C132.339 35.2032 134.652 35.9179 136.176 37.3472C137.7 38.7491 138.462 40.9343 138.462 43.903V54.7781C138.462 55.3757 137.982 55.8601 137.391 55.8601H133.777C133.186 55.8601 132.706 55.3757 132.706 54.7781V52.809C132.298 53.881 131.604 54.7331 130.624 55.3653C129.672 55.9975 128.501 56.3136 127.113 56.3136ZM128.501 52.1493C129.644 52.1493 130.61 51.7507 131.4 50.9536C132.189 50.1564 132.583 49.1256 132.583 47.8612C132.583 47.4058 132.218 47.0366 131.767 47.0366H131.155C129.059 47.0366 127.576 47.229 126.705 47.6138C125.834 47.9712 125.399 48.6034 125.399 49.5105C125.399 50.2801 125.657 50.9123 126.174 51.4071C126.719 51.9019 127.494 52.1493 128.501 52.1493Z" fill="white" />
                <path d="M146.075 63.2817C145.296 63.2817 144.777 62.4687 145.099 61.7524L148.249 54.7468L140.656 37.1293C140.348 36.4147 140.866 35.6155 141.638 35.6155H145.765C146.205 35.6155 146.6 35.8872 146.761 36.3006L151.515 48.4797L156.428 36.2895C156.592 35.882 156.984 35.6155 157.42 35.6155H161.177C161.951 35.6155 162.47 36.4201 162.156 37.1354L150.981 62.6377C150.809 63.0292 150.425 63.2817 150.001 63.2817H146.075Z" fill="white" />
                <path d="M174.558 56.3136C172.191 56.3136 170.149 55.8876 168.435 55.0355C166.748 54.1559 165.441 52.9327 164.516 51.3659C163.618 49.7716 163.169 47.9024 163.169 45.7584C163.169 43.6694 163.604 41.8414 164.475 40.2746C165.373 38.6804 166.584 37.4434 168.108 36.5638C169.66 35.6567 171.442 35.2032 173.456 35.2032C176.368 35.2032 178.681 36.1378 180.396 38.0069C182.11 39.8486 182.967 42.35 182.967 45.511V45.9958C182.967 46.5934 182.488 47.0778 181.896 47.0778H169.047C169.265 48.6721 169.836 49.8403 170.762 50.5825C171.714 51.2972 173.021 51.6545 174.681 51.6545C175.769 51.6545 176.871 51.4896 177.987 51.1597C178.636 50.9679 179.248 50.7157 179.823 50.4031C180.447 50.064 181.266 50.2927 181.527 50.958L182.341 53.0337C182.518 53.4857 182.378 54.0065 181.971 54.2663C181.1 54.8229 180.085 55.2854 178.926 55.6539C177.484 56.0937 176.028 56.3136 174.558 56.3136ZM173.701 39.3263C172.395 39.3263 171.333 39.7249 170.517 40.522C169.728 41.3192 169.238 42.4324 169.047 43.8618H177.865C177.701 40.8381 176.314 39.3263 173.701 39.3263Z" fill="white" />
                <path d="M187.624 55.8601C187.032 55.8601 186.553 55.3757 186.553 54.7781V36.6975C186.553 36.0999 187.032 35.6155 187.624 35.6155H191.523C192.115 35.6155 192.594 36.0999 192.594 36.6975V39.1202C193.547 36.7562 195.588 35.4506 198.718 35.2032L199.448 35.1529C200.037 35.1123 200.548 35.5609 200.589 36.1559L200.808 39.2735C200.849 39.8549 200.426 40.3645 199.852 40.4259L197.411 40.687C194.363 40.9893 192.839 42.5561 192.839 45.3873V54.7781C192.839 55.3757 192.36 55.8601 191.768 55.8601H187.624Z" fill="white" />
                <path d="M210.851 56.3136C209.082 56.3136 207.436 56.1075 205.912 55.6952C204.719 55.3726 203.686 54.9576 202.81 54.4501C202.389 54.2061 202.232 53.6845 202.399 53.2243L203.131 51.2114C203.365 50.5677 204.126 50.3049 204.737 50.6044C205.441 50.9496 206.2 51.2446 207.014 51.4896C208.32 51.8469 209.613 52.0256 210.892 52.0256C212.035 52.0256 212.879 51.8469 213.423 51.4896C213.967 51.1047 214.239 50.61 214.239 50.0052C214.239 49.0432 213.545 48.4384 212.157 48.1911L207.871 47.4077C206.157 47.1053 204.85 46.4868 203.952 45.5523C203.054 44.6177 202.605 43.3945 202.605 41.8827C202.605 40.5083 202.986 39.3263 203.748 38.3368C204.51 37.3472 205.558 36.5776 206.891 36.0278C208.225 35.4781 209.762 35.2032 211.504 35.2032C212.947 35.2032 214.348 35.3956 215.709 35.7804C216.787 36.0636 217.746 36.4849 218.585 37.0442C218.975 37.3045 219.103 37.8114 218.933 38.2513L218.176 40.202C217.92 40.8634 217.109 41.1007 216.486 40.7718C215.951 40.4896 215.365 40.2414 214.729 40.0273C213.613 39.6424 212.566 39.45 211.586 39.45C210.361 39.45 209.477 39.6562 208.932 40.0685C208.388 40.4533 208.116 40.9481 208.116 41.5528C208.116 42.5149 208.756 43.1196 210.035 43.367L214.321 44.1504C216.09 44.4528 217.437 45.0575 218.362 45.9646C219.288 46.8442 219.75 48.0536 219.75 49.5929C219.75 51.7095 218.934 53.3587 217.301 54.5407C215.668 55.7227 213.518 56.3136 210.851 56.3136Z" fill="white" />
                <path d="M229.264 55.8601C228.829 55.8601 228.437 55.5937 228.272 55.1863L220.981 37.1056C220.694 36.394 221.212 35.6155 221.973 35.6155H225.881C226.328 35.6155 226.729 35.8968 226.885 36.3207L231.402 48.6034L235.918 36.3207C236.074 35.8968 236.475 35.6155 236.923 35.6155H239.512C239.961 35.6155 240.363 35.8988 240.518 36.3249L245.036 48.7683L249.555 36.3249C249.709 35.8988 250.111 35.6155 250.56 35.6155H254.144C254.904 35.6155 255.422 36.391 255.138 37.1021L247.919 55.1828C247.756 55.5921 247.363 55.8601 246.926 55.8601H243.158C242.715 55.8601 242.318 55.5854 242.159 55.1687L238.015 44.3565L233.99 55.1592C233.833 55.5809 233.433 55.8601 232.987 55.8601H229.264Z" fill="white" />
                <path d="M264.409 56.3136C262.912 56.3136 261.592 56.025 260.449 55.4478C259.306 54.8705 258.394 54.0871 257.714 53.0976C257.061 52.108 256.734 50.9948 256.734 49.7579C256.734 48.301 257.115 47.1328 257.877 46.2532C258.639 45.3736 259.877 44.7551 261.592 44.3978C263.306 44.0129 265.579 43.8205 268.409 43.8205H269.879V43.1196C269.879 41.9102 269.607 41.058 269.062 40.5633C268.518 40.041 267.593 39.7799 266.286 39.7799C265.198 39.7799 264.041 39.9585 262.817 40.3159C261.98 40.5464 261.143 40.8641 260.306 41.2691C259.723 41.5516 259.008 41.3038 258.765 40.6981L257.882 38.5022C257.69 38.0229 257.858 37.4687 258.309 37.2231C258.847 36.9301 259.451 36.6553 260.122 36.3989C261.157 36.0141 262.231 35.7255 263.347 35.533C264.463 35.3131 265.524 35.2032 266.531 35.2032C269.634 35.2032 271.947 35.9179 273.471 37.3472C274.995 38.7491 275.757 40.9343 275.757 43.903V54.7781C275.757 55.3757 275.278 55.8601 274.686 55.8601H271.072C270.481 55.8601 270.001 55.3757 270.001 54.7781V52.809C269.593 53.881 268.899 54.7331 267.919 55.3653C266.967 55.9975 265.797 56.3136 264.409 56.3136ZM265.797 52.1493C266.94 52.1493 267.906 51.7507 268.695 50.9536C269.484 50.1564 269.879 49.1256 269.879 47.8612V47.0366H268.45C266.354 47.0366 264.871 47.229 264 47.6138C263.13 47.9712 262.694 48.6034 262.694 49.5105C262.694 50.2801 262.953 50.9123 263.47 51.4071C264.014 51.9019 264.79 52.1493 265.797 52.1493Z" fill="white" />
                <path d="M281.427 63.2817C280.835 63.2817 280.355 62.7973 280.355 62.1998V36.6975C280.355 36.0999 280.835 35.6155 281.427 35.6155H285.326C285.917 35.6155 286.397 36.0999 286.397 36.6975V38.6254C286.941 37.5809 287.771 36.7562 288.887 36.1515C290.03 35.5193 291.309 35.2032 292.724 35.2032C294.466 35.2032 295.99 35.6292 297.296 36.4814C298.63 37.3335 299.664 38.5429 300.399 40.1097C301.134 41.6765 301.501 43.5457 301.501 45.7172C301.501 47.8887 301.134 49.7716 300.399 51.3659C299.664 52.9327 298.63 54.1559 297.296 55.0355C295.99 55.8876 294.466 56.3136 292.724 56.3136C291.391 56.3136 290.166 56.025 289.05 55.4478C287.962 54.8705 287.118 54.1009 286.519 53.1388V62.1998C286.519 62.7973 286.04 63.2817 285.448 63.2817H281.427ZM290.887 51.6545C292.194 51.6545 293.255 51.1735 294.071 50.2114C294.888 49.2493 295.296 47.7513 295.296 45.7172C295.296 43.7106 294.888 42.24 294.071 41.3054C293.255 40.3434 292.194 39.8623 290.887 39.8623C289.554 39.8623 288.479 40.3434 287.662 41.3054C286.846 42.24 286.438 43.7106 286.438 45.7172C286.438 47.7513 286.846 49.2493 287.662 50.2114C288.479 51.1735 289.554 51.6545 290.887 51.6545Z" fill="white" />
                {
                    partnerName ?
                        <>
                            <path opacity="0.6" d="M10.2783 15.5145C10.2783 12.6226 12.6226 10.2783 15.5145 10.2783H60.6763C63.5682 10.2783 65.9125 12.6226 65.9125 15.5145V60.6763C65.9125 63.5682 63.5682 65.9125 60.6763 65.9125H15.5145C12.6226 65.9125 10.2783 63.5682 10.2783 60.6763V15.5145Z" fill="white" />
                            <path opacity="0.5" d="M20.5557 25.7913C20.5557 22.8995 22.9 20.5552 25.7918 20.5552H70.9537C73.8455 20.5552 76.1898 22.8995 76.1898 25.7913V70.9532C76.1898 73.845 73.8455 76.1893 70.9537 76.1893H25.7918C22.9 76.1893 20.5557 73.845 20.5557 70.9532V25.7913Z" fill="white" />
                            <path opacity="0.9" d="M0 5.23616C0 2.34431 2.34431 0 5.23616 0H50.398C53.2899 0 55.6342 2.34431 55.6342 5.23616V50.398C55.6342 53.2899 53.2899 55.6342 50.398 55.6342H5.23616C2.34431 55.6342 0 53.2899 0 50.398V5.23616Z" fill="white" />
                        </>
                        :
                        <>
                            <path opacity="0.6" d="M10.2783 15.5145C10.2783 12.6226 12.6226 10.2783 15.5145 10.2783H60.6763C63.5682 10.2783 65.9125 12.6226 65.9125 15.5145V60.6763C65.9125 63.5682 63.5682 65.9125 60.6763 65.9125H15.5145C12.6226 65.9125 10.2783 63.5682 10.2783 60.6763V15.5145Z" fill="#FF0093" />
                            <path opacity="0.5" d="M20.5557 25.7913C20.5557 22.8995 22.9 20.5552 25.7918 20.5552H70.9537C73.8455 20.5552 76.1898 22.8995 76.1898 25.7913V70.9532C76.1898 73.845 73.8455 76.1893 70.9537 76.1893H25.7918C22.9 76.1893 20.5557 73.845 20.5557 70.9532V25.7913Z" fill="#FF0093" />
                            <path opacity="0.9" d="M0 5.23616C0 2.34431 2.34431 0 5.23616 0H50.398C53.2899 0 55.6342 2.34431 55.6342 5.23616V50.398C55.6342 53.2899 53.2899 55.6342 50.398 55.6342H5.23616C2.34431 55.6342 0 53.2899 0 50.398V5.23616Z" fill="#FF0093" />
                        </>
                }
            </svg>
        </>
    )
})

export default LayerswapLogo;