import Link from "next/link";
import { useRouter } from "next/router";
import { forwardRef, ReactNode } from "react";

export enum ItemType {
    button = 'button',
    link = 'link'
}

type MenuLinkProps = {
    href: string;
    children: ReactNode
}

const MenuLink = forwardRef<HTMLAnchorElement, MenuLinkProps>(({ href, children }, ref) => {
    return (
        <a href={href} ref={ref} className='px-4 py-2 text-left hover:bg-darkblue-300 whitespace-nowrap flex items-center space-x-2'>
            {children}
        </a>
    )
})

const Item = ({ type, children, pathname, onClick, icon }: { type: ItemType, children: ReactNode, pathname?: string, onClick?: React.MouseEventHandler<HTMLButtonElement>; icon: JSX.Element }) => {
    const router = useRouter();
    return (
        type == ItemType.link ?
            <Link
                href={{
                    pathname: pathname,
                    query: router.query
                }}
            >
                <MenuLink href={pathname}>
                    {icon}
                    <span>{children}</span>
                </MenuLink>
            </Link>
            :
            <button
                onClick={onClick}
                className='px-4 py-2 hover:bg-darkblue-300 text-left whitespace-nowrap w-full flex items-center space-x-2'
            >
                {icon}
                <span>{children}</span>
            </button>
    )
}

export default Item