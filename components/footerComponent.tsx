import { useState } from "react"
import { DocIframe } from "./docInIframe"
import DiscordLogo from "./icons/DiscordLogo"
import GitHubLogo from "./icons/GitHubLogo"
import SubstackLogo from "./icons/SubstackLogo"
import TwitterLogo from "./icons/TwitterLogo"
import Modal from "./modalComponent"

const navigation = {
  main: [
    { name: 'For Partners', href: '/forpartners', target: '_self' },
    { name: 'User Docs', href: 'https://docs.layerswap.io/', target: '_blank' }
  ],
  iframe: [
    { name: 'Privacy Policy', href: 'https://docs.layerswap.io/user-docs/information/privacy-policy' },
    { name: 'Terms of Service', href: 'https://docs.layerswap.io/user-docs/information/terms-of-services' },
  ],
  social: [
    {
      name: 'Twitter',
      href: 'https://twitter.com/layerswap',
      icon: (props) => TwitterLogo(props),
    },
    {
      name: 'GitHub',
      href: 'https://github.com/layerswap/layerswapapp',
      icon: (props) => GitHubLogo(props),
    },
    {
      name: 'Discord',
      href: 'https://discord.com/invite/KhwYN35sHy',
      icon: (props) => DiscordLogo(props),
    },
    {
      name: 'Substack ',
      href: 'https://layerswap.substack.com/',
      icon: (props) => SubstackLogo(props),
    },
  ],
}



export default function FooterComponent() {
  const [modalUrl, setModalUrl] = useState<string>(null);

  return (
    <footer>
      <div className="max-w-xl mt-6 mx-auto space-y-6">
        <nav className="mt-4 flex flex-wrap flex-row gap-2" aria-label="Footer">
          {navigation.main.map((item) => (
            <a key={item.name} href={item.href} target={item.target} className="items-center rounded-lg border-darkblue-500 border p-2 bg-darkblue-700 text-base text-primary-text hover:text-primary hover:border-primary hover:bg-darkblue-800 hover:cursor-pointer">
              {item.name}
            </a>
          ))}
          {navigation.iframe.map((item) => {
            return (
              <div key={item.name}>
                <button onClick={() => setModalUrl(item.href)} className="items-center rounded-lg border-darkblue-500 border p-2 bg-darkblue-700 text-base text-primary-text hover:text-primary hover:border-primary hover:bg-darkblue-800">
                  {item.name}
                </button>
              </div>
            )
          })}
          <Modal className="bg-[#181c1f] sm:!pb-6 !pb-0" showModal={modalUrl != null} setShowModal={()=> setModalUrl(null)} >
            <DocIframe URl={modalUrl} />
          </Modal>
        </nav>
        <div className="flex space-x-6">
          {navigation.social.map((item) => (
            <a key={item.name} target="_blank" href={item.href} className="text-primary-text hover:text-gray-400">
              <span className="sr-only">{item.name}</span>
              <item.icon className="h-6 w-6" aria-hidden="true" />
            </a>
          ))}
        </div>
      </div>
    </footer>
  )
}