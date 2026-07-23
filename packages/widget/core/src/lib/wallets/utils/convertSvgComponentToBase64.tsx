import { ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";

/**
 * Render an SVG component to a base64 `data:` URL, satisfying the
 * `Wallet.icon: string` contract.
 *
 * Takes a component *type*, not a JSX element — pass `(Icon, props)`, never
 * `(<Icon ... />)`. Only works for components that render their markup
 * synchronously; anything drawn in an effect (e.g. `AddressIcon`'s Jazzicon)
 * comes out empty.
 */
export function convertSvgComponentToBase64<P extends object>(
    Component: ComponentType<P>,
    ...[props]: {} extends P ? [props?: P] : [props: P]
): string {
    // Render the React component to an SVG string
    const svgString = renderToStaticMarkup(<Component {...(props ?? {} as P)} />);

    // Convert the SVG string to Base64
    const base64Encoded = btoa(encodeURIComponent(svgString).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(parseInt(p1, 16))));

    // Return the data URL
    return `data:image/svg+xml;base64,${base64Encoded}`;
}
