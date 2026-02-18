"use strict";(self.webpackChunklayerswap=self.webpackChunklayerswap||[]).push([[910],{"./node_modules/@reown/appkit-ui/dist/esm/exports/wui-flex.js"(__unused_webpack_module,__unused_webpack___webpack_exports__,__webpack_require__){__webpack_require__("./node_modules/@reown/appkit-ui/dist/esm/src/layout/wui-flex/index.js")},"./node_modules/@reown/appkit-ui/dist/esm/exports/wui-icon.js"(__unused_webpack_module,__unused_webpack___webpack_exports__,__webpack_require__){__webpack_require__("./node_modules/@reown/appkit-ui/dist/esm/src/components/wui-icon/index.js")},"./node_modules/@reown/appkit-ui/dist/esm/exports/wui-text.js"(__unused_webpack_module,__unused_webpack___webpack_exports__,__webpack_require__){__webpack_require__("./node_modules/@reown/appkit-ui/dist/esm/src/components/wui-text/index.js")},"./node_modules/@reown/appkit-ui/dist/esm/src/components/wui-icon/index.js"(__unused_webpack_module,__unused_webpack___webpack_exports__,__webpack_require__){var lit=__webpack_require__("./node_modules/lit/index.js"),decorators=__webpack_require__("./node_modules/lit/decorators.js"),until=__webpack_require__("./node_modules/lit-html/directives/until.js");const globalSvgCache=new class CacheUtil{constructor(){this.cache=new Map}set(key,value){this.cache.set(key,value)}get(key){return this.cache.get(key)}has(key){return this.cache.has(key)}delete(key){this.cache.delete(key)}clear(){this.cache.clear()}};var ThemeUtil=__webpack_require__("./node_modules/@reown/appkit-ui/dist/esm/src/utils/ThemeUtil.js"),WebComponentsUtil=__webpack_require__("./node_modules/@reown/appkit-ui/dist/esm/src/utils/WebComponentsUtil.js");const styles=lit.AH`
  :host {
    display: flex;
    aspect-ratio: var(--local-aspect-ratio);
    color: var(--local-color);
    width: var(--local-width);
  }

  svg {
    width: inherit;
    height: inherit;
    object-fit: contain;
    object-position: center;
  }

  .fallback {
    width: var(--local-width);
    height: var(--local-height);
  }
`;var __decorate=function(decorators,target,key,desc){var d,c=arguments.length,r=c<3?target:null===desc?desc=Object.getOwnPropertyDescriptor(target,key):desc;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(decorators,target,key,desc);else for(var i=decorators.length-1;i>=0;i--)(d=decorators[i])&&(r=(c<3?d(r):c>3?d(target,key,r):d(target,key))||r);return c>3&&r&&Object.defineProperty(target,key,r),r};const ICONS={add:async()=>(await __webpack_require__.e(5049).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/add.js"))).addSvg,allWallets:async()=>(await __webpack_require__.e(4826).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/all-wallets.js"))).allWalletsSvg,arrowBottomCircle:async()=>(await __webpack_require__.e(6796).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/arrow-bottom-circle.js"))).arrowBottomCircleSvg,appStore:async()=>(await __webpack_require__.e(565).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/app-store.js"))).appStoreSvg,apple:async()=>(await __webpack_require__.e(6242).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/apple.js"))).appleSvg,arrowBottom:async()=>(await __webpack_require__.e(5119).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/arrow-bottom.js"))).arrowBottomSvg,arrowLeft:async()=>(await __webpack_require__.e(5609).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/arrow-left.js"))).arrowLeftSvg,arrowRight:async()=>(await __webpack_require__.e(6080).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/arrow-right.js"))).arrowRightSvg,arrowTop:async()=>(await __webpack_require__.e(7753).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/arrow-top.js"))).arrowTopSvg,bank:async()=>(await __webpack_require__.e(7594).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/bank.js"))).bankSvg,browser:async()=>(await __webpack_require__.e(2162).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/browser.js"))).browserSvg,card:async()=>(await __webpack_require__.e(5678).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/card.js"))).cardSvg,checkmark:async()=>(await __webpack_require__.e(6135).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/checkmark.js"))).checkmarkSvg,checkmarkBold:async()=>(await __webpack_require__.e(1119).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/checkmark-bold.js"))).checkmarkBoldSvg,chevronBottom:async()=>(await __webpack_require__.e(625).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/chevron-bottom.js"))).chevronBottomSvg,chevronLeft:async()=>(await __webpack_require__.e(2659).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/chevron-left.js"))).chevronLeftSvg,chevronRight:async()=>(await __webpack_require__.e(3674).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/chevron-right.js"))).chevronRightSvg,chevronTop:async()=>(await __webpack_require__.e(487).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/chevron-top.js"))).chevronTopSvg,chromeStore:async()=>(await __webpack_require__.e(4402).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/chrome-store.js"))).chromeStoreSvg,clock:async()=>(await __webpack_require__.e(3212).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/clock.js"))).clockSvg,close:async()=>(await __webpack_require__.e(5362).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/close.js"))).closeSvg,compass:async()=>(await __webpack_require__.e(5434).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/compass.js"))).compassSvg,coinPlaceholder:async()=>(await __webpack_require__.e(4016).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/coinPlaceholder.js"))).coinPlaceholderSvg,copy:async()=>(await __webpack_require__.e(6661).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/copy.js"))).copySvg,cursor:async()=>(await __webpack_require__.e(2794).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/cursor.js"))).cursorSvg,cursorTransparent:async()=>(await __webpack_require__.e(9217).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/cursor-transparent.js"))).cursorTransparentSvg,desktop:async()=>(await __webpack_require__.e(6482).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/desktop.js"))).desktopSvg,disconnect:async()=>(await __webpack_require__.e(4146).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/disconnect.js"))).disconnectSvg,discord:async()=>(await __webpack_require__.e(6778).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/discord.js"))).discordSvg,etherscan:async()=>(await __webpack_require__.e(115).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/etherscan.js"))).etherscanSvg,extension:async()=>(await __webpack_require__.e(6979).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/extension.js"))).extensionSvg,externalLink:async()=>(await __webpack_require__.e(5080).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/external-link.js"))).externalLinkSvg,facebook:async()=>(await __webpack_require__.e(6636).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/facebook.js"))).facebookSvg,farcaster:async()=>(await __webpack_require__.e(6099).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/farcaster.js"))).farcasterSvg,filters:async()=>(await __webpack_require__.e(7781).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/filters.js"))).filtersSvg,github:async()=>(await __webpack_require__.e(1375).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/github.js"))).githubSvg,google:async()=>(await __webpack_require__.e(2907).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/google.js"))).googleSvg,helpCircle:async()=>(await __webpack_require__.e(108).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/help-circle.js"))).helpCircleSvg,image:async()=>(await __webpack_require__.e(5719).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/image.js"))).imageSvg,id:async()=>(await __webpack_require__.e(593).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/id.js"))).idSvg,infoCircle:async()=>(await __webpack_require__.e(8073).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/info-circle.js"))).infoCircleSvg,lightbulb:async()=>(await __webpack_require__.e(4653).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/lightbulb.js"))).lightbulbSvg,mail:async()=>(await __webpack_require__.e(7683).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/mail.js"))).mailSvg,mobile:async()=>(await __webpack_require__.e(742).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/mobile.js"))).mobileSvg,more:async()=>(await __webpack_require__.e(3481).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/more.js"))).moreSvg,networkPlaceholder:async()=>(await __webpack_require__.e(8508).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/network-placeholder.js"))).networkPlaceholderSvg,nftPlaceholder:async()=>(await __webpack_require__.e(3237).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/nftPlaceholder.js"))).nftPlaceholderSvg,off:async()=>(await __webpack_require__.e(6623).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/off.js"))).offSvg,playStore:async()=>(await __webpack_require__.e(3094).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/play-store.js"))).playStoreSvg,plus:async()=>(await __webpack_require__.e(1156).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/plus.js"))).plusSvg,qrCode:async()=>(await __webpack_require__.e(1029).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/qr-code.js"))).qrCodeIcon,recycleHorizontal:async()=>(await __webpack_require__.e(3384).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/recycle-horizontal.js"))).recycleHorizontalSvg,refresh:async()=>(await __webpack_require__.e(4017).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/refresh.js"))).refreshSvg,search:async()=>(await __webpack_require__.e(616).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/search.js"))).searchSvg,send:async()=>(await __webpack_require__.e(6686).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/send.js"))).sendSvg,swapHorizontal:async()=>(await __webpack_require__.e(259).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/swapHorizontal.js"))).swapHorizontalSvg,swapHorizontalMedium:async()=>(await __webpack_require__.e(4592).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/swapHorizontalMedium.js"))).swapHorizontalMediumSvg,swapHorizontalBold:async()=>(await __webpack_require__.e(7180).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/swapHorizontalBold.js"))).swapHorizontalBoldSvg,swapHorizontalRoundedBold:async()=>(await __webpack_require__.e(4313).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/swapHorizontalRoundedBold.js"))).swapHorizontalRoundedBoldSvg,swapVertical:async()=>(await __webpack_require__.e(2241).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/swapVertical.js"))).swapVerticalSvg,telegram:async()=>(await __webpack_require__.e(6651).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/telegram.js"))).telegramSvg,threeDots:async()=>(await __webpack_require__.e(6703).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/three-dots.js"))).threeDotsSvg,twitch:async()=>(await __webpack_require__.e(4631).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/twitch.js"))).twitchSvg,twitter:async()=>(await __webpack_require__.e(1890).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/x.js"))).xSvg,twitterIcon:async()=>(await __webpack_require__.e(8784).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/twitterIcon.js"))).twitterIconSvg,verify:async()=>(await __webpack_require__.e(1697).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/verify.js"))).verifySvg,verifyFilled:async()=>(await __webpack_require__.e(1654).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/verify-filled.js"))).verifyFilledSvg,wallet:async()=>(await __webpack_require__.e(777).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/wallet.js"))).walletSvg,walletConnect:async()=>(await __webpack_require__.e(3203).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/walletconnect.js"))).walletConnectSvg,walletConnectLightBrown:async()=>(await __webpack_require__.e(3203).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/walletconnect.js"))).walletConnectLightBrownSvg,walletConnectBrown:async()=>(await __webpack_require__.e(3203).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/walletconnect.js"))).walletConnectBrownSvg,walletPlaceholder:async()=>(await __webpack_require__.e(2841).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/wallet-placeholder.js"))).walletPlaceholderSvg,warningCircle:async()=>(await __webpack_require__.e(8091).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/warning-circle.js"))).warningCircleSvg,x:async()=>(await __webpack_require__.e(1890).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/x.js"))).xSvg,info:async()=>(await __webpack_require__.e(6412).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/info.js"))).infoSvg,exclamationTriangle:async()=>(await __webpack_require__.e(7564).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/exclamation-triangle.js"))).exclamationTriangleSvg,reown:async()=>(await __webpack_require__.e(2421).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/reown-logo.js"))).reownSvg};let WuiIcon=class WuiIcon extends lit.WF{constructor(){super(...arguments),this.size="md",this.name="copy",this.color="fg-300",this.aspectRatio="1 / 1"}render(){return this.style.cssText=`\n      --local-color: var(--wui-color-${this.color});\n      --local-width: var(--wui-icon-size-${this.size});\n      --local-aspect-ratio: ${this.aspectRatio}\n    `,lit.qy`${(0,until.T)(async function getSvg(name){if(globalSvgCache.has(name))return globalSvgCache.get(name);const svgPromise=(ICONS[name]??ICONS.copy)();return globalSvgCache.set(name,svgPromise),svgPromise}(this.name),lit.qy`<div class="fallback"></div>`)}`}};WuiIcon.styles=[ThemeUtil.W5,ThemeUtil.ck,styles],__decorate([(0,decorators.MZ)()],WuiIcon.prototype,"size",void 0),__decorate([(0,decorators.MZ)()],WuiIcon.prototype,"name",void 0),__decorate([(0,decorators.MZ)()],WuiIcon.prototype,"color",void 0),__decorate([(0,decorators.MZ)()],WuiIcon.prototype,"aspectRatio",void 0),WuiIcon=__decorate([(0,WebComponentsUtil.E)("wui-icon")],WuiIcon)},"./node_modules/@reown/appkit-ui/dist/esm/src/components/wui-image/index.js"(__unused_webpack_module,__unused_webpack___webpack_exports__,__webpack_require__){var lit=__webpack_require__("./node_modules/lit/index.js"),decorators=__webpack_require__("./node_modules/lit/decorators.js"),ThemeUtil=__webpack_require__("./node_modules/@reown/appkit-ui/dist/esm/src/utils/ThemeUtil.js"),WebComponentsUtil=__webpack_require__("./node_modules/@reown/appkit-ui/dist/esm/src/utils/WebComponentsUtil.js");const styles=lit.AH`
  :host {
    display: block;
    width: var(--local-width);
    height: var(--local-height);
  }

  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center center;
    border-radius: inherit;
  }
