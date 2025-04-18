import Link, { LinkProps } from "next/link";
import { FC } from "react";
import { resolvePersistantQueryParams } from "../../helpers/querryHelper";
import { useAppRouter } from "../../context/AppRouter/RouterProvider";

const LinkWrapper: FC<Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps> & LinkProps & {
    children?: React.ReactNode;
} & React.RefAttributes<HTMLAnchorElement>> = (props) => {
    const router = useAppRouter();
    const { children } = props

    const pathname = typeof props.href === 'object' ? props.href.pathname : props.href
    const query = (typeof props.href === 'object' && typeof props.href.query === 'object' && props.href.query) || {}
    
    return (
        <Link
            {...props}
            href={{
                pathname: pathname,
                query: {
                    ...resolvePersistantQueryParams(router.query),
                    ...query
                }
            }}
        >
            {children}
        </Link>
    )
}

export default LinkWrapper