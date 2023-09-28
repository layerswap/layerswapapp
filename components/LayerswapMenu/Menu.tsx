import { ChevronRight, ExternalLink } from "lucide-react"
import LinkWrapper from "../LinkWraapper"
import { ReactNode } from "react"

const Menu = ({ children }: { children: ReactNode }) => {
    return <div className="flex flex-col gap-1">
        {children}
    </div>
}

const Group = ({ children }: { children: JSX.Element | JSX.Element[] }) => {
    return (
        <div>
            <div className="divide-y divide-secondary-500 my-1 rounded-md bg-secondary-700 overflow-hidden">
                {children}
            </div>
        </div>
    )
}

const Item = (function Item({ children, pathname, onClick, icon, target = '_self' }: MenuIemProps) {

    return (
        pathname ?
            <LinkWrapper href={pathname} target={target} className="gap-4 flex relative cursor-pointer hover:bg-secondary-600 select-none w-full items-center px-4 py-3 outline-none text-secondary-text hover:text-primary-text">
                <div className="text-primary-400/70">
                    {icon}
                </div>
                <p className="text-primary-text">{children}</p>
                {
                    target === '_self' ?
                        <ChevronRight className="h-4 w-4 absolute right-3" />
                        :
                        <ExternalLink className="h-4 w-4 absolute right-3" />
                }
            </LinkWrapper>
            :
            <button
                onClick={onClick}
                className={`gap-4 flex relative cursor-pointer hover:bg-secondary-600 select-none items-center px-4 py-3 outline-none w-full text-secondary-text hover:text-primary-text`}
            >
                <div className="text-primary-400/70">
                    {icon}
                </div>
                <p className="text-primary-text">{children}</p>
                <ChevronRight className="h-4 w-4 absolute right-3" />
            </button>
    )
})

export enum ItemType {
    button = 'button',
    link = 'link'
}

type Target = '_blank' | '_self'

type MenuIemProps = {
    children: ReactNode;
    pathname?: string;
    onClick?: React.MouseEventHandler<HTMLButtonElement>;
    icon: JSX.Element;
    target?: Target;
};


Menu.Group = Group
Menu.Item = Item

export default Menu