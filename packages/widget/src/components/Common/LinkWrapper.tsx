import { resolvePersistantQueryParams } from "../../helpers/querryHelper";
import { useAppRouter } from "../../context/AppRouter/RouterProvider";

const LinkWrapper = (props) => {
    const router = useAppRouter();
    const { children } = props

    const pathname = typeof props.href === 'object' ? props.href.pathname : props.href
    const query = (typeof props.href === 'object' && typeof props.href.query === 'object' && props.href.query) || {}

    return (
        <a
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
        </a>
    )
}

export default LinkWrapper