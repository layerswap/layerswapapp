export default function CardContainer(props) {
    return (<div {...props}>
        <div className="bg-secondary-700 shadow-card rounded-lg w-full mt-10 overflow-hidden relative">
            <div className="relative overflow-hidden h-1 flex rounded-t-lg bg-secondary-500"></div>
            <div className="p-2">
                {props.children}
            </div>
        </div>
    </div>);
}