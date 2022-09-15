import DiscordLogo from "./icons/DiscordLogo"
import GitHubLogo from "./icons/GitHubLogo"
import SubstackLogo from "./icons/SubstackLogo"
import TwitterLogo from "./icons/TwitterLogo"

const navigation = {
  main: [
    { name: 'Privacy Policy', href: '/blog/guide/Privacy_Policy', target: '_self' },
    { name: 'Terms of Service', href: '/blog/guide/Terms_of_Service', target: '_self' },
    { name: 'For Partners', href: '/forpartners', target: '_self' },
    { name: 'Brand Guide', href: 'https://layerswap.notion.site/layerswap/Layerswap-brand-guide-4b579a04a4c3477cad1c28f466749cf1', target: '_blank' }
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
  return (
    <footer>
      <div className="max-w-xl mt-8 mx-auto pb-12 px-4 overflow-hidden sm:px-6 lg:px-8">
        <div className="flex justify-center space-x-6">
          {navigation.social.map((item) => (
            <a key={item.name} target="_blank" href={item.href} className="text-blueGray-300 hover:text-blueGray-400">
              <span className="sr-only">{item.name}</span>
              <item.icon className="h-6 w-6" aria-hidden="true" />
            </a>
          ))}
        </div>
        <nav className="mt-2 flex flex-wrap justify-center" aria-label="Footer">
          {navigation.main.map((item) => (
            <div key={item.name} className="px-2 py-2">
              <a href={item.href} target={item.target} className="text-base text-blueGray-300 hover:text-blueGray-400 hover:underline hover:cursor-pointer">
                {item.name}
              </a>
            </div>
          ))}
        </nav>
      </div>
    </footer>
  )
}