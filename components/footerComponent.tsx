import DiscordLogo from "./icons/DiscordLogo"
import GitHubLogo from "./icons/GitHubLogo"
import SubstackLogo from "./icons/SubstackLogo"
import TwitterLogo from "./icons/TwitterLogo"

const navigation = {
  main: [
    { name: 'Privacy Policy', href: '/blog/guide/Privacy_Policy', target: '_self' },
    { name: 'Terms of Service', href: '/blog/guide/Terms_of_Service', target: '_self' },
    { name: 'For Partners', href: '/forpartners', target: '_self' },
    { name: 'User Docs', href: 'https://docs.layerswap.io/', target: '_blank' }
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
      <div className="max-w-xl mt-8 mx-auto space-y-6">
        <div className="flex space-x-6">
          {navigation.social.map((item) => (
            <a key={item.name} target="_blank" href={item.href} className="text-primary-text hover:text-gray-400">
              <span className="sr-only">{item.name}</span>
              <item.icon className="h-6 w-6" aria-hidden="true" />
            </a>
          ))}
        </div>
        <nav className="mt-4 flex flex-wrap flex-row" aria-label="Footer">
          {navigation.main.map((item) => (
            <a key={item.name} href={item.href} target={item.target} className="ml-2 first:ml-0 mb-2 items-center rounded-lg border-darkblue-500 border p-2 bg-darkblue-700 text-base text-primary-text hover:text-primary hover:border-primary hover:bg-darkblue-800 hover:cursor-pointer">
              {item.name}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  )
}