`;var __decorate=function(decorators,target,key,desc){var d,c=arguments.length,r=c<3?target:null===desc?desc=Object.getOwnPropertyDescriptor(target,key):desc;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(decorators,target,key,desc);else for(var i=decorators.length-1;i>=0;i--)(d=decorators[i])&&(r=(c<3?d(r):c>3?d(target,key,r):d(target,key))||r);return c>3&&r&&Object.defineProperty(target,key,r),r};let WuiImage=class WuiImage extends lit.WF{constructor(){super(...arguments),this.src="./path/to/image.jpg",this.alt="Image",this.size=void 0}render(){return this.style.cssText=`\n      --local-width: ${this.size?`var(--wui-icon-size-${this.size});`:"100%"};\n      --local-height: ${this.size?`var(--wui-icon-size-${this.size});`:"100%"};\n      `,lit.qy`<img src=${this.src} alt=${this.alt} @error=${this.handleImageError} />`}handleImageError(){this.dispatchEvent(new CustomEvent("onLoadError",{bubbles:!0,composed:!0}))}};WuiImage.styles=[ThemeUtil.W5,ThemeUtil.ck,styles],__decorate([(0,decorators.MZ)()],WuiImage.prototype,"src",void 0),__decorate([(0,decorators.MZ)()],WuiImage.prototype,"alt",void 0),__decorate([(0,decorators.MZ)()],WuiImage.prototype,"size",void 0),WuiImage=__decorate([(0,WebComponentsUtil.E)("wui-image")],WuiImage)},"./node_modules/@reown/appkit-ui/dist/esm/src/components/wui-loading-spinner/index.js"(__unused_webpack_module,__unused_webpack___webpack_exports__,__webpack_require__){var lit=__webpack_require__("./node_modules/lit/index.js"),decorators=__webpack_require__("./node_modules/lit/decorators.js"),ThemeUtil=__webpack_require__("./node_modules/@reown/appkit-ui/dist/esm/src/utils/ThemeUtil.js"),WebComponentsUtil=__webpack_require__("./node_modules/@reown/appkit-ui/dist/esm/src/utils/WebComponentsUtil.js");const styles=lit.AH`
  :host {
    display: flex;
  }

  :host([data-size='sm']) > svg {
    width: 12px;
    height: 12px;
  }

  :host([data-size='md']) > svg {
    width: 16px;
    height: 16px;
  }

  :host([data-size='lg']) > svg {
    width: 24px;
    height: 24px;
  }

  :host([data-size='xl']) > svg {
    width: 32px;
    height: 32px;
  }

  svg {
    animation: rotate 2s linear infinite;
  }

  circle {
    fill: none;
    stroke: var(--local-color);
    stroke-width: 4px;
    stroke-dasharray: 1, 124;
    stroke-dashoffset: 0;
    stroke-linecap: round;
    animation: dash 1.5s ease-in-out infinite;
  }

  :host([data-size='md']) > svg > circle {
    stroke-width: 6px;
  }

  :host([data-size='sm']) > svg > circle {
    stroke-width: 8px;
  }

  @keyframes rotate {
    100% {
      transform: rotate(360deg);
    }
  }

  @keyframes dash {
    0% {
      stroke-dasharray: 1, 124;
      stroke-dashoffset: 0;
    }

    50% {
      stroke-dasharray: 90, 124;
      stroke-dashoffset: -35;
    }

    100% {
      stroke-dashoffset: -125;
    }
  }
