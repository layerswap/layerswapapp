import { useState } from "react"
import DiscordLogo from "./icons/DiscordLogo"
import GitHubLogo from "./icons/GitHubLogo"
import SubstackLogo from "./icons/SubstackLogo"
import TwitterLogo from "./icons/TwitterLogo"
import SendFeedback from "./sendFeedback"
import Popover from "./modal/popover"

const navigation = {
  main: [
    { name: 'For Partners', href: '/forpartners', target: '_self' },
    { name: 'Privacy Policy', href: 'https://docs.layerswap.io/user-docs/information/privacy-policy', target: '_blank' },
    { name: 'Terms of Service', href: 'https://docs.layerswap.io/user-docs/information/terms-of-services', target: '_blank' },
  ],
  social: [
    {
      name: 'Twitter',
      href: 'https://twitter.com/layerswap',
      icon: (props) => TwitterLogo(props),
      className: 'plausible-event-name=Twitter'
    },
    {
      name: 'GitHub',
      href: 'https://github.com/layerswap/layerswapapp',
      icon: (props) => GitHubLogo(props),
      className: 'plausible-event-name=GitHub'
    },
    {
      name: 'Discord',
      href: 'https://discord.com/invite/KhwYN35sHy',
      icon: (props) => DiscordLogo(props),
      className: 'plausible-event-name=Discord'
    },
    {
      name: 'Substack ',
      href: 'https://layerswap.substack.com/',
      icon: (props) => SubstackLogo(props),
      className: 'plausible-event-name=Substack'
    },
  ],
}



export default function FooterComponent() {
  const [openFeedbackModal, setOpenFeedbackModal] = useState(false)

  return (
    <footer>
      <div className="max-w-xs mt-6 space-y-6">
        <nav className="mt-4 flex flex-wrap flex-row gap-2" aria-label="Footer">
          {navigation.main.map((item) => (
            <a key={item.name} href={item.href} target={item.target} className="items-center rounded-lg border-secondary-500 border p-2 bg-secondary-700 text-base text-primary-text hover:text-primary hover:border-primary hover:bg-secondary-800 hover:cursor-pointer transition-all duration-200">
              {item.name}
            </a>
          ))}
          <Popover
            opener={
              <button onClick={() => setOpenFeedbackModal(true)} className="items-center rounded-lg border-secondary-500 border p-2 bg-secondary-700 text-base text-primary-text hover:text-primary hover:border-primary hover:bg-secondary-800 transition-all duration-200">
                Send Feedback
              </button>
            }
            show={openFeedbackModal}
            setShow={setOpenFeedbackModal} >
            <div className="p-0 md:p-5 md:max-w-md">
              <SendFeedback onSend={() => setOpenFeedbackModal(false)} />
            </div>
          </Popover>
        </nav>
        <div className="flex space-x-6">
          {navigation.social.map((item) => (
            <a key={item.name} target="_blank" href={item.href} className={`text-primary-text hover:text-gray-400 ${item.className}`}>
              <span className="sr-only">{item.name}</span>
              <item.icon className="h-6 w-6" aria-hidden="true" />
            </a>
          ))}
        </div>
      </div>
    </footer>
  )
}