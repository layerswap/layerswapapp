export default function CardContainer(props) {
    return (<div {...props}>
        <div className="bg-gradient-to-r from-indigo-400 to-pink-400 p-2 rounded-2xl w-full">
            <div className="bg-coolGray-900 shadow-lg rounded-2xl">
                {props.children}
            </div>
        </div>
    </div>);
}