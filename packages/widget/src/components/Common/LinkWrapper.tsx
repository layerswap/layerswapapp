import { FC } from "react";

interface LinkWrapperProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
    href: string | { pathname?: string; query?: Record<string, any> };
    children?: React.ReactNode;
}

const LinkWrapper: FC<LinkWrapperProps> = (props) => {
    const { children, href, ...anchorProps } = props
    const pathname = typeof href === 'object' ? href.pathname : href

    return (
        <a
            {...anchorProps}
            href={pathname}
        >
            {children}
        </a>
    )
}

export default LinkWrapper