`;var __decorate=function(decorators,target,key,desc){var d,c=arguments.length,r=c<3?target:null===desc?desc=Object.getOwnPropertyDescriptor(target,key):desc;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(decorators,target,key,desc);else for(var i=decorators.length-1;i>=0;i--)(d=decorators[i])&&(r=(c<3?d(r):c>3?d(target,key,r):d(target,key))||r);return c>3&&r&&Object.defineProperty(target,key,r),r};let WuiLoadingSpinner=class WuiLoadingSpinner extends lit.WF{constructor(){super(...arguments),this.color="accent-100",this.size="lg"}render(){return this.style.cssText="--local-color: "+("inherit"===this.color?"inherit":`var(--wui-color-${this.color})`),this.dataset.size=this.size,lit.qy`<svg viewBox="25 25 50 50">
      <circle r="20" cy="50" cx="50"></circle>
    </svg>`}};WuiLoadingSpinner.styles=[ThemeUtil.W5,styles],__decorate([(0,decorators.MZ)()],WuiLoadingSpinner.prototype,"color",void 0),__decorate([(0,decorators.MZ)()],WuiLoadingSpinner.prototype,"size",void 0),WuiLoadingSpinner=__decorate([(0,WebComponentsUtil.E)("wui-loading-spinner")],WuiLoadingSpinner)},"./node_modules/@reown/appkit-ui/dist/esm/src/components/wui-text/index.js"(__unused_webpack_module,__unused_webpack___webpack_exports__,__webpack_require__){var lit=__webpack_require__("./node_modules/lit/index.js"),decorators=__webpack_require__("./node_modules/lit/decorators.js"),class_map=__webpack_require__("./node_modules/lit/directives/class-map.js"),ThemeUtil=__webpack_require__("./node_modules/@reown/appkit-ui/dist/esm/src/utils/ThemeUtil.js"),WebComponentsUtil=__webpack_require__("./node_modules/@reown/appkit-ui/dist/esm/src/utils/WebComponentsUtil.js");const styles=lit.AH`
  :host {
    display: inline-flex !important;
  }

  slot {
    width: 100%;
    display: inline-block;
    font-style: normal;
    font-family: var(--wui-font-family);
    font-feature-settings:
      'tnum' on,
      'lnum' on,
      'case' on;
    line-height: 130%;
    font-weight: var(--wui-font-weight-regular);
    overflow: inherit;
    text-overflow: inherit;
    text-align: var(--local-align);
    color: var(--local-color);
  }

  .wui-line-clamp-1 {
    overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 1;
  }

  .wui-line-clamp-2 {
    overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }

  .wui-font-medium-400 {
    font-size: var(--wui-font-size-medium);
    font-weight: var(--wui-font-weight-light);
    letter-spacing: var(--wui-letter-spacing-medium);
  }

  .wui-font-medium-600 {
    font-size: var(--wui-font-size-medium);
    letter-spacing: var(--wui-letter-spacing-medium);
  }

  .wui-font-title-600 {
    font-size: var(--wui-font-size-title);
    letter-spacing: var(--wui-letter-spacing-title);
  }

  .wui-font-title-6-600 {
    font-size: var(--wui-font-size-title-6);
    letter-spacing: var(--wui-letter-spacing-title-6);
  }

  .wui-font-mini-700 {
    font-size: var(--wui-font-size-mini);
    letter-spacing: var(--wui-letter-spacing-mini);
    text-transform: uppercase;
  }

  .wui-font-large-500,
  .wui-font-large-600,
  .wui-font-large-700 {
    font-size: var(--wui-font-size-large);
    letter-spacing: var(--wui-letter-spacing-large);
  }

  .wui-font-2xl-500,
  .wui-font-2xl-600,
  .wui-font-2xl-700 {
    font-size: var(--wui-font-size-2xl);
    letter-spacing: var(--wui-letter-spacing-2xl);
  }

  .wui-font-paragraph-400,
  .wui-font-paragraph-500,
  .wui-font-paragraph-600,
  .wui-font-paragraph-700 {
    font-size: var(--wui-font-size-paragraph);
    letter-spacing: var(--wui-letter-spacing-paragraph);
  }

  .wui-font-small-400,
  .wui-font-small-500,
  .wui-font-small-600 {
    font-size: var(--wui-font-size-small);
    letter-spacing: var(--wui-letter-spacing-small);
  }

  .wui-font-tiny-400,
  .wui-font-tiny-500,
  .wui-font-tiny-600 {
    font-size: var(--wui-font-size-tiny);
    letter-spacing: var(--wui-letter-spacing-tiny);
  }

  .wui-font-micro-700,
  .wui-font-micro-600 {
    font-size: var(--wui-font-size-micro);
    letter-spacing: var(--wui-letter-spacing-micro);
    text-transform: uppercase;
  }

  .wui-font-tiny-400,
  .wui-font-small-400,
  .wui-font-medium-400,
  .wui-font-paragraph-400 {
    font-weight: var(--wui-font-weight-light);
  }

  .wui-font-large-700,
  .wui-font-paragraph-700,
  .wui-font-micro-700,
  .wui-font-mini-700 {
    font-weight: var(--wui-font-weight-bold);
  }

  .wui-font-medium-600,
  .wui-font-medium-title-600,
  .wui-font-title-6-600,
  .wui-font-large-600,
  .wui-font-paragraph-600,
  .wui-font-small-600,
  .wui-font-tiny-600,
  .wui-font-micro-600 {
    font-weight: var(--wui-font-weight-medium);
  }

  :host([disabled]) {
    opacity: 0.4;
  }
