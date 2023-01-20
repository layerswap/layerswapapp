import { useState } from "react"
import { DocIframe } from "./docInIframe"
import DiscordLogo from "./icons/DiscordLogo"
import GitHubLogo from "./icons/GitHubLogo"
import SubstackLogo from "./icons/SubstackLogo"
import TwitterLogo from "./icons/TwitterLogo"
import Modal from "./modalComponent"
import SendFeedback from "./sendFeedback"

const navigation = {
  main: [
    { name: 'For Partners', href: '/forpartners', target: '_self' },
    { name: 'Privacy Policy', href: 'https://docs.layerswap.io/user-docs/information/privacy-policy', target: '_blank' },
    { name: 'Terms of Service', href: 'https://docs.layerswap.io/user-docs/information/terms-of-services' , target: '_blank'},
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
  const [modalUrl, setModalUrl] = useState<string>(null);
  const [openFeedbackModal, setOpenFeedbackModal] = useState(false)
  return (
    <footer>
      <div className="max-w-xl mt-6 mx-auto space-y-6">
        <nav className="mt-4 flex flex-wrap flex-row gap-2" aria-label="Footer">
          {navigation.main.map((item) => (
            <a key={item.name} href={item.href} target={item.target} className="items-center rounded-lg border-darkblue-500 border p-2 bg-darkblue-700 text-base text-primary-text hover:text-primary hover:border-primary hover:bg-darkblue-800 hover:cursor-pointer transition-all duration-200">
              {item.name}
            </a>
          ))}
          <button onClick={() => setOpenFeedbackModal(true)} className="items-center rounded-lg border-darkblue-500 border p-2 bg-darkblue-700 text-base text-primary-text hover:text-primary hover:border-primary hover:bg-darkblue-800 transition-all duration-200">
            Send Feedback
          </button>
          <Modal className="bg-[#181c1f] sm:!pb-6 !pb-0" showModal={modalUrl != null} setShowModal={() => setModalUrl(null)} >
            <DocIframe URl={modalUrl} className='md:min-h-[calc(100vh-170px)]' />
          </Modal>
          <Modal title='Send Feedback' showModal={openFeedbackModal} setShowModal={setOpenFeedbackModal}>
            <SendFeedback onSend={() => setOpenFeedbackModal(false)} />
          </Modal>
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