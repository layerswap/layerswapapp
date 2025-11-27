/*! For license information please see 3900.c79c9029.iframe.bundle.js.LICENSE.txt */
"use strict";(self.webpackChunklayerswap=self.webpackChunklayerswap||[]).push([[3900],{"./node_modules/@lit/reactive-element/decorators/property.js":(__unused_webpack_module,__webpack_exports__,__webpack_require__)=>{__webpack_require__.d(__webpack_exports__,{M:()=>n});var _reactive_element_js__WEBPACK_IMPORTED_MODULE_0__=__webpack_require__("./node_modules/@lit/reactive-element/reactive-element.js");const o={attribute:!0,type:String,converter:_reactive_element_js__WEBPACK_IMPORTED_MODULE_0__.W3,reflect:!1,hasChanged:_reactive_element_js__WEBPACK_IMPORTED_MODULE_0__.Ec},r=(t=o,e,r)=>{const{kind:n,metadata:i}=r;let s=globalThis.litPropertyMetadata.get(i);if(void 0===s&&globalThis.litPropertyMetadata.set(i,s=new Map),"setter"===n&&((t=Object.create(t)).wrapped=!0),s.set(r.name,t),"accessor"===n){const{name:o}=r;return{set(r){const n=e.get.call(this);e.set.call(this,r),this.requestUpdate(o,n,t)},init(e){return void 0!==e&&this.C(o,void 0,t,e),e}}}if("setter"===n){const{name:o}=r;return function(r){const n=this[o];e.call(this,r),this.requestUpdate(o,n,t)}}throw Error("Unsupported decorator location: "+n)};function n(t){return(e,o)=>"object"==typeof o?r(t,e,o):((t,e,o)=>{const r=e.hasOwnProperty(o);return e.constructor.createProperty(o,t),r?Object.getOwnPropertyDescriptor(e,o):void 0})(t,e,o)}},"./node_modules/@lit/reactive-element/decorators/state.js":(__unused_webpack_module,__webpack_exports__,__webpack_require__)=>{__webpack_require__.d(__webpack_exports__,{w:()=>r});var _property_js__WEBPACK_IMPORTED_MODULE_0__=__webpack_require__("./node_modules/@lit/reactive-element/decorators/property.js");function r(r){return(0,_property_js__WEBPACK_IMPORTED_MODULE_0__.M)({...r,state:!0,attribute:!1})}},"./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/exports/index.js":(__unused_webpack_module,__webpack_exports__,__webpack_require__)=>{__webpack_require__.d(__webpack_exports__,{Zv:()=>UiHelperUtil.Z,EM:()=>WebComponentsUtil.E,RF:()=>ThemeUtil.RF});var ThemeUtil=__webpack_require__("./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/utils/ThemeUtil.js"),UiHelperUtil=__webpack_require__("./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/utils/UiHelperUtil.js"),dayjs_min=__webpack_require__("./node_modules/dayjs/dayjs.min.js"),dayjs_min_default=__webpack_require__.n(dayjs_min),en=__webpack_require__("./node_modules/dayjs/locale/en.js"),en_default=__webpack_require__.n(en),relativeTime=__webpack_require__("./node_modules/dayjs/plugin/relativeTime.js"),relativeTime_default=__webpack_require__.n(relativeTime),updateLocale=__webpack_require__("./node_modules/dayjs/plugin/updateLocale.js"),updateLocale_default=__webpack_require__.n(updateLocale);dayjs_min_default().extend(relativeTime_default()),dayjs_min_default().extend(updateLocale_default());const localeObject={...en_default(),name:"en-web3-modal",relativeTime:{future:"in %s",past:"%s ago",s:"%d sec",m:"1 min",mm:"%d min",h:"1 hr",hh:"%d hrs",d:"1 d",dd:"%d d",M:"1 mo",MM:"%d mo",y:"1 yr",yy:"%d yr"}};dayjs_min_default().locale("en-web3-modal",localeObject);var WebComponentsUtil=__webpack_require__("./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/utils/WebComponentsUtil.js")},"./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/exports/wui-flex.js":(__unused_webpack_module,__unused_webpack___webpack_exports__,__webpack_require__)=>{__webpack_require__("./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/layout/wui-flex/index.js")},"./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/exports/wui-icon.js":(__unused_webpack_module,__unused_webpack___webpack_exports__,__webpack_require__)=>{__webpack_require__("./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/components/wui-icon/index.js")},"./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/exports/wui-text.js":(__unused_webpack_module,__unused_webpack___webpack_exports__,__webpack_require__)=>{__webpack_require__("./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/components/wui-text/index.js")},"./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/components/wui-icon/index.js":(__unused_webpack_module,__unused_webpack___webpack_exports__,__webpack_require__)=>{var lit=__webpack_require__("./node_modules/@reown/appkit-scaffold-ui/node_modules/lit/index.js"),decorators=__webpack_require__("./node_modules/@reown/appkit-scaffold-ui/node_modules/lit/decorators.js"),until=__webpack_require__("./node_modules/lit-html/directives/until.js");const globalSvgCache=new class CacheUtil{constructor(){this.cache=new Map}set(key,value){this.cache.set(key,value)}get(key){return this.cache.get(key)}has(key){return this.cache.has(key)}delete(key){this.cache.delete(key)}clear(){this.cache.clear()}};var ThemeUtil=__webpack_require__("./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/utils/ThemeUtil.js"),WebComponentsUtil=__webpack_require__("./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/utils/WebComponentsUtil.js");const styles=lit.AH`
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
`;var __decorate=function(decorators,target,key,desc){var d,c=arguments.length,r=c<3?target:null===desc?desc=Object.getOwnPropertyDescriptor(target,key):desc;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(decorators,target,key,desc);else for(var i=decorators.length-1;i>=0;i--)(d=decorators[i])&&(r=(c<3?d(r):c>3?d(target,key,r):d(target,key))||r);return c>3&&r&&Object.defineProperty(target,key,r),r};const ICONS={add:async()=>(await __webpack_require__.e(9176).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/add.js"))).addSvg,allWallets:async()=>(await __webpack_require__.e(9791).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/all-wallets.js"))).allWalletsSvg,arrowBottomCircle:async()=>(await __webpack_require__.e(665).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/arrow-bottom-circle.js"))).arrowBottomCircleSvg,appStore:async()=>(await __webpack_require__.e(9464).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/app-store.js"))).appStoreSvg,apple:async()=>(await __webpack_require__.e(8303).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/apple.js"))).appleSvg,arrowBottom:async()=>(await __webpack_require__.e(7484).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/arrow-bottom.js"))).arrowBottomSvg,arrowLeft:async()=>(await __webpack_require__.e(1646).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/arrow-left.js"))).arrowLeftSvg,arrowRight:async()=>(await __webpack_require__.e(3593).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/arrow-right.js"))).arrowRightSvg,arrowTop:async()=>(await __webpack_require__.e(2564).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/arrow-top.js"))).arrowTopSvg,bank:async()=>(await __webpack_require__.e(2313).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/bank.js"))).bankSvg,browser:async()=>(await __webpack_require__.e(9439).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/browser.js"))).browserSvg,card:async()=>(await __webpack_require__.e(9065).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/card.js"))).cardSvg,checkmark:async()=>(await __webpack_require__.e(7314).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/checkmark.js"))).checkmarkSvg,checkmarkBold:async()=>(await __webpack_require__.e(9340).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/checkmark-bold.js"))).checkmarkBoldSvg,chevronBottom:async()=>(await __webpack_require__.e(3434).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/chevron-bottom.js"))).chevronBottomSvg,chevronLeft:async()=>(await __webpack_require__.e(516).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/chevron-left.js"))).chevronLeftSvg,chevronRight:async()=>(await __webpack_require__.e(191).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/chevron-right.js"))).chevronRightSvg,chevronTop:async()=>(await __webpack_require__.e(3990).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/chevron-top.js"))).chevronTopSvg,chromeStore:async()=>(await __webpack_require__.e(1401).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/chrome-store.js"))).chromeStoreSvg,clock:async()=>(await __webpack_require__.e(8721).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/clock.js"))).clockSvg,close:async()=>(await __webpack_require__.e(6787).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/close.js"))).closeSvg,compass:async()=>(await __webpack_require__.e(2815).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/compass.js"))).compassSvg,coinPlaceholder:async()=>(await __webpack_require__.e(9429).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/coinPlaceholder.js"))).coinPlaceholderSvg,copy:async()=>(await __webpack_require__.e(1902).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/copy.js"))).copySvg,cursor:async()=>(await __webpack_require__.e(1773).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/cursor.js"))).cursorSvg,cursorTransparent:async()=>(await __webpack_require__.e(4074).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/cursor-transparent.js"))).cursorTransparentSvg,desktop:async()=>(await __webpack_require__.e(5335).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/desktop.js"))).desktopSvg,disconnect:async()=>(await __webpack_require__.e(6549).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/disconnect.js"))).disconnectSvg,discord:async()=>(await __webpack_require__.e(8103).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/discord.js"))).discordSvg,etherscan:async()=>(await __webpack_require__.e(9498).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/etherscan.js"))).etherscanSvg,extension:async()=>(await __webpack_require__.e(1982).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/extension.js"))).extensionSvg,externalLink:async()=>(await __webpack_require__.e(2145).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/external-link.js"))).externalLinkSvg,facebook:async()=>(await __webpack_require__.e(819).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/facebook.js"))).facebookSvg,farcaster:async()=>(await __webpack_require__.e(4158).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/farcaster.js"))).farcasterSvg,filters:async()=>(await __webpack_require__.e(1768).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/filters.js"))).filtersSvg,github:async()=>(await __webpack_require__.e(188).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/github.js"))).githubSvg,google:async()=>(await __webpack_require__.e(2644).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/google.js"))).googleSvg,helpCircle:async()=>(await __webpack_require__.e(3709).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/help-circle.js"))).helpCircleSvg,image:async()=>(await __webpack_require__.e(4470).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/image.js"))).imageSvg,id:async()=>(await __webpack_require__.e(7486).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/id.js"))).idSvg,infoCircle:async()=>(await __webpack_require__.e(9856).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/info-circle.js"))).infoCircleSvg,lightbulb:async()=>(await __webpack_require__.e(4216).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/lightbulb.js"))).lightbulbSvg,mail:async()=>(await __webpack_require__.e(4028).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/mail.js"))).mailSvg,mobile:async()=>(await __webpack_require__.e(8741).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/mobile.js"))).mobileSvg,more:async()=>(await __webpack_require__.e(7386).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/more.js"))).moreSvg,networkPlaceholder:async()=>(await __webpack_require__.e(8105).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/network-placeholder.js"))).networkPlaceholderSvg,nftPlaceholder:async()=>(await __webpack_require__.e(5238).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/nftPlaceholder.js"))).nftPlaceholderSvg,off:async()=>(await __webpack_require__.e(6190).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/off.js"))).offSvg,playStore:async()=>(await __webpack_require__.e(7377).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/play-store.js"))).playStoreSvg,plus:async()=>(await __webpack_require__.e(1175).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/plus.js"))).plusSvg,qrCode:async()=>(await __webpack_require__.e(9908).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/qr-code.js"))).qrCodeIcon,recycleHorizontal:async()=>(await __webpack_require__.e(9807).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/recycle-horizontal.js"))).recycleHorizontalSvg,refresh:async()=>(await __webpack_require__.e(6376).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/refresh.js"))).refreshSvg,search:async()=>(await __webpack_require__.e(9523).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/search.js"))).searchSvg,send:async()=>(await __webpack_require__.e(6473).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/send.js"))).sendSvg,swapHorizontal:async()=>(await __webpack_require__.e(6824).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/swapHorizontal.js"))).swapHorizontalSvg,swapHorizontalMedium:async()=>(await __webpack_require__.e(395).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/swapHorizontalMedium.js"))).swapHorizontalMediumSvg,swapHorizontalBold:async()=>(await __webpack_require__.e(5603).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/swapHorizontalBold.js"))).swapHorizontalBoldSvg,swapHorizontalRoundedBold:async()=>(await __webpack_require__.e(6456).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/swapHorizontalRoundedBold.js"))).swapHorizontalRoundedBoldSvg,swapVertical:async()=>(await __webpack_require__.e(4566).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/swapVertical.js"))).swapVerticalSvg,telegram:async()=>(await __webpack_require__.e(2256).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/telegram.js"))).telegramSvg,threeDots:async()=>(await __webpack_require__.e(9792).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/three-dots.js"))).threeDotsSvg,twitch:async()=>(await __webpack_require__.e(4756).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/twitch.js"))).twitchSvg,twitter:async()=>(await __webpack_require__.e(9047).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/x.js"))).xSvg,twitterIcon:async()=>(await __webpack_require__.e(8745).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/twitterIcon.js"))).twitterIconSvg,verify:async()=>(await __webpack_require__.e(1038).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/verify.js"))).verifySvg,verifyFilled:async()=>(await __webpack_require__.e(3903).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/verify-filled.js"))).verifyFilledSvg,wallet:async()=>(await __webpack_require__.e(3062).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/wallet.js"))).walletSvg,walletConnect:async()=>(await __webpack_require__.e(9842).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/walletconnect.js"))).walletConnectSvg,walletConnectLightBrown:async()=>(await __webpack_require__.e(9842).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/walletconnect.js"))).walletConnectLightBrownSvg,walletConnectBrown:async()=>(await __webpack_require__.e(9842).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/walletconnect.js"))).walletConnectBrownSvg,walletPlaceholder:async()=>(await __webpack_require__.e(9526).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/wallet-placeholder.js"))).walletPlaceholderSvg,warningCircle:async()=>(await __webpack_require__.e(2496).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/warning-circle.js"))).warningCircleSvg,x:async()=>(await __webpack_require__.e(9047).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/x.js"))).xSvg,info:async()=>(await __webpack_require__.e(4931).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/info.js"))).infoSvg,exclamationTriangle:async()=>(await __webpack_require__.e(9463).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/exclamation-triangle.js"))).exclamationTriangleSvg,reown:async()=>(await __webpack_require__.e(3806).then(__webpack_require__.bind(__webpack_require__,"./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/assets/svg/reown-logo.js"))).reownSvg};let WuiIcon=class WuiIcon extends lit.WF{constructor(){super(...arguments),this.size="md",this.name="copy",this.color="fg-300",this.aspectRatio="1 / 1"}render(){return this.style.cssText=`\n      --local-color: var(--wui-color-${this.color});\n      --local-width: var(--wui-icon-size-${this.size});\n      --local-aspect-ratio: ${this.aspectRatio}\n    `,lit.qy`${(0,until.T)(async function getSvg(name){if(globalSvgCache.has(name))return globalSvgCache.get(name);const svgPromise=(ICONS[name]??ICONS.copy)();return globalSvgCache.set(name,svgPromise),svgPromise}(this.name),lit.qy`<div class="fallback"></div>`)}`}};WuiIcon.styles=[ThemeUtil.W5,ThemeUtil.ck,styles],__decorate([(0,decorators.MZ)()],WuiIcon.prototype,"size",void 0),__decorate([(0,decorators.MZ)()],WuiIcon.prototype,"name",void 0),__decorate([(0,decorators.MZ)()],WuiIcon.prototype,"color",void 0),__decorate([(0,decorators.MZ)()],WuiIcon.prototype,"aspectRatio",void 0),WuiIcon=__decorate([(0,WebComponentsUtil.E)("wui-icon")],WuiIcon)},"./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/components/wui-image/index.js":(__unused_webpack_module,__unused_webpack___webpack_exports__,__webpack_require__)=>{var lit=__webpack_require__("./node_modules/@reown/appkit-scaffold-ui/node_modules/lit/index.js"),decorators=__webpack_require__("./node_modules/@reown/appkit-scaffold-ui/node_modules/lit/decorators.js"),ThemeUtil=__webpack_require__("./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/utils/ThemeUtil.js"),WebComponentsUtil=__webpack_require__("./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/utils/WebComponentsUtil.js");const styles=lit.AH`
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
`;var __decorate=function(decorators,target,key,desc){var d,c=arguments.length,r=c<3?target:null===desc?desc=Object.getOwnPropertyDescriptor(target,key):desc;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(decorators,target,key,desc);else for(var i=decorators.length-1;i>=0;i--)(d=decorators[i])&&(r=(c<3?d(r):c>3?d(target,key,r):d(target,key))||r);return c>3&&r&&Object.defineProperty(target,key,r),r};let WuiImage=class WuiImage extends lit.WF{constructor(){super(...arguments),this.src="./path/to/image.jpg",this.alt="Image",this.size=void 0}render(){return this.style.cssText=`\n      --local-width: ${this.size?`var(--wui-icon-size-${this.size});`:"100%"};\n      --local-height: ${this.size?`var(--wui-icon-size-${this.size});`:"100%"};\n      `,lit.qy`<img src=${this.src} alt=${this.alt} @error=${this.handleImageError} />`}handleImageError(){this.dispatchEvent(new CustomEvent("onLoadError",{bubbles:!0,composed:!0}))}};WuiImage.styles=[ThemeUtil.W5,ThemeUtil.ck,styles],__decorate([(0,decorators.MZ)()],WuiImage.prototype,"src",void 0),__decorate([(0,decorators.MZ)()],WuiImage.prototype,"alt",void 0),__decorate([(0,decorators.MZ)()],WuiImage.prototype,"size",void 0),WuiImage=__decorate([(0,WebComponentsUtil.E)("wui-image")],WuiImage)},"./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/components/wui-loading-spinner/index.js":(__unused_webpack_module,__unused_webpack___webpack_exports__,__webpack_require__)=>{var lit=__webpack_require__("./node_modules/@reown/appkit-scaffold-ui/node_modules/lit/index.js"),decorators=__webpack_require__("./node_modules/@reown/appkit-scaffold-ui/node_modules/lit/decorators.js"),ThemeUtil=__webpack_require__("./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/utils/ThemeUtil.js"),WebComponentsUtil=__webpack_require__("./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/utils/WebComponentsUtil.js");const styles=lit.AH`
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
    </svg>`}};WuiLoadingSpinner.styles=[ThemeUtil.W5,styles],__decorate([(0,decorators.MZ)()],WuiLoadingSpinner.prototype,"color",void 0),__decorate([(0,decorators.MZ)()],WuiLoadingSpinner.prototype,"size",void 0),WuiLoadingSpinner=__decorate([(0,WebComponentsUtil.E)("wui-loading-spinner")],WuiLoadingSpinner)},"./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/components/wui-text/index.js":(__unused_webpack_module,__unused_webpack___webpack_exports__,__webpack_require__)=>{var lit=__webpack_require__("./node_modules/@reown/appkit-scaffold-ui/node_modules/lit/index.js"),decorators=__webpack_require__("./node_modules/@reown/appkit-scaffold-ui/node_modules/lit/decorators.js"),class_map=__webpack_require__("./node_modules/@reown/appkit-scaffold-ui/node_modules/lit/directives/class-map.js"),ThemeUtil=__webpack_require__("./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/utils/ThemeUtil.js"),WebComponentsUtil=__webpack_require__("./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/utils/WebComponentsUtil.js");const styles=lit.AH`
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
`;var __decorate=function(decorators,target,key,desc){var d,c=arguments.length,r=c<3?target:null===desc?desc=Object.getOwnPropertyDescriptor(target,key):desc;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(decorators,target,key,desc);else for(var i=decorators.length-1;i>=0;i--)(d=decorators[i])&&(r=(c<3?d(r):c>3?d(target,key,r):d(target,key))||r);return c>3&&r&&Object.defineProperty(target,key,r),r};let WuiText=class WuiText extends lit.WF{constructor(){super(...arguments),this.variant="paragraph-500",this.color="fg-300",this.align="left",this.lineClamp=void 0}render(){const classes={[`wui-font-${this.variant}`]:!0,[`wui-color-${this.color}`]:!0,[`wui-line-clamp-${this.lineClamp}`]:!!this.lineClamp};return this.style.cssText=`\n      --local-align: ${this.align};\n      --local-color: var(--wui-color-${this.color});\n    `,lit.qy`<slot class=${(0,class_map.H)(classes)}></slot>`}};WuiText.styles=[ThemeUtil.W5,styles],__decorate([(0,decorators.MZ)()],WuiText.prototype,"variant",void 0),__decorate([(0,decorators.MZ)()],WuiText.prototype,"color",void 0),__decorate([(0,decorators.MZ)()],WuiText.prototype,"align",void 0),__decorate([(0,decorators.MZ)()],WuiText.prototype,"lineClamp",void 0),WuiText=__decorate([(0,WebComponentsUtil.E)("wui-text")],WuiText)},"./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/composites/wui-icon-box/index.js":(__unused_webpack_module,__unused_webpack___webpack_exports__,__webpack_require__)=>{var lit=__webpack_require__("./node_modules/@reown/appkit-scaffold-ui/node_modules/lit/index.js"),decorators=__webpack_require__("./node_modules/@reown/appkit-scaffold-ui/node_modules/lit/decorators.js"),ThemeUtil=(__webpack_require__("./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/components/wui-icon/index.js"),__webpack_require__("./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/utils/ThemeUtil.js")),WebComponentsUtil=__webpack_require__("./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/utils/WebComponentsUtil.js");const styles=lit.AH`
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
`;var __decorate=function(decorators,target,key,desc){var d,c=arguments.length,r=c<3?target:null===desc?desc=Object.getOwnPropertyDescriptor(target,key):desc;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(decorators,target,key,desc);else for(var i=decorators.length-1;i>=0;i--)(d=decorators[i])&&(r=(c<3?d(r):c>3?d(target,key,r):d(target,key))||r);return c>3&&r&&Object.defineProperty(target,key,r),r};let WuiIconBox=class WuiIconBox extends lit.WF{constructor(){super(...arguments),this.size="md",this.backgroundColor="accent-100",this.iconColor="accent-100",this.background="transparent",this.border=!1,this.borderColor="wui-color-bg-125",this.icon="copy"}render(){const iconSize=this.iconSize||this.size,isLg="lg"===this.size,isXl="xl"===this.size,bgMix=isLg?"12%":"16%",borderRadius=isLg?"xxs":isXl?"s":"3xl",isGray="gray"===this.background,isOpaque="opaque"===this.background,isColorChange="accent-100"===this.backgroundColor&&isOpaque||"success-100"===this.backgroundColor&&isOpaque||"error-100"===this.backgroundColor&&isOpaque||"inverse-100"===this.backgroundColor&&isOpaque;let bgValueVariable=`var(--wui-color-${this.backgroundColor})`;return isColorChange?bgValueVariable=`var(--wui-icon-box-bg-${this.backgroundColor})`:isGray&&(bgValueVariable=`var(--wui-color-gray-${this.backgroundColor})`),this.style.cssText=`\n       --local-bg-value: ${bgValueVariable};\n       --local-bg-mix: ${isColorChange||isGray?"100%":bgMix};\n       --local-border-radius: var(--wui-border-radius-${borderRadius});\n       --local-size: var(--wui-icon-box-size-${this.size});\n       --local-border: ${"wui-color-bg-125"===this.borderColor?"2px":"1px"} solid ${this.border?`var(--${this.borderColor})`:"transparent"}\n   `,lit.qy` <wui-icon color=${this.iconColor} size=${iconSize} name=${this.icon}></wui-icon> `}};WuiIconBox.styles=[ThemeUtil.W5,ThemeUtil.fD,styles],__decorate([(0,decorators.MZ)()],WuiIconBox.prototype,"size",void 0),__decorate([(0,decorators.MZ)()],WuiIconBox.prototype,"backgroundColor",void 0),__decorate([(0,decorators.MZ)()],WuiIconBox.prototype,"iconColor",void 0),__decorate([(0,decorators.MZ)()],WuiIconBox.prototype,"iconSize",void 0),__decorate([(0,decorators.MZ)()],WuiIconBox.prototype,"background",void 0),__decorate([(0,decorators.MZ)({type:Boolean})],WuiIconBox.prototype,"border",void 0),__decorate([(0,decorators.MZ)()],WuiIconBox.prototype,"borderColor",void 0),__decorate([(0,decorators.MZ)()],WuiIconBox.prototype,"icon",void 0),WuiIconBox=__decorate([(0,WebComponentsUtil.E)("wui-icon-box")],WuiIconBox)},"./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/composites/wui-tag/index.js":(__unused_webpack_module,__unused_webpack___webpack_exports__,__webpack_require__)=>{var lit=__webpack_require__("./node_modules/@reown/appkit-scaffold-ui/node_modules/lit/index.js"),decorators=__webpack_require__("./node_modules/@reown/appkit-scaffold-ui/node_modules/lit/decorators.js"),ThemeUtil=(__webpack_require__("./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/components/wui-text/index.js"),__webpack_require__("./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/utils/ThemeUtil.js")),WebComponentsUtil=__webpack_require__("./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/utils/WebComponentsUtil.js");const styles=lit.AH`
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
    `}};WuiTag.styles=[ThemeUtil.W5,styles],__decorate([(0,decorators.MZ)()],WuiTag.prototype,"variant",void 0),__decorate([(0,decorators.MZ)()],WuiTag.prototype,"size",void 0),WuiTag=__decorate([(0,WebComponentsUtil.E)("wui-tag")],WuiTag)},"./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/layout/wui-flex/index.js":(__unused_webpack_module,__unused_webpack___webpack_exports__,__webpack_require__)=>{var lit=__webpack_require__("./node_modules/@reown/appkit-scaffold-ui/node_modules/lit/index.js"),decorators=__webpack_require__("./node_modules/@reown/appkit-scaffold-ui/node_modules/lit/decorators.js"),ThemeUtil=__webpack_require__("./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/utils/ThemeUtil.js"),UiHelperUtil=__webpack_require__("./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/utils/UiHelperUtil.js"),WebComponentsUtil=__webpack_require__("./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/utils/WebComponentsUtil.js");const styles=lit.AH`
  :host {
    display: flex;
    width: inherit;
    height: inherit;
  }
`;var __decorate=function(decorators,target,key,desc){var d,c=arguments.length,r=c<3?target:null===desc?desc=Object.getOwnPropertyDescriptor(target,key):desc;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(decorators,target,key,desc);else for(var i=decorators.length-1;i>=0;i--)(d=decorators[i])&&(r=(c<3?d(r):c>3?d(target,key,r):d(target,key))||r);return c>3&&r&&Object.defineProperty(target,key,r),r};let WuiFlex=class WuiFlex extends lit.WF{render(){return this.style.cssText=`\n      flex-direction: ${this.flexDirection};\n      flex-wrap: ${this.flexWrap};\n      flex-basis: ${this.flexBasis};\n      flex-grow: ${this.flexGrow};\n      flex-shrink: ${this.flexShrink};\n      align-items: ${this.alignItems};\n      justify-content: ${this.justifyContent};\n      column-gap: ${this.columnGap&&`var(--wui-spacing-${this.columnGap})`};\n      row-gap: ${this.rowGap&&`var(--wui-spacing-${this.rowGap})`};\n      gap: ${this.gap&&`var(--wui-spacing-${this.gap})`};\n      padding-top: ${this.padding&&UiHelperUtil.Z.getSpacingStyles(this.padding,0)};\n      padding-right: ${this.padding&&UiHelperUtil.Z.getSpacingStyles(this.padding,1)};\n      padding-bottom: ${this.padding&&UiHelperUtil.Z.getSpacingStyles(this.padding,2)};\n      padding-left: ${this.padding&&UiHelperUtil.Z.getSpacingStyles(this.padding,3)};\n      margin-top: ${this.margin&&UiHelperUtil.Z.getSpacingStyles(this.margin,0)};\n      margin-right: ${this.margin&&UiHelperUtil.Z.getSpacingStyles(this.margin,1)};\n      margin-bottom: ${this.margin&&UiHelperUtil.Z.getSpacingStyles(this.margin,2)};\n      margin-left: ${this.margin&&UiHelperUtil.Z.getSpacingStyles(this.margin,3)};\n    `,lit.qy`<slot></slot>`}};WuiFlex.styles=[ThemeUtil.W5,styles],__decorate([(0,decorators.MZ)()],WuiFlex.prototype,"flexDirection",void 0),__decorate([(0,decorators.MZ)()],WuiFlex.prototype,"flexWrap",void 0),__decorate([(0,decorators.MZ)()],WuiFlex.prototype,"flexBasis",void 0),__decorate([(0,decorators.MZ)()],WuiFlex.prototype,"flexGrow",void 0),__decorate([(0,decorators.MZ)()],WuiFlex.prototype,"flexShrink",void 0),__decorate([(0,decorators.MZ)()],WuiFlex.prototype,"alignItems",void 0),__decorate([(0,decorators.MZ)()],WuiFlex.prototype,"justifyContent",void 0),__decorate([(0,decorators.MZ)()],WuiFlex.prototype,"columnGap",void 0),__decorate([(0,decorators.MZ)()],WuiFlex.prototype,"rowGap",void 0),__decorate([(0,decorators.MZ)()],WuiFlex.prototype,"gap",void 0),__decorate([(0,decorators.MZ)()],WuiFlex.prototype,"padding",void 0),__decorate([(0,decorators.MZ)()],WuiFlex.prototype,"margin",void 0),WuiFlex=__decorate([(0,WebComponentsUtil.E)("wui-flex")],WuiFlex)},"./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/utils/ThemeUtil.js":(__unused_webpack_module,__webpack_exports__,__webpack_require__)=>{__webpack_require__.d(__webpack_exports__,{RF:()=>initializeTheming,W5:()=>resetStyles,ck:()=>colorStyles,fD:()=>elementStyles});var lit__WEBPACK_IMPORTED_MODULE_0__=__webpack_require__("./node_modules/@reown/appkit-scaffold-ui/node_modules/lit/index.js"),_reown_appkit_common__WEBPACK_IMPORTED_MODULE_1__=__webpack_require__("./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-common/dist/esm/src/utils/ThemeUtil.js");let themeTag,darkModeTag,lightModeTag;function initializeTheming(themeVariables,themeMode){themeTag=document.createElement("style"),darkModeTag=document.createElement("style"),lightModeTag=document.createElement("style"),themeTag.textContent=createRootStyles(themeVariables).core.cssText,darkModeTag.textContent=createRootStyles(themeVariables).dark.cssText,lightModeTag.textContent=createRootStyles(themeVariables).light.cssText,document.head.appendChild(themeTag),document.head.appendChild(darkModeTag),document.head.appendChild(lightModeTag),function setColorTheme(themeMode){darkModeTag&&lightModeTag&&("light"===themeMode?(darkModeTag.removeAttribute("media"),lightModeTag.media="enabled"):(lightModeTag.removeAttribute("media"),darkModeTag.media="enabled"))}(themeMode)}function createRootStyles(themeVariables){return{core:lit__WEBPACK_IMPORTED_MODULE_0__.AH`
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
      @keyframes w3m-shake {
        0% {
          transform: scale(1) rotate(0deg);
        }
        20% {
          transform: scale(1) rotate(-1deg);
        }
        40% {
          transform: scale(1) rotate(1.5deg);
        }
        60% {
          transform: scale(1) rotate(-1.5deg);
        }
        80% {
          transform: scale(1) rotate(1deg);
        }
        100% {
          transform: scale(1) rotate(0deg);
        }
      }
      @keyframes w3m-iframe-fade-out {
        0% {
          opacity: 1;
        }
        100% {
          opacity: 0;
        }
      }
      @keyframes w3m-iframe-zoom-in {
        0% {
          transform: translateY(50px);
          opacity: 0;
        }
        100% {
          transform: translateY(0px);
          opacity: 1;
        }
      }
      @keyframes w3m-iframe-zoom-in-mobile {
        0% {
          transform: scale(0.95);
          opacity: 0;
        }
        100% {
          transform: scale(1);
          opacity: 1;
        }
      }
      :root {
        --w3m-modal-width: 360px;
        --w3m-color-mix-strength: ${(0,lit__WEBPACK_IMPORTED_MODULE_0__.iz)(themeVariables?.["--w3m-color-mix-strength"]?`${themeVariables["--w3m-color-mix-strength"]}%`:"0%")};
        --w3m-font-family: ${(0,lit__WEBPACK_IMPORTED_MODULE_0__.iz)(themeVariables?.["--w3m-font-family"]||"Inter, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue, sans-serif;")};
        --w3m-font-size-master: ${(0,lit__WEBPACK_IMPORTED_MODULE_0__.iz)(themeVariables?.["--w3m-font-size-master"]||"10px")};
        --w3m-border-radius-master: ${(0,lit__WEBPACK_IMPORTED_MODULE_0__.iz)(themeVariables?.["--w3m-border-radius-master"]||"4px")};
        --w3m-z-index: ${(0,lit__WEBPACK_IMPORTED_MODULE_0__.iz)(themeVariables?.["--w3m-z-index"]||999)};

        --wui-font-family: var(--w3m-font-family);

        --wui-font-size-mini: calc(var(--w3m-font-size-master) * 0.8);
        --wui-font-size-micro: var(--w3m-font-size-master);
        --wui-font-size-tiny: calc(var(--w3m-font-size-master) * 1.2);
        --wui-font-size-small: calc(var(--w3m-font-size-master) * 1.4);
        --wui-font-size-paragraph: calc(var(--w3m-font-size-master) * 1.6);
        --wui-font-size-medium: calc(var(--w3m-font-size-master) * 1.8);
        --wui-font-size-large: calc(var(--w3m-font-size-master) * 2);
        --wui-font-size-title-6: calc(var(--w3m-font-size-master) * 2.2);
        --wui-font-size-medium-title: calc(var(--w3m-font-size-master) * 2.4);
        --wui-font-size-2xl: calc(var(--w3m-font-size-master) * 4);

        --wui-border-radius-5xs: var(--w3m-border-radius-master);
        --wui-border-radius-4xs: calc(var(--w3m-border-radius-master) * 1.5);
        --wui-border-radius-3xs: calc(var(--w3m-border-radius-master) * 2);
        --wui-border-radius-xxs: calc(var(--w3m-border-radius-master) * 3);
        --wui-border-radius-xs: calc(var(--w3m-border-radius-master) * 4);
        --wui-border-radius-s: calc(var(--w3m-border-radius-master) * 5);
        --wui-border-radius-m: calc(var(--w3m-border-radius-master) * 7);
        --wui-border-radius-l: calc(var(--w3m-border-radius-master) * 9);
        --wui-border-radius-3xl: calc(var(--w3m-border-radius-master) * 20);

        --wui-font-weight-light: 400;
        --wui-font-weight-regular: 500;
        --wui-font-weight-medium: 600;
        --wui-font-weight-bold: 700;

        --wui-letter-spacing-2xl: -1.6px;
        --wui-letter-spacing-medium-title: -0.96px;
        --wui-letter-spacing-title-6: -0.88px;
        --wui-letter-spacing-large: -0.8px;
        --wui-letter-spacing-medium: -0.72px;
        --wui-letter-spacing-paragraph: -0.64px;
        --wui-letter-spacing-small: -0.56px;
        --wui-letter-spacing-tiny: -0.48px;
        --wui-letter-spacing-micro: -0.2px;
        --wui-letter-spacing-mini: -0.16px;

        --wui-spacing-0: 0px;
        --wui-spacing-4xs: 2px;
        --wui-spacing-3xs: 4px;
        --wui-spacing-xxs: 6px;
        --wui-spacing-2xs: 7px;
        --wui-spacing-xs: 8px;
        --wui-spacing-1xs: 10px;
        --wui-spacing-s: 12px;
        --wui-spacing-m: 14px;
        --wui-spacing-l: 16px;
        --wui-spacing-2l: 18px;
        --wui-spacing-xl: 20px;
        --wui-spacing-xxl: 24px;
        --wui-spacing-2xl: 32px;
        --wui-spacing-3xl: 40px;
        --wui-spacing-4xl: 90px;
        --wui-spacing-5xl: 95px;

        --wui-icon-box-size-xxs: 14px;
        --wui-icon-box-size-xs: 20px;
        --wui-icon-box-size-sm: 24px;
        --wui-icon-box-size-md: 32px;
        --wui-icon-box-size-mdl: 36px;
        --wui-icon-box-size-lg: 40px;
        --wui-icon-box-size-2lg: 48px;
        --wui-icon-box-size-xl: 64px;

        --wui-icon-size-inherit: inherit;
        --wui-icon-size-xxs: 10px;
        --wui-icon-size-xs: 12px;
        --wui-icon-size-sm: 14px;
        --wui-icon-size-md: 16px;
        --wui-icon-size-mdl: 18px;
        --wui-icon-size-lg: 20px;
        --wui-icon-size-xl: 24px;
        --wui-icon-size-xxl: 28px;

        --wui-wallet-image-size-inherit: inherit;
        --wui-wallet-image-size-sm: 40px;
        --wui-wallet-image-size-md: 56px;
        --wui-wallet-image-size-lg: 80px;

        --wui-visual-size-size-inherit: inherit;
        --wui-visual-size-sm: 40px;
        --wui-visual-size-md: 55px;
        --wui-visual-size-lg: 80px;

        --wui-box-size-md: 100px;
        --wui-box-size-lg: 120px;

        --wui-ease-out-power-2: cubic-bezier(0, 0, 0.22, 1);
        --wui-ease-out-power-1: cubic-bezier(0, 0, 0.55, 1);

        --wui-ease-in-power-3: cubic-bezier(0.66, 0, 1, 1);
        --wui-ease-in-power-2: cubic-bezier(0.45, 0, 1, 1);
        --wui-ease-in-power-1: cubic-bezier(0.3, 0, 1, 1);

        --wui-ease-inout-power-1: cubic-bezier(0.45, 0, 0.55, 1);

        --wui-duration-lg: 200ms;
        --wui-duration-md: 125ms;
        --wui-duration-sm: 75ms;

        --wui-path-network-sm: path(
          'M15.4 2.1a5.21 5.21 0 0 1 5.2 0l11.61 6.7a5.21 5.21 0 0 1 2.61 4.52v13.4c0 1.87-1 3.59-2.6 4.52l-11.61 6.7c-1.62.93-3.6.93-5.22 0l-11.6-6.7a5.21 5.21 0 0 1-2.61-4.51v-13.4c0-1.87 1-3.6 2.6-4.52L15.4 2.1Z'
        );

        --wui-path-network-md: path(
          'M43.4605 10.7248L28.0485 1.61089C25.5438 0.129705 22.4562 0.129705 19.9515 1.61088L4.53951 10.7248C2.03626 12.2051 0.5 14.9365 0.5 17.886V36.1139C0.5 39.0635 2.03626 41.7949 4.53951 43.2752L19.9515 52.3891C22.4562 53.8703 25.5438 53.8703 28.0485 52.3891L43.4605 43.2752C45.9637 41.7949 47.5 39.0635 47.5 36.114V17.8861C47.5 14.9365 45.9637 12.2051 43.4605 10.7248Z'
        );

        --wui-path-network-lg: path(
          'M78.3244 18.926L50.1808 2.45078C45.7376 -0.150261 40.2624 -0.150262 35.8192 2.45078L7.6756 18.926C3.23322 21.5266 0.5 26.3301 0.5 31.5248V64.4752C0.5 69.6699 3.23322 74.4734 7.6756 77.074L35.8192 93.5492C40.2624 96.1503 45.7376 96.1503 50.1808 93.5492L78.3244 77.074C82.7668 74.4734 85.5 69.6699 85.5 64.4752V31.5248C85.5 26.3301 82.7668 21.5266 78.3244 18.926Z'
        );

        --wui-width-network-sm: 36px;
        --wui-width-network-md: 48px;
        --wui-width-network-lg: 86px;

        --wui-height-network-sm: 40px;
        --wui-height-network-md: 54px;
        --wui-height-network-lg: 96px;

        --wui-icon-size-network-xs: 12px;
        --wui-icon-size-network-sm: 16px;
        --wui-icon-size-network-md: 24px;
        --wui-icon-size-network-lg: 42px;

        --wui-color-inherit: inherit;

        --wui-color-inverse-100: #fff;
        --wui-color-inverse-000: #000;

        --wui-cover: rgba(20, 20, 20, 0.8);

        --wui-color-modal-bg: var(--wui-color-modal-bg-base);

        --wui-color-accent-100: var(--wui-color-accent-base-100);
        --wui-color-accent-090: var(--wui-color-accent-base-090);
        --wui-color-accent-080: var(--wui-color-accent-base-080);

        --wui-color-success-100: var(--wui-color-success-base-100);
        --wui-color-success-125: var(--wui-color-success-base-125);

        --wui-color-warning-100: var(--wui-color-warning-base-100);

        --wui-color-error-100: var(--wui-color-error-base-100);
        --wui-color-error-125: var(--wui-color-error-base-125);

        --wui-color-blue-100: var(--wui-color-blue-base-100);
        --wui-color-blue-90: var(--wui-color-blue-base-90);

        --wui-icon-box-bg-error-100: var(--wui-icon-box-bg-error-base-100);
        --wui-icon-box-bg-blue-100: var(--wui-icon-box-bg-blue-base-100);
        --wui-icon-box-bg-success-100: var(--wui-icon-box-bg-success-base-100);
        --wui-icon-box-bg-inverse-100: var(--wui-icon-box-bg-inverse-base-100);

        --wui-all-wallets-bg-100: var(--wui-all-wallets-bg-100);

        --wui-avatar-border: var(--wui-avatar-border-base);

        --wui-thumbnail-border: var(--wui-thumbnail-border-base);

        --wui-wallet-button-bg: var(--wui-wallet-button-bg-base);

        --wui-box-shadow-blue: var(--wui-color-accent-glass-020);
      }

      @supports (background: color-mix(in srgb, white 50%, black)) {
        :root {
          --wui-color-modal-bg: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-color-modal-bg-base)
          );

          --wui-box-shadow-blue: color-mix(in srgb, var(--wui-color-accent-100) 20%, transparent);

          --wui-color-accent-100: color-mix(
            in srgb,
            var(--wui-color-accent-base-100) 100%,
            transparent
          );
          --wui-color-accent-090: color-mix(
            in srgb,
            var(--wui-color-accent-base-100) 90%,
            transparent
          );
          --wui-color-accent-080: color-mix(
            in srgb,
            var(--wui-color-accent-base-100) 80%,
            transparent
          );
          --wui-color-accent-glass-090: color-mix(
            in srgb,
            var(--wui-color-accent-base-100) 90%,
            transparent
          );
          --wui-color-accent-glass-080: color-mix(
            in srgb,
            var(--wui-color-accent-base-100) 80%,
            transparent
          );
          --wui-color-accent-glass-020: color-mix(
            in srgb,
            var(--wui-color-accent-base-100) 20%,
            transparent
          );
          --wui-color-accent-glass-015: color-mix(
            in srgb,
            var(--wui-color-accent-base-100) 15%,
            transparent
          );
          --wui-color-accent-glass-010: color-mix(
            in srgb,
            var(--wui-color-accent-base-100) 10%,
            transparent
          );
          --wui-color-accent-glass-005: color-mix(
            in srgb,
            var(--wui-color-accent-base-100) 5%,
            transparent
          );
          --wui-color-accent-002: color-mix(
            in srgb,
            var(--wui-color-accent-base-100) 2%,
            transparent
          );

          --wui-color-fg-100: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-color-fg-100)
          );
          --wui-color-fg-125: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-color-fg-125)
          );
          --wui-color-fg-150: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-color-fg-150)
          );
          --wui-color-fg-175: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-color-fg-175)
          );
          --wui-color-fg-200: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-color-fg-200)
          );
          --wui-color-fg-225: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-color-fg-225)
          );
          --wui-color-fg-250: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-color-fg-250)
          );
          --wui-color-fg-275: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-color-fg-275)
          );
          --wui-color-fg-300: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-color-fg-300)
          );
          --wui-color-fg-325: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-color-fg-325)
          );
          --wui-color-fg-350: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-color-fg-350)
          );

          --wui-color-bg-100: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-color-bg-100)
          );
          --wui-color-bg-125: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-color-bg-125)
          );
          --wui-color-bg-150: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-color-bg-150)
          );
          --wui-color-bg-175: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-color-bg-175)
          );
          --wui-color-bg-200: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-color-bg-200)
          );
          --wui-color-bg-225: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-color-bg-225)
          );
          --wui-color-bg-250: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-color-bg-250)
          );
          --wui-color-bg-275: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-color-bg-275)
          );
          --wui-color-bg-300: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-color-bg-300)
          );
          --wui-color-bg-325: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-color-bg-325)
          );
          --wui-color-bg-350: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-color-bg-350)
          );

          --wui-color-success-100: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-color-success-base-100)
          );
          --wui-color-success-125: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-color-success-base-125)
          );

          --wui-color-warning-100: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-color-warning-base-100)
          );

          --wui-color-error-100: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-color-error-base-100)
          );
          --wui-color-blue-100: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-color-blue-base-100)
          );
          --wui-color-blue-90: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-color-blue-base-90)
          );
          --wui-color-error-125: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-color-error-base-125)
          );

          --wui-icon-box-bg-error-100: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-icon-box-bg-error-base-100)
          );
          --wui-icon-box-bg-accent-100: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-icon-box-bg-blue-base-100)
          );
          --wui-icon-box-bg-success-100: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-icon-box-bg-success-base-100)
          );
          --wui-icon-box-bg-inverse-100: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-icon-box-bg-inverse-base-100)
          );

          --wui-all-wallets-bg-100: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-all-wallets-bg-100)
          );

          --wui-avatar-border: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-avatar-border-base)
          );

          --wui-thumbnail-border: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-thumbnail-border-base)
          );

          --wui-wallet-button-bg: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-wallet-button-bg-base)
          );
        }
      }
    `,light:lit__WEBPACK_IMPORTED_MODULE_0__.AH`
      :root {
        --w3m-color-mix: ${(0,lit__WEBPACK_IMPORTED_MODULE_0__.iz)(themeVariables?.["--w3m-color-mix"]||"#fff")};
        --w3m-accent: ${(0,lit__WEBPACK_IMPORTED_MODULE_0__.iz)((0,_reown_appkit_common__WEBPACK_IMPORTED_MODULE_1__.o)(themeVariables,"dark")["--w3m-accent"])};
        --w3m-default: #fff;

        --wui-color-modal-bg-base: ${(0,lit__WEBPACK_IMPORTED_MODULE_0__.iz)((0,_reown_appkit_common__WEBPACK_IMPORTED_MODULE_1__.o)(themeVariables,"dark")["--w3m-background"])};
        --wui-color-accent-base-100: var(--w3m-accent);

        --wui-color-blueberry-100: hsla(230, 100%, 67%, 1);
        --wui-color-blueberry-090: hsla(231, 76%, 61%, 1);
        --wui-color-blueberry-080: hsla(230, 59%, 55%, 1);
        --wui-color-blueberry-050: hsla(231, 100%, 70%, 0.1);

        --wui-color-fg-100: #e4e7e7;
        --wui-color-fg-125: #d0d5d5;
        --wui-color-fg-150: #a8b1b1;
        --wui-color-fg-175: #a8b0b0;
        --wui-color-fg-200: #949e9e;
        --wui-color-fg-225: #868f8f;
        --wui-color-fg-250: #788080;
        --wui-color-fg-275: #788181;
        --wui-color-fg-300: #6e7777;
        --wui-color-fg-325: #9a9a9a;
        --wui-color-fg-350: #363636;

        --wui-color-bg-100: #141414;
        --wui-color-bg-125: #191a1a;
        --wui-color-bg-150: #1e1f1f;
        --wui-color-bg-175: #222525;
        --wui-color-bg-200: #272a2a;
        --wui-color-bg-225: #2c3030;
        --wui-color-bg-250: #313535;
        --wui-color-bg-275: #363b3b;
        --wui-color-bg-300: #3b4040;
        --wui-color-bg-325: #252525;
        --wui-color-bg-350: #ffffff;

        --wui-color-success-base-100: #26d962;
        --wui-color-success-base-125: #30a46b;

        --wui-color-warning-base-100: #f3a13f;

        --wui-color-error-base-100: #f25a67;
        --wui-color-error-base-125: #df4a34;

        --wui-color-blue-base-100: rgba(102, 125, 255, 1);
        --wui-color-blue-base-90: rgba(102, 125, 255, 0.9);

        --wui-color-success-glass-001: rgba(38, 217, 98, 0.01);
        --wui-color-success-glass-002: rgba(38, 217, 98, 0.02);
        --wui-color-success-glass-005: rgba(38, 217, 98, 0.05);
        --wui-color-success-glass-010: rgba(38, 217, 98, 0.1);
        --wui-color-success-glass-015: rgba(38, 217, 98, 0.15);
        --wui-color-success-glass-020: rgba(38, 217, 98, 0.2);
        --wui-color-success-glass-025: rgba(38, 217, 98, 0.25);
        --wui-color-success-glass-030: rgba(38, 217, 98, 0.3);
        --wui-color-success-glass-060: rgba(38, 217, 98, 0.6);
        --wui-color-success-glass-080: rgba(38, 217, 98, 0.8);

        --wui-color-success-glass-reown-020: rgba(48, 164, 107, 0.2);

        --wui-color-warning-glass-reown-020: rgba(243, 161, 63, 0.2);

        --wui-color-error-glass-001: rgba(242, 90, 103, 0.01);
        --wui-color-error-glass-002: rgba(242, 90, 103, 0.02);
        --wui-color-error-glass-005: rgba(242, 90, 103, 0.05);
        --wui-color-error-glass-010: rgba(242, 90, 103, 0.1);
        --wui-color-error-glass-015: rgba(242, 90, 103, 0.15);
        --wui-color-error-glass-020: rgba(242, 90, 103, 0.2);
        --wui-color-error-glass-025: rgba(242, 90, 103, 0.25);
        --wui-color-error-glass-030: rgba(242, 90, 103, 0.3);
        --wui-color-error-glass-060: rgba(242, 90, 103, 0.6);
        --wui-color-error-glass-080: rgba(242, 90, 103, 0.8);

        --wui-color-error-glass-reown-020: rgba(223, 74, 52, 0.2);

        --wui-color-gray-glass-001: rgba(255, 255, 255, 0.01);
        --wui-color-gray-glass-002: rgba(255, 255, 255, 0.02);
        --wui-color-gray-glass-005: rgba(255, 255, 255, 0.05);
        --wui-color-gray-glass-010: rgba(255, 255, 255, 0.1);
        --wui-color-gray-glass-015: rgba(255, 255, 255, 0.15);
        --wui-color-gray-glass-020: rgba(255, 255, 255, 0.2);
        --wui-color-gray-glass-025: rgba(255, 255, 255, 0.25);
        --wui-color-gray-glass-030: rgba(255, 255, 255, 0.3);
        --wui-color-gray-glass-060: rgba(255, 255, 255, 0.6);
        --wui-color-gray-glass-080: rgba(255, 255, 255, 0.8);
        --wui-color-gray-glass-090: rgba(255, 255, 255, 0.9);

        --wui-color-dark-glass-100: rgba(42, 42, 42, 1);

        --wui-icon-box-bg-error-base-100: #3c2426;
        --wui-icon-box-bg-blue-base-100: #20303f;
        --wui-icon-box-bg-success-base-100: #1f3a28;
        --wui-icon-box-bg-inverse-base-100: #243240;

        --wui-all-wallets-bg-100: #222b35;

        --wui-avatar-border-base: #252525;

        --wui-thumbnail-border-base: #252525;

        --wui-wallet-button-bg-base: var(--wui-color-bg-125);

        --w3m-card-embedded-shadow-color: rgb(17 17 18 / 25%);
      }
    `,dark:lit__WEBPACK_IMPORTED_MODULE_0__.AH`
      :root {
        --w3m-color-mix: ${(0,lit__WEBPACK_IMPORTED_MODULE_0__.iz)(themeVariables?.["--w3m-color-mix"]||"#000")};
        --w3m-accent: ${(0,lit__WEBPACK_IMPORTED_MODULE_0__.iz)((0,_reown_appkit_common__WEBPACK_IMPORTED_MODULE_1__.o)(themeVariables,"light")["--w3m-accent"])};
        --w3m-default: #000;

        --wui-color-modal-bg-base: ${(0,lit__WEBPACK_IMPORTED_MODULE_0__.iz)((0,_reown_appkit_common__WEBPACK_IMPORTED_MODULE_1__.o)(themeVariables,"light")["--w3m-background"])};
        --wui-color-accent-base-100: var(--w3m-accent);

        --wui-color-blueberry-100: hsla(231, 100%, 70%, 1);
        --wui-color-blueberry-090: hsla(231, 97%, 72%, 1);
        --wui-color-blueberry-080: hsla(231, 92%, 74%, 1);

        --wui-color-fg-100: #141414;
        --wui-color-fg-125: #2d3131;
        --wui-color-fg-150: #474d4d;
        --wui-color-fg-175: #636d6d;
        --wui-color-fg-200: #798686;
        --wui-color-fg-225: #828f8f;
        --wui-color-fg-250: #8b9797;
        --wui-color-fg-275: #95a0a0;
        --wui-color-fg-300: #9ea9a9;
        --wui-color-fg-325: #9a9a9a;
        --wui-color-fg-350: #d0d0d0;

        --wui-color-bg-100: #ffffff;
        --wui-color-bg-125: #f5fafa;
        --wui-color-bg-150: #f3f8f8;
        --wui-color-bg-175: #eef4f4;
        --wui-color-bg-200: #eaf1f1;
        --wui-color-bg-225: #e5eded;
        --wui-color-bg-250: #e1e9e9;
        --wui-color-bg-275: #dce7e7;
        --wui-color-bg-300: #d8e3e3;
        --wui-color-bg-325: #f3f3f3;
        --wui-color-bg-350: #202020;

        --wui-color-success-base-100: #26b562;
        --wui-color-success-base-125: #30a46b;

        --wui-color-warning-base-100: #f3a13f;

        --wui-color-error-base-100: #f05142;
        --wui-color-error-base-125: #df4a34;

        --wui-color-blue-base-100: rgba(102, 125, 255, 1);
        --wui-color-blue-base-90: rgba(102, 125, 255, 0.9);

        --wui-color-success-glass-001: rgba(38, 181, 98, 0.01);
        --wui-color-success-glass-002: rgba(38, 181, 98, 0.02);
        --wui-color-success-glass-005: rgba(38, 181, 98, 0.05);
        --wui-color-success-glass-010: rgba(38, 181, 98, 0.1);
        --wui-color-success-glass-015: rgba(38, 181, 98, 0.15);
        --wui-color-success-glass-020: rgba(38, 181, 98, 0.2);
        --wui-color-success-glass-025: rgba(38, 181, 98, 0.25);
        --wui-color-success-glass-030: rgba(38, 181, 98, 0.3);
        --wui-color-success-glass-060: rgba(38, 181, 98, 0.6);
        --wui-color-success-glass-080: rgba(38, 181, 98, 0.8);

        --wui-color-success-glass-reown-020: rgba(48, 164, 107, 0.2);

        --wui-color-warning-glass-reown-020: rgba(243, 161, 63, 0.2);

        --wui-color-error-glass-001: rgba(240, 81, 66, 0.01);
        --wui-color-error-glass-002: rgba(240, 81, 66, 0.02);
        --wui-color-error-glass-005: rgba(240, 81, 66, 0.05);
        --wui-color-error-glass-010: rgba(240, 81, 66, 0.1);
        --wui-color-error-glass-015: rgba(240, 81, 66, 0.15);
        --wui-color-error-glass-020: rgba(240, 81, 66, 0.2);
        --wui-color-error-glass-025: rgba(240, 81, 66, 0.25);
        --wui-color-error-glass-030: rgba(240, 81, 66, 0.3);
        --wui-color-error-glass-060: rgba(240, 81, 66, 0.6);
        --wui-color-error-glass-080: rgba(240, 81, 66, 0.8);

        --wui-color-error-glass-reown-020: rgba(223, 74, 52, 0.2);

        --wui-icon-box-bg-error-base-100: #f4dfdd;
        --wui-icon-box-bg-blue-base-100: #d9ecfb;
        --wui-icon-box-bg-success-base-100: #daf0e4;
        --wui-icon-box-bg-inverse-base-100: #dcecfc;

        --wui-all-wallets-bg-100: #e8f1fa;

        --wui-avatar-border-base: #f3f4f4;

        --wui-thumbnail-border-base: #eaefef;

        --wui-wallet-button-bg-base: var(--wui-color-bg-125);

        --wui-color-gray-glass-001: rgba(0, 0, 0, 0.01);
        --wui-color-gray-glass-002: rgba(0, 0, 0, 0.02);
        --wui-color-gray-glass-005: rgba(0, 0, 0, 0.05);
        --wui-color-gray-glass-010: rgba(0, 0, 0, 0.1);
        --wui-color-gray-glass-015: rgba(0, 0, 0, 0.15);
        --wui-color-gray-glass-020: rgba(0, 0, 0, 0.2);
        --wui-color-gray-glass-025: rgba(0, 0, 0, 0.25);
        --wui-color-gray-glass-030: rgba(0, 0, 0, 0.3);
        --wui-color-gray-glass-060: rgba(0, 0, 0, 0.6);
        --wui-color-gray-glass-080: rgba(0, 0, 0, 0.8);
        --wui-color-gray-glass-090: rgba(0, 0, 0, 0.9);

        --wui-color-dark-glass-100: rgba(233, 233, 233, 1);

        --w3m-card-embedded-shadow-color: rgb(224 225 233 / 25%);
      }
    `}}const resetStyles=lit__WEBPACK_IMPORTED_MODULE_0__.AH`
  *,
  *::after,
  *::before,
  :host {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    font-style: normal;
    text-rendering: optimizeSpeed;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    -webkit-tap-highlight-color: transparent;
    font-family: var(--wui-font-family);
    backface-visibility: hidden;
  }
`,elementStyles=lit__WEBPACK_IMPORTED_MODULE_0__.AH`
  button,
  a {
    cursor: pointer;
    display: flex;
    justify-content: center;
    align-items: center;
    position: relative;
    transition:
      color var(--wui-duration-lg) var(--wui-ease-out-power-1),
      background-color var(--wui-duration-lg) var(--wui-ease-out-power-1),
      border var(--wui-duration-lg) var(--wui-ease-out-power-1),
      border-radius var(--wui-duration-lg) var(--wui-ease-out-power-1),
      box-shadow var(--wui-duration-lg) var(--wui-ease-out-power-1);
    will-change: background-color, color, border, box-shadow, border-radius;
    outline: none;
    border: none;
    column-gap: var(--wui-spacing-3xs);
    background-color: transparent;
    text-decoration: none;
  }

  wui-flex {
    transition: border-radius var(--wui-duration-lg) var(--wui-ease-out-power-1);
    will-change: border-radius;
  }

  button:disabled > wui-wallet-image,
  button:disabled > wui-all-wallets-image,
  button:disabled > wui-network-image,
  button:disabled > wui-image,
  button:disabled > wui-transaction-visual,
  button:disabled > wui-logo {
    filter: grayscale(1);
  }

  @media (hover: hover) and (pointer: fine) {
    button:hover:enabled {
      background-color: var(--wui-color-gray-glass-005);
    }

    button:active:enabled {
      background-color: var(--wui-color-gray-glass-010);
    }
  }

  button:disabled > wui-icon-box {
    opacity: 0.5;
  }

  input {
    border: none;
    outline: none;
    appearance: none;
  }
`,colorStyles=lit__WEBPACK_IMPORTED_MODULE_0__.AH`
  .wui-color-inherit {
    color: var(--wui-color-inherit);
  }

  .wui-color-accent-100 {
    color: var(--wui-color-accent-100);
  }

  .wui-color-error-100 {
    color: var(--wui-color-error-100);
  }

  .wui-color-blue-100 {
    color: var(--wui-color-blue-100);
  }

  .wui-color-blue-90 {
    color: var(--wui-color-blue-90);
  }

  .wui-color-error-125 {
    color: var(--wui-color-error-125);
  }

  .wui-color-success-100 {
    color: var(--wui-color-success-100);
  }

  .wui-color-success-125 {
    color: var(--wui-color-success-125);
  }

  .wui-color-inverse-100 {
    color: var(--wui-color-inverse-100);
  }

  .wui-color-inverse-000 {
    color: var(--wui-color-inverse-000);
  }

  .wui-color-fg-100 {
    color: var(--wui-color-fg-100);
  }

  .wui-color-fg-200 {
    color: var(--wui-color-fg-200);
  }

  .wui-color-fg-300 {
    color: var(--wui-color-fg-300);
  }

  .wui-color-fg-325 {
    color: var(--wui-color-fg-325);
  }

  .wui-color-fg-350 {
    color: var(--wui-color-fg-350);
  }

  .wui-bg-color-inherit {
    background-color: var(--wui-color-inherit);
  }

  .wui-bg-color-blue-100 {
    background-color: var(--wui-color-accent-100);
  }

  .wui-bg-color-error-100 {
    background-color: var(--wui-color-error-100);
  }

  .wui-bg-color-error-125 {
    background-color: var(--wui-color-error-125);
  }

  .wui-bg-color-success-100 {
    background-color: var(--wui-color-success-100);
  }

  .wui-bg-color-success-125 {
    background-color: var(--wui-color-success-100);
  }

  .wui-bg-color-inverse-100 {
    background-color: var(--wui-color-inverse-100);
  }

  .wui-bg-color-inverse-000 {
    background-color: var(--wui-color-inverse-000);
  }

  .wui-bg-color-fg-100 {
    background-color: var(--wui-color-fg-100);
  }

  .wui-bg-color-fg-200 {
    background-color: var(--wui-color-fg-200);
  }

  .wui-bg-color-fg-300 {
    background-color: var(--wui-color-fg-300);
  }

  .wui-color-fg-325 {
    background-color: var(--wui-color-fg-325);
  }

  .wui-color-fg-350 {
    background-color: var(--wui-color-fg-350);
  }
`},"./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/utils/UiHelperUtil.js":(__unused_webpack_module,__webpack_exports__,__webpack_require__)=>{__webpack_require__.d(__webpack_exports__,{Z:()=>UiHelperUtil});const UiHelperUtil={getSpacingStyles:(spacing,index)=>Array.isArray(spacing)?spacing[index]?`var(--wui-spacing-${spacing[index]})`:void 0:"string"==typeof spacing?`var(--wui-spacing-${spacing})`:void 0,getFormattedDate:date=>new Intl.DateTimeFormat("en-US",{month:"short",day:"numeric"}).format(date),getHostName(url){try{return new URL(url).hostname}catch(error){return""}},getTruncateString:({string,charsStart,charsEnd,truncate})=>string.length<=charsStart+charsEnd?string:"end"===truncate?`${string.substring(0,charsStart)}...`:"start"===truncate?`...${string.substring(string.length-charsEnd)}`:`${string.substring(0,Math.floor(charsStart))}...${string.substring(string.length-Math.floor(charsEnd))}`,generateAvatarColors(address){const baseColor=address.toLowerCase().replace(/^0x/iu,"").replace(/[^a-f0-9]/gu,"").substring(0,6).padEnd(6,"0"),rgbColor=this.hexToRgb(baseColor),masterBorderRadius=getComputedStyle(document.documentElement).getPropertyValue("--w3m-border-radius-master"),edge=100-3*Number(masterBorderRadius?.replace("px","")),gradientCircle=`${edge}% ${edge}% at 65% 40%`,colors=[];for(let i=0;i<5;i+=1){const tintedColor=this.tintColor(rgbColor,.15*i);colors.push(`rgb(${tintedColor[0]}, ${tintedColor[1]}, ${tintedColor[2]})`)}return`\n    --local-color-1: ${colors[0]};\n    --local-color-2: ${colors[1]};\n    --local-color-3: ${colors[2]};\n    --local-color-4: ${colors[3]};\n    --local-color-5: ${colors[4]};\n    --local-radial-circle: ${gradientCircle}\n   `},hexToRgb(hex){const bigint=parseInt(hex,16);return[bigint>>16&255,bigint>>8&255,255&bigint]},tintColor(rgb,tint){const[r,g,b]=rgb;return[Math.round(r+(255-r)*tint),Math.round(g+(255-g)*tint),Math.round(b+(255-b)*tint)]},isNumber:character=>/^[0-9]+$/u.test(character),getColorTheme:theme=>theme||("undefined"!=typeof window&&window.matchMedia?window.matchMedia("(prefers-color-scheme: dark)")?.matches?"dark":"light":"dark"),splitBalance(input){const parts=input.split(".");return 2===parts.length?[parts[0],parts[1]]:["0","00"]},roundNumber:(number,threshold,fixed)=>number.toString().length>=threshold?Number(number).toFixed(fixed):number,formatNumberToLocalString:(value,decimals=2)=>void 0===value?"0.00":"number"==typeof value?value.toLocaleString("en-US",{maximumFractionDigits:decimals,minimumFractionDigits:decimals}):parseFloat(value).toLocaleString("en-US",{maximumFractionDigits:decimals,minimumFractionDigits:decimals})}},"./node_modules/@reown/appkit-scaffold-ui/node_modules/@reown/appkit-ui/dist/esm/src/utils/WebComponentsUtil.js":(__unused_webpack_module,__webpack_exports__,__webpack_require__)=>{function customElement(tagName){return function create(classOrDescriptor){return"function"==typeof classOrDescriptor?function legacyCustomElement(tagName,clazz){return customElements.get(tagName)||customElements.define(tagName,clazz),clazz}(tagName,classOrDescriptor):function standardCustomElement(tagName,descriptor){const{kind,elements}=descriptor;return{kind,elements,finisher(clazz){customElements.get(tagName)||customElements.define(tagName,clazz)}}}(tagName,classOrDescriptor)}}__webpack_require__.d(__webpack_exports__,{E:()=>customElement})},"./node_modules/@reown/appkit-scaffold-ui/node_modules/lit/decorators.js":(__unused_webpack_module,__webpack_exports__,__webpack_require__)=>{__webpack_require__.d(__webpack_exports__,{MZ:()=>_lit_reactive_element_decorators_property_js__WEBPACK_IMPORTED_MODULE_0__.M,wk:()=>_lit_reactive_element_decorators_state_js__WEBPACK_IMPORTED_MODULE_1__.w});var _lit_reactive_element_decorators_property_js__WEBPACK_IMPORTED_MODULE_0__=__webpack_require__("./node_modules/@lit/reactive-element/decorators/property.js"),_lit_reactive_element_decorators_state_js__WEBPACK_IMPORTED_MODULE_1__=__webpack_require__("./node_modules/@lit/reactive-element/decorators/state.js")},"./node_modules/@reown/appkit-scaffold-ui/node_modules/lit/directives/class-map.js":(__unused_webpack_module,__webpack_exports__,__webpack_require__)=>{__webpack_require__.d(__webpack_exports__,{H:()=>lit_html_directives_class_map_js__WEBPACK_IMPORTED_MODULE_0__.H});var lit_html_directives_class_map_js__WEBPACK_IMPORTED_MODULE_0__=__webpack_require__("./node_modules/lit-html/directives/class-map.js")},"./node_modules/@reown/appkit-scaffold-ui/node_modules/lit/directives/if-defined.js":(__unused_webpack_module,__webpack_exports__,__webpack_require__)=>{__webpack_require__.d(__webpack_exports__,{J:()=>lit_html_directives_if_defined_js__WEBPACK_IMPORTED_MODULE_0__.J});var lit_html_directives_if_defined_js__WEBPACK_IMPORTED_MODULE_0__=__webpack_require__("./node_modules/lit-html/directives/if-defined.js")},"./node_modules/@reown/appkit-scaffold-ui/node_modules/lit/index.js":(__unused_webpack_module,__webpack_exports__,__webpack_require__)=>{__webpack_require__.d(__webpack_exports__,{AH:()=>lit_element_lit_element_js__WEBPACK_IMPORTED_MODULE_2__.AH,JW:()=>lit_element_lit_element_js__WEBPACK_IMPORTED_MODULE_2__.JW,WF:()=>lit_element_lit_element_js__WEBPACK_IMPORTED_MODULE_2__.WF,iz:()=>lit_element_lit_element_js__WEBPACK_IMPORTED_MODULE_2__.iz,qy:()=>lit_element_lit_element_js__WEBPACK_IMPORTED_MODULE_2__.qy});__webpack_require__("./node_modules/@lit/reactive-element/reactive-element.js"),__webpack_require__("./node_modules/lit-html/lit-html.js");var lit_element_lit_element_js__WEBPACK_IMPORTED_MODULE_2__=__webpack_require__("./node_modules/lit-element/lit-element.js")},"./node_modules/lit-html/async-directive.js":(__unused_webpack_module,__webpack_exports__,__webpack_require__)=>{__webpack_require__.d(__webpack_exports__,{Kq:()=>f});var _directive_helpers_js__WEBPACK_IMPORTED_MODULE_0__=__webpack_require__("./node_modules/lit-html/directive-helpers.js"),_directive_js__WEBPACK_IMPORTED_MODULE_1__=__webpack_require__("./node_modules/lit-html/directive.js");const s=(i,t)=>{const e=i._$AN;if(void 0===e)return!1;for(const i of e)i._$AO?.(t,!1),s(i,t);return!0},o=i=>{let t,e;do{if(void 0===(t=i._$AM))break;e=t._$AN,e.delete(i),i=t}while(0===e?.size)},r=i=>{for(let t;t=i._$AM;i=t){let e=t._$AN;if(void 0===e)t._$AN=e=new Set;else if(e.has(i))break;e.add(i),c(t)}};function h(i){void 0!==this._$AN?(o(this),this._$AM=i,r(this)):this._$AM=i}function n(i,t=!1,e=0){const r=this._$AH,h=this._$AN;if(void 0!==h&&0!==h.size)if(t)if(Array.isArray(r))for(let i=e;i<r.length;i++)s(r[i],!1),o(r[i]);else null!=r&&(s(r,!1),o(r));else s(this,i)}const c=i=>{i.type==_directive_js__WEBPACK_IMPORTED_MODULE_1__.OA.CHILD&&(i._$AP??=n,i._$AQ??=h)};class f extends _directive_js__WEBPACK_IMPORTED_MODULE_1__.WL{constructor(){super(...arguments),this._$AN=void 0}_$AT(i,t,e){super._$AT(i,t,e),r(this),this.isConnected=i._$AU}_$AO(i,t=!0){i!==this.isConnected&&(this.isConnected=i,i?this.reconnected?.():this.disconnected?.()),t&&(s(this,i),o(this))}setValue(t){if((0,_directive_helpers_js__WEBPACK_IMPORTED_MODULE_0__.Rt)(this._$Ct))this._$Ct._$AI(t,this);else{const i=[...this._$Ct._$AH];i[this._$Ci]=t,this._$Ct._$AI(i,this,0)}}disconnected(){}reconnected(){}}},"./node_modules/lit-html/directive-helpers.js":(__unused_webpack_module,__webpack_exports__,__webpack_require__)=>{__webpack_require__.d(__webpack_exports__,{Rt:()=>f,sO:()=>i});var _lit_html_js__WEBPACK_IMPORTED_MODULE_0__=__webpack_require__("./node_modules/lit-html/lit-html.js");const{I:t}=_lit_html_js__WEBPACK_IMPORTED_MODULE_0__.ge,i=o=>null===o||"object"!=typeof o&&"function"!=typeof o,f=o=>void 0===o.strings},"./node_modules/lit-html/directive.js":(__unused_webpack_module,__webpack_exports__,__webpack_require__)=>{__webpack_require__.d(__webpack_exports__,{OA:()=>t,WL:()=>i,u$:()=>e});const t={ATTRIBUTE:1,CHILD:2,PROPERTY:3,BOOLEAN_ATTRIBUTE:4,EVENT:5,ELEMENT:6},e=t=>(...e)=>({_$litDirective$:t,values:e});class i{constructor(t){}get _$AU(){return this._$AM._$AU}_$AT(t,e,i){this._$Ct=t,this._$AM=e,this._$Ci=i}_$AS(t,e){return this.update(t,e)}update(t,e){return this.render(...e)}}},"./node_modules/lit-html/directives/class-map.js":(__unused_webpack_module,__webpack_exports__,__webpack_require__)=>{__webpack_require__.d(__webpack_exports__,{H:()=>e});var _lit_html_js__WEBPACK_IMPORTED_MODULE_0__=__webpack_require__("./node_modules/lit-html/lit-html.js"),_directive_js__WEBPACK_IMPORTED_MODULE_1__=__webpack_require__("./node_modules/lit-html/directive.js");const e=(0,_directive_js__WEBPACK_IMPORTED_MODULE_1__.u$)(class extends _directive_js__WEBPACK_IMPORTED_MODULE_1__.WL{constructor(t){if(super(t),t.type!==_directive_js__WEBPACK_IMPORTED_MODULE_1__.OA.ATTRIBUTE||"class"!==t.name||t.strings?.length>2)throw Error("`classMap()` can only be used in the `class` attribute and must be the only part in the attribute.")}render(t){return" "+Object.keys(t).filter(s=>t[s]).join(" ")+" "}update(s,[i]){if(void 0===this.st){this.st=new Set,void 0!==s.strings&&(this.nt=new Set(s.strings.join(" ").split(/\s/).filter(t=>""!==t)));for(const t in i)i[t]&&!this.nt?.has(t)&&this.st.add(t);return this.render(i)}const r=s.element.classList;for(const t of this.st)t in i||(r.remove(t),this.st.delete(t));for(const t in i){const s=!!i[t];s===this.st.has(t)||this.nt?.has(t)||(s?(r.add(t),this.st.add(t)):(r.remove(t),this.st.delete(t)))}return _lit_html_js__WEBPACK_IMPORTED_MODULE_0__.c0}})},"./node_modules/lit-html/directives/if-defined.js":(__unused_webpack_module,__webpack_exports__,__webpack_require__)=>{__webpack_require__.d(__webpack_exports__,{J:()=>o});var _lit_html_js__WEBPACK_IMPORTED_MODULE_0__=__webpack_require__("./node_modules/lit-html/lit-html.js");const o=o=>o??_lit_html_js__WEBPACK_IMPORTED_MODULE_0__.s6},"./node_modules/lit-html/directives/until.js":(__unused_webpack_module,__webpack_exports__,__webpack_require__)=>{__webpack_require__.d(__webpack_exports__,{T:()=>m});var lit_html=__webpack_require__("./node_modules/lit-html/lit-html.js"),directive_helpers=__webpack_require__("./node_modules/lit-html/directive-helpers.js"),async_directive=__webpack_require__("./node_modules/lit-html/async-directive.js");class s{constructor(t){this.G=t}disconnect(){this.G=void 0}reconnect(t){this.G=t}deref(){return this.G}}class i{constructor(){this.Y=void 0,this.Z=void 0}get(){return this.Y}pause(){this.Y??=new Promise(t=>this.Z=t)}resume(){this.Z?.(),this.Y=this.Z=void 0}}var directive=__webpack_require__("./node_modules/lit-html/directive.js");const n=t=>!(0,directive_helpers.sO)(t)&&"function"==typeof t.then,h=1073741823;class c extends async_directive.Kq{constructor(){super(...arguments),this._$Cwt=h,this._$Cbt=[],this._$CK=new s(this),this._$CX=new i}render(...s){return s.find(t=>!n(t))??lit_html.c0}update(s,i){const e=this._$Cbt;let r=e.length;this._$Cbt=i;const o=this._$CK,c=this._$CX;this.isConnected||this.disconnected();for(let t=0;t<i.length&&!(t>this._$Cwt);t++){const s=i[t];if(!n(s))return this._$Cwt=t,s;t<r&&s===e[t]||(this._$Cwt=h,r=0,Promise.resolve(s).then(async t=>{for(;c.get();)await c.get();const i=o.deref();if(void 0!==i){const e=i._$Cbt.indexOf(s);e>-1&&e<i._$Cwt&&(i._$Cwt=e,i.setValue(t))}}))}return lit_html.c0}disconnected(){this._$CK.disconnect(),this._$CX.pause()}reconnected(){this._$CK.reconnect(this),this._$CX.resume()}}const m=(0,directive.u$)(c)}}]);
//# sourceMappingURL=3900.c79c9029.iframe.bundle.js.map