`;var __decorate=function(decorators,target,key,desc){var d,c=arguments.length,r=c<3?target:null===desc?desc=Object.getOwnPropertyDescriptor(target,key):desc;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(decorators,target,key,desc);else for(var i=decorators.length-1;i>=0;i--)(d=decorators[i])&&(r=(c<3?d(r):c>3?d(target,key,r):d(target,key))||r);return c>3&&r&&Object.defineProperty(target,key,r),r};let WuiText=class WuiText extends lit.WF{constructor(){super(...arguments),this.variant="paragraph-500",this.color="fg-300",this.align="left",this.lineClamp=void 0}render(){const classes={[`wui-font-${this.variant}`]:!0,[`wui-color-${this.color}`]:!0,[`wui-line-clamp-${this.lineClamp}`]:!!this.lineClamp};return this.style.cssText=`\n      --local-align: ${this.align};\n      --local-color: var(--wui-color-${this.color});\n    `,lit.qy`<slot class=${(0,class_map.H)(classes)}></slot>`}};WuiText.styles=[ThemeUtil.W5,styles],__decorate([(0,decorators.MZ)()],WuiText.prototype,"variant",void 0),__decorate([(0,decorators.MZ)()],WuiText.prototype,"color",void 0),__decorate([(0,decorators.MZ)()],WuiText.prototype,"align",void 0),__decorate([(0,decorators.MZ)()],WuiText.prototype,"lineClamp",void 0),WuiText=__decorate([(0,WebComponentsUtil.E)("wui-text")],WuiText)},"./node_modules/@reown/appkit-ui/dist/esm/src/composites/wui-icon-box/index.js"(__unused_webpack_module,__unused_webpack___webpack_exports__,__webpack_require__){var lit=__webpack_require__("./node_modules/lit/index.js"),decorators=__webpack_require__("./node_modules/lit/decorators.js"),ThemeUtil=(__webpack_require__("./node_modules/@reown/appkit-ui/dist/esm/src/components/wui-icon/index.js"),__webpack_require__("./node_modules/@reown/appkit-ui/dist/esm/src/utils/ThemeUtil.js")),WebComponentsUtil=__webpack_require__("./node_modules/@reown/appkit-ui/dist/esm/src/utils/WebComponentsUtil.js");const styles=lit.AH`
  :host {
    display: inline-flex;
    justify-content: center;
    align-items: center;
    position: relative;
    overflow: hidden;
    background-color: var(--wui-color-gray-glass-020);
    border-radius: var(--local-border-radius);
    border: var(--local-border);
    box-sizing: content-box;
    width: var(--local-size);
    height: var(--local-size);
    min-height: var(--local-size);
    min-width: var(--local-size);
  }

  @supports (background: color-mix(in srgb, white 50%, black)) {
    :host {
      background-color: color-mix(in srgb, var(--local-bg-value) var(--local-bg-mix), transparent);
    }
  }
