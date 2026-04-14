/*! For license information please see 9027.11a21fc0.iframe.bundle.js.LICENSE.txt */
(self.webpackChunklayerswap=self.webpackChunklayerswap||[]).push([[9027],{"./node_modules/@reown/appkit-scaffold-ui/dist/esm/exports/basic.js"(__unused_webpack_module,__webpack_exports__,__webpack_require__){"use strict";__webpack_require__.r(__webpack_exports__),__webpack_require__.d(__webpack_exports__,{W3mAllWalletsView:()=>W3mAllWalletsView,W3mConnectingWcBasicView:()=>W3mConnectingWcBasicView,W3mDownloadsView:()=>W3mDownloadsView});var lit=__webpack_require__("./node_modules/lit/index.js"),decorators=__webpack_require__("./node_modules/lit/decorators.js"),CoreHelperUtil=__webpack_require__("./node_modules/@reown/appkit-controllers/dist/esm/src/utils/CoreHelperUtil.js"),ApiController=__webpack_require__("./node_modules/@reown/appkit-controllers/dist/esm/src/controllers/ApiController.js"),OptionsController=__webpack_require__("./node_modules/@reown/appkit-controllers/dist/esm/src/controllers/OptionsController.js"),StorageUtil=__webpack_require__("./node_modules/@reown/appkit-controllers/dist/esm/src/utils/StorageUtil.js"),esm_exports=__webpack_require__("./node_modules/@reown/appkit-ui/dist/esm/exports/index.js"),if_defined=(__webpack_require__("./node_modules/@reown/appkit-ui/dist/esm/exports/wui-flex.js"),__webpack_require__("./node_modules/lit/directives/if-defined.js")),ConnectorController=__webpack_require__("./node_modules/@reown/appkit-controllers/dist/esm/src/controllers/ConnectorController.js"),EventsController=__webpack_require__("./node_modules/@reown/appkit-controllers/dist/esm/src/controllers/EventsController.js"),RouterController=__webpack_require__("./node_modules/@reown/appkit-controllers/dist/esm/src/controllers/RouterController.js"),ThemeUtil=(__webpack_require__("./node_modules/@reown/appkit-ui/dist/esm/src/components/wui-icon/index.js"),__webpack_require__("./node_modules/@reown/appkit-ui/dist/esm/src/components/wui-text/index.js"),__webpack_require__("./node_modules/@reown/appkit-ui/dist/esm/src/composites/wui-icon-box/index.js"),__webpack_require__("./node_modules/@reown/appkit-ui/dist/esm/src/utils/ThemeUtil.js")),WebComponentsUtil=__webpack_require__("./node_modules/@reown/appkit-ui/dist/esm/src/utils/WebComponentsUtil.js");__webpack_require__("./node_modules/@reown/appkit-ui/dist/esm/src/layout/wui-flex/index.js"),__webpack_require__("./node_modules/@reown/appkit-ui/dist/esm/src/components/wui-image/index.js");const styles=lit.AH`
  :host {
    position: relative;
    background-color: var(--wui-color-gray-glass-002);
    display: flex;
    justify-content: center;
    align-items: center;
    width: var(--local-size);
    height: var(--local-size);
    border-radius: inherit;
    border-radius: var(--local-border-radius);
  }

  :host > wui-flex {
    overflow: hidden;
    border-radius: inherit;
    border-radius: var(--local-border-radius);
  }

  :host::after {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    border-radius: inherit;
    border: 1px solid var(--wui-color-gray-glass-010);
    pointer-events: none;
  }

  :host([name='Extension'])::after {
    border: 1px solid var(--wui-color-accent-glass-010);
  }

  :host([data-wallet-icon='allWallets']) {
    background-color: var(--wui-all-wallets-bg-100);
  }

  :host([data-wallet-icon='allWallets'])::after {
    border: 1px solid var(--wui-color-accent-glass-010);
  }

  wui-icon[data-parent-size='inherit'] {
    width: 75%;
    height: 75%;
    align-items: center;
  }

  wui-icon[data-parent-size='sm'] {
    width: 18px;
    height: 18px;
  }

  wui-icon[data-parent-size='md'] {
    width: 24px;
    height: 24px;
  }

  wui-icon[data-parent-size='lg'] {
    width: 42px;
    height: 42px;
  }

  wui-icon[data-parent-size='full'] {
    width: 100%;
    height: 100%;
  }

  :host > wui-icon-box {
    position: absolute;
    overflow: hidden;
    right: -1px;
    bottom: -2px;
    z-index: 1;
    border: 2px solid var(--wui-color-bg-150, #1e1f1f);
    padding: 1px;
  }
`;var __decorate=function(decorators,target,key,desc){var d,c=arguments.length,r=c<3?target:null===desc?desc=Object.getOwnPropertyDescriptor(target,key):desc;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(decorators,target,key,desc);else for(var i=decorators.length-1;i>=0;i--)(d=decorators[i])&&(r=(c<3?d(r):c>3?d(target,key,r):d(target,key))||r);return c>3&&r&&Object.defineProperty(target,key,r),r};let WuiWalletImage=class WuiWalletImage extends lit.WF{constructor(){super(...arguments),this.size="md",this.name="",this.installed=!1,this.badgeSize="xs"}render(){let borderRadius="xxs";return borderRadius="lg"===this.size?"m":"md"===this.size?"xs":"xxs",this.style.cssText=`\n       --local-border-radius: var(--wui-border-radius-${borderRadius});\n       --local-size: var(--wui-wallet-image-size-${this.size});\n   `,this.walletIcon&&(this.dataset.walletIcon=this.walletIcon),lit.qy`
      <wui-flex justifyContent="center" alignItems="center"> ${this.templateVisual()} </wui-flex>
    `}templateVisual(){return this.imageSrc?lit.qy`<wui-image src=${this.imageSrc} alt=${this.name}></wui-image>`:this.walletIcon?lit.qy`<wui-icon
        data-parent-size="md"
        size="md"
        color="inherit"
        name=${this.walletIcon}
      ></wui-icon>`:lit.qy`<wui-icon
      data-parent-size=${this.size}
      size="inherit"
      color="inherit"
      name="walletPlaceholder"
    ></wui-icon>`}};WuiWalletImage.styles=[ThemeUtil.fD,ThemeUtil.W5,styles],__decorate([(0,decorators.MZ)()],WuiWalletImage.prototype,"size",void 0),__decorate([(0,decorators.MZ)()],WuiWalletImage.prototype,"name",void 0),__decorate([(0,decorators.MZ)()],WuiWalletImage.prototype,"imageSrc",void 0),__decorate([(0,decorators.MZ)()],WuiWalletImage.prototype,"walletIcon",void 0),__decorate([(0,decorators.MZ)({type:Boolean})],WuiWalletImage.prototype,"installed",void 0),__decorate([(0,decorators.MZ)()],WuiWalletImage.prototype,"badgeSize",void 0),WuiWalletImage=__decorate([(0,WebComponentsUtil.E)("wui-wallet-image")],WuiWalletImage);const wui_all_wallets_image_styles=lit.AH`
  :host {
    position: relative;
    border-radius: var(--wui-border-radius-xxs);
    width: 40px;
    height: 40px;
    overflow: hidden;
    background: var(--wui-color-gray-glass-002);
    display: flex;
    justify-content: center;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--wui-spacing-4xs);
    padding: 3.75px !important;
  }

  :host::after {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    border-radius: inherit;
    border: 1px solid var(--wui-color-gray-glass-010);
    pointer-events: none;
  }

  :host > wui-wallet-image {
    width: 14px;
    height: 14px;
    border-radius: var(--wui-border-radius-5xs);
  }

  :host > wui-flex {
    padding: 2px;
    position: fixed;
    overflow: hidden;
    left: 34px;
    bottom: 8px;
    background: var(--dark-background-150, #1e1f1f);
    border-radius: 50%;
    z-index: 2;
    display: flex;
  }
`;var wui_all_wallets_image_decorate=function(decorators,target,key,desc){var d,c=arguments.length,r=c<3?target:null===desc?desc=Object.getOwnPropertyDescriptor(target,key):desc;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(decorators,target,key,desc);else for(var i=decorators.length-1;i>=0;i--)(d=decorators[i])&&(r=(c<3?d(r):c>3?d(target,key,r):d(target,key))||r);return c>3&&r&&Object.defineProperty(target,key,r),r};let WuiAllWalletsImage=class WuiAllWalletsImage extends lit.WF{constructor(){super(...arguments),this.walletImages=[]}render(){const isPlaceholders=this.walletImages.length<4;return lit.qy`${this.walletImages.slice(0,4).map(({src,walletName})=>lit.qy`
            <wui-wallet-image
              size="inherit"
              imageSrc=${src}
              name=${(0,if_defined.J)(walletName)}
            ></wui-wallet-image>
          `)}
      ${isPlaceholders?[...Array(4-this.walletImages.length)].map(()=>lit.qy` <wui-wallet-image size="inherit" name=""></wui-wallet-image>`):null}
      <wui-flex>
        <wui-icon-box
          size="xxs"
          iconSize="xxs"
          iconcolor="success-100"
          backgroundcolor="success-100"
          icon="checkmark"
          background="opaque"
        ></wui-icon-box>
      </wui-flex>`}};WuiAllWalletsImage.styles=[ThemeUtil.W5,wui_all_wallets_image_styles],wui_all_wallets_image_decorate([(0,decorators.MZ)({type:Array})],WuiAllWalletsImage.prototype,"walletImages",void 0),WuiAllWalletsImage=wui_all_wallets_image_decorate([(0,WebComponentsUtil.E)("wui-all-wallets-image")],WuiAllWalletsImage);__webpack_require__("./node_modules/@reown/appkit-ui/dist/esm/src/composites/wui-tag/index.js");const wui_list_wallet_styles=lit.AH`
  button {
    column-gap: var(--wui-spacing-s);
    padding: 7px var(--wui-spacing-l) 7px var(--wui-spacing-xs);
    width: 100%;
    background-color: var(--wui-color-gray-glass-002);
    border-radius: var(--wui-border-radius-xs);
    color: var(--wui-color-fg-100);
  }

  button > wui-text:nth-child(2) {
    display: flex;
    flex: 1;
  }

  button:disabled {
    background-color: var(--wui-color-gray-glass-015);
    color: var(--wui-color-gray-glass-015);
  }

  button:disabled > wui-tag {
    background-color: var(--wui-color-gray-glass-010);
    color: var(--wui-color-fg-300);
  }

  wui-icon {
    color: var(--wui-color-fg-200) !important;
  }
`;var wui_list_wallet_decorate=function(decorators,target,key,desc){var d,c=arguments.length,r=c<3?target:null===desc?desc=Object.getOwnPropertyDescriptor(target,key):desc;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(decorators,target,key,desc);else for(var i=decorators.length-1;i>=0;i--)(d=decorators[i])&&(r=(c<3?d(r):c>3?d(target,key,r):d(target,key))||r);return c>3&&r&&Object.defineProperty(target,key,r),r};let WuiListWallet=class WuiListWallet extends lit.WF{constructor(){super(...arguments),this.walletImages=[],this.imageSrc="",this.name="",this.tabIdx=void 0,this.installed=!1,this.disabled=!1,this.showAllWallets=!1,this.loading=!1,this.loadingSpinnerColor="accent-100"}render(){return lit.qy`
      <button ?disabled=${this.disabled} tabindex=${(0,if_defined.J)(this.tabIdx)}>
        ${this.templateAllWallets()} ${this.templateWalletImage()}
        <wui-text variant="paragraph-500" color="inherit">${this.name}</wui-text>
        ${this.templateStatus()}
      </button>
    `}templateAllWallets(){return this.showAllWallets&&this.imageSrc?lit.qy` <wui-all-wallets-image .imageeSrc=${this.imageSrc}> </wui-all-wallets-image> `:this.showAllWallets&&this.walletIcon?lit.qy` <wui-wallet-image .walletIcon=${this.walletIcon} size="sm"> </wui-wallet-image> `:null}templateWalletImage(){return!this.showAllWallets&&this.imageSrc?lit.qy`<wui-wallet-image
        size="sm"
        imageSrc=${this.imageSrc}
        name=${this.name}
        .installed=${this.installed}
      ></wui-wallet-image>`:this.showAllWallets||this.imageSrc?null:lit.qy`<wui-wallet-image size="sm" name=${this.name}></wui-wallet-image>`}templateStatus(){return this.loading?lit.qy`<wui-loading-spinner
        size="lg"
        color=${this.loadingSpinnerColor}
      ></wui-loading-spinner>`:this.tagLabel&&this.tagVariant?lit.qy`<wui-tag variant=${this.tagVariant}>${this.tagLabel}</wui-tag>`:this.icon?lit.qy`<wui-icon color="inherit" size="sm" name=${this.icon}></wui-icon>`:null}};WuiListWallet.styles=[ThemeUtil.W5,ThemeUtil.fD,wui_list_wallet_styles],wui_list_wallet_decorate([(0,decorators.MZ)({type:Array})],WuiListWallet.prototype,"walletImages",void 0),wui_list_wallet_decorate([(0,decorators.MZ)()],WuiListWallet.prototype,"imageSrc",void 0),wui_list_wallet_decorate([(0,decorators.MZ)()],WuiListWallet.prototype,"name",void 0),wui_list_wallet_decorate([(0,decorators.MZ)()],WuiListWallet.prototype,"tagLabel",void 0),wui_list_wallet_decorate([(0,decorators.MZ)()],WuiListWallet.prototype,"tagVariant",void 0),wui_list_wallet_decorate([(0,decorators.MZ)()],WuiListWallet.prototype,"icon",void 0),wui_list_wallet_decorate([(0,decorators.MZ)()],WuiListWallet.prototype,"walletIcon",void 0),wui_list_wallet_decorate([(0,decorators.MZ)()],WuiListWallet.prototype,"tabIdx",void 0),wui_list_wallet_decorate([(0,decorators.MZ)({type:Boolean})],WuiListWallet.prototype,"installed",void 0),wui_list_wallet_decorate([(0,decorators.MZ)({type:Boolean})],WuiListWallet.prototype,"disabled",void 0),wui_list_wallet_decorate([(0,decorators.MZ)({type:Boolean})],WuiListWallet.prototype,"showAllWallets",void 0),wui_list_wallet_decorate([(0,decorators.MZ)({type:Boolean})],WuiListWallet.prototype,"loading",void 0),wui_list_wallet_decorate([(0,decorators.MZ)({type:String})],WuiListWallet.prototype,"loadingSpinnerColor",void 0),WuiListWallet=wui_list_wallet_decorate([(0,WebComponentsUtil.E)("wui-list-wallet")],WuiListWallet);var w3m_all_wallets_widget_decorate=function(decorators,target,key,desc){var d,c=arguments.length,r=c<3?target:null===desc?desc=Object.getOwnPropertyDescriptor(target,key):desc;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(decorators,target,key,desc);else for(var i=decorators.length-1;i>=0;i--)(d=decorators[i])&&(r=(c<3?d(r):c>3?d(target,key,r):d(target,key))||r);return c>3&&r&&Object.defineProperty(target,key,r),r};let W3mAllWalletsWidget=class W3mAllWalletsWidget extends lit.WF{constructor(){super(),this.unsubscribe=[],this.tabIdx=void 0,this.connectors=ConnectorController.a.state.connectors,this.count=ApiController.N.state.count,this.filteredCount=ApiController.N.state.filteredWallets.length,this.isFetchingRecommendedWallets=ApiController.N.state.isFetchingRecommendedWallets,this.unsubscribe.push(ConnectorController.a.subscribeKey("connectors",val=>this.connectors=val),ApiController.N.subscribeKey("count",val=>this.count=val),ApiController.N.subscribeKey("filteredWallets",val=>this.filteredCount=val.length),ApiController.N.subscribeKey("isFetchingRecommendedWallets",val=>this.isFetchingRecommendedWallets=val))}disconnectedCallback(){this.unsubscribe.forEach(unsubscribe=>unsubscribe())}render(){const wcConnector=this.connectors.find(c=>"walletConnect"===c.id),{allWallets}=OptionsController.H.state;if(!wcConnector||"HIDE"===allWallets)return null;if("ONLY_MOBILE"===allWallets&&!CoreHelperUtil.w.isMobile())return null;const featuredCount=ApiController.N.state.featured.length,rawCount=this.count+featuredCount,roundedCount=rawCount<10?rawCount:10*Math.floor(rawCount/10),count=this.filteredCount>0?this.filteredCount:roundedCount;let tagLabel=`${count}`;return this.filteredCount>0?tagLabel=`${this.filteredCount}`:count<rawCount&&(tagLabel=`${count}+`),lit.qy`
      <wui-list-wallet
        name="All Wallets"
        walletIcon="allWallets"
        showAllWallets
        @click=${this.onAllWallets.bind(this)}
        tagLabel=${tagLabel}
        tagVariant="shade"
        data-testid="all-wallets"
        tabIdx=${(0,if_defined.J)(this.tabIdx)}
        .loading=${this.isFetchingRecommendedWallets}
        loadingSpinnerColor=${this.isFetchingRecommendedWallets?"fg-300":"accent-100"}
      ></wui-list-wallet>
    `}onAllWallets(){EventsController.E.sendEvent({type:"track",event:"CLICK_ALL_WALLETS"}),RouterController.I.push("AllWallets")}};w3m_all_wallets_widget_decorate([(0,decorators.MZ)()],W3mAllWalletsWidget.prototype,"tabIdx",void 0),w3m_all_wallets_widget_decorate([(0,decorators.wk)()],W3mAllWalletsWidget.prototype,"connectors",void 0),w3m_all_wallets_widget_decorate([(0,decorators.wk)()],W3mAllWalletsWidget.prototype,"count",void 0),w3m_all_wallets_widget_decorate([(0,decorators.wk)()],W3mAllWalletsWidget.prototype,"filteredCount",void 0),w3m_all_wallets_widget_decorate([(0,decorators.wk)()],W3mAllWalletsWidget.prototype,"isFetchingRecommendedWallets",void 0),W3mAllWalletsWidget=w3m_all_wallets_widget_decorate([(0,esm_exports.EM)("w3m-all-wallets-widget")],W3mAllWalletsWidget);var AssetUtil=__webpack_require__("./node_modules/@reown/appkit-controllers/dist/esm/src/utils/AssetUtil.js"),ConnectorUtil=__webpack_require__("./node_modules/@reown/appkit-scaffold-ui/dist/esm/src/utils/ConnectorUtil.js"),w3m_connect_announced_widget_decorate=function(decorators,target,key,desc){var d,c=arguments.length,r=c<3?target:null===desc?desc=Object.getOwnPropertyDescriptor(target,key):desc;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(decorators,target,key,desc);else for(var i=decorators.length-1;i>=0;i--)(d=decorators[i])&&(r=(c<3?d(r):c>3?d(target,key,r):d(target,key))||r);return c>3&&r&&Object.defineProperty(target,key,r),r};let W3mConnectAnnouncedWidget=class W3mConnectAnnouncedWidget extends lit.WF{constructor(){super(),this.unsubscribe=[],this.tabIdx=void 0,this.connectors=ConnectorController.a.state.connectors,this.unsubscribe.push(ConnectorController.a.subscribeKey("connectors",val=>this.connectors=val))}disconnectedCallback(){this.unsubscribe.forEach(unsubscribe=>unsubscribe())}render(){const announcedConnectors=this.connectors.filter(connector=>"ANNOUNCED"===connector.type);return announcedConnectors?.length?lit.qy`
      <wui-flex flexDirection="column" gap="xs">
        ${announcedConnectors.filter(ConnectorUtil.g.showConnector).map(connector=>lit.qy`
              <wui-list-wallet
                imageSrc=${(0,if_defined.J)(AssetUtil.$.getConnectorImage(connector))}
                name=${connector.name??"Unknown"}
                @click=${()=>this.onConnector(connector)}
                tagVariant="success"
                tagLabel="installed"
                data-testid=${`wallet-selector-${connector.id}`}
                .installed=${!0}
                tabIdx=${(0,if_defined.J)(this.tabIdx)}
              >
              </wui-list-wallet>
            `)}
      </wui-flex>
    `:(this.style.cssText="display: none",null)}onConnector(connector){"walletConnect"===connector.id?CoreHelperUtil.w.isMobile()?RouterController.I.push("AllWallets"):RouterController.I.push("ConnectingWalletConnect"):RouterController.I.push("ConnectingExternal",{connector})}};w3m_connect_announced_widget_decorate([(0,decorators.MZ)()],W3mConnectAnnouncedWidget.prototype,"tabIdx",void 0),w3m_connect_announced_widget_decorate([(0,decorators.wk)()],W3mConnectAnnouncedWidget.prototype,"connectors",void 0),W3mConnectAnnouncedWidget=w3m_connect_announced_widget_decorate([(0,esm_exports.EM)("w3m-connect-announced-widget")],W3mConnectAnnouncedWidget);var ConnectionController=__webpack_require__("./node_modules/@reown/appkit-controllers/dist/esm/src/controllers/ConnectionController.js"),w3m_connect_custom_widget_decorate=function(decorators,target,key,desc){var d,c=arguments.length,r=c<3?target:null===desc?desc=Object.getOwnPropertyDescriptor(target,key):desc;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(decorators,target,key,desc);else for(var i=decorators.length-1;i>=0;i--)(d=decorators[i])&&(r=(c<3?d(r):c>3?d(target,key,r):d(target,key))||r);return c>3&&r&&Object.defineProperty(target,key,r),r};let W3mConnectCustomWidget=class W3mConnectCustomWidget extends lit.WF{constructor(){super(),this.unsubscribe=[],this.tabIdx=void 0,this.connectors=ConnectorController.a.state.connectors,this.loading=!1,this.unsubscribe.push(ConnectorController.a.subscribeKey("connectors",val=>this.connectors=val)),CoreHelperUtil.w.isTelegram()&&CoreHelperUtil.w.isIos()&&(this.loading=!ConnectionController.x.state.wcUri,this.unsubscribe.push(ConnectionController.x.subscribeKey("wcUri",val=>this.loading=!val)))}disconnectedCallback(){this.unsubscribe.forEach(unsubscribe=>unsubscribe())}render(){const{customWallets}=OptionsController.H.state;if(!customWallets?.length)return this.style.cssText="display: none",null;const wallets=this.filterOutDuplicateWallets(customWallets);return lit.qy`<wui-flex flexDirection="column" gap="xs">
      ${wallets.map(wallet=>lit.qy`
          <wui-list-wallet
            imageSrc=${(0,if_defined.J)(AssetUtil.$.getWalletImage(wallet))}
            name=${wallet.name??"Unknown"}
            @click=${()=>this.onConnectWallet(wallet)}
            data-testid=${`wallet-selector-${wallet.id}`}
            tabIdx=${(0,if_defined.J)(this.tabIdx)}
            ?loading=${this.loading}
          >
          </wui-list-wallet>
        `)}
    </wui-flex>`}filterOutDuplicateWallets(wallets){const recent=StorageUtil.i.getRecentWallets(),connectorRDNSs=this.connectors.map(connector=>connector.info?.rdns).filter(Boolean),recentRDNSs=recent.map(wallet=>wallet.rdns).filter(Boolean),allRDNSs=connectorRDNSs.concat(recentRDNSs);if(allRDNSs.includes("io.metamask.mobile")&&CoreHelperUtil.w.isMobile()){const index=allRDNSs.indexOf("io.metamask.mobile");allRDNSs[index]="io.metamask"}return wallets.filter(wallet=>!allRDNSs.includes(String(wallet?.rdns)))}onConnectWallet(wallet){this.loading||RouterController.I.push("ConnectingWalletConnect",{wallet})}};w3m_connect_custom_widget_decorate([(0,decorators.MZ)()],W3mConnectCustomWidget.prototype,"tabIdx",void 0),w3m_connect_custom_widget_decorate([(0,decorators.wk)()],W3mConnectCustomWidget.prototype,"connectors",void 0),w3m_connect_custom_widget_decorate([(0,decorators.wk)()],W3mConnectCustomWidget.prototype,"loading",void 0),W3mConnectCustomWidget=w3m_connect_custom_widget_decorate([(0,esm_exports.EM)("w3m-connect-custom-widget")],W3mConnectCustomWidget);var ConstantsUtil=__webpack_require__("./node_modules/@reown/appkit-common/dist/esm/src/utils/ConstantsUtil.js"),w3m_connect_external_widget_decorate=function(decorators,target,key,desc){var d,c=arguments.length,r=c<3?target:null===desc?desc=Object.getOwnPropertyDescriptor(target,key):desc;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(decorators,target,key,desc);else for(var i=decorators.length-1;i>=0;i--)(d=decorators[i])&&(r=(c<3?d(r):c>3?d(target,key,r):d(target,key))||r);return c>3&&r&&Object.defineProperty(target,key,r),r};let W3mConnectExternalWidget=class W3mConnectExternalWidget extends lit.WF{constructor(){super(),this.unsubscribe=[],this.tabIdx=void 0,this.connectors=ConnectorController.a.state.connectors,this.unsubscribe.push(ConnectorController.a.subscribeKey("connectors",val=>this.connectors=val))}disconnectedCallback(){this.unsubscribe.forEach(unsubscribe=>unsubscribe())}render(){const filteredOutCoinbaseConnectors=this.connectors.filter(connector=>"EXTERNAL"===connector.type).filter(ConnectorUtil.g.showConnector).filter(connector=>connector.id!==ConstantsUtil.o.CONNECTOR_ID.COINBASE_SDK);return filteredOutCoinbaseConnectors?.length?lit.qy`
      <wui-flex flexDirection="column" gap="xs">
        ${filteredOutCoinbaseConnectors.map(connector=>lit.qy`
            <wui-list-wallet
              imageSrc=${(0,if_defined.J)(AssetUtil.$.getConnectorImage(connector))}
              .installed=${!0}
              name=${connector.name??"Unknown"}
              data-testid=${`wallet-selector-external-${connector.id}`}
              @click=${()=>this.onConnector(connector)}
              tabIdx=${(0,if_defined.J)(this.tabIdx)}
            >
            </wui-list-wallet>
          `)}
      </wui-flex>
    `:(this.style.cssText="display: none",null)}onConnector(connector){RouterController.I.push("ConnectingExternal",{connector})}};w3m_connect_external_widget_decorate([(0,decorators.MZ)()],W3mConnectExternalWidget.prototype,"tabIdx",void 0),w3m_connect_external_widget_decorate([(0,decorators.wk)()],W3mConnectExternalWidget.prototype,"connectors",void 0),W3mConnectExternalWidget=w3m_connect_external_widget_decorate([(0,esm_exports.EM)("w3m-connect-external-widget")],W3mConnectExternalWidget);var w3m_connect_featured_widget_decorate=function(decorators,target,key,desc){var d,c=arguments.length,r=c<3?target:null===desc?desc=Object.getOwnPropertyDescriptor(target,key):desc;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(decorators,target,key,desc);else for(var i=decorators.length-1;i>=0;i--)(d=decorators[i])&&(r=(c<3?d(r):c>3?d(target,key,r):d(target,key))||r);return c>3&&r&&Object.defineProperty(target,key,r),r};let W3mConnectFeaturedWidget=class W3mConnectFeaturedWidget extends lit.WF{constructor(){super(...arguments),this.tabIdx=void 0,this.wallets=[]}render(){return this.wallets.length?lit.qy`
      <wui-flex flexDirection="column" gap="xs">
        ${this.wallets.map(wallet=>lit.qy`
            <wui-list-wallet
              data-testid=${`wallet-selector-featured-${wallet.id}`}
              imageSrc=${(0,if_defined.J)(AssetUtil.$.getWalletImage(wallet))}
              name=${wallet.name??"Unknown"}
              @click=${()=>this.onConnectWallet(wallet)}
              tabIdx=${(0,if_defined.J)(this.tabIdx)}
            >
            </wui-list-wallet>
          `)}
      </wui-flex>
    `:(this.style.cssText="display: none",null)}onConnectWallet(wallet){ConnectorController.a.selectWalletConnector(wallet)}};w3m_connect_featured_widget_decorate([(0,decorators.MZ)()],W3mConnectFeaturedWidget.prototype,"tabIdx",void 0),w3m_connect_featured_widget_decorate([(0,decorators.MZ)()],W3mConnectFeaturedWidget.prototype,"wallets",void 0),W3mConnectFeaturedWidget=w3m_connect_featured_widget_decorate([(0,esm_exports.EM)("w3m-connect-featured-widget")],W3mConnectFeaturedWidget);var w3m_connect_injected_widget_decorate=function(decorators,target,key,desc){var d,c=arguments.length,r=c<3?target:null===desc?desc=Object.getOwnPropertyDescriptor(target,key):desc;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(decorators,target,key,desc);else for(var i=decorators.length-1;i>=0;i--)(d=decorators[i])&&(r=(c<3?d(r):c>3?d(target,key,r):d(target,key))||r);return c>3&&r&&Object.defineProperty(target,key,r),r};let W3mConnectInjectedWidget=class W3mConnectInjectedWidget extends lit.WF{constructor(){super(...arguments),this.tabIdx=void 0,this.connectors=[]}render(){const injectedConnectors=this.connectors.filter(ConnectorUtil.g.showConnector);return 0===injectedConnectors.length?(this.style.cssText="display: none",null):lit.qy`
      <wui-flex flexDirection="column" gap="xs">
        ${injectedConnectors.map(connector=>lit.qy`
            <wui-list-wallet
              imageSrc=${(0,if_defined.J)(AssetUtil.$.getConnectorImage(connector))}
              .installed=${!0}
              name=${connector.name??"Unknown"}
              tagVariant="success"
              tagLabel="installed"
              data-testid=${`wallet-selector-${connector.id}`}
              @click=${()=>this.onConnector(connector)}
              tabIdx=${(0,if_defined.J)(this.tabIdx)}
            >
            </wui-list-wallet>
          `)}
      </wui-flex>
    `}onConnector(connector){ConnectorController.a.setActiveConnector(connector),RouterController.I.push("ConnectingExternal",{connector})}};w3m_connect_injected_widget_decorate([(0,decorators.MZ)()],W3mConnectInjectedWidget.prototype,"tabIdx",void 0),w3m_connect_injected_widget_decorate([(0,decorators.MZ)()],W3mConnectInjectedWidget.prototype,"connectors",void 0),W3mConnectInjectedWidget=w3m_connect_injected_widget_decorate([(0,esm_exports.EM)("w3m-connect-injected-widget")],W3mConnectInjectedWidget);var w3m_connect_multi_chain_widget_decorate=function(decorators,target,key,desc){var d,c=arguments.length,r=c<3?target:null===desc?desc=Object.getOwnPropertyDescriptor(target,key):desc;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(decorators,target,key,desc);else for(var i=decorators.length-1;i>=0;i--)(d=decorators[i])&&(r=(c<3?d(r):c>3?d(target,key,r):d(target,key))||r);return c>3&&r&&Object.defineProperty(target,key,r),r};let W3mConnectMultiChainWidget=class W3mConnectMultiChainWidget extends lit.WF{constructor(){super(),this.unsubscribe=[],this.tabIdx=void 0,this.connectors=ConnectorController.a.state.connectors,this.unsubscribe.push(ConnectorController.a.subscribeKey("connectors",val=>this.connectors=val))}disconnectedCallback(){this.unsubscribe.forEach(unsubscribe=>unsubscribe())}render(){const multiChainConnectors=this.connectors.filter(connector=>"MULTI_CHAIN"===connector.type&&"WalletConnect"!==connector.name);return multiChainConnectors?.length?lit.qy`
      <wui-flex flexDirection="column" gap="xs">
        ${multiChainConnectors.map(connector=>lit.qy`
            <wui-list-wallet
              imageSrc=${(0,if_defined.J)(AssetUtil.$.getConnectorImage(connector))}
              .installed=${!0}
              name=${connector.name??"Unknown"}
              tagVariant="shade"
              tagLabel="multichain"
              data-testid=${`wallet-selector-${connector.id}`}
              @click=${()=>this.onConnector(connector)}
              tabIdx=${(0,if_defined.J)(this.tabIdx)}
            >
            </wui-list-wallet>
          `)}
      </wui-flex>
    `:(this.style.cssText="display: none",null)}onConnector(connector){ConnectorController.a.setActiveConnector(connector),RouterController.I.push("ConnectingMultiChain")}};w3m_connect_multi_chain_widget_decorate([(0,decorators.MZ)()],W3mConnectMultiChainWidget.prototype,"tabIdx",void 0),w3m_connect_multi_chain_widget_decorate([(0,decorators.wk)()],W3mConnectMultiChainWidget.prototype,"connectors",void 0),W3mConnectMultiChainWidget=w3m_connect_multi_chain_widget_decorate([(0,esm_exports.EM)("w3m-connect-multi-chain-widget")],W3mConnectMultiChainWidget);var ChainController=__webpack_require__("./node_modules/@reown/appkit-controllers/dist/esm/src/controllers/ChainController.js"),WalletUtil=__webpack_require__("./node_modules/@reown/appkit-scaffold-ui/dist/esm/src/utils/WalletUtil.js"),w3m_connect_recent_widget_decorate=function(decorators,target,key,desc){var d,c=arguments.length,r=c<3?target:null===desc?desc=Object.getOwnPropertyDescriptor(target,key):desc;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(decorators,target,key,desc);else for(var i=decorators.length-1;i>=0;i--)(d=decorators[i])&&(r=(c<3?d(r):c>3?d(target,key,r):d(target,key))||r);return c>3&&r&&Object.defineProperty(target,key,r),r};let W3mConnectRecentWidget=class W3mConnectRecentWidget extends lit.WF{constructor(){super(),this.unsubscribe=[],this.tabIdx=void 0,this.connectors=ConnectorController.a.state.connectors,this.loading=!1,this.unsubscribe.push(ConnectorController.a.subscribeKey("connectors",val=>this.connectors=val)),CoreHelperUtil.w.isTelegram()&&CoreHelperUtil.w.isIos()&&(this.loading=!ConnectionController.x.state.wcUri,this.unsubscribe.push(ConnectionController.x.subscribeKey("wcUri",val=>this.loading=!val)))}render(){const filteredRecentWallets=StorageUtil.i.getRecentWallets().filter(wallet=>!WalletUtil.A.isExcluded(wallet)).filter(wallet=>!this.hasWalletConnector(wallet)).filter(wallet=>this.isWalletCompatibleWithCurrentChain(wallet));return filteredRecentWallets.length?lit.qy`
      <wui-flex flexDirection="column" gap="xs">
        ${filteredRecentWallets.map(wallet=>lit.qy`
            <wui-list-wallet
              imageSrc=${(0,if_defined.J)(AssetUtil.$.getWalletImage(wallet))}
              name=${wallet.name??"Unknown"}
              @click=${()=>this.onConnectWallet(wallet)}
              tagLabel="recent"
              tagVariant="shade"
              tabIdx=${(0,if_defined.J)(this.tabIdx)}
              ?loading=${this.loading}
            >
            </wui-list-wallet>
          `)}
      </wui-flex>
    `:(this.style.cssText="display: none",null)}onConnectWallet(wallet){this.loading||ConnectorController.a.selectWalletConnector(wallet)}hasWalletConnector(wallet){return this.connectors.some(connector=>connector.id===wallet.id||connector.name===wallet.name)}isWalletCompatibleWithCurrentChain(wallet){const currentNamespace=ChainController.W.state.activeChain;return!currentNamespace||!wallet.chains||wallet.chains.some(c=>{const chainNamespace=c.split(":")[0];return currentNamespace===chainNamespace})}};w3m_connect_recent_widget_decorate([(0,decorators.MZ)()],W3mConnectRecentWidget.prototype,"tabIdx",void 0),w3m_connect_recent_widget_decorate([(0,decorators.wk)()],W3mConnectRecentWidget.prototype,"connectors",void 0),w3m_connect_recent_widget_decorate([(0,decorators.wk)()],W3mConnectRecentWidget.prototype,"loading",void 0),W3mConnectRecentWidget=w3m_connect_recent_widget_decorate([(0,esm_exports.EM)("w3m-connect-recent-widget")],W3mConnectRecentWidget);var w3m_connect_recommended_widget_decorate=function(decorators,target,key,desc){var d,c=arguments.length,r=c<3?target:null===desc?desc=Object.getOwnPropertyDescriptor(target,key):desc;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(decorators,target,key,desc);else for(var i=decorators.length-1;i>=0;i--)(d=decorators[i])&&(r=(c<3?d(r):c>3?d(target,key,r):d(target,key))||r);return c>3&&r&&Object.defineProperty(target,key,r),r};let W3mConnectRecommendedWidget=class W3mConnectRecommendedWidget extends lit.WF{constructor(){super(),this.unsubscribe=[],this.tabIdx=void 0,this.wallets=[],this.loading=!1,CoreHelperUtil.w.isTelegram()&&CoreHelperUtil.w.isIos()&&(this.loading=!ConnectionController.x.state.wcUri,this.unsubscribe.push(ConnectionController.x.subscribeKey("wcUri",val=>this.loading=!val)))}render(){const{connectors}=ConnectorController.a.state,{customWallets,featuredWalletIds}=OptionsController.H.state,recentWallets=StorageUtil.i.getRecentWallets(),wcConnector=connectors.find(c=>"walletConnect"===c.id),injectedWallets=connectors.filter(c=>"INJECTED"===c.type||"ANNOUNCED"===c.type||"MULTI_CHAIN"===c.type).filter(i=>"Browser Wallet"!==i.name);if(!wcConnector)return null;if(featuredWalletIds||customWallets||!this.wallets.length)return this.style.cssText="display: none",null;const overrideLength=injectedWallets.length+recentWallets.length,maxRecommended=Math.max(0,2-overrideLength),wallets=WalletUtil.A.filterOutDuplicateWallets(this.wallets).slice(0,maxRecommended);return wallets.length?lit.qy`
      <wui-flex flexDirection="column" gap="xs">
        ${wallets.map(wallet=>lit.qy`
            <wui-list-wallet
              imageSrc=${(0,if_defined.J)(AssetUtil.$.getWalletImage(wallet))}
              name=${wallet?.name??"Unknown"}
              @click=${()=>this.onConnectWallet(wallet)}
              tabIdx=${(0,if_defined.J)(this.tabIdx)}
              ?loading=${this.loading}
            >
            </wui-list-wallet>
          `)}
      </wui-flex>
    `:(this.style.cssText="display: none",null)}onConnectWallet(wallet){if(this.loading)return;const connector=ConnectorController.a.getConnector(wallet.id,wallet.rdns);connector?RouterController.I.push("ConnectingExternal",{connector}):RouterController.I.push("ConnectingWalletConnect",{wallet})}};w3m_connect_recommended_widget_decorate([(0,decorators.MZ)()],W3mConnectRecommendedWidget.prototype,"tabIdx",void 0),w3m_connect_recommended_widget_decorate([(0,decorators.MZ)()],W3mConnectRecommendedWidget.prototype,"wallets",void 0),w3m_connect_recommended_widget_decorate([(0,decorators.wk)()],W3mConnectRecommendedWidget.prototype,"loading",void 0),W3mConnectRecommendedWidget=w3m_connect_recommended_widget_decorate([(0,esm_exports.EM)("w3m-connect-recommended-widget")],W3mConnectRecommendedWidget);var AssetController=__webpack_require__("./node_modules/@reown/appkit-controllers/dist/esm/src/controllers/AssetController.js"),w3m_connect_walletconnect_widget_decorate=function(decorators,target,key,desc){var d,c=arguments.length,r=c<3?target:null===desc?desc=Object.getOwnPropertyDescriptor(target,key):desc;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(decorators,target,key,desc);else for(var i=decorators.length-1;i>=0;i--)(d=decorators[i])&&(r=(c<3?d(r):c>3?d(target,key,r):d(target,key))||r);return c>3&&r&&Object.defineProperty(target,key,r),r};let W3mConnectWalletConnectWidget=class W3mConnectWalletConnectWidget extends lit.WF{constructor(){super(),this.unsubscribe=[],this.tabIdx=void 0,this.connectors=ConnectorController.a.state.connectors,this.connectorImages=AssetController.j.state.connectorImages,this.unsubscribe.push(ConnectorController.a.subscribeKey("connectors",val=>this.connectors=val),AssetController.j.subscribeKey("connectorImages",val=>this.connectorImages=val))}disconnectedCallback(){this.unsubscribe.forEach(unsubscribe=>unsubscribe())}render(){if(CoreHelperUtil.w.isMobile())return this.style.cssText="display: none",null;const connector=this.connectors.find(c=>"walletConnect"===c.id);if(!connector)return this.style.cssText="display: none",null;const connectorImage=connector.imageUrl||this.connectorImages[connector?.imageId??""];return lit.qy`
      <wui-list-wallet
        imageSrc=${(0,if_defined.J)(connectorImage)}
        name=${connector.name??"Unknown"}
        @click=${()=>this.onConnector(connector)}
        tagLabel="qr code"
        tagVariant="main"
        tabIdx=${(0,if_defined.J)(this.tabIdx)}
        data-testid="wallet-selector-walletconnect"
      >
      </wui-list-wallet>
    `}onConnector(connector){ConnectorController.a.setActiveConnector(connector),RouterController.I.push("ConnectingWalletConnect")}};w3m_connect_walletconnect_widget_decorate([(0,decorators.MZ)()],W3mConnectWalletConnectWidget.prototype,"tabIdx",void 0),w3m_connect_walletconnect_widget_decorate([(0,decorators.wk)()],W3mConnectWalletConnectWidget.prototype,"connectors",void 0),w3m_connect_walletconnect_widget_decorate([(0,decorators.wk)()],W3mConnectWalletConnectWidget.prototype,"connectorImages",void 0),W3mConnectWalletConnectWidget=w3m_connect_walletconnect_widget_decorate([(0,esm_exports.EM)("w3m-connect-walletconnect-widget")],W3mConnectWalletConnectWidget);const w3m_connector_list_styles=lit.AH`
  :host {
    margin-top: var(--wui-spacing-3xs);
  }
  wui-separator {
    margin: var(--wui-spacing-m) calc(var(--wui-spacing-m) * -1) var(--wui-spacing-xs)
      calc(var(--wui-spacing-m) * -1);
    width: calc(100% + var(--wui-spacing-s) * 2);
  }
`;var console=__webpack_require__("./node_modules/console-browserify/index.js"),w3m_connector_list_decorate=function(decorators,target,key,desc){var d,c=arguments.length,r=c<3?target:null===desc?desc=Object.getOwnPropertyDescriptor(target,key):desc;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(decorators,target,key,desc);else for(var i=decorators.length-1;i>=0;i--)(d=decorators[i])&&(r=(c<3?d(r):c>3?d(target,key,r):d(target,key))||r);return c>3&&r&&Object.defineProperty(target,key,r),r};let W3mConnectorList=class W3mConnectorList extends lit.WF{constructor(){super(),this.unsubscribe=[],this.tabIdx=void 0,this.connectors=ConnectorController.a.state.connectors,this.recommended=ApiController.N.state.recommended,this.featured=ApiController.N.state.featured,this.unsubscribe.push(ConnectorController.a.subscribeKey("connectors",val=>this.connectors=val),ApiController.N.subscribeKey("recommended",val=>this.recommended=val),ApiController.N.subscribeKey("featured",val=>this.featured=val))}disconnectedCallback(){this.unsubscribe.forEach(unsubscribe=>unsubscribe())}render(){return lit.qy`
      <wui-flex flexDirection="column" gap="xs"> ${this.connectorListTemplate()} </wui-flex>
    `}connectorListTemplate(){const{custom,recent,announced,injected,multiChain,recommended,featured,external}=ConnectorUtil.g.getConnectorsByType(this.connectors,this.recommended,this.featured);return ConnectorUtil.g.getConnectorTypeOrder({custom,recent,announced,injected,multiChain,recommended,featured,external}).map(type=>{switch(type){case"injected":return lit.qy`
            ${multiChain.length?lit.qy`<w3m-connect-multi-chain-widget
                  tabIdx=${(0,if_defined.J)(this.tabIdx)}
                ></w3m-connect-multi-chain-widget>`:null}
            ${announced.length?lit.qy`<w3m-connect-announced-widget
                  tabIdx=${(0,if_defined.J)(this.tabIdx)}
                ></w3m-connect-announced-widget>`:null}
            ${injected.length?lit.qy`<w3m-connect-injected-widget
                  .connectors=${injected}
                  tabIdx=${(0,if_defined.J)(this.tabIdx)}
                ></w3m-connect-injected-widget>`:null}
          `;case"walletConnect":return lit.qy`<w3m-connect-walletconnect-widget
            tabIdx=${(0,if_defined.J)(this.tabIdx)}
          ></w3m-connect-walletconnect-widget>`;case"recent":return lit.qy`<w3m-connect-recent-widget
            tabIdx=${(0,if_defined.J)(this.tabIdx)}
          ></w3m-connect-recent-widget>`;case"featured":return lit.qy`<w3m-connect-featured-widget
            .wallets=${featured}
            tabIdx=${(0,if_defined.J)(this.tabIdx)}
          ></w3m-connect-featured-widget>`;case"custom":return lit.qy`<w3m-connect-custom-widget
            tabIdx=${(0,if_defined.J)(this.tabIdx)}
          ></w3m-connect-custom-widget>`;case"external":return lit.qy`<w3m-connect-external-widget
            tabIdx=${(0,if_defined.J)(this.tabIdx)}
          ></w3m-connect-external-widget>`;case"recommended":return lit.qy`<w3m-connect-recommended-widget
            .wallets=${recommended}
            tabIdx=${(0,if_defined.J)(this.tabIdx)}
          ></w3m-connect-recommended-widget>`;default:return console.warn(`Unknown connector type: ${type}`),null}})}};W3mConnectorList.styles=w3m_connector_list_styles,w3m_connector_list_decorate([(0,decorators.MZ)()],W3mConnectorList.prototype,"tabIdx",void 0),w3m_connector_list_decorate([(0,decorators.wk)()],W3mConnectorList.prototype,"connectors",void 0),w3m_connector_list_decorate([(0,decorators.wk)()],W3mConnectorList.prototype,"recommended",void 0),w3m_connector_list_decorate([(0,decorators.wk)()],W3mConnectorList.prototype,"featured",void 0),W3mConnectorList=w3m_connector_list_decorate([(0,esm_exports.EM)("w3m-connector-list")],W3mConnectorList);var ModalController=__webpack_require__("./node_modules/@reown/appkit-controllers/dist/esm/src/controllers/ModalController.js"),SnackController=__webpack_require__("./node_modules/@reown/appkit-controllers/dist/esm/src/controllers/SnackController.js");const wui_tabs_styles=lit.AH`
  :host {
    display: inline-flex;
    background-color: var(--wui-color-gray-glass-002);
    border-radius: var(--wui-border-radius-3xl);
    padding: var(--wui-spacing-3xs);
    position: relative;
    height: 36px;
    min-height: 36px;
    overflow: hidden;
  }

  :host::before {
    content: '';
    position: absolute;
    pointer-events: none;
    top: 4px;
    left: 4px;
    display: block;
    width: var(--local-tab-width);
    height: 28px;
    border-radius: var(--wui-border-radius-3xl);
    background-color: var(--wui-color-gray-glass-002);
    box-shadow: inset 0 0 0 1px var(--wui-color-gray-glass-002);
    transform: translateX(calc(var(--local-tab) * var(--local-tab-width)));
    transition: transform var(--wui-ease-out-power-1) var(--wui-duration-md);
    will-change: background-color, opacity;
  }

  :host([data-type='flex'])::before {
    left: 3px;
    transform: translateX(calc((var(--local-tab) * 34px) + (var(--local-tab) * 4px)));
  }

  :host([data-type='flex']) {
    display: flex;
    padding: 0px 0px 0px 12px;
    gap: 4px;
  }

  :host([data-type='flex']) > button > wui-text {
    position: absolute;
    left: 18px;
    opacity: 0;
  }

  button[data-active='true'] > wui-icon,
  button[data-active='true'] > wui-text {
    color: var(--wui-color-fg-100);
  }

  button[data-active='false'] > wui-icon,
  button[data-active='false'] > wui-text {
    color: var(--wui-color-fg-200);
  }

  button[data-active='true']:disabled,
  button[data-active='false']:disabled {
    background-color: transparent;
    opacity: 0.5;
    cursor: not-allowed;
  }

  button[data-active='true']:disabled > wui-text {
    color: var(--wui-color-fg-200);
  }

  button[data-active='false']:disabled > wui-text {
    color: var(--wui-color-fg-300);
  }

  button > wui-icon,
  button > wui-text {
    pointer-events: none;
    transition: color var(--wui-e ase-out-power-1) var(--wui-duration-md);
    will-change: color;
  }

  button {
    width: var(--local-tab-width);
    transition: background-color var(--wui-ease-out-power-1) var(--wui-duration-md);
    will-change: background-color;
  }

  :host([data-type='flex']) > button {
    width: 34px;
    position: relative;
    display: flex;
    justify-content: flex-start;
  }

  button:hover:enabled,
  button:active:enabled {
    background-color: transparent !important;
  }

  button:hover:enabled > wui-icon,
  button:active:enabled > wui-icon {
    transition: all var(--wui-ease-out-power-1) var(--wui-duration-lg);
    color: var(--wui-color-fg-125);
  }

  button:hover:enabled > wui-text,
  button:active:enabled > wui-text {
    transition: all var(--wui-ease-out-power-1) var(--wui-duration-lg);
    color: var(--wui-color-fg-125);
  }

  button {
    border-radius: var(--wui-border-radius-3xl);
  }
`;var wui_tabs_decorate=function(decorators,target,key,desc){var d,c=arguments.length,r=c<3?target:null===desc?desc=Object.getOwnPropertyDescriptor(target,key):desc;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(decorators,target,key,desc);else for(var i=decorators.length-1;i>=0;i--)(d=decorators[i])&&(r=(c<3?d(r):c>3?d(target,key,r):d(target,key))||r);return c>3&&r&&Object.defineProperty(target,key,r),r};let WuiTabs=class WuiTabs extends lit.WF{constructor(){super(...arguments),this.tabs=[],this.onTabChange=()=>null,this.buttons=[],this.disabled=!1,this.localTabWidth="100px",this.activeTab=0,this.isDense=!1}render(){return this.isDense=this.tabs.length>3,this.style.cssText=`\n      --local-tab: ${this.activeTab};\n      --local-tab-width: ${this.localTabWidth};\n    `,this.dataset.type=this.isDense?"flex":"block",this.tabs.map((tab,index)=>{const isActive=index===this.activeTab;return lit.qy`
        <button
          ?disabled=${this.disabled}
          @click=${()=>this.onTabClick(index)}
          data-active=${isActive}
          data-testid="tab-${tab.label?.toLowerCase()}"
        >
          ${this.iconTemplate(tab)}
          <wui-text variant="small-600" color="inherit"> ${tab.label} </wui-text>
        </button>
      `})}firstUpdated(){this.shadowRoot&&this.isDense&&(this.buttons=[...this.shadowRoot.querySelectorAll("button")],setTimeout(()=>{this.animateTabs(0,!0)},0))}iconTemplate(tab){return tab.icon?lit.qy`<wui-icon size="xs" color="inherit" name=${tab.icon}></wui-icon>`:null}onTabClick(index){this.buttons&&this.animateTabs(index,!1),this.activeTab=index,this.onTabChange(index)}animateTabs(index,initialAnimation){const passiveBtn=this.buttons[this.activeTab],activeBtn=this.buttons[index],passiveBtnText=passiveBtn?.querySelector("wui-text"),activeBtnText=activeBtn?.querySelector("wui-text"),activeBtnBounds=activeBtn?.getBoundingClientRect(),activeBtnTextBounds=activeBtnText?.getBoundingClientRect();passiveBtn&&passiveBtnText&&!initialAnimation&&index!==this.activeTab&&(passiveBtnText.animate([{opacity:0}],{duration:50,easing:"ease",fill:"forwards"}),passiveBtn.animate([{width:"34px"}],{duration:500,easing:"ease",fill:"forwards"})),activeBtn&&activeBtnBounds&&activeBtnTextBounds&&activeBtnText&&(index!==this.activeTab||initialAnimation)&&(this.localTabWidth=`${Math.round(activeBtnBounds.width+activeBtnTextBounds.width)+6}px`,activeBtn.animate([{width:`${activeBtnBounds.width+activeBtnTextBounds.width}px`}],{duration:initialAnimation?0:500,fill:"forwards",easing:"ease"}),activeBtnText.animate([{opacity:1}],{duration:initialAnimation?0:125,delay:initialAnimation?0:200,fill:"forwards",easing:"ease"}))}};WuiTabs.styles=[ThemeUtil.W5,ThemeUtil.fD,wui_tabs_styles],wui_tabs_decorate([(0,decorators.MZ)({type:Array})],WuiTabs.prototype,"tabs",void 0),wui_tabs_decorate([(0,decorators.MZ)()],WuiTabs.prototype,"onTabChange",void 0),wui_tabs_decorate([(0,decorators.MZ)({type:Array})],WuiTabs.prototype,"buttons",void 0),wui_tabs_decorate([(0,decorators.MZ)({type:Boolean})],WuiTabs.prototype,"disabled",void 0),wui_tabs_decorate([(0,decorators.MZ)()],WuiTabs.prototype,"localTabWidth",void 0),wui_tabs_decorate([(0,decorators.wk)()],WuiTabs.prototype,"activeTab",void 0),wui_tabs_decorate([(0,decorators.wk)()],WuiTabs.prototype,"isDense",void 0),WuiTabs=wui_tabs_decorate([(0,WebComponentsUtil.E)("wui-tabs")],WuiTabs);var w3m_connecting_header_decorate=function(decorators,target,key,desc){var d,c=arguments.length,r=c<3?target:null===desc?desc=Object.getOwnPropertyDescriptor(target,key):desc;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(decorators,target,key,desc);else for(var i=decorators.length-1;i>=0;i--)(d=decorators[i])&&(r=(c<3?d(r):c>3?d(target,key,r):d(target,key))||r);return c>3&&r&&Object.defineProperty(target,key,r),r};let W3mConnectingHeader=class W3mConnectingHeader extends lit.WF{constructor(){super(...arguments),this.platformTabs=[],this.unsubscribe=[],this.platforms=[],this.onSelectPlatfrom=void 0}disconnectCallback(){this.unsubscribe.forEach(unsubscribe=>unsubscribe())}render(){const tabs=this.generateTabs();return lit.qy`
      <wui-flex justifyContent="center" .padding=${["0","0","l","0"]}>
        <wui-tabs .tabs=${tabs} .onTabChange=${this.onTabChange.bind(this)}></wui-tabs>
      </wui-flex>
    `}generateTabs(){const tabs=this.platforms.map(platform=>"browser"===platform?{label:"Browser",icon:"extension",platform:"browser"}:"mobile"===platform?{label:"Mobile",icon:"mobile",platform:"mobile"}:"qrcode"===platform?{label:"Mobile",icon:"mobile",platform:"qrcode"}:"web"===platform?{label:"Webapp",icon:"browser",platform:"web"}:"desktop"===platform?{label:"Desktop",icon:"desktop",platform:"desktop"}:{label:"Browser",icon:"extension",platform:"unsupported"});return this.platformTabs=tabs.map(({platform})=>platform),tabs}onTabChange(index){const tab=this.platformTabs[index];tab&&this.onSelectPlatfrom?.(tab)}};w3m_connecting_header_decorate([(0,decorators.MZ)({type:Array})],W3mConnectingHeader.prototype,"platforms",void 0),w3m_connecting_header_decorate([(0,decorators.MZ)()],W3mConnectingHeader.prototype,"onSelectPlatfrom",void 0),W3mConnectingHeader=w3m_connecting_header_decorate([(0,esm_exports.EM)("w3m-connecting-header")],W3mConnectingHeader);var ThemeController=__webpack_require__("./node_modules/@reown/appkit-controllers/dist/esm/src/controllers/ThemeController.js");__webpack_require__("./node_modules/@reown/appkit-ui/dist/esm/src/components/wui-loading-spinner/index.js");const wui_button_styles=lit.AH`
  :host {
    width: var(--local-width);
    position: relative;
  }

  button {
    border: none;
    border-radius: var(--local-border-radius);
    width: var(--local-width);
    white-space: nowrap;
  }

  /* -- Sizes --------------------------------------------------- */
  button[data-size='md'] {
    padding: 8.2px var(--wui-spacing-l) 9px var(--wui-spacing-l);
    height: 36px;
  }

  button[data-size='md'][data-icon-left='true'][data-icon-right='false'] {
    padding: 8.2px var(--wui-spacing-l) 9px var(--wui-spacing-s);
  }

  button[data-size='md'][data-icon-right='true'][data-icon-left='false'] {
    padding: 8.2px var(--wui-spacing-s) 9px var(--wui-spacing-l);
  }

  button[data-size='lg'] {
    padding: var(--wui-spacing-m) var(--wui-spacing-2l);
    height: 48px;
  }

  /* -- Variants --------------------------------------------------------- */
  button[data-variant='main'] {
    background-color: var(--wui-color-accent-100);
    color: var(--wui-color-inverse-100);
    border: none;
    box-shadow: inset 0 0 0 1px var(--wui-color-gray-glass-010);
  }

  button[data-variant='inverse'] {
    background-color: var(--wui-color-inverse-100);
    color: var(--wui-color-inverse-000);
    border: none;
    box-shadow: inset 0 0 0 1px var(--wui-color-gray-glass-010);
  }

  button[data-variant='accent'] {
    background-color: var(--wui-color-accent-glass-010);
    color: var(--wui-color-accent-100);
    border: none;
    box-shadow: inset 0 0 0 1px var(--wui-color-gray-glass-005);
  }

  button[data-variant='accent-error'] {
    background: var(--wui-color-error-glass-015);
    color: var(--wui-color-error-100);
    border: none;
    box-shadow: inset 0 0 0 1px var(--wui-color-error-glass-010);
  }

  button[data-variant='accent-success'] {
    background: var(--wui-color-success-glass-015);
    color: var(--wui-color-success-100);
    border: none;
    box-shadow: inset 0 0 0 1px var(--wui-color-success-glass-010);
  }

  button[data-variant='neutral'] {
    background: transparent;
    color: var(--wui-color-fg-100);
    border: none;
    box-shadow: inset 0 0 0 1px var(--wui-color-gray-glass-005);
  }

  /* -- Focus states --------------------------------------------------- */
  button[data-variant='main']:focus-visible:enabled {
    background-color: var(--wui-color-accent-090);
    box-shadow:
      inset 0 0 0 1px var(--wui-color-accent-100),
      0 0 0 4px var(--wui-color-accent-glass-020);
  }
  button[data-variant='inverse']:focus-visible:enabled {
    background-color: var(--wui-color-inverse-100);
    box-shadow:
      inset 0 0 0 1px var(--wui-color-gray-glass-010),
      0 0 0 4px var(--wui-color-accent-glass-020);
  }
  button[data-variant='accent']:focus-visible:enabled {
    background-color: var(--wui-color-accent-glass-010);
    box-shadow:
      inset 0 0 0 1px var(--wui-color-accent-100),
      0 0 0 4px var(--wui-color-accent-glass-020);
  }
  button[data-variant='accent-error']:focus-visible:enabled {
    background: var(--wui-color-error-glass-015);
    box-shadow:
      inset 0 0 0 1px var(--wui-color-error-100),
      0 0 0 4px var(--wui-color-error-glass-020);
  }
  button[data-variant='accent-success']:focus-visible:enabled {
    background: var(--wui-color-success-glass-015);
    box-shadow:
      inset 0 0 0 1px var(--wui-color-success-100),
      0 0 0 4px var(--wui-color-success-glass-020);
  }
  button[data-variant='neutral']:focus-visible:enabled {
    background: var(--wui-color-gray-glass-005);
    box-shadow:
      inset 0 0 0 1px var(--wui-color-gray-glass-010),
      0 0 0 4px var(--wui-color-gray-glass-002);
  }

  /* -- Hover & Active states ----------------------------------------------------------- */
  @media (hover: hover) and (pointer: fine) {
    button[data-variant='main']:hover:enabled {
      background-color: var(--wui-color-accent-090);
    }

    button[data-variant='main']:active:enabled {
      background-color: var(--wui-color-accent-080);
    }

    button[data-variant='accent']:hover:enabled {
      background-color: var(--wui-color-accent-glass-015);
    }

    button[data-variant='accent']:active:enabled {
      background-color: var(--wui-color-accent-glass-020);
    }

    button[data-variant='accent-error']:hover:enabled {
      background: var(--wui-color-error-glass-020);
      color: var(--wui-color-error-100);
    }

    button[data-variant='accent-error']:active:enabled {
      background: var(--wui-color-error-glass-030);
      color: var(--wui-color-error-100);
    }

    button[data-variant='accent-success']:hover:enabled {
      background: var(--wui-color-success-glass-020);
      color: var(--wui-color-success-100);
    }

    button[data-variant='accent-success']:active:enabled {
      background: var(--wui-color-success-glass-030);
      color: var(--wui-color-success-100);
    }

    button[data-variant='neutral']:hover:enabled {
      background: var(--wui-color-gray-glass-002);
    }

    button[data-variant='neutral']:active:enabled {
      background: var(--wui-color-gray-glass-005);
    }

    button[data-size='lg'][data-icon-left='true'][data-icon-right='false'] {
      padding-left: var(--wui-spacing-m);
    }

    button[data-size='lg'][data-icon-right='true'][data-icon-left='false'] {
      padding-right: var(--wui-spacing-m);
    }
  }

  /* -- Disabled state --------------------------------------------------- */
  button:disabled {
    background-color: var(--wui-color-gray-glass-002);
    box-shadow: inset 0 0 0 1px var(--wui-color-gray-glass-002);
    color: var(--wui-color-gray-glass-020);
    cursor: not-allowed;
  }

  button > wui-text {
    transition: opacity var(--wui-ease-out-power-1) var(--wui-duration-md);
    will-change: opacity;
    opacity: var(--local-opacity-100);
  }

  ::slotted(*) {
    transition: opacity var(--wui-ease-out-power-1) var(--wui-duration-md);
    will-change: opacity;
    opacity: var(--local-opacity-100);
  }

  wui-loading-spinner {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    opacity: var(--local-opacity-000);
  }
`;var wui_button_decorate=function(decorators,target,key,desc){var d,c=arguments.length,r=c<3?target:null===desc?desc=Object.getOwnPropertyDescriptor(target,key):desc;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(decorators,target,key,desc);else for(var i=decorators.length-1;i>=0;i--)(d=decorators[i])&&(r=(c<3?d(r):c>3?d(target,key,r):d(target,key))||r);return c>3&&r&&Object.defineProperty(target,key,r),r};const SPINNER_COLOR_BY_VARIANT={main:"inverse-100",inverse:"inverse-000",accent:"accent-100","accent-error":"error-100","accent-success":"success-100",neutral:"fg-100",disabled:"gray-glass-020"},TEXT_VARIANT_BY_SIZE={lg:"paragraph-600",md:"small-600"},SPINNER_SIZE_BY_SIZE={lg:"md",md:"md"};let WuiButton=class WuiButton extends lit.WF{constructor(){super(...arguments),this.size="lg",this.disabled=!1,this.fullWidth=!1,this.loading=!1,this.variant="main",this.hasIconLeft=!1,this.hasIconRight=!1,this.borderRadius="m"}render(){this.style.cssText=`\n    --local-width: ${this.fullWidth?"100%":"auto"};\n    --local-opacity-100: ${this.loading?0:1};\n    --local-opacity-000: ${this.loading?1:0};\n    --local-border-radius: var(--wui-border-radius-${this.borderRadius});\n    `;const textVariant=this.textVariant??TEXT_VARIANT_BY_SIZE[this.size];return lit.qy`
      <button
        data-variant=${this.variant}
        data-icon-left=${this.hasIconLeft}
        data-icon-right=${this.hasIconRight}
        data-size=${this.size}
        ?disabled=${this.disabled}
      >
        ${this.loadingTemplate()}
        <slot name="iconLeft" @slotchange=${()=>this.handleSlotLeftChange()}></slot>
        <wui-text variant=${textVariant} color="inherit">
          <slot></slot>
        </wui-text>
        <slot name="iconRight" @slotchange=${()=>this.handleSlotRightChange()}></slot>
      </button>
    `}handleSlotLeftChange(){this.hasIconLeft=!0}handleSlotRightChange(){this.hasIconRight=!0}loadingTemplate(){if(this.loading){const size=SPINNER_SIZE_BY_SIZE[this.size],color=this.disabled?SPINNER_COLOR_BY_VARIANT.disabled:SPINNER_COLOR_BY_VARIANT[this.variant];return lit.qy`<wui-loading-spinner color=${color} size=${size}></wui-loading-spinner>`}return lit.qy``}};WuiButton.styles=[ThemeUtil.W5,ThemeUtil.fD,wui_button_styles],wui_button_decorate([(0,decorators.MZ)()],WuiButton.prototype,"size",void 0),wui_button_decorate([(0,decorators.MZ)({type:Boolean})],WuiButton.prototype,"disabled",void 0),wui_button_decorate([(0,decorators.MZ)({type:Boolean})],WuiButton.prototype,"fullWidth",void 0),wui_button_decorate([(0,decorators.MZ)({type:Boolean})],WuiButton.prototype,"loading",void 0),wui_button_decorate([(0,decorators.MZ)()],WuiButton.prototype,"variant",void 0),wui_button_decorate([(0,decorators.MZ)({type:Boolean})],WuiButton.prototype,"hasIconLeft",void 0),wui_button_decorate([(0,decorators.MZ)({type:Boolean})],WuiButton.prototype,"hasIconRight",void 0),wui_button_decorate([(0,decorators.MZ)()],WuiButton.prototype,"borderRadius",void 0),wui_button_decorate([(0,decorators.MZ)()],WuiButton.prototype,"textVariant",void 0),WuiButton=wui_button_decorate([(0,WebComponentsUtil.E)("wui-button")],WuiButton);__webpack_require__("./node_modules/@reown/appkit-ui/dist/esm/exports/wui-icon.js");const wui_link_styles=lit.AH`
  button {
    padding: var(--wui-spacing-4xs) var(--wui-spacing-xxs);
    border-radius: var(--wui-border-radius-3xs);
    background-color: transparent;
    color: var(--wui-color-accent-100);
  }

  button:disabled {
    background-color: transparent;
    color: var(--wui-color-gray-glass-015);
  }

  button:hover {
    background-color: var(--wui-color-gray-glass-005);
  }
`;var wui_link_decorate=function(decorators,target,key,desc){var d,c=arguments.length,r=c<3?target:null===desc?desc=Object.getOwnPropertyDescriptor(target,key):desc;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(decorators,target,key,desc);else for(var i=decorators.length-1;i>=0;i--)(d=decorators[i])&&(r=(c<3?d(r):c>3?d(target,key,r):d(target,key))||r);return c>3&&r&&Object.defineProperty(target,key,r),r};let WuiLink=class WuiLink extends lit.WF{constructor(){super(...arguments),this.tabIdx=void 0,this.disabled=!1,this.color="inherit"}render(){return lit.qy`
      <button ?disabled=${this.disabled} tabindex=${(0,if_defined.J)(this.tabIdx)}>
        <slot name="iconLeft"></slot>
        <wui-text variant="small-600" color=${this.color}>
          <slot></slot>
        </wui-text>
        <slot name="iconRight"></slot>
      </button>
    `}};WuiLink.styles=[ThemeUtil.W5,ThemeUtil.fD,wui_link_styles],wui_link_decorate([(0,decorators.MZ)()],WuiLink.prototype,"tabIdx",void 0),wui_link_decorate([(0,decorators.MZ)({type:Boolean})],WuiLink.prototype,"disabled",void 0),wui_link_decorate([(0,decorators.MZ)()],WuiLink.prototype,"color",void 0),WuiLink=wui_link_decorate([(0,WebComponentsUtil.E)("wui-link")],WuiLink);const wui_loading_thumbnail_styles=lit.AH`
  :host {
    display: block;
    width: var(--wui-box-size-md);
    height: var(--wui-box-size-md);
  }

  svg {
    width: var(--wui-box-size-md);
    height: var(--wui-box-size-md);
  }

  rect {
    fill: none;
    stroke: var(--wui-color-accent-100);
    stroke-width: 4px;
    stroke-linecap: round;
    animation: dash 1s linear infinite;
  }

  @keyframes dash {
    to {
      stroke-dashoffset: 0px;
    }
  }
`;var wui_loading_thumbnail_decorate=function(decorators,target,key,desc){var d,c=arguments.length,r=c<3?target:null===desc?desc=Object.getOwnPropertyDescriptor(target,key):desc;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(decorators,target,key,desc);else for(var i=decorators.length-1;i>=0;i--)(d=decorators[i])&&(r=(c<3?d(r):c>3?d(target,key,r):d(target,key))||r);return c>3&&r&&Object.defineProperty(target,key,r),r};let WuiLoadingThumbnail=class WuiLoadingThumbnail extends lit.WF{constructor(){super(...arguments),this.radius=36}render(){return this.svgLoaderTemplate()}svgLoaderTemplate(){const radius=this.radius>50?50:this.radius,radiusFactor=36-radius,dashArrayStart=116+radiusFactor,dashArrayEnd=245+radiusFactor,dashOffset=360+1.75*radiusFactor;return lit.qy`
      <svg viewBox="0 0 110 110" width="110" height="110">
        <rect
          x="2"
          y="2"
          width="106"
          height="106"
          rx=${radius}
          stroke-dasharray="${dashArrayStart} ${dashArrayEnd}"
          stroke-dashoffset=${dashOffset}
        />
      </svg>
    `}};WuiLoadingThumbnail.styles=[ThemeUtil.W5,wui_loading_thumbnail_styles],wui_loading_thumbnail_decorate([(0,decorators.MZ)({type:Number})],WuiLoadingThumbnail.prototype,"radius",void 0),WuiLoadingThumbnail=wui_loading_thumbnail_decorate([(0,WebComponentsUtil.E)("wui-loading-thumbnail")],WuiLoadingThumbnail);__webpack_require__("./node_modules/@reown/appkit-ui/dist/esm/exports/wui-text.js");const wui_chip_button_styles=lit.AH`
  button {
    border: none;
    border-radius: var(--wui-border-radius-3xl);
  }

  button[data-variant='main'] {
    background-color: var(--wui-color-accent-100);
    color: var(--wui-color-inverse-100);
    box-shadow: inset 0 0 0 1px var(--wui-color-gray-glass-010);
  }

  button[data-variant='accent'] {
    background-color: var(--wui-color-accent-glass-010);
    color: var(--wui-color-accent-100);
    box-shadow: inset 0 0 0 1px var(--wui-color-gray-glass-005);
  }

  button[data-variant='gray'] {
    background-color: transparent;
    color: var(--wui-color-fg-200);
    box-shadow: inset 0 0 0 1px var(--wui-color-gray-glass-010);
  }

  button[data-variant='shade'] {
    background-color: transparent;
    color: var(--wui-color-accent-100);
    box-shadow: inset 0 0 0 1px var(--wui-color-gray-glass-010);
  }

  button[data-size='sm'] {
    height: 32px;
    padding: 0 var(--wui-spacing-s);
  }

  button[data-size='md'] {
    height: 40px;
    padding: 0 var(--wui-spacing-l);
  }

  button[data-size='sm'] > wui-image {
    width: 16px;
    height: 16px;
  }

  button[data-size='md'] > wui-image {
    width: 24px;
    height: 24px;
  }

  button[data-size='sm'] > wui-icon {
    width: 12px;
    height: 12px;
  }

  button[data-size='md'] > wui-icon {
    width: 14px;
    height: 14px;
  }

  wui-image {
    border-radius: var(--wui-border-radius-3xl);
    overflow: hidden;
  }

  button.disabled > wui-icon,
  button.disabled > wui-image {
    filter: grayscale(1);
  }

  button[data-variant='main'] > wui-image {
    box-shadow: inset 0 0 0 1px var(--wui-color-accent-090);
  }

  button[data-variant='shade'] > wui-image,
  button[data-variant='gray'] > wui-image {
    box-shadow: inset 0 0 0 1px var(--wui-color-gray-glass-010);
  }

  @media (hover: hover) and (pointer: fine) {
    button[data-variant='main']:focus-visible {
      background-color: var(--wui-color-accent-090);
    }

    button[data-variant='main']:hover:enabled {
      background-color: var(--wui-color-accent-090);
    }

    button[data-variant='main']:active:enabled {
      background-color: var(--wui-color-accent-080);
    }

    button[data-variant='accent']:hover:enabled {
      background-color: var(--wui-color-accent-glass-015);
    }

    button[data-variant='accent']:active:enabled {
      background-color: var(--wui-color-accent-glass-020);
    }

    button[data-variant='shade']:focus-visible,
    button[data-variant='gray']:focus-visible,
    button[data-variant='shade']:hover,
    button[data-variant='gray']:hover {
      background-color: var(--wui-color-gray-glass-002);
    }

    button[data-variant='gray']:active,
    button[data-variant='shade']:active {
      background-color: var(--wui-color-gray-glass-005);
    }
  }

  button.disabled {
    color: var(--wui-color-gray-glass-020);
    background-color: var(--wui-color-gray-glass-002);
    box-shadow: inset 0 0 0 1px var(--wui-color-gray-glass-002);
    pointer-events: none;
  }
`;var wui_chip_button_decorate=function(decorators,target,key,desc){var d,c=arguments.length,r=c<3?target:null===desc?desc=Object.getOwnPropertyDescriptor(target,key):desc;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(decorators,target,key,desc);else for(var i=decorators.length-1;i>=0;i--)(d=decorators[i])&&(r=(c<3?d(r):c>3?d(target,key,r):d(target,key))||r);return c>3&&r&&Object.defineProperty(target,key,r),r};let WuiChipButton=class WuiChipButton extends lit.WF{constructor(){super(...arguments),this.variant="accent",this.imageSrc="",this.disabled=!1,this.icon="externalLink",this.size="md",this.text=""}render(){const textVariant="sm"===this.size?"small-600":"paragraph-600";return lit.qy`
      <button
        class=${this.disabled?"disabled":""}
        data-variant=${this.variant}
        data-size=${this.size}
      >
        ${this.imageSrc?lit.qy`<wui-image src=${this.imageSrc}></wui-image>`:null}
        <wui-text variant=${textVariant} color="inherit"> ${this.text} </wui-text>
        <wui-icon name=${this.icon} color="inherit" size="inherit"></wui-icon>
      </button>
    `}};WuiChipButton.styles=[ThemeUtil.W5,ThemeUtil.fD,wui_chip_button_styles],wui_chip_button_decorate([(0,decorators.MZ)()],WuiChipButton.prototype,"variant",void 0),wui_chip_button_decorate([(0,decorators.MZ)()],WuiChipButton.prototype,"imageSrc",void 0),wui_chip_button_decorate([(0,decorators.MZ)({type:Boolean})],WuiChipButton.prototype,"disabled",void 0),wui_chip_button_decorate([(0,decorators.MZ)()],WuiChipButton.prototype,"icon",void 0),wui_chip_button_decorate([(0,decorators.MZ)()],WuiChipButton.prototype,"size",void 0),wui_chip_button_decorate([(0,decorators.MZ)()],WuiChipButton.prototype,"text",void 0),WuiChipButton=wui_chip_button_decorate([(0,WebComponentsUtil.E)("wui-chip-button")],WuiChipButton);const wui_cta_button_styles=lit.AH`
  wui-flex {
    width: 100%;
    background-color: var(--wui-color-gray-glass-002);
    border-radius: var(--wui-border-radius-xs);
  }
`;var wui_cta_button_decorate=function(decorators,target,key,desc){var d,c=arguments.length,r=c<3?target:null===desc?desc=Object.getOwnPropertyDescriptor(target,key):desc;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(decorators,target,key,desc);else for(var i=decorators.length-1;i>=0;i--)(d=decorators[i])&&(r=(c<3?d(r):c>3?d(target,key,r):d(target,key))||r);return c>3&&r&&Object.defineProperty(target,key,r),r};let WuiCtaButton=class WuiCtaButton extends lit.WF{constructor(){super(...arguments),this.disabled=!1,this.label="",this.buttonLabel=""}render(){return lit.qy`
      <wui-flex
        justifyContent="space-between"
        alignItems="center"
        .padding=${["1xs","2l","1xs","2l"]}
      >
        <wui-text variant="paragraph-500" color="fg-200">${this.label}</wui-text>
        <wui-chip-button size="sm" variant="shade" text=${this.buttonLabel} icon="chevronRight">
        </wui-chip-button>
      </wui-flex>
    `}};WuiCtaButton.styles=[ThemeUtil.W5,ThemeUtil.fD,wui_cta_button_styles],wui_cta_button_decorate([(0,decorators.MZ)({type:Boolean})],WuiCtaButton.prototype,"disabled",void 0),wui_cta_button_decorate([(0,decorators.MZ)()],WuiCtaButton.prototype,"label",void 0),wui_cta_button_decorate([(0,decorators.MZ)()],WuiCtaButton.prototype,"buttonLabel",void 0),WuiCtaButton=wui_cta_button_decorate([(0,WebComponentsUtil.E)("wui-cta-button")],WuiCtaButton);const w3m_mobile_download_links_styles=lit.AH`
  :host {
    display: block;
    padding: 0 var(--wui-spacing-xl) var(--wui-spacing-xl);
  }
`;var w3m_mobile_download_links_decorate=function(decorators,target,key,desc){var d,c=arguments.length,r=c<3?target:null===desc?desc=Object.getOwnPropertyDescriptor(target,key):desc;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(decorators,target,key,desc);else for(var i=decorators.length-1;i>=0;i--)(d=decorators[i])&&(r=(c<3?d(r):c>3?d(target,key,r):d(target,key))||r);return c>3&&r&&Object.defineProperty(target,key,r),r};let W3mMobileDownloadLinks=class W3mMobileDownloadLinks extends lit.WF{constructor(){super(...arguments),this.wallet=void 0}render(){if(!this.wallet)return this.style.display="none",null;const{name,app_store,play_store,chrome_store,homepage}=this.wallet,isMobile=CoreHelperUtil.w.isMobile(),isIos=CoreHelperUtil.w.isIos(),isAndroid=CoreHelperUtil.w.isAndroid(),isMultiple=[app_store,play_store,homepage,chrome_store].filter(Boolean).length>1,shortName=esm_exports.Zv.getTruncateString({string:name,charsStart:12,charsEnd:0,truncate:"end"});return isMultiple&&!isMobile?lit.qy`
        <wui-cta-button
          label=${`Don't have ${shortName}?`}
          buttonLabel="Get"
          @click=${()=>RouterController.I.push("Downloads",{wallet:this.wallet})}
        ></wui-cta-button>
      `:!isMultiple&&homepage?lit.qy`
        <wui-cta-button
          label=${`Don't have ${shortName}?`}
          buttonLabel="Get"
          @click=${this.onHomePage.bind(this)}
        ></wui-cta-button>
      `:app_store&&isIos?lit.qy`
        <wui-cta-button
          label=${`Don't have ${shortName}?`}
          buttonLabel="Get"
          @click=${this.onAppStore.bind(this)}
        ></wui-cta-button>
      `:play_store&&isAndroid?lit.qy`
        <wui-cta-button
          label=${`Don't have ${shortName}?`}
          buttonLabel="Get"
          @click=${this.onPlayStore.bind(this)}
        ></wui-cta-button>
      `:(this.style.display="none",null)}onAppStore(){this.wallet?.app_store&&CoreHelperUtil.w.openHref(this.wallet.app_store,"_blank")}onPlayStore(){this.wallet?.play_store&&CoreHelperUtil.w.openHref(this.wallet.play_store,"_blank")}onHomePage(){this.wallet?.homepage&&CoreHelperUtil.w.openHref(this.wallet.homepage,"_blank")}};W3mMobileDownloadLinks.styles=[w3m_mobile_download_links_styles],w3m_mobile_download_links_decorate([(0,decorators.MZ)({type:Object})],W3mMobileDownloadLinks.prototype,"wallet",void 0),W3mMobileDownloadLinks=w3m_mobile_download_links_decorate([(0,esm_exports.EM)("w3m-mobile-download-links")],W3mMobileDownloadLinks);const w3m_connecting_widget_styles=lit.AH`
  @keyframes shake {
    0% {
      transform: translateX(0);
    }
    25% {
      transform: translateX(3px);
    }
    50% {
      transform: translateX(-3px);
    }
    75% {
      transform: translateX(3px);
    }
    100% {
      transform: translateX(0);
    }
  }

  wui-flex:first-child:not(:only-child) {
    position: relative;
  }

  wui-loading-thumbnail {
    position: absolute;
  }

  wui-icon-box {
    position: absolute;
    right: calc(var(--wui-spacing-3xs) * -1);
    bottom: calc(var(--wui-spacing-3xs) * -1);
    opacity: 0;
    transform: scale(0.5);
    transition-property: opacity, transform;
    transition-duration: var(--wui-duration-lg);
    transition-timing-function: var(--wui-ease-out-power-2);
    will-change: opacity, transform;
  }

  wui-text[align='center'] {
    width: 100%;
    padding: 0px var(--wui-spacing-l);
  }

  [data-error='true'] wui-icon-box {
    opacity: 1;
    transform: scale(1);
  }

  [data-error='true'] > wui-flex:first-child {
    animation: shake 250ms cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
  }

  [data-retry='false'] wui-link {
    display: none;
  }

  [data-retry='true'] wui-link {
    display: block;
    opacity: 1;
  }
`;var w3m_connecting_widget_decorate=function(decorators,target,key,desc){var d,c=arguments.length,r=c<3?target:null===desc?desc=Object.getOwnPropertyDescriptor(target,key):desc;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(decorators,target,key,desc);else for(var i=decorators.length-1;i>=0;i--)(d=decorators[i])&&(r=(c<3?d(r):c>3?d(target,key,r):d(target,key))||r);return c>3&&r&&Object.defineProperty(target,key,r),r};class W3mConnectingWidget extends lit.WF{constructor(){super(),this.wallet=RouterController.I.state.data?.wallet,this.connector=RouterController.I.state.data?.connector,this.timeout=void 0,this.secondaryBtnIcon="refresh",this.onConnect=void 0,this.onRender=void 0,this.onAutoConnect=void 0,this.isWalletConnect=!0,this.unsubscribe=[],this.imageSrc=AssetUtil.$.getWalletImage(this.wallet)??AssetUtil.$.getConnectorImage(this.connector),this.name=this.wallet?.name??this.connector?.name??"Wallet",this.isRetrying=!1,this.uri=ConnectionController.x.state.wcUri,this.error=ConnectionController.x.state.wcError,this.ready=!1,this.showRetry=!1,this.secondaryBtnLabel="Try again",this.secondaryLabel="Accept connection request in the wallet",this.isLoading=!1,this.isMobile=!1,this.onRetry=void 0,this.unsubscribe.push(ConnectionController.x.subscribeKey("wcUri",val=>{this.uri=val,this.isRetrying&&this.onRetry&&(this.isRetrying=!1,this.onConnect?.())}),ConnectionController.x.subscribeKey("wcError",val=>this.error=val)),(CoreHelperUtil.w.isTelegram()||CoreHelperUtil.w.isSafari())&&CoreHelperUtil.w.isIos()&&ConnectionController.x.state.wcUri&&this.onConnect?.()}firstUpdated(){this.onAutoConnect?.(),this.showRetry=!this.onAutoConnect}disconnectedCallback(){this.unsubscribe.forEach(unsubscribe=>unsubscribe()),ConnectionController.x.setWcError(!1),clearTimeout(this.timeout)}render(){this.onRender?.(),this.onShowRetry();const subLabel=this.error?"Connection can be declined if a previous request is still active":this.secondaryLabel;let label=`Continue in ${this.name}`;return this.error&&(label="Connection declined"),lit.qy`
      <wui-flex
        data-error=${(0,if_defined.J)(this.error)}
        data-retry=${this.showRetry}
        flexDirection="column"
        alignItems="center"
        .padding=${["3xl","xl","xl","xl"]}
        gap="xl"
      >
        <wui-flex justifyContent="center" alignItems="center">
          <wui-wallet-image size="lg" imageSrc=${(0,if_defined.J)(this.imageSrc)}></wui-wallet-image>

          ${this.error?null:this.loaderTemplate()}

          <wui-icon-box
            backgroundColor="error-100"
            background="opaque"
            iconColor="error-100"
            icon="close"
            size="sm"
            border
            borderColor="wui-color-bg-125"
          ></wui-icon-box>
        </wui-flex>

        <wui-flex flexDirection="column" alignItems="center" gap="xs">
          <wui-text variant="paragraph-500" color=${this.error?"error-100":"fg-100"}>
            ${label}
          </wui-text>
          <wui-text align="center" variant="small-500" color="fg-200">${subLabel}</wui-text>
        </wui-flex>

        ${this.secondaryBtnLabel?lit.qy`
              <wui-button
                variant="accent"
                size="md"
                ?disabled=${this.isRetrying||this.isLoading}
                @click=${this.onTryAgain.bind(this)}
                data-testid="w3m-connecting-widget-secondary-button"
              >
                <wui-icon color="inherit" slot="iconLeft" name=${this.secondaryBtnIcon}></wui-icon>
                ${this.secondaryBtnLabel}
              </wui-button>
            `:null}
      </wui-flex>

      ${this.isWalletConnect?lit.qy`
            <wui-flex .padding=${["0","xl","xl","xl"]} justifyContent="center">
              <wui-link @click=${this.onCopyUri} color="fg-200" data-testid="wui-link-copy">
                <wui-icon size="xs" color="fg-200" slot="iconLeft" name="copy"></wui-icon>
                Copy link
              </wui-link>
            </wui-flex>
          `:null}

      <w3m-mobile-download-links .wallet=${this.wallet}></w3m-mobile-download-links>
    `}onShowRetry(){if(this.error&&!this.showRetry){this.showRetry=!0;const retryButton=this.shadowRoot?.querySelector("wui-button");retryButton?.animate([{opacity:0},{opacity:1}],{fill:"forwards",easing:"ease"})}}onTryAgain(){ConnectionController.x.setWcError(!1),this.onRetry?(this.isRetrying=!0,this.onRetry?.()):this.onConnect?.()}loaderTemplate(){const borderRadiusMaster=ThemeController.W.state.themeVariables["--w3m-border-radius-master"],radius=borderRadiusMaster?parseInt(borderRadiusMaster.replace("px",""),10):4;return lit.qy`<wui-loading-thumbnail radius=${9*radius}></wui-loading-thumbnail>`}onCopyUri(){try{this.uri&&(CoreHelperUtil.w.copyToClopboard(this.uri),SnackController.P.showSuccess("Link copied"))}catch{SnackController.P.showError("Failed to copy")}}}W3mConnectingWidget.styles=w3m_connecting_widget_styles,w3m_connecting_widget_decorate([(0,decorators.wk)()],W3mConnectingWidget.prototype,"isRetrying",void 0),w3m_connecting_widget_decorate([(0,decorators.wk)()],W3mConnectingWidget.prototype,"uri",void 0),w3m_connecting_widget_decorate([(0,decorators.wk)()],W3mConnectingWidget.prototype,"error",void 0),w3m_connecting_widget_decorate([(0,decorators.wk)()],W3mConnectingWidget.prototype,"ready",void 0),w3m_connecting_widget_decorate([(0,decorators.wk)()],W3mConnectingWidget.prototype,"showRetry",void 0),w3m_connecting_widget_decorate([(0,decorators.wk)()],W3mConnectingWidget.prototype,"secondaryBtnLabel",void 0),w3m_connecting_widget_decorate([(0,decorators.wk)()],W3mConnectingWidget.prototype,"secondaryLabel",void 0),w3m_connecting_widget_decorate([(0,decorators.wk)()],W3mConnectingWidget.prototype,"isLoading",void 0),w3m_connecting_widget_decorate([(0,decorators.MZ)({type:Boolean})],W3mConnectingWidget.prototype,"isMobile",void 0),w3m_connecting_widget_decorate([(0,decorators.MZ)()],W3mConnectingWidget.prototype,"onRetry",void 0);var w3m_connecting_wc_browser_decorate=function(decorators,target,key,desc){var d,c=arguments.length,r=c<3?target:null===desc?desc=Object.getOwnPropertyDescriptor(target,key):desc;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(decorators,target,key,desc);else for(var i=decorators.length-1;i>=0;i--)(d=decorators[i])&&(r=(c<3?d(r):c>3?d(target,key,r):d(target,key))||r);return c>3&&r&&Object.defineProperty(target,key,r),r};let W3mConnectingWcBrowser=class W3mConnectingWcBrowser extends W3mConnectingWidget{constructor(){if(super(),!this.wallet)throw new Error("w3m-connecting-wc-browser: No wallet provided");this.onConnect=this.onConnectProxy.bind(this),this.onAutoConnect=this.onConnectProxy.bind(this),EventsController.E.sendEvent({type:"track",event:"SELECT_WALLET",properties:{name:this.wallet.name,platform:"browser"}})}async onConnectProxy(){try{this.error=!1;const{connectors}=ConnectorController.a.state,connector=connectors.find(c=>"ANNOUNCED"===c.type&&c.info?.rdns===this.wallet?.rdns||"INJECTED"===c.type||c.name===this.wallet?.name);if(!connector)throw new Error("w3m-connecting-wc-browser: No connector found");await ConnectionController.x.connectExternal(connector,connector.chain),ModalController.W.close(),EventsController.E.sendEvent({type:"track",event:"CONNECT_SUCCESS",properties:{method:"browser",name:this.wallet?.name||"Unknown"}})}catch(error){EventsController.E.sendEvent({type:"track",event:"CONNECT_ERROR",properties:{message:error?.message??"Unknown"}}),this.error=!0}}};W3mConnectingWcBrowser=w3m_connecting_wc_browser_decorate([(0,esm_exports.EM)("w3m-connecting-wc-browser")],W3mConnectingWcBrowser);var w3m_connecting_wc_desktop_decorate=function(decorators,target,key,desc){var d,c=arguments.length,r=c<3?target:null===desc?desc=Object.getOwnPropertyDescriptor(target,key):desc;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(decorators,target,key,desc);else for(var i=decorators.length-1;i>=0;i--)(d=decorators[i])&&(r=(c<3?d(r):c>3?d(target,key,r):d(target,key))||r);return c>3&&r&&Object.defineProperty(target,key,r),r};let W3mConnectingWcDesktop=class W3mConnectingWcDesktop extends W3mConnectingWidget{constructor(){if(super(),!this.wallet)throw new Error("w3m-connecting-wc-desktop: No wallet provided");this.onConnect=this.onConnectProxy.bind(this),this.onRender=this.onRenderProxy.bind(this),EventsController.E.sendEvent({type:"track",event:"SELECT_WALLET",properties:{name:this.wallet.name,platform:"desktop"}})}onRenderProxy(){!this.ready&&this.uri&&(this.ready=!0,this.onConnect?.())}onConnectProxy(){if(this.wallet?.desktop_link&&this.uri)try{this.error=!1;const{desktop_link,name}=this.wallet,{redirect,href}=CoreHelperUtil.w.formatNativeUrl(desktop_link,this.uri);ConnectionController.x.setWcLinking({name,href}),ConnectionController.x.setRecentWallet(this.wallet),CoreHelperUtil.w.openHref(redirect,"_blank")}catch{this.error=!0}}};W3mConnectingWcDesktop=w3m_connecting_wc_desktop_decorate([(0,esm_exports.EM)("w3m-connecting-wc-desktop")],W3mConnectingWcDesktop);var utils_ConstantsUtil=__webpack_require__("./node_modules/@reown/appkit-controllers/dist/esm/src/utils/ConstantsUtil.js"),w3m_connecting_wc_mobile_decorate=function(decorators,target,key,desc){var d,c=arguments.length,r=c<3?target:null===desc?desc=Object.getOwnPropertyDescriptor(target,key):desc;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(decorators,target,key,desc);else for(var i=decorators.length-1;i>=0;i--)(d=decorators[i])&&(r=(c<3?d(r):c>3?d(target,key,r):d(target,key))||r);return c>3&&r&&Object.defineProperty(target,key,r),r};let W3mConnectingWcMobile=class W3mConnectingWcMobile extends W3mConnectingWidget{constructor(){if(super(),this.btnLabelTimeout=void 0,this.redirectDeeplink=void 0,this.redirectUniversalLink=void 0,this.target=void 0,this.preferUniversalLinks=OptionsController.H.state.experimental_preferUniversalLinks,this.isLoading=!0,this.onConnect=()=>{if(this.wallet?.mobile_link&&this.uri)try{this.error=!1;const{mobile_link,link_mode,name}=this.wallet,{redirect,redirectUniversalLink,href}=CoreHelperUtil.w.formatNativeUrl(mobile_link,this.uri,link_mode);this.redirectDeeplink=redirect,this.redirectUniversalLink=redirectUniversalLink,this.target=CoreHelperUtil.w.isIframe()?"_top":"_self",ConnectionController.x.setWcLinking({name,href}),ConnectionController.x.setRecentWallet(this.wallet),this.preferUniversalLinks&&this.redirectUniversalLink?CoreHelperUtil.w.openHref(this.redirectUniversalLink,this.target):CoreHelperUtil.w.openHref(this.redirectDeeplink,this.target)}catch(e){EventsController.E.sendEvent({type:"track",event:"CONNECT_PROXY_ERROR",properties:{message:e instanceof Error?e.message:"Error parsing the deeplink",uri:this.uri,mobile_link:this.wallet.mobile_link,name:this.wallet.name}}),this.error=!0}},!this.wallet)throw new Error("w3m-connecting-wc-mobile: No wallet provided");this.secondaryBtnLabel="Open",this.secondaryLabel=utils_ConstantsUtil.oU.CONNECT_LABELS.MOBILE,this.secondaryBtnIcon="externalLink",this.onHandleURI(),this.unsubscribe.push(ConnectionController.x.subscribeKey("wcUri",()=>{this.onHandleURI()})),EventsController.E.sendEvent({type:"track",event:"SELECT_WALLET",properties:{name:this.wallet.name,platform:"mobile"}})}disconnectedCallback(){super.disconnectedCallback(),clearTimeout(this.btnLabelTimeout)}onHandleURI(){this.isLoading=!this.uri,!this.ready&&this.uri&&(this.ready=!0,this.onConnect?.())}onTryAgain(){ConnectionController.x.setWcError(!1),this.onConnect?.()}};w3m_connecting_wc_mobile_decorate([(0,decorators.wk)()],W3mConnectingWcMobile.prototype,"redirectDeeplink",void 0),w3m_connecting_wc_mobile_decorate([(0,decorators.wk)()],W3mConnectingWcMobile.prototype,"redirectUniversalLink",void 0),w3m_connecting_wc_mobile_decorate([(0,decorators.wk)()],W3mConnectingWcMobile.prototype,"target",void 0),w3m_connecting_wc_mobile_decorate([(0,decorators.wk)()],W3mConnectingWcMobile.prototype,"preferUniversalLinks",void 0),w3m_connecting_wc_mobile_decorate([(0,decorators.wk)()],W3mConnectingWcMobile.prototype,"isLoading",void 0),W3mConnectingWcMobile=w3m_connecting_wc_mobile_decorate([(0,esm_exports.EM)("w3m-connecting-wc-mobile")],W3mConnectingWcMobile);var browser=__webpack_require__("./node_modules/qrcode/lib/browser.js");function isAdjecentDots(cy,otherCy,cellSize){if(cy===otherCy)return!1;return(cy-otherCy<0?otherCy-cy:cy-otherCy)<=cellSize+.1}const QrCodeUtil={generate({uri,size,logoSize,dotColor="#141414"}){const dots=[],matrix=function getMatrix(value,errorCorrectionLevel){const arr=Array.prototype.slice.call(browser.create(value,{errorCorrectionLevel}).modules.data,0),sqrt=Math.sqrt(arr.length);return arr.reduce((rows,key,index)=>(index%sqrt===0?rows.push([key]):rows[rows.length-1].push(key))&&rows,[])}(uri,"Q"),cellSize=size/matrix.length,qrList=[{x:0,y:0},{x:1,y:0},{x:0,y:1}];qrList.forEach(({x,y})=>{const x1=(matrix.length-7)*cellSize*x,y1=(matrix.length-7)*cellSize*y;for(let i=0;i<qrList.length;i+=1){const dotSize=cellSize*(7-2*i);dots.push(lit.JW`
            <rect
              fill=${2===i?dotColor:"transparent"}
              width=${0===i?dotSize-5:dotSize}
              rx= ${0===i?.45*(dotSize-5):.45*dotSize}
              ry= ${0===i?.45*(dotSize-5):.45*dotSize}
              stroke=${dotColor}
              stroke-width=${0===i?5:0}
              height=${0===i?dotSize-5:dotSize}
              x= ${0===i?y1+cellSize*i+2.5:y1+cellSize*i}
              y= ${0===i?x1+cellSize*i+2.5:x1+cellSize*i}
            />
          `)}});const clearArenaSize=Math.floor((logoSize+25)/cellSize),matrixMiddleStart=matrix.length/2-clearArenaSize/2,matrixMiddleEnd=matrix.length/2+clearArenaSize/2-1,circles=[];matrix.forEach((row,i)=>{row.forEach((_,j)=>{if(matrix[i][j]&&!(i<7&&j<7||i>matrix.length-8&&j<7||i<7&&j>matrix.length-8||i>matrixMiddleStart&&i<matrixMiddleEnd&&j>matrixMiddleStart&&j<matrixMiddleEnd)){const cx=i*cellSize+cellSize/2,cy=j*cellSize+cellSize/2;circles.push([cx,cy])}})});const circlesToConnect={};return circles.forEach(([cx,cy])=>{circlesToConnect[cx]?circlesToConnect[cx]?.push(cy):circlesToConnect[cx]=[cy]}),Object.entries(circlesToConnect).map(([cx,cys])=>{const newCys=cys.filter(cy=>cys.every(otherCy=>!isAdjecentDots(cy,otherCy,cellSize)));return[Number(cx),newCys]}).forEach(([cx,cys])=>{cys.forEach(cy=>{dots.push(lit.JW`<circle cx=${cx} cy=${cy} fill=${dotColor} r=${cellSize/2.5} />`)})}),Object.entries(circlesToConnect).filter(([_,cys])=>cys.length>1).map(([cx,cys])=>{const newCys=cys.filter(cy=>cys.some(otherCy=>isAdjecentDots(cy,otherCy,cellSize)));return[Number(cx),newCys]}).map(([cx,cys])=>{cys.sort((a,b)=>a<b?-1:1);const groups=[];for(const cy of cys){const group=groups.find(item=>item.some(otherCy=>isAdjecentDots(cy,otherCy,cellSize)));group?group.push(cy):groups.push([cy])}return[cx,groups.map(item=>[item[0],item[item.length-1]])]}).forEach(([cx,groups])=>{groups.forEach(([y1,y2])=>{dots.push(lit.JW`
              <line
                x1=${cx}
                x2=${cx}
                y1=${y1}
                y2=${y2}
                stroke=${dotColor}
                stroke-width=${cellSize/1.25}
                stroke-linecap="round"
              />
            `)})}),dots}},wui_qr_code_styles=lit.AH`
  :host {
    position: relative;
    user-select: none;
    display: block;
    overflow: hidden;
    aspect-ratio: 1 / 1;
    width: var(--local-size);
  }

  :host([data-theme='dark']) {
    border-radius: clamp(0px, var(--wui-border-radius-l), 40px);
    background-color: var(--wui-color-inverse-100);
    padding: var(--wui-spacing-l);
  }

  :host([data-theme='light']) {
    box-shadow: 0 0 0 1px var(--wui-color-bg-125);
    background-color: var(--wui-color-bg-125);
  }

  :host([data-clear='true']) > wui-icon {
    display: none;
  }

  svg:first-child,
  wui-image,
  wui-icon {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translateY(-50%) translateX(-50%);
  }

  wui-image {
    width: 25%;
    height: 25%;
    border-radius: var(--wui-border-radius-xs);
  }

  wui-icon {
    width: 100%;
    height: 100%;
    color: var(--local-icon-color) !important;
    transform: translateY(-50%) translateX(-50%) scale(0.25);
  }
`;var wui_qr_code_decorate=function(decorators,target,key,desc){var d,c=arguments.length,r=c<3?target:null===desc?desc=Object.getOwnPropertyDescriptor(target,key):desc;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(decorators,target,key,desc);else for(var i=decorators.length-1;i>=0;i--)(d=decorators[i])&&(r=(c<3?d(r):c>3?d(target,key,r):d(target,key))||r);return c>3&&r&&Object.defineProperty(target,key,r),r};let WuiQrCode=class WuiQrCode extends lit.WF{constructor(){super(...arguments),this.uri="",this.size=0,this.theme="dark",this.imageSrc=void 0,this.alt=void 0,this.arenaClear=void 0,this.farcaster=void 0}render(){return this.dataset.theme=this.theme,this.dataset.clear=String(this.arenaClear),this.style.cssText=`\n     --local-size: ${this.size}px;\n     --local-icon-color: ${this.color??"#3396ff"}\n    `,lit.qy`${this.templateVisual()} ${this.templateSvg()}`}templateSvg(){const size="light"===this.theme?this.size:this.size-32;return lit.JW`
      <svg height=${size} width=${size}>
        ${QrCodeUtil.generate({uri:this.uri,size,logoSize:this.arenaClear?0:size/4,dotColor:this.color})}
      </svg>
    `}templateVisual(){return this.imageSrc?lit.qy`<wui-image src=${this.imageSrc} alt=${this.alt??"logo"}></wui-image>`:this.farcaster?lit.qy`<wui-icon
        class="farcaster"
        size="inherit"
        color="inherit"
        name="farcaster"
      ></wui-icon>`:lit.qy`<wui-icon size="inherit" color="inherit" name="walletConnect"></wui-icon>`}};WuiQrCode.styles=[ThemeUtil.W5,wui_qr_code_styles],wui_qr_code_decorate([(0,decorators.MZ)()],WuiQrCode.prototype,"uri",void 0),wui_qr_code_decorate([(0,decorators.MZ)({type:Number})],WuiQrCode.prototype,"size",void 0),wui_qr_code_decorate([(0,decorators.MZ)()],WuiQrCode.prototype,"theme",void 0),wui_qr_code_decorate([(0,decorators.MZ)()],WuiQrCode.prototype,"imageSrc",void 0),wui_qr_code_decorate([(0,decorators.MZ)()],WuiQrCode.prototype,"alt",void 0),wui_qr_code_decorate([(0,decorators.MZ)()],WuiQrCode.prototype,"color",void 0),wui_qr_code_decorate([(0,decorators.MZ)({type:Boolean})],WuiQrCode.prototype,"arenaClear",void 0),wui_qr_code_decorate([(0,decorators.MZ)({type:Boolean})],WuiQrCode.prototype,"farcaster",void 0),WuiQrCode=wui_qr_code_decorate([(0,WebComponentsUtil.E)("wui-qr-code")],WuiQrCode);const wui_shimmer_styles=lit.AH`
  :host {
    display: block;
    box-shadow: inset 0 0 0 1px var(--wui-color-gray-glass-005);
    background: linear-gradient(
      120deg,
      var(--wui-color-bg-200) 5%,
      var(--wui-color-bg-200) 48%,
      var(--wui-color-bg-300) 55%,
      var(--wui-color-bg-300) 60%,
      var(--wui-color-bg-300) calc(60% + 10px),
      var(--wui-color-bg-200) calc(60% + 12px),
      var(--wui-color-bg-200) 100%
    );
    background-size: 250%;
    animation: shimmer 3s linear infinite reverse;
  }

  :host([variant='light']) {
    background: linear-gradient(
      120deg,
      var(--wui-color-bg-150) 5%,
      var(--wui-color-bg-150) 48%,
      var(--wui-color-bg-200) 55%,
      var(--wui-color-bg-200) 60%,
      var(--wui-color-bg-200) calc(60% + 10px),
      var(--wui-color-bg-150) calc(60% + 12px),
      var(--wui-color-bg-150) 100%
    );
    background-size: 250%;
  }

  @keyframes shimmer {
    from {
      background-position: -250% 0;
    }
    to {
      background-position: 250% 0;
    }
  }
`;var wui_shimmer_decorate=function(decorators,target,key,desc){var d,c=arguments.length,r=c<3?target:null===desc?desc=Object.getOwnPropertyDescriptor(target,key):desc;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(decorators,target,key,desc);else for(var i=decorators.length-1;i>=0;i--)(d=decorators[i])&&(r=(c<3?d(r):c>3?d(target,key,r):d(target,key))||r);return c>3&&r&&Object.defineProperty(target,key,r),r};let WuiShimmer=class WuiShimmer extends lit.WF{constructor(){super(...arguments),this.width="",this.height="",this.borderRadius="m",this.variant="default"}render(){return this.style.cssText=`\n      width: ${this.width};\n      height: ${this.height};\n      border-radius: clamp(0px,var(--wui-border-radius-${this.borderRadius}), 40px);\n    `,lit.qy`<slot></slot>`}};WuiShimmer.styles=[wui_shimmer_styles],wui_shimmer_decorate([(0,decorators.MZ)()],WuiShimmer.prototype,"width",void 0),wui_shimmer_decorate([(0,decorators.MZ)()],WuiShimmer.prototype,"height",void 0),wui_shimmer_decorate([(0,decorators.MZ)()],WuiShimmer.prototype,"borderRadius",void 0),wui_shimmer_decorate([(0,decorators.MZ)()],WuiShimmer.prototype,"variant",void 0),WuiShimmer=wui_shimmer_decorate([(0,WebComponentsUtil.E)("wui-shimmer")],WuiShimmer);const wui_ux_by_reown_styles=lit.AH`
  .reown-logo {
    height: var(--wui-spacing-xxl);
  }

  a {
    text-decoration: none;
    cursor: pointer;
  }

  a:hover {
    opacity: 0.9;
  }
`;var wui_ux_by_reown_decorate=function(decorators,target,key,desc){var d,c=arguments.length,r=c<3?target:null===desc?desc=Object.getOwnPropertyDescriptor(target,key):desc;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(decorators,target,key,desc);else for(var i=decorators.length-1;i>=0;i--)(d=decorators[i])&&(r=(c<3?d(r):c>3?d(target,key,r):d(target,key))||r);return c>3&&r&&Object.defineProperty(target,key,r),r};let WuiUxByReown=class WuiUxByReown extends lit.WF{render(){return lit.qy`
      <a
        data-testid="ux-branding-reown"
        href=${"https://reown.com"}
        rel="noreferrer"
        target="_blank"
        style="text-decoration: none;"
      >
        <wui-flex
          justifyContent="center"
          alignItems="center"
          gap="xs"
          .padding=${["0","0","l","0"]}
        >
          <wui-text variant="small-500" color="fg-100"> UX by </wui-text>
          <wui-icon name="reown" size="xxxl" class="reown-logo"></wui-icon>
        </wui-flex>
      </a>
    `}};WuiUxByReown.styles=[ThemeUtil.W5,ThemeUtil.fD,wui_ux_by_reown_styles],WuiUxByReown=wui_ux_by_reown_decorate([(0,WebComponentsUtil.E)("wui-ux-by-reown")],WuiUxByReown);const w3m_connecting_wc_qrcode_styles=lit.AH`
  @keyframes fadein {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  wui-shimmer {
    width: 100%;
    aspect-ratio: 1 / 1;
    border-radius: clamp(0px, var(--wui-border-radius-l), 40px) !important;
  }

  wui-qr-code {
    opacity: 0;
    animation-duration: 200ms;
    animation-timing-function: ease;
    animation-name: fadein;
    animation-fill-mode: forwards;
  }
`;var w3m_connecting_wc_qrcode_decorate=function(decorators,target,key,desc){var d,c=arguments.length,r=c<3?target:null===desc?desc=Object.getOwnPropertyDescriptor(target,key):desc;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(decorators,target,key,desc);else for(var i=decorators.length-1;i>=0;i--)(d=decorators[i])&&(r=(c<3?d(r):c>3?d(target,key,r):d(target,key))||r);return c>3&&r&&Object.defineProperty(target,key,r),r};let W3mConnectingWcQrcode=class W3mConnectingWcQrcode extends W3mConnectingWidget{constructor(){super(),this.forceUpdate=()=>{this.requestUpdate()},window.addEventListener("resize",this.forceUpdate),EventsController.E.sendEvent({type:"track",event:"SELECT_WALLET",properties:{name:this.wallet?.name??"WalletConnect",platform:"qrcode"}})}disconnectedCallback(){super.disconnectedCallback(),this.unsubscribe?.forEach(unsub=>unsub()),window.removeEventListener("resize",this.forceUpdate)}render(){return this.onRenderProxy(),lit.qy`
      <wui-flex
        flexDirection="column"
        alignItems="center"
        .padding=${["0","xl","xl","xl"]}
        gap="xl"
      >
        <wui-shimmer borderRadius="l" width="100%"> ${this.qrCodeTemplate()} </wui-shimmer>

        <wui-text variant="paragraph-500" color="fg-100">
          Scan this QR Code with your phone
        </wui-text>
        ${this.copyTemplate()}
      </wui-flex>
      <w3m-mobile-download-links .wallet=${this.wallet}></w3m-mobile-download-links>
    `}onRenderProxy(){!this.ready&&this.uri&&(this.timeout=setTimeout(()=>{this.ready=!0},200))}qrCodeTemplate(){if(!this.uri||!this.ready)return null;const size=this.getBoundingClientRect().width-40,alt=this.wallet?this.wallet.name:void 0;return ConnectionController.x.setWcLinking(void 0),ConnectionController.x.setRecentWallet(this.wallet),lit.qy` <wui-qr-code
      size=${size}
      theme=${ThemeController.W.state.themeMode}
      uri=${this.uri}
      imageSrc=${(0,if_defined.J)(AssetUtil.$.getWalletImage(this.wallet))}
      color=${(0,if_defined.J)(ThemeController.W.state.themeVariables["--w3m-qr-color"])}
      alt=${(0,if_defined.J)(alt)}
      data-testid="wui-qr-code"
    ></wui-qr-code>`}copyTemplate(){const inactive=!this.uri||!this.ready;return lit.qy`<wui-link
      .disabled=${inactive}
      @click=${this.onCopyUri}
      color="fg-200"
      data-testid="copy-wc2-uri"
    >
      <wui-icon size="xs" color="fg-200" slot="iconLeft" name="copy"></wui-icon>
      Copy link
    </wui-link>`}};W3mConnectingWcQrcode.styles=w3m_connecting_wc_qrcode_styles,W3mConnectingWcQrcode=w3m_connecting_wc_qrcode_decorate([(0,esm_exports.EM)("w3m-connecting-wc-qrcode")],W3mConnectingWcQrcode);var w3m_connecting_wc_unsupported_decorate=function(decorators,target,key,desc){var d,c=arguments.length,r=c<3?target:null===desc?desc=Object.getOwnPropertyDescriptor(target,key):desc;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(decorators,target,key,desc);else for(var i=decorators.length-1;i>=0;i--)(d=decorators[i])&&(r=(c<3?d(r):c>3?d(target,key,r):d(target,key))||r);return c>3&&r&&Object.defineProperty(target,key,r),r};let W3mConnectingWcUnsupported=class W3mConnectingWcUnsupported extends lit.WF{constructor(){if(super(),this.wallet=RouterController.I.state.data?.wallet,!this.wallet)throw new Error("w3m-connecting-wc-unsupported: No wallet provided");EventsController.E.sendEvent({type:"track",event:"SELECT_WALLET",properties:{name:this.wallet.name,platform:"browser"}})}render(){return lit.qy`
      <wui-flex
        flexDirection="column"
        alignItems="center"
        .padding=${["3xl","xl","xl","xl"]}
        gap="xl"
      >
        <wui-wallet-image
          size="lg"
          imageSrc=${(0,if_defined.J)(AssetUtil.$.getWalletImage(this.wallet))}
        ></wui-wallet-image>

        <wui-text variant="paragraph-500" color="fg-100">Not Detected</wui-text>
      </wui-flex>

      <w3m-mobile-download-links .wallet=${this.wallet}></w3m-mobile-download-links>
    `}};W3mConnectingWcUnsupported=w3m_connecting_wc_unsupported_decorate([(0,esm_exports.EM)("w3m-connecting-wc-unsupported")],W3mConnectingWcUnsupported);var w3m_connecting_wc_web_decorate=function(decorators,target,key,desc){var d,c=arguments.length,r=c<3?target:null===desc?desc=Object.getOwnPropertyDescriptor(target,key):desc;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(decorators,target,key,desc);else for(var i=decorators.length-1;i>=0;i--)(d=decorators[i])&&(r=(c<3?d(r):c>3?d(target,key,r):d(target,key))||r);return c>3&&r&&Object.defineProperty(target,key,r),r};let W3mConnectingWcWeb=class W3mConnectingWcWeb extends W3mConnectingWidget{constructor(){if(super(),this.isLoading=!0,!this.wallet)throw new Error("w3m-connecting-wc-web: No wallet provided");this.onConnect=this.onConnectProxy.bind(this),this.secondaryBtnLabel="Open",this.secondaryLabel=utils_ConstantsUtil.oU.CONNECT_LABELS.MOBILE,this.secondaryBtnIcon="externalLink",this.updateLoadingState(),this.unsubscribe.push(ConnectionController.x.subscribeKey("wcUri",()=>{this.updateLoadingState()})),EventsController.E.sendEvent({type:"track",event:"SELECT_WALLET",properties:{name:this.wallet.name,platform:"web"}})}updateLoadingState(){this.isLoading=!this.uri}onConnectProxy(){if(this.wallet?.webapp_link&&this.uri)try{this.error=!1;const{webapp_link,name}=this.wallet,{redirect,href}=CoreHelperUtil.w.formatUniversalUrl(webapp_link,this.uri);ConnectionController.x.setWcLinking({name,href}),ConnectionController.x.setRecentWallet(this.wallet),CoreHelperUtil.w.openHref(redirect,"_blank")}catch{this.error=!0}}};w3m_connecting_wc_web_decorate([(0,decorators.wk)()],W3mConnectingWcWeb.prototype,"isLoading",void 0),W3mConnectingWcWeb=w3m_connecting_wc_web_decorate([(0,esm_exports.EM)("w3m-connecting-wc-web")],W3mConnectingWcWeb);var w3m_connecting_wc_view_decorate=function(decorators,target,key,desc){var d,c=arguments.length,r=c<3?target:null===desc?desc=Object.getOwnPropertyDescriptor(target,key):desc;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(decorators,target,key,desc);else for(var i=decorators.length-1;i>=0;i--)(d=decorators[i])&&(r=(c<3?d(r):c>3?d(target,key,r):d(target,key))||r);return c>3&&r&&Object.defineProperty(target,key,r),r};let W3mConnectingWcView=class W3mConnectingWcView extends lit.WF{constructor(){super(),this.wallet=RouterController.I.state.data?.wallet,this.unsubscribe=[],this.platform=void 0,this.platforms=[],this.isSiwxEnabled=Boolean(OptionsController.H.state.siwx),this.remoteFeatures=OptionsController.H.state.remoteFeatures,this.determinePlatforms(),this.initializeConnection(),this.unsubscribe.push(OptionsController.H.subscribeKey("remoteFeatures",val=>this.remoteFeatures=val))}disconnectedCallback(){this.unsubscribe.forEach(unsubscribe=>unsubscribe())}render(){return lit.qy`
      ${this.headerTemplate()}
      <div>${this.platformTemplate()}</div>
      ${this.reownBrandingTemplate()}
    `}reownBrandingTemplate(){return this.remoteFeatures?.reownBranding?lit.qy`<wui-ux-by-reown></wui-ux-by-reown>`:null}async initializeConnection(retry=!1){if("browser"!==this.platform&&(!OptionsController.H.state.manualWCControl||retry))try{const{wcPairingExpiry,status}=ConnectionController.x.state;(retry||OptionsController.H.state.enableEmbedded||CoreHelperUtil.w.isPairingExpired(wcPairingExpiry)||"connecting"===status)&&(await ConnectionController.x.connectWalletConnect(),this.isSiwxEnabled||ModalController.W.close())}catch(error){EventsController.E.sendEvent({type:"track",event:"CONNECT_ERROR",properties:{message:error?.message??"Unknown"}}),ConnectionController.x.setWcError(!0),SnackController.P.showError(error.message??"Connection error"),ConnectionController.x.resetWcConnection(),RouterController.I.goBack()}}determinePlatforms(){if(!this.wallet)return this.platforms.push("qrcode"),void(this.platform="qrcode");if(this.platform)return;const{mobile_link,desktop_link,webapp_link,injected,rdns}=this.wallet,injectedIds=injected?.map(({injected_id})=>injected_id).filter(Boolean),browserIds=[...rdns?[rdns]:injectedIds??[]],isBrowser=!OptionsController.H.state.isUniversalProvider&&browserIds.length,hasMobileWCLink=mobile_link,isWebWc=webapp_link,isBrowserInstalled=ConnectionController.x.checkInstalled(browserIds),isBrowserWc=isBrowser&&isBrowserInstalled,isDesktopWc=desktop_link&&!CoreHelperUtil.w.isMobile();isBrowserWc&&!ChainController.W.state.noAdapters&&this.platforms.push("browser"),hasMobileWCLink&&this.platforms.push(CoreHelperUtil.w.isMobile()?"mobile":"qrcode"),isWebWc&&this.platforms.push("web"),isDesktopWc&&this.platforms.push("desktop"),isBrowserWc||!isBrowser||ChainController.W.state.noAdapters||this.platforms.push("unsupported"),this.platform=this.platforms[0]}platformTemplate(){switch(this.platform){case"browser":return lit.qy`<w3m-connecting-wc-browser></w3m-connecting-wc-browser>`;case"web":return lit.qy`<w3m-connecting-wc-web></w3m-connecting-wc-web>`;case"desktop":return lit.qy`
          <w3m-connecting-wc-desktop .onRetry=${()=>this.initializeConnection(!0)}>
          </w3m-connecting-wc-desktop>
        `;case"mobile":return lit.qy`
          <w3m-connecting-wc-mobile isMobile .onRetry=${()=>this.initializeConnection(!0)}>
          </w3m-connecting-wc-mobile>
        `;case"qrcode":return lit.qy`<w3m-connecting-wc-qrcode></w3m-connecting-wc-qrcode>`;default:return lit.qy`<w3m-connecting-wc-unsupported></w3m-connecting-wc-unsupported>`}}headerTemplate(){return this.platforms.length>1?lit.qy`
      <w3m-connecting-header
        .platforms=${this.platforms}
        .onSelectPlatfrom=${this.onSelectPlatform.bind(this)}
      >
      </w3m-connecting-header>
    `:null}async onSelectPlatform(platform){const container=this.shadowRoot?.querySelector("div");container&&(await container.animate([{opacity:1},{opacity:0}],{duration:200,fill:"forwards",easing:"ease"}).finished,this.platform=platform,container.animate([{opacity:0},{opacity:1}],{duration:200,fill:"forwards",easing:"ease"}))}};w3m_connecting_wc_view_decorate([(0,decorators.wk)()],W3mConnectingWcView.prototype,"platform",void 0),w3m_connecting_wc_view_decorate([(0,decorators.wk)()],W3mConnectingWcView.prototype,"platforms",void 0),w3m_connecting_wc_view_decorate([(0,decorators.wk)()],W3mConnectingWcView.prototype,"isSiwxEnabled",void 0),w3m_connecting_wc_view_decorate([(0,decorators.wk)()],W3mConnectingWcView.prototype,"remoteFeatures",void 0),W3mConnectingWcView=w3m_connecting_wc_view_decorate([(0,esm_exports.EM)("w3m-connecting-wc-view")],W3mConnectingWcView);var w3m_connecting_wc_basic_view_decorate=function(decorators,target,key,desc){var d,c=arguments.length,r=c<3?target:null===desc?desc=Object.getOwnPropertyDescriptor(target,key):desc;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(decorators,target,key,desc);else for(var i=decorators.length-1;i>=0;i--)(d=decorators[i])&&(r=(c<3?d(r):c>3?d(target,key,r):d(target,key))||r);return c>3&&r&&Object.defineProperty(target,key,r),r};let W3mConnectingWcBasicView=class W3mConnectingWcBasicView extends lit.WF{constructor(){super(...arguments),this.isMobile=CoreHelperUtil.w.isMobile()}render(){if(this.isMobile){const{featured,recommended}=ApiController.N.state,{customWallets}=OptionsController.H.state,recent=StorageUtil.i.getRecentWallets(),showConnectors=featured.length||recommended.length||customWallets?.length||recent.length;return lit.qy`<wui-flex
        flexDirection="column"
        gap="xs"
        .margin=${["3xs","s","s","s"]}
      >
        ${showConnectors?lit.qy`<w3m-connector-list></w3m-connector-list>`:null}
        <w3m-all-wallets-widget></w3m-all-wallets-widget>
      </wui-flex>`}return lit.qy`<wui-flex flexDirection="column" .padding=${["0","0","l","0"]}>
      <w3m-connecting-wc-view></w3m-connecting-wc-view>
      <wui-flex flexDirection="column" .padding=${["0","m","0","m"]}>
        <w3m-all-wallets-widget></w3m-all-wallets-widget> </wui-flex
    ></wui-flex>`}};w3m_connecting_wc_basic_view_decorate([(0,decorators.wk)()],W3mConnectingWcBasicView.prototype,"isMobile",void 0),W3mConnectingWcBasicView=w3m_connecting_wc_basic_view_decorate([(0,esm_exports.EM)("w3m-connecting-wc-basic-view")],W3mConnectingWcBasicView);var lit_html=__webpack_require__("./node_modules/lit-html/lit-html.js"),async_directive=__webpack_require__("./node_modules/lit-html/async-directive.js"),directive=__webpack_require__("./node_modules/lit-html/directive.js");const e=()=>new h;class h{}const o=new WeakMap,n=(0,directive.u$)(class extends async_directive.Kq{render(i){return lit_html.s6}update(i,[s]){const e=s!==this.G;return e&&void 0!==this.G&&this.rt(void 0),(e||this.lt!==this.ct)&&(this.G=s,this.ht=i.options?.host,this.rt(this.ct=i.element)),lit_html.s6}rt(t){if(this.isConnected||(t=void 0),"function"==typeof this.G){const i=this.ht??globalThis;let s=o.get(i);void 0===s&&(s=new WeakMap,o.set(i,s)),void 0!==s.get(this.G)&&this.G.call(this.ht,void 0),s.set(this.G,t),void 0!==t&&this.G.call(this.ht,t)}else this.G.value=t}get lt(){return"function"==typeof this.G?o.get(this.ht??globalThis)?.get(this.G):this.G?.value}disconnected(){this.lt===this.ct&&this.rt(void 0)}reconnected(){this.rt(this.ct)}}),wui_switch_styles=lit.AH`
  :host {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  label {
    position: relative;
    display: inline-block;
    width: 32px;
    height: 22px;
  }

  input {
    width: 0;
    height: 0;
    opacity: 0;
  }

  span {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: var(--wui-color-blue-100);
    border-width: 1px;
    border-style: solid;
    border-color: var(--wui-color-gray-glass-002);
    border-radius: 999px;
    transition:
      background-color var(--wui-ease-inout-power-1) var(--wui-duration-md),
      border-color var(--wui-ease-inout-power-1) var(--wui-duration-md);
    will-change: background-color, border-color;
  }

  span:before {
    position: absolute;
    content: '';
    height: 16px;
    width: 16px;
    left: 3px;
    top: 2px;
    background-color: var(--wui-color-inverse-100);
    transition: transform var(--wui-ease-inout-power-1) var(--wui-duration-lg);
    will-change: transform;
    border-radius: 50%;
  }

  input:checked + span {
    border-color: var(--wui-color-gray-glass-005);
    background-color: var(--wui-color-blue-100);
  }

  input:not(:checked) + span {
    background-color: var(--wui-color-gray-glass-010);
  }

  input:checked + span:before {
    transform: translateX(calc(100% - 7px));
  }
`;var wui_switch_decorate=function(decorators,target,key,desc){var d,c=arguments.length,r=c<3?target:null===desc?desc=Object.getOwnPropertyDescriptor(target,key):desc;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(decorators,target,key,desc);else for(var i=decorators.length-1;i>=0;i--)(d=decorators[i])&&(r=(c<3?d(r):c>3?d(target,key,r):d(target,key))||r);return c>3&&r&&Object.defineProperty(target,key,r),r};let WuiSwitch=class WuiSwitch extends lit.WF{constructor(){super(...arguments),this.inputElementRef=e(),this.checked=void 0}render(){return lit.qy`
      <label>
        <input
          ${n(this.inputElementRef)}
          type="checkbox"
          ?checked=${(0,if_defined.J)(this.checked)}
          @change=${this.dispatchChangeEvent.bind(this)}
        />
        <span></span>
      </label>
    `}dispatchChangeEvent(){this.dispatchEvent(new CustomEvent("switchChange",{detail:this.inputElementRef.value?.checked,bubbles:!0,composed:!0}))}};WuiSwitch.styles=[ThemeUtil.W5,ThemeUtil.fD,ThemeUtil.ck,wui_switch_styles],wui_switch_decorate([(0,decorators.MZ)({type:Boolean})],WuiSwitch.prototype,"checked",void 0),WuiSwitch=wui_switch_decorate([(0,WebComponentsUtil.E)("wui-switch")],WuiSwitch);const wui_certified_switch_styles=lit.AH`
  :host {
    height: 100%;
  }

  button {
    display: flex;
    align-items: center;
    justify-content: center;
    column-gap: var(--wui-spacing-1xs);
    padding: var(--wui-spacing-xs) var(--wui-spacing-s);
    background-color: var(--wui-color-gray-glass-002);
    border-radius: var(--wui-border-radius-xs);
    box-shadow: inset 0 0 0 1px var(--wui-color-gray-glass-002);
    transition: background-color var(--wui-ease-out-power-1) var(--wui-duration-md);
    will-change: background-color;
    cursor: pointer;
  }

  wui-switch {
    pointer-events: none;
  }
`;var wui_certified_switch_decorate=function(decorators,target,key,desc){var d,c=arguments.length,r=c<3?target:null===desc?desc=Object.getOwnPropertyDescriptor(target,key):desc;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(decorators,target,key,desc);else for(var i=decorators.length-1;i>=0;i--)(d=decorators[i])&&(r=(c<3?d(r):c>3?d(target,key,r):d(target,key))||r);return c>3&&r&&Object.defineProperty(target,key,r),r};let WuiCertifiedSwitch=class WuiCertifiedSwitch extends lit.WF{constructor(){super(...arguments),this.checked=void 0}render(){return lit.qy`
      <button>
        <wui-icon size="xl" name="walletConnectBrown"></wui-icon>
        <wui-switch ?checked=${(0,if_defined.J)(this.checked)}></wui-switch>
      </button>
    `}};WuiCertifiedSwitch.styles=[ThemeUtil.W5,ThemeUtil.fD,wui_certified_switch_styles],wui_certified_switch_decorate([(0,decorators.MZ)({type:Boolean})],WuiCertifiedSwitch.prototype,"checked",void 0),WuiCertifiedSwitch=wui_certified_switch_decorate([(0,WebComponentsUtil.E)("wui-certified-switch")],WuiCertifiedSwitch);const wui_input_element_styles=lit.AH`
  button {
    background-color: var(--wui-color-fg-300);
    border-radius: var(--wui-border-radius-4xs);
    width: 16px;
    height: 16px;
  }

  button:disabled {
    background-color: var(--wui-color-bg-300);
  }

  wui-icon {
    color: var(--wui-color-bg-200) !important;
  }

  button:focus-visible {
    background-color: var(--wui-color-fg-250);
    border: 1px solid var(--wui-color-accent-100);
  }

  @media (hover: hover) and (pointer: fine) {
    button:hover:enabled {
      background-color: var(--wui-color-fg-250);
    }

    button:active:enabled {
      background-color: var(--wui-color-fg-225);
    }
  }
`;var wui_input_element_decorate=function(decorators,target,key,desc){var d,c=arguments.length,r=c<3?target:null===desc?desc=Object.getOwnPropertyDescriptor(target,key):desc;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(decorators,target,key,desc);else for(var i=decorators.length-1;i>=0;i--)(d=decorators[i])&&(r=(c<3?d(r):c>3?d(target,key,r):d(target,key))||r);return c>3&&r&&Object.defineProperty(target,key,r),r};let WuiInputElement=class WuiInputElement extends lit.WF{constructor(){super(...arguments),this.icon="copy"}render(){return lit.qy`
      <button>
        <wui-icon color="inherit" size="xxs" name=${this.icon}></wui-icon>
      </button>
    `}};WuiInputElement.styles=[ThemeUtil.W5,ThemeUtil.fD,wui_input_element_styles],wui_input_element_decorate([(0,decorators.MZ)()],WuiInputElement.prototype,"icon",void 0),WuiInputElement=wui_input_element_decorate([(0,WebComponentsUtil.E)("wui-input-element")],WuiInputElement);var class_map=__webpack_require__("./node_modules/lit/directives/class-map.js");const wui_input_text_styles=lit.AH`
  :host {
    position: relative;
    width: 100%;
    display: inline-block;
    color: var(--wui-color-fg-275);
  }

  input {
    width: 100%;
    border-radius: var(--wui-border-radius-xs);
    box-shadow: inset 0 0 0 1px var(--wui-color-gray-glass-002);
    background: var(--wui-color-gray-glass-002);
    font-size: var(--wui-font-size-paragraph);
    letter-spacing: var(--wui-letter-spacing-paragraph);
    color: var(--wui-color-fg-100);
    transition:
      background-color var(--wui-ease-inout-power-1) var(--wui-duration-md),
      border-color var(--wui-ease-inout-power-1) var(--wui-duration-md),
      box-shadow var(--wui-ease-inout-power-1) var(--wui-duration-md);
    will-change: background-color, border-color, box-shadow;
    caret-color: var(--wui-color-accent-100);
  }

  input:disabled {
    cursor: not-allowed;
    border: 1px solid var(--wui-color-gray-glass-010);
  }

  input:disabled::placeholder,
  input:disabled + wui-icon {
    color: var(--wui-color-fg-300);
  }

  input::placeholder {
    color: var(--wui-color-fg-275);
  }

  input:focus:enabled {
    background-color: var(--wui-color-gray-glass-005);
    -webkit-box-shadow:
      inset 0 0 0 1px var(--wui-color-accent-100),
      0px 0px 0px 4px var(--wui-box-shadow-blue);
    -moz-box-shadow:
      inset 0 0 0 1px var(--wui-color-accent-100),
      0px 0px 0px 4px var(--wui-box-shadow-blue);
    box-shadow:
      inset 0 0 0 1px var(--wui-color-accent-100),
      0px 0px 0px 4px var(--wui-box-shadow-blue);
  }

  input:hover:enabled {
    background-color: var(--wui-color-gray-glass-005);
  }

  wui-icon {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    pointer-events: none;
  }

  .wui-size-sm {
    padding: 9px var(--wui-spacing-m) 10px var(--wui-spacing-s);
  }

  wui-icon + .wui-size-sm {
    padding: 9px var(--wui-spacing-m) 10px 36px;
  }

  wui-icon[data-input='sm'] {
    left: var(--wui-spacing-s);
  }

  .wui-size-md {
    padding: 15px var(--wui-spacing-m) var(--wui-spacing-l) var(--wui-spacing-m);
  }

  wui-icon + .wui-size-md,
  wui-loading-spinner + .wui-size-md {
    padding: 10.5px var(--wui-spacing-3xl) 10.5px var(--wui-spacing-3xl);
  }

  wui-icon[data-input='md'] {
    left: var(--wui-spacing-l);
  }

  .wui-size-lg {
    padding: var(--wui-spacing-s) var(--wui-spacing-s) var(--wui-spacing-s) var(--wui-spacing-l);
    letter-spacing: var(--wui-letter-spacing-medium-title);
    font-size: var(--wui-font-size-medium-title);
    font-weight: var(--wui-font-weight-light);
    line-height: 130%;
    color: var(--wui-color-fg-100);
    height: 64px;
  }

  .wui-padding-right-xs {
    padding-right: var(--wui-spacing-xs);
  }

  .wui-padding-right-s {
    padding-right: var(--wui-spacing-s);
  }

  .wui-padding-right-m {
    padding-right: var(--wui-spacing-m);
  }

  .wui-padding-right-l {
    padding-right: var(--wui-spacing-l);
  }

  .wui-padding-right-xl {
    padding-right: var(--wui-spacing-xl);
  }

  .wui-padding-right-2xl {
    padding-right: var(--wui-spacing-2xl);
  }

  .wui-padding-right-3xl {
    padding-right: var(--wui-spacing-3xl);
  }

  .wui-padding-right-4xl {
    padding-right: var(--wui-spacing-4xl);
  }

  .wui-padding-right-5xl {
    padding-right: var(--wui-spacing-5xl);
  }

  wui-icon + .wui-size-lg,
  wui-loading-spinner + .wui-size-lg {
    padding-left: 50px;
  }

  wui-icon[data-input='lg'] {
    left: var(--wui-spacing-l);
  }

  .wui-size-mdl {
    padding: 17.25px var(--wui-spacing-m) 17.25px var(--wui-spacing-m);
  }
  wui-icon + .wui-size-mdl,
  wui-loading-spinner + .wui-size-mdl {
    padding: 17.25px var(--wui-spacing-3xl) 17.25px 40px;
  }
  wui-icon[data-input='mdl'] {
    left: var(--wui-spacing-m);
  }

  input:placeholder-shown ~ ::slotted(wui-input-element),
  input:placeholder-shown ~ ::slotted(wui-icon) {
    opacity: 0;
    pointer-events: none;
  }

  input::-webkit-outer-spin-button,
  input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  input[type='number'] {
    -moz-appearance: textfield;
  }

  ::slotted(wui-input-element),
  ::slotted(wui-icon) {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
  }

  ::slotted(wui-input-element) {
    right: var(--wui-spacing-m);
  }

  ::slotted(wui-icon) {
    right: 0px;
  }
`;var wui_input_text_decorate=function(decorators,target,key,desc){var d,c=arguments.length,r=c<3?target:null===desc?desc=Object.getOwnPropertyDescriptor(target,key):desc;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(decorators,target,key,desc);else for(var i=decorators.length-1;i>=0;i--)(d=decorators[i])&&(r=(c<3?d(r):c>3?d(target,key,r):d(target,key))||r);return c>3&&r&&Object.defineProperty(target,key,r),r};let WuiInputText=class WuiInputText extends lit.WF{constructor(){super(...arguments),this.inputElementRef=e(),this.size="md",this.disabled=!1,this.placeholder="",this.type="text",this.value=""}render(){const inputClass=`wui-padding-right-${this.inputRightPadding}`,sizeClass=`wui-size-${this.size}`,classes={[sizeClass]:!0,[inputClass]:Boolean(this.inputRightPadding)};return lit.qy`${this.templateIcon()}
      <input
        data-testid="wui-input-text"
        ${n(this.inputElementRef)}
        class=${(0,class_map.H)(classes)}
        type=${this.type}
        enterkeyhint=${(0,if_defined.J)(this.enterKeyHint)}
        ?disabled=${this.disabled}
        placeholder=${this.placeholder}
        @input=${this.dispatchInputChangeEvent.bind(this)}
        .value=${this.value||""}
        tabindex=${(0,if_defined.J)(this.tabIdx)}
      />
      <slot></slot>`}templateIcon(){return this.icon?lit.qy`<wui-icon
        data-input=${this.size}
        size=${this.size}
        color="inherit"
        name=${this.icon}
      ></wui-icon>`:null}dispatchInputChangeEvent(){this.dispatchEvent(new CustomEvent("inputChange",{detail:this.inputElementRef.value?.value,bubbles:!0,composed:!0}))}};WuiInputText.styles=[ThemeUtil.W5,ThemeUtil.fD,wui_input_text_styles],wui_input_text_decorate([(0,decorators.MZ)()],WuiInputText.prototype,"size",void 0),wui_input_text_decorate([(0,decorators.MZ)()],WuiInputText.prototype,"icon",void 0),wui_input_text_decorate([(0,decorators.MZ)({type:Boolean})],WuiInputText.prototype,"disabled",void 0),wui_input_text_decorate([(0,decorators.MZ)()],WuiInputText.prototype,"placeholder",void 0),wui_input_text_decorate([(0,decorators.MZ)()],WuiInputText.prototype,"type",void 0),wui_input_text_decorate([(0,decorators.MZ)()],WuiInputText.prototype,"keyHint",void 0),wui_input_text_decorate([(0,decorators.MZ)()],WuiInputText.prototype,"value",void 0),wui_input_text_decorate([(0,decorators.MZ)()],WuiInputText.prototype,"inputRightPadding",void 0),wui_input_text_decorate([(0,decorators.MZ)()],WuiInputText.prototype,"tabIdx",void 0),WuiInputText=wui_input_text_decorate([(0,WebComponentsUtil.E)("wui-input-text")],WuiInputText);const wui_search_bar_styles=lit.AH`
  :host {
    position: relative;
    display: inline-block;
    width: 100%;
  }
`;var wui_search_bar_decorate=function(decorators,target,key,desc){var d,c=arguments.length,r=c<3?target:null===desc?desc=Object.getOwnPropertyDescriptor(target,key):desc;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(decorators,target,key,desc);else for(var i=decorators.length-1;i>=0;i--)(d=decorators[i])&&(r=(c<3?d(r):c>3?d(target,key,r):d(target,key))||r);return c>3&&r&&Object.defineProperty(target,key,r),r};let WuiSearchBar=class WuiSearchBar extends lit.WF{constructor(){super(...arguments),this.inputComponentRef=e()}render(){return lit.qy`
      <wui-input-text
        ${n(this.inputComponentRef)}
        placeholder="Search wallet"
        icon="search"
        type="search"
        enterKeyHint="search"
        size="sm"
      >
        <wui-input-element @click=${this.clearValue} icon="close"></wui-input-element>
      </wui-input-text>
    `}clearValue(){const inputComponent=this.inputComponentRef.value,inputElement=inputComponent?.inputElementRef.value;inputElement&&(inputElement.value="",inputElement.focus(),inputElement.dispatchEvent(new Event("input")))}};WuiSearchBar.styles=[ThemeUtil.W5,wui_search_bar_styles],WuiSearchBar=wui_search_bar_decorate([(0,WebComponentsUtil.E)("wui-search-bar")],WuiSearchBar);const networkSvgMd=lit.JW`<svg  viewBox="0 0 48 54" fill="none">
  <path
    d="M43.4605 10.7248L28.0485 1.61089C25.5438 0.129705 22.4562 0.129705 19.9515 1.61088L4.53951 10.7248C2.03626 12.2051 0.5 14.9365 0.5 17.886V36.1139C0.5 39.0635 2.03626 41.7949 4.53951 43.2752L19.9515 52.3891C22.4562 53.8703 25.5438 53.8703 28.0485 52.3891L43.4605 43.2752C45.9637 41.7949 47.5 39.0635 47.5 36.114V17.8861C47.5 14.9365 45.9637 12.2051 43.4605 10.7248Z"
  />
</svg>`,wui_card_select_loader_styles=lit.AH`
  :host {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 104px;
    row-gap: var(--wui-spacing-xs);
    padding: var(--wui-spacing-xs) 10px;
    background-color: var(--wui-color-gray-glass-002);
    border-radius: clamp(0px, var(--wui-border-radius-xs), 20px);
    position: relative;
  }

  wui-shimmer[data-type='network'] {
    border: none;
    -webkit-clip-path: var(--wui-path-network);
    clip-path: var(--wui-path-network);
  }

  svg {
    position: absolute;
    width: 48px;
    height: 54px;
    z-index: 1;
  }

  svg > path {
    stroke: var(--wui-color-gray-glass-010);
    stroke-width: 1px;
  }

  @media (max-width: 350px) {
    :host {
      width: 100%;
    }
  }
`;var wui_card_select_loader_decorate=function(decorators,target,key,desc){var d,c=arguments.length,r=c<3?target:null===desc?desc=Object.getOwnPropertyDescriptor(target,key):desc;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(decorators,target,key,desc);else for(var i=decorators.length-1;i>=0;i--)(d=decorators[i])&&(r=(c<3?d(r):c>3?d(target,key,r):d(target,key))||r);return c>3&&r&&Object.defineProperty(target,key,r),r};let WuiCardSelectLoader=class WuiCardSelectLoader extends lit.WF{constructor(){super(...arguments),this.type="wallet"}render(){return lit.qy`
      ${this.shimmerTemplate()}
      <wui-shimmer width="56px" height="20px" borderRadius="xs"></wui-shimmer>
    `}shimmerTemplate(){return"network"===this.type?lit.qy` <wui-shimmer
          data-type=${this.type}
          width="48px"
          height="54px"
          borderRadius="xs"
        ></wui-shimmer>
        ${networkSvgMd}`:lit.qy`<wui-shimmer width="56px" height="56px" borderRadius="xs"></wui-shimmer>`}};WuiCardSelectLoader.styles=[ThemeUtil.W5,ThemeUtil.fD,wui_card_select_loader_styles],wui_card_select_loader_decorate([(0,decorators.MZ)()],WuiCardSelectLoader.prototype,"type",void 0),WuiCardSelectLoader=wui_card_select_loader_decorate([(0,WebComponentsUtil.E)("wui-card-select-loader")],WuiCardSelectLoader);var UiHelperUtil=__webpack_require__("./node_modules/@reown/appkit-ui/dist/esm/src/utils/UiHelperUtil.js");const wui_grid_styles=lit.AH`
  :host {
    display: grid;
    width: inherit;
    height: inherit;
  }
`;var wui_grid_decorate=function(decorators,target,key,desc){var d,c=arguments.length,r=c<3?target:null===desc?desc=Object.getOwnPropertyDescriptor(target,key):desc;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(decorators,target,key,desc);else for(var i=decorators.length-1;i>=0;i--)(d=decorators[i])&&(r=(c<3?d(r):c>3?d(target,key,r):d(target,key))||r);return c>3&&r&&Object.defineProperty(target,key,r),r};let WuiGrid=class WuiGrid extends lit.WF{render(){return this.style.cssText=`\n      grid-template-rows: ${this.gridTemplateRows};\n      grid-template-columns: ${this.gridTemplateColumns};\n      justify-items: ${this.justifyItems};\n      align-items: ${this.alignItems};\n      justify-content: ${this.justifyContent};\n      align-content: ${this.alignContent};\n      column-gap: ${this.columnGap&&`var(--wui-spacing-${this.columnGap})`};\n      row-gap: ${this.rowGap&&`var(--wui-spacing-${this.rowGap})`};\n      gap: ${this.gap&&`var(--wui-spacing-${this.gap})`};\n      padding-top: ${this.padding&&UiHelperUtil.Z.getSpacingStyles(this.padding,0)};\n      padding-right: ${this.padding&&UiHelperUtil.Z.getSpacingStyles(this.padding,1)};\n      padding-bottom: ${this.padding&&UiHelperUtil.Z.getSpacingStyles(this.padding,2)};\n      padding-left: ${this.padding&&UiHelperUtil.Z.getSpacingStyles(this.padding,3)};\n      margin-top: ${this.margin&&UiHelperUtil.Z.getSpacingStyles(this.margin,0)};\n      margin-right: ${this.margin&&UiHelperUtil.Z.getSpacingStyles(this.margin,1)};\n      margin-bottom: ${this.margin&&UiHelperUtil.Z.getSpacingStyles(this.margin,2)};\n      margin-left: ${this.margin&&UiHelperUtil.Z.getSpacingStyles(this.margin,3)};\n    `,lit.qy`<slot></slot>`}};WuiGrid.styles=[ThemeUtil.W5,wui_grid_styles],wui_grid_decorate([(0,decorators.MZ)()],WuiGrid.prototype,"gridTemplateRows",void 0),wui_grid_decorate([(0,decorators.MZ)()],WuiGrid.prototype,"gridTemplateColumns",void 0),wui_grid_decorate([(0,decorators.MZ)()],WuiGrid.prototype,"justifyItems",void 0),wui_grid_decorate([(0,decorators.MZ)()],WuiGrid.prototype,"alignItems",void 0),wui_grid_decorate([(0,decorators.MZ)()],WuiGrid.prototype,"justifyContent",void 0),wui_grid_decorate([(0,decorators.MZ)()],WuiGrid.prototype,"alignContent",void 0),wui_grid_decorate([(0,decorators.MZ)()],WuiGrid.prototype,"columnGap",void 0),wui_grid_decorate([(0,decorators.MZ)()],WuiGrid.prototype,"rowGap",void 0),wui_grid_decorate([(0,decorators.MZ)()],WuiGrid.prototype,"gap",void 0),wui_grid_decorate([(0,decorators.MZ)()],WuiGrid.prototype,"padding",void 0),wui_grid_decorate([(0,decorators.MZ)()],WuiGrid.prototype,"margin",void 0),WuiGrid=wui_grid_decorate([(0,WebComponentsUtil.E)("wui-grid")],WuiGrid);const w3m_all_wallets_list_item_styles=lit.AH`
  button {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    width: 104px;
    row-gap: var(--wui-spacing-xs);
    padding: var(--wui-spacing-s) var(--wui-spacing-0);
    background-color: var(--wui-color-gray-glass-002);
    border-radius: clamp(0px, var(--wui-border-radius-xs), 20px);
    transition:
      color var(--wui-duration-lg) var(--wui-ease-out-power-1),
      background-color var(--wui-duration-lg) var(--wui-ease-out-power-1),
      border-radius var(--wui-duration-lg) var(--wui-ease-out-power-1);
    will-change: background-color, color, border-radius;
    outline: none;
    border: none;
  }

  button > wui-flex > wui-text {
    color: var(--wui-color-fg-100);
    max-width: 86px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    justify-content: center;
  }

  button > wui-flex > wui-text.certified {
    max-width: 66px;
  }

  button:hover:enabled {
    background-color: var(--wui-color-gray-glass-005);
  }

  button:disabled > wui-flex > wui-text {
    color: var(--wui-color-gray-glass-015);
  }

  [data-selected='true'] {
    background-color: var(--wui-color-accent-glass-020);
  }

  @media (hover: hover) and (pointer: fine) {
    [data-selected='true']:hover:enabled {
      background-color: var(--wui-color-accent-glass-015);
    }
  }

  [data-selected='true']:active:enabled {
    background-color: var(--wui-color-accent-glass-010);
  }

  @media (max-width: 350px) {
    button {
      width: 100%;
    }
  }
`;var w3m_all_wallets_list_item_decorate=function(decorators,target,key,desc){var d,c=arguments.length,r=c<3?target:null===desc?desc=Object.getOwnPropertyDescriptor(target,key):desc;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(decorators,target,key,desc);else for(var i=decorators.length-1;i>=0;i--)(d=decorators[i])&&(r=(c<3?d(r):c>3?d(target,key,r):d(target,key))||r);return c>3&&r&&Object.defineProperty(target,key,r),r};let W3mAllWalletsListItem=class W3mAllWalletsListItem extends lit.WF{constructor(){super(),this.observer=new IntersectionObserver(()=>{}),this.visible=!1,this.imageSrc=void 0,this.imageLoading=!1,this.wallet=void 0,this.observer=new IntersectionObserver(entries=>{entries.forEach(entry=>{entry.isIntersecting?(this.visible=!0,this.fetchImageSrc()):this.visible=!1})},{threshold:.01})}firstUpdated(){this.observer.observe(this)}disconnectedCallback(){this.observer.disconnect()}render(){const certified="certified"===this.wallet?.badge_type;return lit.qy`
      <button>
        ${this.imageTemplate()}
        <wui-flex flexDirection="row" alignItems="center" justifyContent="center" gap="3xs">
          <wui-text
            variant="tiny-500"
            color="inherit"
            class=${(0,if_defined.J)(certified?"certified":void 0)}
            >${this.wallet?.name}</wui-text
          >
          ${certified?lit.qy`<wui-icon size="sm" name="walletConnectBrown"></wui-icon>`:null}
        </wui-flex>
      </button>
    `}imageTemplate(){return!this.visible&&!this.imageSrc||this.imageLoading?this.shimmerTemplate():lit.qy`
      <wui-wallet-image
        size="md"
        imageSrc=${(0,if_defined.J)(this.imageSrc)}
        name=${this.wallet?.name}
        .installed=${this.wallet?.installed}
        badgeSize="sm"
      >
      </wui-wallet-image>
    `}shimmerTemplate(){return lit.qy`<wui-shimmer width="56px" height="56px" borderRadius="xs"></wui-shimmer>`}async fetchImageSrc(){this.wallet&&(this.imageSrc=AssetUtil.$.getWalletImage(this.wallet),this.imageSrc||(this.imageLoading=!0,this.imageSrc=await AssetUtil.$.fetchWalletImage(this.wallet.image_id),this.imageLoading=!1))}};W3mAllWalletsListItem.styles=w3m_all_wallets_list_item_styles,w3m_all_wallets_list_item_decorate([(0,decorators.wk)()],W3mAllWalletsListItem.prototype,"visible",void 0),w3m_all_wallets_list_item_decorate([(0,decorators.wk)()],W3mAllWalletsListItem.prototype,"imageSrc",void 0),w3m_all_wallets_list_item_decorate([(0,decorators.wk)()],W3mAllWalletsListItem.prototype,"imageLoading",void 0),w3m_all_wallets_list_item_decorate([(0,decorators.MZ)()],W3mAllWalletsListItem.prototype,"wallet",void 0),W3mAllWalletsListItem=w3m_all_wallets_list_item_decorate([(0,esm_exports.EM)("w3m-all-wallets-list-item")],W3mAllWalletsListItem);const w3m_all_wallets_list_styles=lit.AH`
  wui-grid {
    max-height: clamp(360px, 400px, 80vh);
    overflow: scroll;
    scrollbar-width: none;
    grid-auto-rows: min-content;
    grid-template-columns: repeat(auto-fill, 104px);
  }

  @media (max-width: 350px) {
    wui-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  wui-grid[data-scroll='false'] {
    overflow: hidden;
  }

  wui-grid::-webkit-scrollbar {
    display: none;
  }

  wui-loading-spinner {
    padding-top: var(--wui-spacing-l);
    padding-bottom: var(--wui-spacing-l);
    justify-content: center;
    grid-column: 1 / span 4;
  }
`;var w3m_all_wallets_list_decorate=function(decorators,target,key,desc){var d,c=arguments.length,r=c<3?target:null===desc?desc=Object.getOwnPropertyDescriptor(target,key):desc;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(decorators,target,key,desc);else for(var i=decorators.length-1;i>=0;i--)(d=decorators[i])&&(r=(c<3?d(r):c>3?d(target,key,r):d(target,key))||r);return c>3&&r&&Object.defineProperty(target,key,r),r};let W3mAllWalletsList=class W3mAllWalletsList extends lit.WF{constructor(){super(),this.unsubscribe=[],this.paginationObserver=void 0,this.loading=!ApiController.N.state.wallets.length,this.wallets=ApiController.N.state.wallets,this.recommended=ApiController.N.state.recommended,this.featured=ApiController.N.state.featured,this.filteredWallets=ApiController.N.state.filteredWallets,this.unsubscribe.push(ApiController.N.subscribeKey("wallets",val=>this.wallets=val),ApiController.N.subscribeKey("recommended",val=>this.recommended=val),ApiController.N.subscribeKey("featured",val=>this.featured=val),ApiController.N.subscribeKey("filteredWallets",val=>this.filteredWallets=val))}firstUpdated(){this.initialFetch(),this.createPaginationObserver()}disconnectedCallback(){this.unsubscribe.forEach(unsubscribe=>unsubscribe()),this.paginationObserver?.disconnect()}render(){return lit.qy`
      <wui-grid
        data-scroll=${!this.loading}
        .padding=${["0","s","s","s"]}
        columnGap="xxs"
        rowGap="l"
        justifyContent="space-between"
      >
        ${this.loading?this.shimmerTemplate(16):this.walletsTemplate()}
        ${this.paginationLoaderTemplate()}
      </wui-grid>
    `}async initialFetch(){this.loading=!0;const gridEl=this.shadowRoot?.querySelector("wui-grid");gridEl&&(await ApiController.N.fetchWalletsByPage({page:1}),await gridEl.animate([{opacity:1},{opacity:0}],{duration:200,fill:"forwards",easing:"ease"}).finished,this.loading=!1,gridEl.animate([{opacity:0},{opacity:1}],{duration:200,fill:"forwards",easing:"ease"}))}shimmerTemplate(items,id){return[...Array(items)].map(()=>lit.qy`
        <wui-card-select-loader type="wallet" id=${(0,if_defined.J)(id)}></wui-card-select-loader>
      `)}walletsTemplate(){const wallets=this.filteredWallets?.length>0?CoreHelperUtil.w.uniqueBy([...this.featured,...this.recommended,...this.filteredWallets],"id"):CoreHelperUtil.w.uniqueBy([...this.featured,...this.recommended,...this.wallets],"id");return WalletUtil.A.markWalletsAsInstalled(wallets).map(wallet=>lit.qy`
        <w3m-all-wallets-list-item
          @click=${()=>this.onConnectWallet(wallet)}
          .wallet=${wallet}
        ></w3m-all-wallets-list-item>
      `)}paginationLoaderTemplate(){const{wallets,recommended,featured,count}=ApiController.N.state,columns=window.innerWidth<352?3:4,currentWallets=wallets.length+recommended.length;let shimmerCount=Math.ceil(currentWallets/columns)*columns-currentWallets+columns;return shimmerCount-=wallets.length?featured.length%columns:0,0===count&&featured.length>0?null:0===count||[...featured,...wallets,...recommended].length<count?this.shimmerTemplate(shimmerCount,"local-paginator"):null}createPaginationObserver(){const loaderEl=this.shadowRoot?.querySelector("#local-paginator");loaderEl&&(this.paginationObserver=new IntersectionObserver(([element])=>{if(element?.isIntersecting&&!this.loading){const{page,count,wallets}=ApiController.N.state;wallets.length<count&&ApiController.N.fetchWalletsByPage({page:page+1})}}),this.paginationObserver.observe(loaderEl))}onConnectWallet(wallet){ConnectorController.a.selectWalletConnector(wallet)}};W3mAllWalletsList.styles=w3m_all_wallets_list_styles,w3m_all_wallets_list_decorate([(0,decorators.wk)()],W3mAllWalletsList.prototype,"loading",void 0),w3m_all_wallets_list_decorate([(0,decorators.wk)()],W3mAllWalletsList.prototype,"wallets",void 0),w3m_all_wallets_list_decorate([(0,decorators.wk)()],W3mAllWalletsList.prototype,"recommended",void 0),w3m_all_wallets_list_decorate([(0,decorators.wk)()],W3mAllWalletsList.prototype,"featured",void 0),w3m_all_wallets_list_decorate([(0,decorators.wk)()],W3mAllWalletsList.prototype,"filteredWallets",void 0),W3mAllWalletsList=w3m_all_wallets_list_decorate([(0,esm_exports.EM)("w3m-all-wallets-list")],W3mAllWalletsList);const w3m_all_wallets_search_styles=lit.AH`
  wui-grid,
  wui-loading-spinner,
  wui-flex {
    height: 360px;
  }

  wui-grid {
    overflow: scroll;
    scrollbar-width: none;
    grid-auto-rows: min-content;
    grid-template-columns: repeat(auto-fill, 104px);
  }

  wui-grid[data-scroll='false'] {
    overflow: hidden;
  }

  wui-grid::-webkit-scrollbar {
    display: none;
  }

  wui-loading-spinner {
    justify-content: center;
    align-items: center;
  }

  @media (max-width: 350px) {
    wui-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
`;var w3m_all_wallets_search_decorate=function(decorators,target,key,desc){var d,c=arguments.length,r=c<3?target:null===desc?desc=Object.getOwnPropertyDescriptor(target,key):desc;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(decorators,target,key,desc);else for(var i=decorators.length-1;i>=0;i--)(d=decorators[i])&&(r=(c<3?d(r):c>3?d(target,key,r):d(target,key))||r);return c>3&&r&&Object.defineProperty(target,key,r),r};let W3mAllWalletsSearch=class W3mAllWalletsSearch extends lit.WF{constructor(){super(...arguments),this.prevQuery="",this.prevBadge=void 0,this.loading=!0,this.query=""}render(){return this.onSearch(),this.loading?lit.qy`<wui-loading-spinner color="accent-100"></wui-loading-spinner>`:this.walletsTemplate()}async onSearch(){this.query.trim()===this.prevQuery.trim()&&this.badge===this.prevBadge||(this.prevQuery=this.query,this.prevBadge=this.badge,this.loading=!0,await ApiController.N.searchWallet({search:this.query,badge:this.badge}),this.loading=!1)}walletsTemplate(){const{search}=ApiController.N.state,wallets=WalletUtil.A.markWalletsAsInstalled(search);return search.length?lit.qy`
      <wui-grid
        data-testid="wallet-list"
        .padding=${["0","s","s","s"]}
        rowGap="l"
        columnGap="xs"
        justifyContent="space-between"
      >
        ${wallets.map(wallet=>lit.qy`
            <w3m-all-wallets-list-item
              @click=${()=>this.onConnectWallet(wallet)}
              .wallet=${wallet}
              data-testid="wallet-search-item-${wallet.id}"
            ></w3m-all-wallets-list-item>
          `)}
      </wui-grid>
    `:lit.qy`
        <wui-flex
          data-testid="no-wallet-found"
          justifyContent="center"
          alignItems="center"
          gap="s"
          flexDirection="column"
        >
          <wui-icon-box
            size="lg"
            iconColor="fg-200"
            backgroundColor="fg-300"
            icon="wallet"
            background="transparent"
          ></wui-icon-box>
          <wui-text data-testid="no-wallet-found-text" color="fg-200" variant="paragraph-500">
            No Wallet found
          </wui-text>
        </wui-flex>
      `}onConnectWallet(wallet){ConnectorController.a.selectWalletConnector(wallet)}};W3mAllWalletsSearch.styles=w3m_all_wallets_search_styles,w3m_all_wallets_search_decorate([(0,decorators.wk)()],W3mAllWalletsSearch.prototype,"loading",void 0),w3m_all_wallets_search_decorate([(0,decorators.MZ)()],W3mAllWalletsSearch.prototype,"query",void 0),w3m_all_wallets_search_decorate([(0,decorators.MZ)()],W3mAllWalletsSearch.prototype,"badge",void 0),W3mAllWalletsSearch=w3m_all_wallets_search_decorate([(0,esm_exports.EM)("w3m-all-wallets-search")],W3mAllWalletsSearch);var w3m_all_wallets_view_decorate=function(decorators,target,key,desc){var d,c=arguments.length,r=c<3?target:null===desc?desc=Object.getOwnPropertyDescriptor(target,key):desc;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(decorators,target,key,desc);else for(var i=decorators.length-1;i>=0;i--)(d=decorators[i])&&(r=(c<3?d(r):c>3?d(target,key,r):d(target,key))||r);return c>3&&r&&Object.defineProperty(target,key,r),r};let W3mAllWalletsView=class W3mAllWalletsView extends lit.WF{constructor(){super(...arguments),this.search="",this.onDebouncedSearch=CoreHelperUtil.w.debounce(value=>{this.search=value})}render(){const isSearch=this.search.length>=2;return lit.qy`
      <wui-flex .padding=${["0","s","s","s"]} gap="xs">
        <wui-search-bar @inputChange=${this.onInputChange.bind(this)}></wui-search-bar>
        <wui-certified-switch
          ?checked=${this.badge}
          @click=${this.onClick.bind(this)}
          data-testid="wui-certified-switch"
        ></wui-certified-switch>
        ${this.qrButtonTemplate()}
      </wui-flex>
      ${isSearch||this.badge?lit.qy`<w3m-all-wallets-search
            query=${this.search}
            badge=${(0,if_defined.J)(this.badge)}
          ></w3m-all-wallets-search>`:lit.qy`<w3m-all-wallets-list badge=${(0,if_defined.J)(this.badge)}></w3m-all-wallets-list>`}
    `}onInputChange(event){this.onDebouncedSearch(event.detail)}onClick(){"certified"!==this.badge?(this.badge="certified",SnackController.P.showSvg("Only WalletConnect certified",{icon:"walletConnectBrown",iconColor:"accent-100"})):this.badge=void 0}qrButtonTemplate(){return CoreHelperUtil.w.isMobile()?lit.qy`
        <wui-icon-box
          size="lg"
          iconSize="xl"
          iconColor="accent-100"
          backgroundColor="accent-100"
          icon="qrCode"
          background="transparent"
          border
          borderColor="wui-accent-glass-010"
          @click=${this.onWalletConnectQr.bind(this)}
        ></wui-icon-box>
      `:null}onWalletConnectQr(){RouterController.I.push("ConnectingWalletConnect")}};w3m_all_wallets_view_decorate([(0,decorators.wk)()],W3mAllWalletsView.prototype,"search",void 0),w3m_all_wallets_view_decorate([(0,decorators.wk)()],W3mAllWalletsView.prototype,"badge",void 0),W3mAllWalletsView=w3m_all_wallets_view_decorate([(0,esm_exports.EM)("w3m-all-wallets-view")],W3mAllWalletsView);const wui_list_item_styles=lit.AH`
  button {
    column-gap: var(--wui-spacing-s);
    padding: 11px 18px 11px var(--wui-spacing-s);
    width: 100%;
    background-color: var(--wui-color-gray-glass-002);
    border-radius: var(--wui-border-radius-xs);
    color: var(--wui-color-fg-250);
    transition:
      color var(--wui-ease-out-power-1) var(--wui-duration-md),
      background-color var(--wui-ease-out-power-1) var(--wui-duration-md);
    will-change: color, background-color;
  }

  button[data-iconvariant='square'],
  button[data-iconvariant='square-blue'] {
    padding: 6px 18px 6px 9px;
  }

  button > wui-flex {
    flex: 1;
  }

  button > wui-image {
    width: 32px;
    height: 32px;
    box-shadow: 0 0 0 2px var(--wui-color-gray-glass-005);
    border-radius: var(--wui-border-radius-3xl);
  }

  button > wui-icon {
    width: 36px;
    height: 36px;
    transition: opacity var(--wui-ease-out-power-1) var(--wui-duration-md);
    will-change: opacity;
  }

  button > wui-icon-box[data-variant='blue'] {
    box-shadow: 0 0 0 2px var(--wui-color-accent-glass-005);
  }

  button > wui-icon-box[data-variant='overlay'] {
    box-shadow: 0 0 0 2px var(--wui-color-gray-glass-005);
  }

  button > wui-icon-box[data-variant='square-blue'] {
    border-radius: var(--wui-border-radius-3xs);
    position: relative;
    border: none;
    width: 36px;
    height: 36px;
  }

  button > wui-icon-box[data-variant='square-blue']::after {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    border-radius: inherit;
    border: 1px solid var(--wui-color-accent-glass-010);
    pointer-events: none;
  }

  button > wui-icon:last-child {
    width: 14px;
    height: 14px;
  }

  button:disabled {
    color: var(--wui-color-gray-glass-020);
  }

  button[data-loading='true'] > wui-icon {
    opacity: 0;
  }

  wui-loading-spinner {
    position: absolute;
    right: 18px;
    top: 50%;
    transform: translateY(-50%);
  }
`;var wui_list_item_decorate=function(decorators,target,key,desc){var d,c=arguments.length,r=c<3?target:null===desc?desc=Object.getOwnPropertyDescriptor(target,key):desc;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(decorators,target,key,desc);else for(var i=decorators.length-1;i>=0;i--)(d=decorators[i])&&(r=(c<3?d(r):c>3?d(target,key,r):d(target,key))||r);return c>3&&r&&Object.defineProperty(target,key,r),r};let WuiListItem=class WuiListItem extends lit.WF{constructor(){super(...arguments),this.tabIdx=void 0,this.variant="icon",this.disabled=!1,this.imageSrc=void 0,this.alt=void 0,this.chevron=!1,this.loading=!1}render(){return lit.qy`
      <button
        ?disabled=${!!this.loading||Boolean(this.disabled)}
        data-loading=${this.loading}
        data-iconvariant=${(0,if_defined.J)(this.iconVariant)}
        tabindex=${(0,if_defined.J)(this.tabIdx)}
      >
        ${this.loadingTemplate()} ${this.visualTemplate()}
        <wui-flex gap="3xs">
          <slot></slot>
        </wui-flex>
        ${this.chevronTemplate()}
      </button>
    `}visualTemplate(){if("image"===this.variant&&this.imageSrc)return lit.qy`<wui-image src=${this.imageSrc} alt=${this.alt??"list item"}></wui-image>`;if("square"===this.iconVariant&&this.icon&&"icon"===this.variant)return lit.qy`<wui-icon name=${this.icon}></wui-icon>`;if("icon"===this.variant&&this.icon&&this.iconVariant){const color=["blue","square-blue"].includes(this.iconVariant)?"accent-100":"fg-200",size="square-blue"===this.iconVariant?"mdl":"md",iconSize=this.iconSize?this.iconSize:size;return lit.qy`
        <wui-icon-box
          data-variant=${this.iconVariant}
          icon=${this.icon}
          iconSize=${iconSize}
          background="transparent"
          iconColor=${color}
          backgroundColor=${color}
          size=${size}
        ></wui-icon-box>
      `}return null}loadingTemplate(){return this.loading?lit.qy`<wui-loading-spinner
        data-testid="wui-list-item-loading-spinner"
        color="fg-300"
      ></wui-loading-spinner>`:lit.qy``}chevronTemplate(){return this.chevron?lit.qy`<wui-icon size="inherit" color="fg-200" name="chevronRight"></wui-icon>`:null}};WuiListItem.styles=[ThemeUtil.W5,ThemeUtil.fD,wui_list_item_styles],wui_list_item_decorate([(0,decorators.MZ)()],WuiListItem.prototype,"icon",void 0),wui_list_item_decorate([(0,decorators.MZ)()],WuiListItem.prototype,"iconSize",void 0),wui_list_item_decorate([(0,decorators.MZ)()],WuiListItem.prototype,"tabIdx",void 0),wui_list_item_decorate([(0,decorators.MZ)()],WuiListItem.prototype,"variant",void 0),wui_list_item_decorate([(0,decorators.MZ)()],WuiListItem.prototype,"iconVariant",void 0),wui_list_item_decorate([(0,decorators.MZ)({type:Boolean})],WuiListItem.prototype,"disabled",void 0),wui_list_item_decorate([(0,decorators.MZ)()],WuiListItem.prototype,"imageSrc",void 0),wui_list_item_decorate([(0,decorators.MZ)()],WuiListItem.prototype,"alt",void 0),wui_list_item_decorate([(0,decorators.MZ)({type:Boolean})],WuiListItem.prototype,"chevron",void 0),wui_list_item_decorate([(0,decorators.MZ)({type:Boolean})],WuiListItem.prototype,"loading",void 0),WuiListItem=wui_list_item_decorate([(0,WebComponentsUtil.E)("wui-list-item")],WuiListItem);var w3m_downloads_view_decorate=function(decorators,target,key,desc){var d,c=arguments.length,r=c<3?target:null===desc?desc=Object.getOwnPropertyDescriptor(target,key):desc;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(decorators,target,key,desc);else for(var i=decorators.length-1;i>=0;i--)(d=decorators[i])&&(r=(c<3?d(r):c>3?d(target,key,r):d(target,key))||r);return c>3&&r&&Object.defineProperty(target,key,r),r};let W3mDownloadsView=class W3mDownloadsView extends lit.WF{constructor(){super(...arguments),this.wallet=RouterController.I.state.data?.wallet}render(){if(!this.wallet)throw new Error("w3m-downloads-view");return lit.qy`
      <wui-flex gap="xs" flexDirection="column" .padding=${["s","s","l","s"]}>
        ${this.chromeTemplate()} ${this.iosTemplate()} ${this.androidTemplate()}
        ${this.homepageTemplate()}
      </wui-flex>
    `}chromeTemplate(){return this.wallet?.chrome_store?lit.qy`<wui-list-item
      variant="icon"
      icon="chromeStore"
      iconVariant="square"
      @click=${this.onChromeStore.bind(this)}
      chevron
    >
      <wui-text variant="paragraph-500" color="fg-100">Chrome Extension</wui-text>
    </wui-list-item>`:null}iosTemplate(){return this.wallet?.app_store?lit.qy`<wui-list-item
      variant="icon"
      icon="appStore"
      iconVariant="square"
      @click=${this.onAppStore.bind(this)}
      chevron
    >
      <wui-text variant="paragraph-500" color="fg-100">iOS App</wui-text>
    </wui-list-item>`:null}androidTemplate(){return this.wallet?.play_store?lit.qy`<wui-list-item
      variant="icon"
      icon="playStore"
      iconVariant="square"
      @click=${this.onPlayStore.bind(this)}
      chevron
    >
      <wui-text variant="paragraph-500" color="fg-100">Android App</wui-text>
    </wui-list-item>`:null}homepageTemplate(){return this.wallet?.homepage?lit.qy`
      <wui-list-item
        variant="icon"
        icon="browser"
        iconVariant="square-blue"
        @click=${this.onHomePage.bind(this)}
        chevron
      >
        <wui-text variant="paragraph-500" color="fg-100">Website</wui-text>
      </wui-list-item>
    `:null}onChromeStore(){this.wallet?.chrome_store&&CoreHelperUtil.w.openHref(this.wallet.chrome_store,"_blank")}onAppStore(){this.wallet?.app_store&&CoreHelperUtil.w.openHref(this.wallet.app_store,"_blank")}onPlayStore(){this.wallet?.play_store&&CoreHelperUtil.w.openHref(this.wallet.play_store,"_blank")}onHomePage(){this.wallet?.homepage&&CoreHelperUtil.w.openHref(this.wallet.homepage,"_blank")}};W3mDownloadsView=w3m_downloads_view_decorate([(0,esm_exports.EM)("w3m-downloads-view")],W3mDownloadsView)},"./node_modules/dijkstrajs/dijkstra.js"(module){"use strict";var dijkstra={single_source_shortest_paths:function(graph,s,d){var predecessors={},costs={};costs[s]=0;var closest,u,v,cost_of_s_to_u,adjacent_nodes,cost_of_s_to_u_plus_cost_of_e,cost_of_s_to_v,open=dijkstra.PriorityQueue.make();for(open.push(s,0);!open.empty();)for(v in u=(closest=open.pop()).value,cost_of_s_to_u=closest.cost,adjacent_nodes=graph[u]||{})adjacent_nodes.hasOwnProperty(v)&&(cost_of_s_to_u_plus_cost_of_e=cost_of_s_to_u+adjacent_nodes[v],cost_of_s_to_v=costs[v],(void 0===costs[v]||cost_of_s_to_v>cost_of_s_to_u_plus_cost_of_e)&&(costs[v]=cost_of_s_to_u_plus_cost_of_e,open.push(v,cost_of_s_to_u_plus_cost_of_e),predecessors[v]=u));if(void 0!==d&&void 0===costs[d]){var msg=["Could not find a path from ",s," to ",d,"."].join("");throw new Error(msg)}return predecessors},extract_shortest_path_from_predecessor_list:function(predecessors,d){for(var nodes=[],u=d;u;)nodes.push(u),predecessors[u],u=predecessors[u];return nodes.reverse(),nodes},find_path:function(graph,s,d){var predecessors=dijkstra.single_source_shortest_paths(graph,s,d);return dijkstra.extract_shortest_path_from_predecessor_list(predecessors,d)},PriorityQueue:{make:function(opts){var key,T=dijkstra.PriorityQueue,t={};for(key in opts=opts||{},T)T.hasOwnProperty(key)&&(t[key]=T[key]);return t.queue=[],t.sorter=opts.sorter||T.default_sorter,t},default_sorter:function(a,b){return a.cost-b.cost},push:function(value,cost){var item={value,cost};this.queue.push(item),this.queue.sort(this.sorter)},pop:function(){return this.queue.shift()},empty:function(){return 0===this.queue.length}}};module.exports=dijkstra},"./node_modules/encode-utf8/index.js"(module){"use strict";module.exports=function encodeUtf8(input){for(var result=[],size=input.length,index=0;index<size;index++){var point=input.charCodeAt(index);if(point>=55296&&point<=56319&&size>index+1){var second=input.charCodeAt(index+1);second>=56320&&second<=57343&&(point=1024*(point-55296)+second-56320+65536,index+=1)}point<128?result.push(point):point<2048?(result.push(point>>6|192),result.push(63&point|128)):point<55296||point>=57344&&point<65536?(result.push(point>>12|224),result.push(point>>6&63|128),result.push(63&point|128)):point>=65536&&point<=1114111?(result.push(point>>18|240),result.push(point>>12&63|128),result.push(point>>6&63|128),result.push(63&point|128)):result.push(239,191,189)}return new Uint8Array(result).buffer}},"./node_modules/qrcode/lib/browser.js"(__unused_webpack_module,exports,__webpack_require__){const canPromise=__webpack_require__("./node_modules/qrcode/lib/can-promise.js"),QRCode=__webpack_require__("./node_modules/qrcode/lib/core/qrcode.js"),CanvasRenderer=__webpack_require__("./node_modules/qrcode/lib/renderer/canvas.js"),SvgRenderer=__webpack_require__("./node_modules/qrcode/lib/renderer/svg-tag.js");function renderCanvas(renderFunc,canvas,text,opts,cb){const args=[].slice.call(arguments,1),argsNum=args.length,isLastArgCb="function"==typeof args[argsNum-1];if(!isLastArgCb&&!canPromise())throw new Error("Callback required as last argument");if(!isLastArgCb){if(argsNum<1)throw new Error("Too few arguments provided");return 1===argsNum?(text=canvas,canvas=opts=void 0):2!==argsNum||canvas.getContext||(opts=text,text=canvas,canvas=void 0),new Promise(function(resolve,reject){try{const data=QRCode.create(text,opts);resolve(renderFunc(data,canvas,opts))}catch(e){reject(e)}})}if(argsNum<2)throw new Error("Too few arguments provided");2===argsNum?(cb=text,text=canvas,canvas=opts=void 0):3===argsNum&&(canvas.getContext&&void 0===cb?(cb=opts,opts=void 0):(cb=opts,opts=text,text=canvas,canvas=void 0));try{const data=QRCode.create(text,opts);cb(null,renderFunc(data,canvas,opts))}catch(e){cb(e)}}exports.create=QRCode.create,exports.toCanvas=renderCanvas.bind(null,CanvasRenderer.render),exports.toDataURL=renderCanvas.bind(null,CanvasRenderer.renderToDataURL),exports.toString=renderCanvas.bind(null,function(data,_,opts){return SvgRenderer.render(data,opts)})},"./node_modules/qrcode/lib/can-promise.js"(module){module.exports=function(){return"function"==typeof Promise&&Promise.prototype&&Promise.prototype.then}},"./node_modules/qrcode/lib/core/alignment-pattern.js"(__unused_webpack_module,exports,__webpack_require__){const getSymbolSize=__webpack_require__("./node_modules/qrcode/lib/core/utils.js").getSymbolSize;exports.getRowColCoords=function getRowColCoords(version){if(1===version)return[];const posCount=Math.floor(version/7)+2,size=getSymbolSize(version),intervals=145===size?26:2*Math.ceil((size-13)/(2*posCount-2)),positions=[size-7];for(let i=1;i<posCount-1;i++)positions[i]=positions[i-1]-intervals;return positions.push(6),positions.reverse()},exports.getPositions=function getPositions(version){const coords=[],pos=exports.getRowColCoords(version),posLength=pos.length;for(let i=0;i<posLength;i++)for(let j=0;j<posLength;j++)0===i&&0===j||0===i&&j===posLength-1||i===posLength-1&&0===j||coords.push([pos[i],pos[j]]);return coords}},"./node_modules/qrcode/lib/core/alphanumeric-data.js"(module,__unused_webpack_exports,__webpack_require__){const Mode=__webpack_require__("./node_modules/qrcode/lib/core/mode.js"),ALPHA_NUM_CHARS=["0","1","2","3","4","5","6","7","8","9","A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z"," ","$","%","*","+","-",".","/",":"];function AlphanumericData(data){this.mode=Mode.ALPHANUMERIC,this.data=data}AlphanumericData.getBitsLength=function getBitsLength(length){return 11*Math.floor(length/2)+length%2*6},AlphanumericData.prototype.getLength=function getLength(){return this.data.length},AlphanumericData.prototype.getBitsLength=function getBitsLength(){return AlphanumericData.getBitsLength(this.data.length)},AlphanumericData.prototype.write=function write(bitBuffer){let i;for(i=0;i+2<=this.data.length;i+=2){let value=45*ALPHA_NUM_CHARS.indexOf(this.data[i]);value+=ALPHA_NUM_CHARS.indexOf(this.data[i+1]),bitBuffer.put(value,11)}this.data.length%2&&bitBuffer.put(ALPHA_NUM_CHARS.indexOf(this.data[i]),6)},module.exports=AlphanumericData},"./node_modules/qrcode/lib/core/bit-buffer.js"(module){function BitBuffer(){this.buffer=[],this.length=0}BitBuffer.prototype={get:function(index){const bufIndex=Math.floor(index/8);return 1==(this.buffer[bufIndex]>>>7-index%8&1)},put:function(num,length){for(let i=0;i<length;i++)this.putBit(1==(num>>>length-i-1&1))},getLengthInBits:function(){return this.length},putBit:function(bit){const bufIndex=Math.floor(this.length/8);this.buffer.length<=bufIndex&&this.buffer.push(0),bit&&(this.buffer[bufIndex]|=128>>>this.length%8),this.length++}},module.exports=BitBuffer},"./node_modules/qrcode/lib/core/bit-matrix.js"(module){function BitMatrix(size){if(!size||size<1)throw new Error("BitMatrix size must be defined and greater than 0");this.size=size,this.data=new Uint8Array(size*size),this.reservedBit=new Uint8Array(size*size)}BitMatrix.prototype.set=function(row,col,value,reserved){const index=row*this.size+col;this.data[index]=value,reserved&&(this.reservedBit[index]=!0)},BitMatrix.prototype.get=function(row,col){return this.data[row*this.size+col]},BitMatrix.prototype.xor=function(row,col,value){this.data[row*this.size+col]^=value},BitMatrix.prototype.isReserved=function(row,col){return this.reservedBit[row*this.size+col]},module.exports=BitMatrix},"./node_modules/qrcode/lib/core/byte-data.js"(module,__unused_webpack_exports,__webpack_require__){const encodeUtf8=__webpack_require__("./node_modules/encode-utf8/index.js"),Mode=__webpack_require__("./node_modules/qrcode/lib/core/mode.js");function ByteData(data){this.mode=Mode.BYTE,"string"==typeof data&&(data=encodeUtf8(data)),this.data=new Uint8Array(data)}ByteData.getBitsLength=function getBitsLength(length){return 8*length},ByteData.prototype.getLength=function getLength(){return this.data.length},ByteData.prototype.getBitsLength=function getBitsLength(){return ByteData.getBitsLength(this.data.length)},ByteData.prototype.write=function(bitBuffer){for(let i=0,l=this.data.length;i<l;i++)bitBuffer.put(this.data[i],8)},module.exports=ByteData},"./node_modules/qrcode/lib/core/error-correction-code.js"(__unused_webpack_module,exports,__webpack_require__){const ECLevel=__webpack_require__("./node_modules/qrcode/lib/core/error-correction-level.js"),EC_BLOCKS_TABLE=[1,1,1,1,1,1,1,1,1,1,2,2,1,2,2,4,1,2,4,4,2,4,4,4,2,4,6,5,2,4,6,6,2,5,8,8,4,5,8,8,4,5,8,11,4,8,10,11,4,9,12,16,4,9,16,16,6,10,12,18,6,10,17,16,6,11,16,19,6,13,18,21,7,14,21,25,8,16,20,25,8,17,23,25,9,17,23,34,9,18,25,30,10,20,27,32,12,21,29,35,12,23,34,37,12,25,34,40,13,26,35,42,14,28,38,45,15,29,40,48,16,31,43,51,17,33,45,54,18,35,48,57,19,37,51,60,19,38,53,63,20,40,56,66,21,43,59,70,22,45,62,74,24,47,65,77,25,49,68,81],EC_CODEWORDS_TABLE=[7,10,13,17,10,16,22,28,15,26,36,44,20,36,52,64,26,48,72,88,36,64,96,112,40,72,108,130,48,88,132,156,60,110,160,192,72,130,192,224,80,150,224,264,96,176,260,308,104,198,288,352,120,216,320,384,132,240,360,432,144,280,408,480,168,308,448,532,180,338,504,588,196,364,546,650,224,416,600,700,224,442,644,750,252,476,690,816,270,504,750,900,300,560,810,960,312,588,870,1050,336,644,952,1110,360,700,1020,1200,390,728,1050,1260,420,784,1140,1350,450,812,1200,1440,480,868,1290,1530,510,924,1350,1620,540,980,1440,1710,570,1036,1530,1800,570,1064,1590,1890,600,1120,1680,1980,630,1204,1770,2100,660,1260,1860,2220,720,1316,1950,2310,750,1372,2040,2430];exports.getBlocksCount=function getBlocksCount(version,errorCorrectionLevel){switch(errorCorrectionLevel){case ECLevel.L:return EC_BLOCKS_TABLE[4*(version-1)+0];case ECLevel.M:return EC_BLOCKS_TABLE[4*(version-1)+1];case ECLevel.Q:return EC_BLOCKS_TABLE[4*(version-1)+2];case ECLevel.H:return EC_BLOCKS_TABLE[4*(version-1)+3];default:return}},exports.getTotalCodewordsCount=function getTotalCodewordsCount(version,errorCorrectionLevel){switch(errorCorrectionLevel){case ECLevel.L:return EC_CODEWORDS_TABLE[4*(version-1)+0];case ECLevel.M:return EC_CODEWORDS_TABLE[4*(version-1)+1];case ECLevel.Q:return EC_CODEWORDS_TABLE[4*(version-1)+2];case ECLevel.H:return EC_CODEWORDS_TABLE[4*(version-1)+3];default:return}}},"./node_modules/qrcode/lib/core/error-correction-level.js"(__unused_webpack_module,exports){exports.L={bit:1},exports.M={bit:0},exports.Q={bit:3},exports.H={bit:2},exports.isValid=function isValid(level){return level&&void 0!==level.bit&&level.bit>=0&&level.bit<4},exports.from=function from(value,defaultValue){if(exports.isValid(value))return value;try{return function fromString(string){if("string"!=typeof string)throw new Error("Param is not a string");switch(string.toLowerCase()){case"l":case"low":return exports.L;case"m":case"medium":return exports.M;case"q":case"quartile":return exports.Q;case"h":case"high":return exports.H;default:throw new Error("Unknown EC Level: "+string)}}(value)}catch(e){return defaultValue}}},"./node_modules/qrcode/lib/core/finder-pattern.js"(__unused_webpack_module,exports,__webpack_require__){const getSymbolSize=__webpack_require__("./node_modules/qrcode/lib/core/utils.js").getSymbolSize;exports.getPositions=function getPositions(version){const size=getSymbolSize(version);return[[0,0],[size-7,0],[0,size-7]]}},"./node_modules/qrcode/lib/core/format-info.js"(__unused_webpack_module,exports,__webpack_require__){const Utils=__webpack_require__("./node_modules/qrcode/lib/core/utils.js"),G15_BCH=Utils.getBCHDigit(1335);exports.getEncodedBits=function getEncodedBits(errorCorrectionLevel,mask){const data=errorCorrectionLevel.bit<<3|mask;let d=data<<10;for(;Utils.getBCHDigit(d)-G15_BCH>=0;)d^=1335<<Utils.getBCHDigit(d)-G15_BCH;return 21522^(data<<10|d)}},"./node_modules/qrcode/lib/core/galois-field.js"(__unused_webpack_module,exports){const EXP_TABLE=new Uint8Array(512),LOG_TABLE=new Uint8Array(256);!function initTables(){let x=1;for(let i=0;i<255;i++)EXP_TABLE[i]=x,LOG_TABLE[x]=i,x<<=1,256&x&&(x^=285);for(let i=255;i<512;i++)EXP_TABLE[i]=EXP_TABLE[i-255]}(),exports.log=function log(n){if(n<1)throw new Error("log("+n+")");return LOG_TABLE[n]},exports.exp=function exp(n){return EXP_TABLE[n]},exports.mul=function mul(x,y){return 0===x||0===y?0:EXP_TABLE[LOG_TABLE[x]+LOG_TABLE[y]]}},"./node_modules/qrcode/lib/core/kanji-data.js"(module,__unused_webpack_exports,__webpack_require__){const Mode=__webpack_require__("./node_modules/qrcode/lib/core/mode.js"),Utils=__webpack_require__("./node_modules/qrcode/lib/core/utils.js");function KanjiData(data){this.mode=Mode.KANJI,this.data=data}KanjiData.getBitsLength=function getBitsLength(length){return 13*length},KanjiData.prototype.getLength=function getLength(){return this.data.length},KanjiData.prototype.getBitsLength=function getBitsLength(){return KanjiData.getBitsLength(this.data.length)},KanjiData.prototype.write=function(bitBuffer){let i;for(i=0;i<this.data.length;i++){let value=Utils.toSJIS(this.data[i]);if(value>=33088&&value<=40956)value-=33088;else{if(!(value>=57408&&value<=60351))throw new Error("Invalid SJIS character: "+this.data[i]+"\nMake sure your charset is UTF-8");value-=49472}value=192*(value>>>8&255)+(255&value),bitBuffer.put(value,13)}},module.exports=KanjiData},"./node_modules/qrcode/lib/core/mask-pattern.js"(__unused_webpack_module,exports){exports.Patterns={PATTERN000:0,PATTERN001:1,PATTERN010:2,PATTERN011:3,PATTERN100:4,PATTERN101:5,PATTERN110:6,PATTERN111:7};const PenaltyScores_N1=3,PenaltyScores_N2=3,PenaltyScores_N3=40,PenaltyScores_N4=10;function getMaskAt(maskPattern,i,j){switch(maskPattern){case exports.Patterns.PATTERN000:return(i+j)%2==0;case exports.Patterns.PATTERN001:return i%2==0;case exports.Patterns.PATTERN010:return j%3==0;case exports.Patterns.PATTERN011:return(i+j)%3==0;case exports.Patterns.PATTERN100:return(Math.floor(i/2)+Math.floor(j/3))%2==0;case exports.Patterns.PATTERN101:return i*j%2+i*j%3==0;case exports.Patterns.PATTERN110:return(i*j%2+i*j%3)%2==0;case exports.Patterns.PATTERN111:return(i*j%3+(i+j)%2)%2==0;default:throw new Error("bad maskPattern:"+maskPattern)}}exports.isValid=function isValid(mask){return null!=mask&&""!==mask&&!isNaN(mask)&&mask>=0&&mask<=7},exports.from=function from(value){return exports.isValid(value)?parseInt(value,10):void 0},exports.getPenaltyN1=function getPenaltyN1(data){const size=data.size;let points=0,sameCountCol=0,sameCountRow=0,lastCol=null,lastRow=null;for(let row=0;row<size;row++){sameCountCol=sameCountRow=0,lastCol=lastRow=null;for(let col=0;col<size;col++){let module=data.get(row,col);module===lastCol?sameCountCol++:(sameCountCol>=5&&(points+=PenaltyScores_N1+(sameCountCol-5)),lastCol=module,sameCountCol=1),module=data.get(col,row),module===lastRow?sameCountRow++:(sameCountRow>=5&&(points+=PenaltyScores_N1+(sameCountRow-5)),lastRow=module,sameCountRow=1)}sameCountCol>=5&&(points+=PenaltyScores_N1+(sameCountCol-5)),sameCountRow>=5&&(points+=PenaltyScores_N1+(sameCountRow-5))}return points},exports.getPenaltyN2=function getPenaltyN2(data){const size=data.size;let points=0;for(let row=0;row<size-1;row++)for(let col=0;col<size-1;col++){const last=data.get(row,col)+data.get(row,col+1)+data.get(row+1,col)+data.get(row+1,col+1);4!==last&&0!==last||points++}return points*PenaltyScores_N2},exports.getPenaltyN3=function getPenaltyN3(data){const size=data.size;let points=0,bitsCol=0,bitsRow=0;for(let row=0;row<size;row++){bitsCol=bitsRow=0;for(let col=0;col<size;col++)bitsCol=bitsCol<<1&2047|data.get(row,col),col>=10&&(1488===bitsCol||93===bitsCol)&&points++,bitsRow=bitsRow<<1&2047|data.get(col,row),col>=10&&(1488===bitsRow||93===bitsRow)&&points++}return points*PenaltyScores_N3},exports.getPenaltyN4=function getPenaltyN4(data){let darkCount=0;const modulesCount=data.data.length;for(let i=0;i<modulesCount;i++)darkCount+=data.data[i];return Math.abs(Math.ceil(100*darkCount/modulesCount/5)-10)*PenaltyScores_N4},exports.applyMask=function applyMask(pattern,data){const size=data.size;for(let col=0;col<size;col++)for(let row=0;row<size;row++)data.isReserved(row,col)||data.xor(row,col,getMaskAt(pattern,row,col))},exports.getBestMask=function getBestMask(data,setupFormatFunc){const numPatterns=Object.keys(exports.Patterns).length;let bestPattern=0,lowerPenalty=1/0;for(let p=0;p<numPatterns;p++){setupFormatFunc(p),exports.applyMask(p,data);const penalty=exports.getPenaltyN1(data)+exports.getPenaltyN2(data)+exports.getPenaltyN3(data)+exports.getPenaltyN4(data);exports.applyMask(p,data),penalty<lowerPenalty&&(lowerPenalty=penalty,bestPattern=p)}return bestPattern}},"./node_modules/qrcode/lib/core/mode.js"(__unused_webpack_module,exports,__webpack_require__){const VersionCheck=__webpack_require__("./node_modules/qrcode/lib/core/version-check.js"),Regex=__webpack_require__("./node_modules/qrcode/lib/core/regex.js");exports.NUMERIC={id:"Numeric",bit:1,ccBits:[10,12,14]},exports.ALPHANUMERIC={id:"Alphanumeric",bit:2,ccBits:[9,11,13]},exports.BYTE={id:"Byte",bit:4,ccBits:[8,16,16]},exports.KANJI={id:"Kanji",bit:8,ccBits:[8,10,12]},exports.MIXED={bit:-1},exports.getCharCountIndicator=function getCharCountIndicator(mode,version){if(!mode.ccBits)throw new Error("Invalid mode: "+mode);if(!VersionCheck.isValid(version))throw new Error("Invalid version: "+version);return version>=1&&version<10?mode.ccBits[0]:version<27?mode.ccBits[1]:mode.ccBits[2]},exports.getBestModeForData=function getBestModeForData(dataStr){return Regex.testNumeric(dataStr)?exports.NUMERIC:Regex.testAlphanumeric(dataStr)?exports.ALPHANUMERIC:Regex.testKanji(dataStr)?exports.KANJI:exports.BYTE},exports.toString=function toString(mode){if(mode&&mode.id)return mode.id;throw new Error("Invalid mode")},exports.isValid=function isValid(mode){return mode&&mode.bit&&mode.ccBits},exports.from=function from(value,defaultValue){if(exports.isValid(value))return value;try{return function fromString(string){if("string"!=typeof string)throw new Error("Param is not a string");switch(string.toLowerCase()){case"numeric":return exports.NUMERIC;case"alphanumeric":return exports.ALPHANUMERIC;case"kanji":return exports.KANJI;case"byte":return exports.BYTE;default:throw new Error("Unknown mode: "+string)}}(value)}catch(e){return defaultValue}}},"./node_modules/qrcode/lib/core/numeric-data.js"(module,__unused_webpack_exports,__webpack_require__){const Mode=__webpack_require__("./node_modules/qrcode/lib/core/mode.js");function NumericData(data){this.mode=Mode.NUMERIC,this.data=data.toString()}NumericData.getBitsLength=function getBitsLength(length){return 10*Math.floor(length/3)+(length%3?length%3*3+1:0)},NumericData.prototype.getLength=function getLength(){return this.data.length},NumericData.prototype.getBitsLength=function getBitsLength(){return NumericData.getBitsLength(this.data.length)},NumericData.prototype.write=function write(bitBuffer){let i,group,value;for(i=0;i+3<=this.data.length;i+=3)group=this.data.substr(i,3),value=parseInt(group,10),bitBuffer.put(value,10);const remainingNum=this.data.length-i;remainingNum>0&&(group=this.data.substr(i),value=parseInt(group,10),bitBuffer.put(value,3*remainingNum+1))},module.exports=NumericData},"./node_modules/qrcode/lib/core/polynomial.js"(__unused_webpack_module,exports,__webpack_require__){const GF=__webpack_require__("./node_modules/qrcode/lib/core/galois-field.js");exports.mul=function mul(p1,p2){const coeff=new Uint8Array(p1.length+p2.length-1);for(let i=0;i<p1.length;i++)for(let j=0;j<p2.length;j++)coeff[i+j]^=GF.mul(p1[i],p2[j]);return coeff},exports.mod=function mod(divident,divisor){let result=new Uint8Array(divident);for(;result.length-divisor.length>=0;){const coeff=result[0];for(let i=0;i<divisor.length;i++)result[i]^=GF.mul(divisor[i],coeff);let offset=0;for(;offset<result.length&&0===result[offset];)offset++;result=result.slice(offset)}return result},exports.generateECPolynomial=function generateECPolynomial(degree){let poly=new Uint8Array([1]);for(let i=0;i<degree;i++)poly=exports.mul(poly,new Uint8Array([1,GF.exp(i)]));return poly}},"./node_modules/qrcode/lib/core/qrcode.js"(__unused_webpack_module,exports,__webpack_require__){const Utils=__webpack_require__("./node_modules/qrcode/lib/core/utils.js"),ECLevel=__webpack_require__("./node_modules/qrcode/lib/core/error-correction-level.js"),BitBuffer=__webpack_require__("./node_modules/qrcode/lib/core/bit-buffer.js"),BitMatrix=__webpack_require__("./node_modules/qrcode/lib/core/bit-matrix.js"),AlignmentPattern=__webpack_require__("./node_modules/qrcode/lib/core/alignment-pattern.js"),FinderPattern=__webpack_require__("./node_modules/qrcode/lib/core/finder-pattern.js"),MaskPattern=__webpack_require__("./node_modules/qrcode/lib/core/mask-pattern.js"),ECCode=__webpack_require__("./node_modules/qrcode/lib/core/error-correction-code.js"),ReedSolomonEncoder=__webpack_require__("./node_modules/qrcode/lib/core/reed-solomon-encoder.js"),Version=__webpack_require__("./node_modules/qrcode/lib/core/version.js"),FormatInfo=__webpack_require__("./node_modules/qrcode/lib/core/format-info.js"),Mode=__webpack_require__("./node_modules/qrcode/lib/core/mode.js"),Segments=__webpack_require__("./node_modules/qrcode/lib/core/segments.js");function setupFormatInfo(matrix,errorCorrectionLevel,maskPattern){const size=matrix.size,bits=FormatInfo.getEncodedBits(errorCorrectionLevel,maskPattern);let i,mod;for(i=0;i<15;i++)mod=1==(bits>>i&1),i<6?matrix.set(i,8,mod,!0):i<8?matrix.set(i+1,8,mod,!0):matrix.set(size-15+i,8,mod,!0),i<8?matrix.set(8,size-i-1,mod,!0):i<9?matrix.set(8,15-i-1+1,mod,!0):matrix.set(8,15-i-1,mod,!0);matrix.set(size-8,8,1,!0)}function createData(version,errorCorrectionLevel,segments){const buffer=new BitBuffer;segments.forEach(function(data){buffer.put(data.mode.bit,4),buffer.put(data.getLength(),Mode.getCharCountIndicator(data.mode,version)),data.write(buffer)});const dataTotalCodewordsBits=8*(Utils.getSymbolTotalCodewords(version)-ECCode.getTotalCodewordsCount(version,errorCorrectionLevel));for(buffer.getLengthInBits()+4<=dataTotalCodewordsBits&&buffer.put(0,4);buffer.getLengthInBits()%8!=0;)buffer.putBit(0);const remainingByte=(dataTotalCodewordsBits-buffer.getLengthInBits())/8;for(let i=0;i<remainingByte;i++)buffer.put(i%2?17:236,8);return function createCodewords(bitBuffer,version,errorCorrectionLevel){const totalCodewords=Utils.getSymbolTotalCodewords(version),ecTotalCodewords=ECCode.getTotalCodewordsCount(version,errorCorrectionLevel),dataTotalCodewords=totalCodewords-ecTotalCodewords,ecTotalBlocks=ECCode.getBlocksCount(version,errorCorrectionLevel),blocksInGroup2=totalCodewords%ecTotalBlocks,blocksInGroup1=ecTotalBlocks-blocksInGroup2,totalCodewordsInGroup1=Math.floor(totalCodewords/ecTotalBlocks),dataCodewordsInGroup1=Math.floor(dataTotalCodewords/ecTotalBlocks),dataCodewordsInGroup2=dataCodewordsInGroup1+1,ecCount=totalCodewordsInGroup1-dataCodewordsInGroup1,rs=new ReedSolomonEncoder(ecCount);let offset=0;const dcData=new Array(ecTotalBlocks),ecData=new Array(ecTotalBlocks);let maxDataSize=0;const buffer=new Uint8Array(bitBuffer.buffer);for(let b=0;b<ecTotalBlocks;b++){const dataSize=b<blocksInGroup1?dataCodewordsInGroup1:dataCodewordsInGroup2;dcData[b]=buffer.slice(offset,offset+dataSize),ecData[b]=rs.encode(dcData[b]),offset+=dataSize,maxDataSize=Math.max(maxDataSize,dataSize)}const data=new Uint8Array(totalCodewords);let i,r,index=0;for(i=0;i<maxDataSize;i++)for(r=0;r<ecTotalBlocks;r++)i<dcData[r].length&&(data[index++]=dcData[r][i]);for(i=0;i<ecCount;i++)for(r=0;r<ecTotalBlocks;r++)data[index++]=ecData[r][i];return data}(buffer,version,errorCorrectionLevel)}function createSymbol(data,version,errorCorrectionLevel,maskPattern){let segments;if(Array.isArray(data))segments=Segments.fromArray(data);else{if("string"!=typeof data)throw new Error("Invalid data");{let estimatedVersion=version;if(!estimatedVersion){const rawSegments=Segments.rawSplit(data);estimatedVersion=Version.getBestVersionForData(rawSegments,errorCorrectionLevel)}segments=Segments.fromString(data,estimatedVersion||40)}}const bestVersion=Version.getBestVersionForData(segments,errorCorrectionLevel);if(!bestVersion)throw new Error("The amount of data is too big to be stored in a QR Code");if(version){if(version<bestVersion)throw new Error("\nThe chosen QR Code version cannot contain this amount of data.\nMinimum version required to store current data is: "+bestVersion+".\n")}else version=bestVersion;const dataBits=createData(version,errorCorrectionLevel,segments),moduleCount=Utils.getSymbolSize(version),modules=new BitMatrix(moduleCount);return function setupFinderPattern(matrix,version){const size=matrix.size,pos=FinderPattern.getPositions(version);for(let i=0;i<pos.length;i++){const row=pos[i][0],col=pos[i][1];for(let r=-1;r<=7;r++)if(!(row+r<=-1||size<=row+r))for(let c=-1;c<=7;c++)col+c<=-1||size<=col+c||(r>=0&&r<=6&&(0===c||6===c)||c>=0&&c<=6&&(0===r||6===r)||r>=2&&r<=4&&c>=2&&c<=4?matrix.set(row+r,col+c,!0,!0):matrix.set(row+r,col+c,!1,!0))}}(modules,version),function setupTimingPattern(matrix){const size=matrix.size;for(let r=8;r<size-8;r++){const value=r%2==0;matrix.set(r,6,value,!0),matrix.set(6,r,value,!0)}}(modules),function setupAlignmentPattern(matrix,version){const pos=AlignmentPattern.getPositions(version);for(let i=0;i<pos.length;i++){const row=pos[i][0],col=pos[i][1];for(let r=-2;r<=2;r++)for(let c=-2;c<=2;c++)-2===r||2===r||-2===c||2===c||0===r&&0===c?matrix.set(row+r,col+c,!0,!0):matrix.set(row+r,col+c,!1,!0)}}(modules,version),setupFormatInfo(modules,errorCorrectionLevel,0),version>=7&&function setupVersionInfo(matrix,version){const size=matrix.size,bits=Version.getEncodedBits(version);let row,col,mod;for(let i=0;i<18;i++)row=Math.floor(i/3),col=i%3+size-8-3,mod=1==(bits>>i&1),matrix.set(row,col,mod,!0),matrix.set(col,row,mod,!0)}(modules,version),function setupData(matrix,data){const size=matrix.size;let inc=-1,row=size-1,bitIndex=7,byteIndex=0;for(let col=size-1;col>0;col-=2)for(6===col&&col--;;){for(let c=0;c<2;c++)if(!matrix.isReserved(row,col-c)){let dark=!1;byteIndex<data.length&&(dark=1==(data[byteIndex]>>>bitIndex&1)),matrix.set(row,col-c,dark),bitIndex--,-1===bitIndex&&(byteIndex++,bitIndex=7)}if(row+=inc,row<0||size<=row){row-=inc,inc=-inc;break}}}(modules,dataBits),isNaN(maskPattern)&&(maskPattern=MaskPattern.getBestMask(modules,setupFormatInfo.bind(null,modules,errorCorrectionLevel))),MaskPattern.applyMask(maskPattern,modules),setupFormatInfo(modules,errorCorrectionLevel,maskPattern),{modules,version,errorCorrectionLevel,maskPattern,segments}}exports.create=function create(data,options){if(void 0===data||""===data)throw new Error("No input text");let version,mask,errorCorrectionLevel=ECLevel.M;return void 0!==options&&(errorCorrectionLevel=ECLevel.from(options.errorCorrectionLevel,ECLevel.M),version=Version.from(options.version),mask=MaskPattern.from(options.maskPattern),options.toSJISFunc&&Utils.setToSJISFunction(options.toSJISFunc)),createSymbol(data,version,errorCorrectionLevel,mask)}},"./node_modules/qrcode/lib/core/reed-solomon-encoder.js"(module,__unused_webpack_exports,__webpack_require__){const Polynomial=__webpack_require__("./node_modules/qrcode/lib/core/polynomial.js");function ReedSolomonEncoder(degree){this.genPoly=void 0,this.degree=degree,this.degree&&this.initialize(this.degree)}ReedSolomonEncoder.prototype.initialize=function initialize(degree){this.degree=degree,this.genPoly=Polynomial.generateECPolynomial(this.degree)},ReedSolomonEncoder.prototype.encode=function encode(data){if(!this.genPoly)throw new Error("Encoder not initialized");const paddedData=new Uint8Array(data.length+this.degree);paddedData.set(data);const remainder=Polynomial.mod(paddedData,this.genPoly),start=this.degree-remainder.length;if(start>0){const buff=new Uint8Array(this.degree);return buff.set(remainder,start),buff}return remainder},module.exports=ReedSolomonEncoder},"./node_modules/qrcode/lib/core/regex.js"(__unused_webpack_module,exports){let kanji="(?:[u3000-u303F]|[u3040-u309F]|[u30A0-u30FF]|[uFF00-uFFEF]|[u4E00-u9FAF]|[u2605-u2606]|[u2190-u2195]|u203B|[u2010u2015u2018u2019u2025u2026u201Cu201Du2225u2260]|[u0391-u0451]|[u00A7u00A8u00B1u00B4u00D7u00F7])+";kanji=kanji.replace(/u/g,"\\u");const byte="(?:(?![A-Z0-9 $%*+\\-./:]|"+kanji+")(?:.|[\r\n]))+";exports.KANJI=new RegExp(kanji,"g"),exports.BYTE_KANJI=new RegExp("[^A-Z0-9 $%*+\\-./:]+","g"),exports.BYTE=new RegExp(byte,"g"),exports.NUMERIC=new RegExp("[0-9]+","g"),exports.ALPHANUMERIC=new RegExp("[A-Z $%*+\\-./:]+","g");const TEST_KANJI=new RegExp("^"+kanji+"$"),TEST_NUMERIC=new RegExp("^[0-9]+$"),TEST_ALPHANUMERIC=new RegExp("^[A-Z0-9 $%*+\\-./:]+$");exports.testKanji=function testKanji(str){return TEST_KANJI.test(str)},exports.testNumeric=function testNumeric(str){return TEST_NUMERIC.test(str)},exports.testAlphanumeric=function testAlphanumeric(str){return TEST_ALPHANUMERIC.test(str)}},"./node_modules/qrcode/lib/core/segments.js"(__unused_webpack_module,exports,__webpack_require__){const Mode=__webpack_require__("./node_modules/qrcode/lib/core/mode.js"),NumericData=__webpack_require__("./node_modules/qrcode/lib/core/numeric-data.js"),AlphanumericData=__webpack_require__("./node_modules/qrcode/lib/core/alphanumeric-data.js"),ByteData=__webpack_require__("./node_modules/qrcode/lib/core/byte-data.js"),KanjiData=__webpack_require__("./node_modules/qrcode/lib/core/kanji-data.js"),Regex=__webpack_require__("./node_modules/qrcode/lib/core/regex.js"),Utils=__webpack_require__("./node_modules/qrcode/lib/core/utils.js"),dijkstra=__webpack_require__("./node_modules/dijkstrajs/dijkstra.js");function getStringByteLength(str){return unescape(encodeURIComponent(str)).length}function getSegments(regex,mode,str){const segments=[];let result;for(;null!==(result=regex.exec(str));)segments.push({data:result[0],index:result.index,mode,length:result[0].length});return segments}function getSegmentsFromString(dataStr){const numSegs=getSegments(Regex.NUMERIC,Mode.NUMERIC,dataStr),alphaNumSegs=getSegments(Regex.ALPHANUMERIC,Mode.ALPHANUMERIC,dataStr);let byteSegs,kanjiSegs;Utils.isKanjiModeEnabled()?(byteSegs=getSegments(Regex.BYTE,Mode.BYTE,dataStr),kanjiSegs=getSegments(Regex.KANJI,Mode.KANJI,dataStr)):(byteSegs=getSegments(Regex.BYTE_KANJI,Mode.BYTE,dataStr),kanjiSegs=[]);return numSegs.concat(alphaNumSegs,byteSegs,kanjiSegs).sort(function(s1,s2){return s1.index-s2.index}).map(function(obj){return{data:obj.data,mode:obj.mode,length:obj.length}})}function getSegmentBitsLength(length,mode){switch(mode){case Mode.NUMERIC:return NumericData.getBitsLength(length);case Mode.ALPHANUMERIC:return AlphanumericData.getBitsLength(length);case Mode.KANJI:return KanjiData.getBitsLength(length);case Mode.BYTE:return ByteData.getBitsLength(length)}}function buildSingleSegment(data,modesHint){let mode;const bestMode=Mode.getBestModeForData(data);if(mode=Mode.from(modesHint,bestMode),mode!==Mode.BYTE&&mode.bit<bestMode.bit)throw new Error('"'+data+'" cannot be encoded with mode '+Mode.toString(mode)+".\n Suggested mode is: "+Mode.toString(bestMode));switch(mode!==Mode.KANJI||Utils.isKanjiModeEnabled()||(mode=Mode.BYTE),mode){case Mode.NUMERIC:return new NumericData(data);case Mode.ALPHANUMERIC:return new AlphanumericData(data);case Mode.KANJI:return new KanjiData(data);case Mode.BYTE:return new ByteData(data)}}exports.fromArray=function fromArray(array){return array.reduce(function(acc,seg){return"string"==typeof seg?acc.push(buildSingleSegment(seg,null)):seg.data&&acc.push(buildSingleSegment(seg.data,seg.mode)),acc},[])},exports.fromString=function fromString(data,version){const nodes=function buildNodes(segs){const nodes=[];for(let i=0;i<segs.length;i++){const seg=segs[i];switch(seg.mode){case Mode.NUMERIC:nodes.push([seg,{data:seg.data,mode:Mode.ALPHANUMERIC,length:seg.length},{data:seg.data,mode:Mode.BYTE,length:seg.length}]);break;case Mode.ALPHANUMERIC:nodes.push([seg,{data:seg.data,mode:Mode.BYTE,length:seg.length}]);break;case Mode.KANJI:nodes.push([seg,{data:seg.data,mode:Mode.BYTE,length:getStringByteLength(seg.data)}]);break;case Mode.BYTE:nodes.push([{data:seg.data,mode:Mode.BYTE,length:getStringByteLength(seg.data)}])}}return nodes}(getSegmentsFromString(data,Utils.isKanjiModeEnabled())),graph=function buildGraph(nodes,version){const table={},graph={start:{}};let prevNodeIds=["start"];for(let i=0;i<nodes.length;i++){const nodeGroup=nodes[i],currentNodeIds=[];for(let j=0;j<nodeGroup.length;j++){const node=nodeGroup[j],key=""+i+j;currentNodeIds.push(key),table[key]={node,lastCount:0},graph[key]={};for(let n=0;n<prevNodeIds.length;n++){const prevNodeId=prevNodeIds[n];table[prevNodeId]&&table[prevNodeId].node.mode===node.mode?(graph[prevNodeId][key]=getSegmentBitsLength(table[prevNodeId].lastCount+node.length,node.mode)-getSegmentBitsLength(table[prevNodeId].lastCount,node.mode),table[prevNodeId].lastCount+=node.length):(table[prevNodeId]&&(table[prevNodeId].lastCount=node.length),graph[prevNodeId][key]=getSegmentBitsLength(node.length,node.mode)+4+Mode.getCharCountIndicator(node.mode,version))}}prevNodeIds=currentNodeIds}for(let n=0;n<prevNodeIds.length;n++)graph[prevNodeIds[n]].end=0;return{map:graph,table}}(nodes,version),path=dijkstra.find_path(graph.map,"start","end"),optimizedSegs=[];for(let i=1;i<path.length-1;i++)optimizedSegs.push(graph.table[path[i]].node);return exports.fromArray(function mergeSegments(segs){return segs.reduce(function(acc,curr){const prevSeg=acc.length-1>=0?acc[acc.length-1]:null;return prevSeg&&prevSeg.mode===curr.mode?(acc[acc.length-1].data+=curr.data,acc):(acc.push(curr),acc)},[])}(optimizedSegs))},exports.rawSplit=function rawSplit(data){return exports.fromArray(getSegmentsFromString(data,Utils.isKanjiModeEnabled()))}},"./node_modules/qrcode/lib/core/utils.js"(__unused_webpack_module,exports){let toSJISFunction;const CODEWORDS_COUNT=[0,26,44,70,100,134,172,196,242,292,346,404,466,532,581,655,733,815,901,991,1085,1156,1258,1364,1474,1588,1706,1828,1921,2051,2185,2323,2465,2611,2761,2876,3034,3196,3362,3532,3706];exports.getSymbolSize=function getSymbolSize(version){if(!version)throw new Error('"version" cannot be null or undefined');if(version<1||version>40)throw new Error('"version" should be in range from 1 to 40');return 4*version+17},exports.getSymbolTotalCodewords=function getSymbolTotalCodewords(version){return CODEWORDS_COUNT[version]},exports.getBCHDigit=function(data){let digit=0;for(;0!==data;)digit++,data>>>=1;return digit},exports.setToSJISFunction=function setToSJISFunction(f){if("function"!=typeof f)throw new Error('"toSJISFunc" is not a valid function.');toSJISFunction=f},exports.isKanjiModeEnabled=function(){return void 0!==toSJISFunction},exports.toSJIS=function toSJIS(kanji){return toSJISFunction(kanji)}},"./node_modules/qrcode/lib/core/version-check.js"(__unused_webpack_module,exports){exports.isValid=function isValid(version){return!isNaN(version)&&version>=1&&version<=40}},"./node_modules/qrcode/lib/core/version.js"(__unused_webpack_module,exports,__webpack_require__){const Utils=__webpack_require__("./node_modules/qrcode/lib/core/utils.js"),ECCode=__webpack_require__("./node_modules/qrcode/lib/core/error-correction-code.js"),ECLevel=__webpack_require__("./node_modules/qrcode/lib/core/error-correction-level.js"),Mode=__webpack_require__("./node_modules/qrcode/lib/core/mode.js"),VersionCheck=__webpack_require__("./node_modules/qrcode/lib/core/version-check.js"),G18_BCH=Utils.getBCHDigit(7973);function getReservedBitsCount(mode,version){return Mode.getCharCountIndicator(mode,version)+4}function getTotalBitsFromDataArray(segments,version){let totalBits=0;return segments.forEach(function(data){const reservedBits=getReservedBitsCount(data.mode,version);totalBits+=reservedBits+data.getBitsLength()}),totalBits}exports.from=function from(value,defaultValue){return VersionCheck.isValid(value)?parseInt(value,10):defaultValue},exports.getCapacity=function getCapacity(version,errorCorrectionLevel,mode){if(!VersionCheck.isValid(version))throw new Error("Invalid QR Code version");void 0===mode&&(mode=Mode.BYTE);const dataTotalCodewordsBits=8*(Utils.getSymbolTotalCodewords(version)-ECCode.getTotalCodewordsCount(version,errorCorrectionLevel));if(mode===Mode.MIXED)return dataTotalCodewordsBits;const usableBits=dataTotalCodewordsBits-getReservedBitsCount(mode,version);switch(mode){case Mode.NUMERIC:return Math.floor(usableBits/10*3);case Mode.ALPHANUMERIC:return Math.floor(usableBits/11*2);case Mode.KANJI:return Math.floor(usableBits/13);case Mode.BYTE:default:return Math.floor(usableBits/8)}},exports.getBestVersionForData=function getBestVersionForData(data,errorCorrectionLevel){let seg;const ecl=ECLevel.from(errorCorrectionLevel,ECLevel.M);if(Array.isArray(data)){if(data.length>1)return function getBestVersionForMixedData(segments,errorCorrectionLevel){for(let currentVersion=1;currentVersion<=40;currentVersion++)if(getTotalBitsFromDataArray(segments,currentVersion)<=exports.getCapacity(currentVersion,errorCorrectionLevel,Mode.MIXED))return currentVersion}(data,ecl);if(0===data.length)return 1;seg=data[0]}else seg=data;return function getBestVersionForDataLength(mode,length,errorCorrectionLevel){for(let currentVersion=1;currentVersion<=40;currentVersion++)if(length<=exports.getCapacity(currentVersion,errorCorrectionLevel,mode))return currentVersion}(seg.mode,seg.getLength(),ecl)},exports.getEncodedBits=function getEncodedBits(version){if(!VersionCheck.isValid(version)||version<7)throw new Error("Invalid QR Code version");let d=version<<12;for(;Utils.getBCHDigit(d)-G18_BCH>=0;)d^=7973<<Utils.getBCHDigit(d)-G18_BCH;return version<<12|d}},"./node_modules/qrcode/lib/renderer/canvas.js"(__unused_webpack_module,exports,__webpack_require__){const Utils=__webpack_require__("./node_modules/qrcode/lib/renderer/utils.js");exports.render=function render(qrData,canvas,options){let opts=options,canvasEl=canvas;void 0!==opts||canvas&&canvas.getContext||(opts=canvas,canvas=void 0),canvas||(canvasEl=function getCanvasElement(){try{return document.createElement("canvas")}catch(e){throw new Error("You need to specify a canvas element")}}()),opts=Utils.getOptions(opts);const size=Utils.getImageWidth(qrData.modules.size,opts),ctx=canvasEl.getContext("2d"),image=ctx.createImageData(size,size);return Utils.qrToImageData(image.data,qrData,opts),function clearCanvas(ctx,canvas,size){ctx.clearRect(0,0,canvas.width,canvas.height),canvas.style||(canvas.style={}),canvas.height=size,canvas.width=size,canvas.style.height=size+"px",canvas.style.width=size+"px"}(ctx,canvasEl,size),ctx.putImageData(image,0,0),canvasEl},exports.renderToDataURL=function renderToDataURL(qrData,canvas,options){let opts=options;void 0!==opts||canvas&&canvas.getContext||(opts=canvas,canvas=void 0),opts||(opts={});const canvasEl=exports.render(qrData,canvas,opts),type=opts.type||"image/png",rendererOpts=opts.rendererOpts||{};return canvasEl.toDataURL(type,rendererOpts.quality)}},"./node_modules/qrcode/lib/renderer/svg-tag.js"(__unused_webpack_module,exports,__webpack_require__){const Utils=__webpack_require__("./node_modules/qrcode/lib/renderer/utils.js");function getColorAttrib(color,attrib){const alpha=color.a/255,str=attrib+'="'+color.hex+'"';return alpha<1?str+" "+attrib+'-opacity="'+alpha.toFixed(2).slice(1)+'"':str}function svgCmd(cmd,x,y){let str=cmd+x;return void 0!==y&&(str+=" "+y),str}exports.render=function render(qrData,options,cb){const opts=Utils.getOptions(options),size=qrData.modules.size,data=qrData.modules.data,qrcodesize=size+2*opts.margin,bg=opts.color.light.a?"<path "+getColorAttrib(opts.color.light,"fill")+' d="M0 0h'+qrcodesize+"v"+qrcodesize+'H0z"/>':"",path="<path "+getColorAttrib(opts.color.dark,"stroke")+' d="'+function qrToPath(data,size,margin){let path="",moveBy=0,newRow=!1,lineLength=0;for(let i=0;i<data.length;i++){const col=Math.floor(i%size),row=Math.floor(i/size);col||newRow||(newRow=!0),data[i]?(lineLength++,i>0&&col>0&&data[i-1]||(path+=newRow?svgCmd("M",col+margin,.5+row+margin):svgCmd("m",moveBy,0),moveBy=0,newRow=!1),col+1<size&&data[i+1]||(path+=svgCmd("h",lineLength),lineLength=0)):moveBy++}return path}(data,size,opts.margin)+'"/>',viewBox='viewBox="0 0 '+qrcodesize+" "+qrcodesize+'"',svgTag='<svg xmlns="http://www.w3.org/2000/svg" '+(opts.width?'width="'+opts.width+'" height="'+opts.width+'" ':"")+viewBox+' shape-rendering="crispEdges">'+bg+path+"</svg>\n";return"function"==typeof cb&&cb(null,svgTag),svgTag}},"./node_modules/qrcode/lib/renderer/utils.js"(__unused_webpack_module,exports){function hex2rgba(hex){if("number"==typeof hex&&(hex=hex.toString()),"string"!=typeof hex)throw new Error("Color should be defined as hex string");let hexCode=hex.slice().replace("#","").split("");if(hexCode.length<3||5===hexCode.length||hexCode.length>8)throw new Error("Invalid hex color: "+hex);3!==hexCode.length&&4!==hexCode.length||(hexCode=Array.prototype.concat.apply([],hexCode.map(function(c){return[c,c]}))),6===hexCode.length&&hexCode.push("F","F");const hexValue=parseInt(hexCode.join(""),16);return{r:hexValue>>24&255,g:hexValue>>16&255,b:hexValue>>8&255,a:255&hexValue,hex:"#"+hexCode.slice(0,6).join("")}}exports.getOptions=function getOptions(options){options||(options={}),options.color||(options.color={});const margin=void 0===options.margin||null===options.margin||options.margin<0?4:options.margin,width=options.width&&options.width>=21?options.width:void 0,scale=options.scale||4;return{width,scale:width?4:scale,margin,color:{dark:hex2rgba(options.color.dark||"#000000ff"),light:hex2rgba(options.color.light||"#ffffffff")},type:options.type,rendererOpts:options.rendererOpts||{}}},exports.getScale=function getScale(qrSize,opts){return opts.width&&opts.width>=qrSize+2*opts.margin?opts.width/(qrSize+2*opts.margin):opts.scale},exports.getImageWidth=function getImageWidth(qrSize,opts){const scale=exports.getScale(qrSize,opts);return Math.floor((qrSize+2*opts.margin)*scale)},exports.qrToImageData=function qrToImageData(imgData,qr,opts){const size=qr.modules.size,data=qr.modules.data,scale=exports.getScale(size,opts),symbolSize=Math.floor((size+2*opts.margin)*scale),scaledMargin=opts.margin*scale,palette=[opts.color.light,opts.color.dark];for(let i=0;i<symbolSize;i++)for(let j=0;j<symbolSize;j++){let posDst=4*(i*symbolSize+j),pxColor=opts.color.light;if(i>=scaledMargin&&j>=scaledMargin&&i<symbolSize-scaledMargin&&j<symbolSize-scaledMargin){pxColor=palette[data[Math.floor((i-scaledMargin)/scale)*size+Math.floor((j-scaledMargin)/scale)]?1:0]}imgData[posDst++]=pxColor.r,imgData[posDst++]=pxColor.g,imgData[posDst++]=pxColor.b,imgData[posDst]=pxColor.a}}}}]);
//# sourceMappingURL=9027.11a21fc0.iframe.bundle.js.map