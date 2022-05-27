export default function CardContainer(props) {
    return (<div {...props}>
        <div className="bg-darkBlue shadow-card rounded-lg w-full overflow-hidden relative">
            <div className="relative overflow-hidden h-1 flex rounded-t-lg bg-ouline-blue"></div>
            <div className="p-2">
                {props.children}
            </div>
        </div>
    </div>);
}