`;var __decorate=function(decorators,target,key,desc){var d,c=arguments.length,r=c<3?target:null===desc?desc=Object.getOwnPropertyDescriptor(target,key):desc;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(decorators,target,key,desc);else for(var i=decorators.length-1;i>=0;i--)(d=decorators[i])&&(r=(c<3?d(r):c>3?d(target,key,r):d(target,key))||r);return c>3&&r&&Object.defineProperty(target,key,r),r};let WuiIconBox=class WuiIconBox extends lit.WF{constructor(){super(...arguments),this.size="md",this.backgroundColor="accent-100",this.iconColor="accent-100",this.background="transparent",this.border=!1,this.borderColor="wui-color-bg-125",this.icon="copy"}render(){const iconSize=this.iconSize||this.size,isLg="lg"===this.size,isXl="xl"===this.size,bgMix=isLg?"12%":"16%",borderRadius=isLg?"xxs":isXl?"s":"3xl",isGray="gray"===this.background,isOpaque="opaque"===this.background,isColorChange="accent-100"===this.backgroundColor&&isOpaque||"success-100"===this.backgroundColor&&isOpaque||"error-100"===this.backgroundColor&&isOpaque||"inverse-100"===this.backgroundColor&&isOpaque;let bgValueVariable=`var(--wui-color-${this.backgroundColor})`;return isColorChange?bgValueVariable=`var(--wui-icon-box-bg-${this.backgroundColor})`:isGray&&(bgValueVariable=`var(--wui-color-gray-${this.backgroundColor})`),this.style.cssText=`\n       --local-bg-value: ${bgValueVariable};\n       --local-bg-mix: ${isColorChange||isGray?"100%":bgMix};\n       --local-border-radius: var(--wui-border-radius-${borderRadius});\n       --local-size: var(--wui-icon-box-size-${this.size});\n       --local-border: ${"wui-color-bg-125"===this.borderColor?"2px":"1px"} solid ${this.border?`var(--${this.borderColor})`:"transparent"}\n   `,lit.qy` <wui-icon color=${this.iconColor} size=${iconSize} name=${this.icon}></wui-icon> `}};WuiIconBox.styles=[ThemeUtil.W5,ThemeUtil.fD,styles],__decorate([(0,decorators.MZ)()],WuiIconBox.prototype,"size",void 0),__decorate([(0,decorators.MZ)()],WuiIconBox.prototype,"backgroundColor",void 0),__decorate([(0,decorators.MZ)()],WuiIconBox.prototype,"iconColor",void 0),__decorate([(0,decorators.MZ)()],WuiIconBox.prototype,"iconSize",void 0),__decorate([(0,decorators.MZ)()],WuiIconBox.prototype,"background",void 0),__decorate([(0,decorators.MZ)({type:Boolean})],WuiIconBox.prototype,"border",void 0),__decorate([(0,decorators.MZ)()],WuiIconBox.prototype,"borderColor",void 0),__decorate([(0,decorators.MZ)()],WuiIconBox.prototype,"icon",void 0),WuiIconBox=__decorate([(0,WebComponentsUtil.E)("wui-icon-box")],WuiIconBox)},"./node_modules/@reown/appkit-ui/dist/esm/src/composites/wui-tag/index.js"(__unused_webpack_module,__unused_webpack___webpack_exports__,__webpack_require__){var lit=__webpack_require__("./node_modules/lit/index.js"),decorators=__webpack_require__("./node_modules/lit/decorators.js"),ThemeUtil=(__webpack_require__("./node_modules/@reown/appkit-ui/dist/esm/src/components/wui-text/index.js"),__webpack_require__("./node_modules/@reown/appkit-ui/dist/esm/src/utils/ThemeUtil.js")),WebComponentsUtil=__webpack_require__("./node_modules/@reown/appkit-ui/dist/esm/src/utils/WebComponentsUtil.js");const styles=lit.AH`
  :host {
    display: flex;
    justify-content: center;
    align-items: center;
    height: var(--wui-spacing-m);
    padding: 0 var(--wui-spacing-3xs) !important;
    border-radius: var(--wui-border-radius-5xs);
    transition:
      border-radius var(--wui-duration-lg) var(--wui-ease-out-power-1),
      background-color var(--wui-duration-lg) var(--wui-ease-out-power-1);
    will-change: border-radius, background-color;
  }

  :host > wui-text {
    transform: translateY(5%);
  }

  :host([data-variant='main']) {
    background-color: var(--wui-color-accent-glass-015);
    color: var(--wui-color-accent-100);
  }

  :host([data-variant='shade']) {
    background-color: var(--wui-color-gray-glass-010);
    color: var(--wui-color-fg-200);
  }

  :host([data-variant='success']) {
    background-color: var(--wui-icon-box-bg-success-100);
    color: var(--wui-color-success-100);
  }

  :host([data-variant='error']) {
    background-color: var(--wui-icon-box-bg-error-100);
    color: var(--wui-color-error-100);
  }

  :host([data-size='lg']) {
    padding: 11px 5px !important;
  }

  :host([data-size='lg']) > wui-text {
    transform: translateY(2%);
  }
