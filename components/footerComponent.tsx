import { useState } from "react"
import SendFeedback from "./sendFeedback"
import Popover from "./modal/popover"

const navigation = {
  main: [
    { name: 'For Partners', href: '/forpartners', target: '_self' },
    { name: 'Privacy Policy', href: 'https://docs.layerswap.io/user-docs/information/privacy-policy', target: '_blank' },
    { name: 'Terms of Service', href: 'https://docs.layerswap.io/user-docs/information/terms-of-services', target: '_blank' },
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
      </div>
    </footer>
  )
}