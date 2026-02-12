/*! For license information please see 2992.8e7485e4.iframe.bundle.js.LICENSE.txt */
"use strict";(self.webpackChunklayerswap=self.webpackChunklayerswap||[]).push([[2992],{"./node_modules/@lit/reactive-element/decorators/property.js":(__unused_webpack_module,__webpack_exports__,__webpack_require__)=>{__webpack_require__.d(__webpack_exports__,{M:()=>n});var _reactive_element_js__WEBPACK_IMPORTED_MODULE_0__=__webpack_require__("./node_modules/@lit/reactive-element/reactive-element.js");const o={attribute:!0,type:String,converter:_reactive_element_js__WEBPACK_IMPORTED_MODULE_0__.W3,reflect:!1,hasChanged:_reactive_element_js__WEBPACK_IMPORTED_MODULE_0__.Ec},r=(t=o,e,r)=>{const{kind:n,metadata:i}=r;let s=globalThis.litPropertyMetadata.get(i);if(void 0===s&&globalThis.litPropertyMetadata.set(i,s=new Map),"setter"===n&&((t=Object.create(t)).wrapped=!0),s.set(r.name,t),"accessor"===n){const{name:o}=r;return{set(r){const n=e.get.call(this);e.set.call(this,r),this.requestUpdate(o,n,t)},init(e){return void 0!==e&&this.C(o,void 0,t,e),e}}}if("setter"===n){const{name:o}=r;return function(r){const n=this[o];e.call(this,r),this.requestUpdate(o,n,t)}}throw Error("Unsupported decorator location: "+n)};function n(t){return(e,o)=>"object"==typeof o?r(t,e,o):((t,e,o)=>{const r=e.hasOwnProperty(o);return e.constructor.createProperty(o,t),r?Object.getOwnPropertyDescriptor(e,o):void 0})(t,e,o)}},"./node_modules/@lit/reactive-element/decorators/state.js":(__unused_webpack_module,__webpack_exports__,__webpack_require__)=>{__webpack_require__.d(__webpack_exports__,{w:()=>r});var _property_js__WEBPACK_IMPORTED_MODULE_0__=__webpack_require__("./node_modules/@lit/reactive-element/decorators/property.js");function r(r){return(0,_property_js__WEBPACK_IMPORTED_MODULE_0__.M)({...r,state:!0,attribute:!1})}},"./node_modules/@reown/appkit-scaffold-ui/dist/esm/exports/w3m-modal.js":(__unused_webpack_module,__webpack_exports__,__webpack_require__)=>{__webpack_require__.r(__webpack_exports__),__webpack_require__.d(__webpack_exports__,{AppKitModal:()=>AppKitModal,W3mModal:()=>W3mModal,W3mModalBase:()=>W3mModalBase});var lit=__webpack_require__("./node_modules/lit/index.js"),decorators=__webpack_require__("./node_modules/lit/decorators.js"),if_defined=__webpack_require__("./node_modules/lit/directives/if-defined.js"),ConstantsUtil=__webpack_require__("./node_modules/@reown/appkit-common/dist/esm/src/utils/ConstantsUtil.js"),OptionsController=__webpack_require__("./node_modules/@reown/appkit-controllers/dist/esm/src/controllers/OptionsController.js"),ModalController=__webpack_require__("./node_modules/@reown/appkit-controllers/dist/esm/src/controllers/ModalController.js"),ChainController=__webpack_require__("./node_modules/@reown/appkit-controllers/dist/esm/src/controllers/ChainController.js"),ConnectorController=__webpack_require__("./node_modules/@reown/appkit-controllers/dist/esm/src/controllers/ConnectorController.js"),ApiController=__webpack_require__("./node_modules/@reown/appkit-controllers/dist/esm/src/controllers/ApiController.js"),RouterController=__webpack_require__("./node_modules/@reown/appkit-controllers/dist/esm/src/controllers/RouterController.js"),SIWXUtil=__webpack_require__("./node_modules/@reown/appkit-controllers/dist/esm/src/utils/SIWXUtil.js");const ModalUtil={isUnsupportedChainView:()=>"UnsupportedChain"===RouterController.I.state.view||"SwitchNetwork"===RouterController.I.state.view&&RouterController.I.state.history.includes("UnsupportedChain"),async safeClose(){if(this.isUnsupportedChainView())return void ModalController.W.shake();await SIWXUtil.U.isSIWXCloseDisabled()?ModalController.W.shake():ModalController.W.close()}};var ThemeController=__webpack_require__("./node_modules/@reown/appkit-controllers/dist/esm/src/controllers/ThemeController.js"),SnackController=__webpack_require__("./node_modules/@reown/appkit-controllers/dist/esm/src/controllers/SnackController.js"),CoreHelperUtil=__webpack_require__("./node_modules/@reown/appkit-controllers/dist/esm/src/utils/CoreHelperUtil.js"),esm_exports=__webpack_require__("./node_modules/@reown/appkit-ui/dist/esm/exports/index.js"),ThemeUtil=__webpack_require__("./node_modules/@reown/appkit-ui/dist/esm/src/utils/ThemeUtil.js"),WebComponentsUtil=__webpack_require__("./node_modules/@reown/appkit-ui/dist/esm/src/utils/WebComponentsUtil.js");const styles=lit.AH`
  :host {
    display: block;
    border-radius: clamp(0px, var(--wui-border-radius-l), 44px);
    box-shadow: 0 0 0 1px var(--wui-color-gray-glass-005);
    background-color: var(--wui-color-modal-bg);
    overflow: hidden;
  }

  :host([data-embedded='true']) {
    box-shadow:
      0 0 0 1px var(--wui-color-gray-glass-005),
      0px 4px 12px 4px var(--w3m-card-embedded-shadow-color);
  }
`;var __decorate=function(decorators,target,key,desc){var d,c=arguments.length,r=c<3?target:null===desc?desc=Object.getOwnPropertyDescriptor(target,key):desc;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(decorators,target,key,desc);else for(var i=decorators.length-1;i>=0;i--)(d=decorators[i])&&(r=(c<3?d(r):c>3?d(target,key,r):d(target,key))||r);return c>3&&r&&Object.defineProperty(target,key,r),r};let WuiCard=class WuiCard extends lit.WF{render(){return lit.qy`<slot></slot>`}};WuiCard.styles=[ThemeUtil.W5,styles],WuiCard=__decorate([(0,WebComponentsUtil.E)("wui-card")],WuiCard);__webpack_require__("./node_modules/@reown/appkit-ui/dist/esm/exports/wui-flex.js");var AlertController=__webpack_require__("./node_modules/@reown/appkit-controllers/dist/esm/src/controllers/AlertController.js");__webpack_require__("./node_modules/@reown/appkit-ui/dist/esm/src/components/wui-icon/index.js"),__webpack_require__("./node_modules/@reown/appkit-ui/dist/esm/src/components/wui-text/index.js"),__webpack_require__("./node_modules/@reown/appkit-ui/dist/esm/src/layout/wui-flex/index.js");const wui_alertbar_styles=lit.AH`
  :host {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--wui-spacing-s);
    border-radius: var(--wui-border-radius-s);
    border: 1px solid var(--wui-color-dark-glass-100);
    box-sizing: border-box;
    background-color: var(--wui-color-bg-325);
    box-shadow: 0px 0px 16px 0px rgba(0, 0, 0, 0.25);
  }

  wui-flex {
    width: 100%;
  }

  wui-text {
    word-break: break-word;
    flex: 1;
  }

  .close {
    cursor: pointer;
  }

  .icon-box {
    height: 40px;
    width: 40px;
    border-radius: var(--wui-border-radius-3xs);
    background-color: var(--local-icon-bg-value);
  }
`;var wui_alertbar_decorate=function(decorators,target,key,desc){var d,c=arguments.length,r=c<3?target:null===desc?desc=Object.getOwnPropertyDescriptor(target,key):desc;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(decorators,target,key,desc);else for(var i=decorators.length-1;i>=0;i--)(d=decorators[i])&&(r=(c<3?d(r):c>3?d(target,key,r):d(target,key))||r);return c>3&&r&&Object.defineProperty(target,key,r),r};let WuiAlertBar=class WuiAlertBar extends lit.WF{constructor(){super(...arguments),this.message="",this.backgroundColor="accent-100",this.iconColor="accent-100",this.icon="info"}render(){return this.style.cssText=`\n      --local-icon-bg-value: var(--wui-color-${this.backgroundColor});\n   `,lit.qy`
      <wui-flex flexDirection="row" justifyContent="space-between" alignItems="center">
        <wui-flex columnGap="xs" flexDirection="row" alignItems="center">
          <wui-flex
            flexDirection="row"
            alignItems="center"
            justifyContent="center"
            class="icon-box"
          >
            <wui-icon color=${this.iconColor} size="md" name=${this.icon}></wui-icon>
          </wui-flex>
          <wui-text variant="small-500" color="bg-350" data-testid="wui-alertbar-text"
            >${this.message}</wui-text
          >
        </wui-flex>
        <wui-icon
          class="close"
          color="bg-350"
          size="sm"
          name="close"
          @click=${this.onClose}
        ></wui-icon>
      </wui-flex>
    `}onClose(){AlertController.h.close()}};WuiAlertBar.styles=[ThemeUtil.W5,wui_alertbar_styles],wui_alertbar_decorate([(0,decorators.MZ)()],WuiAlertBar.prototype,"message",void 0),wui_alertbar_decorate([(0,decorators.MZ)()],WuiAlertBar.prototype,"backgroundColor",void 0),wui_alertbar_decorate([(0,decorators.MZ)()],WuiAlertBar.prototype,"iconColor",void 0),wui_alertbar_decorate([(0,decorators.MZ)()],WuiAlertBar.prototype,"icon",void 0),WuiAlertBar=wui_alertbar_decorate([(0,WebComponentsUtil.E)("wui-alertbar")],WuiAlertBar);const w3m_alertbar_styles=lit.AH`
  :host {
    display: block;
    position: absolute;
    top: var(--wui-spacing-s);
    left: var(--wui-spacing-l);
    right: var(--wui-spacing-l);
    opacity: 0;
    pointer-events: none;
  }
`;var w3m_alertbar_decorate=function(decorators,target,key,desc){var d,c=arguments.length,r=c<3?target:null===desc?desc=Object.getOwnPropertyDescriptor(target,key):desc;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(decorators,target,key,desc);else for(var i=decorators.length-1;i>=0;i--)(d=decorators[i])&&(r=(c<3?d(r):c>3?d(target,key,r):d(target,key))||r);return c>3&&r&&Object.defineProperty(target,key,r),r};const presets={info:{backgroundColor:"fg-350",iconColor:"fg-325",icon:"info"},success:{backgroundColor:"success-glass-reown-020",iconColor:"success-125",icon:"checkmark"},warning:{backgroundColor:"warning-glass-reown-020",iconColor:"warning-100",icon:"warningCircle"},error:{backgroundColor:"error-glass-reown-020",iconColor:"error-125",icon:"exclamationTriangle"}};let W3mAlertBar=class W3mAlertBar extends lit.WF{constructor(){super(),this.unsubscribe=[],this.open=AlertController.h.state.open,this.onOpen(!0),this.unsubscribe.push(AlertController.h.subscribeKey("open",val=>{this.open=val,this.onOpen(!1)}))}disconnectedCallback(){this.unsubscribe.forEach(unsubscribe=>unsubscribe())}render(){const{message,variant}=AlertController.h.state,preset=presets[variant];return lit.qy`
      <wui-alertbar
        message=${message}
        backgroundColor=${preset?.backgroundColor}
        iconColor=${preset?.iconColor}
        icon=${preset?.icon}
      ></wui-alertbar>
    `}onOpen(isMounted){this.open?(this.animate([{opacity:0,transform:"scale(0.85)"},{opacity:1,transform:"scale(1)"}],{duration:150,fill:"forwards",easing:"ease"}),this.style.cssText="pointer-events: auto"):isMounted||(this.animate([{opacity:1,transform:"scale(1)"},{opacity:0,transform:"scale(0.85)"}],{duration:150,fill:"forwards",easing:"ease"}),this.style.cssText="pointer-events: none")}};W3mAlertBar.styles=w3m_alertbar_styles,w3m_alertbar_decorate([(0,decorators.wk)()],W3mAlertBar.prototype,"open",void 0),W3mAlertBar=w3m_alertbar_decorate([(0,esm_exports.EM)("w3m-alertbar")],W3mAlertBar);var AccountController=__webpack_require__("./node_modules/@reown/appkit-controllers/dist/esm/src/controllers/AccountController.js"),AssetUtil=__webpack_require__("./node_modules/@reown/appkit-controllers/dist/esm/src/utils/AssetUtil.js"),AssetController=__webpack_require__("./node_modules/@reown/appkit-controllers/dist/esm/src/controllers/AssetController.js"),EventsController=__webpack_require__("./node_modules/@reown/appkit-controllers/dist/esm/src/controllers/EventsController.js");const wui_icon_link_styles=lit.AH`
  button {
    border-radius: var(--local-border-radius);
    color: var(--wui-color-fg-100);
    padding: var(--local-padding);
  }

  @media (max-width: 700px) {
    button {
      padding: var(--wui-spacing-s);
    }
  }

  button > wui-icon {
    pointer-events: none;
  }

  button:disabled > wui-icon {
    color: var(--wui-color-bg-300) !important;
  }

  button:disabled {
    background-color: transparent;
  }
`;var wui_icon_link_decorate=function(decorators,target,key,desc){var d,c=arguments.length,r=c<3?target:null===desc?desc=Object.getOwnPropertyDescriptor(target,key):desc;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(decorators,target,key,desc);else for(var i=decorators.length-1;i>=0;i--)(d=decorators[i])&&(r=(c<3?d(r):c>3?d(target,key,r):d(target,key))||r);return c>3&&r&&Object.defineProperty(target,key,r),r};let WuiIconLink=class WuiIconLink extends lit.WF{constructor(){super(...arguments),this.size="md",this.disabled=!1,this.icon="copy",this.iconColor="inherit"}render(){const borderRadius="lg"===this.size?"--wui-border-radius-xs":"--wui-border-radius-xxs",padding="lg"===this.size?"--wui-spacing-1xs":"--wui-spacing-2xs";return this.style.cssText=`\n    --local-border-radius: var(${borderRadius});\n    --local-padding: var(${padding});\n`,lit.qy`
      <button ?disabled=${this.disabled}>
        <wui-icon color=${this.iconColor} size=${this.size} name=${this.icon}></wui-icon>
      </button>
    `}};WuiIconLink.styles=[ThemeUtil.W5,ThemeUtil.fD,ThemeUtil.ck,wui_icon_link_styles],wui_icon_link_decorate([(0,decorators.MZ)()],WuiIconLink.prototype,"size",void 0),wui_icon_link_decorate([(0,decorators.MZ)({type:Boolean})],WuiIconLink.prototype,"disabled",void 0),wui_icon_link_decorate([(0,decorators.MZ)()],WuiIconLink.prototype,"icon",void 0),wui_icon_link_decorate([(0,decorators.MZ)()],WuiIconLink.prototype,"iconColor",void 0),WuiIconLink=wui_icon_link_decorate([(0,WebComponentsUtil.E)("wui-icon-link")],WuiIconLink);__webpack_require__("./node_modules/@reown/appkit-ui/dist/esm/src/components/wui-image/index.js"),__webpack_require__("./node_modules/@reown/appkit-ui/dist/esm/src/composites/wui-icon-box/index.js");const wui_select_styles=lit.AH`
  button {
    display: block;
    display: flex;
    align-items: center;
    padding: var(--wui-spacing-xxs);
    gap: var(--wui-spacing-xxs);
    transition: all var(--wui-ease-out-power-1) var(--wui-duration-md);
    border-radius: var(--wui-border-radius-xxs);
  }

  wui-image {
    border-radius: 100%;
    width: var(--wui-spacing-xl);
    height: var(--wui-spacing-xl);
  }

  wui-icon-box {
    width: var(--wui-spacing-xl);
    height: var(--wui-spacing-xl);
  }

  button:hover {
    background-color: var(--wui-color-gray-glass-002);
  }

  button:active {
    background-color: var(--wui-color-gray-glass-005);
  }
`;var wui_select_decorate=function(decorators,target,key,desc){var d,c=arguments.length,r=c<3?target:null===desc?desc=Object.getOwnPropertyDescriptor(target,key):desc;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(decorators,target,key,desc);else for(var i=decorators.length-1;i>=0;i--)(d=decorators[i])&&(r=(c<3?d(r):c>3?d(target,key,r):d(target,key))||r);return c>3&&r&&Object.defineProperty(target,key,r),r};let WuiSelect=class WuiSelect extends lit.WF{constructor(){super(...arguments),this.imageSrc=""}render(){return lit.qy`<button>
      ${this.imageTemplate()}
      <wui-icon size="xs" color="fg-200" name="chevronBottom"></wui-icon>
    </button>`}imageTemplate(){return this.imageSrc?lit.qy`<wui-image src=${this.imageSrc} alt="select visual"></wui-image>`:lit.qy`<wui-icon-box
      size="xxs"
      iconColor="fg-200"
      backgroundColor="fg-100"
      background="opaque"
      icon="networkPlaceholder"
    ></wui-icon-box>`}};WuiSelect.styles=[ThemeUtil.W5,ThemeUtil.fD,ThemeUtil.ck,wui_select_styles],wui_select_decorate([(0,decorators.MZ)()],WuiSelect.prototype,"imageSrc",void 0),WuiSelect=wui_select_decorate([(0,WebComponentsUtil.E)("wui-select")],WuiSelect);__webpack_require__("./node_modules/@reown/appkit-ui/dist/esm/src/composites/wui-tag/index.js"),__webpack_require__("./node_modules/@reown/appkit-ui/dist/esm/exports/wui-text.js");var utils_ConstantsUtil=__webpack_require__("./node_modules/@reown/appkit-scaffold-ui/dist/esm/src/utils/ConstantsUtil.js");const w3m_header_styles=lit.AH`
  :host {
    height: 64px;
  }

  wui-text {
    text-transform: capitalize;
  }

  wui-flex.w3m-header-title {
    transform: translateY(0);
    opacity: 1;
  }

  wui-flex.w3m-header-title[view-direction='prev'] {
    animation:
      slide-down-out 120ms forwards var(--wui-ease-out-power-2),
      slide-down-in 120ms forwards var(--wui-ease-out-power-2);
    animation-delay: 0ms, 200ms;
  }

  wui-flex.w3m-header-title[view-direction='next'] {
    animation:
      slide-up-out 120ms forwards var(--wui-ease-out-power-2),
      slide-up-in 120ms forwards var(--wui-ease-out-power-2);
    animation-delay: 0ms, 200ms;
  }

  wui-icon-link[data-hidden='true'] {
    opacity: 0 !important;
    pointer-events: none;
  }

  @keyframes slide-up-out {
    from {
      transform: translateY(0px);
      opacity: 1;
    }
    to {
      transform: translateY(3px);
      opacity: 0;
    }
  }

  @keyframes slide-up-in {
    from {
      transform: translateY(-3px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  @keyframes slide-down-out {
    from {
      transform: translateY(0px);
      opacity: 1;
    }
    to {
      transform: translateY(-3px);
      opacity: 0;
    }
  }

  @keyframes slide-down-in {
    from {
      transform: translateY(3px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
`;var w3m_header_decorate=function(decorators,target,key,desc){var d,c=arguments.length,r=c<3?target:null===desc?desc=Object.getOwnPropertyDescriptor(target,key):desc;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(decorators,target,key,desc);else for(var i=decorators.length-1;i>=0;i--)(d=decorators[i])&&(r=(c<3?d(r):c>3?d(target,key,r):d(target,key))||r);return c>3&&r&&Object.defineProperty(target,key,r),r};const BETA_SCREENS=["SmartSessionList"];function headings(){const connectorName=RouterController.I.state.data?.connector?.name,walletName=RouterController.I.state.data?.wallet?.name,networkName=RouterController.I.state.data?.network?.name,name=walletName??connectorName,connectors=ConnectorController.a.getConnectors();return{Connect:`Connect ${1===connectors.length&&"w3m-email"===connectors[0]?.id?"Email":""} Wallet`,Create:"Create Wallet",ChooseAccountName:void 0,Account:void 0,AccountSettings:void 0,AllWallets:"All Wallets",ApproveTransaction:"Approve Transaction",BuyInProgress:"Buy",ConnectingExternal:name??"Connect Wallet",ConnectingWalletConnect:name??"WalletConnect",ConnectingWalletConnectBasic:"WalletConnect",ConnectingSiwe:"Sign In",Convert:"Convert",ConvertSelectToken:"Select token",ConvertPreview:"Preview convert",Downloads:name?`Get ${name}`:"Downloads",EmailLogin:"Email Login",EmailVerifyOtp:"Confirm Email",EmailVerifyDevice:"Register Device",GetWallet:"Get a wallet",Networks:"Choose Network",OnRampProviders:"Choose Provider",OnRampActivity:"Activity",OnRampTokenSelect:"Select Token",OnRampFiatSelect:"Select Currency",Pay:"How you pay",Profile:void 0,SwitchNetwork:networkName??"Switch Network",SwitchAddress:"Switch Address",Transactions:"Activity",UnsupportedChain:"Switch Network",UpgradeEmailWallet:"Upgrade your Wallet",UpdateEmailWallet:"Edit Email",UpdateEmailPrimaryOtp:"Confirm Current Email",UpdateEmailSecondaryOtp:"Confirm New Email",WhatIsABuy:"What is Buy?",RegisterAccountName:"Choose name",RegisterAccountNameSuccess:"",WalletReceive:"Receive",WalletCompatibleNetworks:"Compatible Networks",Swap:"Swap",SwapSelectToken:"Select token",SwapPreview:"Preview swap",WalletSend:"Send",WalletSendPreview:"Review send",WalletSendSelectToken:"Select Token",WhatIsANetwork:"What is a network?",WhatIsAWallet:"What is a wallet?",ConnectWallets:"Connect wallet",ConnectSocials:"All socials",ConnectingSocial:AccountController.U.state.socialProvider?AccountController.U.state.socialProvider:"Connect Social",ConnectingMultiChain:"Select chain",ConnectingFarcaster:"Farcaster",SwitchActiveChain:"Switch chain",SmartSessionCreated:void 0,SmartSessionList:"Smart Sessions",SIWXSignMessage:"Sign In",PayLoading:"Payment in progress"}}let W3mHeader=class W3mHeader extends lit.WF{constructor(){super(),this.unsubscribe=[],this.heading=headings()[RouterController.I.state.view],this.network=ChainController.W.state.activeCaipNetwork,this.networkImage=AssetUtil.$.getNetworkImage(this.network),this.showBack=!1,this.prevHistoryLength=1,this.view=RouterController.I.state.view,this.viewDirection="",this.headerText=headings()[RouterController.I.state.view],this.unsubscribe.push(AssetController.j.subscribeNetworkImages(()=>{this.networkImage=AssetUtil.$.getNetworkImage(this.network)}),RouterController.I.subscribeKey("view",val=>{setTimeout(()=>{this.view=val,this.headerText=headings()[val]},utils_ConstantsUtil.o.ANIMATION_DURATIONS.HeaderText),this.onViewChange(),this.onHistoryChange()}),ChainController.W.subscribeKey("activeCaipNetwork",val=>{this.network=val,this.networkImage=AssetUtil.$.getNetworkImage(this.network)}))}disconnectCallback(){this.unsubscribe.forEach(unsubscribe=>unsubscribe())}render(){return lit.qy`
      <wui-flex .padding=${this.getPadding()} justifyContent="space-between" alignItems="center">
        ${this.leftHeaderTemplate()} ${this.titleTemplate()} ${this.rightHeaderTemplate()}
      </wui-flex>
    `}onWalletHelp(){EventsController.E.sendEvent({type:"track",event:"CLICK_WALLET_HELP"}),RouterController.I.push("WhatIsAWallet")}async onClose(){await ModalUtil.safeClose()}rightHeaderTemplate(){const isSmartSessionsEnabled=OptionsController.H?.state?.features?.smartSessions;return"Account"===RouterController.I.state.view&&isSmartSessionsEnabled?lit.qy`<wui-flex>
      <wui-icon-link
        icon="clock"
        @click=${()=>RouterController.I.push("SmartSessionList")}
        data-testid="w3m-header-smart-sessions"
      ></wui-icon-link>
      ${this.closeButtonTemplate()}
    </wui-flex> `:this.closeButtonTemplate()}closeButtonTemplate(){return lit.qy`
      <wui-icon-link
        icon="close"
        @click=${this.onClose.bind(this)}
        data-testid="w3m-header-close"
      ></wui-icon-link>
    `}titleTemplate(){const isBeta=BETA_SCREENS.includes(this.view);return lit.qy`
      <wui-flex
        view-direction="${this.viewDirection}"
        class="w3m-header-title"
        alignItems="center"
        gap="xs"
      >
        <wui-text variant="paragraph-700" color="fg-100" data-testid="w3m-header-text"
          >${this.headerText}</wui-text
        >
        ${isBeta?lit.qy`<wui-tag variant="main">Beta</wui-tag>`:null}
      </wui-flex>
    `}leftHeaderTemplate(){const{view}=RouterController.I.state,isConnectHelp="Connect"===view,isEmbeddedEnable=OptionsController.H.state.enableEmbedded,isApproveTransaction="ApproveTransaction"===view,isConnectingSIWEView="ConnectingSiwe"===view,isAccountView="Account"===view,enableNetworkSwitch=OptionsController.H.state.enableNetworkSwitch,shouldHideBack=isApproveTransaction||isConnectingSIWEView||isConnectHelp&&isEmbeddedEnable;return isAccountView&&enableNetworkSwitch?lit.qy`<wui-select
        id="dynamic"
        data-testid="w3m-account-select-network"
        active-network=${(0,if_defined.J)(this.network?.name)}
        @click=${this.onNetworks.bind(this)}
        imageSrc=${(0,if_defined.J)(this.networkImage)}
      ></wui-select>`:this.showBack&&!shouldHideBack?lit.qy`<wui-icon-link
        data-testid="header-back"
        id="dynamic"
        icon="chevronLeft"
        @click=${this.onGoBack.bind(this)}
      ></wui-icon-link>`:lit.qy`<wui-icon-link
      data-hidden=${!isConnectHelp}
      id="dynamic"
      icon="helpCircle"
      @click=${this.onWalletHelp.bind(this)}
    ></wui-icon-link>`}onNetworks(){this.isAllowedNetworkSwitch()&&(EventsController.E.sendEvent({type:"track",event:"CLICK_NETWORKS"}),RouterController.I.push("Networks"))}isAllowedNetworkSwitch(){const requestedCaipNetworks=ChainController.W.getAllRequestedCaipNetworks(),isMultiNetwork=!!requestedCaipNetworks&&requestedCaipNetworks.length>1,isValidNetwork=requestedCaipNetworks?.find(({id})=>id===this.network?.id);return isMultiNetwork||!isValidNetwork}getPadding(){return this.heading?["l","2l","l","2l"]:["0","2l","0","2l"]}onViewChange(){const{history}=RouterController.I.state;let direction=utils_ConstantsUtil.o.VIEW_DIRECTION.Next;history.length<this.prevHistoryLength&&(direction=utils_ConstantsUtil.o.VIEW_DIRECTION.Prev),this.prevHistoryLength=history.length,this.viewDirection=direction}async onHistoryChange(){const{history}=RouterController.I.state,buttonEl=this.shadowRoot?.querySelector("#dynamic");history.length>1&&!this.showBack&&buttonEl?(await buttonEl.animate([{opacity:1},{opacity:0}],{duration:200,fill:"forwards",easing:"ease"}).finished,this.showBack=!0,buttonEl.animate([{opacity:0},{opacity:1}],{duration:200,fill:"forwards",easing:"ease"})):history.length<=1&&this.showBack&&buttonEl&&(await buttonEl.animate([{opacity:1},{opacity:0}],{duration:200,fill:"forwards",easing:"ease"}).finished,this.showBack=!1,buttonEl.animate([{opacity:0},{opacity:1}],{duration:200,fill:"forwards",easing:"ease"}))}onGoBack(){RouterController.I.goBack()}};W3mHeader.styles=w3m_header_styles,w3m_header_decorate([(0,decorators.wk)()],W3mHeader.prototype,"heading",void 0),w3m_header_decorate([(0,decorators.wk)()],W3mHeader.prototype,"network",void 0),w3m_header_decorate([(0,decorators.wk)()],W3mHeader.prototype,"networkImage",void 0),w3m_header_decorate([(0,decorators.wk)()],W3mHeader.prototype,"showBack",void 0),w3m_header_decorate([(0,decorators.wk)()],W3mHeader.prototype,"prevHistoryLength",void 0),w3m_header_decorate([(0,decorators.wk)()],W3mHeader.prototype,"view",void 0),w3m_header_decorate([(0,decorators.wk)()],W3mHeader.prototype,"viewDirection",void 0),w3m_header_decorate([(0,decorators.wk)()],W3mHeader.prototype,"headerText",void 0),W3mHeader=w3m_header_decorate([(0,esm_exports.EM)("w3m-header")],W3mHeader);__webpack_require__("./node_modules/@reown/appkit-ui/dist/esm/src/components/wui-loading-spinner/index.js");const wui_snackbar_styles=lit.AH`
  :host {
    display: flex;
    column-gap: var(--wui-spacing-s);
    align-items: center;
    padding: var(--wui-spacing-xs) var(--wui-spacing-m) var(--wui-spacing-xs) var(--wui-spacing-xs);
    border-radius: var(--wui-border-radius-s);
    border: 1px solid var(--wui-color-gray-glass-005);
    box-sizing: border-box;
    background-color: var(--wui-color-bg-175);
    box-shadow:
      0px 14px 64px -4px rgba(0, 0, 0, 0.15),
      0px 8px 22px -6px rgba(0, 0, 0, 0.15);

    max-width: 300px;
  }

  :host wui-loading-spinner {
    margin-left: var(--wui-spacing-3xs);
  }
`;var wui_snackbar_decorate=function(decorators,target,key,desc){var d,c=arguments.length,r=c<3?target:null===desc?desc=Object.getOwnPropertyDescriptor(target,key):desc;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(decorators,target,key,desc);else for(var i=decorators.length-1;i>=0;i--)(d=decorators[i])&&(r=(c<3?d(r):c>3?d(target,key,r):d(target,key))||r);return c>3&&r&&Object.defineProperty(target,key,r),r};let WuiSnackbar=class WuiSnackbar extends lit.WF{constructor(){super(...arguments),this.backgroundColor="accent-100",this.iconColor="accent-100",this.icon="checkmark",this.message="",this.loading=!1,this.iconType="default"}render(){return lit.qy`
      ${this.templateIcon()}
      <wui-text variant="paragraph-500" color="fg-100" data-testid="wui-snackbar-message"
        >${this.message}</wui-text
      >
    `}templateIcon(){return this.loading?lit.qy`<wui-loading-spinner size="md" color="accent-100"></wui-loading-spinner>`:"default"===this.iconType?lit.qy`<wui-icon size="xl" color=${this.iconColor} name=${this.icon}></wui-icon>`:lit.qy`<wui-icon-box
      size="sm"
      iconSize="xs"
      iconColor=${this.iconColor}
      backgroundColor=${this.backgroundColor}
      icon=${this.icon}
      background="opaque"
    ></wui-icon-box>`}};WuiSnackbar.styles=[ThemeUtil.W5,wui_snackbar_styles],wui_snackbar_decorate([(0,decorators.MZ)()],WuiSnackbar.prototype,"backgroundColor",void 0),wui_snackbar_decorate([(0,decorators.MZ)()],WuiSnackbar.prototype,"iconColor",void 0),wui_snackbar_decorate([(0,decorators.MZ)()],WuiSnackbar.prototype,"icon",void 0),wui_snackbar_decorate([(0,decorators.MZ)()],WuiSnackbar.prototype,"message",void 0),wui_snackbar_decorate([(0,decorators.MZ)()],WuiSnackbar.prototype,"loading",void 0),wui_snackbar_decorate([(0,decorators.MZ)()],WuiSnackbar.prototype,"iconType",void 0),WuiSnackbar=wui_snackbar_decorate([(0,WebComponentsUtil.E)("wui-snackbar")],WuiSnackbar);const w3m_snackbar_styles=lit.AH`
  :host {
    display: block;
    position: absolute;
    opacity: 0;
    pointer-events: none;
    top: 11px;
    left: 50%;
    width: max-content;
  }
`;var w3m_snackbar_decorate=function(decorators,target,key,desc){var d,c=arguments.length,r=c<3?target:null===desc?desc=Object.getOwnPropertyDescriptor(target,key):desc;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(decorators,target,key,desc);else for(var i=decorators.length-1;i>=0;i--)(d=decorators[i])&&(r=(c<3?d(r):c>3?d(target,key,r):d(target,key))||r);return c>3&&r&&Object.defineProperty(target,key,r),r};const w3m_snackbar_presets={loading:void 0,success:{backgroundColor:"success-100",iconColor:"success-100",icon:"checkmark"},error:{backgroundColor:"error-100",iconColor:"error-100",icon:"close"}};let W3mSnackBar=class W3mSnackBar extends lit.WF{constructor(){super(),this.unsubscribe=[],this.timeout=void 0,this.open=SnackController.P.state.open,this.unsubscribe.push(SnackController.P.subscribeKey("open",val=>{this.open=val,this.onOpen()}))}disconnectedCallback(){clearTimeout(this.timeout),this.unsubscribe.forEach(unsubscribe=>unsubscribe())}render(){const{message,variant,svg}=SnackController.P.state,preset=w3m_snackbar_presets[variant],{icon,iconColor}=svg??preset??{};return lit.qy`
      <wui-snackbar
        message=${message}
        backgroundColor=${preset?.backgroundColor}
        iconColor=${iconColor}
        icon=${icon}
        .loading=${"loading"===variant}
      ></wui-snackbar>
    `}onOpen(){clearTimeout(this.timeout),this.open?(this.animate([{opacity:0,transform:"translateX(-50%) scale(0.85)"},{opacity:1,transform:"translateX(-50%) scale(1)"}],{duration:150,fill:"forwards",easing:"ease"}),this.timeout&&clearTimeout(this.timeout),SnackController.P.state.autoClose&&(this.timeout=setTimeout(()=>SnackController.P.hide(),2500))):this.animate([{opacity:1,transform:"translateX(-50%) scale(1)"},{opacity:0,transform:"translateX(-50%) scale(0.85)"}],{duration:150,fill:"forwards",easing:"ease"})}};W3mSnackBar.styles=w3m_snackbar_styles,w3m_snackbar_decorate([(0,decorators.wk)()],W3mSnackBar.prototype,"open",void 0),W3mSnackBar=w3m_snackbar_decorate([(0,esm_exports.EM)("w3m-snackbar")],W3mSnackBar);var vanilla=__webpack_require__("./node_modules/valtio/esm/vanilla.mjs"),utils=__webpack_require__("./node_modules/valtio/esm/vanilla/utils.mjs"),withErrorBoundary=__webpack_require__("./node_modules/@reown/appkit-controllers/dist/esm/src/utils/withErrorBoundary.js");const state=(0,vanilla.BX)({message:"",open:!1,triggerRect:{width:0,height:0,top:0,left:0},variant:"shade"}),controller={state,subscribe:callback=>(0,vanilla.B1)(state,()=>callback(state)),subscribeKey:(key,callback)=>(0,utils.u$)(state,key,callback),showTooltip({message,triggerRect,variant}){state.open=!0,state.message=message,state.triggerRect=triggerRect,state.variant=variant},hide(){state.open=!1,state.message="",state.triggerRect={width:0,height:0,top:0,left:0}}},TooltipController=(0,withErrorBoundary.X)(controller);__webpack_require__("./node_modules/@reown/appkit-ui/dist/esm/exports/wui-icon.js");const w3m_tooltip_styles=lit.AH`
  :host {
    pointer-events: none;
  }

  :host > wui-flex {
    display: var(--w3m-tooltip-display);
    opacity: var(--w3m-tooltip-opacity);
    padding: 9px var(--wui-spacing-s) 10px var(--wui-spacing-s);
    border-radius: var(--wui-border-radius-xxs);
    color: var(--wui-color-bg-100);
    position: fixed;
    top: var(--w3m-tooltip-top);
    left: var(--w3m-tooltip-left);
    transform: translate(calc(-50% + var(--w3m-tooltip-parent-width)), calc(-100% - 8px));
    max-width: calc(var(--w3m-modal-width) - var(--wui-spacing-xl));
    transition: opacity 0.2s var(--wui-ease-out-power-2);
    will-change: opacity;
  }

  :host([data-variant='shade']) > wui-flex {
    background-color: var(--wui-color-bg-150);
    border: 1px solid var(--wui-color-gray-glass-005);
  }

  :host([data-variant='shade']) > wui-flex > wui-text {
    color: var(--wui-color-fg-150);
  }

  :host([data-variant='fill']) > wui-flex {
    background-color: var(--wui-color-fg-100);
    border: none;
  }

  wui-icon {
    position: absolute;
    width: 12px !important;
    height: 4px !important;
    color: var(--wui-color-bg-150);
  }

  wui-icon[data-placement='top'] {
    bottom: 0px;
    left: 50%;
    transform: translate(-50%, 95%);
  }

  wui-icon[data-placement='bottom'] {
    top: 0;
    left: 50%;
    transform: translate(-50%, -95%) rotate(180deg);
  }

  wui-icon[data-placement='right'] {
    top: 50%;
    left: 0;
    transform: translate(-65%, -50%) rotate(90deg);
  }

  wui-icon[data-placement='left'] {
    top: 50%;
    right: 0%;
    transform: translate(65%, -50%) rotate(270deg);
  }
`;var w3m_tooltip_decorate=function(decorators,target,key,desc){var d,c=arguments.length,r=c<3?target:null===desc?desc=Object.getOwnPropertyDescriptor(target,key):desc;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(decorators,target,key,desc);else for(var i=decorators.length-1;i>=0;i--)(d=decorators[i])&&(r=(c<3?d(r):c>3?d(target,key,r):d(target,key))||r);return c>3&&r&&Object.defineProperty(target,key,r),r};let W3mTooltip=class W3mTooltip extends lit.WF{constructor(){super(),this.unsubscribe=[],this.open=TooltipController.state.open,this.message=TooltipController.state.message,this.triggerRect=TooltipController.state.triggerRect,this.variant=TooltipController.state.variant,this.unsubscribe.push(TooltipController.subscribe(newState=>{this.open=newState.open,this.message=newState.message,this.triggerRect=newState.triggerRect,this.variant=newState.variant}))}disconnectedCallback(){this.unsubscribe.forEach(unsubscribe=>unsubscribe())}render(){this.dataset.variant=this.variant;const topValue=this.triggerRect.top,leftValue=this.triggerRect.left;return this.style.cssText=`\n    --w3m-tooltip-top: ${topValue}px;\n    --w3m-tooltip-left: ${leftValue}px;\n    --w3m-tooltip-parent-width: ${this.triggerRect.width/2}px;\n    --w3m-tooltip-display: ${this.open?"flex":"none"};\n    --w3m-tooltip-opacity: ${this.open?1:0};\n    `,lit.qy`<wui-flex>
      <wui-icon data-placement="top" color="fg-100" size="inherit" name="cursor"></wui-icon>
      <wui-text color="inherit" variant="small-500">${this.message}</wui-text>
    </wui-flex>`}};W3mTooltip.styles=[w3m_tooltip_styles],w3m_tooltip_decorate([(0,decorators.wk)()],W3mTooltip.prototype,"open",void 0),w3m_tooltip_decorate([(0,decorators.wk)()],W3mTooltip.prototype,"message",void 0),w3m_tooltip_decorate([(0,decorators.wk)()],W3mTooltip.prototype,"triggerRect",void 0),w3m_tooltip_decorate([(0,decorators.wk)()],W3mTooltip.prototype,"variant",void 0),W3mTooltip=w3m_tooltip_decorate([(0,esm_exports.EM)("w3m-tooltip"),(0,esm_exports.EM)("w3m-tooltip")],W3mTooltip);const w3m_router_styles=lit.AH`
  :host {
    --prev-height: 0px;
    --new-height: 0px;
    display: block;
  }

  div.w3m-router-container {
    transform: translateY(0);
    opacity: 1;
  }

  div.w3m-router-container[view-direction='prev'] {
    animation:
      slide-left-out 150ms forwards ease,
      slide-left-in 150ms forwards ease;
    animation-delay: 0ms, 200ms;
  }

  div.w3m-router-container[view-direction='next'] {
    animation:
      slide-right-out 150ms forwards ease,
      slide-right-in 150ms forwards ease;
    animation-delay: 0ms, 200ms;
  }

  @keyframes slide-left-out {
    from {
      transform: translateX(0px);
      opacity: 1;
    }
    to {
      transform: translateX(10px);
      opacity: 0;
    }
  }

  @keyframes slide-left-in {
    from {
      transform: translateX(-10px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @keyframes slide-right-out {
    from {
      transform: translateX(0px);
      opacity: 1;
    }
    to {
      transform: translateX(-10px);
      opacity: 0;
    }
  }

  @keyframes slide-right-in {
    from {
      transform: translateX(10px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
`;var w3m_router_decorate=function(decorators,target,key,desc){var d,c=arguments.length,r=c<3?target:null===desc?desc=Object.getOwnPropertyDescriptor(target,key):desc;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(decorators,target,key,desc);else for(var i=decorators.length-1;i>=0;i--)(d=decorators[i])&&(r=(c<3?d(r):c>3?d(target,key,r):d(target,key))||r);return c>3&&r&&Object.defineProperty(target,key,r),r};let W3mRouter=class W3mRouter extends lit.WF{constructor(){super(),this.resizeObserver=void 0,this.prevHeight="0px",this.prevHistoryLength=1,this.unsubscribe=[],this.view=RouterController.I.state.view,this.viewDirection="",this.unsubscribe.push(RouterController.I.subscribeKey("view",val=>this.onViewChange(val)))}firstUpdated(){this.resizeObserver=new ResizeObserver(([content])=>{const height=`${content?.contentRect.height}px`;"0px"!==this.prevHeight&&(this.style.setProperty("--prev-height",this.prevHeight),this.style.setProperty("--new-height",height),this.style.animation="w3m-view-height 150ms forwards ease",this.style.height="auto"),setTimeout(()=>{this.prevHeight=height,this.style.animation="unset"},utils_ConstantsUtil.o.ANIMATION_DURATIONS.ModalHeight)}),this.resizeObserver?.observe(this.getWrapper())}disconnectedCallback(){this.resizeObserver?.unobserve(this.getWrapper()),this.unsubscribe.forEach(unsubscribe=>unsubscribe())}render(){return lit.qy`<div class="w3m-router-container" view-direction="${this.viewDirection}">
      ${this.viewTemplate()}
    </div>`}viewTemplate(){switch(this.view){case"AccountSettings":return lit.qy`<w3m-account-settings-view></w3m-account-settings-view>`;case"Account":return lit.qy`<w3m-account-view></w3m-account-view>`;case"AllWallets":return lit.qy`<w3m-all-wallets-view></w3m-all-wallets-view>`;case"ApproveTransaction":return lit.qy`<w3m-approve-transaction-view></w3m-approve-transaction-view>`;case"BuyInProgress":return lit.qy`<w3m-buy-in-progress-view></w3m-buy-in-progress-view>`;case"ChooseAccountName":return lit.qy`<w3m-choose-account-name-view></w3m-choose-account-name-view>`;case"Connect":default:return lit.qy`<w3m-connect-view></w3m-connect-view>`;case"Create":return lit.qy`<w3m-connect-view walletGuide="explore"></w3m-connect-view>`;case"ConnectingWalletConnect":return lit.qy`<w3m-connecting-wc-view></w3m-connecting-wc-view>`;case"ConnectingWalletConnectBasic":return lit.qy`<w3m-connecting-wc-basic-view></w3m-connecting-wc-basic-view>`;case"ConnectingExternal":return lit.qy`<w3m-connecting-external-view></w3m-connecting-external-view>`;case"ConnectingSiwe":return lit.qy`<w3m-connecting-siwe-view></w3m-connecting-siwe-view>`;case"ConnectWallets":return lit.qy`<w3m-connect-wallets-view></w3m-connect-wallets-view>`;case"ConnectSocials":return lit.qy`<w3m-connect-socials-view></w3m-connect-socials-view>`;case"ConnectingSocial":return lit.qy`<w3m-connecting-social-view></w3m-connecting-social-view>`;case"Downloads":return lit.qy`<w3m-downloads-view></w3m-downloads-view>`;case"EmailLogin":return lit.qy`<w3m-email-login-view></w3m-email-login-view>`;case"EmailVerifyOtp":return lit.qy`<w3m-email-verify-otp-view></w3m-email-verify-otp-view>`;case"EmailVerifyDevice":return lit.qy`<w3m-email-verify-device-view></w3m-email-verify-device-view>`;case"GetWallet":return lit.qy`<w3m-get-wallet-view></w3m-get-wallet-view>`;case"Networks":return lit.qy`<w3m-networks-view></w3m-networks-view>`;case"SwitchNetwork":return lit.qy`<w3m-network-switch-view></w3m-network-switch-view>`;case"Profile":return lit.qy`<w3m-profile-view></w3m-profile-view>`;case"SwitchAddress":return lit.qy`<w3m-switch-address-view></w3m-switch-address-view>`;case"Transactions":return lit.qy`<w3m-transactions-view></w3m-transactions-view>`;case"OnRampProviders":return lit.qy`<w3m-onramp-providers-view></w3m-onramp-providers-view>`;case"OnRampActivity":return lit.qy`<w3m-onramp-activity-view></w3m-onramp-activity-view>`;case"OnRampTokenSelect":return lit.qy`<w3m-onramp-token-select-view></w3m-onramp-token-select-view>`;case"OnRampFiatSelect":return lit.qy`<w3m-onramp-fiat-select-view></w3m-onramp-fiat-select-view>`;case"UpgradeEmailWallet":return lit.qy`<w3m-upgrade-wallet-view></w3m-upgrade-wallet-view>`;case"UpdateEmailWallet":return lit.qy`<w3m-update-email-wallet-view></w3m-update-email-wallet-view>`;case"UpdateEmailPrimaryOtp":return lit.qy`<w3m-update-email-primary-otp-view></w3m-update-email-primary-otp-view>`;case"UpdateEmailSecondaryOtp":return lit.qy`<w3m-update-email-secondary-otp-view></w3m-update-email-secondary-otp-view>`;case"UnsupportedChain":return lit.qy`<w3m-unsupported-chain-view></w3m-unsupported-chain-view>`;case"Swap":return lit.qy`<w3m-swap-view></w3m-swap-view>`;case"SwapSelectToken":return lit.qy`<w3m-swap-select-token-view></w3m-swap-select-token-view>`;case"SwapPreview":return lit.qy`<w3m-swap-preview-view></w3m-swap-preview-view>`;case"WalletSend":return lit.qy`<w3m-wallet-send-view></w3m-wallet-send-view>`;case"WalletSendSelectToken":return lit.qy`<w3m-wallet-send-select-token-view></w3m-wallet-send-select-token-view>`;case"WalletSendPreview":return lit.qy`<w3m-wallet-send-preview-view></w3m-wallet-send-preview-view>`;case"WhatIsABuy":return lit.qy`<w3m-what-is-a-buy-view></w3m-what-is-a-buy-view>`;case"WalletReceive":return lit.qy`<w3m-wallet-receive-view></w3m-wallet-receive-view>`;case"WalletCompatibleNetworks":return lit.qy`<w3m-wallet-compatible-networks-view></w3m-wallet-compatible-networks-view>`;case"WhatIsAWallet":return lit.qy`<w3m-what-is-a-wallet-view></w3m-what-is-a-wallet-view>`;case"ConnectingMultiChain":return lit.qy`<w3m-connecting-multi-chain-view></w3m-connecting-multi-chain-view>`;case"WhatIsANetwork":return lit.qy`<w3m-what-is-a-network-view></w3m-what-is-a-network-view>`;case"ConnectingFarcaster":return lit.qy`<w3m-connecting-farcaster-view></w3m-connecting-farcaster-view>`;case"SwitchActiveChain":return lit.qy`<w3m-switch-active-chain-view></w3m-switch-active-chain-view>`;case"RegisterAccountName":return lit.qy`<w3m-register-account-name-view></w3m-register-account-name-view>`;case"RegisterAccountNameSuccess":return lit.qy`<w3m-register-account-name-success-view></w3m-register-account-name-success-view>`;case"SmartSessionCreated":return lit.qy`<w3m-smart-session-created-view></w3m-smart-session-created-view>`;case"SmartSessionList":return lit.qy`<w3m-smart-session-list-view></w3m-smart-session-list-view>`;case"SIWXSignMessage":return lit.qy`<w3m-siwx-sign-message-view></w3m-siwx-sign-message-view>`;case"Pay":return lit.qy`<w3m-pay-view></w3m-pay-view>`;case"PayLoading":return lit.qy`<w3m-pay-loading-view></w3m-pay-loading-view>`}}onViewChange(newView){TooltipController.hide();let direction=utils_ConstantsUtil.o.VIEW_DIRECTION.Next;const{history}=RouterController.I.state;history.length<this.prevHistoryLength&&(direction=utils_ConstantsUtil.o.VIEW_DIRECTION.Prev),this.prevHistoryLength=history.length,this.viewDirection=direction,setTimeout(()=>{this.view=newView},utils_ConstantsUtil.o.ANIMATION_DURATIONS.ViewTransition)}getWrapper(){return this.shadowRoot?.querySelector("div")}};W3mRouter.styles=w3m_router_styles,w3m_router_decorate([(0,decorators.wk)()],W3mRouter.prototype,"view",void 0),w3m_router_decorate([(0,decorators.wk)()],W3mRouter.prototype,"viewDirection",void 0),W3mRouter=w3m_router_decorate([(0,esm_exports.EM)("w3m-router")],W3mRouter);const w3m_modal_styles=lit.AH`
  :host {
    z-index: var(--w3m-z-index);
    display: block;
    backface-visibility: hidden;
    will-change: opacity;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    opacity: 0;
    background-color: var(--wui-cover);
    transition: opacity 0.2s var(--wui-ease-out-power-2);
    will-change: opacity;
  }

  :host(.open) {
    opacity: 1;
  }

  :host(.appkit-modal) {
    position: relative;
    pointer-events: unset;
    background: none;
    width: 100%;
    opacity: 1;
  }

  wui-card {
    max-width: var(--w3m-modal-width);
    width: 100%;
    position: relative;
    animation: zoom-in 0.2s var(--wui-ease-out-power-2);
    animation-fill-mode: backwards;
    outline: none;
    transition:
      border-radius var(--wui-duration-lg) var(--wui-ease-out-power-1),
      background-color var(--wui-duration-lg) var(--wui-ease-out-power-1);
    will-change: border-radius, background-color;
  }

  :host(.appkit-modal) wui-card {
    max-width: 400px;
  }

  wui-card[shake='true'] {
    animation:
      zoom-in 0.2s var(--wui-ease-out-power-2),
      w3m-shake 0.5s var(--wui-ease-out-power-2);
  }

  wui-flex {
    overflow-x: hidden;
    overflow-y: auto;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
  }

  @media (max-height: 700px) and (min-width: 431px) {
    wui-flex {
      align-items: flex-start;
    }

    wui-card {
      margin: var(--wui-spacing-xxl) 0px;
    }
  }

  @media (max-width: 430px) {
    wui-flex {
      align-items: flex-end;
    }

    wui-card {
      max-width: 100%;
      border-bottom-left-radius: var(--local-border-bottom-mobile-radius);
      border-bottom-right-radius: var(--local-border-bottom-mobile-radius);
      border-bottom: none;
      animation: slide-in 0.2s var(--wui-ease-out-power-2);
    }

    wui-card[shake='true'] {
      animation:
        slide-in 0.2s var(--wui-ease-out-power-2),
        w3m-shake 0.5s var(--wui-ease-out-power-2);
    }
  }

  @keyframes zoom-in {
    0% {
      transform: scale(0.95) translateY(0);
    }
    100% {
      transform: scale(1) translateY(0);
    }
  }

  @keyframes slide-in {
    0% {
      transform: scale(1) translateY(50px);
    }
    100% {
      transform: scale(1) translateY(0);
    }
  }

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

  @keyframes w3m-view-height {
    from {
      height: var(--prev-height);
    }
    to {
      height: var(--new-height);
    }
  }
`;var w3m_modal_decorate=function(decorators,target,key,desc){var d,c=arguments.length,r=c<3?target:null===desc?desc=Object.getOwnPropertyDescriptor(target,key):desc;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(decorators,target,key,desc);else for(var i=decorators.length-1;i>=0;i--)(d=decorators[i])&&(r=(c<3?d(r):c>3?d(target,key,r):d(target,key))||r);return c>3&&r&&Object.defineProperty(target,key,r),r};class W3mModalBase extends lit.WF{constructor(){super(),this.unsubscribe=[],this.abortController=void 0,this.hasPrefetched=!1,this.enableEmbedded=OptionsController.H.state.enableEmbedded,this.open=ModalController.W.state.open,this.caipAddress=ChainController.W.state.activeCaipAddress,this.caipNetwork=ChainController.W.state.activeCaipNetwork,this.shake=ModalController.W.state.shake,this.filterByNamespace=ConnectorController.a.state.filterByNamespace,this.initializeTheming(),ApiController.N.prefetchAnalyticsConfig(),this.unsubscribe.push(ModalController.W.subscribeKey("open",val=>val?this.onOpen():this.onClose()),ModalController.W.subscribeKey("shake",val=>this.shake=val),ChainController.W.subscribeKey("activeCaipNetwork",val=>this.onNewNetwork(val)),ChainController.W.subscribeKey("activeCaipAddress",val=>this.onNewAddress(val)),OptionsController.H.subscribeKey("enableEmbedded",val=>this.enableEmbedded=val),ConnectorController.a.subscribeKey("filterByNamespace",val=>{this.filterByNamespace===val||ChainController.W.getAccountData(val)?.caipAddress||(ApiController.N.fetchRecommendedWallets(),this.filterByNamespace=val)}))}firstUpdated(){if(this.caipAddress){if(this.enableEmbedded)return ModalController.W.close(),void this.prefetch();this.onNewAddress(this.caipAddress)}this.open&&this.onOpen(),this.enableEmbedded&&this.prefetch()}disconnectedCallback(){this.unsubscribe.forEach(unsubscribe=>unsubscribe()),this.onRemoveKeyboardListener()}render(){return this.style.cssText=`\n      --local-border-bottom-mobile-radius: ${this.enableEmbedded?"clamp(0px, var(--wui-border-radius-l), 44px)":"0px"};\n    `,this.enableEmbedded?lit.qy`${this.contentTemplate()}
        <w3m-tooltip></w3m-tooltip> `:this.open?lit.qy`
          <wui-flex @click=${this.onOverlayClick.bind(this)} data-testid="w3m-modal-overlay">
            ${this.contentTemplate()}
          </wui-flex>
          <w3m-tooltip></w3m-tooltip>
        `:null}contentTemplate(){return lit.qy` <wui-card
      shake="${this.shake}"
      data-embedded="${(0,if_defined.J)(this.enableEmbedded)}"
      role="alertdialog"
      aria-modal="true"
      tabindex="0"
      data-testid="w3m-modal-card"
    >
      <w3m-header></w3m-header>
      <w3m-router></w3m-router>
      <w3m-snackbar></w3m-snackbar>
      <w3m-alertbar></w3m-alertbar>
    </wui-card>`}async onOverlayClick(event){event.target===event.currentTarget&&await this.handleClose()}async handleClose(){await ModalUtil.safeClose()}initializeTheming(){const{themeVariables,themeMode}=ThemeController.W.state,defaultThemeMode=esm_exports.Zv.getColorTheme(themeMode);(0,esm_exports.RF)(themeVariables,defaultThemeMode)}onClose(){this.open=!1,this.classList.remove("open"),this.onScrollUnlock(),SnackController.P.hide(),this.onRemoveKeyboardListener()}onOpen(){this.open=!0,this.classList.add("open"),this.onScrollLock(),this.onAddKeyboardListener()}onScrollLock(){const styleTag=document.createElement("style");styleTag.dataset.w3m="scroll-lock",styleTag.textContent="\n      body {\n        touch-action: none;\n        overflow: hidden;\n        overscroll-behavior: contain;\n      }\n      w3m-modal {\n        pointer-events: auto;\n      }\n    ",document.head.appendChild(styleTag)}onScrollUnlock(){const styleTag=document.head.querySelector('style[data-w3m="scroll-lock"]');styleTag&&styleTag.remove()}onAddKeyboardListener(){this.abortController=new AbortController;const card=this.shadowRoot?.querySelector("wui-card");card?.focus(),window.addEventListener("keydown",event=>{if("Escape"===event.key)this.handleClose();else if("Tab"===event.key){const{tagName}=event.target;!tagName||tagName.includes("W3M-")||tagName.includes("WUI-")||card?.focus()}},this.abortController)}onRemoveKeyboardListener(){this.abortController?.abort(),this.abortController=void 0}async onNewAddress(caipAddress){const isSwitchingNamespace=ChainController.W.state.isSwitchingNamespace,nextConnected=CoreHelperUtil.w.getPlainAddress(caipAddress),isSwitchingNamespaceAndConnected=isSwitchingNamespace&&nextConnected;!nextConnected&&!isSwitchingNamespace?ModalController.W.close():isSwitchingNamespaceAndConnected&&RouterController.I.goBack(),await SIWXUtil.U.initializeIfEnabled(),this.caipAddress=caipAddress,ChainController.W.setIsSwitchingNamespace(!1)}onNewNetwork(nextCaipNetwork){const prevCaipNetwork=this.caipNetwork,prevCaipNetworkId=prevCaipNetwork?.caipNetworkId?.toString(),prevChainNamespace=prevCaipNetwork?.chainNamespace,nextNetworkId=nextCaipNetwork?.caipNetworkId?.toString(),nextChainNamespace=nextCaipNetwork?.chainNamespace,networkIdChanged=prevCaipNetworkId!==nextNetworkId,isNetworkChangedInSameNamespace=networkIdChanged&&!(prevChainNamespace!==nextChainNamespace),wasUnsupportedNetwork=prevCaipNetwork?.name===ConstantsUtil.o.UNSUPPORTED_NETWORK_NAME,isConnectingExternal="ConnectingExternal"===RouterController.I.state.view,isNotConnected=!ChainController.W.getAccountData(nextCaipNetwork?.chainNamespace)?.caipAddress,isUnsupportedNetworkScreen="UnsupportedChain"===RouterController.I.state.view;let shouldGoBack=!1;ModalController.W.state.open&&!isConnectingExternal&&(isNotConnected?networkIdChanged&&(shouldGoBack=!0):(isUnsupportedNetworkScreen||isNetworkChangedInSameNamespace&&!wasUnsupportedNetwork)&&(shouldGoBack=!0)),shouldGoBack&&"SIWXSignMessage"!==RouterController.I.state.view&&RouterController.I.goBack(),this.caipNetwork=nextCaipNetwork}prefetch(){this.hasPrefetched||(ApiController.N.prefetch(),ApiController.N.fetchWalletsByPage({page:1}),this.hasPrefetched=!0)}}W3mModalBase.styles=w3m_modal_styles,w3m_modal_decorate([(0,decorators.MZ)({type:Boolean})],W3mModalBase.prototype,"enableEmbedded",void 0),w3m_modal_decorate([(0,decorators.wk)()],W3mModalBase.prototype,"open",void 0),w3m_modal_decorate([(0,decorators.wk)()],W3mModalBase.prototype,"caipAddress",void 0),w3m_modal_decorate([(0,decorators.wk)()],W3mModalBase.prototype,"caipNetwork",void 0),w3m_modal_decorate([(0,decorators.wk)()],W3mModalBase.prototype,"shake",void 0),w3m_modal_decorate([(0,decorators.wk)()],W3mModalBase.prototype,"filterByNamespace",void 0);let W3mModal=class W3mModal extends W3mModalBase{};W3mModal=w3m_modal_decorate([(0,esm_exports.EM)("w3m-modal")],W3mModal);let AppKitModal=class AppKitModal extends W3mModalBase{};AppKitModal=w3m_modal_decorate([(0,esm_exports.EM)("appkit-modal")],AppKitModal)},"./node_modules/lit-html/async-directive.js":(__unused_webpack_module,__webpack_exports__,__webpack_require__)=>{__webpack_require__.d(__webpack_exports__,{Kq:()=>f});var _directive_helpers_js__WEBPACK_IMPORTED_MODULE_0__=__webpack_require__("./node_modules/lit-html/directive-helpers.js"),_directive_js__WEBPACK_IMPORTED_MODULE_1__=__webpack_require__("./node_modules/lit-html/directive.js");const s=(i,t)=>{const e=i._$AN;if(void 0===e)return!1;for(const i of e)i._$AO?.(t,!1),s(i,t);return!0},o=i=>{let t,e;do{if(void 0===(t=i._$AM))break;e=t._$AN,e.delete(i),i=t}while(0===e?.size)},r=i=>{for(let t;t=i._$AM;i=t){let e=t._$AN;if(void 0===e)t._$AN=e=new Set;else if(e.has(i))break;e.add(i),c(t)}};function h(i){void 0!==this._$AN?(o(this),this._$AM=i,r(this)):this._$AM=i}function n(i,t=!1,e=0){const r=this._$AH,h=this._$AN;if(void 0!==h&&0!==h.size)if(t)if(Array.isArray(r))for(let i=e;i<r.length;i++)s(r[i],!1),o(r[i]);else null!=r&&(s(r,!1),o(r));else s(this,i)}const c=i=>{i.type==_directive_js__WEBPACK_IMPORTED_MODULE_1__.OA.CHILD&&(i._$AP??=n,i._$AQ??=h)};class f extends _directive_js__WEBPACK_IMPORTED_MODULE_1__.WL{constructor(){super(...arguments),this._$AN=void 0}_$AT(i,t,e){super._$AT(i,t,e),r(this),this.isConnected=i._$AU}_$AO(i,t=!0){i!==this.isConnected&&(this.isConnected=i,i?this.reconnected?.():this.disconnected?.()),t&&(s(this,i),o(this))}setValue(t){if((0,_directive_helpers_js__WEBPACK_IMPORTED_MODULE_0__.Rt)(this._$Ct))this._$Ct._$AI(t,this);else{const i=[...this._$Ct._$AH];i[this._$Ci]=t,this._$Ct._$AI(i,this,0)}}disconnected(){}reconnected(){}}},"./node_modules/lit-html/directive-helpers.js":(__unused_webpack_module,__webpack_exports__,__webpack_require__)=>{__webpack_require__.d(__webpack_exports__,{Rt:()=>f,sO:()=>i});var _lit_html_js__WEBPACK_IMPORTED_MODULE_0__=__webpack_require__("./node_modules/lit-html/lit-html.js");const{I:t}=_lit_html_js__WEBPACK_IMPORTED_MODULE_0__.ge,i=o=>null===o||"object"!=typeof o&&"function"!=typeof o,f=o=>void 0===o.strings},"./node_modules/lit-html/directive.js":(__unused_webpack_module,__webpack_exports__,__webpack_require__)=>{__webpack_require__.d(__webpack_exports__,{OA:()=>t,WL:()=>i,u$:()=>e});const t={ATTRIBUTE:1,CHILD:2,PROPERTY:3,BOOLEAN_ATTRIBUTE:4,EVENT:5,ELEMENT:6},e=t=>(...e)=>({_$litDirective$:t,values:e});class i{constructor(t){}get _$AU(){return this._$AM._$AU}_$AT(t,e,i){this._$Ct=t,this._$AM=e,this._$Ci=i}_$AS(t,e){return this.update(t,e)}update(t,e){return this.render(...e)}}},"./node_modules/lit-html/directives/class-map.js":(__unused_webpack_module,__webpack_exports__,__webpack_require__)=>{__webpack_require__.d(__webpack_exports__,{H:()=>e});var _lit_html_js__WEBPACK_IMPORTED_MODULE_0__=__webpack_require__("./node_modules/lit-html/lit-html.js"),_directive_js__WEBPACK_IMPORTED_MODULE_1__=__webpack_require__("./node_modules/lit-html/directive.js");const e=(0,_directive_js__WEBPACK_IMPORTED_MODULE_1__.u$)(class extends _directive_js__WEBPACK_IMPORTED_MODULE_1__.WL{constructor(t){if(super(t),t.type!==_directive_js__WEBPACK_IMPORTED_MODULE_1__.OA.ATTRIBUTE||"class"!==t.name||t.strings?.length>2)throw Error("`classMap()` can only be used in the `class` attribute and must be the only part in the attribute.")}render(t){return" "+Object.keys(t).filter(s=>t[s]).join(" ")+" "}update(s,[i]){if(void 0===this.st){this.st=new Set,void 0!==s.strings&&(this.nt=new Set(s.strings.join(" ").split(/\s/).filter(t=>""!==t)));for(const t in i)i[t]&&!this.nt?.has(t)&&this.st.add(t);return this.render(i)}const r=s.element.classList;for(const t of this.st)t in i||(r.remove(t),this.st.delete(t));for(const t in i){const s=!!i[t];s===this.st.has(t)||this.nt?.has(t)||(s?(r.add(t),this.st.add(t)):(r.remove(t),this.st.delete(t)))}return _lit_html_js__WEBPACK_IMPORTED_MODULE_0__.c0}})},"./node_modules/lit-html/directives/if-defined.js":(__unused_webpack_module,__webpack_exports__,__webpack_require__)=>{__webpack_require__.d(__webpack_exports__,{J:()=>o});var _lit_html_js__WEBPACK_IMPORTED_MODULE_0__=__webpack_require__("./node_modules/lit-html/lit-html.js");const o=o=>o??_lit_html_js__WEBPACK_IMPORTED_MODULE_0__.s6},"./node_modules/lit-html/directives/until.js":(__unused_webpack_module,__webpack_exports__,__webpack_require__)=>{__webpack_require__.d(__webpack_exports__,{T:()=>m});var lit_html=__webpack_require__("./node_modules/lit-html/lit-html.js"),directive_helpers=__webpack_require__("./node_modules/lit-html/directive-helpers.js"),async_directive=__webpack_require__("./node_modules/lit-html/async-directive.js");class s{constructor(t){this.G=t}disconnect(){this.G=void 0}reconnect(t){this.G=t}deref(){return this.G}}class i{constructor(){this.Y=void 0,this.Z=void 0}get(){return this.Y}pause(){this.Y??=new Promise(t=>this.Z=t)}resume(){this.Z?.(),this.Y=this.Z=void 0}}var directive=__webpack_require__("./node_modules/lit-html/directive.js");const n=t=>!(0,directive_helpers.sO)(t)&&"function"==typeof t.then,h=1073741823;class c extends async_directive.Kq{constructor(){super(...arguments),this._$Cwt=h,this._$Cbt=[],this._$CK=new s(this),this._$CX=new i}render(...s){return s.find(t=>!n(t))??lit_html.c0}update(s,i){const e=this._$Cbt;let r=e.length;this._$Cbt=i;const o=this._$CK,c=this._$CX;this.isConnected||this.disconnected();for(let t=0;t<i.length&&!(t>this._$Cwt);t++){const s=i[t];if(!n(s))return this._$Cwt=t,s;t<r&&s===e[t]||(this._$Cwt=h,r=0,Promise.resolve(s).then(async t=>{for(;c.get();)await c.get();const i=o.deref();if(void 0!==i){const e=i._$Cbt.indexOf(s);e>-1&&e<i._$Cwt&&(i._$Cwt=e,i.setValue(t))}}))}return lit_html.c0}disconnected(){this._$CK.disconnect(),this._$CX.pause()}reconnected(){this._$CK.reconnect(this),this._$CX.resume()}}const m=(0,directive.u$)(c)}}]);
//# sourceMappingURL=2992.8e7485e4.iframe.bundle.js.map