`;var __decorate=function(decorators,target,key,desc){var d,c=arguments.length,r=c<3?target:null===desc?desc=Object.getOwnPropertyDescriptor(target,key):desc;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(decorators,target,key,desc);else for(var i=decorators.length-1;i>=0;i--)(d=decorators[i])&&(r=(c<3?d(r):c>3?d(target,key,r):d(target,key))||r);return c>3&&r&&Object.defineProperty(target,key,r),r};let WuiTag=class WuiTag extends lit.WF{constructor(){super(...arguments),this.variant="main",this.size="lg"}render(){this.dataset.variant=this.variant,this.dataset.size=this.size;const textVariant="md"===this.size?"mini-700":"micro-700";return lit.qy`
      <wui-text data-variant=${this.variant} variant=${textVariant} color="inherit">
        <slot></slot>
      </wui-text>
    `}};WuiTag.styles=[ThemeUtil.W5,styles],__decorate([(0,decorators.MZ)()],WuiTag.prototype,"variant",void 0),__decorate([(0,decorators.MZ)()],WuiTag.prototype,"size",void 0),WuiTag=__decorate([(0,WebComponentsUtil.E)("wui-tag")],WuiTag)},"./node_modules/@reown/appkit-ui/dist/esm/src/layout/wui-flex/index.js"(__unused_webpack_module,__unused_webpack___webpack_exports__,__webpack_require__){var lit=__webpack_require__("./node_modules/lit/index.js"),decorators=__webpack_require__("./node_modules/lit/decorators.js"),ThemeUtil=__webpack_require__("./node_modules/@reown/appkit-ui/dist/esm/src/utils/ThemeUtil.js"),UiHelperUtil=__webpack_require__("./node_modules/@reown/appkit-ui/dist/esm/src/utils/UiHelperUtil.js"),WebComponentsUtil=__webpack_require__("./node_modules/@reown/appkit-ui/dist/esm/src/utils/WebComponentsUtil.js");const styles=lit.AH`
  :host {
    display: flex;
    width: inherit;
    height: inherit;
  }
