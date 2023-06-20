import Link from "next/link";
import { useRouter } from "next/router";
import { forwardRef, ReactNode } from "react";

export enum ItemType {
    button = 'button',
    link = 'link'
}

type Target = '_blank' | '_self'

type MenuLinkProps = {
    href?: string;
    children: ReactNode;
    className?: string
}

const MenuLink = forwardRef<HTMLAnchorElement, MenuLinkProps>(({ children, className }) => {
    return (
        <span className={`px-4 py-2 text-left hover:bg-secondary-500 whitespace-nowrap flex items-center space-x-2 ${className}`}>
            {children}
        </span>
    )
})

type MenuIemProps = {
    type: ItemType;
    children: ReactNode;
    pathname?: string;
    onClick?: React.MouseEventHandler<HTMLButtonElement>;
    icon: JSX.Element;
    target?: Target;
    className?: string;
};

const Item = forwardRef<HTMLAnchorElement, MenuIemProps>(({ type, children, pathname, onClick, icon, target = '_self', className }, ref) => {
    const router = useRouter();
    return (
        type == ItemType.link ?
            <Link
                href={{
                    pathname: pathname,
                    query: router.query
                }}
                target={target}
                passHref
                className={className}
            >
                <MenuLink>
                    {icon}
                    <span>{children}</span>
                </MenuLink>
            </Link>
            :
            <button
                onClick={onClick}
                className={`px-4 py-2 hover:bg-secondary-500 text-left whitespace-nowrap w-full flex items-center space-x-2 ${className}`}
            >
                {icon}
                <span>{children}</span>
            </button>
    )
})

export default Item