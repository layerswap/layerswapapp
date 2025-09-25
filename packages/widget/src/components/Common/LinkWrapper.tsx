import { FC } from "react";
import { resolvePersistantQueryParams } from "../../helpers/querryHelper";
import useRouter from "@/hooks/useRouter";

interface LinkWrapperProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
    href: string | { pathname?: string; query?: Record<string, any> };
    children?: React.ReactNode;
}

const LinkWrapper: FC<LinkWrapperProps> = (props) => {
    const router = useRouter();
    const { children, href, ...anchorProps } = props

    const pathname = typeof href === 'object' ? href.pathname : href
    const query = (typeof href === 'object' && typeof href.query === 'object' && href.query) || {}

    // Construct the URL with query parameters
    const persistentParams = resolvePersistantQueryParams(router.query)
    const allParams = { ...persistentParams, ...query }
    const queryString = new URLSearchParams(allParams).toString()
    const finalHref = pathname + (queryString ? `?${queryString}` : '')

    return (
        <a
            {...anchorProps}
            href={finalHref}
        >
            {children}
        </a>
    )
}

export default LinkWrapper