`;var __decorate=function(decorators,target,key,desc){var d,c=arguments.length,r=c<3?target:null===desc?desc=Object.getOwnPropertyDescriptor(target,key):desc;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(decorators,target,key,desc);else for(var i=decorators.length-1;i>=0;i--)(d=decorators[i])&&(r=(c<3?d(r):c>3?d(target,key,r):d(target,key))||r);return c>3&&r&&Object.defineProperty(target,key,r),r};let WuiFlex=class WuiFlex extends lit.WF{render(){return this.style.cssText=`\n      flex-direction: ${this.flexDirection};\n      flex-wrap: ${this.flexWrap};\n      flex-basis: ${this.flexBasis};\n      flex-grow: ${this.flexGrow};\n      flex-shrink: ${this.flexShrink};\n      align-items: ${this.alignItems};\n      justify-content: ${this.justifyContent};\n      column-gap: ${this.columnGap&&`var(--wui-spacing-${this.columnGap})`};\n      row-gap: ${this.rowGap&&`var(--wui-spacing-${this.rowGap})`};\n      gap: ${this.gap&&`var(--wui-spacing-${this.gap})`};\n      padding-top: ${this.padding&&UiHelperUtil.Z.getSpacingStyles(this.padding,0)};\n      padding-right: ${this.padding&&UiHelperUtil.Z.getSpacingStyles(this.padding,1)};\n      padding-bottom: ${this.padding&&UiHelperUtil.Z.getSpacingStyles(this.padding,2)};\n      padding-left: ${this.padding&&UiHelperUtil.Z.getSpacingStyles(this.padding,3)};\n      margin-top: ${this.margin&&UiHelperUtil.Z.getSpacingStyles(this.margin,0)};\n      margin-right: ${this.margin&&UiHelperUtil.Z.getSpacingStyles(this.margin,1)};\n      margin-bottom: ${this.margin&&UiHelperUtil.Z.getSpacingStyles(this.margin,2)};\n      margin-left: ${this.margin&&UiHelperUtil.Z.getSpacingStyles(this.margin,3)};\n    `,lit.qy`<slot></slot>`}};WuiFlex.styles=[ThemeUtil.W5,styles],__decorate([(0,decorators.MZ)()],WuiFlex.prototype,"flexDirection",void 0),__decorate([(0,decorators.MZ)()],WuiFlex.prototype,"flexWrap",void 0),__decorate([(0,decorators.MZ)()],WuiFlex.prototype,"flexBasis",void 0),__decorate([(0,decorators.MZ)()],WuiFlex.prototype,"flexGrow",void 0),__decorate([(0,decorators.MZ)()],WuiFlex.prototype,"flexShrink",void 0),__decorate([(0,decorators.MZ)()],WuiFlex.prototype,"alignItems",void 0),__decorate([(0,decorators.MZ)()],WuiFlex.prototype,"justifyContent",void 0),__decorate([(0,decorators.MZ)()],WuiFlex.prototype,"columnGap",void 0),__decorate([(0,decorators.MZ)()],WuiFlex.prototype,"rowGap",void 0),__decorate([(0,decorators.MZ)()],WuiFlex.prototype,"gap",void 0),__decorate([(0,decorators.MZ)()],WuiFlex.prototype,"padding",void 0),__decorate([(0,decorators.MZ)()],WuiFlex.prototype,"margin",void 0),WuiFlex=__decorate([(0,WebComponentsUtil.E)("wui-flex")],WuiFlex)},"./node_modules/lit/decorators.js"(__unused_webpack_module,__webpack_exports__,__webpack_require__){__webpack_require__.d(__webpack_exports__,{MZ:()=>_lit_reactive_element_decorators_property_js__WEBPACK_IMPORTED_MODULE_0__.M,wk:()=>_lit_reactive_element_decorators_state_js__WEBPACK_IMPORTED_MODULE_1__.w});var _lit_reactive_element_decorators_property_js__WEBPACK_IMPORTED_MODULE_0__=__webpack_require__("./node_modules/@lit/reactive-element/decorators/property.js"),_lit_reactive_element_decorators_state_js__WEBPACK_IMPORTED_MODULE_1__=__webpack_require__("./node_modules/@lit/reactive-element/decorators/state.js")},"./node_modules/lit/directives/class-map.js"(__unused_webpack_module,__webpack_exports__,__webpack_require__){__webpack_require__.d(__webpack_exports__,{H:()=>lit_html_directives_class_map_js__WEBPACK_IMPORTED_MODULE_0__.H});var lit_html_directives_class_map_js__WEBPACK_IMPORTED_MODULE_0__=__webpack_require__("./node_modules/lit-html/directives/class-map.js")},"./node_modules/lit/directives/if-defined.js"(__unused_webpack_module,__webpack_exports__,__webpack_require__){__webpack_require__.d(__webpack_exports__,{J:()=>lit_html_directives_if_defined_js__WEBPACK_IMPORTED_MODULE_0__.J});var lit_html_directives_if_defined_js__WEBPACK_IMPORTED_MODULE_0__=__webpack_require__("./node_modules/lit-html/directives/if-defined.js")}}]);
//# sourceMappingURL=910.d7bf805b.iframe.bundle.js.map