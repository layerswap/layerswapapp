export default function CardContainer(props) {
    return (<div {...props}>
        <div className="bg-darkBlue shadow-card rounded-lg w-full overflow-hidden relative">
            <div className="p-2 border-t-4 border-ouline-blue">
                {props.children}
            </div>
        </div>
    </div>);
}